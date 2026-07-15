// =============================================================================
// CrmLeadsListView — vue liste compacte du CRM (chantier refonte CRM
// Liste/Pipeline, 2026-07). Vue par défaut demandée par Thomas (type Attio) :
// 1 ligne par lead, triable, avec un panneau d'actions inline au clic (pas de
// navigation de route en Phase 1 — la fiche dédiée /crm/leads/:id arrive en
// Phase 2, elle remplacera ce panneau accordéon sans changer la structure de
// la ligne).
//
// Pattern de table calqué sur src/pages/ClientsPage.tsx (header flex-div,
// bordure gauche colorée par statut, tri via <select> externe plutôt que
// sort-by-click). Ne fait AUCUN filtrage propre : reçoit `leads` déjà filtré
// par le parent (CrmPage), pour rester synchronisée avec la vue Pipeline.
// =============================================================================

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CRM_EDITABLE_SOURCES,
  CRM_SOURCE_META,
  CRM_STATUS_META,
  statusOptionsFor,
  type CrmLead,
  type CrmSource,
  type CrmStatus,
} from "../../hooks/useCrmLeads";
import { useLeadQuickActions } from "../../hooks/useLeadQuickActions";
import { buildCrmSmsLink, buildCrmWhatsAppLink, type CrmMessageContext } from "../../lib/crmMessages";
import { formatLeadDate, relativeLeadDays } from "../../lib/leadDateFormat";
import { EmptyState } from "../ui/EmptyState";

type SortKey = "recent" | "oldest" | "name";

interface CrmLeadsListViewProps {
  leads: CrmLead[];
  msgCtx: CrmMessageContext;
  /** true en vue Endormis : bouton Réveiller au lieu d'Endormir. */
  archived: boolean;
  onStatusChange: (lead: CrmLead, next: CrmStatus) => void;
  onSourceChange: (lead: CrmLead, next: CrmSource) => void;
  onCopy: (text: string) => void;
  onAgenda: (lead: CrmLead) => void;
  dupeFlagFor: (lead: CrmLead) => { kind: "client" | "dupe"; label: string } | null;
  onDormant: (lead: CrmLead) => void;
  onWake: (lead: CrmLead) => void;
  onDelete?: (lead: CrmLead) => void;
  emptyMessage: string;
}

