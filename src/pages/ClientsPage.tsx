import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import {
  calculateProteinRange,
  calculateWaterNeed,
  formatDate,
  formatDateTime,
  getLatestAssessment,
  getLatestBodyScan
} from "../lib/calculations";

export function ClientsPage() {
  const { visibleClients: clients } = useAppContext();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending" | "follow-up">(
    "all"
  );

  const visibleClients = clients.filter((client) => {
    const matchSearch = `${client.firstName} ${client.lastName} ${client.city ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || client.status === statusFilter;

    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Clients"
        title="Tous les dossiers clients en un coup d'oeil"
        description="La page aide a retrouver vite la bonne personne, relire l'essentiel et rouvrir le bon dossier sans casser le rythme."
      />

      <Card className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Rechercher un client</label>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nom, prenom ou ville..."
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
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Resultats</p>
            <p className="mt-2 text-3xl font-semibold text-white">{visibleClients.length}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4">
        {visibleClients.length ? (
          visibleClients.map((client) => {
            const latestAssessment = getLatestAssessment(client);
            const latestBodyScan = getLatestBodyScan(client);

            return (
              <Link key={client.id} to={`/clients/${client.id}`}>
                <Card className="transition hover:border-amber-300/20 hover:bg-white/[0.07]">
                  <div className="grid gap-4 xl:grid-cols-[1.1fr_1.3fr_0.8fr] xl:items-center">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-2xl font-semibold text-white">
                          {client.firstName} {client.lastName}
                        </p>
                        <StatusBadge
                          label={
                            client.status === "active"
                              ? "Actif"
                              : client.status === "pending"
                                ? "En attente"
                                : "Suivi"
                          }
                          tone={
                            client.status === "active"
                              ? "green"
                              : client.status === "pending"
                                ? "amber"
                                : "blue"
                          }
                        />
                      </div>
                      <p className="text-sm text-slate-400">
                        {client.job} - {client.city ?? "Ville non renseignee"} - {client.distributorName}
                      </p>
                      <p className="text-sm leading-6 text-slate-300">{client.notes}</p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-[22px] border border-white/10 bg-slate-950/40 p-4">
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Programme</p>
                        <p className="mt-3 text-lg font-semibold text-white">{client.currentProgram}</p>
                        <p className="mt-2 text-xs text-slate-400">
                          {latestAssessment.type === "initial" ? "Bilan initial" : "Dernier suivi"}
                        </p>
                      </div>
                      <div className="rounded-[22px] border border-white/10 bg-slate-950/40 p-4">
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                          Hydratation cible
                        </p>
                        <p className="mt-3 text-lg font-semibold text-white">
                          {calculateWaterNeed(latestBodyScan.weight)} L
                        </p>
                      </div>
                      <div className="rounded-[22px] border border-white/10 bg-slate-950/40 p-4">
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                          Repere proteines
                        </p>
                        <p className="mt-3 text-lg font-semibold text-white">
                          {calculateProteinRange(latestBodyScan.weight, client.objective)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 xl:text-right">
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                        Prochain suivi
                      </p>
                      <p className="text-xl font-semibold text-white">{formatDateTime(client.nextFollowUp)}</p>
                      <p className="text-sm text-slate-400">
                        Dernier bilan {formatDate(latestAssessment.date)}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })
        ) : (
          <Card className="space-y-3">
            <p className="text-2xl text-white">Aucun client pour le moment</p>
            <p className="text-sm leading-6 text-slate-400">
              Demarre un premier bilan pour creer un dossier client, puis tu retrouveras ici tous
              les suivis et les fiches.
            </p>
            <div>
              <Link
                to="/assessments/new"
                className="inline-flex rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
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
