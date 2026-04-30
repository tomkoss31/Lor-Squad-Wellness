// =============================================================================
// PvActionPlanCard — widget Plan du jour PV sur Co-pilote (2026-04-28)
// =============================================================================
//
// Affiche le status PV (delayed / on_track / ahead) + 3 categories de
// suggestions client (top dormants, restock imminent, silent active) +
// gain attendu si toutes les relances aboutissent.
//
// Click sur un client → /pv?client=<id> pour ouvrir directement la fiche
// PV avec form d'ajout commande (PvClientFullPage). 2026-04-29.
// 100 % var(--ls-*).
// =============================================================================

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePvActionPlan, type PvStatus } from "../../hooks/usePvActionPlan";
import { useAppContext } from "../../context/AppContext";
import { MessageTemplatesModal } from "../client-detail/MessageTemplatesModal";

interface Props {
  userId: string | null | undefined;
  /** Si true, masque le widget en cas d erreur (pas de bandeau rouge moche
   *  qui pollue la page). Default false (affiche un message discret).
   *  Utile quand le widget est un "bonus" non critique (page /pv). */
  hideOnError?: boolean;
}

const STATUS_META: Record<PvStatus, { label: string; tone: string; icon: string; hint: string }> = {
  delayed: {
    label: "En retard",
    tone: "var(--ls-coral)",
    icon: "🔴",
    hint: "Tu es sous le prorata jour. Voici 3 leviers concrets pour rattraper.",
  },
  on_track: {
    label: "Au cap",
    tone: "var(--ls-gold)",
    icon: "🟡",
    hint: "Tu suis ton rythme. Consolide en activant les leviers ci-dessous.",
  },
  ahead: {
    label: "En avance",
    tone: "var(--ls-teal)",
    icon: "🟢",
    hint: "Bravo, tu es au-dessus du prorata. Profite pour prospecter.",
  },
};

