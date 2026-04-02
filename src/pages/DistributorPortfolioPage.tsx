import { useDeferredValue, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DistributorBadge } from "../components/client/DistributorBadge";
import { Card } from "../components/ui/Card";
import { MetricTile } from "../components/ui/MetricTile";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import {
  getActivePortfolioUsers,
  getGroupedClientsByMonth,
  getPortfolioIdentity,
  getPortfolioMetrics
} from "../lib/portfolio";
import { formatDate, formatDateTime, getFirstAssessment } from "../lib/calculations";

const statusLabels = {
  active: { label: "Actif", tone: "green" as const },
  pending: { label: "En attente", tone: "amber" as const },
  "follow-up": { label: "Suivi", tone: "blue" as const }
};

export function DistributorPortfolioPage() {
  const { distributorId } = useParams();
  const {
    currentUser,
    users,
    visibleClients,
    visibleFollowUps,
    storageMode
  } = useAppContext();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending" | "follow-up">(
    "all"
  );
  const deferredSearch = useDeferredValue(search);

  if (!currentUser || !distributorId) {
    return null;
  }

  const isAuthorized = currentUser.role === "admin" || currentUser.id === distributorId;

  if (!isAuthorized) {
    return (
      <Card>
        <p className="text-lg text-white">Ce portefeuille n&apos;est pas accessible avec cet acces.</p>
      </Card>
    );
  }

  const portfolioUsers = getActivePortfolioUsers(users, visibleClients);
  const portfolioUser =
    portfolioUsers.find((user) => user.id === distributorId) ??
    (currentUser.id === distributorId ? currentUser : null);

  if (!portfolioUser) {
    return (
      <Card>
        <p className="text-lg text-white">Responsable introuvable pour ce portefeuille.</p>
      </Card>
    );
  }

  const portfolioMetrics = getPortfolioMetrics(
    portfolioUser.id,
    visibleClients,
    visibleFollowUps
  );
  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const filteredClients = portfolioMetrics.clients.filter((client) => {
    const firstAssessment = getFirstAssessment(client);
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    const matchesSearch =
      !normalizedSearch ||
        `${client.firstName} ${client.lastName} ${client.city ?? ""} ${client.currentProgram} ${firstAssessment.questionnaire.referredByName ?? ""}`
          .toLowerCase()
          .includes(normalizedSearch);

    return matchesStatus && matchesSearch;
  });
  const groupedClients = getGroupedClientsByMonth(filteredClients);

  const identity = getPortfolioIdentity(portfolioUser);
  const targetProgress = Math.min(
    999,
    Math.round((portfolioMetrics.clients.length / Math.max(identity.target, 1)) * 100)
  );

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Portefeuille client"
        title={`${portfolioUser.name} - clients, rendez-vous et relances`}
        description="La page rassemble les dossiers attribues a cette personne, les rendez-vous deja poses et les relances a reprendre sans melanger les autres portefeuilles."
      />

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <DistributorBadge
                user={portfolioUser}
                detail={`${identity.label} - cible ${identity.target} clients`}
              />
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-slate-500">
                  Responsable
                </p>
                <h2 className="mt-2 text-3xl text-white">{portfolioUser.name}</h2>
                <p className="mt-2 text-sm text-slate-400">{portfolioUser.title}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge
                label={`${portfolioMetrics.clients.length} dossiers`}
                tone="blue"
              />
              <StatusBadge
                label={`${portfolioMetrics.relanceFollowUps.length} relances`}
                tone={portfolioMetrics.relanceFollowUps.length ? "amber" : "green"}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <MetricTile
              label="Clients suivis"
              value={portfolioMetrics.clients.length}
              hint="Dossiers deja attribues"
              accent="blue"
            />
            <MetricTile
              label="Rendez-vous poses"
              value={portfolioMetrics.scheduledFollowUps.length}
              hint="Suivis deja planifies"
              accent="green"
            />
            <MetricTile
              label="Relances"
              value={portfolioMetrics.relanceFollowUps.length}
              hint="A reprendre ou confirmer"
              accent="red"
            />
            <MetricTile
              label="Charge cible"
              value={`${targetProgress}%`}
              hint={`${portfolioMetrics.clients.length} / ${identity.target} dossiers`}
              accent="blue"
            />
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.26em] text-slate-500">
              Lisibilite portefeuille
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Les dossiers sont retrouves par recherche et regroupes par mois de demarrage pour
              rester lisibles quand le volume monte. Cette structure tient deja tres bien pour
              plusieurs centaines de clients, et la base Supabase est la bonne voie pour passer
              sereinement le cap des 1000 dossiers.
            </p>
            <p className="mt-3 text-sm text-slate-400">
              {storageMode === "supabase"
                ? "Base distante active : le portefeuille est pret pour un vrai volume equipe."
                : "Mode local actif : pratique pour la demo, mais il faudra rester sur Supabase pour absorber durablement 1000+ clients."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/dashboard"
              className="inline-flex rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              Retour dashboard
            </Link>
            <Link
              to="/clients"
              className="inline-flex rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              Voir toute la base client
            </Link>
          </div>
        </Card>

        <div className="grid gap-4">
          <FollowUpPanel
            title="Rendez-vous a venir"
            tone="green"
            emptyLabel="Aucun rendez-vous planifie pour le moment"
            items={portfolioMetrics.scheduledFollowUps.slice(0, 5)}
          />
          <FollowUpPanel
            title="Relances a reprendre"
            tone="amber"
            emptyLabel="Aucune relance en attente"
            items={portfolioMetrics.relanceFollowUps.slice(0, 5)}
          />
        </div>
      </div>

      <Card className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.9fr_auto] lg:items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              Rechercher dans le portefeuille
            </label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom, ville ou programme..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Filtrer par statut</label>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as "all" | "active" | "pending" | "follow-up"
                )
              }
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="pending">En attente</option>
              <option value="follow-up">Suivi prioritaire</option>
            </select>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-slate-950/35 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Resultats</p>
            <p className="mt-2 text-3xl font-semibold text-white">{filteredClients.length}</p>
          </div>
        </div>
      </Card>

      <div className="space-y-5">
        {groupedClients.length ? (
          groupedClients.map((group) => (
            <Card key={group.key} className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Arborescence</p>
                  <h2 className="mt-2 text-2xl text-white">{group.label}</h2>
                </div>
                <StatusBadge label={`${group.clients.length} clients`} tone="blue" />
              </div>

              <div className="grid gap-3">
                {group.clients.map((client) => {
                  const firstAssessment = getFirstAssessment(client);
                  const status = statusLabels[client.status];

                  return (
                    <Link
                      key={client.id}
                      to={`/clients/${client.id}`}
                      className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.05]"
                    >
                      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr_0.85fr] xl:items-center">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-xl font-semibold text-white">
                              {client.firstName} {client.lastName}
                            </p>
                            <StatusBadge label={status.label} tone={status.tone} />
                          </div>
                          <p className="text-sm text-slate-400">
                            {client.city ?? "Ville non renseignee"} - {client.currentProgram}
                          </p>
                          {firstAssessment.questionnaire.referredByName ? (
                            <p className="text-sm text-sky-100/80">
                              Invite par {firstAssessment.questionnaire.referredByName}
                            </p>
                          ) : null}
                          <p className="text-sm leading-6 text-slate-300">{client.notes}</p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <PortfolioFact label="Demarrage" value={client.startDate ? formatDate(client.startDate) : "En cours de lancement"} />
                          <PortfolioFact label="Prochain suivi" value={formatDateTime(client.nextFollowUp)} />
                        </div>

                        <div className="text-sm text-slate-400 xl:text-right">
                          <p>Bilans : {client.assessments.length}</p>
                          <p className="mt-1">Objectif : {client.objective === "sport" ? "Sport" : "Perte de poids"}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Card>
          ))
        ) : (
          <Card className="space-y-3">
            <p className="text-2xl text-white">Aucun dossier sur ce filtre</p>
            <p className="text-sm leading-6 text-slate-400">
              Ajuste la recherche ou le statut pour retrouver un dossier plus vite.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

function FollowUpPanel({
  title,
  tone,
  emptyLabel,
  items
}: {
  title: string;
  tone: "green" | "amber";
  emptyLabel: string;
  items: Array<{
    id: string;
    clientId: string;
    clientName: string;
    dueDate: string;
    type: string;
    status: "scheduled" | "pending";
  }>;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Priorites</p>
          <h2 className="mt-2 text-2xl text-white">{title}</h2>
        </div>
        <StatusBadge
          label={`${items.length} visibles`}
          tone={tone === "green" ? "green" : "amber"}
        />
      </div>

      <div className="space-y-3">
        {items.length ? (
          items.map((followUp) => (
            <Link
              key={followUp.id}
              to={`/clients/${followUp.clientId}`}
              className="block rounded-[22px] border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.05]"
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
              <p className="mt-4 text-sm text-slate-300">
                Echeance {formatDateTime(followUp.dueDate)}
              </p>
            </Link>
          ))
        ) : (
          <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm text-slate-400">
            {emptyLabel}
          </div>
        )}
      </div>
    </Card>
  );
}

function PortfolioFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-slate-950/35 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
