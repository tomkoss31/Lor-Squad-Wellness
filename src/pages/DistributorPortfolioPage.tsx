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
  getPortfolioMetrics
} from "../lib/portfolio";
import { formatDate, formatDateTime, getFirstAssessment, getLatestAssessment } from "../lib/calculations";

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
    visibleFollowUps
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
  const pendingRecommendationClients = portfolioMetrics.clients.filter((client) => {
    const latestAssessment = getLatestAssessment(client);
    return (
      (latestAssessment.questionnaire.recommendations?.length ?? 0) > 0 &&
      !latestAssessment.questionnaire.recommendationsContacted
    );
  }).length;

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Portefeuille client"
        title={portfolioUser.name}
        description="Clients, rendez-vous, relances et lecture mensuelle du portefeuille."
      />

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <DistributorBadge
                user={portfolioUser}
                detail={`${portfolioMetrics.clients.length} clients`}
              />
              <div>
                <p className="eyebrow-label">Responsable</p>
                <h2 className="mt-3 text-3xl text-white">{portfolioUser.name}</h2>
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
              {pendingRecommendationClients ? (
                <StatusBadge
                  label={`${pendingRecommendationClients} recos a contacter`}
                  tone="amber"
                />
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <MetricTile
              label="Clients suivis"
              value={portfolioMetrics.clients.length}
              hint="Dossiers attribues"
              accent="blue"
            />
            <MetricTile
              label="Rendez-vous"
              value={portfolioMetrics.scheduledFollowUps.length}
              hint="Suivis planifies"
              accent="green"
            />
            <MetricTile
              label="Relances"
              value={portfolioMetrics.relanceFollowUps.length}
              hint="A reprendre"
              accent="red"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/dashboard"
              className="inline-flex min-h-[48px] items-center justify-center rounded-[18px] bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.07]"
            >
              Retour accueil
            </Link>
            <Link
              to="/clients"
              className="inline-flex min-h-[48px] items-center justify-center rounded-[18px] bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.07]"
            >
              Voir la base clients
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

          <div className="surface-soft rounded-[24px] px-5 py-4">
            <p className="eyebrow-label">Resultats</p>
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
                  <p className="eyebrow-label">Arborescence</p>
                  <h2 className="mt-3 text-2xl text-white">{group.label}</h2>
                </div>
                <StatusBadge label={`${group.clients.length} clients`} tone="blue" />
              </div>

              <div className="grid gap-3">
                {group.clients.map((client) => {
                  const firstAssessment = getFirstAssessment(client);
                  const latestAssessment = getLatestAssessment(client);
                  const recommendationCount =
                    latestAssessment.questionnaire.recommendations?.length ?? 0;
                  const recommendationsContacted =
                    latestAssessment.questionnaire.recommendationsContacted ?? false;
                  const status = statusLabels[client.status];

                  return (
                    <Link
                      key={client.id}
                      to={`/clients/${client.id}`}
                      className="rounded-[24px] bg-white/[0.03] p-4 transition hover:bg-white/[0.05]"
                    >
                      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr_0.85fr] xl:items-center">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-xl font-semibold text-white">
                              {client.firstName} {client.lastName}
                            </p>
                            <StatusBadge label={status.label} tone={status.tone} />
                            {recommendationCount ? (
                              <StatusBadge
                                label={
                                  recommendationsContacted
                                    ? "Recommandations contactees"
                                    : "Recommandations a contacter"
                                }
                                tone={recommendationsContacted ? "green" : "amber"}
                              />
                            ) : null}
                          </div>
                          <p className="text-sm text-slate-400">
                            {client.city ?? "Ville non renseignee"} - {client.currentProgram}
                          </p>
                          {firstAssessment.questionnaire.referredByName ? (
                            <p className="text-sm text-sky-100/80">
                              Invite par {firstAssessment.questionnaire.referredByName}
                            </p>
                          ) : null}
                          <p className="text-sm leading-6 text-slate-400">{client.notes}</p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <PortfolioFact label="Demarrage" value={client.startDate ? formatDate(client.startDate) : "En cours de lancement"} />
                          <PortfolioFact label="Prochain suivi" value={formatDateTime(client.nextFollowUp)} />
                        </div>

                        <div className="text-sm text-slate-400 xl:text-right">
                          <p>Bilans : {client.assessments.length}</p>
                          <p className="mt-1">Objectif : {client.objective === "sport" ? "Sport" : "Perte de poids"}</p>
                          {recommendationCount ? (
                            <p className="mt-1">
                              Recos : {recommendationCount} - {recommendationsContacted ? "contactees" : "a reprendre"}
                            </p>
                          ) : null}
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
              className="block rounded-[22px] bg-white/[0.03] p-4 transition hover:bg-white/[0.05]"
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
          <div className="rounded-[22px] bg-white/[0.03] p-5 text-sm text-slate-400">
            {emptyLabel}
          </div>
        )}
      </div>
    </Card>
  );
}

function PortfolioFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-slate-950/24 px-4 py-3">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
