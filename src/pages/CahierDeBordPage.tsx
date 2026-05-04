// =============================================================================
// CahierDeBordPage — Cahier de bord interactif du distri (2026-05-04)
//
// Route /cahier-de-bord. 3 sections en tabs :
//   1. 🥤 Cobaye 21j  : tracker quotidien J0-J21+ (note, énergie, poids)
//   2. 📒 Liste 100   : formulaire connaissances FRANK + tags + statut
//   3. 📊 Journal EBE : log perso post-bilan (ressenti, leçons, recos)
//
// Chacune persiste en DB (cobaye_tracker_entries, liste_100_contacts,
// ebe_journal_entries). RLS own + admin all.
// =============================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useCahierDeBord } from "../hooks/useCahierDeBord";
import { ProspectFormModal } from "../components/prospect/ProspectFormModal";
import {
  LISTE_100_FRANK_META,
  LISTE_100_STATUS_META,
  LISTE_100_TEMP_META,
  type EbeOutcome,
  type Liste100Contact,
  type Liste100FrankCategory,
  type Liste100Status,
  type Liste100Temperature,
} from "../types/cahier";

/** Split "Karim Ben" → { firstName: "Karim", lastName: "Ben" }. */
function splitFullName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

type Tab = "cobaye" | "liste" | "ebe";

export function CahierDeBordPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const userId = currentUser?.id ?? null;
  const cahier = useCahierDeBord(userId);
  const [tab, setTab] = useState<Tab>("cobaye");

  if (!currentUser) {
    return <div style={{ padding: 40, color: "var(--ls-text-muted)" }}>Connecte-toi.</div>;
  }

  return (
    <div className="space-y-5" style={{ paddingBottom: 60 }}>
      <button
        type="button"
        onClick={() => navigate("/co-pilote")}
        style={btnGhost}
      >
        ← Retour Co-pilote
      </button>

      {/* Hero */}
      <div
        style={{
          padding: "26px 24px",
          borderRadius: 18,
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--ls-purple) 12%, var(--ls-surface)) 0%, color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface2)) 100%)",
          border: "1px solid color-mix(in srgb, var(--ls-purple) 30%, transparent)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "var(--ls-purple)",
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          ✦ Mon cahier de bord
        </div>
        <h1
          style={{
            fontFamily: "Syne, serif",
            fontSize: 28,
            fontWeight: 800,
            margin: 0,
            color: "var(--ls-text)",
            letterSpacing: "-0.01em",
          }}
        >
          Là où je trace ce que je vis
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--ls-text-muted)", margin: "8px 0 0", lineHeight: 1.5 }}>
          21 jours cobaye · Liste 100 connaissances · Journal EBE.
          Tout ce que tu fais, tu le notes ici. C'est ta mémoire de coach.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {([
          { key: "cobaye", label: "21 jours cobaye", emoji: "🥤", count: cahier.cobayeEntries.length },
          { key: "liste", label: "Liste 100", emoji: "📒", count: cahier.contacts.length },
          { key: "ebe", label: "Journal EBE", emoji: "📊", count: cahier.ebeEntries.length },
        ] as Array<{ key: Tab; label: string; emoji: string; count: number }>).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: tab === t.key ? "1.5px solid var(--ls-purple)" : "0.5px solid var(--ls-border)",
              background: tab === t.key ? "color-mix(in srgb, var(--ls-purple) 14%, var(--ls-surface))" : "var(--ls-surface)",
              color: tab === t.key ? "var(--ls-purple)" : "var(--ls-text-muted)",
              fontSize: 13,
              fontWeight: tab === t.key ? 700 : 500,
              fontFamily: "DM Sans, sans-serif",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s",
            }}
          >
            <span aria-hidden="true">{t.emoji}</span>
            {t.label}
            <span
              style={{
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 999,
                background: tab === t.key ? "var(--ls-bg)" : "var(--ls-surface2)",
                color: tab === t.key ? "var(--ls-purple)" : "var(--ls-text-hint)",
                fontWeight: 700,
              }}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {cahier.loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--ls-text-muted)" }}>
          Chargement…
        </div>
      ) : cahier.error ? (
        <div style={{ padding: 20, color: "var(--ls-coral)" }}>{cahier.error}</div>
      ) : tab === "cobaye" ? (
        <CobayeSection cahier={cahier} />
      ) : tab === "liste" ? (
        <ListeSection cahier={cahier} />
      ) : (
        <EbeSection cahier={cahier} />
      )}
    </div>
  );
}

