import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";
import { ProspectCard } from "../components/prospect/ProspectCard";
import { ProspectFormModal } from "../components/prospect/ProspectFormModal";
import { useAppContext } from "../context/AppContext";
import { useToast, buildSupabaseErrorToast } from "../context/ToastContext";
import type { Prospect, ProspectStatus } from "../types/domain";
import { PROSPECT_STATUS_LABELS } from "../types/domain";

type DateFilter = "today" | "week" | "all";
type StatusFilter = "upcoming" | "done" | "converted" | "cold" | "lost_no_show" | "all";

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function endOfWeek(d: Date): Date {
  // Dimanche soir de la semaine en cours (convention française)
  const copy = new Date(d);
  const day = copy.getDay(); // 0=Dim, 1=Lun...
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  copy.setDate(copy.getDate() + daysUntilSunday);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function matchesStatusFilter(p: Prospect, f: StatusFilter): boolean {
  switch (f) {
    case "upcoming": return p.status === "scheduled";
    case "done": return p.status === "done";
    case "converted": return p.status === "converted";
    case "cold": return p.status === "cold";
    case "lost_no_show": return p.status === "lost" || p.status === "no_show" || p.status === "cancelled";
    case "all": return true;
  }
}

function groupLabel(dateIso: string, today: Date): string {
  const d = new Date(dateIso);
  const todayStart = startOfDay(today);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const weekEnd = endOfWeek(today);

  const dayStart = startOfDay(d);

  if (dayStart.getTime() === todayStart.getTime()) return "Aujourd'hui";
  if (dayStart.getTime() === tomorrowStart.getTime()) return "Demain";
  if (d < todayStart) return "Passés";
  if (d <= weekEnd) return "Cette semaine";
  return "Plus tard";
}

const GROUP_ORDER = ["Aujourd'hui", "Demain", "Cette semaine", "Plus tard", "Passés"];

const AGENDA_FILTER_KEY = "lorsquad.agenda.filter";

export function AgendaPage() {
  const { prospects, users, currentUser, deleteProspect, updateProspect } = useAppContext();
  const { push: pushToast } = useToast();
  const navigate = useNavigate();

  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("upcoming");
  // Chantier Cold (2026-04-19) : filtre admin par distributeur.
  // "mine" = RDV du user connecté · "all" = toute l'équipe · "<uuid>" = un distri précis
  const [agendaFilter, setAgendaFilter] = useState<string>(() => {
    try {
      return localStorage.getItem(AGENDA_FILTER_KEY) ?? (currentUser?.role === "admin" ? "mine" : "all");
    } catch {
      return currentUser?.role === "admin" ? "mine" : "all";
    }
  });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Prospect | undefined>(undefined);
  const [detailProspect, setDetailProspect] = useState<Prospect | null>(null);

  useEffect(() => {
    try { localStorage.setItem(AGENDA_FILTER_KEY, agendaFilter); } catch { /* ignore */ }
  }, [agendaFilter]);

  const now = new Date();

  // Application du filtre distributeur AVANT les autres filtres.
  // Non-admin : toujours scopé sur son id (RLS s'en charge de toute façon).
  const distributorFiltered = useMemo(() => {
    if (!currentUser) return prospects;
    if (currentUser.role !== "admin") {
      return prospects.filter((p) => p.distributorId === currentUser.id);
    }
    if (agendaFilter === "all") return prospects;
    if (agendaFilter === "mine") return prospects.filter((p) => p.distributorId === currentUser.id);
    return prospects.filter((p) => p.distributorId === agendaFilter);
  }, [prospects, agendaFilter, currentUser]);

  const filtered = useMemo(() => {
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekEnd = endOfWeek(now);

    return distributorFiltered.filter((p) => {
      if (!matchesStatusFilter(p, statusFilter)) return false;

      let d: Date;
      try { d = new Date(p.rdvDate); } catch { return false; }
      if (Number.isNaN(d.getTime())) return false;

      if (dateFilter === "today") return d >= todayStart && d <= todayEnd;
      if (dateFilter === "week")  return d >= todayStart && d <= weekEnd;
      return true; // "all"
    });
  }, [distributorFiltered, statusFilter, dateFilter, now]);

  const grouped = useMemo(() => {
    const map = new Map<string, Prospect[]>();
    filtered.forEach((p) => {
      const g = groupLabel(p.rdvDate, now);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(p);
    });
    // Tri interne par date croissante
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.rdvDate).getTime() - new Date(b.rdvDate).getTime());
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({ label: g, items: map.get(g)! }));
  }, [filtered, now]);

  function ownerName(distributorId: string): string | undefined {
    return users.find((u) => u.id === distributorId)?.name;
  }

  async function handleQuickStatus(prospect: Prospect, nextStatus: ProspectStatus) {
    try {
      await updateProspect(prospect.id, { status: nextStatus });
      pushToast({ tone: "success", title: `Statut → ${PROSPECT_STATUS_LABELS[nextStatus]}` });
      setDetailProspect(null);
    } catch (err) {
      pushToast(buildSupabaseErrorToast(err, "Impossible de mettre à jour le statut."));
    }
  }

  // Chantier Cold : mettre en froid avec date de réchauffement + raison
  async function handleSetCold(prospect: Prospect, coldUntil: string, coldReason: string) {
    try {
      await updateProspect(prospect.id, {
        status: "cold",
        coldUntil,
        coldReason: coldReason.trim() || undefined,
      });
      pushToast({
        tone: "success",
        title: "Prospect en froid 🔥",
        message: `Relance prévue après le ${new Date(coldUntil).toLocaleDateString("fr-FR")}.`,
      });
      setDetailProspect(null);
    } catch (err) {
      pushToast(buildSupabaseErrorToast(err, "Impossible de mettre le prospect en froid."));
    }
  }

  // Réactiver un prospect cold : status → scheduled + cold_until + cold_reason à null
  async function handleReactivate(prospect: Prospect) {
    try {
      await updateProspect(prospect.id, {
        status: "scheduled",
        coldUntil: null as unknown as string,
        coldReason: null as unknown as string,
      });
      pushToast({ tone: "success", title: "Prospect réactivé", message: "Pense à fixer une date de RDV." });
      setDetailProspect(null);
      // Ouvre le form d'édition pour saisir la nouvelle date
      setEditing(prospect);
      setShowForm(true);
    } catch (err) {
      pushToast(buildSupabaseErrorToast(err, "Impossible de réactiver le prospect."));
    }
  }

  async function handleDelete(prospect: Prospect) {
    if (!window.confirm(`Supprimer le RDV avec ${prospect.firstName} ${prospect.lastName} ?`)) return;
    try {
      await deleteProspect(prospect.id);
      pushToast({ tone: "success", title: "RDV supprimé" });
      setDetailProspect(null);
    } catch (err) {
      pushToast(buildSupabaseErrorToast(err, "Impossible de supprimer ce prospect."));
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeading
          eyebrow="Agenda"
          title="Agenda prospection"
          description="RDV prospects à venir, en cours et convertis en clients."
        />
        <Button onClick={() => { setEditing(undefined); setShowForm(true); }}>
          + Nouveau RDV
        </Button>
      </div>

      {/* Dropdown distributeur — admin only */}
      {currentUser?.role === "admin" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ls-text-muted)" strokeWidth="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <label style={{ fontSize: 12, color: "var(--ls-text-muted)", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
            Vue :
          </label>
          <select
            value={agendaFilter}
            onChange={(e) => setAgendaFilter(e.target.value)}
            className="ls-input-time"
            style={{ minWidth: 180, padding: "8px 12px" }}
          >
            <option value="mine">Mes RDV</option>
            <option value="all">Toute l'équipe</option>
            {users.filter((u) => u.active && u.id !== currentUser.id).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · {u.role === "admin" ? "Admin" : u.role === "referent" ? "Référent" : "Distri"}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Filtres */}
      <Card className="space-y-3">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {([
            { key: "today" as DateFilter, label: "Aujourd'hui" },
            { key: "week"  as DateFilter, label: "Cette semaine" },
            { key: "all"   as DateFilter, label: "Tous" },
          ]).map((f) => (
            <FilterPill
              key={f.key}
              label={f.label}
              active={dateFilter === f.key}
              onClick={() => setDateFilter(f.key)}
            />
          ))}
          <div style={{ width: 1, background: "var(--ls-border)", margin: "0 6px" }} />
          {([
            { key: "upcoming"    as StatusFilter, label: "À venir" },
            { key: "done"        as StatusFilter, label: "Effectués" },
            { key: "converted"   as StatusFilter, label: "Convertis" },
            { key: "cold"        as StatusFilter, label: "🔥 Froids" },
            { key: "lost_no_show" as StatusFilter, label: "Perdus/No-show" },
            { key: "all"         as StatusFilter, label: "Tous statuts" },
          ]).map((f) => (
            <FilterPill
              key={f.key}
              label={f.label}
              active={statusFilter === f.key}
              onClick={() => setStatusFilter(f.key)}
            />
          ))}
        </div>
      </Card>

      {/* Liste groupée */}
      {grouped.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>📅</div>
            <div style={{ fontSize: 14, color: "var(--ls-text-muted)", marginBottom: 4 }}>
              Aucun RDV prospection pour l'instant.
            </div>
            <div style={{ fontSize: 12, color: "var(--ls-text-hint)", marginBottom: 16 }}>
              Crée ton premier RDV en cliquant sur « + Nouveau RDV ».
            </div>
            <Button onClick={() => { setEditing(undefined); setShowForm(true); }}>
              + Nouveau RDV
            </Button>
          </div>
        </Card>
      ) : (
        grouped.map(({ label, items }) => (
          <div key={label} className="space-y-2">
            <div style={{ fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500, marginLeft: 4 }}>
              {label} · {items.length} RDV
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((p) => (
                <ProspectCard
                  key={p.id}
                  prospect={p}
                  ownerName={currentUser?.role === "admin" ? ownerName(p.distributorId) : undefined}
                  showDate={label !== "Aujourd'hui" && label !== "Demain"}
                  onClick={(prospect) => setDetailProspect(prospect)}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {/* Form modal */}
      {showForm && (
        <ProspectFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(undefined); }}
          onSaved={() => {
            pushToast({
              tone: "success",
              title: editing ? "RDV mis à jour" : "RDV créé",
            });
          }}
        />
      )}

      {/* Détail prospect */}
      {detailProspect && (
        <ProspectDetailModal
          prospect={detailProspect}
          onClose={() => setDetailProspect(null)}
          onEdit={() => { setEditing(detailProspect); setShowForm(true); setDetailProspect(null); }}
          onStartAssessment={() => navigate(`/assessments/new?prospectId=${detailProspect.id}`)}
          onOpenClient={() => {
            if (detailProspect.convertedClientId) navigate(`/clients/${detailProspect.convertedClientId}`);
          }}
          onChangeStatus={(status) => handleQuickStatus(detailProspect, status)}
          onSetCold={(until, reason) => handleSetCold(detailProspect, until, reason)}
          onReactivate={() => handleReactivate(detailProspect)}
          onDelete={() => handleDelete(detailProspect)}
        />
      )}
    </div>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        fontFamily: "'DM Sans', sans-serif",
        background: active ? "var(--ls-gold)" : "var(--ls-surface2)",
        color: active ? "var(--ls-bg)" : "var(--ls-text-muted)",
        border: active ? "1px solid var(--ls-gold)" : "1px solid var(--ls-border)",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function ProspectDetailModal({
  prospect,
  onClose,
  onEdit,
  onStartAssessment,
  onOpenClient,
  onChangeStatus,
  onSetCold,
  onReactivate,
  onDelete,
}: {
  prospect: Prospect;
  onClose: () => void;
  onEdit: () => void;
  onStartAssessment: () => void;
  onOpenClient: () => void;
  onChangeStatus: (status: ProspectStatus) => void;
  onSetCold: (coldUntil: string, coldReason: string) => void;
  onReactivate: () => void;
  onDelete: () => void;
}) {
  const [showColdForm, setShowColdForm] = useState(false);
  const defaultColdDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 90); // +90 jours par défaut
    return d.toISOString().slice(0, 10);
  })();
  const [coldDate, setColdDate] = useState(defaultColdDate);
  const [coldReason, setColdReason] = useState("");
  const rdvDisplay = (() => {
    try {
      return new Date(prospect.rdvDate).toLocaleString("fr-FR", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return prospect.rdvDate; }
  })();

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.55)", zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--ls-surface)", borderRadius: 14,
          width: "100%", maxWidth: 480, padding: 22,
          border: "1px solid var(--ls-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: "var(--ls-text)" }}>
              {prospect.firstName} {prospect.lastName}
            </div>
            <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 2 }}>
              {rdvDisplay}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{ background: "transparent", border: "none", color: "var(--ls-text-muted)", fontSize: 22, cursor: "pointer", padding: 4, lineHeight: 1 }}
          >×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {prospect.phone && <InfoRow label="Téléphone" value={prospect.phone} />}
          {prospect.email && <InfoRow label="Email" value={prospect.email} />}
          <InfoRow label="Source" value={`${prospect.source}${prospect.sourceDetail ? ` · ${prospect.sourceDetail}` : ""}`} />
          <InfoRow label="Statut" value={`${prospect.status === "cold" ? "🔥 " : ""}${PROSPECT_STATUS_LABELS[prospect.status]}`} />
          {prospect.note && (
            <div style={{ padding: 12, borderRadius: 10, background: "var(--ls-surface2)", border: "1px solid var(--ls-border)" }}>
              <div style={{ fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500, marginBottom: 4 }}>Note</div>
              <div style={{ fontSize: 13, color: "var(--ls-text)", lineHeight: 1.5 }}>{prospect.note}</div>
            </div>
          )}
          {/* Chantier Cold : affichage de la date de réchauffement + raison */}
          {prospect.status === "cold" && (
            <div style={{ padding: 12, borderRadius: 10, background: "color-mix(in srgb, var(--ls-gold) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--ls-gold) 25%, transparent)" }}>
              <div style={{ fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "var(--ls-gold)", fontWeight: 600, marginBottom: 4 }}>
                🔥 En froid
              </div>
              {prospect.coldUntil && (
                <div style={{ fontSize: 13, color: "var(--ls-text)", marginBottom: 4 }}>
                  Relance prévue après le {new Date(prospect.coldUntil).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                </div>
              )}
              {prospect.coldReason && (
                <div style={{ fontSize: 12, color: "var(--ls-text-muted)", lineHeight: 1.5, fontStyle: "italic" }}>
                  « {prospect.coldReason} »
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions primaires selon statut */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          {prospect.status === "scheduled" && (
            <Button onClick={onStartAssessment} className="flex-1">
              Commencer son bilan
            </Button>
          )}
          {prospect.status === "done" && (
            <Button onClick={onStartAssessment} className="flex-1">
              Convertir en client
            </Button>
          )}
          {prospect.status === "converted" && prospect.convertedClientId && (
            <Button onClick={onOpenClient} className="flex-1">
              Ouvrir la fiche client →
            </Button>
          )}
          {prospect.status === "cold" && (
            <Button onClick={onReactivate} className="flex-1">
              Planifier un RDV →
            </Button>
          )}
        </div>

        {/* Mini-formulaire "Mettre en froid" */}
        {showColdForm && (
          <div style={{
            marginTop: 12, padding: 14, borderRadius: 10,
            background: "color-mix(in srgb, var(--ls-gold) 6%, transparent)",
            border: "1px solid color-mix(in srgb, var(--ls-gold) 25%, transparent)",
          }}>
            <div style={{ fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", color: "var(--ls-gold)", fontWeight: 600, marginBottom: 10 }}>
              🔥 Passer en froid
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--ls-text-muted)", marginBottom: 6, fontWeight: 500 }}>
                  Réchauffer à partir du
                </label>
                <input
                  type="date"
                  value={coldDate}
                  onChange={(e) => setColdDate(e.target.value)}
                  className="ls-input-time"
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--ls-text-muted)", marginBottom: 6, fontWeight: 500 }}>
                  Raison / contexte (facultatif)
                </label>
                <textarea
                  value={coldReason}
                  onChange={(e) => setColdReason(e.target.value)}
                  rows={2}
                  placeholder="Ex : Budget serré, relancer en septembre"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1.5px solid var(--ls-border)",
                    background: "var(--ls-surface)",
                    color: "var(--ls-text)",
                    fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif",
                    outline: "none",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowColdForm(false)}
                  style={{ padding: "7px 14px", borderRadius: 9, border: "1px solid var(--ls-border)", background: "transparent", color: "var(--ls-text-muted)", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const iso = new Date(coldDate + "T09:00:00").toISOString();
                    onSetCold(iso, coldReason);
                  }}
                  style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: "var(--ls-gold)", color: "var(--ls-bg)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Changement de statut rapide */}
        {prospect.status !== "converted" && !showColdForm && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, paddingTop: 12, borderTop: "1px solid var(--ls-border)" }}>
            {prospect.status !== "done" && (
              <SmallStatusBtn label="Marquer effectué" onClick={() => onChangeStatus("done")} />
            )}
            {prospect.status !== "no_show" && (
              <SmallStatusBtn label="No-show" onClick={() => onChangeStatus("no_show")} />
            )}
            {prospect.status !== "lost" && (
              <SmallStatusBtn label="Perdu" onClick={() => onChangeStatus("lost")} />
            )}
            {prospect.status !== "cancelled" && (
              <SmallStatusBtn label="Annulé" onClick={() => onChangeStatus("cancelled")} />
            )}
            {prospect.status !== "cold" && (
              <SmallStatusBtn label="🔥 Mettre en froid" onClick={() => setShowColdForm(true)} />
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--ls-border)" }}>
          <button
            type="button"
            onClick={onDelete}
            style={{ background: "transparent", border: "none", color: "var(--ls-coral)", fontSize: 12, cursor: "pointer", padding: "6px 10px" }}
          >
            Supprimer
          </button>
          <Button variant="secondary" onClick={onEdit}>
            Modifier
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13 }}>
      <span style={{ color: "var(--ls-text-muted)" }}>{label}</span>
      <span style={{ color: "var(--ls-text)", fontWeight: 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function SmallStatusBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: 11,
        padding: "5px 10px",
        borderRadius: 8,
        background: "var(--ls-surface2)",
        border: "1px solid var(--ls-border)",
        color: "var(--ls-text-muted)",
        cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {label}
    </button>
  );
}
