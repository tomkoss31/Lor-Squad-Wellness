// =============================================================================
// SuivisDuJourPage — page dédiée "Suivis à faire" (2026-06-03)
//
// Destination du digest matinal push ("🌅 X suivis à faire aujourd'hui").
// Avant : le digest pointait sur /co-pilote (dashboard générique) → le coach
// devait scroller jusqu'au timeline mixte RDV+suivis plafonné à 5. Thomas
// voulait l'endroit VRAIMENT dédié : la liste complète de SES suivis du
// protocole, non plafonnée, sans les RDV, avec envoi en 2 clics.
//
// Source de vérité unique : getFollowUpsDue() (même éligibilité précise que
// l'edge function morning-suivis-digest : programme/produits + body scan).
// Donc le compteur de cette page == le compteur de la notif. En bonus, la
// page inclut les retards et une section "à venir cette semaine".
//
// Envoi en 2 clics : FollowUpStepModal (message interpolé + Copier/WhatsApp/
// SMS + "Marquer comme envoyé" qui log dans follow_up_protocol_log → l'item
// disparaît de la liste). Aucune logique réinventée.
//
// Pas d'entrée sidebar (cf CLAUDE.md règle sidebar 7-9 items) : accès via la
// notif push + le raccourci stat "suivis" du Co-pilote.
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useToast, buildSupabaseErrorToast } from "../context/ToastContext";
import {
  getFollowUpsDue,
  type FollowUpDueItem,
} from "../lib/followUpProtocolScheduler";
import {
  FOLLOW_UP_PROTOCOL,
  type FollowUpStep,
} from "../data/followUpProtocol";
import { logSupabaseFollowUpProtocolStep } from "../services/supabaseService";
import { FollowUpStepModal } from "../components/follow-up/FollowUpStepModal";