// ─── COBAYE 21j ──────────────────────────────────────────────────────────

function CobayeSection({ cahier }: { cahier: ReturnType<typeof useCahierDeBord> }) {
  const days = Array.from({ length: 22 }, (_, i) => i); // J0 to J21
  const entriesByDay = new Map(cahier.cobayeEntries.map((e) => [e.day_number, e]));
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ note: string; energy: string; sleep: string; weight: string }>({
    note: "",
    energy: "",
    sleep: "",
    weight: "",
  });

  function startEdit(day: number) {
    const existing = entriesByDay.get(day);
    setDraft({
      note: existing?.note ?? "",
      energy: existing?.energy_level?.toString() ?? "",
      sleep: existing?.sleep_quality?.toString() ?? "",
      weight: existing?.weight_kg?.toString() ?? "",
    });
    setEditingDay(day);
  }

  async function saveEdit() {
    if (editingDay === null) return;
    await cahier.upsertCobayeEntry({
      day_number: editingDay,
      note: draft.note || undefined,
      energy_level: draft.energy ? Math.max(0, Math.min(10, parseInt(draft.energy, 10) || 0)) : null,
      sleep_quality: draft.sleep ? Math.max(0, Math.min(10, parseInt(draft.sleep, 10) || 0)) : null,
      weight_kg: draft.weight ? parseFloat(draft.weight) || null : null,
    });
    setEditingDay(null);
  }

  return (
    <div className="space-y-4">
      <div
        style={{
          padding: "14px 18px",
          background: "color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface))",
          border: "0.5px dashed color-mix(in srgb, var(--ls-gold) 35%, transparent)",
          borderRadius: 12,
          fontSize: 13,
          color: "var(--ls-text-muted)",
          lineHeight: 1.55,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        💡 <strong style={{ color: "var(--ls-gold)" }}>Le rituel :</strong> chaque soir, tu cliques le jour pour noter ton ressenti (énergie 0-10, sommeil 0-10, poids optionnel) + 1-2 lignes libres. À J21 tu auras ton vrai matériau de témoignage.
      </div>

      {/* Grille jours */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
          gap: 8,
        }}
      >
        {days.map((d) => {
          const entry = entriesByDay.get(d);
          const filled = !!entry;
          const isMilestone = d === 0 || d === 7 || d === 14 || d === 21;
          return (
            <button
              key={d}
              type="button"
              onClick={() => startEdit(d)}
              style={{
                padding: 10,
                background: filled
                  ? "color-mix(in srgb, var(--ls-teal) 14%, var(--ls-surface))"
                  : "var(--ls-surface)",
                border: filled
                  ? "1px solid var(--ls-teal)"
                  : isMilestone
                    ? "1px dashed var(--ls-gold)"
                    : "0.5px solid var(--ls-border)",
                borderRadius: 10,
                textAlign: "center",
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
                transition: "all 0.15s",
              }}
            >
              <div
                style={{
                  fontFamily: "Syne, serif",
                  fontSize: 18,
                  fontWeight: 800,
                  color: filled ? "var(--ls-teal)" : isMilestone ? "var(--ls-gold)" : "var(--ls-text)",
                  lineHeight: 1,
                }}
              >
                J{d}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: "var(--ls-text-muted)",
                  marginTop: 4,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {filled ? "✓ Noté" : isMilestone ? "📸 Photo" : "—"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Modal édition jour */}
      {editingDay !== null && (
        <div
          role="presentation"
          onClick={() => setEditingDay(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            role="dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--ls-surface)",
              border: "0.5px solid var(--ls-border)",
              borderTop: "3px solid var(--ls-teal)",
              borderRadius: 16,
              padding: 24,
              maxWidth: 480,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            <h2 style={{ fontFamily: "Syne, serif", fontSize: 22, margin: 0, color: "var(--ls-teal)" }}>
              Mon J{editingDay}
            </h2>
            <p style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 4 }}>
              {editingDay === 0 ? "Aujourd'hui c'est ton point de départ. Photo + ressenti." : `Jour ${editingDay} de ton expérience.`}
            </p>

            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Note du jour (énergie, sommeil, ressenti…)">
                <textarea
                  value={draft.note}
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                  rows={4}
                  placeholder="Ex : Coup de barre 15h en moins. F1 chocolat = mon préféré. Mari a remarqué ma peau."
                  style={textareaStyle}
                />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Énergie 0-10">
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={draft.energy}
                    onChange={(e) => setDraft({ ...draft, energy: e.target.value })}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Sommeil 0-10">
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={draft.sleep}
                    onChange={(e) => setDraft({ ...draft, sleep: e.target.value })}
                    style={inputStyle}
                  />
                </Field>
              </div>
              <Field label="Poids (kg, optionnel)">
                <input
                  type="number"
                  step={0.1}
                  value={draft.weight}
                  onChange={(e) => setDraft({ ...draft, weight: e.target.value })}
                  placeholder="68.5"
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 22, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setEditingDay(null)} style={btnGhost}>
                Annuler
              </button>
              <button type="button" onClick={() => void saveEdit()} style={btnPrimary("var(--ls-teal)")}>
                💾 Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LISTE 100 ──────────────────────────────────────────────────────────

function ListeSection({ cahier }: { cahier: ReturnType<typeof useCahierDeBord> }) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({
    full_name: "",
    frank_category: "" as Liste100FrankCategory | "",
    temperature: "froid" as Liste100Temperature,
    note: "",
    contact_phone: "",
  });
  const [filterTemp, setFilterTemp] = useState<Liste100Temperature | "all">("all");
  const [filterStatus, setFilterStatus] = useState<Liste100Status | "all">("all");
  /** Connexion Liste 100 → Agenda (2026-05-04) : quand un contact passe en
      `rdv_cale`, on propose de créer un prospect agenda pré-rempli. */
  const [prospectModalContact, setProspectModalContact] = useState<Liste100Contact | null>(null);

  async function handleStatusChange(contact: Liste100Contact, newStatus: Liste100Status) {
    // Toujours persister le nouveau statut sur le contact
    await cahier.updateContact(contact.id, { status: newStatus });
    // Si on passe en `rdv_cale`, proposer la création d'un prospect agenda
    if (newStatus === "rdv_cale" && contact.status !== "rdv_cale") {
      setProspectModalContact(contact);
    }
  }

  async function handleAdd() {
    if (!draft.full_name.trim()) return;
    await cahier.addContact({
      full_name: draft.full_name.trim(),
      frank_category: draft.frank_category || null,
      temperature: draft.temperature,
      note: draft.note.trim() || undefined,
      contact_phone: draft.contact_phone.trim() || undefined,
    });
    setDraft({ full_name: "", frank_category: "", temperature: "froid", note: "", contact_phone: "" });
    setShowForm(false);
  }

  const filtered = cahier.contacts.filter((c) => {
    if (filterTemp !== "all" && c.temperature !== filterTemp) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    return true;
  });

  const statsByTemp = {
    chaud: cahier.contacts.filter((c) => c.temperature === "chaud").length,
    tiede: cahier.contacts.filter((c) => c.temperature === "tiede").length,
    froid: cahier.contacts.filter((c) => c.temperature === "froid").length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
        <StatCard label="Total" value={cahier.contacts.length} target={100} accent="var(--ls-purple)" />
        <StatCard label="🔥 Chauds" value={statsByTemp.chaud} accent="var(--ls-coral)" />
        <StatCard label="🌤 Tièdes" value={statsByTemp.tiede} accent="var(--ls-gold)" />
        <StatCard label="❄️ Froids" value={statsByTemp.froid} accent="var(--ls-teal)" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select
          value={filterTemp}
          onChange={(e) => setFilterTemp(e.target.value as Liste100Temperature | "all")}
          style={selectStyle}
        >
          <option value="all">Toutes températures</option>
          <option value="chaud">🔥 Chauds</option>
          <option value="tiede">🌤 Tièdes</option>
          <option value="froid">❄️ Froids</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as Liste100Status | "all")}
          style={selectStyle}
        >
          <option value="all">Tous statuts</option>
          {(Object.keys(LISTE_100_STATUS_META) as Liste100Status[]).map((s) => (
            <option key={s} value={s}>
              {LISTE_100_STATUS_META[s].emoji} {LISTE_100_STATUS_META[s].label}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setShowForm(true)} style={btnPrimary("var(--ls-purple)")}>
          + Ajouter un contact
        </button>
      </div>

      {/* Form ajout */}
      {showForm && (
        <div
          style={{
            padding: 18,
            background: "var(--ls-surface)",
            border: "1px solid var(--ls-purple)",
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <Field label="Prénom + nom">
            <input
              type="text"
              value={draft.full_name}
              onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
              placeholder="Marie Dupont"
              autoFocus
              style={inputStyle}
            />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Catégorie FRANK">
              <select
                value={draft.frank_category}
                onChange={(e) => setDraft({ ...draft, frank_category: e.target.value as Liste100FrankCategory | "" })}
                style={selectStyle}
              >
                <option value="">—</option>
                {(Object.keys(LISTE_100_FRANK_META) as Liste100FrankCategory[]).map((f) => (
                  <option key={f} value={f}>
                    {LISTE_100_FRANK_META[f].emoji} {LISTE_100_FRANK_META[f].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Température">
              <select
                value={draft.temperature}
                onChange={(e) => setDraft({ ...draft, temperature: e.target.value as Liste100Temperature })}
                style={selectStyle}
              >
                {(Object.keys(LISTE_100_TEMP_META) as Liste100Temperature[]).map((t) => (
                  <option key={t} value={t}>
                    {LISTE_100_TEMP_META[t].emoji} {LISTE_100_TEMP_META[t].label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Téléphone (optionnel)">
            <input
              type="tel"
              value={draft.contact_phone}
              onChange={(e) => setDraft({ ...draft, contact_phone: e.target.value })}
              style={inputStyle}
            />
          </Field>
          <Field label="Note (optionnel)">
            <textarea
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              rows={2}
              style={textareaStyle}
            />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setShowForm(false)} style={btnGhost}>
              Annuler
            </button>
            <button type="button" onClick={() => void handleAdd()} style={btnPrimary("var(--ls-purple)")}>
              + Ajouter
            </button>
          </div>
        </div>
      )}

      {/* Liste contacts */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            color: "var(--ls-text-muted)",
            background: "var(--ls-surface)",
            border: "0.5px dashed var(--ls-border)",
            borderRadius: 12,
          }}
        >
          {cahier.contacts.length === 0
            ? "Ta liste est vide. Cible 100 noms en 7 jours."
            : "Aucun contact ne correspond aux filtres."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((c) => {
            const temp = LISTE_100_TEMP_META[c.temperature];
            const status = LISTE_100_STATUS_META[c.status];
            return (
              <div
                key={c.id}
                style={{
                  padding: "12px 14px",
                  background: "var(--ls-surface)",
                  border: "0.5px solid var(--ls-border)",
                  borderLeft: `3px solid ${temp.color}`,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                <span style={{ fontSize: 18 }}>{temp.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "var(--ls-text)", fontSize: 14 }}>{c.full_name}</div>
                  {c.note && (
                    <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2 }}>{c.note}</div>
                  )}
                </div>
                <select
                  value={c.status}
                  onChange={(e) => void handleStatusChange(c, e.target.value as Liste100Status)}
                  style={{
                    padding: "4px 8px",
                    fontSize: 11,
                    borderRadius: 6,
                    border: `1px solid ${status.color}`,
                    background: `color-mix(in srgb, ${status.color} 12%, transparent)`,
                    color: status.color,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  {(Object.keys(LISTE_100_STATUS_META) as Liste100Status[]).map((s) => (
                    <option key={s} value={s} style={{ color: "var(--ls-text)" }}>
                      {LISTE_100_STATUS_META[s].emoji} {LISTE_100_STATUS_META[s].label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Supprimer ${c.full_name} ?`)) void cahier.deleteContact(c.id);
                  }}
                  aria-label="Supprimer"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--ls-text-hint)",
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Connexion Liste 100 → Agenda (2026-05-04) : quand un contact passe
          en rdv_cale, on propose la création d'un prospect agenda. Le modal
          est pré-rempli avec firstName/lastName splités + tel + source
          "Bouche à oreille" (cohérent avec liste 100 = mes connaissances). */}
      {prospectModalContact && (
        <ProspectFormModal
          prefill={{
            ...splitFullName(prospectModalContact.full_name),
            phone: prospectModalContact.contact_phone ?? undefined,
            email: prospectModalContact.contact_email ?? undefined,
            source: "Bouche à oreille",
            sourceDetail: "Liste 100",
            note: prospectModalContact.note ?? undefined,
          }}
          onClose={() => setProspectModalContact(null)}
          onSaved={() => setProspectModalContact(null)}
        />
      )}
    </div>
  );
}

// ─── EBE JOURNAL ─────────────────────────────────────────────────────────

function EbeSection({ cahier }: { cahier: ReturnType<typeof useCahierDeBord> }) {
  const [showForm, setShowForm] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [draft, setDraft] = useState({
    ebe_date: today,
    prospect_name: "",
    self_score: "",
    what_went_well: "",
    what_to_improve: "",
    outcome: "" as EbeOutcome | "",
    recos_count: "0",
  });

  async function handleAdd() {
    await cahier.addEbeEntry({
      ebe_date: draft.ebe_date,
      prospect_name: draft.prospect_name.trim() || null,
      self_score: draft.self_score ? Math.max(0, Math.min(10, parseInt(draft.self_score, 10) || 0)) : null,
      what_went_well: draft.what_went_well.trim() || null,
      what_to_improve: draft.what_to_improve.trim() || null,
      outcome: (draft.outcome || null) as EbeOutcome | null,
      recos_count: parseInt(draft.recos_count, 10) || 0,
    });
    setDraft({
      ebe_date: today,
      prospect_name: "",
      self_score: "",
      what_went_well: "",
      what_to_improve: "",
      outcome: "",
      recos_count: "0",
    });
    setShowForm(false);
  }

  const totalSigned = cahier.ebeEntries.filter((e) => e.outcome === "signed").length;
  const totalRecos = cahier.ebeEntries.reduce((s, e) => s + e.recos_count, 0);

  return (
    <div className="space-y-4">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
        <StatCard label="EBE faits" value={cahier.ebeEntries.length} accent="var(--ls-purple)" />
        <StatCard label="✅ Closings" value={totalSigned} accent="var(--ls-teal)" />
        <StatCard label="🌟 Recos" value={totalRecos} accent="var(--ls-gold)" />
      </div>

      <button type="button" onClick={() => setShowForm(true)} style={btnPrimary("var(--ls-purple)")}>
        + Logger un EBE
      </button>

      {showForm && (
        <div
          style={{
            padding: 18,
            background: "var(--ls-surface)",
            border: "1px solid var(--ls-purple)",
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Date du bilan">
              <input
                type="date"
                value={draft.ebe_date}
                onChange={(e) => setDraft({ ...draft, ebe_date: e.target.value })}
                style={inputStyle}
              />
            </Field>
            <Field label="Prénom prospect">
              <input
                type="text"
                value={draft.prospect_name}
                onChange={(e) => setDraft({ ...draft, prospect_name: e.target.value })}
                placeholder="Marie"
                style={inputStyle}
              />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Score perso 0-10">
              <input
                type="number"
                min={0}
                max={10}
                value={draft.self_score}
                onChange={(e) => setDraft({ ...draft, self_score: e.target.value })}
                style={inputStyle}
              />
            </Field>
            <Field label="Issue">
              <select
                value={draft.outcome}
                onChange={(e) => setDraft({ ...draft, outcome: e.target.value as EbeOutcome | "" })}
                style={selectStyle}
              >
                <option value="">—</option>
                <option value="signed">✅ Signé</option>
                <option value="pending">⏳ En attente</option>
                <option value="refused">❌ Refusé</option>
              </select>
            </Field>
            <Field label="Recos obtenues">
              <input
                type="number"
                min={0}
                value={draft.recos_count}
                onChange={(e) => setDraft({ ...draft, recos_count: e.target.value })}
                style={inputStyle}
              />
            </Field>
          </div>
          <Field label="✨ Ce qui a bien marché">
            <textarea
              value={draft.what_went_well}
              onChange={(e) => setDraft({ ...draft, what_went_well: e.target.value })}
              rows={2}
              placeholder="Le silence après le body scan a fait basculer la conversation."
              style={textareaStyle}
            />
          </Field>
          <Field label="🔧 À ajuster pour le prochain">
            <textarea
              value={draft.what_to_improve}
              onChange={(e) => setDraft({ ...draft, what_to_improve: e.target.value })}
              rows={2}
              placeholder="J'ai parlé trop vite au moment de la proposition prix."
              style={textareaStyle}
            />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setShowForm(false)} style={btnGhost}>
              Annuler
            </button>
            <button type="button" onClick={() => void handleAdd()} style={btnPrimary("var(--ls-purple)")}>
              💾 Enregistrer
            </button>
          </div>
        </div>
      )}

      {cahier.ebeEntries.length === 0 ? (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            color: "var(--ls-text-muted)",
            background: "var(--ls-surface)",
            border: "0.5px dashed var(--ls-border)",
            borderRadius: 12,
          }}
        >
          Pas encore de bilan loggé. Logge ton 1ᵉʳ EBE shadow ici.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cahier.ebeEntries.map((e) => {
            const outcomeColor =
              e.outcome === "signed" ? "var(--ls-teal)" : e.outcome === "refused" ? "var(--ls-coral)" : "var(--ls-gold)";
            return (
              <div
                key={e.id}
                style={{
                  padding: "14px 16px",
                  background: "var(--ls-surface)",
                  border: "0.5px solid var(--ls-border)",
                  borderLeft: `3px solid ${outcomeColor}`,
                  borderRadius: 10,
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                  <div style={{ fontWeight: 700, color: "var(--ls-text)", fontSize: 14 }}>
                    {e.prospect_name ?? "Bilan anonyme"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
                    {new Date(e.ebe_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--ls-text-muted)", flexWrap: "wrap", marginBottom: 8 }}>
                  {e.self_score !== null && <span>📊 Score : {e.self_score}/10</span>}
                  {e.outcome && (
                    <span style={{ color: outcomeColor, fontWeight: 600 }}>
                      {e.outcome === "signed" ? "✅ Signé" : e.outcome === "pending" ? "⏳ En attente" : "❌ Refusé"}
                    </span>
                  )}
                  {e.recos_count > 0 && <span>🌟 {e.recos_count} reco{e.recos_count > 1 ? "s" : ""}</span>}
                </div>
                {e.what_went_well && (
                  <div style={{ fontSize: 12, color: "var(--ls-text)", marginBottom: 4 }}>
                    <strong style={{ color: "var(--ls-teal)" }}>✨ A marché :</strong> {e.what_went_well}
                  </div>
                )}
                {e.what_to_improve && (
                  <div style={{ fontSize: 12, color: "var(--ls-text)" }}>
                    <strong style={{ color: "var(--ls-coral)" }}>🔧 À ajuster :</strong> {e.what_to_improve}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Supprimer ce log ?")) void cahier.deleteEbeEntry(e.id);
                  }}
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    background: "transparent",
                    border: "none",
                    color: "var(--ls-text-hint)",
                    cursor: "pointer",
                  }}
                >
                  Supprimer
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "var(--ls-text-muted)", fontWeight: 600, marginBottom: 4, fontFamily: "DM Sans, sans-serif" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function StatCard({ label, value, target, accent }: { label: string; value: number; target?: number; accent: string }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        background: "var(--ls-surface)",
        border: "0.5px solid var(--ls-border)",
        borderRadius: 12,
        textAlign: "center",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <div style={{ fontFamily: "Syne, serif", fontSize: 26, fontWeight: 800, color: accent, lineHeight: 1 }}>
        {value}
        {target !== undefined && <span style={{ fontSize: 14, color: "var(--ls-text-muted)", fontWeight: 500 }}> / {target}</span>}
      </div>
      <div style={{ fontSize: 10, color: "var(--ls-text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontSize: 13,
  fontFamily: "DM Sans, sans-serif",
  outline: "none",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: 60,
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  background: "transparent",
  border: "0.5px solid var(--ls-border)",
  color: "var(--ls-text-muted)",
  padding: "10px 16px",
  borderRadius: 10,
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
};

function btnPrimary(accent: string): React.CSSProperties {
  return {
    background: `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 70%, #000) 100%)`,
    color: "white",
    border: "none",
    padding: "10px 18px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "DM Sans, sans-serif",
    boxShadow: `0 4px 14px color-mix(in srgb, ${accent} 35%, transparent)`,
  };
}