export function PvActionPlanCard({ userId, hideOnError = false }: Props) {
  const { data, loading, error, reload } = usePvActionPlan(userId);
  const [showAll, setShowAll] = useState(false);
  // Relance multi-canal au click bouton (V2 — 2026-04-30)
  const { getClientById } = useAppContext();
  const [relanceClientId, setRelanceClientId] = useState<string | null>(null);
  const relanceClient = relanceClientId ? getClientById(relanceClientId) ?? null : null;

  const totalSuggestions = useMemo(() => {
    if (!data) return 0;
    return (
      (data.top_dormant?.length ?? 0)
      + (data.restock_due?.length ?? 0)
      + (data.silent_active?.length ?? 0)
    );
  }, [data]);

  if (loading && !data) {
    return (
      <div
        style={{
          padding: 16,
          background: "var(--ls-surface)",
          border: "0.5px solid var(--ls-border)",
          borderRadius: 14,
          fontSize: 12,
          color: "var(--ls-text-muted)",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        Chargement du plan PV…
      </div>
    );
  }

  if (error) {
    // Mode silencieux (page /pv) — on n affiche RIEN si le widget plante,
    // l utilisateur n a pas besoin de voir un bandeau rouge sur une page
    // dont le widget est juste un bonus.
    if (hideOnError) return null;
    // Mode visible (Co-pilote) — message discret + bouton retry.
    return (
      <div
        style={{
          padding: "10px 12px",
          background: "var(--ls-surface)",
          border: "0.5px dashed var(--ls-border)",
          borderRadius: 10,
          fontSize: 11.5,
          color: "var(--ls-text-muted)",
          fontFamily: "DM Sans, sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 14, opacity: 0.6 }}>🎯</span>
        <span style={{ flex: 1, lineHeight: 1.45 }}>
          Plan PV pas dispo pour l'instant — {error}
        </span>
        <button
          type="button"
          onClick={() => void reload()}
          style={{
            padding: "4px 10px",
            background: "transparent",
            border: "0.5px solid var(--ls-border)",
            borderRadius: 6,
            fontSize: 11,
            color: "var(--ls-text)",
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
            whiteSpace: "nowrap",
          }}
        >
          ↻ Réessayer
        </button>
      </div>
    );
  }

  if (!data) return null;

  const meta = STATUS_META[data.status];

  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: "0.5px solid var(--ls-border)",
        borderTop: `2px solid ${meta.tone}`,
        borderRadius: 14,
        padding: 16,
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>🎯</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              fontWeight: 700,
              color: meta.tone,
              marginBottom: 2,
            }}
          >
            Plan du jour PV · {meta.icon} {meta.label}
          </div>
          <div
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: 16,
              fontWeight: 700,
              color: "var(--ls-text)",
            }}
          >
            {data.current_pv.toLocaleString("fr-FR")} / {data.target_pv.toLocaleString("fr-FR")} PV
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--ls-text-muted)",
                marginLeft: 8,
              }}
            >
              · J{data.day_of_month}/{data.days_in_month}
            </span>
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--ls-text-muted)",
              marginTop: 2,
            }}
          >
            Prorata jour : {data.prorata_pv.toLocaleString("fr-FR")} PV
            {data.delta_pv !== 0 ? (
              <span
                style={{
                  marginLeft: 6,
                  color: data.delta_pv >= 0 ? "var(--ls-teal)" : "var(--ls-coral)",
                  fontWeight: 600,
                }}
              >
                ({data.delta_pv >= 0 ? "+" : ""}
                {data.delta_pv} PV)
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          aria-label="Actualiser"
          title="Actualiser"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--ls-text-hint)",
            fontSize: 12,
            cursor: "pointer",
            padding: 4,
            flexShrink: 0,
          }}
        >
          ↻
        </button>
      </div>

      {/* Hint */}
      <p
        style={{
          fontSize: 11,
          color: "var(--ls-text-muted)",
          margin: "0 0 12px",
          lineHeight: 1.5,
          fontStyle: "italic",
        }}
      >
        {meta.hint}
      </p>

      {/* Suggestions */}
      {totalSuggestions === 0 ? (
        <div
          style={{
            padding: "10px 12px",
            background: "var(--ls-surface2)",
            borderRadius: 10,
            fontSize: 12,
            color: "var(--ls-text-muted)",
            textAlign: "center",
            fontStyle: "italic",
          }}
        >
          Aucune suggestion automatique pour aujourd&apos;hui — explore ta base !
        </div>
      ) : (
        <>
          {/* Top dormants */}
          {data.top_dormant && data.top_dormant.length > 0 ? (
            <Section title="🥇 Top consumers à relancer" tone="gold">
              {data.top_dormant.slice(0, showAll ? undefined : 3).map((c) => (
                <SuggestionRow
                  key={`dormant-${c.client_id}`}
                  clientId={c.client_id}
                  name={c.client_name}
                  detail={`${c.monthly_avg_pv} PV/mois en moyenne · ${c.days_since}j sans commande`}
                  pvHint={`+${Math.round(c.monthly_avg_pv * 0.6)} PV potentiel`}
                  tone="gold"
                  onRelance={() => setRelanceClientId(c.client_id)}
                />
              ))}
            </Section>
          ) : null}

          {/* Restock imminent */}
          {data.restock_due && data.restock_due.length > 0 ? (
            <Section title="📦 Réassort imminent" tone="teal">
              {data.restock_due.slice(0, showAll ? undefined : 3).map((c) => (
                <SuggestionRow
                  key={`restock-${c.client_id}-${c.product_name}`}
                  clientId={c.client_id}
                  name={c.client_name}
                  detail={`${c.product_name} · ${
                    c.days_left < 0 ? `cure terminée il y a ${Math.abs(c.days_left)}j` : `cure finie dans ${c.days_left}j`
                  }`}
                  pvHint={`+${Math.round(c.pv_estimated * 0.7)} PV potentiel`}
                  tone="teal"
                  onRelance={() => setRelanceClientId(c.client_id)}
                />
              ))}
            </Section>
          ) : null}

          {/* Silent active */}
          {data.silent_active && data.silent_active.length > 0 ? (
            <Section title="💬 Silencieux à recontacter" tone="purple">
              {data.silent_active.slice(0, showAll ? undefined : 2).map((c) => (
                <SuggestionRow
                  key={`silent-${c.client_id}`}
                  clientId={c.client_id}
                  name={c.client_name}
                  detail={`${c.days_silent}j sans message`}
                  tone="purple"
                  onRelance={() => setRelanceClientId(c.client_id)}
                />
              ))}
            </Section>
          ) : null}

          {/* Show all toggle */}
          {totalSuggestions > 8 ? (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              style={{
                width: "100%",
                marginTop: 8,
                padding: "8px 10px",
                background: "transparent",
                border: "0.5px dashed var(--ls-border)",
                borderRadius: 8,
                fontSize: 11,
                color: "var(--ls-text-muted)",
                fontFamily: "DM Sans, sans-serif",
                cursor: "pointer",
              }}
            >
              {showAll ? "Réduire" : `Voir tout (${totalSuggestions})`}
            </button>
          ) : null}
        </>
      )}

      {/* Gain attendu */}
      {data.expected_gain > 0 ? (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 10%, var(--ls-surface)), color-mix(in srgb, var(--ls-teal) 6%, var(--ls-surface)))",
            border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, transparent)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18 }}>✨</span>
          <div style={{ flex: 1, fontSize: 12, color: "var(--ls-text)" }}>
            <strong>Si tu actives ces leviers</strong> : gain attendu{" "}
            <span
              style={{
                fontFamily: "Syne, sans-serif",
                fontWeight: 700,
                color: "var(--ls-gold)",
              }}
            >
              ~{data.expected_gain.toLocaleString("fr-FR")} PV
            </span>
          </div>
        </div>
      ) : null}
      {/* Modale relance multi-canal (V2 — 2026-04-30) */}
      {relanceClient && (
        <MessageTemplatesModal
          client={relanceClient}
          open={true}
          onClose={() => setRelanceClientId(null)}
          preselectedTemplateId="relance-douce"
        />
      )}
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "gold" | "teal" | "purple";
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          fontSize: 9,
          letterSpacing: 1.4,
          textTransform: "uppercase",
          fontWeight: 700,
          color: `var(--ls-${tone})`,
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{children}</div>
    </div>
  );
}

