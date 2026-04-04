import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { MetricTile } from "../components/ui/MetricTile";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { blasonLogo, lorSquadLogo } from "../data/visualContent";
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
              <p className="mt-3 text-2xl text-white">Mot de passe et acces equipe</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Ton mot de passe initial a ete defini par un admin lors de la creation du compte.
                Si tu veux le modifier ou si tu ne l'as pas recu, contacte ton sponsor admin.
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
        <div className="absolute -right-10 -top-8 hidden h-44 w-44 rounded-full bg-[rgba(89,183,255,0.10)] blur-3xl xl:block" />
        <div className="absolute right-8 top-7 hidden xl:block">
          <div className="relative flex h-[132px] w-[268px] items-center justify-center overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))]">
            <img
              src={lorSquadLogo}
              alt="Lor'Squad Wellness"
              className="w-[186px] object-contain opacity-[0.22] saturate-[0.92]"
            />
            <img
              src={blasonLogo}
              alt=""
              className="pointer-events-none absolute -right-4 -bottom-6 h-24 w-24 rounded-[28px] object-cover opacity-[0.14]"
            />
          </div>
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-5">
            <div>
              <p className="eyebrow-label">Vue personnelle</p>
              <h2 className="mt-3 text-[1.85rem] leading-[1.04] tracking-[-0.03em] text-white md:text-[2.05rem]">
                Mes priorités du jour
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300/88 md:text-[15px]">
                Rendez-vous, relances, dossiers à rouvrir et charge immédiate.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {["Bilans", "Rendez-vous", "Relances"].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-slate-200"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 xl:pr-28">
              {statCards.map((stat) => (
                <MetricTile key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} accent={stat.accent} />
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

          <div className="grid gap-4 xl:pt-24">
            <PriorityPanel
              title="Mes rendez-vous"
              items={scheduledFollowUps.slice(0, 5)}
              emptyLabel="Aucun rendez-vous planifié"
              statusLabel="Planifié"
              statusTone="green"
            />
            <PriorityPanel
              title="Relances à faire"
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
              <p className="eyebrow-label">À reprendre</p>
              <h2 className="mt-3 text-[1.7rem] leading-[1.06] text-white md:text-[1.9rem]">Dossiers à ouvrir</h2>
            </div>
            <Link className="text-sm font-medium text-slate-400 transition hover:text-sky-200" to={`/distributors/${currentUser.id}`}>
              Mon portefeuille
            </Link>
          </div>

          <div className="space-y-3">
            {actionsToOpen.length ? (
              actionsToOpen.slice(0, 4).map((followUp) => (
                <Link
                  key={followUp.id}
                  to={`/clients/${followUp.clientId}`}
                  className="rounded-[24px] border border-white/6 bg-white/[0.03] p-4 transition duration-200 hover:border-sky-300/14 hover:bg-white/[0.05]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[1.05rem] font-semibold text-white">{followUp.clientName}</p>
                      <p className="mt-1 text-sm text-slate-300">{followUp.type}</p>
                    </div>
                    <StatusBadge label={followUp.status === "scheduled" ? "RDV" : "Relance"} tone={followUp.status === "scheduled" ? "green" : "amber"} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span className="text-slate-300">{formatDashboardDateTime(followUp.dueDate)}</span>
                    <span className="text-slate-500">{followUp.programTitle}</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-[24px] bg-white/[0.03] p-5 text-sm text-slate-400">
                Aucun dossier à rouvrir pour le moment.
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
            <GuideTile title="Avant" text="Vérifier le client, le suivi prévu et les relances du moment." />
            <GuideTile title="Pendant" text="Rester clair, simple et poser la suite sans surcharger l’échange." />
            <GuideTile title="Après" text="Rouvrir le dossier si besoin et laisser une trace utile pour la suite." />
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
          <p className="eyebrow-label">Priorités</p>
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
          <div className="rounded-[24px] bg-white/[0.03] p-5 text-sm text-slate-400">{emptyLabel}</div>
        )}
      </div>
    </Card>
  );
}

function GuideTile({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-white/6 bg-white/[0.03] p-4">
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
      hint: `${actionsCount} actions à traiter`,
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
    label: "Légère",
    hint: actionsCount ? `${actionsCount} action à ouvrir` : "Aucune action urgente",
    accent: "green"
  };
}

void getLoadState;

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
