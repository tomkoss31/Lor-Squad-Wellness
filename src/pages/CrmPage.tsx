// =============================================================================
// CrmPage — CRM commun, tous les leads au même endroit (VIP-4 2026-06-10).
//
// Décision Thomas : « un pipeline pour tous — leads pro, bilan online,
// recos PWA, page VIP — juste avoir l'info d'où ça vient et la bonne route
// après. » + « plus pro avec les messages ».
//
// - Agrégation : hook useCrmLeads (online_bilans + prospect_leads +
//   client_referrals), statut normalisé new → contacted → qualified →
//   converted / lost.
// - Colonnes par statut (pattern LeadsKanban V1 : scroll horizontal +
//   select par card, pas de drag-drop).
// - Par card : badge source, « via X » pour les recos, message de premier
//   contact pro pré-rédigé selon la source (WhatsApp / SMS / copier),
//   relance douce, changement de statut.
// - Les bilans online gardent leur kanban détaillé (/clients?tab=leads)
//   pour la conversion en fiche client — lien direct sur la card.
//
// Accès : route protégée AppLayout, entrée sidebar « CRM ». RLS filtre par
// coach. Tokens var(--ls-*) uniquement.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import {
  CRM_SOURCE_META,
  CRM_STATUS_META,
  statusOptionsFor,
  useCrmLeads,
  type CrmLead,
  type CrmSource,
  type CrmStatus,
} from "../hooks/useCrmLeads";
import {
  buildCrmMessage,
  buildCrmRelanceMessage,
  buildCrmSmsLink,
  buildCrmWhatsAppLink,
} from "../lib/crmMessages";

