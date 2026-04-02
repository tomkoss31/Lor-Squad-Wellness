import { Link } from "react-router-dom";
import { BrandSignature } from "../components/branding/BrandSignature";
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
      label: currentUser.role === "admin" ? "Base client visible" : "Mes clients",
      value: visibleClients.length,
      hint: "Lecture immediate du portefeuille",
      accent: "blue" as const
    },
    {
      label: currentUser.role === "admin" ? "Rendez-vous poses" : "Mes rendez-vous",
      value: scheduledFollowUps.length,
      hint: "Suivis deja cales",
      accent: "green" as const
    },
    {
      label: currentUser.role === "admin" ? "Relances equipe" : "Mes relances",
      value: relanceFollowUps.length,
      hint: "Contacts a reprendre vite",
      accent: "red" as const
    },
    {
      label: currentUser.role === "admin" ? "Vision capacite" : "Charge du moment",
      value: currentUser.role === "admin" ? `${coverage}%` : `${visibleClients.length}`,
      hint:
        currentUser.role === "admin"
          ? `${visibleClients.length} / ${teamTarget || 0} dossiers cibles`
          : "Dossiers visibles a l'ecran",
      accent: "blue" as const
    }
  ];

  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="Dashboard"
        title={
          currentUser.role === "admin"
            ? "Une lecture plus claire de l'equipe, des rendez-vous et des relances"
            : "Mes priorites clients, mes rendez-vous et la suite a poser"
        }
        description="Le dashboard reste direct et efficace, mais avec une respiration plus premium pour retrouver les priorites, ouvrir les portefeuilles et garder une lecture nette quand la base grandit."
      />

      <Card className="overflow-hidden">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6">
            <div>
              <p className="eyebrow-label">Vue du jour</p>
              <h2 className="mt-4 max-w-[12ch] text-balance text-4xl text-white">
                {currentUser.role === "admin"
                  ? "Tu vois tout de suite qui a des rendez-vous, qui doit relancer et ou se situe la charge client."
                  : "Tu retrouves tout de suite les personnes a revoir, les rendez-vous a venir et la suite a poser."}
              </h2>
              <p className="mt-4 max-w-2xl text-[16px] leading-8 text-slate-300/88">
                Une vision plus editoriale, plus calme et plus directe pour piloter la journee.
              </p>
              <div className="mt-5">
                <BrandSignature variant="inline" />
              </div>
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

            <div className="surface-soft rounded-[26px] px-5 py-5">
              <p className="eyebrow-label">Cadre de stockage</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {storageMode === "supabase"
                  ? "Supabase est bien le bon choix pour tenir une base equipe avec plus de 1000 clients, des recherches rapides et des portefeuilles separes."
                  : "Le mode local reste utile pour la demo, mais il ne faut pas le considerer comme la cible pour 1000+ clients. La base distante Supabase est la bonne trajectoire."}
              </p>
              <p className="mt-3 text-sm text-slate-400">{getAccessSummary(currentUser)}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/clients"
                className="inline-flex min-h-[52px] items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,#6AC0FF_0%,#59B7FF_100%)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-soft transition duration-200 hover:brightness-[1.03]"
              >
                Ouvrir la base client
              </Link>
              <Link
                to={`/distributors/${currentUser.id}`}
                className="inline-flex min-h-[52px] items-center justify-center rounded-[18px] bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-white/[0.07]"
              >
                Voir mon portefeuille
              </Link>
              <Link
                to="/assessments/new"
                className="inline-flex min-h-[52px] items-center justify-center rounded-[18px] bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-white/[0.07]"
              >
                Demarrer un bilan
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <PriorityPanel
              title="Rendez-vous a venir"
              tone="green"
              items={scheduledFollowUps.slice(0, 5)}
              emptyLabel="Aucun rendez-vous planifie pour le moment"
            />
            <PriorityPanel
              title="Relances a faire"
              tone="amber"
              items={relanceFollowUps.slice(0, 5)}
              emptyLabel="Aucune relance en attente"
            />
          </div>
        </div>
      </Card>

      {currentUser.role === "admin" ? (
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">Responsables du dossier</p>
              <h2 className="mt-3 max-w-[16ch] text-balance text-3xl text-white">
                Ouvrir Thomas, Melanie, Mendy ou le reste de l&apos;equipe en un clic
              </h2>
            </div>
            <StatusBadge label={`${portfolioSummaries.length} portefeuilles`} tone="blue" />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {portfolioSummaries.map((summary) => (
              <Link
                key={summary.user.id}
                to={`/distributors/${summary.user.id}`}
                className="rounded-[28px] bg-white/[0.03] p-5 transition duration-200 hover:bg-white/[0.05]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <DistributorBadge
                    user={summary.user}
                    detail={`${summary.metrics.clients.length} clients - cible ${summary.identity.target}`}
                  />
                  <StatusBadge
                    label={`${summary.metrics.relanceFollowUps.length} relances`}
                    tone={
                      summary.metrics.relanceFollowUps.length ? "amber" : "green"
                    }
                  />
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <PortfolioKpi
                    label="Clients"
                    value={String(summary.metrics.clients.length)}
                  />
                  <PortfolioKpi
                    label="RDV"
                    value={String(summary.metrics.scheduledFollowUps.length)}
                  />
                  <PortfolioKpi
                    label="Charge"
                    value={`${Math.round(
                      (summary.metrics.clients.length / Math.max(summary.identity.target, 1)) *
                        100
                    )}%`}
                  />
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-400">
                  {summary.identity.label}. Ouvre la page pour retrouver les dossiers par mois, les
                  personnes a relancer et les rendez-vous deja poses.
                </p>
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">Clients a reprendre</p>
              <h2 className="mt-3 text-3xl text-white">Les dossiers a ouvrir en premier</h2>
            </div>
            <Link className="text-sm font-semibold text-sky-300" to="/clients">
              Voir toute la base
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
                    <div>
                      <p className="text-lg font-semibold text-white">{followUp.clientName}</p>
                      <p className="mt-1 text-sm text-slate-400">{followUp.type}</p>
                    </div>
                    <StatusBadge
                      label={followUp.status === "scheduled" ? "RDV" : "Relance"}
                      tone={followUp.status === "scheduled" ? "green" : "amber"}
                    />
                  </div>
                  <p className="mt-4 text-sm text-slate-300">
                    Echeance {formatDateTime(followUp.dueDate)}
                  </p>
                </Link>
              ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">Rappel terrain</p>
              <h2 className="mt-3 text-3xl text-white">Un cadre simple avant chaque bilan</h2>
            </div>
            <Link
              to="/guide"
              className="inline-flex min-h-[52px] items-center justify-center rounded-[18px] bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-white/[0.07]"
            >
              Ouvrir le guide
            </Link>
          </div>
          <div className="grid gap-3">
            <GuideTile
              title="Avant le rendez-vous"
              text="Verifier le client, le suivi prevu et les relances a faire dans la meme zone."
            />
            <GuideTile
              title="Pendant le rendez-vous"
              text="Rester sur les reperes utiles, poser le prochain point et garder une fiche propre."
            />
            <GuideTile
              title="Apres le rendez-vous"
              text="Si un doute reste ouvert, le dossier doit remonter naturellement dans les relances."
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function PriorityPanel({
  title,
  tone,
  items,
  emptyLabel
}: {
  title: string;
  tone: "green" | "amber";
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
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow-label">Priorites</p>
          <h2 className="mt-3 text-2xl text-white">{title}</h2>
        </div>
        <StatusBadge label={`${items.length} visibles`} tone={tone} />
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
                <div>
                  <p className="text-lg font-semibold text-white">{followUp.clientName}</p>
                  <p className="mt-1 text-sm text-slate-400">{followUp.type}</p>
                </div>
                <StatusBadge
                  label={followUp.status === "scheduled" ? "Planifie" : "Relance"}
                  tone={followUp.status === "scheduled" ? "green" : "amber"}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-400">
                <span>{formatDateTime(followUp.dueDate)}</span>
                <span className="text-right">{followUp.programTitle}</span>
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
      <p className="text-lg font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
}