function SuggestionRow({
  clientId,
  name,
  detail,
  pvHint,
  tone,
  onRelance,
}: {
  clientId: string;
  name: string;
  detail: string;
  pvHint?: string;
  tone: "gold" | "teal" | "purple";
  onRelance?: () => void;
}) {
  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Hover effect only, Link inside handles navigation
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        background: `color-mix(in srgb, var(--ls-${tone}) 6%, var(--ls-surface2))`,
        border: `0.5px solid color-mix(in srgb, var(--ls-${tone}) 25%, transparent)`,
        borderRadius: 8,
        fontFamily: "DM Sans, sans-serif",
        transition: "background 120ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `color-mix(in srgb, var(--ls-${tone}) 14%, var(--ls-surface2))`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = `color-mix(in srgb, var(--ls-${tone}) 6%, var(--ls-surface2))`;
      }}
    >
      <Link
        to={`/pv?client=${encodeURIComponent(clientId)}`}
        style={{
          flex: 1,
          minWidth: 0,
          textDecoration: "none",
          color: "inherit",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--ls-text)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "var(--ls-text-muted)",
              marginTop: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {detail}
          </div>
        </div>
        {pvHint ? (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: `var(--ls-${tone})`,
              flexShrink: 0,
              fontFamily: "Syne, sans-serif",
            }}
          >
            {pvHint}
          </span>
        ) : null}
      </Link>
      {/* Bouton Relancer (V2 — 2026-04-30) — ouvre modale message multi-canal */}
      {onRelance && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRelance();
          }}
          aria-label={`Relancer ${name}`}
          title="Envoyer un message"
          style={{
            flexShrink: 0,
            width: 28, height: 28,
            borderRadius: 999,
            border: `0.5px solid color-mix(in srgb, var(--ls-${tone}) 40%, transparent)`,
            background: `color-mix(in srgb, var(--ls-${tone}) 14%, transparent)`,
            color: `var(--ls-${tone})`,
            cursor: "pointer",
            fontSize: 12,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.15s ease, background 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
            e.currentTarget.style.background = `color-mix(in srgb, var(--ls-${tone}) 28%, transparent)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.background = `color-mix(in srgb, var(--ls-${tone}) 14%, transparent)`;
          }}
        >
          💬
        </button>
      )}
    </div>
  );
}