const STATUS_ORDER: CrmStatus[] = ["new", "contacted", "qualified", "converted", "lost"];

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export function CrmPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { push: pushToast } = useToast();
  const { leads, loading, error, counts, refetch, updateStatus } = useCrmLeads();

  const [filterSource, setFilterSource] = useState<CrmSource | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = "La Base 360 — CRM";
  }, []);

  const msgCtx = useMemo(() => {
    const slug = normalizeSlug((currentUser?.name ?? "").split(/\s+/)[0] ?? "");
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return {
      coachFirstName: (currentUser?.name ?? "").split(/\s+/)[0] || "Ton coach",
      bilanUrl: `${origin}/bilan-online/${slug}`,
      vipUrl: `${origin}/vip/${slug}`,
    };
  }, [currentUser?.name]);

  const filtered = useMemo(
    () =>
      leads.filter((l) => {
        if (filterSource !== "all" && l.source !== filterSource) return false;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          if (
            !l.firstName.toLowerCase().includes(q) &&
            !(l.viaName ?? "").toLowerCase().includes(q) &&
            !(l.contact ?? "").toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      }),
    [leads, filterSource, search],
  );

  const sourcesPresent = useMemo(() => {
    const set = new Set<CrmSource>();
    for (const l of leads) set.add(l.source);
    return set;
  }, [leads]);

  async function handleStatusChange(lead: CrmLead, next: CrmStatus) {
    const err = await updateStatus(lead, next);
    if (err) {
      pushToast({ tone: "warning", title: "Statut non enregistré", message: err });
    }
  }

  async function copyMessage(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      pushToast({ tone: "success", title: "Message copié", message: "Colle-le où tu veux." });
    } catch {
      pushToast({ tone: "warning", title: "Copie impossible", message: "" });
    }
  }

  return (
    <div style={pageWrap}>
      {/* Hero */}
      <header style={heroBox}>
        <div style={heroEyebrow}>🎯 CRM · Tous tes leads</div>
        <h1 style={heroTitle}>Un seul pipeline, toutes tes sources</h1>
        <p style={heroSubtitle}>
          Bilan online, Club VIP, opportunité, recos de tes clients — tout
          arrive ici. Contacte avec un message pro pré-rédigé, classe, convertis.
        </p>
        {/* Stats */}
        <div style={statsRow}>
          {STATUS_ORDER.map((s) => (
            <div key={s} style={statChip(CRM_STATUS_META[s].color)}>
              <span aria-hidden="true">{CRM_STATUS_META[s].emoji}</span>
              <strong style={{ fontFamily: "Syne, sans-serif" }}>{counts[s]}</strong>
              <span style={{ fontSize: 11 }}>{CRM_STATUS_META[s].label}</span>
            </div>
          ))}
        </div>
      </header>

      {error ? (
        <div style={errorBanner}>
          ⚠️ Une source n'a pas pu charger : {error}
          <button type="button" onClick={() => void refetch()} style={retryBtn}>
            Réessayer
          </button>
        </div>
      ) : null}

      {/* Filtres */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>
        <button
          type="button"
          onClick={() => setFilterSource("all")}
          style={sourceChip(filterSource === "all", "var(--ls-text)")}
        >
          Toutes sources
        </button>
        {(Object.keys(CRM_SOURCE_META) as CrmSource[])
          .filter((s) => sourcesPresent.has(s))
          .map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterSource(filterSource === s ? "all" : s)}
              style={sourceChip(filterSource === s, "var(--ls-teal)")}
            >
              {CRM_SOURCE_META[s].emoji} {CRM_SOURCE_META[s].label}
            </button>
          ))}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Nom, contact, parrain…"
          style={searchInput}
          aria-label="Rechercher un lead"
        />
      </div>

      {/* Pipeline */}
      {loading ? (
        <div style={hint}>Chargement de tes leads…</div>
      ) : filtered.length === 0 ? (
        <div style={emptyState}>
          {leads.length === 0
            ? "Aucun lead pour l'instant. Partage ton lien bilan online ou ta page Club VIP pour remplir le pipeline 🌱"
            : "Aucun lead ne correspond aux filtres."}
        </div>
      ) : (
        <div style={columnsWrap}>
          {STATUS_ORDER.map((status) => {
            const col = filtered.filter((l) => l.status === status);
            return (
              <div key={status} style={column}>
                <div style={columnHeader(CRM_STATUS_META[status].color)}>
                  <span aria-hidden="true">{CRM_STATUS_META[status].emoji}</span>{" "}
                  {CRM_STATUS_META[status].label}
                  <span style={columnCount}>{col.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {col.map((lead) => (
                    <LeadCard
                      key={lead.key}
                      lead={lead}
                      msgCtx={msgCtx}
                      onStatusChange={(s) => void handleStatusChange(lead, s)}
                      onCopy={(text) => void copyMessage(text)}
                      onOpenBilans={() => navigate("/clients?tab=leads")}
                    />
                  ))}
                  {col.length === 0 ? <div style={columnEmpty}>—</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <footer style={footerHint}>
        💡 Les leads <strong>Bilan online</strong> ont aussi leur kanban détaillé (réponses
        complètes + conversion en fiche client) dans{" "}
        <button type="button" onClick={() => navigate("/clients?tab=leads")} style={inlineLink}>
          Dossiers clients &gt; Leads
        </button>
        . Les recos VIP sans contact (prénoms du simulateur) restent sur la fiche du client
        parrain.
      </footer>
    </div>
  );
}

// ─── LeadCard ────────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  msgCtx,
  onStatusChange,
  onCopy,
  onOpenBilans,
}: {
  lead: CrmLead;
  msgCtx: { coachFirstName: string; bilanUrl: string; vipUrl: string };
  onStatusChange: (s: CrmStatus) => void;
  onCopy: (text: string) => void;
  onOpenBilans: () => void;
}) {
  const src = CRM_SOURCE_META[lead.source];
  const message =
    lead.status === "contacted"
      ? buildCrmRelanceMessage(lead, msgCtx)
      : buildCrmMessage(lead, msgCtx);
  const messageLabel = lead.status === "contacted" ? "Relance douce" : "1er contact";

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <strong style={{ fontFamily: "Syne, sans-serif", fontSize: 14, color: "var(--ls-text)" }}>
          {lead.firstName}
        </strong>
        <span style={srcBadge}>
          {src.emoji} {src.label}
        </span>
        {lead.relanceDue ? <span style={relanceBadge}>🔔 Relance due</span> : null}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ls-text-hint)" }}>
          {formatDate(lead.createdAt)}
        </span>
      </div>

      <div style={{ fontSize: 12, color: "var(--ls-text-muted)", lineHeight: 1.5 }}>
        {lead.viaName ? <>🤝 via <strong>{lead.viaName}</strong> · </> : null}
        {lead.city ? <>{lead.city} · </> : null}
        {lead.contact ?? "pas de contact"}
      </div>

      {/* Actions message pro */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {lead.contactIsPhone ? (
          <>
            <a
              href={buildCrmWhatsAppLink(lead.contact, message)}
              target="_blank"
              rel="noopener noreferrer"
              style={actionBtn("#25D366")}
              title={`${messageLabel} pré-rédigé`}
            >
              📱 WhatsApp
            </a>
            <a href={buildCrmSmsLink(lead.contact, message)} style={actionBtn("var(--ls-purple)")}>
              💬 SMS
            </a>
          </>
        ) : null}
        <button type="button" onClick={() => onCopy(message)} style={actionBtn("var(--ls-gold)")}>
          📋 {messageLabel}
        </button>
        {lead.table === "online_bilans" ? (
          <button type="button" onClick={onOpenBilans} style={actionBtn("var(--ls-teal)")}>
            📂 Détails
          </button>
        ) : null}
      </div>

      {/* Statut */}
      <select
        value={lead.status}
        onChange={(e) => onStatusChange(e.target.value as CrmStatus)}
        style={statusSelect(CRM_STATUS_META[lead.status].color)}
        aria-label={`Statut de ${lead.firstName}`}
      >
        {statusOptionsFor(lead.table).map((s) => (
          <option key={s} value={s}>
            {CRM_STATUS_META[s].emoji} {CRM_STATUS_META[s].label}
          </option>
        ))}
        {/* Statut courant hors options natives (ex: converti via kanban) */}
        {!statusOptionsFor(lead.table).includes(lead.status) ? (
          <option value={lead.status}>
            {CRM_STATUS_META[lead.status].emoji} {CRM_STATUS_META[lead.status].label}
          </option>
        ) : null}
      </select>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const pageWrap: React.CSSProperties = {
  maxWidth: 1280,
  margin: "0 auto",
  padding: "20px 18px 60px",
};

const heroBox: React.CSSProperties = {
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-teal) 10%, var(--ls-surface)), color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface)))",
  border: "0.5px solid color-mix(in srgb, var(--ls-teal) 28%, var(--ls-border))",
  borderRadius: 18,
  padding: "22px 20px",
};

