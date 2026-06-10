// =============================================================================
// ClientVipPitchTab — onglet "Club VIP" de la fiche client (VIP-2 2026-06-10).
//
// Outil COACH pour montrer les remises au client pendant le suivi (ex. RDV 15j)
// et lui envoyer l'invitation d'inscription en 1 clic :
//   - Escalier des remises client (15 / 25 / 35 %) + marche distributeur,
//     avec le palier actuel du client mis en avant (client.vipStatus).
//   - Rappel du gain (économie sur sa propre nutrition).
//   - Bouton "Envoyer l'invitation" → MessageTemplatesModal pré-sélectionné sur
//     le message d'inscription (lien + ID sponsor coach + 3 lettres + appli).
//
// La GESTION VIP complète (ID Herbalife, sponsor, PV, arbre) reste sur l'onglet
// Actions (ClientVipCoachPanel) — accessible via "Gérer le programme VIP".
// Tokens var(--ls-*) uniquement.
// =============================================================================

import { useState } from "react";
import { useAppContext } from "../../context/AppContext";
import type { Client } from "../../types/domain";
import { MessageTemplatesModal } from "./MessageTemplatesModal";

interface ClientTier {
  pct: number;
  emoji: string;
  label: string;
  statuses: NonNullable<Client["vipStatus"]>[];
}

const CLIENT_TIERS: ClientTier[] = [
  { pct: 15, emoji: "🥉", label: "Tu démarres", statuses: ["none", "bronze"] },
  { pct: 25, emoji: "🥈", label: "Tu es régulier·e", statuses: ["silver"] },
  { pct: 35, emoji: "🥇", label: "Le max client privilégié", statuses: ["gold"] },
];

export function ClientVipPitchTab({
  client,
  onManage,
}: {
  client: Client;
  onManage?: () => void;
}) {
  const { currentUser } = useAppContext();
  const [modalOpen, setModalOpen] = useState(false);

  const status = client.vipStatus ?? "none";
  const isAmbassador = status === "ambassador";
  const activeTier = CLIENT_TIERS.find((t) => t.statuses.includes(status)) ?? null;
  const hasSponsorId = Boolean(currentUser?.herbalifeId);
  const fname = (client.firstName || "").trim() || "ce client";

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Intro */}
      <div style={heroBox}>
        <div style={heroEyebrow}>👑 Club VIP · Client Privilégié</div>
        <h2 style={heroTitle}>Montre à {fname} ce qu'il·elle peut économiser</h2>
        <p style={heroSub}>
          Plus {fname} consomme régulièrement — et plus ses proches le font via
          son parrainage — plus sa remise grimpe. Montre-lui l'escalier, puis
          envoie-lui l'invitation d'inscription en un clic.
        </p>
      </div>

      {/* Escalier des remises client */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {CLIENT_TIERS.map((t) => {
          const active = activeTier?.pct === t.pct && !isAmbassador;
          return (
            <div key={t.pct} style={tierRow(active)}>
              <span style={{ fontSize: 22, width: 26, textAlign: "center" }} aria-hidden="true">
                {t.emoji}
              </span>
              <span style={tierPct(active)}>-{t.pct}%</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--ls-text)" }}>
                {t.label}
              </span>
              {active ? <span style={hereBadge}>ICI</span> : null}
            </div>
          );
        })}
        {/* Marche distributeur */}
        <div style={distriRow}>
          <span style={{ fontSize: 20, width: 26, textAlign: "center" }} aria-hidden="true">
            🚀
          </span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "var(--ls-text-muted)", lineHeight: 1.45 }}>
            <strong style={{ color: "var(--ls-gold)" }}>-42% à -50%</strong> — en passant
            distributeur. Là, {fname} touche aussi une commission sur les achats de ses filleuls.
            {isAmbassador ? " (Statut Ambassadeur déjà atteint 🏆)" : ""}
          </span>
        </div>
      </div>

      {/* Rappel gain */}
      <div style={gainBox}>
        💸 À <strong>-35%</strong>, sur une nutrition à ~200 €/mois, {fname} économise{" "}
        <strong style={{ color: "var(--ls-coral)" }}>≈ 70 € chaque mois</strong> — soit ~840 € sur
        l'année, juste en consommant ce qui marche pour lui·elle.
      </div>

      {/* Hint ID sponsor manquant */}
      {!hasSponsorId ? (
        <div style={warnBox}>
          ⚠️ Renseigne ton <strong>ID Herbalife</strong> dans Paramètres &gt; Profil pour qu'il
          s'ajoute automatiquement dans l'invitation (sinon tu devras le coller à la main).
        </div>
      ) : null}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
        <button type="button" onClick={() => setModalOpen(true)} style={primaryBtn}>
          📲 Envoyer l'invitation à {fname}
        </button>
        {onManage ? (
          <button type="button" onClick={onManage} style={ghostBtn}>
            ⚙️ Gérer le programme VIP
          </button>
        ) : null}
      </div>

      <MessageTemplatesModal
        client={client}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        preselectedTemplateId="vip-inscription"
      />
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const heroBox: React.CSSProperties = {
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 12%, var(--ls-surface)), var(--ls-surface))",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))",
  borderRadius: 16,
  padding: "18px 18px",
  marginBottom: 16,
};