export function CrmLeadsListView({
  leads,
  msgCtx,
  archived,
  onStatusChange,
  onSourceChange,
  onCopy,
  onAgenda,
  dupeFlagFor,
  onDormant,
  onWake,
  onDelete,
  emptyMessage,
}: CrmLeadsListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const arr = [...leads];
    if (sortKey === "recent") {
      arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortKey === "oldest") {
      arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      arr.sort((a, b) => a.firstName.localeCompare(b.firstName, "fr"));
    }
    return arr;
  }, [leads, sortKey]);

  if (leads.length === 0) {
    return (
      <div style={{ background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderRadius: 14 }}>
        <EmptyState emoji="🎯" title="Aucun lead ici" description={emptyMessage} />
      </div>
    );
  }

  return (
    <div>
      <style>{`
        .crm-list-row:hover { background: color-mix(in srgb, var(--ls-teal) 5%, transparent); }
      `}</style>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          aria-label="Trier les leads"
          style={{
            height: 32,
            padding: "0 10px",
            borderRadius: 999,
            border: "1px solid var(--ls-border)",
            background: "var(--ls-surface)",
            color: "var(--ls-text)",
            fontSize: 12.5,
            fontFamily: "DM Sans, sans-serif",
            cursor: "pointer",
          }}
        >
          <option value="recent">Plus récents</option>
          <option value="oldest">Plus anciens</option>
          <option value="name">Nom A→Z</option>
        </select>
      </div>

      <div
        style={{
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 14,
          overflow: "hidden",
          overflowX: "auto",
        }}
      >
        <div style={{ minWidth: 640 }}>
          {/* Header colonnes */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 14px",
              borderBottom: "1px solid var(--ls-border)",
              background: "var(--ls-surface2)",
              gap: 8,
            }}
          >
            <div style={{ ...headCell, flex: 2 }}>Lead</div>
            <div style={{ ...headCell, flex: 1.2 }}>Source</div>
            <div style={{ ...headCell, flex: 1.4 }}>Contact</div>
            <div style={{ ...headCell, width: 130 }}>Statut</div>
            <div style={{ ...headCell, width: 60 }}>Reçu le</div>
            <div style={{ ...headCell, width: 20 }} />
          </div>

          {sorted.map((lead, i) => (
            <CrmLeadListRow
              key={lead.key}
              lead={lead}
              msgCtx={msgCtx}
              archived={archived}
              isLast={i === sorted.length - 1}
              expanded={expandedKey === lead.key}
              onToggle={() => setExpandedKey((k) => (k === lead.key ? null : lead.key))}
              onStatusChange={(s) => onStatusChange(lead, s)}
              onSourceChange={lead.table === "prospect_leads" ? (s: CrmSource) => onSourceChange(lead, s) : undefined}
              onCopy={onCopy}
              onAgenda={() => onAgenda(lead)}
              dupeFlag={dupeFlagFor(lead)}
              onDormant={!archived ? () => onDormant(lead) : undefined}
              onWake={archived ? () => onWake(lead) : undefined}
              onDelete={onDelete ? () => onDelete(lead) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Ligne + accordéon d'actions ───────────────────────────────────────────

function CrmLeadListRow({
  lead,
  msgCtx,
  archived,
  isLast,
  expanded,
  onToggle,
  onStatusChange,
  onSourceChange,
  onCopy,
  onAgenda,
  dupeFlag,
  onDormant,
  onWake,
  onDelete,
}: {
  lead: CrmLead;
  msgCtx: CrmMessageContext;
  archived: boolean;
  isLast: boolean;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (s: CrmStatus) => void;
  onSourceChange?: (s: CrmSource) => void;
  onCopy: (text: string) => void;
  onAgenda: () => void;
  dupeFlag: { kind: "client" | "dupe"; label: string } | null;
  onDormant?: () => void;
  onWake?: () => void;
  onDelete?: () => void;
}) {
  const src = CRM_SOURCE_META[lead.source];
  const statusMeta = CRM_STATUS_META[lead.status];
  const isIntentionSource = lead.source === "intention";
  const { message, messageLabel, aiMessage, setAiMessage, aiLoading, generateAi, lastTouch, recordTouch } =
    useLeadQuickActions(lead, msgCtx);

  return (
    <div>
      <div
        className="crm-list-row"
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          gap: 8,
          padding: "12px 14px",
          borderLeft: `3px solid ${statusMeta.color}`,
          borderBottom: isLast && !expanded ? "none" : "1px solid var(--ls-border)",
          background: "transparent",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        {/* Clic sur la ligne → fiche détail plein écran (Phase 2). Le
            chevron reste un accordéon d'actions rapides sans quitter la
            liste (WhatsApp/SMS/copier en 1 clic, cf. Phase 1). */}
        <Link
          to={`/crm/leads/${lead.key}`}
          style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0, gap: 8, textDecoration: "none", color: "inherit" }}
        >
          <div style={{ flex: 2, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: "var(--ls-text)" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.firstName}</span>
              {lead.relanceDue ? <span title="Relance due" aria-hidden="true">🔔</span> : null}
              {dupeFlag ? <span title={dupeFlag.label} aria-hidden="true">⚠️</span> : null}
            </div>
            <div style={{ fontSize: 11, color: "var(--ls-text-hint)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {lead.viaName ? `via ${lead.viaName}` : lead.city ?? "—"}
            </div>
          </div>
          <div style={{ flex: 1.2, fontSize: 12, color: "var(--ls-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {src.emoji} {src.label}
          </div>
          <div style={{ flex: 1.4, fontSize: 12, color: "var(--ls-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {lead.contact ?? (isIntentionSource ? "à demander au parrain" : "—")}
          </div>
          <div style={{ width: 130 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 10px",
                borderRadius: 10,
                fontSize: 10.5,
                fontWeight: 600,
                background: `color-mix(in srgb, ${statusMeta.color} 16%, transparent)`,
                color: statusMeta.color,
              }}
            >
              {statusMeta.emoji} {statusMeta.label}
            </span>
          </div>
          <div style={{ width: 60, fontSize: 11, color: "var(--ls-text-hint)" }}>{formatLeadDate(lead.createdAt)}</div>
        </Link>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? "Fermer les actions rapides" : "Actions rapides"}
          title="Actions rapides (WhatsApp/SMS/copier) sans quitter la liste"
          style={{
            width: 26,
            height: 26,
            flexShrink: 0,
            border: "none",
            background: "transparent",
            color: "var(--ls-text-hint)",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          {expanded ? "▲" : "▼"}
        </button>
      </div>

      {expanded ? (
        <div
          style={{
            padding: "14px 16px 16px",
            borderLeft: `3px solid ${statusMeta.color}`,
            borderBottom: isLast ? "none" : "1px solid var(--ls-border)",
            background: "var(--ls-surface2)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {lastTouch ? (
            <div style={{ fontSize: 11.5, color: "var(--ls-teal)" }}>📨 contacté {relativeLeadDays(lastTouch)}</div>
          ) : null}

          {/* Statut + source éditables */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={lead.status}
              onChange={(e) => onStatusChange(e.target.value as CrmStatus)}
              aria-label={`Statut de ${lead.firstName}`}
              style={selectStyle(statusMeta.color)}
            >
              {statusOptionsFor(lead.table).map((s) => (
                <option key={s} value={s}>
                  {CRM_STATUS_META[s].emoji} {CRM_STATUS_META[s].label}
                </option>
              ))}
              {!statusOptionsFor(lead.table).includes(lead.status) ? (
                <option value={lead.status}>
                  {statusMeta.emoji} {statusMeta.label}
                </option>
              ) : null}
            </select>
            {onSourceChange ? (
              <select
                value={lead.source}
                onChange={(e) => onSourceChange(e.target.value as CrmSource)}
                aria-label={`Source de ${lead.firstName}`}
                style={selectStyle("var(--ls-purple)")}
              >
                {CRM_EDITABLE_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {CRM_SOURCE_META[s].emoji} {CRM_SOURCE_META[s].label}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {/* Actions de contact */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {isIntentionSource && lead.parrainPhone ? (
              <a
                href={buildCrmWhatsAppLink(lead.parrainPhone, message)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={recordTouch}
                style={actionBtn("#25D366")}
              >
                📱 Demander à {(lead.viaName ?? "").split(/\s+/)[0] || "ton client"}
              </a>
            ) : null}
            {!isIntentionSource && lead.contactIsPhone ? (
              <>
                <a
                  href={buildCrmWhatsAppLink(lead.contact, message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={recordTouch}
                  style={actionBtn("#25D366")}
                >
                  📱 WhatsApp
                </a>
                <a href={buildCrmSmsLink(lead.contact, message)} onClick={recordTouch} style={actionBtn("var(--ls-teal)")}>
                  💬 SMS
                </a>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => {
                recordTouch();
                onCopy(message);
              }}
              style={actionBtn("var(--ls-gold)")}
            >
              📋 Copier {messageLabel.toLowerCase()}
            </button>
            {lead.status !== "converted" && lead.status !== "lost" ? (
              <button type="button" onClick={onAgenda} style={actionBtn("var(--ls-purple)")}>
                📅 Caler un RDV
              </button>
            ) : null}
            <button
              type="button"
              disabled={aiLoading}
              onClick={() => {
                if (!window.confirm("✨ Noaly va rédiger un message personnalisé avec l'IA. Ça consomme des crédits — générer ?")) return;
                void generateAi();
              }}
              style={actionBtn("var(--ls-purple)")}
            >
              ✨ {aiLoading ? "Noaly écrit…" : "Noaly écrit un message IA"}
            </button>
          </div>

          {aiMessage ? (
            <div style={{ background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ls-purple)", marginBottom: 6 }}>
                ✨ Proposition de Noaly — édite avant d'envoyer
              </div>
              <textarea
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                rows={5}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  borderRadius: 8,
                  border: "1px solid var(--ls-border)",
                  background: "var(--ls-surface2)",
                  color: "var(--ls-text)",
                  fontSize: 12.5,
                  fontFamily: "DM Sans, sans-serif",
                  padding: 8,
                  resize: "vertical",
                }}
              />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {lead.contactIsPhone ? (
                  <a href={buildCrmWhatsAppLink(lead.contact, aiMessage)} target="_blank" rel="noopener noreferrer" style={actionBtn("#25D366")}>
                    📱 WhatsApp
                  </a>
                ) : null}
                <button type="button" onClick={() => onCopy(aiMessage)} style={actionBtn("var(--ls-gold)")}>
                  📋 Copier
                </button>
                <button type="button" onClick={() => setAiMessage(null)} style={actionBtn("var(--ls-text-muted)")}>
                  ✕ Fermer
                </button>
              </div>
            </div>
          ) : null}

          {/* Endormir / Réveiller / Supprimer */}
          {(onDormant || onWake || onDelete) && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {archived && onWake ? (
                <button type="button" onClick={onWake} style={cardActionBtn}>
                  ☀️ Réveiller
                </button>
              ) : null}
              {!archived && onDormant ? (
                <button type="button" onClick={onDormant} style={cardActionBtn} title="Mettre de côté — sort du flux, plus de relance">
                  💤 Endormir
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  onClick={onDelete}
                  style={{ ...cardActionBtn, color: "var(--ls-coral)", borderColor: "color-mix(in srgb, var(--ls-coral) 35%, var(--ls-border))" }}
                >
                  🗑 Supprimer
                </button>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const headCell: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: "2px",
  textTransform: "uppercase",
  color: "var(--ls-text-hint)",
  fontWeight: 500,
};

function selectStyle(color: string): React.CSSProperties {
  return {
    height: 30,
    padding: "0 8px",
    borderRadius: 8,
    border: `1px solid color-mix(in srgb, ${color} 35%, var(--ls-border))`,
    background: "var(--ls-surface)",
    color,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "DM Sans, sans-serif",
    cursor: "pointer",
  };
}

function actionBtn(color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 11px",
    borderRadius: 8,
    border: `1px solid color-mix(in srgb, ${color} 35%, var(--ls-border))`,
    background: `color-mix(in srgb, ${color} 8%, var(--ls-surface))`,
    color,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "DM Sans, sans-serif",
    textDecoration: "none",
    cursor: "pointer",
  };
}

const cardActionBtn: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 8,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface)",
  color: "var(--ls-text-muted)",
  fontSize: 11.5,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
};
