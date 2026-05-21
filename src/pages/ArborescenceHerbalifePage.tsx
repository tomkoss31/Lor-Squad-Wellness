// =============================================================================
// ArborescenceHerbalifePage — chantier 2026-05-21
//
// Page admin pour reconstruire son arborescence Herbalife historique et
// saisir les PV mensuels de chaque distri externe (ceux qui ne sont PAS
// dans l'app : Virgile, Aurélie Urbes, Ophélie, etc.).
//
// Vue :
//   - Header : compteur externes + chip mois en cours
//   - Bouton "+ Ajouter un distri externe"
//   - Liste hiérarchique : Thomas en racine → ses externes directs
//     (sponsor_id = Thomas) → leurs sub-sponsored → etc.
//   - Pour chaque externe : card avec nom, rang, total PV ce mois,
//     bouton "Saisir PV ce mois" qui déplie un mini-form 5 champs.
//   - Une fois saisi : badge "✓ Saisi" + total PV affiché.
//
// La RPC `set_user_pv_breakdown` (admin only) est utilisée pour persister.
// Le calcul d'override remonte automatiquement via chain compression sur
// la relation sponsor_id (mécanisme existant).
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useToast, buildSupabaseErrorToast } from "../context/ToastContext";
import { usePvBreakdowns } from "../hooks/usePvBreakdowns";
import { setUserPvBreakdown } from "../services/supabaseService";
import { RANK_LABELS } from "../types/domain";
import type { HerbalifeRank, User } from "../types/domain";
import { Avatar, avatarHue, initialsOf } from "../components/rentability/shared/Avatar";

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

