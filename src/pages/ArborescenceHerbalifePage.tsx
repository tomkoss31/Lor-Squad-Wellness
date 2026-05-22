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

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useToast, buildSupabaseErrorToast } from "../context/ToastContext";
import { usePvBreakdowns } from "../hooks/usePvBreakdowns";
import {
  setUserPvBreakdown,
  loadUserPvHistory,
  loadDistinctManualEntries,
  migrateManualToExternal,
} from "../services/supabaseService";
import { RANK_LABELS } from "../types/domain";
import type { HerbalifeRank, User } from "../types/domain";
import { Avatar, avatarHue, initialsOf } from "../components/rentability/shared/Avatar";
import { PV_BREAKDOWN_UPDATED_EVENT } from "../hooks/usePvBreakdowns";

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
  const { users, currentUser, createExternalDistributor, updateExternalDistributor, deleteExternalDistributor } = useAppContext();
  const { push: pushToast } = useToast();
  // Sélecteur de mois (chantier #3 polish 2026-05-22) : permet de saisir
  // rétroactivement pour les mois passés. Default = mois en cours.
  const [selectedMonth, setSelectedMonth] = useState<string>(() => currentMonthIso());
  const monthIso = selectedMonth;
  const { breakdowns, refetch } = usePvBreakdowns(monthIso);

  // Génère liste mois sélectionnables : 12 mois passés + 2 mois futurs.
  const monthOptions = useMemo(() => {
    const now = new Date();
    const out: Array<{ value: string; label: string }> = [];
    for (let offset = 2; offset >= -12; offset--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 15));
      const value = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      const label = monthLabel(value);
      out.push({ value, label });
    }
    return out;
  }, []);
  const isCurrentMonth = selectedMonth === currentMonthIso();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRank, setNewRank] = useState<HerbalifeRank>("success_builder_42");
  const [newSponsorId, setNewSponsorId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  // Import CSV bulk (chantier #4 polish 2026-05-22)
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvRaw, setCsvRaw] = useState("");
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState<Array<{ name: string; ok: boolean; error?: string }>>([]);

  // Migration manual_pv_entries → externes (chantier #9 polish 2026-05-22)
  const [showMigration, setShowMigration] = useState(false);
  const [manualEntries, setManualEntries] = useState<Array<{ name: string; tierPct: number; monthsCount: number; totalPv: number; entryIds: string[] }>>([]);
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationLog, setMigrationLog] = useState<Array<{ name: string; ok: boolean; monthsMigrated?: number; error?: string }>>([]);
  const [selectedToMigrate, setSelectedToMigrate] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!showMigration || !currentUser) return;
    setMigrationLoading(true);
    void loadDistinctManualEntries(currentUser.id)
      .then((rows) => {
        setManualEntries(rows);
        setSelectedToMigrate(new Set(rows.map((r) => r.name)));
      })
      .finally(() => setMigrationLoading(false));
  }, [showMigration, currentUser]);

  function tierPctToRank(tier: number): HerbalifeRank {
    if (tier <= 25) return "distributor_25";
    if (tier <= 35) return "senior_consultant_35";
    if (tier <= 42) return "success_builder_42";
    return "supervisor_50";
  }

  // Quel externe est actuellement en édition PV ?
  const [editingExternalId, setEditingExternalId] = useState<string | null>(null);
  // Edit / delete distri modals (chantier 2026-05-22)
  const [editProfileUser, setEditProfileUser] = useState<User | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);

  // Search + tri (chantier #2 polish 2026-05-22)
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<"tree" | "name" | "pv" | "rank">("tree");

  // Vue consolidée (chantier #5 polish 2026-05-22)
  // "externals" = uniquement externes (défaut historique)
  // "all" = externes + vrais distri actifs/inactifs (vue team complète)
  const [scopeMode, setScopeMode] = useState<"externals" | "all">("externals");

  const isAdmin = currentUser?.role === "admin";
  const externals = useMemo(() => users.filter((u) => u.isExternal), [users]);

  // Scope effectif (chantier #5) : externes seuls OU toute l'équipe
  // (externes + vrais distri actifs/inactifs, mais EXCLU toi-même qui es la racine).
  const scopedUsers = useMemo(() => {
    if (scopeMode === "all") {
      return users.filter((u) => u.id !== currentUser?.id);
    }
    return externals;
  }, [scopeMode, users, externals, currentUser]);

  // Filtre search (chantier #2)
  const searchLower = searchQuery.trim().toLowerCase();
  const filteredExternals = useMemo(() => {
    if (!searchLower) return scopedUsers;
    return scopedUsers.filter((u) => u.name.toLowerCase().includes(searchLower));
  }, [scopedUsers, searchLower]);

  // Tri "flat" pour les modes name / pv / rank
  const flatSorted = useMemo(() => {
    if (sortMode === "tree") return [];
    const list = [...filteredExternals];
    if (sortMode === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === "pv") {
      const totalFor = (id: string) => {
        const b = breakdowns.find((x) => x.userId === id);
        return b ? (b.pv15 ?? 0) + (b.pv25 ?? 0) + (b.pv35 ?? 0) + (b.pv42 ?? 0) + (b.pvRoyalty ?? 0) : 0;
      };
      list.sort((a, b) => totalFor(b.id) - totalFor(a.id));
    } else if (sortMode === "rank") {
      const rankOrder: Record<string, number> = {
        presidents_50: 12,
        millionaire_7500_50: 11,
        millionaire_50: 10,
        get_team_2500_50: 9,
        get_team_50: 8,
        active_world_team_50: 7,
        world_team_50: 6,
        active_supervisor_50: 5,
        supervisor_50: 4,
        success_builder_42: 3,
        senior_consultant_35: 2,
        distributor_25: 1,
      };
      list.sort((a, b) =>
        (rankOrder[b.currentRank ?? "distributor_25"] ?? 0) -
        (rankOrder[a.currentRank ?? "distributor_25"] ?? 0)
      );
    }
    return list;
  }, [filteredExternals, sortMode, breakdowns]);
  const externalsBySponsor = useMemo(() => {
    const map = new Map<string, User[]>();
    for (const u of scopedUsers) {
      const key = u.sponsorId ?? "";
      const arr = map.get(key) ?? [];
      arr.push(u);
      map.set(key, arr);
    }
    return map;
  }, [scopedUsers]);

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
      <style>{`
        @media (max-width: 720px) {
          .lr-arbo-header-row { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
          .lr-arbo-actions { width: 100%; flex-wrap: wrap; }
          .lr-arbo-actions > button, .lr-arbo-actions > .lr-arbo-month-pick {
            flex: 1 1 calc(50% - 4px);
            min-width: 0;
          }
          .lr-arbo-h1 { font-size: 22px !important; }
          .lr-arbo-sub { font-size: 12.5px !important; }
          .lr-arbo-tree { padding: 12px !important; }
          .lr-arbo-card-row { flex-wrap: wrap !important; }
          .lr-arbo-card-row [data-arbo-actions] {
            margin-left: auto;
          }
          .lr-arbo-edit-btn { font-size: 11px !important; padding: 6px 10px !important; }
          .lr-arbo-modal-content { max-width: 100% !important; max-height: calc(100vh - 32px) !important; overflow-y: auto !important; }
        }
        @media (max-width: 480px) {
          .lr-arbo-tree { padding: 8px !important; }
          .lr-arbo-tree > div { margin-left: 8px !important; }
        }
      `}</style>
      <button type="button" onClick={() => navigate(-1)} style={backBtnStyle}>
        ← Retour
      </button>

      <header style={headerStyle}>
        <div style={eyebrowStyle}>
          <span aria-hidden="true">🌳</span>
          Arborescence Herbalife
        </div>
        <h1 className="lr-arbo-h1" style={h1Style}>Mes distri externes</h1>
        <p className="lr-arbo-sub" style={subStyle}>
          Reconstruis ici ton équipe Herbalife historique (distri qui ne sont pas sur l'app : Virgile, Aurélie, etc.).
          Saisis leur PV mensuel pour que ton override remonte automatiquement.
        </p>
        <div className="lr-arbo-header-row lr-arbo-actions" style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
          <div className="lr-arbo-month-pick" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span aria-hidden="true">📅</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={monthSelectStyle}
              aria-label="Mois de saisie"
            >
              {monthOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}{o.value === currentMonthIso() ? " (en cours)" : ""}
                </option>
              ))}
            </select>
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={() => setSelectedMonth(currentMonthIso())}
                style={resetMonthBtnStyle}
                title="Revenir au mois en cours"
              >
                ↺
              </button>
            )}
          </div>
          <div style={scopeToggleWrapStyle}>
            <button
              type="button"
              onClick={() => setScopeMode("externals")}
              style={scopeBtnStyle(scopeMode === "externals")}
            >
              🌳 Externes ({externals.length})
            </button>
            <button
              type="button"
              onClick={() => setScopeMode("all")}
              style={scopeBtnStyle(scopeMode === "all")}
            >
              👥 Team complète ({users.length - 1})
            </button>
          </div>
          <button type="button" onClick={() => setShowCreate((s) => !s)} style={addBtnStyle}>
            + Ajouter un distri externe
          </button>
          <button type="button" onClick={() => setShowCsvImport((s) => !s)} style={importBtnStyle}>
            📥 Import CSV
          </button>
          <button type="button" onClick={() => setShowMigration((s) => !s)} style={importBtnStyle}>
            🔄 Migrer mes entries hors-app
          </button>
        </div>
        {!isCurrentMonth && (
          <div style={retroBannerStyle}>
            <span aria-hidden="true">⏱️</span>
            Saisie rétroactive pour <strong>{monthLabel(selectedMonth)}</strong>. L'historique sera mis à jour rétroactivement dans tous les calculs de rentabilité.
          </div>
        )}
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

      {showCsvImport && (
        <div style={createBoxStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={createTitleStyle}>📥 Import CSV bulk</span>
            <button
              type="button"
              onClick={() => { setShowCsvImport(false); setCsvRaw(""); setImportLog([]); }}
              style={{ background: "transparent", border: "none", color: "var(--ls-text-muted)", cursor: "pointer", fontSize: 18 }}
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
          <p style={{ fontSize: 12.5, color: "var(--ls-text-muted)", margin: "0 0 10px", lineHeight: 1.6, fontFamily: "DM Sans, sans-serif" }}>
            Colle ton CSV avec une ligne par distri. Format : <code style={codeStyle}>nom,rang,sponsor</code><br />
            Rangs valides : <code style={codeStyle}>distributor_25</code>, <code style={codeStyle}>senior_consultant_35</code>, <code style={codeStyle}>success_builder_42</code>, <code style={codeStyle}>supervisor_50</code>, etc.<br />
            Sponsor : nom d'un distri existant (toi ou un autre externe). Vide = toi.
          </p>
          <textarea
            value={csvRaw}
            onChange={(e) => setCsvRaw(e.target.value)}
            placeholder={`Virgile L.,success_builder_42,\nAurélie Urbes,senior_consultant_35,Virgile L.\nOphélie M.,success_builder_42,`}
            style={textareaStyle}
            disabled={importing}
            rows={6}
          />
          {importLog.length > 0 && (
            <div style={importLogStyle}>
              <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "var(--ls-text-muted)" }}>
                Résultat ({importLog.filter((l) => l.ok).length}/{importLog.length} créés) :
              </p>
              {importLog.map((entry, idx) => (
                <div key={idx} style={{ fontSize: 11.5, color: entry.ok ? "var(--ls-teal)" : "var(--ls-coral)", marginBottom: 2 }}>
                  {entry.ok ? "✓" : "✗"} {entry.name}{entry.error ? ` — ${entry.error}` : ""}
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={async () => {
              const lines = csvRaw.split("\n").map((l) => l.trim()).filter(Boolean);
              if (lines.length === 0) {
                pushToast({ tone: "warning", title: "Le CSV est vide." });
                return;
              }
              setImporting(true);
              setImportLog([]);
              const log: Array<{ name: string; ok: boolean; error?: string }> = [];
              for (const line of lines) {
                const parts = line.split(",").map((p) => p.trim());
                const name = parts[0] ?? "";
                const rank = (parts[1] ?? "success_builder_42") as HerbalifeRank;
                const sponsorName = parts[2] ?? "";
                if (!name || name.length < 2) {
                  log.push({ name: line, ok: false, error: "Nom invalide" });
                  continue;
                }
                let sponsorId: string | null = currentUser?.id ?? null;
                if (sponsorName) {
                  // Match par nom (insensitive)
                  const match = users.find((u) => u.name.toLowerCase() === sponsorName.toLowerCase());
                  if (match) {
                    sponsorId = match.id;
                  } else {
                    log.push({ name, ok: false, error: `Sponsor "${sponsorName}" introuvable` });
                    continue;
                  }
                }
                const result = await createExternalDistributor({ name, currentRank: rank, sponsorId });
                if (result.ok) {
                  log.push({ name, ok: true });
                } else {
                  log.push({ name, ok: false, error: result.error });
                }
              }
              setImportLog(log);
              const okCount = log.filter((l) => l.ok).length;
              pushToast({
                tone: okCount === log.length ? "success" : okCount > 0 ? "warning" : "error",
                title: `Import : ${okCount}/${log.length} créé${okCount > 1 ? "s" : ""}`,
              });
              setImporting(false);
              if (okCount === log.length) {
                setCsvRaw("");
              }
            }}
            style={btnPrimaryStyle}
            disabled={importing || !csvRaw.trim()}
          >
            {importing ? "Import en cours…" : `Importer ${csvRaw.split("\n").filter((l) => l.trim()).length} ligne(s)`}
          </button>
        </div>
      )}

      {showMigration && (
        <div style={createBoxStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={createTitleStyle}>🔄 Migrer tes entries hors-app → distri externes</span>
            <button
              type="button"
              onClick={() => { setShowMigration(false); setMigrationLog([]); }}
              style={{ background: "transparent", border: "none", color: "var(--ls-text-muted)", cursor: "pointer", fontSize: 18 }}
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
          <p style={{ fontSize: 12.5, color: "var(--ls-text-muted)", margin: "0 0 12px", lineHeight: 1.6, fontFamily: "DM Sans, sans-serif" }}>
            Les anciennes saisies <code style={codeStyle}>manual_pv_entries</code> (issue de la V1 rentab) peuvent être
            converties en distri externes persistants : chaque nom devient un user externe avec son rang HL, et tous
            les mois historiques sont transférés vers le breakdown du nouveau user. Les entries originales sont supprimées.
            <br />
            ➜ Tu pourras ensuite saisir leurs PV mois après mois sans re-saisir leur identité.
          </p>

          {migrationLoading ? (
            <div style={{ textAlign: "center", padding: 20, color: "var(--ls-text-muted)" }}>Chargement…</div>
          ) : manualEntries.length === 0 ? (
            <div style={{ padding: 16, textAlign: "center", color: "var(--ls-text-muted)", background: "var(--ls-surface2)", borderRadius: 8, fontSize: 13 }}>
              ✨ Aucune entry manual_pv à migrer. Tu es à jour.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
                {manualEntries.length} distri unique{manualEntries.length > 1 ? "s" : ""} détecté{manualEntries.length > 1 ? "s" : ""}
              </div>
              <div style={migrationListStyle}>
                {manualEntries.map((e) => {
                  const checked = selectedToMigrate.has(e.name);
                  return (
                    <label key={e.name} style={migrationRowStyle(checked)}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(ev) => {
                          const next = new Set(selectedToMigrate);
                          if (ev.target.checked) next.add(e.name);
                          else next.delete(e.name);
                          setSelectedToMigrate(next);
                        }}
                        disabled={migrating}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: "var(--ls-text)" }}>
                          {e.name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
                          Tier {e.tierPct}% → {RANK_LABELS[tierPctToRank(e.tierPct)]} · {e.monthsCount} mois · {Math.round(e.totalPv).toLocaleString("fr-FR")} PV cumulés
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {migrationLog.length > 0 && (
                <div style={importLogStyle}>
                  <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "var(--ls-text-muted)" }}>
                    Résultat ({migrationLog.filter((l) => l.ok).length}/{migrationLog.length} migrés) :
                  </p>
                  {migrationLog.map((entry, idx) => (
                    <div key={idx} style={{ fontSize: 11.5, color: entry.ok ? "var(--ls-teal)" : "var(--ls-coral)", marginBottom: 2 }}>
                      {entry.ok ? "✓" : "✗"} {entry.name}
                      {entry.ok && entry.monthsMigrated != null ? ` (${entry.monthsMigrated} mois)` : ""}
                      {entry.error ? ` — ${entry.error}` : ""}
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={async () => {
                  if (selectedToMigrate.size === 0 || !currentUser) return;
                  setMigrating(true);
                  setMigrationLog([]);
                  const log: typeof migrationLog = [];
                  for (const entry of manualEntries.filter((e) => selectedToMigrate.has(e.name))) {
                    const result = await migrateManualToExternal({
                      viewerUserId: currentUser.id,
                      name: entry.name,
                      currentRank: tierPctToRank(entry.tierPct),
                      sponsorId: currentUser.id,
                    });
                    if (result.ok) {
                      log.push({ name: entry.name, ok: true, monthsMigrated: result.monthsMigrated });
                    } else {
                      log.push({ name: entry.name, ok: false, error: result.error });
                    }
                  }
                  setMigrationLog(log);
                  const okCount = log.filter((l) => l.ok).length;
                  pushToast({
                    tone: okCount === log.length ? "success" : okCount > 0 ? "warning" : "error",
                    title: `Migration : ${okCount}/${log.length} OK`,
                  });
                  setMigrating(false);
                  // Recharge la liste (les migrés ont disparu)
                  if (currentUser) {
                    void loadDistinctManualEntries(currentUser.id).then(setManualEntries);
                  }
                }}
                style={btnPrimaryStyle}
                disabled={migrating || selectedToMigrate.size === 0}
              >
                {migrating ? "Migration en cours…" : `Migrer ${selectedToMigrate.size} distri en bloc`}
              </button>
            </>
          )}
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
        <>
          {/* Search + tri (chantier #2 polish 2026-05-22) */}
          <div style={searchBarStyle}>
            <input
              type="search"
              placeholder="🔍 Chercher par nom (Virgile, Aurélie...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={searchInputStyle}
            />
            <div style={sortChipsRowStyle}>
              <SortChip active={sortMode === "tree"} onClick={() => setSortMode("tree")}>🌳 Arbre</SortChip>
              <SortChip active={sortMode === "name"} onClick={() => setSortMode("name")}>A-Z</SortChip>
              <SortChip active={sortMode === "pv"} onClick={() => setSortMode("pv")}>💰 PV</SortChip>
              <SortChip active={sortMode === "rank"} onClick={() => setSortMode("rank")}>👑 Rang</SortChip>
            </div>
          </div>

          {searchLower && (
            <div style={searchSummaryStyle}>
              {filteredExternals.length} résultat{filteredExternals.length > 1 ? "s" : ""} pour "{searchQuery}"
              {filteredExternals.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{ marginLeft: 10, background: "transparent", border: "none", color: "var(--ls-text-muted)", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}
                >
                  effacer
                </button>
              )}
            </div>
          )}

          <div className="lr-arbo-tree" style={treeWrapStyle}>
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

            {sortMode === "tree" ? (
              <ExternalsList
                users={searchLower ? filteredExternals.filter((u) => u.sponsorId === currentUser.id || !u.sponsorId) : rootChildren}
                allBySponsor={searchLower
                  ? new Map(Array.from(externalsBySponsor.entries()).map(([k, v]) => [k, v.filter((u) => filteredExternals.includes(u))]))
                  : externalsBySponsor}
                depth={1}
                breakdowns={breakdowns}
                monthIso={monthIso}
                editingExternalId={editingExternalId}
                onEditToggle={(id) => setEditingExternalId((cur) => (cur === id ? null : id))}
                onSaved={() => {
                  setEditingExternalId(null);
                  void refetch();
                }}
                onEditProfile={(u) => setEditProfileUser(u)}
                onDelete={(u) => setDeleteConfirmUser(u)}
              />
            ) : (
              <ExternalsList
                users={flatSorted}
                allBySponsor={new Map()}
                depth={0}
                breakdowns={breakdowns}
                monthIso={monthIso}
                editingExternalId={editingExternalId}
                onEditToggle={(id) => setEditingExternalId((cur) => (cur === id ? null : id))}
                onSaved={() => {
                  setEditingExternalId(null);
                  void refetch();
                }}
                onEditProfile={(u) => setEditProfileUser(u)}
                onDelete={(u) => setDeleteConfirmUser(u)}
              />
            )}
          </div>
        </>
      )}

      {/* Edit profile modal */}
      {editProfileUser && (
        <EditProfileModal
          user={editProfileUser}
          allUsers={users}
          currentUserId={currentUser.id}
          onClose={() => setEditProfileUser(null)}
          onSave={async (payload) => {
            const result = await updateExternalDistributor({
              userId: editProfileUser.id,
              ...payload,
            });
            if (result.ok) {
              pushToast({ tone: "success", title: `${payload.name} mis à jour` });
              setEditProfileUser(null);
            } else {
              pushToast({ tone: "error", title: result.error ?? "Échec mise à jour." });
            }
          }}
        />
      )}

      {/* Delete confirmation modal — gère aussi la réassignation des
          enfants si le distri à supprimer en a (chantier #1 polish). */}
      {deleteConfirmUser && (
        <DeleteConfirmModal
          user={deleteConfirmUser}
          allUsers={users}
          currentUserId={currentUser.id}
          childrenCount={
            externalsBySponsor.get(deleteConfirmUser.id)?.length ?? 0
          }
          onClose={() => setDeleteConfirmUser(null)}
          onConfirm={async (reassignTo: string | null) => {
            const children = externalsBySponsor.get(deleteConfirmUser.id) ?? [];
            // 1. Si enfants présents et réassignation choisie : update chaque enfant d'abord
            if (children.length > 0 && reassignTo) {
              for (const child of children) {
                const r = await updateExternalDistributor({
                  userId: child.id,
                  name: child.name,
                  currentRank: child.currentRank ?? "distributor_25",
                  sponsorId: reassignTo,
                });
                if (!r.ok) {
                  pushToast({
                    tone: "error",
                    title: `Réassignation ${child.name} échouée : ${r.error}`,
                  });
                  return;
                }
              }
              pushToast({
                tone: "success",
                title: `${children.length} enfant(s) réassigné(s)`,
              });
            }
            // 2. Delete le distri
            const result = await deleteExternalDistributor(deleteConfirmUser.id);
            if (result.ok) {
              pushToast({ tone: "success", title: `${deleteConfirmUser.name} supprimé` });
              setDeleteConfirmUser(null);
            } else {
              pushToast({ tone: "error", title: result.error ?? "Échec suppression." });
            }
          }}
        />
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
  onEditProfile,
  onDelete,
}: {
  users: User[];
  allBySponsor: Map<string, User[]>;
  depth: number;
  breakdowns: import("../lib/herbalifeFormulas").PvMonthlyBreakdown[];
  monthIso: string;
  editingExternalId: string | null;
  onEditToggle: (id: string) => void;
  onSaved: () => void;
  onEditProfile: (u: User) => void;
  onDelete: (u: User) => void;
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
                    {RANK_LABELS[u.currentRank ?? "distributor_25"] ?? "—"} ·{" "}
                    {u.isExternal ? (
                      <span style={{ color: "var(--ls-purple)" }}>externe</span>
                    ) : u.active ? (
                      <span style={{ color: "var(--ls-teal)" }}>actif app</span>
                    ) : (
                      <span style={{ color: "var(--ls-text-muted)" }}>inactif</span>
                    )}
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
                {/* Edit/Delete réservés aux externes (chantier #5 polish) */}
                {u.isExternal && (
                  <ActionsMenu
                    onEdit={() => onEditProfile(u)}
                    onDelete={() => onDelete(u)}
                  />
                )}
              </div>

              {/* Historique multi-mois (chantier 2026-05-22) */}
              <PvHistoryStrip userId={u.id} currentMonth={monthIso} />

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
                onEditProfile={onEditProfile}
                onDelete={onDelete}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SortChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 28,
        padding: "0 12px",
        borderRadius: 999,
        border: active ? "0.5px solid var(--ls-gold)" : "0.5px solid var(--ls-border)",
        background: active ? "color-mix(in srgb, var(--ls-gold) 14%, var(--ls-surface2))" : "var(--ls-surface)",
        color: active ? "var(--ls-gold)" : "var(--ls-text-muted)",
        fontFamily: "DM Sans, sans-serif",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

// ─── ActionsMenu ────────────────────────────────────────────────────────────
function ActionsMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Actions"
        style={actionsBtnStyle}
      >
        ⋯
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={menuBackdropStyle} aria-hidden="true" />
          <div style={menuStyle}>
            <button
              type="button"
              onClick={() => { setOpen(false); onEdit(); }}
              style={menuItemStyle}
            >
              ✏️  Modifier nom / rang / sponsor
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); onDelete(); }}
              style={{ ...menuItemStyle, color: "var(--ls-coral)" }}
            >
              🗑️  Supprimer ce distri
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── PvHistoryStrip ─────────────────────────────────────────────────────────
// Affiche les 5 derniers mois saisis (hors mois courant) sous forme de
// petites chips. Auto-refetch sur PV_BREAKDOWN_UPDATED_EVENT.
function PvHistoryStrip({ userId, currentMonth }: { userId: string; currentMonth: string }) {
  const [history, setHistory] = useState<Awaited<ReturnType<typeof loadUserPvHistory>>>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await loadUserPvHistory(userId, 6);
      setHistory(rows.filter((r) => r.month !== currentMonth));
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [userId, currentMonth]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => void fetchHistory();
    window.addEventListener(PV_BREAKDOWN_UPDATED_EVENT, handler);
    return () => window.removeEventListener(PV_BREAKDOWN_UPDATED_EVENT, handler);
  }, [fetchHistory]);

  if (loading && history.length === 0) return null;
  if (history.length === 0) return null;

  return (
    <div style={historyStripStyle}>
      <span style={historyLabelStyle}>Historique :</span>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {history.map((h) => (
          <span key={h.month} style={historyChipStyle} title={`Détail ${h.month} : ${h.pv15}/${h.pv25}/${h.pv35}/${h.pv42}/${h.pvRoyalty} PV`}>
            {shortMonthLabel(h.month)} · {Math.round(h.total).toLocaleString("fr-FR")} PV
          </span>
        ))}
      </div>
    </div>
  );
}

function shortMonthLabel(iso: string): string {
  try {
    const d = new Date(iso + "-15T12:00:00Z");
    return new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" }).format(d).replace(".", "");
  } catch {
    return iso;
  }
}

// ─── EditProfileModal ──────────────────────────────────────────────────────
function EditProfileModal({
  user,
  allUsers,
  currentUserId,
  onClose,
  onSave,
}: {
  user: User;
  allUsers: User[];
  currentUserId: string;
  onClose: () => void;
  onSave: (payload: { name: string; currentRank: HerbalifeRank; sponsorId: string | null }) => Promise<void>;
}) {
  const [name, setName] = useState(user.name);
  const [rank, setRank] = useState<HerbalifeRank>(user.currentRank ?? "success_builder_42");
  const [sponsorId, setSponsorId] = useState<string>(user.sponsorId ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <div style={modalOverlayStyle} onClick={onClose} role="dialog" aria-modal="true">
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h2 style={modalTitleStyle}>Modifier {user.name}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" style={modalCloseStyle}>×</button>
        </div>

        <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom"
            style={inputStyle}
            disabled={saving}
            maxLength={80}
          />
          <select
            value={rank}
            onChange={(e) => setRank(e.target.value as HerbalifeRank)}
            style={selectStyle}
            disabled={saving}
          >
            {RANK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={sponsorId}
            onChange={(e) => setSponsorId(e.target.value)}
            style={selectStyle}
            disabled={saving}
          >
            <option value="">— Pas de sponsor (racine) —</option>
            {allUsers.filter((u) => u.id !== user.id).map((u) => (
              <option key={u.id} value={u.id}>
                {u.id === currentUserId ? `${u.name} (toi)` : u.name}{u.isExternal ? " (externe)" : u.active ? "" : " (inactif)"}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, padding: "12px 22px 18px", justifyContent: "flex-end", borderTop: "0.5px solid var(--ls-border)" }}>
          <button type="button" onClick={onClose} style={btnGhostStyle} disabled={saving}>Annuler</button>
          <button
            type="button"
            onClick={async () => {
              if (!name.trim() || name.trim().length < 2) return;
              setSaving(true);
              try {
                await onSave({ name: name.trim(), currentRank: rank, sponsorId: sponsorId || null });
              } finally {
                setSaving(false);
              }
            }}
            style={btnPrimaryStyle}
            disabled={saving}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DeleteConfirmModal ────────────────────────────────────────────────────
function DeleteConfirmModal({
  user,
  allUsers,
  currentUserId,
  childrenCount,
  onClose,
  onConfirm,
}: {
  user: User;
  allUsers: User[];
  currentUserId: string;
  childrenCount: number;
  onClose: () => void;
  onConfirm: (reassignTo: string | null) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [reassignTo, setReassignTo] = useState<string>(currentUserId);
  const hasChildren = childrenCount > 0;

  return (
    <div style={modalOverlayStyle} onClick={onClose} role="dialog" aria-modal="true">
      <div style={{ ...modalContentStyle, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h2 style={modalTitleStyle}>Supprimer {user.name} ?</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" style={modalCloseStyle}>×</button>
        </div>
        <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, fontFamily: "DM Sans, sans-serif", fontSize: 13.5, color: "var(--ls-text)", lineHeight: 1.5 }}>
            Cette action est <strong>irréversible</strong> : <strong>{user.name}</strong> sera retiré de ton arborescence avec tout son historique PV.
          </p>

          {hasChildren && (
            <div style={reassignBoxStyle}>
              <p style={{ margin: 0, fontFamily: "DM Sans, sans-serif", fontSize: 12.5, color: "var(--ls-text)", fontWeight: 600, marginBottom: 6 }}>
                ⚠️ {user.name} a <strong>{childrenCount} enfant{childrenCount > 1 ? "s" : ""}</strong> dans l'arbre.
              </p>
              <p style={{ margin: "0 0 10px", fontFamily: "DM Sans, sans-serif", fontSize: 11.5, color: "var(--ls-text-muted)" }}>
                Choisis vers qui les réassigner avant la suppression :
              </p>
              <select
                value={reassignTo}
                onChange={(e) => setReassignTo(e.target.value)}
                style={selectStyle}
                disabled={busy}
              >
                {allUsers
                  .filter((u) => u.id !== user.id)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.id === currentUserId ? `${u.name} (toi)` : u.name}{u.isExternal ? " (externe)" : u.active ? "" : " (inactif)"}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <p style={{ margin: 0, fontFamily: "DM Sans, sans-serif", fontSize: 11.5, color: "var(--ls-text-muted)", lineHeight: 1.5 }}>
            ℹ️ Si ce distri est utilisé comme uplink HL sur des clients, la suppression sera refusée — change l'uplink sur ces fiches d'abord.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, padding: "12px 22px 18px", justifyContent: "flex-end", borderTop: "0.5px solid var(--ls-border)" }}>
          <button type="button" onClick={onClose} style={btnGhostStyle} disabled={busy}>Annuler</button>
          <button
            type="button"
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm(hasChildren ? reassignTo : null);
              } finally {
                setBusy(false);
              }
            }}
            style={btnDangerStyle}
            disabled={busy}
          >
            {busy ? "Suppression…" : hasChildren ? `Réassigner ${childrenCount} + supprimer` : "Supprimer définitivement"}
          </button>
        </div>
      </div>
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

const scopeToggleWrapStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: 3,
  gap: 2,
  background: "var(--ls-surface2)",
  borderRadius: 999,
  border: "0.5px solid var(--ls-border)",
};

function scopeBtnStyle(active: boolean): React.CSSProperties {
  return {
    height: 24,
    padding: "0 12px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    background: active ? "var(--ls-surface)" : "transparent",
    color: active ? "var(--ls-text)" : "var(--ls-text-muted)",
    fontFamily: "DM Sans, sans-serif",
    fontSize: 11.5,
    fontWeight: 600,
    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
    transition: "all .15s",
  };
}

const monthSelectStyle: React.CSSProperties = {
  height: 28,
  padding: "0 10px",
  borderRadius: 999,
  border: "0.5px solid color-mix(in srgb, var(--ls-teal) 24%, transparent)",
  background: "color-mix(in srgb, var(--ls-teal) 12%, var(--ls-surface))",
  color: "var(--ls-teal)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  appearance: "none",
};

const resetMonthBtnStyle: React.CSSProperties = {
  height: 28,
  width: 28,
  borderRadius: 999,
  border: "0.5px solid var(--ls-border)",
  background: "transparent",
  color: "var(--ls-text-muted)",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
};

const retroBannerStyle: React.CSSProperties = {
  marginTop: 12,
  padding: "10px 14px",
  borderRadius: 12,
  background: "color-mix(in srgb, var(--ls-gold) 10%, var(--ls-surface))",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, transparent)",
  color: "var(--ls-gold)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12.5,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
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

// ─── Styles new components (chantier 2026-05-22) ──────────────────────────

const actionsBtnStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 999,
  border: "0.5px solid var(--ls-border)",
  background: "transparent",
  color: "var(--ls-text-muted)",
  cursor: "pointer",
  fontSize: 18,
  fontWeight: 700,
  lineHeight: 1,
};

const menuBackdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
};

const menuStyle: React.CSSProperties = {
  position: "absolute",
  top: 36,
  right: 0,
  minWidth: 250,
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 12,
  boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
  padding: 6,
  zIndex: 51,
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const menuItemStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  textAlign: "left",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const historyStripStyle: React.CSSProperties = {
  marginTop: 10,
  paddingTop: 8,
  borderTop: "0.5px dashed var(--ls-border)",
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const historyLabelStyle: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 10.5,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.6,
  color: "var(--ls-text-muted)",
};

const historyChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 22,
  padding: "0 8px",
  borderRadius: 999,
  background: "color-mix(in srgb, var(--ls-purple) 8%, var(--ls-surface))",
  color: "var(--ls-purple)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 10.5,
  fontWeight: 600,
  border: "0.5px solid color-mix(in srgb, var(--ls-purple) 22%, transparent)",
  whiteSpace: "nowrap",
  cursor: "default",
};

// ─── Modals ────────────────────────────────────────────────────────────────

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const modalContentStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 520,
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 22,
  boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
  overflow: "hidden",
};

const modalHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 22px",
  borderBottom: "0.5px solid var(--ls-border)",
};

const modalTitleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 18,
  fontWeight: 700,
  color: "var(--ls-text)",
};

const modalCloseStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 999,
  border: "0.5px solid var(--ls-border)",
  background: "transparent",
  color: "var(--ls-text-muted)",
  cursor: "pointer",
  fontSize: 18,
  lineHeight: 1,
};

const btnGhostStyle: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 10,
  border: "0.5px solid var(--ls-border)",
  background: "transparent",
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  cursor: "pointer",
};

const importBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 999,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface)",
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: 12.5,
  resize: "vertical",
  marginBottom: 10,
};

const codeStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  background: "var(--ls-surface2)",
  padding: "1px 4px",
  borderRadius: 4,
  fontSize: 11.5,
};

const migrationListStyle: React.CSSProperties = {
  maxHeight: 280,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginBottom: 12,
};

function migrationRowStyle(checked: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    background: checked ? "color-mix(in srgb, var(--ls-teal) 6%, var(--ls-surface2))" : "var(--ls-surface2)",
    border: checked ? "0.5px solid color-mix(in srgb, var(--ls-teal) 30%, transparent)" : "0.5px solid var(--ls-border)",
    borderRadius: 10,
    cursor: "pointer",
  };
}

const importLogStyle: React.CSSProperties = {
  marginBottom: 10,
  padding: 10,
  borderRadius: 8,
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
  maxHeight: 200,
  overflowY: "auto",
};

const searchBarStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: 14,
};

const searchInputStyle: React.CSSProperties = {
  flex: "1 1 240px",
  minWidth: 200,
  padding: "10px 14px",
  borderRadius: 999,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface)",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
};

const sortChipsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
};

const searchSummaryStyle: React.CSSProperties = {
  marginBottom: 10,
  padding: "8px 12px",
  borderRadius: 10,
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12,
  color: "var(--ls-text-muted)",
};

const reassignBoxStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "color-mix(in srgb, var(--ls-coral) 6%, var(--ls-surface2))",
  border: "0.5px solid color-mix(in srgb, var(--ls-coral) 24%, transparent)",
};

const btnDangerStyle: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 10,
  border: "none",
  background: "var(--ls-coral)",
  color: "#fff",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
