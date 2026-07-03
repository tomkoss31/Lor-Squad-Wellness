// =============================================================================
// ManualPvEntriesSection — V3 distri hors-app (chantier 2026-11-07)
// =============================================================================
// Section dans /rentabilite qui permet a un admin/referent d ajouter
// manuellement des entrees PV pour des distri qui ne sont pas dans Lor'Squad
// (typiquement la downline Herbalife historique de Thomas).
//
// Affiche : liste des entrees (name + lignage L1/L2/L3 + PV total + override
// estime) + bouton "+ Ajouter" qui ouvre un formulaire modal.
// =============================================================================

import { useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useToast, buildSupabaseErrorToast } from "../../context/ToastContext";
import {
  upsertManualPvEntry,
  deleteManualPvEntry,
} from "../../services/supabaseService";
import { useManualPvEntries } from "../../hooks/useManualPvEntries";
import { FormField } from "../ui/FormField";
import {
  PV_TO_EUR_RATIO,
  computeSponsorCutOnDownstream,
  currentMonthIso,
  tierPctForRank,
  type ManualPvEntry,
} from "../../lib/herbalifeFormulas";

const TIER_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 15, label: "15% (Préféré)" },
  { value: 25, label: "25% (Distributor)" },
  { value: 35, label: "35% (Senior Consultant)" },
  { value: 42, label: "42% (Success Builder)" },
  { value: 50, label: "50% (Supervisor)" },
];

interface FormState {
  id: string | null;
  name: string;
  parentName: string;
  depth: 1 | 2 | 3;
  ownTierPct: number;
  intermediateTiers: number[];
  pv15: string;
  pv25: string;
  pv35: string;
  pv42: string;
  pvRoyalty: string;
  pv25IsVip: boolean;
  pv35IsVip: boolean;
}

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  parentName: "",
  depth: 1,
  ownTierPct: 25,
  intermediateTiers: [],
  pv15: "",
  pv25: "",
  pv35: "",
  pv42: "",
  pvRoyalty: "",
  pv25IsVip: false,
  pv35IsVip: false,
};