const heroEyebrow: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 1.2,
  color: "var(--ls-gold)",
  marginBottom: 6,
};

const heroTitle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 20,
  fontWeight: 800,
  color: "var(--ls-text)",
  lineHeight: 1.2,
};

const heroSub: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: 13,
  lineHeight: 1.55,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
};

const tierRow = (active: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "11px 14px",
  borderRadius: 12,
  background: active
    ? "color-mix(in srgb, var(--ls-teal) 12%, var(--ls-surface))"
    : "var(--ls-surface)",
  border: active
    ? "0.5px solid color-mix(in srgb, var(--ls-teal) 50%, transparent)"
    : "0.5px solid var(--ls-border)",
});

const tierPct = (active: boolean): React.CSSProperties => ({
  fontFamily: "Syne, sans-serif",
  fontSize: 20,
  fontWeight: 800,
  color: active ? "var(--ls-teal)" : "var(--ls-gold)",
  minWidth: 58,
});

const hereBadge: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 0.8,
  color: "var(--ls-teal)",
  padding: "2px 8px",
  borderRadius: 999,
  background: "color-mix(in srgb, var(--ls-teal) 14%, transparent)",
  border: "0.5px solid color-mix(in srgb, var(--ls-teal) 40%, transparent)",
};

const distriRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "11px 14px",
  borderRadius: 12,
  background: "color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface))",
  border: "0.5px dashed color-mix(in srgb, var(--ls-gold) 40%, var(--ls-border))",
};

const gainBox: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 12,
  background: "color-mix(in srgb, var(--ls-coral) 8%, var(--ls-surface))",
  border: "0.5px solid color-mix(in srgb, var(--ls-coral) 28%, var(--ls-border))",
  fontSize: 13,
  lineHeight: 1.55,
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  marginBottom: 14,
};

const warnBox: React.CSSProperties = {
  padding: "11px 14px",
  borderRadius: 12,
  background: "color-mix(in srgb, var(--ls-gold) 10%, var(--ls-surface))",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 35%, var(--ls-border))",
  fontSize: 12.5,
  lineHeight: 1.5,
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  marginBottom: 14,
};

const primaryBtn: React.CSSProperties = {
  background: "linear-gradient(135deg, var(--ls-teal), color-mix(in srgb, var(--ls-teal) 70%, var(--ls-gold)))",
  border: "none",
  color: "#04231a",
  fontFamily: "Syne, sans-serif",
  fontSize: 14,
  fontWeight: 800,
  padding: "13px 20px",
  borderRadius: 12,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  fontWeight: 600,
  padding: "13px 18px",
  borderRadius: 12,
  cursor: "pointer",
};
