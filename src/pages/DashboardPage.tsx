import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { MetricTile } from "../components/ui/MetricTile";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
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
  const { currentUser, clients, followUps } = useAppContext();

  if (!currentUser) {
    return null;
  }

  const personalMetrics = getPortfolioMetrics(currentUser.id, clients, followUps);
  const scheduledFollowUps = [...personalMetrics.scheduledFollowUps].sort(compareFollowUpsByDueDate);
  const relanceFollowUps = [...personalMetrics.relanceFollowUps].sort(compareFollowUpsByDueDate);
  const actionsToOpen = [...relanceFollowUps, ...scheduledFollowUps].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "pending" ? -1 : 1;
    }

    return compareFollowUpsByDueDate(left, right);
  });
  const activeLoad = getLoadState(actionsToOpen.length);

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
    },
    {
      label: "Ma charge",
      value: activeLoad.label,
      hint: activeLoad.hint,
      accent: activeLoad.accent
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Accueil"
        title="Tableau de bord"
        description="Mes rendez-vous, mes relances et mes priorites du moment."
      />

      <Card className="overflow-hidden">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-5">
            <div>
              <p className="eyebrow-label">Vue personnelle</p>
              <h2 className="mt-3 text-[1.85rem] leading-[1.04] tracking-[-0.03em] text-white md:text-[2.05rem]">
                Mes priorites du jour
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300/88 md:text-[15px]">
                Rendez-vous, relances, dossiers a rouvrir et charge immediate.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
              to={`/distributors/${currentUser.id}`}
            >
              Mon portefeuille
            </Link>
          </div>

          <div className="space-y-3">
            {actionsToOpen.length ? (
              actionsToOpen.slice(0, 4).map((followUp) => (
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
                    <span className="text-slate-300">
                      {formatDashboardDateTime(followUp.dueDate)}
                    </span>
                    <span className="text-slate-500">{followUp.programTitle}</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-[24px] bg-white/[0.03] p-5 text-sm text-slate-400">
                Aucun dossier a rouvrir pour le moment.
              </div>
            )}
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
            <GuideTile title="Avant" text="Verifier le client, le suivi prevu et les relances." />
            <GuideTile title="Pendant" text="Rester sur l'essentiel et fixer la suite." />
            <GuideTile title="Apres" text="Si besoin, rouvrir le dossier dans les relances." />
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
                  <p className="truncate text-[1.05rem] font-semibold text-white">
                    {followUp.clientName}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">{followUp.type}</p>
                </div>
                <StatusBadge label={statusLabel} tone={statusTone} />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="text-slate-300">{formatDashboardDateTime(followUp.dueDate)}</span>
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

function GuideTile({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[24px] bg-white/[0.03] p-4">
      <p className="text-base font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
}

function getLoadState(actionsCount: number): {
  label: string;
  hint: string;
  accent: "blue" | "green" | "red";
} {
  if (actionsCount >= 6) {
    return {
      label: "Dense",
      hint: `${actionsCount} actions a traiter`,
      accent: "red"
    };
  }

  if (actionsCount >= 3) {
    return {
      label: "Stable",
      hint: `${actionsCount} actions en cours`,
      accent: "blue"
    };
  }

  return {
    label: "Legere",
    hint: actionsCount ? `${actionsCount} action a ouvrir` : "Aucune action urgente",
    accent: "green"
  };
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
  return /T\d{2}:\d{2}/.test(input) ? input : `${input}T09:00`;
}
