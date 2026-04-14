import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DistributorBadge } from "../components/client/DistributorBadge";
import { Card } from "../components/ui/Card";
import { MetricTile } from "../components/ui/MetricTile";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { getAccessibleOwnerIds } from "../lib/auth";
import {
  getActivePortfolioUsers,
  getGroupedClientsByMonth,
  getPortfolioOwnerIds,
  getPortfolioMetrics,
  isRelanceFollowUp
} from "../lib/portfolio";
import {
  calculateProteinRange,
  calculateWaterNeed,
  formatDate,
  formatDateTime,
  getFirstAssessment,
  getLatestAssessment,
  getLatestBodyScan
} from "../lib/calculations";

const statusLabels = {
  active: { label: "Actif", tone: "green" as const },
  pending: { label: "En attente", tone: "amber" as const },
  "follow-up": { label: "Suivi", tone: "blue" as const }
};

export function ClientsPage() {
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
  const [ownerFilter, setOwnerFilter] = useState("all");
  const deferredSearch = useDeferredValue(search);

  const portfolioUsers = useMemo(
    () => getActivePortfolioUsers(users, visibleClients, currentUser),
    [currentUser, users, visibleClients]
  );
  const ownerTabs = currentUser
    ? portfolioUsers.filter((user) => getAccessibleOwnerIds(currentUser, users).has(user.id))
    : [];
  const selectedOwner =
    ownerFilter === "all"
      ? null
      : ownerTabs.find((user) => user.id === ownerFilter) ?? null;
  const selectedOwnerIds =
    selectedOwner && currentUser
      ? getPortfolioOwnerIds(
          selectedOwner,
          users,
          selectedOwner.role === "referent" ? "network" : "personal"
        )
      : null;
  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const filteredClients = useMemo(() => {
    return visibleClients.filter((client) => {
      const firstAssessment = getFirstAssessment(client);
      const matchesOwner =
        ownerFilter === "all" || (selectedOwnerIds ? selectedOwnerIds.has(client.distributorId) : false);
      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
      const matchesSearch =
        !normalizedSearch ||
        `${client.firstName} ${client.lastName} ${client.city ?? ""} ${client.currentProgram} ${firstAssessment.questionnaire.referredByName ?? ""}`
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesOwner && matchesStatus && matchesSearch;
    });
  }, [normalizedSearch, ownerFilter, selectedOwnerIds, statusFilter, visibleClients]);
  const groupedClients = useMemo(
    () => getGroupedClientsByMonth(filteredClients),
    [filteredClients]
  );
  const selectedOwnerMetrics = selectedOwner
    ? getPortfolioMetrics(
        selectedOwner,
        visibleClients,
        visibleFollowUps,
        users,
        selectedOwner.role === "referent" ? "network" : "personal"
      )
    : null;
  const visibleRelanceCount = selectedOwnerMetrics
    ? selectedOwnerMetrics.relanceFollowUps.length
    : visibleFollowUps.filter((followUp) => isRelanceFollowUp(followUp)).length;

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Clients"
        title="Base clients"
        description="Recherche, responsables, statuts et arborescence mensuelle."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricTile
          label="Clients visibles"
          value={filteredClients.length}
          hint="Résultat du filtre"
          accent="blue"
        />
        <MetricTile
          label="Responsables visibles"
          value={ownerTabs.length}
          hint="Portefeuilles actifs"
          accent="green"
        />
        <MetricTile
          label="Relances visibles"
          value={visibleRelanceCount}
          hint="À reprendre"
          accent="red"
        />
      </div>

      <Card className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr] lg:items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#B0B4C4]">Rechercher un client</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom, ville ou programme..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#B0B4C4]">Filtrer par statut</label>
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
        </div>

        <div className="space-y-3">
          <p className="eyebrow-label">Responsables du dossier</p>
          <div className="flex gap-3 overflow-x-auto pb-1 flex-nowrap" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
            <button
              type="button"
              onClick={() => setOwnerFilter("all")}
              className={`rounded-[22px] px-4 py-3 text-left transition flex-shrink-0 ${
                ownerFilter === "all"
                  ? "bg-[rgba(201,168,76,0.12)] text-white shadow-[0_0_0_1px_rgba(201,168,76,0.16)]"
                  : "bg-white/[0.03] text-white hover:bg-white/[0.05]"
              }`}
            >
              <span className="block text-sm font-semibold">Toute la base</span>
              <span
                className={`mt-1 block text-xs ${
                  ownerFilter === "all" ? "text-[#2DD4BF]/75" : "text-[#7A8099]"
                }`}
              >
                {visibleClients.length} dossiers visibles
              </span>
            </button>

            {ownerTabs.map((user) => {
              const metrics = getPortfolioMetrics(
                user,
                visibleClients,
                visibleFollowUps,
                users,
                user.role === "referent" ? "network" : "personal"
              );
              const isActive = ownerFilter === user.id;

              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setOwnerFilter(user.id)}
                  className={`rounded-[22px] px-4 py-3 text-left transition ${
                    isActive
                      ? "bg-[rgba(45,212,191,0.12)] text-white shadow-[0_0_0_1px_rgba(201,168,76,0.16)]"
                      : "bg-white/[0.03] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <DistributorBadge user={user} compact />
                    <div>
                      <span
                        className={`block text-sm font-semibold ${
                          isActive ? "text-white" : "text-white"
                        }`}
                      >
                        {user.name}
                      </span>
                      <span
                        className={`mt-1 block text-xs ${
                          isActive ? "text-[#2DD4BF]/75" : "text-[#7A8099]"
                        }`}
                      >
                        {metrics.clients.length} clients - {metrics.relanceFollowUps.length} relances
                      </span>
                      {user.role === "referent" ? (
                        <span className="mt-1 block text-[11px] text-[#4A5068]">Vue equipe</span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {selectedOwner ? (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <DistributorBadge
              user={selectedOwner}
              detail={`${selectedOwnerMetrics?.clients.length ?? 0} clients - ${selectedOwnerMetrics?.relanceFollowUps.length ?? 0} relances`}
            />
            <Link
              to={`/distributors/${selectedOwner.id}`}
              className="inline-flex min-h-[48px] items-center justify-center rounded-[18px] bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.07]"
            >
              Ouvrir le portefeuille
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <MiniFact
              label="Clients"
              value={`${selectedOwnerMetrics?.clients.length ?? 0} dossiers`}
            />
            <MiniFact
              label="Rendez-vous"
              value={`${selectedOwnerMetrics?.scheduledFollowUps.length ?? 0} planifiés`}
            />
            <MiniFact
              label="Relances"
              value={`${selectedOwnerMetrics?.relanceFollowUps.length ?? 0} à reprendre`}
            />
          </div>
        </Card>
      ) : null}

      <div className="space-y-5">
        {groupedClients.length ? (
          groupedClients.map((group) => (
            <Card key={group.key} className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                  <p className="eyebrow-label">Arborescence mensuelle</p>
                  <h2 className="mt-3 text-2xl text-white">{group.label}</h2>
                  </div>
                  <StatusBadge label={`${group.clients.length} clients`} tone="blue" />
                </div>

              <div className="grid gap-4">
                {group.clients.map((client) => {
                  const latestAssessment = getLatestAssessment(client);
                  const firstAssessment = getFirstAssessment(client);
                  const latestBodyScan = getLatestBodyScan(client);
                  const status = statusLabels[client.status];
                  const owner = ownerTabs.find((user) => user.id === client.distributorId);

                  return (
                    <Link key={client.id} to={`/clients/${client.id}`}>
                      <Card className="transition hover:bg-white/[0.07]">
                        <div className="grid gap-4 xl:grid-cols-[1.2fr_1.15fr_0.85fr] xl:items-center">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <p className="text-2xl font-semibold text-white">
                                {client.firstName} {client.lastName}
                              </p>
                              <StatusBadge label={status.label} tone={status.tone} />
                            </div>
                            <p className="text-sm text-[#7A8099]">
                              {client.job} - {client.city ?? "Ville non renseignee"}
                            </p>
                            {owner ? (
                              <div className="inline-flex max-w-full">
                                <DistributorBadge
                                  user={owner}
                                  detail={`Portefeuille ${owner.name}`}
                                />
                              </div>
                            ) : null}
                            {firstAssessment.questionnaire.referredByName ? (
                              <p className="text-sm text-[#2DD4BF]/80">
                                Invite par {firstAssessment.questionnaire.referredByName}
                              </p>
                            ) : null}
                            <p className="text-sm leading-6 text-[#7A8099]">{client.notes}</p>
                          </div>

                          <div className="grid gap-3 md:grid-cols-3">
                            <ClientMetric
                              label="Programme"
                              value={client.currentProgram || "Programme a confirmer"}
                              note={
                                latestAssessment.type === "initial"
                                  ? "Bilan initial"
                                  : "Dernier suivi"
                              }
                            />
                            <ClientMetric
                              label="Hydratation cible"
                              value={`${calculateWaterNeed(latestBodyScan.weight)} L`}
                            />
                            <ClientMetric
                              label="Repère protéines"
                              value={calculateProteinRange(latestBodyScan.weight, client.objective)}
                            />
                          </div>

                          <div className="space-y-3 xl:text-right">
                            <p className="eyebrow-label">Prochain suivi</p>
                            <p className="text-xl font-semibold text-white">
                              {formatDateTime(client.nextFollowUp)}
                            </p>
                            <p className="text-sm text-[#7A8099]">
                              Dernier bilan {formatDate(latestAssessment.date)}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </Card>
          ))
        ) : (
          <Card className="space-y-3">
            <p className="text-2xl text-white">Aucun client sur ce filtre</p>
            <p className="text-sm leading-6 text-[#7A8099]">
              Ajuste la recherche, le statut ou le portefeuille pour retrouver le bon dossier.
            </p>
            <div>
              <Link
                to="/assessments/new"
                className="inline-flex min-h-[48px] items-center justify-center rounded-[18px] bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.07]"
              >
                Lancer un premier bilan
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] bg-[#0B0D11]/60 px-4 py-4">
      <p className="text-[11px] font-medium text-[#4A5068]">{label}</p>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function ClientMetric({
  label,
  value,
  note
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-[22px] bg-slate-950/30 p-4">
      <p className="text-[11px] font-medium text-[#4A5068]">{label}</p>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
      {note ? <p className="mt-2 text-xs text-[#7A8099]">{note}</p> : null}
    </div>
  );
}
