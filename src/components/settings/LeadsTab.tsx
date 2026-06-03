// Chantier Admin Leads (2026-04-24).
// Onglet admin /parametres?tab=leads : consulte les prospects qui ont
// rempli le formulaire Welcome → table avec filtres status + action
// WhatsApp + marquer contacté/converti/perdu.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabaseClient } from "../../services/supabaseClient";
import { useToast, buildSupabaseErrorToast } from "../../context/ToastContext";
import { useAppContext } from "../../context/AppContext";
import {
  PROFILE_LABEL,
  TEMPERATURE_META,
  type LeadProfile,
  type LeadTemperature,
} from "../../lib/opportunityLeadScore";
import { buildFunnelSummary } from "../../lib/opportunityFunnelLabels";

type LeadStatus = "new" | "contacted" | "converted" | "lost";

interface LeadMeta {
  funnel?: string;
  profile?: LeadProfile | null;
  score?: number;
  temperature?: LeadTemperature;
  email?: string;
  last_name?: string;
  /** Réponses brutes du funnel (codes), cf. opportunityFunnelLabels. */
  answers?: Record<string, string> | null;
}

interface Lead {
  id: string;
  first_name: string;
  phone: string;
  city: string | null;
  source: string | null;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  contacted_at: string | null;
  assigned_to_user_id: string | null;
  referrer_user_id: string | null;
  metadata: LeadMeta | null;
}

const STATUS_META: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  new: { label: "Nouveau", color: "#BA7517", bg: "rgba(239,159,39,0.12)" },
  contacted: { label: "Contacté", color: "#0F6E56", bg: "rgba(29,158,117,0.14)" },
  converted: { label: "Converti", color: "#1D9E75", bg: "rgba(29,158,117,0.18)" },
  lost: { label: "Perdu", color: "#8B1F1F", bg: "rgba(226,75,74,0.1)" },
};

