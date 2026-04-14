import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { MetricTile } from "../components/ui/MetricTile";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { lorSquadLogo } from "../data/visualContent";
import { formatDateTime } from "../lib/calculations";
import { getPortfolioMetrics } from "../lib/portfolio";

type DashboardFollowUp = {
  id: string;
  clientId: string;
  clientName: string;
  dueDate: string;
  type: string;
  status: "scheduled" | "pending";
  programTitle: string;
};

export function DashboardPage() {
  const { currentUser, users, clients, followUps } = useAppContext();
  const [showPasswordNotice, setShowPasswordNotice] = useState(false);

  if (!currentUser) {
    return null;
  }

  useEffect(() => {
    if (currentUser.role === "admin" || typeof window === "undefined") {
      setShowPasswordNotice(false);
      return;
    }

    const key = `lor-squad-password-notice-dismissed-${currentUser.id}`;
    setShowPasswordNotice(window.localStorage.getItem(key) !== "true");
  }, [currentUser.id, currentUser.role]);

  const personalMetrics = getPortfolioMetrics(currentUser, clients, followUps, users, "personal");
  const scheduledFollowUps = [...personalMetrics.scheduledFollowUps].sort(compareFollowUpsByDueDate);
  const relanceFollowUps = [...personalMetrics.relanceFollowUps].sort(compareFollowUpsByDueDate);
  const actionsToOpen = [...relanceFollowUps, ...scheduledFollowUps].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "pending" ? -1 : 1;
    }

    return compareFollowUpsByDueDate(left, right);
  });

  const statCards = [
    {
      label: "Mes clients",
      value: personalMetrics.clients.length,
      hint: "Portefeuille visible",
      accent: "blue" as const
    },
    {
      label: "Mes rendez-vous",
      value: scheduledFollowUps.length,
      hint: "Suivis planifiés",
      accent: "green" as const
    },
    {
      label: "Mes relances",
      value: relanceFollowUps.length,
      hint: "Relances urgentes",
      accent: "red" as const
    },
    {
      label: "Dossiers à ouvrir",
      value: actionsToOpen.length,
      hint: "Actions à rouvrir",
      accent: "blue" as const
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Accueil"
        title="Tableau de bord"
        description="Mes rendez-vous, mes relances et mes priorités du moment."
      />

      {showPasswordNotice ? (
        <Card className="surface-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="eyebrow-label">Premier acces</p>
              <p className="mt-3 text-2xl text-white">Mot de passe et accès equipe</p>
              <p className="mt-2 text-sm leading-6 text-[#B0B4C4]">
                Ton mot de passe initial a été défini par un admin lors de la création du compte.
                Si tu veux le modifier ou si tu ne l&apos;as pas recu, contacte ton sponsor admin.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const key = `lor-squad-password-notice-dismissed-${currentUser.id}`;
                window.localStorage.setItem(key, "true");
                setShowPasswordNotice(false);
              }}
              className="inline-flex min-h-[46px] items-center justify-center rounded-[18px] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-white/[0.07]"
            >
              Compris
            </button>
          </div>
        </Card>
      ) : null}

      {/* Stats + actions directes */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A84C', boxShadow: '0 0 8px rgba(201,168,76,0.6)' }} className="dot-pulse" />
              <span style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 500 }}>En ligne</span>
            </div>
            <h2 className="text-[1.5rem] leading-[1.08] tracking-[-0.03em] text-white md:text-[1.85rem]" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800 }}>
              Mes priorités du jour
            </h2>
          </div>
          <Link
            to="/assessments/new"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[12px] bg-[#C9A84C] px-4 py-2.5 text-sm font-bold text-[#0B0D11] transition hover:brightness-105"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nouveau bilan
          </Link>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Bilans', 'Rendez-vous', 'Relances'].map(tag => (
            <span key={tag} style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', fontSize: 12, color: '#B0B4C4' }}>{tag}</span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
          {statCards.map((stat) => (
            <MetricTile key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} accent={stat.accent} />
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="/clients" className="inline-flex min-h-[44px] items-center rounded-[12px] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.07]">
            Base clients
          </Link>
          <Link to={`/distributors/${currentUser.id}`} className="inline-flex min-h-[44px] items-center rounded-[12px] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.07]">
            Mon portefeuille
          </Link>
        </div>
      </div>

      <Card className="relative overflow-hidden">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-5">
            <div className="relative hidden min-h-[100px] overflow-hidden xl:flex xl:items-center xl:justify-center">
              <img
                src={lorSquadLogo}
                alt="Lor'Squad Wellness"
                className="mx-auto w-[400px] max-w-[96%] object-contain opacity-[0.12]"
              />
            </div>
          </div>

          <div className="grid gap-4 xl:pt-24">
            <PriorityPanel
              title="Mes rendez-vous"
              items={scheduledFollowUps.slice(0, 5)}
              emptyLabel="Aucun rendez-vous planifie"
              statusLabel="Planifie"
              statusTone="green"
            />
            <PriorityPanel
              title="Relances a faire"
              items={relanceFollowUps.slice(0, 5)}
              emptyLabel="Aucune relance en attente"
              statusLabel="Relance"
              statusTone="amber"
            />
          </div>
        </div>
      </Card>

      {/* Actions du jour — priorités fusionnées */}
      {actionsToOpen.length > 0 && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9A84C', boxShadow: '0 0 8px rgba(201,168,76,0.6)' }} className="dot-pulse" />
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: '#F0EDE8' }}>Actions prioritaires</span>
            </div>
            <span className="text-[11px] text-[#4A5068]">Aujourd'hui</span>
          </div>
          <div className="space-y-1">
            {actionsToOpen.slice(0, 5).map((followUp) => (
              <Link
                key={followUp.id}
                to={`/clients/${followUp.clientId}`}
                className="list-row flex items-center gap-3 rounded-[14px] px-4 py-3"
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: followUp.status === 'scheduled' ? 'rgba(45,212,191,0.1)' : 'rgba(201,168,76,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                }}>
                  {followUp.status === 'scheduled' ? '📅' : '🔔'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#F0EDE8] truncate">{followUp.clientName}</div>
                  <div className="text-[11px] text-[#7A8099] mt-0.5">{followUp.type}</div>
                </div>
                <div className="text-[11px] text-[#4A5068]">{formatDashboardDateTime(followUp.dueDate)}</div>
                <span style={{
                  fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 500,
                  background: followUp.status === 'pending' ? 'rgba(251,113,133,0.1)' : 'rgba(45,212,191,0.1)',
                  color: followUp.status === 'pending' ? '#FB7185' : '#2DD4BF',
                }}>
                  {followUp.status === 'pending' ? 'Urgent' : 'Planifié'}
                </span>
              </Link>
            ))}
          </div>
          {actionsToOpen.length > 5 && (
            <Link to={`/distributors/${currentUser.id}`} className="block text-center text-sm text-[#C9A84C] font-medium">
              Voir les {actionsToOpen.length - 5} autres →
            </Link>
          )}
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">À reprendre</p>
              <h2 className="mt-3 text-[1.7rem] leading-[1.06] text-white md:text-[1.9rem]">Dossiers à ouvrir</h2>
            </div>
            <Link className="text-sm font-medium text-[#7A8099] transition hover:text-[#2DD4BF]" to={`/distributors/${currentUser.id}`}>
              Mon portefeuille
            </Link>
          </div>

          <div className="space-y-3">
            {actionsToOpen.length ? (
              actionsToOpen.slice(0, 4).map((followUp) => (
                <Link
                  key={followUp.id}
                  to={`/clients/${followUp.clientId}`}
                  className="block w-full rounded-[24px] border border-white/6 bg-white/[0.03] p-4 transition duration-200 hover:border-[rgba(45,212,191,0.15)] hover:bg-white/[0.05]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[1.05rem] font-semibold text-white">{followUp.clientName}</p>
                      <p className="mt-1 text-sm text-[#B0B4C4]">{followUp.type}</p>
                    </div>
                    <StatusBadge
                      label={followUp.status === "scheduled" ? "RDV" : "Relance"}
                      tone={followUp.status === "scheduled" ? "green" : "amber"}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span className="text-[#B0B4C4]">{formatDashboardDateTime(followUp.dueDate)}</span>
                    <span className="text-[#4A5068]">{followUp.programTitle}</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-[24px] bg-white/[0.03] p-5 text-sm text-[#7A8099]">
                Aucun dossier a rouvrir pour le moment.
              </div>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">Guide express</p>
              <h2 className="mt-3 text-[1.7rem] leading-[1.06] text-white md:text-[1.9rem]">Rappel terrain</h2>
            </div>
            <Link
              to="/guide"
              className="inline-flex min-h-[46px] items-center justify-center rounded-[18px] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-white/[0.07]"
            >
              Ouvrir le guide
            </Link>
          </div>
          <div className="grid gap-3">
            <GuideTile title="Avant" text="Verifier le client, le suivi prevu et les relances du moment." />
            <GuideTile title="Pendant" text="Rester clair, simple et poser la suite sans surcharger l'echange." />
            <GuideTile title="Apres" text="Rouvrir le dossier si besoin et laisser une trace utile pour la suite." />
          </div>
        </Card>
      </div>
    </div>
  );
}

function PriorityPanel({
  title,
  items,
  emptyLabel,
  statusLabel,
  statusTone
}: {
  title: string;
  items: DashboardFollowUp[];
  emptyLabel: string;
  statusLabel: string;
  statusTone: "green" | "amber";
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow-label">Priorites</p>
          <h2 className="mt-3 text-[1.45rem] leading-[1.06] text-white">{title}</h2>
        </div>
        <StatusBadge label={`${items.length} visibles`} tone="blue" />
      </div>

      <div className="space-y-3">
        {items.length ? (
          items.map((followUp) => (
            <Link
              key={followUp.id}
              to={`/clients/${followUp.clientId}`}
              className="block rounded-[24px] bg-white/[0.03] p-4 transition duration-200 hover:bg-white/[0.05]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[1.05rem] font-semibold text-white">{followUp.clientName}</p>
                  <p className="mt-1 text-sm text-[#B0B4C4]">{followUp.type}</p>
                </div>
                <StatusBadge label={statusLabel} tone={statusTone} />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="text-[#B0B4C4]">{formatDashboardDateTime(followUp.dueDate)}</span>
                <span className="text-[#4A5068]">{followUp.programTitle}</span>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-[24px] bg-white/[0.03] p-5 text-sm text-[#7A8099]">{emptyLabel}</div>
        )}
      </div>
    </Card>
  );
}

function GuideTile({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-white/6 bg-white/[0.03] p-4">
      <p className="text-base font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#7A8099]">{text}</p>
    </div>
  );
}

function compareFollowUpsByDueDate(left: DashboardFollowUp, right: DashboardFollowUp) {
  return getFollowUpTimestamp(left.dueDate) - getFollowUpTimestamp(right.dueDate);
}

function getFollowUpTimestamp(input: string) {
  return new Date(normalizeFollowUpDateTime(input)).getTime();
}

function formatDashboardDateTime(input: string) {
  return formatDateTime(normalizeFollowUpDateTime(input));
}

function normalizeFollowUpDateTime(input: string) {
  return /(?:T|\s)\d{2}:\d{2}/.test(input) ? input : `${input}T09:00`;
}