const heroEyebrow: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 1.4,
  color: "var(--ls-teal)",
  marginBottom: 6,
};

const heroTitle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 25,
  fontWeight: 800,
  color: "var(--ls-text)",
  lineHeight: 1.15,
};

const heroSubtitle: React.CSSProperties = {
  margin: "6px 0 14px",
  fontSize: 13.5,
  lineHeight: 1.55,
  color: "var(--ls-text-muted)",
  maxWidth: 600,
};

const statsRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const statChip = (color: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  borderRadius: 999,
  background: `color-mix(in srgb, ${color} 10%, var(--ls-surface))`,
  border: `0.5px solid color-mix(in srgb, ${color} 35%, transparent)`,
  fontSize: 12.5,
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
});

const errorBanner: React.CSSProperties = {
  marginTop: 14,
  padding: "10px 14px",
  borderRadius: 12,
  background: "color-mix(in srgb, var(--ls-coral) 10%, var(--ls-surface))",
  border: "0.5px solid color-mix(in srgb, var(--ls-coral) 40%, transparent)",
  fontSize: 12.5,
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const retryBtn: React.CSSProperties = {
  background: "transparent",
  border: "0.5px solid var(--ls-border)",
  color: "var(--ls-text)",
  fontSize: 12,
  padding: "4px 12px",
  borderRadius: 999,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
};

const sourceChip = (active: boolean, color: string): React.CSSProperties => ({
  padding: "7px 13px",
  borderRadius: 999,
  fontSize: 12.5,
  fontWeight: active ? 700 : 500,
  fontFamily: "DM Sans, sans-serif",
  cursor: "pointer",
  background: active ? `color-mix(in srgb, ${color} 12%, var(--ls-surface))` : "var(--ls-surface)",
  border: active
    ? `0.5px solid color-mix(in srgb, ${color} 50%, transparent)`
    : "0.5px solid var(--ls-border)",
  color: active ? color : "var(--ls-text-muted)",
});

const searchInput: React.CSSProperties = {
  flex: "1 1 180px",
  minWidth: 160,
  padding: "7px 13px",
  borderRadius: 999,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface)",
  color: "var(--ls-text)",
  fontSize: 12.5,
  fontFamily: "DM Sans, sans-serif",
  outline: "none",
};