function formatRelative(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / (60 * 1000));
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `il y a ${hrs} h`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `il y a ${days} j`;
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function buildWhatsAppUrl(phone: string, firstName: string): string {
  const digits = phone.replace(/\D/g, "");
  const msg = `Salut ${firstName} ! Je te recontacte suite à ta demande sur La Base 360 💪`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

export function LeadsTab() {
  const { push: pushToast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LeadStatus | "all">(() => {
    // Pré-filtre depuis l'URL (?status=new|contacted|converted|lost),
    // utilisé par les raccourcis cliquables de la carte stats prospection.
    const s = new URLSearchParams(window.location.search).get("status");
    return s === "new" || s === "contacted" || s === "converted" || s === "lost" ? s : "all";
  });
  const [search, setSearch] = useState("");
  const [scheduleLead, setScheduleLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { data, error } = await sb
        .from("prospect_leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setLeads((data ?? []) as Lead[]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      pushToast({ tone: "error", title: "Chargement leads", message: msg });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(id: string, status: LeadStatus) {
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const patch: Record<string, unknown> = { status };
      if (status === "contacted" || status === "converted") {
        patch.contacted_at = new Date().toISOString();
      }
      const { error } = await sb.from("prospect_leads").update(patch).eq("id", id);
      if (error) throw error;
      pushToast({ tone: "success", title: `Marqué ${STATUS_META[status].label.toLowerCase()}` });
      void load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      pushToast({ tone: "error", title: "Mise à jour impossible", message: msg });
    }
  }

  const filtered = leads.filter((l) => {
    if (filter !== "all" && l.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        l.first_name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        (l.city ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts: Record<LeadStatus | "all", number> = {
    all: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    converted: leads.filter((l) => l.status === "converted").length,
    lost: leads.filter((l) => l.status === "lost").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 14,
          padding: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 700, margin: 0, color: "var(--ls-text)" }}>
            🔥 Prospects entrants
          </h3>
          <span style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
            {leads.length} lead{leads.length > 1 ? "s" : ""} au total
          </span>
        </div>

        {/* Filtres pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {(["all", "new", "contacted", "converted", "lost"] as const).map((f) => {
            const isActive = filter === f;
            const count = counts[f];
            const label = f === "all" ? "Tous" : STATUS_META[f as LeadStatus].label;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: `1px solid ${isActive ? "#EF9F27" : "var(--ls-border)"}`,
                  background: isActive ? "rgba(239,159,39,0.1)" : "transparent",
                  color: isActive ? "#BA7517" : "var(--ls-text-muted)",
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  fontFamily: "DM Sans, sans-serif",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {label} · {count}
              </button>
            );
          })}
        </div>

        {/* Recherche */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un prénom, téléphone, ville..."
          style={{
            width: "100%",
            padding: "9px 12px",
            borderRadius: 10,
            border: "1px solid var(--ls-border)",
            background: "var(--ls-surface2)",
            color: "var(--ls-text)",
            fontSize: 13,
            fontFamily: "DM Sans, sans-serif",
            marginBottom: 14,
            boxSizing: "border-box",
          }}
        />

        {/* Liste */}
        {loading ? (
          <div style={{ fontSize: 13, color: "var(--ls-text-muted)", textAlign: "center", padding: 30 }}>
            Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--ls-text-muted)", textAlign: "center", padding: 30 }}>
            {leads.length === 0
              ? "Aucun lead reçu pour le moment. Le formulaire Welcome enverra les prochains ici."
              : "Aucun lead ne correspond aux filtres."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((lead) => {
              const meta = STATUS_META[lead.status];
              return (
                <div
                  key={lead.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "var(--ls-surface2)",
                    border: "1px solid var(--ls-border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ls-text)", fontFamily: "Syne, sans-serif" }}>
                      {lead.first_name}
                    </span>
                    {lead.city ? (
                      <span style={{ fontSize: 12, color: "var(--ls-text-muted)" }}>· {lead.city}</span>
                    ) : null}
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 600,
                        background: meta.bg,
                        color: meta.color,
                        marginLeft: "auto",
                      }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  {/* Funnel Opportunité gated : profil + température + score + email */}
                  {lead.metadata?.funnel === "opportunite-gated" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      {lead.metadata.profile ? (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "rgba(139,92,246,0.12)", color: "#6D28D9" }}>
                          {PROFILE_LABEL[lead.metadata.profile]}
                        </span>
                      ) : null}
                      {lead.metadata.temperature ? (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: `color-mix(in srgb, ${TEMPERATURE_META[lead.metadata.temperature].color} 14%, transparent)`, color: TEMPERATURE_META[lead.metadata.temperature].color }}>
                          {TEMPERATURE_META[lead.metadata.temperature].emoji} {TEMPERATURE_META[lead.metadata.temperature].label}
                        </span>
                      ) : null}
                      {typeof lead.metadata.score === "number" ? (
                        <span style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>· score {lead.metadata.score}</span>
                      ) : null}
                    </div>
                  ) : null}
                  <div style={{ fontSize: 12, color: "var(--ls-text-muted)" }}>
                    📞 {lead.phone}
                    {lead.metadata?.email ? ` · ✉️ ${lead.metadata.email}` : ""}
                    {" "}· Reçu {formatRelative(lead.created_at)}
                    {lead.source ? ` · Source : ${lead.source}` : ""}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {lead.metadata?.answers && Object.keys(lead.metadata.answers).length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setDetailLead(lead)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          background: "rgba(139,92,246,0.1)",
                          border: "1px solid rgba(139,92,246,0.4)",
                          color: "#6D28D9",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: "DM Sans, sans-serif",
                        }}
                      >
                        🔎 Voir ses réponses
                      </button>
                    ) : null}
                    <a
                      href={buildWhatsAppUrl(lead.phone, lead.first_name)}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        background: "#25D366",
                        color: "#FFFFFF",
                        textDecoration: "none",
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "DM Sans, sans-serif",
                      }}
                    >
                      📱 WhatsApp
                    </a>
                    <button
                      type="button"
                      onClick={() => setScheduleLead(lead)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        background: "transparent",
                        border: "1px solid rgba(139,92,246,0.4)",
                        color: "#6D28D9",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "DM Sans, sans-serif",
                      }}
                    >
                      📅 Planifier visio
                    </button>
                    {lead.status !== "contacted" && lead.status !== "converted" ? (
                      <button
                        type="button"
                        onClick={() => void updateStatus(lead.id, "contacted")}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          background: "transparent",
                          border: "1px solid rgba(29,158,117,0.35)",
                          color: "#0F6E56",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        ✓ Contacté
                      </button>
                    ) : null}
                    {lead.status !== "converted" ? (
                      <button
                        type="button"
                        onClick={() => void updateStatus(lead.id, "converted")}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          background: "transparent",
                          border: "1px solid rgba(239,159,39,0.35)",
                          color: "#BA7517",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        🎉 Converti
                      </button>
                    ) : null}
                    {lead.status !== "lost" && lead.status !== "converted" ? (
                      <button
                        type="button"
                        onClick={() => void updateStatus(lead.id, "lost")}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          background: "transparent",
                          border: "1px solid var(--ls-border)",
                          color: "var(--ls-text-muted)",
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        ✕ Perdu
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {detailLead ? (
        <LeadAnswersModal
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onPlanVisio={() => {
            const l = detailLead;
            setDetailLead(null);
            setScheduleLead(l);
          }}
        />
      ) : null}

      {scheduleLead ? (
        <ScheduleVisioModal
          lead={scheduleLead}
          onClose={() => setScheduleLead(null)}
          onScheduled={async () => {
            await updateStatus(scheduleLead.id, "contacted");
            setScheduleLead(null);
          }}
        />
      ) : null}
    </div>
  );
}

