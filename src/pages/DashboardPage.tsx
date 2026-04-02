import { Link } from "react-router-dom";
import { BrandSignature } from "../components/branding/BrandSignature";
import { Card } from "../components/ui/Card";
import { MetricTile } from "../components/ui/MetricTile";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Button } from "../components/ui/Button";
import { useAppContext } from "../context/AppContext";
import { getAccessSummary } from "../lib/auth";
import { formatDate } from "../lib/calculations";

export function DashboardPage() {
  const { currentUser, logout, visibleClients, visibleFollowUps, users } = useAppContext();

  if (!currentUser) {
    return null;
  }

  const activeDistributors = users.filter((user) => user.role === "distributor" && user.active);

  const statCards = [
    {
      label: currentUser.role === "admin" ? "Clients actifs" : "Mes clients",
      value: visibleClients.length,
      hint: "Lecture rapide du portefeuille en cours",
      accent: "blue" as const
    },
    {
      label: currentUser.role === "admin" ? "Suivis a venir" : "Mes suivis",
      value: visibleFollowUps.length,
      hint: "Rendez-vous a preparer ou confirmer",
      accent: "green" as const
    },
    {
      label: currentUser.role === "admin" ? "Distributeurs actifs" : "Bilans recents",
      value: currentUser.role === "admin" ? activeDistributors.length : visibleClients.length,
      hint:
        currentUser.role === "admin"
          ? "Vue simple de l'activite equipe"
          : "Dossiers a reprendre facilement",
      accent: "red" as const
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Dashboard"
        title={
          currentUser.role === "admin"
            ? "Le bon point de depart pour piloter l'equipe et les rendez-vous"
            : "Le bon point de depart pour reprendre les clients et avancer simplement"
        }
        description="Le dashboard met tout de suite en avant les dossiers a reprendre, les suivis a preparer et le prochain pas a lancer."
      />

      <Card className="overflow-hidden">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Vue du jour
              </p>
              <h2 className="mt-3 text-4xl">
                Une lecture claire pour savoir quoi ouvrir en premier.
              </h2>
              <div className="mt-4">
                <BrandSignature variant="inline" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
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
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Mon acces
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {getAccessSummary(currentUser)}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/assessments/new"
                className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01]"
              >
                Demarrer un bilan
              </Link>
              <Link
                to="/clients"
                className="inline-flex rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
              >
                Ouvrir mes dossiers
              </Link>
              <Button variant="secondary" onClick={logout}>
                Se deconnecter
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            {visibleFollowUps.length ? (
              visibleFollowUps.map((followUp) => (
                <div
                  key={followUp.id}
                  className="rounded-[24px] border border-white/10 bg-slate-950/40 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">{followUp.clientName}</p>
                      <p className="mt-1 text-sm text-slate-400">{followUp.type}</p>
                    </div>
                    <StatusBadge
                      label={followUp.status === "scheduled" ? "Planifie" : "A valider"}
                      tone={followUp.status === "scheduled" ? "green" : "amber"}
                    />
                  </div>
                  <p className="mt-4 text-sm text-slate-300">
                    Rendez-vous prevu le {formatDate(followUp.dueDate)}
                  </p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full ${
                        followUp.status === "scheduled" ? "w-4/5 bg-emerald-400" : "w-1/2 bg-amber-400"
                      }`}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-6">
                <p className="text-lg font-semibold text-white">Aucun suivi pour le moment</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Demarre un premier bilan pour creer un dossier, puis le suivi apparaitra ici.
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                A reprendre aujourd'hui
              </p>
              <h2 className="mt-2 text-3xl">Clients a relire ou a relancer</h2>
            </div>
            <Link className="text-sm font-semibold text-sky-300" to="/clients">
              Voir tout
            </Link>
          </div>
          <div className="space-y-3">
            {visibleClients.length ? (
              visibleClients.slice(0, 3).map((client) => (
                <Link
                  key={client.id}
                  to={`/clients/${client.id}`}
                  className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {client.firstName} {client.lastName}
                      </p>
                      <p className="text-sm text-slate-400">{client.currentProgram}</p>
                    </div>
                    <StatusBadge
                      label={client.objective === "sport" ? "Sport" : "Perte de poids"}
                      tone={client.objective === "sport" ? "green" : "blue"}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-400">
                    <span>Suivi {formatDate(client.nextFollowUp)}</span>
                    <span className="text-right">{client.distributorName}</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-6">
                <p className="text-lg font-semibold text-white">Aucun dossier client pour le moment</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Lance un premier bilan pour creer ton premier client et retrouver ses suivis ici.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Guide rendez-vous</p>
            <h2 className="mt-2 text-3xl text-white">
              Un repere simple pour garder le bon ton avant et pendant le bilan
            </h2>
          </div>
          <Link
            to="/guide"
            className="inline-flex rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Ouvrir le guide
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <p className="text-lg font-semibold text-white">Preparation</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Club pret, materiel pret, bonne energie avant l&apos;arrivee.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <p className="text-lg font-semibold text-white">Accueil</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Sourire, prenom, ambiance cool et pro des la premiere minute.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <p className="text-lg font-semibold text-white">Cadre du rendez-vous</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Comprendre, expliquer, proposer puis fixer la suite simplement.
            </p>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          En pratique
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <p className="text-lg font-semibold text-white">1. Comprendre</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Faire ressortir les habitudes qui comptent vraiment pour le client.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <p className="text-lg font-semibold text-white">2. Expliquer</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              S'appuyer sur des reperes simples pour rendre le plan concret.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <p className="text-lg font-semibold text-white">3. Fixer la suite</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Choisir la suite, poser le prochain rendez-vous et garder un suivi net.
            </p>
          </div>
        </div>
        <div className="pt-1">
          <BrandSignature variant="inline" />
        </div>
      </Card>
    </div>
  );
}