export function SuivisDuJourPage() {
  const navigate = useNavigate();
  const {
    currentUser,
    clients,
    followUpProtocolLogs,
    refreshFollowUpProtocolLogs,
  } = useAppContext();
  const { push: pushToast } = useToast();

  const [openItem, setOpenItem] = useState<FollowUpDueItem | null>(null);
  const [busy, setBusy] = useState(false);

  // "now" stable par render (évite invalidations mémo en cascade — pattern
  // repris de FollowUpsDueWidget).
  const today = useMemo(() => new Date(), []);

  // Liste complète : retards + dus aujourd'hui + à venir (7 jours).
  const allItems = useMemo(() => {
    if (!currentUser) return [] as FollowUpDueItem[];
    return getFollowUpsDue(clients, currentUser.id, followUpProtocolLogs, {
      now: today,
      includeUpcoming: true,
      maxDaysUpcoming: 7,
    });
  }, [clients, currentUser, followUpProtocolLogs, today]);

  // Partition par urgence pour les sections.
  const { late, dueToday, upcoming } = useMemo(() => {
    const late: FollowUpDueItem[] = [];
    const dueToday: FollowUpDueItem[] = [];
    const upcoming: FollowUpDueItem[] = [];
    for (const item of allItems) {
      if (item.status === "overdue_1d" || item.status === "overdue_more") late.push(item);
      else if (item.status === "due_today") dueToday.push(item);
      else upcoming.push(item);
    }
    return { late, dueToday, upcoming };
  }, [allItems]);

  // Nombre "à faire maintenant" = retards + aujourd'hui (cohérent avec la
  // notif qui parle des suivis du jour ; les retards sont du jour non traité).
  const actionableCount = late.length + dueToday.length;

  const openStep: FollowUpStep | null = openItem
    ? FOLLOW_UP_PROTOCOL.find((s) => s.id === openItem.stepId) ?? null
    : null;
  const existingLog = openItem
    ? followUpProtocolLogs.find(
        (l) => l.clientId === openItem.client.id && l.stepId === openItem.stepId,
      )
    : undefined;

  async function handleMarkSent(item: FollowUpDueItem) {
    if (!currentUser) return;
    setBusy(true);
    try {
      await logSupabaseFollowUpProtocolStep({
        clientId: item.client.id,
        coachId: currentUser.id,
        stepId: item.stepId,
      });
      await refreshFollowUpProtocolLogs();
      pushToast({ tone: "success", title: `${item.stepShortTitle} marqué envoyé ✓` });
      setOpenItem(null);
    } catch (err) {
      pushToast(
        buildSupabaseErrorToast(
          err,
          "Impossible d'enregistrer l'envoi. Vérifie la migration SQL follow_up_protocol_log.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  if (!currentUser) {
    return (
      <div style={pageWrap}>
        <p style={loadingHint}>Chargement…</p>
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      <button type="button" onClick={() => navigate("/co-pilote")} style={backBtn}>
        ← Co-pilote
      </button>

      <header style={heroBox}>
        <div style={heroEyebrow}>📱 SUIVIS DU JOUR · PROTOCOLE 14 JOURS</div>
        <h1 style={heroTitle}>
          {actionableCount > 0
            ? `${actionableCount} suivi${actionableCount > 1 ? "s" : ""} à envoyer`
            : "Tes suivis sont à jour"}
        </h1>
        <p style={heroSubtitle}>
          Les points de contact du protocole d'accompagnement pour tes clients
          en démarrage. Envoie le message en 2 clics (WhatsApp, SMS ou copier),
          puis marque-le comme envoyé — il disparaît de la liste.
        </p>
        <div style={scoreRow}>
          <CountBadge late={late.length} today={dueToday.length} />
          <button
            type="button"
            onClick={() => navigate("/guide-suivi")}
            style={ghostLinkBtn}
          >
            Le guide des suivis →
          </button>
        </div>
      </header>

      {actionableCount === 0 && upcoming.length === 0 ? (
        <div style={emptyBox} role="status">
          <div style={{ fontSize: 40, lineHeight: 1 }} aria-hidden="true">🎉</div>
          <h2 style={emptyTitle}>Tout est à jour</h2>
          <p style={emptyText}>
            Aucun suivi protocole en attente pour tes clients aujourd'hui.
            Profites-en pour préparer tes RDV ou prospecter.
          </p>
          <button type="button" onClick={() => navigate("/agenda")} style={emptyCta}>
            Voir mon agenda →
          </button>
        </div>
      ) : (
        <>
          {late.length > 0 && (
            <Section
              title="En retard"
              count={late.length}
              accent="coral"
              hint="À rattraper en priorité — le client attend depuis quelques jours."
            >
              {late.map((item) => (
                <DueRow key={`${item.client.id}-${item.stepId}`} item={item} onSend={() => setOpenItem(item)} onOpenClient={() => navigate(`/clients/${item.client.id}?tab=actions`)} />
              ))}
            </Section>
          )}

          {dueToday.length > 0 && (
            <Section
              title="À faire aujourd'hui"
              count={dueToday.length}
              accent="gold"
              hint="Le bon moment pour garder le contact à chaud."
            >
              {dueToday.map((item) => (
                <DueRow key={`${item.client.id}-${item.stepId}`} item={item} onSend={() => setOpenItem(item)} onOpenClient={() => navigate(`/clients/${item.client.id}?tab=actions`)} />
              ))}
            </Section>
          )}

          {upcoming.length > 0 && (
            <Section
              title="À venir cette semaine"
              count={upcoming.length}
              accent="teal"
              hint="Pas urgent — visible pour t'aider à anticiper."
            >
              {upcoming.map((item) => (
                <DueRow key={`${item.client.id}-${item.stepId}`} item={item} onSend={() => setOpenItem(item)} onOpenClient={() => navigate(`/clients/${item.client.id}?tab=actions`)} upcoming />
              ))}
            </Section>
          )}
        </>
      )}

      {openStep && openItem && (
        <FollowUpStepModal
          step={openStep}
          client={openItem.client}
          existingLog={existingLog}
          onClose={() => setOpenItem(null)}
          onMarkSent={() => handleMarkSent(openItem)}
          busy={busy}
        />
      )}
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

function Section({
  title,
  count,
  accent,
  hint,
  children,
}: {
  title: string;
  count: number;
  accent: "coral" | "gold" | "teal";
  hint: string;
  children: React.ReactNode;
}) {
  const color = `var(--ls-${accent})`;
  return (
    <section style={{ marginTop: 24 }}>
      <div style={sectionHeadStyle}>
        <h2 style={sectionTitleStyle}>
          {title}
          <span
            style={{
              ...sectionBadgeStyle,
              background: `color-mix(in srgb, ${color} 14%, transparent)`,
              color,
              border: `0.5px solid color-mix(in srgb, ${color} 40%, transparent)`,
            }}
          >
            {count}
          </span>
        </h2>
      </div>
      <p style={sectionHintStyle}>{hint}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
        {children}
      </div>
    </section>
  );
}

// ─── DueRow ──────────────────────────────────────────────────────────────────

function DueRow({
  item,
  onSend,
  onOpenClient,
  upcoming = false,
}: {
  item: FollowUpDueItem;
  onSend: () => void;
  onOpenClient: () => void;
  upcoming?: boolean;
}) {
  const lateLabel =
    item.status === "overdue_1d"
      ? "En retard 1j"
      : item.status === "overdue_more"
        ? `En retard ${item.daysLate}j`
        : null;
  const accentBar = lateLabel
    ? "var(--ls-coral)"
    : upcoming
      ? "var(--ls-teal)"
      : "var(--ls-gold)";

  return (
    <div style={rowStyle}>
      <div aria-hidden="true" style={{ ...rowBarStyle, background: accentBar }} />

      <button
        type="button"
        onClick={onOpenClient}
        style={rowTextBtnStyle}
        aria-label={`Ouvrir la fiche de ${item.client.firstName} ${item.client.lastName}`}
      >
        <span aria-hidden="true" style={{ fontSize: 18 }}>💬</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={rowTitleStyle}>
            {item.client.firstName} {item.client.lastName} · J+{item.dayOffset}
            {lateLabel && <span style={lateBadgeStyle}>{lateLabel}</span>}
          </span>
          <span style={rowSubStyle}>
            {item.stepIconEmoji} {item.stepShortTitle}
          </span>
        </span>
      </button>

      <button type="button" onClick={onSend} style={sendBtnStyle}>
        Envoyer
      </button>
    </div>
  );
}

function CountBadge({ late, today }: { late: number; today: number }) {
  const total = late + today;
  const color = late > 0 ? "var(--ls-coral)" : total > 0 ? "var(--ls-gold)" : "var(--ls-teal)";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        borderRadius: 999,
        background: `color-mix(in srgb, ${color} 12%, var(--ls-surface))`,
        border: `0.5px solid color-mix(in srgb, ${color} 40%, transparent)`,
        fontFamily: "Syne, sans-serif",
      }}
    >
      <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: color }} />
      <strong style={{ color, fontSize: 18, fontWeight: 800 }}>{total}</strong>
      <span style={{ fontSize: 12, color: "var(--ls-text-muted)", fontWeight: 600 }}>
        {late > 0 ? `dont ${late} en retard` : "à envoyer"}
      </span>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const pageWrap: React.CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  padding: "20px 18px 60px",
};

const backBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  cursor: "pointer",
  marginBottom: 14,
  padding: 0,
};

const heroBox: React.CSSProperties = {
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-teal) 12%, var(--ls-surface)), var(--ls-surface))",
  border: "0.5px solid color-mix(in srgb, var(--ls-teal) 30%, var(--ls-border))",
  borderRadius: 18,
  padding: "24px 20px",
};