// ─── Modale « Voir ses réponses » (détail funnel opportunité) ────────────────
// Affiche les coordonnées, le profil / score / température calculés, puis
// l'intégralité des réponses du questionnaire traduites en clair. Permet de
// pré-qualifier le prospect avant de l'appeler / caler une visio.
function LeadAnswersModal({
  lead,
  onClose,
  onPlanVisio,
}: {
  lead: Lead;
  onClose: () => void;
  onPlanVisio: () => void;
}) {
  const meta = lead.metadata;
  const rows = useMemo(() => buildFunnelSummary(meta?.answers), [meta?.answers]);
  const fullName = [lead.first_name, meta?.last_name].filter(Boolean).join(" ").trim();
  const temp = meta?.temperature ? TEMPERATURE_META[meta.temperature] : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Réponses de ${lead.first_name}`}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--ls-surface)", color: "var(--ls-text)", width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto", borderRadius: 18, padding: 22, border: "1px solid var(--ls-border)" }}
      >
        {/* En-tête */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6D28D9", marginBottom: 4 }}>
              🔎 Fiche prospect
            </div>
            <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 700, margin: 0 }}>
              {fullName || lead.first_name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{ border: "none", background: "transparent", color: "var(--ls-text-muted)", fontSize: 22, lineHeight: 1, cursor: "pointer", padding: 2 }}
          >
            ×
          </button>
        </div>

        {/* Profil / score / température */}
        {meta?.funnel === "opportunite-gated" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {meta.profile ? (
              <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "rgba(139,92,246,0.12)", color: "#6D28D9" }}>
                {PROFILE_LABEL[meta.profile]}
              </span>
            ) : null}
            {temp ? (
              <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: `color-mix(in srgb, ${temp.color} 14%, transparent)`, color: temp.color }}>
                {temp.emoji} {temp.label}
              </span>
            ) : null}
            {typeof meta.score === "number" ? (
              <span style={{ fontSize: 12, color: "var(--ls-text-muted)" }}>· score {meta.score}/15</span>
            ) : null}
          </div>
        ) : null}

        {/* Coordonnées */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5, padding: "12px 14px", borderRadius: 12, background: "var(--ls-surface2)", border: "1px solid var(--ls-border)", marginBottom: 16, fontSize: 13 }}>
          <div style={{ color: "var(--ls-text)" }}>📞 {lead.phone}</div>
          {meta?.email ? <div style={{ color: "var(--ls-text)" }}>✉️ {meta.email}</div> : null}
          {lead.city ? <div style={{ color: "var(--ls-text-muted)" }}>📍 {lead.city}</div> : null}
          <div style={{ color: "var(--ls-text-muted)", fontSize: 12 }}>
            Reçu {formatRelative(lead.created_at)}
            {lead.source ? ` · ${lead.source}` : ""}
          </div>
        </div>

        {/* Réponses du funnel */}
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ls-text-muted)", marginBottom: 8 }}>
          Ses réponses ({rows.length})
        </div>
        {rows.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ls-text-muted)", margin: "0 0 16px" }}>
            Aucune réponse détaillée enregistrée pour ce lead.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 18 }}>
            {rows.map((r, i) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  padding: "8px 4px",
                  borderTop: i === 0 ? "none" : "1px solid var(--ls-border)",
                }}
              >
                <span style={{ flex: "0 0 46%", fontSize: 12.5, color: "var(--ls-text-muted)" }}>{r.question}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--ls-text)" }}>
                  <span aria-hidden="true">{r.emoji}</span> {r.answer}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <a
            href={buildWhatsAppUrl(lead.phone, lead.first_name)}
            target="_blank"
            rel="noreferrer"
            style={{ flex: 1, textAlign: "center", padding: "11px 16px", borderRadius: 11, background: "#25D366", color: "#FFFFFF", textDecoration: "none", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14 }}
          >
            📱 WhatsApp
          </a>
          <button
            type="button"
            onClick={onPlanVisio}
            style={{ flex: 1, padding: "11px 16px", border: "1px solid rgba(139,92,246,0.4)", borderRadius: 11, background: "transparent", color: "#6D28D9", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            📅 Planifier visio
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modale « Planifier visio » (funnel opportunité) ────────────────────────
// Crée un RDV prospect dans l'agenda interne via createProspect (rappel push
// ~1h avant déjà géré côté agenda). Côté coach = authentifié = sûr.
function ScheduleVisioModal({
  lead,
  onClose,
  onScheduled,
}: {
  lead: Lead;
  onClose: () => void;
  onScheduled: () => Promise<void> | void;
}) {
  const navigate = useNavigate();
  const { createProspect, currentUser } = useAppContext();
  const { push: pushToast } = useToast();

  const defaultLocal = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }, []);

  const [rdvLocal, setRdvLocal] = useState(defaultLocal);
  const profileLabel = lead.metadata?.profile ? PROFILE_LABEL[lead.metadata.profile] : "";
  const [note, setNote] = useState(
    `Visio opportunité — ${profileLabel || "prospect"}${lead.metadata?.score != null ? ` · score ${lead.metadata.score}` : ""}.`,
  );
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (submitting || !rdvLocal) return;
    const rdvDate = new Date(rdvLocal);
    if (Number.isNaN(rdvDate.getTime())) {
      pushToast({ tone: "error", title: "Date de RDV invalide." });
      return;
    }
    setSubmitting(true);
    try {
      await createProspect({
        firstName: lead.first_name.trim(),
        lastName: lead.metadata?.last_name?.trim() || "",
        phone: lead.phone?.trim() || undefined,
        email: lead.metadata?.email?.trim().toLowerCase() || undefined,
        rdvDate: rdvDate.toISOString(),
        source: "Autre",
        sourceDetail: "Opportunité gated",
        note: note.trim() || undefined,
        distributorId: lead.referrer_user_id ?? currentUser?.id ?? "",
      });
      await onScheduled();
      setDone(true);
      pushToast({ tone: "success", title: `Visio programmée avec ${lead.first_name} ✓` });
    } catch (err) {
      pushToast(buildSupabaseErrorToast(err, "Impossible de créer le RDV."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--ls-surface)", color: "var(--ls-text)", width: "100%", maxWidth: 440, borderRadius: 18, padding: 22, border: "1px solid var(--ls-border)" }}
      >
        {done ? (
          <div style={{ textAlign: "center", padding: "8px 4px" }}>
            <div style={{ fontSize: 40 }}>📅</div>
            <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 19, margin: "8px 0 6px" }}>Visio programmée</h3>
            <p style={{ fontSize: 13, color: "var(--ls-text-muted)", lineHeight: 1.5, margin: "0 0 16px" }}>
              Le RDV avec <strong>{lead.first_name}</strong> est dans ton agenda (onglet prospects). Rappel push ~1h avant.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => navigate("/agenda")} style={{ flex: 1, padding: "11px 16px", border: "none", borderRadius: 11, background: "var(--ls-teal)", color: "#04221C", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Voir l'agenda →
              </button>
              <button type="button" onClick={onClose} style={{ padding: "11px 16px", border: "1px solid var(--ls-border)", borderRadius: 11, background: "transparent", color: "var(--ls-text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ls-teal)", marginBottom: 6 }}>
              📅 Planifier la visio
            </div>
            <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>
              {lead.first_name} {profileLabel ? `· ${profileLabel}` : ""}
            </h3>
            <p style={{ fontSize: 12.5, color: "var(--ls-text-muted)", margin: "0 0 16px", lineHeight: 1.45 }}>
              Crée un RDV prospect dans ton agenda interne.
            </p>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>Date et heure</span>
              <input
                type="datetime-local"
                value={rdvLocal}
                onChange={(e) => setRdvLocal(e.target.value)}
                style={{ padding: "9px 11px", border: "1px solid var(--ls-border)", borderRadius: 9, background: "var(--ls-surface)", color: "var(--ls-text)", fontSize: 14, fontFamily: "inherit" }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>Note</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                style={{ padding: "9px 11px", border: "1px solid var(--ls-border)", borderRadius: 9, background: "var(--ls-surface)", color: "var(--ls-text)", fontSize: 14, fontFamily: "inherit", resize: "vertical" }}
              />
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" disabled={submitting || !rdvLocal} onClick={() => void submit()} style={{ flex: 1, padding: "12px 18px", border: "none", borderRadius: 11, background: "var(--ls-teal)", color: "#04221C", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "Création…" : "Programmer"}
              </button>
              <button type="button" onClick={onClose} style={{ padding: "12px 18px", border: "1px solid var(--ls-border)", borderRadius: 11, background: "transparent", color: "var(--ls-text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Annuler
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
