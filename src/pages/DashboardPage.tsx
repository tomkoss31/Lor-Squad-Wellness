import { Link } from "react-router-dom";
import { DistributorBadge } from "../components/client/DistributorBadge";
import { Card } from "../components/ui/Card";
import { MetricTile } from "../components/ui/MetricTile";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { getAccessSummary } from "../lib/auth";
import {
  getActivePortfolioUsers,
  getPortfolioIdentity,
  getPortfolioMetrics,
  isRelanceFollowUp
} from "../lib/portfolio";
import { formatDateTime } from "../lib/calculations";

export function DashboardPage() {
  const {
    currentUser,
    visibleClients,
    visibleFollowUps,
    users,
    storageMode
  } = useAppContext();

  if (!currentUser) {
    return null;
  }

  const portfolioUsers = getActivePortfolioUsers(users, visibleClients);
  const portfolioSummaries = portfolioUsers.map((user) => ({
    user,
    identity: getPortfolioIdentity(user),
    metrics: getPortfolioMetrics(user.id, visibleClients, visibleFollowUps)
  }));
  const scheduledFollowUps = [...visibleFollowUps]
    .filter((followUp) => !isRelanceFollowUp(followUp))
    .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime());
  const relanceFollowUps = [...visibleFollowUps]
    .filter((followUp) => isRelanceFollowUp(followUp))
    .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime());
  const teamTarget = portfolioSummaries.reduce(
    (total, summary) => total + summary.identity.target,
    0
  );
  const coverage = teamTarget
    ? Math.round((visibleClients.length / teamTarget) * 100)
    : 0;

  const statCards = [
    {
      label: currentUser.role === "admin" ? "Clients visibles" : "Mes clients",
      value: visibleClients.length,
      hint: "Portefeuille visible",
      accent: "blue" as const
    },
    {
      label: currentUser.role === "admin" ? "Rendez-vous" : "Mes rendez-vous",
      value: scheduledFollowUps.length,
      hint: "Suivis planifies",
      accent: "green" as const
    },
    {
      label: currentUser.role === "admin" ? "Relances" : "Mes relances",
      value: relanceFollowUps.length,
      hint: "Relances urgentes",
      accent: "red" as const
    },
    {
      label: currentUser.role === "admin" ? "Capacite active" : "Charge active",
      value:
        currentUser.role === "admin"
          ? `${visibleClients.length} / ${teamTarget || 0}`
          : `${visibleClients.length}`,
      hint:
        currentUser.role === "admin"
          ? `${coverage}% cible`
          : "Dossiers visibles",
      accent: "blue" as const
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Dashboard"
        title="Tableau de bord"
        description="Rendez-vous, relances, charge et suivi d'equipe en un coup d'oeil."
      />

      <Card className="overflow-hidden">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-5">
            <div>
              <p className="eyebrow-label">Priorites du jour</p>
              <h2 className="mt-3 text-[1.85rem] leading-[1.04] tracking-[-0.03em] text-white md:text-[2.05rem]">
                {currentUser.role === "admin" ? "Vue d'ensemble de l'activite" : "Mes actions a ouvrir"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300/88 md:text-[15px]">
                {currentUser.role === "admin"
                  ? "Rendez-vous, relances et charge equipe."
                  : "Clients a revoir, rendez-vous et relances."}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {statCards.map((stat) => (
                <MetricTile
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  hint={stat.hint}
                  accent={stat.accent}
                />
              ))}
            </div>

            <div className="surface-soft rounded-[24px] px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="eyebrow-label">Stockage</p>
                  <p className="mt-2 text-sm text-slate-300">
                    {storageMode === "supabase"
                      ? "Supabase adapte a 1000+ clients."
                      : "Mode demo local. Supabase recommande pour 1000+ clients."}
                  </p>
                </div>
                <p className="text-xs text-slate-400">{getAccessSummary(currentUser)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/clients"
                className="inline-flex min-h-[50px] items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,#6AC0FF_0%,#59B7FF_100%)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-soft transition duration-200 hover:brightness-[1.03]"
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
          </div>

          <div className="grid gap-4">
            <PriorityPanel
              title="Rendez-vous a venir"
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

      {currentUser.role === "admin" ? (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">Equipe</p>
              <h2 className="mt-3 text-[1.7rem] leading-[1.06] text-white md:text-[1.9rem]">
                Portefeuilles responsables
              </h2>
            </div>
            <StatusBadge label={`${portfolioSummaries.length} portefeuilles`} tone="blue" />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {portfolioSummaries.map((summary) => {
              const load = Math.round(
                (summary.metrics.clients.length / Math.max(summary.identity.target, 1)) * 100
              );

              return (
                <Link
                  key={summary.user.id}
                  to={`/distributors/${summary.user.id}`}
                  className="rounded-[28px] bg-white/[0.03] p-5 transition duration-200 hover:bg-white/[0.05]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <DistributorBadge
                      user={summary.user}
                      detail={`${summary.metrics.clients.length} clients`}
                    />
                    <StatusBadge
                      label={
                        summary.metrics.relanceFollowUps.length
                          ? `${summary.metrics.relanceFollowUps.length} relances`
                          : "0 relance"
                      }
                      tone={summary.metrics.relanceFollowUps.length ? "amber" : "green"}
                    />
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <PortfolioKpi label="Clients" value={String(summary.metrics.clients.length)} />
                    <PortfolioKpi
                      label="RDV"
                      value={String(summary.metrics.scheduledFollowUps.length)}
                    />
                    <PortfolioKpi
                      label="Charge"
                      value={`${load}%`}
                    />
                    <PortfolioKpi
                      label="Cible"
                      value={String(summary.identity.target)}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">A reprendre</p>
              <h2 className="mt-3 text-[1.7rem] leading-[1.06] text-white md:text-[1.9rem]">
                Dossiers a ouvrir
              </h2>
            </div>
            <Link
              className="text-sm font-medium text-slate-400 transition hover:text-sky-200"
              to="/clients"
            >
              Ouvrir la base
            </Link>
          </div>

          <div className="space-y-3">
            {(relanceFollowUps.length ? relanceFollowUps : scheduledFollowUps)
              .slice(0, 4)
              .map((followUp) => (
                <Link
                  key={followUp.id}
                  to={`/clients/${followUp.clientId}`}
                  className="rounded-[24px] bg-white/[0.03] p-4 transition duration-200 hover:bg-white/[0.05]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[1.05rem] font-semibold text-white">
                        {followUp.clientName}
                      </p>
                      <p className="mt-1 text-sm text-slate-300">{followUp.type}</p>
                    </div>
                    <StatusBadge
                      label={followUp.status === "scheduled" ? "RDV" : "Relance"}
                      tone={followUp.status === "scheduled" ? "green" : "amber"}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span className="text-slate-300">{formatDateTime(followUp.dueDate)}</span>
                    <span className="text-slate-500">{followUp.programTitle}</span>
                  </div>
                </Link>
              ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">Guide express</p>
              <h2 className="mt-3 text-[1.7rem] leading-[1.06] text-white md:text-[1.9rem]">
                Rappel terrain
              </h2>
            </div>
            <Link
              to="/guide"
              className="inline-flex min-h-[46px] items-center justify-center rounded-[18px] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-white/[0.07]"
            >
              Ouvrir le guide
            </Link>
          </div>
          <div className="grid gap-3">
            <GuideTile
              title="Avant"
              text="Verifier le client, le suivi prevu et les relances."
            />
            <GuideTile
              title="Pendant"
              text="Rester sur les points utiles et fixer la suite."
            />
            <GuideTile
              title="Apres"
              text="Si besoin, rouvrir le dossier dans les relances."
            />
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
  items: Array<{
    id: string;
    clientId: string;
    clientName: string;
    dueDate: string;
    type: string;
    status: "scheduled" | "pending";
    programTitle: string;
  }>;
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
                  <p className="truncate text-[1.05rem] font-semibold text-white">
                    {followUp.clientName}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">{followUp.type}</p>
                </div>
                <StatusBadge label={statusLabel} tone={statusTone} />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="text-slate-300">{formatDateTime(followUp.dueDate)}</span>
                <span className="text-slate-500">{followUp.programTitle}</span>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-[24px] bg-white/[0.03] p-5 text-sm text-slate-400">
            {emptyLabel}
          </div>
        )}
      </div>
    </Card>
  );
}

function PortfolioKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] bg-slate-950/24 px-4 py-4">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function GuideTile({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[24px] bg-white/[0.03] p-4">
      <p className="text-base font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
}
