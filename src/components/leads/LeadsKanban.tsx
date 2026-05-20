// =============================================================================
// LeadsKanban — vue kanban des online_bilans par lead_status.
// Chantier #1 étape 1.6 (2026-05-17).
//
// V1 : status change via dropdown sur la card. DnD potentiel V2 si besoin.
// Click sur card → ouvre LeadDetailModal (templates de réponse en 1.8).
// =============================================================================

import { useMemo, useState } from "react";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_ORDER,
  type LeadStatus,
  type OnlineBilanRow,
  useOnlineBilans,
} from "../../hooks/useOnlineBilans";
import { LeadDetailModal } from "./LeadDetailModal";
import { MyBilanLinkCard } from "./MyBilanLinkCard";

const STATUS_TONES: Record<LeadStatus, { bg: string; fg: string; dot: string }> = {
  new: { bg: "rgba(201, 168, 76, 0.10)", fg: "#9A7F2A", dot: "#C9A84C" },
  contact: { bg: "rgba(45, 212, 191, 0.10)", fg: "#0D9488", dot: "#2DD4BF" },
  qualified: { bg: "rgba(16, 185, 129, 0.10)", fg: "#047857", dot: "#10B981" },
  to_recontact: { bg: "rgba(245, 158, 11, 0.12)", fg: "#92400E", dot: "#F59E0B" },
  relance: { bg: "rgba(139, 92, 246, 0.10)", fg: "#5B21B6", dot: "#8B5CF6" },
  lost: { bg: "rgba(107, 114, 128, 0.10)", fg: "#6B7280", dot: "#9CA3AF" },
};

const OBJECTIVE_LABELS: Record<string, string> = {
  weight_loss: "Perte de poids",
  mass_gain: "Prise de masse",
  energy: "Énergie",
  sleep: "Sommeil",
  wellbeing: "Bien-être",
};

