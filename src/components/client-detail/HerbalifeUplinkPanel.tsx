// =============================================================================
// HerbalifeUplinkPanel — distri uplink HL réel sur la fiche client.
//
// Chantier 2026-05-21 + fix uplink hors-app 2026-05-21 :
// Permet d'override le distri_factor utilisé par la RPC quand le coach app
// n'est pas le distri HL d'origine. 2 modes :
//   - "Dans l'app" : sélectionne un user existant (avec son rang HL).
//   - "Hors app"   : saisis librement nom + rang HL (l'uplink n'est pas
//                    dans la table users).
// =============================================================================

import { useMemo, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useToast, buildSupabaseErrorToast } from "../../context/ToastContext";
import { RANK_LABELS } from "../../types/domain";
import type { Client, HerbalifeRank } from "../../types/domain";

interface Props {
  client: Client;
}

const RANK_OPTIONS: Array<{ value: HerbalifeRank; label: string }> = [
  { value: "distributor_25", label: "Distributor — 25%" },
  { value: "senior_consultant_35", label: "Senior Consultant — 35%" },
  { value: "success_builder_42", label: "Success Builder — 42%" },
  { value: "supervisor_50", label: "Supervisor — 50%" },
  { value: "active_supervisor_50", label: "Active Supervisor — 50%" },
  { value: "world_team_50", label: "World Team — 50%" },
  { value: "active_world_team_50", label: "Active World Team — 50%" },
  { value: "get_team_50", label: "GET Team — 50%" },
  { value: "get_team_2500_50", label: "GET Team 2500 — 50%" },
  { value: "millionaire_50", label: "Millionaire Team — 50%" },
  { value: "millionaire_7500_50", label: "Millionaire 7500 — 50%" },
  { value: "presidents_50", label: "President's Team — 50%" },
];

type Mode = "default" | "user" | "free";

