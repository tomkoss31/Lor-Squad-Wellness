// =============================================================================
// HerbalifeUplinkPanel — distri uplink HL réel sur la fiche client.
//
// Chantier 2026-05-21 : permet d'override le distri_factor utilisé par la
// RPC get_users_rentability quand le coach app n'est pas le distri HL
// d'origine. Ex : Mélanie suit Stéphanie qui est en réalité sous Ophélie
// (Success Builder 42%) chez Herbalife.
//
// UX :
//   - Dropdown "Distri HL uplink" : Coach app (par défaut) | tous les
//     users actifs/inactifs avec un current_rank.
//   - Champ texte "Nom uplink (info)" libre — utile pour notes.
//   - Tooltip explicatif : pourquoi ce champ existe.
// =============================================================================

import { useMemo, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useToast, buildSupabaseErrorToast } from "../../context/ToastContext";
import { RANK_LABELS } from "../../types/domain";
import type { Client } from "../../types/domain";

interface Props {
  client: Client;
}

export function HerbalifeUplinkPanel({ client }: Props) {
  const { users, currentUser, setClientHerbalifeUplink } = useAppContext();
  const { push: pushToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [pickedUserId, setPickedUserId] = useState<string | "">(client.herbalifeUplinkUserId ?? "");
  const [label, setLabel] = useState(client.herbalifeUplinkLabel ?? "");

  const accessible = currentUser?.role === "admin" || currentUser?.role === "referent" || currentUser?.id === client.distributorId;
  if (!accessible) return null;

  // Liste des users sélectionnables : tous les users avec un current_rank renseigné
  const uplinkCandidates = useMemo(() => {
    return users
      .filter((u) => u.currentRank)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  const currentUplinkUser = client.herbalifeUplinkUserId
    ? users.find((u) => u.id === client.herbalifeUplinkUserId)
    : null;
  const hasOverride = !!client.herbalifeUplinkUserId;
  const coachUser = users.find((u) => u.id === client.distributorId);

  async function handleSave() {
    setSaving(true);
    try {
      await setClientHerbalifeUplink(client.id, {
        uplinkUserId: pickedUserId === "" ? null : pickedUserId,
        uplinkLabel: label.trim() || null,
      });
      pushToast({
        tone: "success",
        title: "Uplink HL mis à jour",
        message: "Le calcul de marge va être recalculé selon le rang de l'uplink réel.",
      });
      setOpen(false);
    } catch (err) {
      pushToast(buildSupabaseErrorToast(err, "Impossible de sauvegarder l'uplink HL"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={wrapStyle}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={headerBtnStyle}
        aria-expanded={open}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span aria-hidden="true">🔗</span>
          <span style={titleStyle}>Distri Herbalife uplink</span>
          {hasOverride && (
            <span style={overrideChipStyle}>
              {currentUplinkUser ? `${currentUplinkUser.name} · ${RANK_LABELS[currentUplinkUser.currentRank ?? "distributor_25"] ?? "—"}` : "override actif"}
            </span>
          )}
        </span>
        <span aria-hidden="true" style={{ color: "var(--ls-text-muted)", fontSize: 18 }}>
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && (
        <div style={bodyStyle}>
          <p style={helpStyle}>
            Par défaut, l'app considère que <strong>{coachUser?.name ?? "le coach"}</strong> est aussi le distri uplink Herbalife de ce client.
            Si ce client est en réalité sous un autre distri HL (ex: ancien distri inactif, lignée d'origine), choisis-le ici → le calcul de marge utilise <strong>son rang</strong> pour le coût HL, et l'override remonte automatiquement via la compression chaîne.
          </p>

          <label style={labelStyle}>
            <span style={labelTextStyle}>Distri uplink Herbalife</span>
            <select
              value={pickedUserId}
              onChange={(e) => setPickedUserId(e.target.value)}
              style={selectStyle}
              disabled={saving}
            >
              <option value="">— Coach app (par défaut : {coachUser?.name ?? "—"}) —</option>
              {uplinkCandidates.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {RANK_LABELS[u.currentRank ?? "distributor_25"] ?? "Distributeur 25%"}
                  {u.active ? "" : " (inactif)"}
                </option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            <span style={labelTextStyle}>Note libre (optionnel)</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex: ligne d'origine via Ophélie M."
              style={inputStyle}
              disabled={saving}
              maxLength={120}
            />
          </label>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button
              type="button"
              onClick={() => {
                setPickedUserId(client.herbalifeUplinkUserId ?? "");
                setLabel(client.herbalifeUplinkLabel ?? "");
                setOpen(false);
              }}
              style={btnGhostStyle}
              disabled={saving}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              style={btnPrimaryStyle}
              disabled={saving}
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>

          {hasOverride && (
            <p style={{ ...helpStyle, marginTop: 8, fontSize: 11, color: "var(--ls-teal)" }}>
              ℹ️ Le calcul rentabilité est rétroactif : tous les programmes passés du client utilisent désormais le rang de l'uplink choisi.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 16,
  marginTop: 12,
};

const headerBtnStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 16px",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left",
  color: "var(--ls-text)",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 15,
  fontWeight: 700,
  color: "var(--ls-text)",
};

const overrideChipStyle: React.CSSProperties = {
  marginLeft: 6,
  padding: "2px 8px",
  borderRadius: 999,
  background: "color-mix(in srgb, var(--ls-purple) 12%, transparent)",
  color: "var(--ls-purple)",
  border: "0.5px solid color-mix(in srgb, var(--ls-purple) 30%, transparent)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 11,
  fontWeight: 600,
};

const bodyStyle: React.CSSProperties = {
  padding: "0 16px 16px",
  borderTop: "0.5px solid var(--ls-border)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const helpStyle: React.CSSProperties = {
  fontSize: 12.5,
  color: "var(--ls-text-muted)",
  lineHeight: 1.6,
  margin: "12px 0 4px",
  fontFamily: "DM Sans, sans-serif",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const labelTextStyle: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  color: "var(--ls-text-muted)",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
};

const btnGhostStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 10,
  border: "0.5px solid var(--ls-border)",
  background: "transparent",
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12.5,
  cursor: "pointer",
};

const btnPrimaryStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(135deg, var(--ls-gold), color-mix(in srgb, var(--ls-gold) 80%, var(--ls-coral)))",
  color: "var(--ls-bg)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};