function currentMonthIso(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(iso: string): string {
  try {
    const d = new Date(iso + "-15T12:00:00Z");
    const f = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(d);
    return f.charAt(0).toUpperCase() + f.slice(1);
  } catch {
    return iso;
  }
}

export function ArborescenceHerbalifePage() {
  const navigate = useNavigate();
  const { users, currentUser, createExternalDistributor } = useAppContext();
  const { push: pushToast } = useToast();
  const monthIso = useMemo(() => currentMonthIso(), []);
  const { breakdowns, refetch } = usePvBreakdowns(monthIso);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRank, setNewRank] = useState<HerbalifeRank>("success_builder_42");
  const [newSponsorId, setNewSponsorId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  // Quel externe est actuellement en édition PV ?
  const [editingExternalId, setEditingExternalId] = useState<string | null>(null);

  const isAdmin = currentUser?.role === "admin";
  const externals = useMemo(() => users.filter((u) => u.isExternal), [users]);
  const externalsBySponsor = useMemo(() => {
    const map = new Map<string, User[]>();
    for (const u of externals) {
      const key = u.sponsorId ?? "";
      const arr = map.get(key) ?? [];
      arr.push(u);
      map.set(key, arr);
    }
    return map;
  }, [externals]);

  // Tree de Thomas (currentUser) → externes
  const rootChildren = currentUser ? externalsBySponsor.get(currentUser.id) ?? [] : [];

  if (!currentUser) return null;
  if (!isAdmin) {
    return (
      <div style={wrapStyle}>
        <p style={{ color: "var(--ls-text-muted)" }}>
          Page réservée aux admins. Reviens avec un compte admin.
        </p>
      </div>
    );
  }

  async function handleCreate() {
    if (!newName.trim() || newName.trim().length < 2) {
      pushToast({ tone: "warning", title: "Nom requis (2 caractères min)." });
      return;
    }
    setCreating(true);
    try {
      const result = await createExternalDistributor({
        name: newName.trim(),
        currentRank: newRank,
        sponsorId: newSponsorId || currentUser?.id || null,
      });
      if (result.ok) {
        pushToast({
          tone: "success",
          title: `${newName.trim()} ajouté à ton arborescence`,
        });
        setNewName("");
        setNewSponsorId("");
        setShowCreate(false);
      } else {
        pushToast({ tone: "error", title: result.error ?? "Échec création." });
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={wrapStyle}>
      <button type="button" onClick={() => navigate(-1)} style={backBtnStyle}>
        ← Retour
      </button>

      <header style={headerStyle}>
        <div style={eyebrowStyle}>
          <span aria-hidden="true">🌳</span>
          Arborescence Herbalife
        </div>
        <h1 style={h1Style}>Mes distri externes</h1>
        <p style={subStyle}>
          Reconstruis ici ton équipe Herbalife historique (distri qui ne sont pas sur l'app : Virgile, Aurélie, etc.).
          Saisis leur PV mensuel pour que ton override remonte automatiquement.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
          <span style={chipMonthStyle}>📅 {monthLabel(monthIso)}</span>
          <span style={chipCountStyle}>{externals.length} distri externe{externals.length > 1 ? "s" : ""}</span>
          <button type="button" onClick={() => setShowCreate((s) => !s)} style={addBtnStyle}>
            + Ajouter un distri externe
          </button>
        </div>
      </header>

      {showCreate && (
        <div style={createBoxStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={createTitleStyle}>Nouveau distri externe</span>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              style={{ background: "transparent", border: "none", color: "var(--ls-text-muted)", cursor: "pointer", fontSize: 18 }}
              aria-label="Annuler"
            >
              ×
            </button>
          </div>
          <input
            type="text"
            placeholder="Nom (ex: Virgile L.)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={inputStyle}
            disabled={creating}
            maxLength={80}
          />
          <select
            value={newRank}
            onChange={(e) => setNewRank(e.target.value as HerbalifeRank)}
            style={selectStyle}
            disabled={creating}
          >
            {RANK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={newSponsorId}
            onChange={(e) => setNewSponsorId(e.target.value)}
            style={selectStyle}
            disabled={creating}
          >
            <option value="">— Sponsor (défaut : toi {currentUser?.name}) —</option>
            {users.filter((u) => u.id !== currentUser?.id).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}{u.isExternal ? " (externe)" : u.active ? "" : " (inactif)"}
              </option>
            ))}
          </select>
          <button type="button" onClick={handleCreate} style={btnPrimaryStyle} disabled={creating}>
            {creating ? "Création…" : "Ajouter à mon arborescence"}
          </button>
        </div>
      )}

      {externals.length === 0 ? (
        <div style={emptyStyle}>
          <p style={{ fontSize: 14, color: "var(--ls-text-muted)", marginBottom: 8 }}>
            Aucun distri externe pour l'instant.
          </p>
          <p style={{ fontSize: 12.5, color: "var(--ls-text-muted)" }}>
            Clique "+ Ajouter" pour reconstruire ton arborescence Herbalife.
          </p>
        </div>
      ) : (
        <div style={treeWrapStyle}>
          {/* Racine = currentUser (toi), affichée juste pour le contexte */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <Avatar initials={initialsOf(currentUser.name)} hue={avatarHue(currentUser.name)} size={44} />
            <div>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 16, color: "var(--ls-text)" }}>
                {currentUser.name} <span style={{ color: "var(--ls-gold)", fontSize: 12, marginLeft: 4 }}>(toi · racine)</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--ls-text-muted)" }}>
                {RANK_LABELS[currentUser.currentRank ?? "distributor_25"] ?? "—"}
              </div>
            </div>
          </div>

          <ExternalsList
            users={rootChildren}
            allBySponsor={externalsBySponsor}
            depth={1}
            breakdowns={breakdowns}
            monthIso={monthIso}
            editingExternalId={editingExternalId}
            onEditToggle={(id) => setEditingExternalId((cur) => (cur === id ? null : id))}
            onSaved={() => {
              setEditingExternalId(null);
              void refetch();
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Sous-composants ────────────────────────────────────────────────────────

function ExternalsList({
  users,
  allBySponsor,
  depth,
  breakdowns,
  monthIso,
  editingExternalId,
  onEditToggle,
  onSaved,
}: {
  users: User[];
  allBySponsor: Map<string, User[]>;
  depth: number;
  breakdowns: import("../lib/herbalifeFormulas").PvMonthlyBreakdown[];
  monthIso: string;
  editingExternalId: string | null;
  onEditToggle: (id: string) => void;
  onSaved: () => void;
}) {
  if (users.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginLeft: depth * 16 }}>
      {users.map((u) => {
        const b = breakdowns.find((x) => x.userId === u.id);
        const total = b
          ? (b.pv15 ?? 0) + (b.pv25 ?? 0) + (b.pv35 ?? 0) + (b.pv42 ?? 0) + (b.pvRoyalty ?? 0)
          : 0;
        const editing = editingExternalId === u.id;
        const subChildren = allBySponsor.get(u.id) ?? [];
        return (
          <div key={u.id}>
            <div style={externalCardStyle(editing)}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ color: "var(--ls-text-muted)", fontSize: 12 }}>↳</span>
                <Avatar initials={initialsOf(u.name)} hue={avatarHue(u.name)} size={36} />
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--ls-text)" }}>
                    {u.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
                    {RANK_LABELS[u.currentRank ?? "distributor_25"] ?? "—"} · externe
                  </div>
                </div>
                {total > 0 && (
                  <span style={pvBadgeStyle}>
                    ✓ {Math.round(total).toLocaleString("fr-FR")} PV
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onEditToggle(u.id)}
                  style={editBtnStyle(total > 0)}
                >
                  {editing ? "Fermer" : total > 0 ? "Modifier PV" : "Saisir PV ce mois"}
                </button>
              </div>

              {editing && (
                <PvEditor
                  userId={u.id}
                  userName={u.name}
                  monthIso={monthIso}
                  initial={b}
                  onSaved={onSaved}
                />
              )}
            </div>

            {/* Récursif sur les enfants de cet externe (Thomas → Virgile → Aurélie) */}
            {subChildren.length > 0 && (
              <ExternalsList
                users={subChildren}
                allBySponsor={allBySponsor}
                depth={depth + 1}
                breakdowns={breakdowns}
                monthIso={monthIso}
                editingExternalId={editingExternalId}
                onEditToggle={onEditToggle}
                onSaved={onSaved}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PvEditor({
  userId,
  userName,
  monthIso,
  initial,
  onSaved,
}: {
  userId: string;
  userName: string;
  monthIso: string;
  initial: import("../lib/herbalifeFormulas").PvMonthlyBreakdown | undefined;
  onSaved: () => void;
}) {
  const { push: pushToast } = useToast();
  const [pv15, setPv15] = useState(String(initial?.pv15 ?? ""));
  const [pv25, setPv25] = useState(String(initial?.pv25 ?? ""));
  const [pv35, setPv35] = useState(String(initial?.pv35 ?? ""));
  const [pv42, setPv42] = useState(String(initial?.pv42 ?? ""));
  const [pvRoyalty, setPvRoyalty] = useState(String(initial?.pvRoyalty ?? ""));
  const [saving, setSaving] = useState(false);

  const total =
    (parseFloat(pv15) || 0) +
    (parseFloat(pv25) || 0) +
    (parseFloat(pv35) || 0) +
    (parseFloat(pv42) || 0) +
    (parseFloat(pvRoyalty) || 0);

  async function handleSave() {
    setSaving(true);
    try {
      await setUserPvBreakdown({
        userId,
        month: monthIso,
        pv15: parseFloat(pv15) || 0,
        pv25: parseFloat(pv25) || 0,
        pv35: parseFloat(pv35) || 0,
        pv42: parseFloat(pv42) || 0,
        pvRoyalty: parseFloat(pvRoyalty) || 0,
      });
      pushToast({
        tone: "success",
        title: `PV ${userName} enregistrés`,
        message: `Total ${Math.round(total)} PV pour ${monthLabel(monthIso)}.`,
      });
      onSaved();
    } catch (err) {
      pushToast(buildSupabaseErrorToast(err, "Impossible d'enregistrer le breakdown"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={editorBoxStyle}>
      <div style={editorGridStyle}>
        <PvField label="PV à 15% (Préférés)" value={pv15} setValue={setPv15} />
        <PvField label="PV à 25% (Distri)" value={pv25} setValue={setPv25} />
        <PvField label="PV à 35% (Senior)" value={pv35} setValue={setPv35} />
        <PvField label="PV à 42% (Success Builder)" value={pv42} setValue={setPv42} />
        <PvField label="PV Royalty (Supervisor 50%+)" value={pvRoyalty} setValue={setPvRoyalty} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: 13, color: "var(--ls-text-muted)" }}>
          Total : <strong style={{ color: "var(--ls-text)", fontWeight: 700 }}>{Math.round(total).toLocaleString("fr-FR")} PV</strong>
        </span>
        <button type="button" onClick={handleSave} style={btnPrimaryStyle} disabled={saving}>
          {saving ? "Enregistrement…" : `Enregistrer ${monthLabel(monthIso)}`}
        </button>
      </div>
    </div>
  );
}

function PvField({ label, value, setValue }: { label: string; value: string; setValue: (v: string) => void }) {
  return (
    <label style={pvFieldStyle}>
      <span style={pvLabelStyle}>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step="0.01"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={pvInputStyle}
        placeholder="0"
      />
    </label>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const wrapStyle: React.CSSProperties = {
  maxWidth: 880,
  margin: "0 auto",
  padding: "20px 18px 60px",
};

const backBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  cursor: "pointer",
  marginBottom: 14,
  padding: 0,
};

const headerStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface)) 0%, color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface)) 100%)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 22,
  padding: 24,
  marginBottom: 20,
};

const eyebrowStyle: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 1.4,
  color: "var(--ls-teal)",
  display: "inline-flex",
  gap: 6,
};

const h1Style: React.CSSProperties = {
  margin: "6px 0 8px",
  fontFamily: "Syne, sans-serif",
  fontSize: 28,
  fontWeight: 800,
  color: "var(--ls-text)",
};

const subStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13.5,
  lineHeight: 1.55,
  color: "var(--ls-text-muted)",
  maxWidth: 640,
};

const chipMonthStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 28,
  padding: "0 12px",
  borderRadius: 999,
  background: "color-mix(in srgb, var(--ls-teal) 12%, var(--ls-surface))",
  color: "var(--ls-teal)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12,
  fontWeight: 600,
  border: "0.5px solid color-mix(in srgb, var(--ls-teal) 24%, transparent)",
};

const chipCountStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 28,
  padding: "0 12px",
  borderRadius: 999,
  background: "var(--ls-surface2)",
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12,
  fontWeight: 500,
  border: "0.5px solid var(--ls-border)",
};

const addBtnStyle: React.CSSProperties = {
  marginLeft: "auto",
  padding: "8px 16px",
  borderRadius: 999,
  border: "none",
  background: "linear-gradient(135deg, var(--ls-gold), color-mix(in srgb, var(--ls-gold) 80%, var(--ls-coral)))",
  color: "var(--ls-bg)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};

const createBoxStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 14,
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  marginBottom: 18,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const createTitleStyle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 14,
  fontWeight: 700,
  color: "var(--ls-text)",
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

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

const btnPrimaryStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(135deg, var(--ls-gold), color-mix(in srgb, var(--ls-gold) 80%, var(--ls-coral)))",
  color: "var(--ls-bg)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const emptyStyle: React.CSSProperties = {
  textAlign: "center",
  padding: 40,
  background: "var(--ls-surface)",
  border: "0.5px dashed var(--ls-border)",
  borderRadius: 14,
};

const treeWrapStyle: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 18,
  padding: 18,
};

function externalCardStyle(editing: boolean): React.CSSProperties {
  return {
    background: editing
      ? "color-mix(in srgb, var(--ls-gold) 5%, var(--ls-surface2))"
      : "var(--ls-surface2)",
    border: editing
      ? "0.5px solid color-mix(in srgb, var(--ls-gold) 40%, transparent)"
      : "0.5px solid var(--ls-border)",
    borderRadius: 12,
    padding: 12,
  };
}

const pvBadgeStyle: React.CSSProperties = {
  padding: "3px 10px",
  borderRadius: 999,
  background: "color-mix(in srgb, var(--ls-teal) 14%, transparent)",
  color: "var(--ls-teal)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 11,
  fontWeight: 600,
  border: "0.5px solid color-mix(in srgb, var(--ls-teal) 28%, transparent)",
};

function editBtnStyle(hasData: boolean): React.CSSProperties {
  return {
    padding: "7px 14px",
    borderRadius: 10,
    border: hasData ? "0.5px solid var(--ls-border)" : "none",
    background: hasData
      ? "transparent"
      : "linear-gradient(135deg, var(--ls-teal), color-mix(in srgb, var(--ls-teal) 80%, var(--ls-purple)))",
    color: hasData ? "var(--ls-text-muted)" : "var(--ls-bg)",
    fontFamily: "DM Sans, sans-serif",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

const editorBoxStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 14,
  borderRadius: 12,
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
};

const editorGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
};

const pvFieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const pvLabelStyle: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--ls-text-muted)",
};

const pvInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
};