export function ManualPvEntriesSection() {
  const { currentUser } = useAppContext();
  const { push: pushToast } = useToast();
  // Mois de travail (chantier volume 2026-06-13) : avant, la saisie était
  // figée sur le mois courant — impossible de corriger / saisir un mois passé.
  // Le sélecteur ci-dessous pilote à la fois la liste affichée ET le mois
  // attaché aux entrées créées ou modifiées.
  const [selectedMonth, setSelectedMonth] = useState<string>(() => currentMonthIso());
  const currentMonth = currentMonthIso();
  const monthLabel = new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  const isCurrentMonth = selectedMonth === currentMonth;
  const { entries, loading } = useManualPvEntries(currentUser?.id ?? null, selectedMonth);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  if (!currentUser) return null;
  const canAccess = currentUser.role === "admin" || currentUser.role === "referent";
  if (!canAccess) return null;

  const viewerTierPct = tierPctForRank(currentUser.currentRank);

  function startCreate() {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function startEdit(e: ManualPvEntry) {
    setForm({
      id: e.id,
      name: e.name,
      parentName: e.parentName ?? "",
      depth: e.depth,
      ownTierPct: e.ownTierPct,
      intermediateTiers: e.intermediateTiers,
      pv15: e.pv15 > 0 ? String(e.pv15) : "",
      pv25: e.pv25 > 0 ? String(e.pv25) : "",
      pv35: e.pv35 > 0 ? String(e.pv35) : "",
      pv42: e.pv42 > 0 ? String(e.pv42) : "",
      pvRoyalty: e.pvRoyalty > 0 ? String(e.pvRoyalty) : "",
      pv25IsVip: e.pv25IsVip,
      pv35IsVip: e.pv35IsVip,
    });
    setFormOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      pushToast({ tone: "warning", title: "Nom obligatoire", message: "" });
      return;
    }
    const parse = (s: string) => {
      const n = Number(s.replace(",", "."));
      return Number.isFinite(n) && n >= 0 ? n : 0;
    };
    setSaving(true);
    try {
      await upsertManualPvEntry({
        id: form.id,
        name: form.name.trim(),
        parentName: form.parentName.trim() || null,
        depth: form.depth,
        ownTierPct: form.ownTierPct,
        intermediateTiers: form.intermediateTiers,
        month: selectedMonth,
        pv15: parse(form.pv15),
        pv25: parse(form.pv25),
        pv35: parse(form.pv35),
        pv42: parse(form.pv42),
        pvRoyalty: parse(form.pvRoyalty),
        pv25IsVip: form.pv25IsVip,
        pv35IsVip: form.pv35IsVip,
      });
      pushToast({
        tone: "success",
        title: form.id ? "Entrée mise à jour" : "Entrée ajoutée",
        message: form.name,
      });
      setFormOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      pushToast(buildSupabaseErrorToast(err, "Impossible d'enregistrer l'entrée"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer l'entrée "${name}" ?`)) return;
    try {
      await deleteManualPvEntry(id);
      pushToast({ tone: "success", title: "Entrée supprimée", message: name });
    } catch (err) {
      pushToast(buildSupabaseErrorToast(err, "Impossible de supprimer"));
    }
  }

  const totalOverride = entries.reduce((s, e) => {
    const intermediates = e.depth === 1 ? [] : e.intermediateTiers;
    return s + computeSponsorCutOnDownstream(
      {
        userId: `manual:${e.id}`,
        month: e.month,
        pv15: e.pv15, pv25: e.pv25, pv35: e.pv35, pv42: e.pv42,
        pvRoyalty: e.pvRoyalty,
        pv25IsVip: e.pv25IsVip, pv35IsVip: e.pv35IsVip,
        declaredBy: null, declaredAt: e.declaredAt,
      },
      viewerTierPct,
      intermediates,
    );
  }, 0);

  return (
    <>
      <h2 style={sectionTitleStyle}>🤝 Distri hors-app · saisie manuelle</h2>
      <p style={sectionSubStyle}>
        Pour les distri de ta downline Herbalife qui n'utilisent pas La Base 360 mais qui commandent.
        Tu transcris depuis ta fiche RO mensuelle.
      </p>

      <div style={monthPickerRowStyle}>
        <label htmlFor="manual-pv-month" style={monthPickerLabelStyle}>
          Mois de travail
        </label>
        <input
          id="manual-pv-month"
          type="month"
          value={selectedMonth}
          max={currentMonth}
          onChange={(e) => setSelectedMonth(e.target.value || currentMonth)}
          style={monthPickerInputStyle}
        />
        {!isCurrentMonth ? (
          <button
            type="button"
            onClick={() => setSelectedMonth(currentMonth)}
            style={monthPickerTodayStyle}
          >
            Revenir au mois en cours
          </button>
        ) : null}
      </div>
      {!isCurrentMonth ? (
        <p style={monthPickerHintStyle}>
          📅 Tu saisis / corriges un mois passé ({monthLabel}). Les entrées créées ou
          modifiées ici seront rattachées à ce mois.
        </p>
      ) : null}

      {entries.length === 0 && !loading ? (
        <div style={emptyBoxStyle}>
          <p style={{ margin: "0 0 12px", color: "var(--ls-text-muted)", fontSize: 13 }}>
            Aucune entrée manuelle pour {monthLabel}. Ajoute tes distri hors-app pour
            une rentabilité totale juste.
          </p>
          <button type="button" onClick={startCreate} style={primaryBtnStyle}>
            + Ajouter une entrée
          </button>
        </div>
      ) : (
        <>
          <div style={listStyle}>
            {entries.map((e) => (
              <ManualEntryRow
                key={e.id}
                entry={e}
                viewerTierPct={viewerTierPct}
                onEdit={() => startEdit(e)}
                onDelete={() => void handleDelete(e.id, e.name)}
              />
            ))}
          </div>
          <div style={totalRowStyle}>
            <span style={{ color: "var(--ls-text-muted)", fontSize: 13 }}>
              Total override sur {entries.length} entrée{entries.length > 1 ? "s" : ""} :
            </span>
            <strong data-stealth style={{ color: "var(--ls-purple)", fontSize: 18, fontFamily: "Syne, sans-serif" }}>
              {Math.round(totalOverride).toLocaleString("fr-FR")} €
            </strong>
          </div>
          <button type="button" onClick={startCreate} style={{ ...primaryBtnStyle, marginTop: 14 }}>
            + Ajouter une autre entrée
          </button>
        </>
      )}

      {formOpen ? (
        <div style={overlayStyle} onClick={() => setFormOpen(false)} role="dialog">
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setFormOpen(false)} style={closeBtnStyle}>×</button>
            <h3 style={modalTitleStyle}>
              {form.id ? "Modifier" : "Ajouter"} une entrée · {monthLabel}
            </h3>
            <FormBody form={form} setForm={setForm} viewerTierPct={viewerTierPct} />
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                style={{ ...primaryBtnStyle, flex: 1 }}
              >
                {saving ? "…" : form.id ? "Mettre à jour" : "Enregistrer"}
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                style={ghostBtnStyle}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ManualEntryRow({
  entry,
  viewerTierPct,
  onEdit,
  onDelete,
}: {
  entry: ManualPvEntry;
  viewerTierPct: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const totalPv = entry.pv15 + entry.pv25 + entry.pv35 + entry.pv42 + entry.pvRoyalty;
  const intermediates = entry.depth === 1 ? [] : entry.intermediateTiers;
  const cut = computeSponsorCutOnDownstream(
    {
      userId: `manual:${entry.id}`,
      month: entry.month,
      pv15: entry.pv15, pv25: entry.pv25, pv35: entry.pv35, pv42: entry.pv42,
      pvRoyalty: entry.pvRoyalty,
      pv25IsVip: entry.pv25IsVip, pv35IsVip: entry.pv35IsVip,
      declaredBy: null, declaredAt: entry.declaredAt,
    },
    viewerTierPct,
    intermediates,
  );
  const tierLabel = TIER_OPTIONS.find((o) => o.value === entry.ownTierPct)?.label ?? `${entry.ownTierPct}%`;
  const lineageLabel = entry.depth === 1
    ? "L1 direct"
    : `L${entry.depth} via ${entry.parentName ?? "—"}`;
  const vipMarkers: string[] = [];
  if (entry.pv25 > 0 && entry.pv25IsVip) vipMarkers.push("⭐ Silver");
  if (entry.pv35 > 0 && entry.pv35IsVip) vipMarkers.push("⭐ Gold");
  return (
    <div style={rowStyle}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "Syne, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--ls-text)" }}>
          {entry.name}
          {vipMarkers.length > 0 ? (
            <span style={{ marginLeft: 6, fontSize: 10, color: "var(--ls-gold)", fontWeight: 600 }}>
              {vipMarkers.join(" + ")}
            </span>
          ) : null}
        </div>
        <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2 }}>
          <span style={badgeStyle}>{lineageLabel}</span>
          <span style={{ marginLeft: 6 }}>{tierLabel}</span>
          <span style={{ marginLeft: 6 }}>· {totalPv.toLocaleString("fr-FR")} PV</span>
        </div>
      </div>
      <div data-stealth style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 700, color: "var(--ls-purple)", whiteSpace: "nowrap" }}>
        {Math.round(cut).toLocaleString("fr-FR")} €
      </div>
      <button type="button" onClick={onEdit} style={iconBtnStyle} aria-label="Modifier">✏️</button>
      <button type="button" onClick={onDelete} style={iconBtnStyle} aria-label="Supprimer">🗑️</button>
    </div>
  );
}

function FormBody({
  form,
  setForm,
  viewerTierPct,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  viewerTierPct: number;
}) {
  const parse = (s: string) => {
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  const intermediates = form.depth === 1 ? [] : form.intermediateTiers;
  const previewBreakdown = {
    userId: "preview",
    month: "preview",
    pv15: parse(form.pv15), pv25: parse(form.pv25), pv35: parse(form.pv35),
    pv42: parse(form.pv42), pvRoyalty: parse(form.pvRoyalty),
    pv25IsVip: form.pv25IsVip, pv35IsVip: form.pv35IsVip,
    declaredBy: null, declaredAt: null,
  };
  const previewCut = computeSponsorCutOnDownstream(previewBreakdown, viewerTierPct, intermediates);
  const previewTotalPv =
    previewBreakdown.pv15 + previewBreakdown.pv25 + previewBreakdown.pv35 +
    previewBreakdown.pv42 + previewBreakdown.pvRoyalty;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Field label="Nom du distri">
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="ex: Alexandre Gobert"
          style={inputStyle}
        />
      </Field>

      <Field label="Lignage (profondeur sous toi)">
        <select
          value={form.depth}
          onChange={(e) => {
            const newDepth = Number(e.target.value) as 1 | 2 | 3;
            const tiersLength = newDepth === 1 ? 0 : newDepth - 1;
            const newIntermediates = Array.from({ length: tiersLength }, (_, i) => form.intermediateTiers[i] ?? 42);
            setForm({ ...form, depth: newDepth, intermediateTiers: newIntermediates });
          }}
          style={inputStyle}
        >
          <option value={1}>L1 — direct (toi → lui)</option>
          <option value={2}>L2 — via 1 intermédiaire (toi → X → lui)</option>
          <option value={3}>L3 — via 2 intermédiaires</option>
        </select>
      </Field>

      {form.depth >= 2 ? (
        <>
          <Field label="Nom de l'intermédiaire (parent direct du distri saisi)">
            <input
              type="text"
              value={form.parentName}
              onChange={(e) => setForm({ ...form, parentName: e.target.value })}
              placeholder="ex: Mandy"
              style={inputStyle}
            />
          </Field>
          {Array.from({ length: form.depth - 1 }, (_, i) => (
            <Field key={i} label={`Rang intermédiaire ${i + 1} (entre toi et lui)`}>
              <select
                value={form.intermediateTiers[i] ?? 42}
                onChange={(e) => {
                  const newTiers = [...form.intermediateTiers];
                  newTiers[i] = Number(e.target.value);
                  setForm({ ...form, intermediateTiers: newTiers });
                }}
                style={inputStyle}
              >
                {TIER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
          ))}
        </>
      ) : null}

      <Field label="Son rang à lui">
        <select
          value={form.ownTierPct}
          onChange={(e) => setForm({ ...form, ownTierPct: Number(e.target.value) })}
          style={inputStyle}
        >
          {TIER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>

      <div style={{ marginTop: 4, fontSize: 11, color: "var(--ls-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
        PV par tier (depuis fiche RO) · ⭐ = VIP, sinon Distri
      </div>
      <PvTierInput label="PV à 15% (Préféré VIP)" value={form.pv15} onChange={(v) => setForm({ ...form, pv15: v })} />
      <PvTierInput
        label={form.pv25IsVip ? "PV à 25% (Silver VIP)" : "PV à 25% (Distributor)"}
        value={form.pv25}
        onChange={(v) => setForm({ ...form, pv25: v })}
        vipFlag={form.pv25IsVip}
        onToggleVip={() => setForm({ ...form, pv25IsVip: !form.pv25IsVip })}
      />
      <PvTierInput
        label={form.pv35IsVip ? "PV à 35% (Gold VIP)" : "PV à 35% (Senior Consultant)"}
        value={form.pv35}
        onChange={(v) => setForm({ ...form, pv35: v })}
        vipFlag={form.pv35IsVip}
        onToggleVip={() => setForm({ ...form, pv35IsVip: !form.pv35IsVip })}
      />
      <PvTierInput label="PV à 42% (Success Builder)" value={form.pv42} onChange={(v) => setForm({ ...form, pv42: v })} />
      <PvTierInput label="PV Royalty (Supervisor org)" value={form.pvRoyalty} onChange={(v) => setForm({ ...form, pvRoyalty: v })} />

      <div style={previewStyle}>
        <span style={{ color: "var(--ls-text-muted)" }}>
          Total : <strong style={{ color: "var(--ls-text)" }}>{previewTotalPv.toLocaleString("fr-FR")} PV</strong>
        </span>
        <span style={{ color: "var(--ls-purple)", fontWeight: 700 }}>
          Override toi : ~{Math.round(previewCut).toLocaleString("fr-FR")} €
        </span>
      </div>
      <div style={{ fontSize: 10, color: "var(--ls-text-muted)", fontStyle: "italic" }}>
        Calcul : ({viewerTierPct}% − max(tier, intermédiaires)) × PV × {PV_TO_EUR_RATIO} €/PV
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  // Délègue au composant partagé (dedup 2026-07-03).
  return (
    <FormField label={label} mono={false}>
      {children}
    </FormField>
  );
}

function PvTierInput({
  label,
  value,
  onChange,
  vipFlag,
  onToggleVip,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  vipFlag?: boolean;
  onToggleVip?: () => void;
}) {
  const hasToggle = typeof onToggleVip === "function";
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {hasToggle ? (
        <button
          type="button"
          onClick={onToggleVip}
          aria-label={vipFlag ? "VIP — clique pour passer en Distri" : "Distri — clique pour passer en VIP"}
          title={vipFlag ? "VIP — clique pour passer en Distri" : "Distri — clique pour passer en VIP"}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            padding: 0,
            width: 24,
            opacity: vipFlag ? 1 : 0.35,
            color: vipFlag ? "var(--ls-gold)" : "var(--ls-text-muted)",
          }}
        >
          {vipFlag ? "⭐" : "☆"}
        </button>
      ) : (
        <span style={{ width: 24 }} />
      )}
      <span style={{ flex: 1, fontSize: 11, color: "var(--ls-text)" }}>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        style={{ ...inputStyle, width: 100, textAlign: "right" }}
      />
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const sectionTitleStyle: React.CSSProperties = {
  margin: "32px 0 6px",
  fontFamily: "Syne, sans-serif",
  fontSize: 22,
  fontWeight: 800,
  color: "var(--ls-text)",
};

const sectionSubStyle: React.CSSProperties = {
  margin: "0 0 18px",
  fontSize: 13,
  color: "var(--ls-text-muted)",
  lineHeight: 1.5,
};

const monthPickerRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 14,
};

const monthPickerLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  color: "var(--ls-text-muted)",
};

const monthPickerInputStyle: React.CSSProperties = {
  padding: "7px 11px",
  borderRadius: 10,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontSize: 13,
  fontFamily: "Inter, system-ui, sans-serif",
  colorScheme: "light dark",
};

const monthPickerTodayStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 9,
  border: "0.5px solid var(--ls-border)",
  background: "transparent",
  color: "var(--ls-teal)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const monthPickerHintStyle: React.CSSProperties = {
  margin: "0 0 16px",
  padding: "9px 12px",
  borderRadius: 10,
  background: "color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface2))",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 28%, transparent)",
  color: "var(--ls-text-muted)",
  fontSize: 12,
  lineHeight: 1.5,
};

const emptyBoxStyle: React.CSSProperties = {
  padding: 20,
  borderRadius: 14,
  border: "0.5px dashed var(--ls-border)",
  background: "var(--ls-surface2)",
  textAlign: "center",
};

const listStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 14px",
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 12,
};

