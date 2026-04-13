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
      hint: "Suivis planifies",
      accent: "green" as const
    },
    {
      label: "Mes relances",
      value: relanceFollowUps.length,
      hint: "Relances urgentes",
      accent: "red" as const
    },
    {
      label: "Dossiers a ouvrir",
      value: actionsToOpen.length,
      hint: "Actions a rouvrir",
      accent: "blue" as const
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Accueil"
        title="Tableau de bord"
        description="Mes rendez-vous, mes relances et mes priorites du moment."
      />

      {showPasswordNotice ? (
        <Card className="surface-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="eyebrow-label">Premier acces</p>
              <p className="mt-3 text-2xl text-white">Mot de passe et acces equipe</p>
              <p className="mt-2 text-sm leading-6 text-[#B0B4C4]">
                Ton mot de passe initial a ete defini par un admin lors de la creation du compte.
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

      <Card className="relative overflow-hidden">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-5">
            <div>
              <p className="eyebrow-label">Vue personnelle</p>
              <h2 className="mt-3 text-[1.5rem] leading-[1.08] tracking-[-0.03em] text-white md:text-[1.85rem] xl:text-[2.05rem]">
                Mes priorites du jour
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#B0B4C4]/88 md:text-[15px]">
                Rendez-vous, relances et dossiers a rouvrir.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {["Bilans", "Rendez-vous", "Relances"].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-[#F0EDE8]"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4 xl:pr-28">
              {statCards.map((stat) => (
                <MetricTile key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} accent={stat.accent} />
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/clients"
                className="inline-flex min-h-[50px] items-center justify-center rounded-[18px] bg-[#C9A84C] text-[#0B0D11] px-5 py-3 text-sm font-semibold text-[#0B0D11] shadow-soft transition duration-200 hover:brightness-[1.03]"
              >
                Base clients
              </Link>
              <Link
                to={`/distributors/${currentUser.id}`}
                className="inline-flex min-h-[50px] items-center justify-center rounded-[18px] bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-white/[0.07]"
              >
                Mon portefeuille
              </Link>
              <Link
                to="/assessments/new"
                className="inline-flex min-h-[50px] items-center justify-center rounded-[18px] bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-white/[0.07]"
              >
                Nouveau bilan
              </Link>
            </div>

            <div className="relative hidden min-h-[500px] overflow-hidden xl:flex xl:items-center xl:justify-center">
              <img
                src={lorSquadLogo}
                alt="Lor'Squad Wellness"
                className="mx-auto w-[720px] max-w-[96%] translate-y-[72px] object-contain"
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
              <p className="eyebrow-label">A reprendre</p>
              <h2 className="mt-3 text-[1.7rem] leading-[1.06] text-white md:text-[1.9rem]">Dossiers a ouvrir</h2>
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