const columnsWrap: React.CSSProperties = {
  display: "flex",
  gap: 12,
  overflowX: "auto",
  paddingBottom: 12,
  alignItems: "flex-start",
};

const column: React.CSSProperties = {
  flex: "0 0 290px",
  minWidth: 290,
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 14,
  padding: 10,
};

const columnHeader = (color: string): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "Syne, sans-serif",
  fontSize: 13,
  fontWeight: 700,
  color,
  padding: "4px 6px 10px",
});

const columnCount: React.CSSProperties = {
  marginLeft: "auto",
  fontSize: 11,
  fontWeight: 800,
  color: "var(--ls-text-muted)",
  background: "var(--ls-surface)",
  borderRadius: 999,
  padding: "1px 8px",
  border: "0.5px solid var(--ls-border)",
};

const columnEmpty: React.CSSProperties = {
  textAlign: "center",
  color: "var(--ls-text-hint)",
  fontSize: 12,
  padding: "18px 0",
};

const card: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 12,
  padding: "12px 12px",
  display: "flex",
  flexDirection: "column",
  gap: 9,
  fontFamily: "DM Sans, sans-serif",
};

const srcBadge: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  padding: "2px 8px",
  borderRadius: 999,
  background: "color-mix(in srgb, var(--ls-teal) 10%, transparent)",
  border: "0.5px solid color-mix(in srgb, var(--ls-teal) 35%, transparent)",
  color: "var(--ls-teal)",
  whiteSpace: "nowrap",
};

const relanceBadge: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  padding: "2px 8px",
  borderRadius: 999,
  background: "color-mix(in srgb, var(--ls-coral) 12%, transparent)",
  border: "0.5px solid color-mix(in srgb, var(--ls-coral) 40%, transparent)",
  color: "var(--ls-coral)",
  whiteSpace: "nowrap",
};

const actionBtn = (accent: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "6px 10px",
  borderRadius: 9,
  background: `color-mix(in srgb, ${accent} 10%, var(--ls-surface2))`,
  border: `0.5px solid color-mix(in srgb, ${accent} 35%, transparent)`,
  color: "var(--ls-text)",
  fontSize: 11.5,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
  fontFamily: "DM Sans, sans-serif",
});

const statusSelect = (color: string): React.CSSProperties => ({
  padding: "6px 10px",
  fontSize: 12,
  borderRadius: 9,
  border: `1px solid color-mix(in srgb, ${color} 45%, var(--ls-border))`,
  background: `color-mix(in srgb, ${color} 8%, var(--ls-surface2))`,
  color: "var(--ls-text)",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
});

const hint: React.CSSProperties = {
  marginTop: 20,
  fontSize: 13,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
};

const emptyState: React.CSSProperties = {
  padding: "40px 20px",
  textAlign: "center",
  color: "var(--ls-text-muted)",
  background: "var(--ls-surface)",
  border: "0.5px dashed var(--ls-border)",
  borderRadius: 14,
  fontSize: 13.5,
  lineHeight: 1.6,
  fontFamily: "DM Sans, sans-serif",
};

const footerHint: React.CSSProperties = {
  marginTop: 20,
  padding: "14px 16px",
  borderRadius: 12,
  background: "var(--ls-surface)",
  border: "0.5px dashed var(--ls-border)",
  fontSize: 12.5,
  color: "var(--ls-text-muted)",
  lineHeight: 1.6,
  fontFamily: "DM Sans, sans-serif",
};

const inlineLink: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--ls-teal)",
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
  padding: 0,
  fontFamily: "DM Sans, sans-serif",
};
