import { useMemo } from "react";
import { buildPvTrackingRecords } from "../data/mockPvModule";
import { Card } from "../components/ui/Card";
import { MetricTile } from "../components/ui/MetricTile";
import { PvModuleHeader } from "../components/pv/PvModuleHeader";
import { PvStatusBadge } from "../components/pv/PvStatusBadge";
import { useAppContext } from "../context/AppContext";

export function PvTeamPage() {
  const { currentUser, clients, pvTransactions, pvClientProducts } = useAppContext();

  if (!currentUser || currentUser.role !== "admin") {
    return null;
  }

  const records = useMemo(
    () => buildPvTrackingRecords(clients, pvTransactions, pvClientProducts),
    [clients, pvClientProducts, pvTransactions]
  );
  const pvByDistributor = useMemo(
    () =>
      [...new Map(records.map((record) => [record.responsibleId, { name: record.responsibleName, pv: 0, clients: 0 }])).entries()].map(
        ([id, seed]) => ({
          id,
          name: seed.name,
          pv: Number(records.filter((record) => record.responsibleId === id).reduce((total, record) => total + record.monthlyPv, 0).toFixed(1)),
          clients: records.filter((record) => record.responsibleId === id).length
        })
      ),
    [records]
  );
  const clientsToRelaunch = records.filter((record) => record.status === "follow-up");
  const clientsToWatch = records.filter((record) => record.status === "watch" || record.status === "restock");

  return (
    <div className="space-y-6">
      <PvModuleHeader
        currentUser={currentUser}
        title="Vue equipe"
        description="Pilotage simple des PV du mois, des distributeurs actifs et des clients a reprendre."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="PV du mois"
          value={`${records.reduce((total, record) => total + record.monthlyPv, 0).toFixed(1)} PV`}
          hint="Lecture globale equipe"
          accent="blue"
        />
        <MetricTile
          label="PV par distributeur"
          value={pvByDistributor.length}
          hint="Responsables visibles"
          accent="green"
        />
        <MetricTile
          label="Clients a relancer"
          value={clientsToRelaunch.length}
          hint="Relances a reprendre"
          accent="red"
        />
        <MetricTile
          label="Clients a surveiller"
          value={clientsToWatch.length}
          hint="Conso ou reassort"
          accent="blue"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">Equipe</p>
              <h2 className="mt-3 text-2xl text-white">PV par distributeur</h2>
            </div>
          </div>

          <div className="space-y-3">
            {pvByDistributor.map((row) => (
              <div
                key={row.id}
                className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 md:grid-cols-[1.2fr_0.7fr_0.7fr]"
              >
                <div>
                  <p className="text-lg font-semibold text-white">{row.name}</p>
                  <p className="mt-1 text-sm text-[var(--ls-text-muted)]">{row.clients} clients actifs</p>
                </div>
                <div className="text-sm text-[#B0B4C4]">{row.pv} PV ce mois</div>
                <div className="text-sm text-[#B0B4C4]">{row.clients} dossiers suivis</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="eyebrow-label">Clients</p>
            <h2 className="mt-3 text-2xl text-white">PV par client</h2>
          </div>

          <div className="space-y-3">
            {records
              .slice()
              .sort((left, right) => right.monthlyPv - left.monthlyPv)
              .slice(0, 8)
              .map((record) => (
                <div
                  key={record.clientId}
                  className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 md:grid-cols-[1.2fr_0.7fr_0.7fr]"
                >
                  <div>
                    <p className="text-lg font-semibold text-white">{record.clientName}</p>
                    <p className="mt-1 text-sm text-[var(--ls-text-muted)]">{record.responsibleName}</p>
                  </div>
                  <div className="text-sm font-semibold text-white">{record.monthlyPv} PV</div>
                  <div className="text-sm text-[#B0B4C4]">{record.program}</div>
                </div>
              ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="space-y-4">
          <div>
            <p className="eyebrow-label">Priorites</p>
            <h2 className="mt-3 text-2xl text-white">Clients a relancer</h2>
          </div>
          <div className="space-y-3">
            {clientsToRelaunch.length ? (
              clientsToRelaunch.map((record) => (
                <div
                  key={record.clientId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-white/[0.03] px-4 py-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{record.clientName}</p>
                    <p className="mt-1 text-xs text-[var(--ls-text-muted)]">{record.responsibleName}</p>
                  </div>
                  <PvStatusBadge status={record.status} />
                </div>
              ))
            ) : (
              <div className="rounded-[20px] bg-white/[0.03] px-4 py-4 text-sm text-[var(--ls-text-muted)]">
                Aucune relance en attente pour le moment.
              </div>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="eyebrow-label">Vigilance</p>
            <h2 className="mt-3 text-2xl text-white">Clients a surveiller</h2>
          </div>
          <div className="space-y-3">
            {clientsToWatch.length ? (
              clientsToWatch.map((record) => (
                <div
                  key={record.clientId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-white/[0.03] px-4 py-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{record.clientName}</p>
                    <p className="mt-1 text-xs text-[var(--ls-text-muted)]">
                      {record.estimatedRemainingDays} jours restants - {record.responsibleName}
                    </p>
                  </div>
                  <PvStatusBadge status={record.status} />
                </div>
              ))
            ) : (
              <div className="rounded-[20px] bg-white/[0.03] px-4 py-4 text-sm text-[var(--ls-text-muted)]">
                Rien de sensible a signaler pour l&apos;instant.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