const heroEyebrow: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 1.4,
  color: "var(--ls-teal)",
  marginBottom: 8,
};

const heroTitle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 26,
  fontWeight: 800,
  color: "var(--ls-text)",
  lineHeight: 1.15,
};

const heroSubtitle: React.CSSProperties = {
  margin: "10px 0 16px",
  fontSize: 14,
  lineHeight: 1.6,
  color: "var(--ls-text-muted)",
};

const scoreRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 6,
};

const ghostLinkBtn: React.CSSProperties = {
  background: "transparent",
  border: "0.5px solid var(--ls-border)",
  color: "var(--ls-text-muted)",
  fontSize: 12,
  fontWeight: 600,
  padding: "8px 14px",
  borderRadius: 999,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
};

const sectionHeadStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontFamily: "Syne, sans-serif",
  fontSize: 17,
  fontWeight: 800,
  color: "var(--ls-text)",
};

const sectionBadgeStyle: React.CSSProperties = {
  padding: "2px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
  fontFamily: "DM Sans, sans-serif",
};

const sectionHintStyle: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: 12.5,
  color: "var(--ls-text-muted)",
  lineHeight: 1.5,
  fontFamily: "DM Sans, sans-serif",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 14px",
  borderRadius: 14,
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
};

const rowBarStyle: React.CSSProperties = {
  width: 3,
  alignSelf: "stretch",
  borderRadius: 3,
  flexShrink: 0,
};

const rowTextBtnStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: "transparent",
  border: "none",
  padding: 0,
  textAlign: "left",
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const rowTitleStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13.5,
  fontWeight: 700,
  color: "var(--ls-text)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const rowSubStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11.5,
  color: "var(--ls-text-muted)",
  marginTop: 2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const lateBadgeStyle: React.CSSProperties = {
  marginLeft: 8,
  padding: "1px 7px",
  borderRadius: 6,
  fontSize: 10,
  fontWeight: 700,
  background: "color-mix(in srgb, var(--ls-coral) 14%, transparent)",
  color: "var(--ls-coral)",
  letterSpacing: "0.02em",
};

const sendBtnStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 9,
  border: "none",
  background: "var(--ls-gold)",
  color: "var(--ls-gold-contrast, #0B0D11)",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "Syne, sans-serif",
  flexShrink: 0,
};

const emptyBox: React.CSSProperties = {
  marginTop: 28,
  padding: "36px 24px",
  borderRadius: 18,
  background: "var(--ls-surface)",
  border: "0.5px dashed var(--ls-border)",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
};

const emptyTitle: React.CSSProperties = {
  margin: "4px 0 0",
  fontFamily: "Syne, sans-serif",
  fontSize: 20,
  fontWeight: 800,
  color: "var(--ls-text)",
};

const emptyText: React.CSSProperties = {
  margin: 0,
  fontSize: 13.5,
  color: "var(--ls-text-muted)",
  lineHeight: 1.55,
  maxWidth: 420,
  fontFamily: "DM Sans, sans-serif",
};

const emptyCta: React.CSSProperties = {
  marginTop: 8,
  background: "transparent",
  border: "0.5px solid var(--ls-border)",
  color: "var(--ls-teal)",
  fontSize: 13,
  fontWeight: 700,
  padding: "9px 16px",
  borderRadius: 999,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
};

const loadingHint: React.CSSProperties = {
  marginTop: 20,
  fontSize: 13,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
};