function isRelanceDue(bilan: OnlineBilanRow): boolean {
  if (!bilan.relance_due_at || bilan.relance_done_at) return false;
  return new Date(bilan.relance_due_at).getTime() <= Date.now();
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export function LeadsKanban() {
  const { bilans, loading, error, updateStatus, updateNotes, refetch } = useOnlineBilans();
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  const byStatus = useMemo(() => {
    const map = new Map<LeadStatus, OnlineBilanRow[]>();
    for (const s of LEAD_STATUS_ORDER) map.set(s, []);
    for (const b of bilans) {
      const arr = map.get(b.lead_status);
      if (arr) arr.push(b);
    }
    return map;
  }, [bilans]);

  const openLead = openLeadId
    ? bilans.find((b) => b.id === openLeadId) ?? null
    : null;

  if (loading) {
    return <div className="lk-loading">Chargement des Leads…</div>;
  }
  if (error) {
    return <div className="lk-error">Erreur : {error}</div>;
  }

  return (
    <div className="lk-root">
      <style>{STYLES}</style>

      <MyBilanLinkCard />

      {bilans.length === 0 && (
        <div className="lk-empty">
          <div className="lk-empty-emoji">📭</div>
          <h3>Pas encore de Lead</h3>
          <p>Partage le lien ci-dessus pour recevoir tes premiers bilans.</p>
        </div>
      )}

      {bilans.length > 0 && (
      <div className="lk-columns">
        {LEAD_STATUS_ORDER.map((status) => {
          const items = byStatus.get(status) ?? [];
          const tone = STATUS_TONES[status];
          return (
            <div key={status} className="lk-col">
              <div
                className="lk-col-header"
                style={{ background: tone.bg, color: tone.fg }}
              >
                <span className="lk-col-dot" style={{ background: tone.dot }} />
                <span className="lk-col-title">{LEAD_STATUS_LABELS[status]}</span>
                <span className="lk-col-count">{items.length}</span>
              </div>

              <div className="lk-col-body">
                {items.length === 0 ? (
                  <div className="lk-col-empty">—</div>
                ) : (
                  items.map((b) => (
                    <LeadCard
                      key={b.id}
                      bilan={b}
                      onClick={() => setOpenLeadId(b.id)}
                      onStatusChange={(s) => updateStatus(b.id, s)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {openLead && (
        <LeadDetailModal
          bilan={openLead}
          onClose={() => setOpenLeadId(null)}
          onStatusChange={async (s) => {
            await updateStatus(openLead.id, s);
          }}
          onNotesChange={async (n) => {
            await updateNotes(openLead.id, n);
          }}
          onRefresh={refetch}
        />
      )}
    </div>
  );
}

function LeadCard({
  bilan,
  onClick,
  onStatusChange,
}: {
  bilan: OnlineBilanRow;
  onClick: () => void;
  onStatusChange: (s: LeadStatus) => void | Promise<void>;
}) {
  return (
    <div className="lk-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onClick(); }}>
      <div className="lk-card-top">
        <span className="lk-card-name">
          {bilan.first_name}
          {bilan.age != null ? `, ${bilan.age}` : ""}
        </span>
        <span className="lk-card-date">{formatDateShort(bilan.created_at)}</span>
      </div>

      {isRelanceDue(bilan) && (
        <div className="lk-card-relance">🔔 Relance due</div>
      )}

      {bilan.city && <div className="lk-card-city">📍 {bilan.city}</div>}

      {bilan.objectives.length > 0 && (
        <div className="lk-card-objs">
          {bilan.objectives.slice(0, 3).map((o) => (
            <span key={o} className="lk-card-obj">
              {OBJECTIVE_LABELS[o] ?? o}
            </span>
          ))}
        </div>
      )}

      <div className="lk-card-bottom">
        {bilan.motivation_score != null && (
          <span className="lk-card-motiv">
            🔥 {bilan.motivation_score}/10
          </span>
        )}
        <select
          className="lk-card-status"
          value={bilan.lead_status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            void onStatusChange(e.target.value as LeadStatus);
          }}
        >
          {LEAD_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

const STYLES = `
  .lk-root { width: 100%; }
  .lk-loading, .lk-error, .lk-empty {
    padding: 32px;
    text-align: center;
    color: var(--ls-text-muted, #6B7280);
  }
  .lk-empty-emoji { font-size: 48px; margin-bottom: 12px; }
  .lk-empty h3 {
    font-family: 'Syne', 'Inter', sans-serif;
    margin: 0 0 8px 0;
    color: var(--ls-text, #0F172A);
  }
  .lk-empty code {
    background: rgba(201, 168, 76, 0.10);
    color: #C9A84C;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
  }

  .lk-columns {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding-bottom: 16px;
    scroll-snap-type: x proximity;
  }
  .lk-col {
    flex: 0 0 280px;
    min-width: 280px;
    background: var(--ls-surface2, #F9FAFB);
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    scroll-snap-align: start;
  }
  .lk-col-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    border-radius: 14px 14px 0 0;
    font-size: 13px;
    font-weight: 600;
  }
  .lk-col-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .lk-col-title { flex: 1; }
  .lk-col-count {
    background: rgba(0, 0, 0, 0.08);
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
  }

  .lk-col-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    min-height: 60px;
    max-height: 70vh;
    overflow-y: auto;
  }
  .lk-col-empty {
    text-align: center;
    color: var(--ls-text-muted, #9CA3AF);
    padding: 16px;
    font-size: 13px;
  }

  .lk-card {
    background: var(--ls-surface, #fff);
    border: 1px solid var(--ls-border, #E5E7EB);
    border-radius: 10px;
    padding: 12px;
    cursor: pointer;
    transition: border-color 160ms, transform 160ms, box-shadow 160ms;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .lk-card:hover {
    border-color: var(--ls-gold, #C9A84C);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
  }

  .lk-card-top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 6px;
  }
  .lk-card-name {
    font-weight: 700;
    font-size: 14.5px;
    color: var(--ls-text, #0F172A);
  }
  .lk-card-date {
    font-size: 12px;
    color: var(--ls-text-muted, #9CA3AF);
    flex-shrink: 0;
  }
  .lk-card-city {
    font-size: 12.5px;
    color: var(--ls-text-muted, #6B7280);
  }
  .lk-card-objs {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .lk-card-obj {
    background: rgba(45, 212, 191, 0.10);
    color: #0D9488;
    padding: 3px 8px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 500;
  }
  .lk-card-relance {
    display: inline-block;
    background: rgba(245, 158, 11, 0.12);
    color: #92400E;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 600;
    align-self: flex-start;
  }
  .lk-card-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
  }
  .lk-card-motiv {
    font-size: 12.5px;
    color: var(--ls-text-muted, #6B7280);
  }
  .lk-card-status {
    font-size: 12px;
    padding: 4px 6px;
    border-radius: 6px;
    border: 1px solid var(--ls-border, #E5E7EB);
    background: var(--ls-surface, #fff);
    color: var(--ls-text, #0F172A);
    cursor: pointer;
    font-family: inherit;
  }
`;