export function HerbalifeUplinkPanel({ client }: Props) {
  const { users, currentUser, setClientHerbalifeUplink, createExternalDistributor } = useAppContext();
  const { push: pushToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  // Création inline d'un distri externe (chantier 2026-05-21 arborescence)
  const [showCreateExternal, setShowCreateExternal] = useState(false);
  const [newExtName, setNewExtName] = useState("");
  const [newExtRank, setNewExtRank] = useState<HerbalifeRank>("success_builder_42");
  const [newExtSponsorId, setNewExtSponsorId] = useState<string>("");
  const [creatingExternal, setCreatingExternal] = useState(false);

  // Mode initial : déduit de l'état actuel
  const initialMode: Mode = client.herbalifeUplinkUserId
    ? "user"
    : client.herbalifeUplinkRank
      ? "free"
      : "default";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [pickedUserId, setPickedUserId] = useState<string>(client.herbalifeUplinkUserId ?? "");
  const [freeName, setFreeName] = useState(client.herbalifeUplinkLabel ?? "");
  const [freeRank, setFreeRank] = useState<HerbalifeRank>(client.herbalifeUplinkRank ?? "success_builder_42");

  const accessible =
    currentUser?.role === "admin" ||
    currentUser?.role === "referent" ||
    currentUser?.id === client.distributorId;
  if (!accessible) return null;

  const uplinkCandidates = useMemo(() => {
    return users
      .filter((u) => u.currentRank)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  const currentUplinkUser = client.herbalifeUplinkUserId
    ? users.find((u) => u.id === client.herbalifeUplinkUserId)
    : null;
  const hasOverride = !!client.herbalifeUplinkUserId || !!client.herbalifeUplinkRank;
  const coachUser = users.find((u) => u.id === client.distributorId);

  // Libellé chip de résumé
  const overrideSummary = currentUplinkUser
    ? `${currentUplinkUser.name} · ${RANK_LABELS[currentUplinkUser.currentRank ?? "distributor_25"] ?? "—"}`
    : client.herbalifeUplinkRank
      ? `${client.herbalifeUplinkLabel || "Uplink hors-app"} · ${RANK_LABELS[client.herbalifeUplinkRank] ?? client.herbalifeUplinkRank}`
      : null;

  async function handleSave() {
    setSaving(true);
    try {
      let payload: {
        uplinkUserId: string | null;
        uplinkLabel: string | null;
        uplinkRank: HerbalifeRank | null;
      };

      if (mode === "default") {
        payload = { uplinkUserId: null, uplinkLabel: null, uplinkRank: null };
      } else if (mode === "user") {
        if (!pickedUserId) {
          pushToast({ tone: "warning", title: "Choisis un user uplink ou bascule en mode 'Hors app'." });
          setSaving(false);
          return;
        }
        payload = { uplinkUserId: pickedUserId, uplinkLabel: null, uplinkRank: null };
      } else {
        if (!freeName.trim()) {
          pushToast({ tone: "warning", title: "Renseigne au moins un nom pour l'uplink hors-app." });
          setSaving(false);
          return;
        }
        payload = { uplinkUserId: null, uplinkLabel: freeName.trim(), uplinkRank: freeRank };
      }

      await setClientHerbalifeUplink(client.id, payload);
      pushToast({
        tone: "success",
        title: "Uplink HL mis à jour",
        message: "Le calcul de marge est recalculé selon le rang de l'uplink.",
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
        <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span aria-hidden="true">🔗</span>
          <span style={titleStyle}>Distri Herbalife uplink</span>
          {hasOverride && overrideSummary && (
            <span style={overrideChipStyle}>{overrideSummary}</span>
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
            Si ce client est en réalité sous un autre distri HL (ancien distri inactif, lignée d'origine, distri non présent dans l'app), choisis-le ici.
            Le calcul de marge utilise <strong>son rang</strong> pour le coût HL → tous les bilans passés sont recalculés rétroactivement.
          </p>

          {/* Mode toggle */}
          <div style={modeToggleWrapStyle}>
            <ModeBtn active={mode === "default"} onClick={() => setMode("default")}>Coach par défaut</ModeBtn>
            <ModeBtn active={mode === "user"} onClick={() => setMode("user")}>Distri dans l'app</ModeBtn>
            <ModeBtn active={mode === "free"} onClick={() => setMode("free")}>Distri hors-app</ModeBtn>
          </div>

          {mode === "default" && (
            <p style={modeHintStyle}>
              ✓ Cas standard : c'est <strong>{coachUser?.name ?? "le coach"}</strong> qui touche la marge HL (son rang sera utilisé pour le calcul).
            </p>
          )}

          {mode === "user" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Distri uplink (dans l'app)</span>
                <select
                  value={pickedUserId}
                  onChange={(e) => setPickedUserId(e.target.value)}
                  style={selectStyle}
                  disabled={saving}
                >
                  <option value="">— Choisis un user de l'app —</option>
                  <optgroup label="Distri actifs">
                    {uplinkCandidates.filter((u) => u.active && !u.isExternal).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {RANK_LABELS[u.currentRank ?? "distributor_25"] ?? "Distributeur 25%"}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Distri externes (créés manuellement)">
                    {uplinkCandidates.filter((u) => u.isExternal).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {RANK_LABELS[u.currentRank ?? "distributor_25"] ?? "Distributeur 25%"} (externe)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Distri inactifs">
                    {uplinkCandidates.filter((u) => !u.active && !u.isExternal).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {RANK_LABELS[u.currentRank ?? "distributor_25"] ?? "Distributeur 25%"} (inactif)
                      </option>
                    ))}
                  </optgroup>
                </select>
                <span style={{ ...labelTextStyle, fontSize: 11, textTransform: "none", letterSpacing: 0, marginTop: 2, fontWeight: 500 }}>
                  Le rang Herbalife du user choisi sera utilisé automatiquement.
                </span>
              </label>

              {/* Création inline d'un nouveau distri externe (chantier
                  arborescence 2026-05-21). Permet d'ajouter Virgile,
                  Aurélie, etc. sans quitter la fiche client. */}
              {!showCreateExternal ? (
                <button
                  type="button"
                  onClick={() => setShowCreateExternal(true)}
                  style={addExternalBtnStyle}
                  disabled={saving}
                >
                  <span aria-hidden="true">+</span>
                  Créer un nouveau distri externe
                </button>
              ) : (
                <div style={createExternalBoxStyle}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ ...labelTextStyle, fontSize: 11 }}>Nouveau distri externe (hors-app)</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateExternal(false);
                        setNewExtName("");
                        setNewExtSponsorId("");
                      }}
                      style={{ background: "transparent", border: "none", color: "var(--ls-text-muted)", cursor: "pointer", fontSize: 16 }}
                      disabled={creatingExternal}
                      aria-label="Annuler création"
                    >
                      ×
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Nom (ex: Virgile, Aurélie Urbes)"
                    value={newExtName}
                    onChange={(e) => setNewExtName(e.target.value)}
                    style={{ ...inputStyle, marginBottom: 8 }}
                    disabled={creatingExternal}
                    maxLength={80}
                  />
                  <select
                    value={newExtRank}
                    onChange={(e) => setNewExtRank(e.target.value as HerbalifeRank)}
                    style={{ ...selectStyle, marginBottom: 8 }}
                    disabled={creatingExternal}
                  >
                    {RANK_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <select
                    value={newExtSponsorId}
                    onChange={(e) => setNewExtSponsorId(e.target.value)}
                    style={{ ...selectStyle, marginBottom: 8 }}
                    disabled={creatingExternal}
                  >
                    <option value="">— Sponsor (optionnel, défaut : toi) —</option>
                    {users.filter((u) => u.id !== client.distributorId).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}{u.isExternal ? " (externe)" : u.active ? "" : " (inactif)"}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newExtName.trim() || newExtName.trim().length < 2) {
                        pushToast({ tone: "warning", title: "Nom requis (min 2 caractères)." });
                        return;
                      }
                      setCreatingExternal(true);
                      try {
                        const result = await createExternalDistributor({
                          name: newExtName.trim(),
                          currentRank: newExtRank,
                          sponsorId: newExtSponsorId || currentUser?.id || null,
                        });
                        if (result.ok && result.userId) {
                          pushToast({
                            tone: "success",
                            title: `${newExtName.trim()} ajouté à ton arborescence`,
                            message: "Tu peux maintenant le sélectionner comme uplink HL.",
                          });
                          setPickedUserId(result.userId);
                          setShowCreateExternal(false);
                          setNewExtName("");
                          setNewExtSponsorId("");
                        } else {
                          pushToast({ tone: "error", title: result.error ?? "Échec création." });
                        }
                      } finally {
                        setCreatingExternal(false);
                      }
                    }}
                    style={btnPrimaryStyle}
                    disabled={creatingExternal}
                  >
                    {creatingExternal ? "Création…" : "Ajouter à mon arborescence"}
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === "free" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Nom du distri uplink</span>
                <input
                  type="text"
                  value={freeName}
                  onChange={(e) => setFreeName(e.target.value)}
                  placeholder="ex: Ophélie M."
                  style={inputStyle}
                  disabled={saving}
                  maxLength={120}
                />
              </label>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Rang Herbalife de cet uplink</span>
                <select
                  value={freeRank}
                  onChange={(e) => setFreeRank(e.target.value as HerbalifeRank)}
                  style={selectStyle}
                  disabled={saving}
                >
                  {RANK_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <span style={{ ...labelTextStyle, fontSize: 11, textTransform: "none", letterSpacing: 0, marginTop: 2, fontWeight: 500 }}>
                  Ce rang est utilisé pour calculer la marge nette de ce client.
                </span>
              </label>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
            <button
              type="button"
              onClick={() => {
                setMode(initialMode);
                setPickedUserId(client.herbalifeUplinkUserId ?? "");
                setFreeName(client.herbalifeUplinkLabel ?? "");
                setFreeRank(client.herbalifeUplinkRank ?? "success_builder_42");
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
            <p style={{ ...helpStyle, marginTop: 4, fontSize: 11, color: "var(--ls-teal)" }}>
              ℹ️ Calcul rétroactif : tous les programmes passés du client utilisent désormais le rang de l'uplink choisi.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ModeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "8px 10px",
        borderRadius: 8,
        border: active ? "0.5px solid var(--ls-gold)" : "0.5px solid var(--ls-border)",
        background: active ? "color-mix(in srgb, var(--ls-gold) 14%, var(--ls-surface2))" : "var(--ls-surface)",
        color: active ? "var(--ls-gold)" : "var(--ls-text-muted)",
        fontFamily: "DM Sans, sans-serif",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all .15s",
      }}
    >
      {children}
    </button>
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

const modeToggleWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: 6,
  padding: 4,
  background: "var(--ls-surface2)",
  borderRadius: 12,
  border: "0.5px solid var(--ls-border)",
};

const modeHintStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  margin: 0,
  padding: "8px 12px",
  background: "var(--ls-surface2)",
  borderRadius: 10,
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

const addExternalBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px dashed var(--ls-border)",
  background: "transparent",
  color: "var(--ls-teal)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  transition: "background .15s",
};

const createExternalBoxStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "color-mix(in srgb, var(--ls-teal) 6%, var(--ls-surface2))",
  border: "0.5px solid color-mix(in srgb, var(--ls-teal) 24%, transparent)",
  display: "flex",
  flexDirection: "column",
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