const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "1px 6px",
  borderRadius: 5,
  background: "color-mix(in srgb, var(--ls-purple) 14%, transparent)",
  color: "var(--ls-purple)",
  fontSize: 9,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

const totalRowStyle: React.CSSProperties = {
  marginTop: 12,
  padding: "10px 14px",
  borderRadius: 10,
  background: "color-mix(in srgb, var(--ls-purple) 6%, var(--ls-surface2))",
  border: "0.5px solid color-mix(in srgb, var(--ls-purple) 28%, transparent)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const iconBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: 16,
  padding: 4,
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "color-mix(in srgb, var(--ls-bg) 80%, transparent)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px 16px",
  overflowY: "auto",
};

const modalStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 480,
  maxHeight: "calc(100dvh - 40px)",
  overflowY: "auto",
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 18,
  padding: "24px 22px",
  boxShadow: "0 24px 72px color-mix(in srgb, var(--ls-text) 20%, transparent)",
};

const closeBtnStyle: React.CSSProperties = {
  position: "absolute",
  top: 12,
  right: 14,
  width: 32,
  height: 32,
  borderRadius: 10,
  background: "transparent",
  border: "none",
  color: "var(--ls-text-muted)",
  fontSize: 24,
  cursor: "pointer",
  lineHeight: 1,
};

const modalTitleStyle: React.CSSProperties = {
  margin: "0 0 16px",
  fontFamily: "Syne, sans-serif",
  fontSize: 18,
  fontWeight: 800,
  color: "var(--ls-text)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontSize: 13,
  fontFamily: "Inter, system-ui, sans-serif",
};

const previewStyle: React.CSSProperties = {
  marginTop: 8,
  padding: "10px 12px",
  borderRadius: 10,
  background: "color-mix(in srgb, var(--ls-purple) 6%, var(--ls-surface2))",
  border: "0.5px solid color-mix(in srgb, var(--ls-purple) 28%, transparent)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  fontSize: 12,
  flexWrap: "wrap",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
  color: "#FFFFFF",
  fontFamily: "Sora, system-ui, sans-serif",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const ghostBtnStyle: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: 10,
  border: "0.5px solid var(--ls-border)",
  background: "transparent",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12,
  cursor: "pointer",
};
