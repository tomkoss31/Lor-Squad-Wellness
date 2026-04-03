import { useMemo, useState } from "react";
import { buildPvTrackingRecords } from "../data/mockPvModule";
import { formatDate } from "../lib/calculations";
import { Card } from "../components/ui/Card";
import { PvModuleHeader } from "../components/pv/PvModuleHeader";
import { PvClientPanel } from "../components/pv/PvClientPanel";
import { PvStatusBadge } from "../components/pv/PvStatusBadge";
import { useAppContext } from "../context/AppContext";

export function PvClientsPage() {
  const { currentUser, clients, visibleClients, pvTransactions } = useAppContext();
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  if (!currentUser) {
    return null;
  }

  const sourceClients = currentUser.role === "admin" ? clients : visibleClients;
  const records = useMemo(
    () => buildPvTrackingRecords(sourceClients, pvTransactions),
    [pvTransactions, sourceClients]
  );
  const programOptions = useMemo(
    () => [...new Set(records.map((record) => record.program))].sort((left, right) => left.localeCompare(right, "fr")),
    [records]
  );
  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch =
        !normalizedSearch ||
        `${record.clientName} ${record.program} ${record.responsibleName}`.toLowerCase().includes(normalizedSearch);
      const matchesProgram = programFilter === "all" || record.program === programFilter;
      return matchesSearch && matchesProgram;
    });
  }, [programFilter, records, search]);

  const selectedRecord =
    filteredRecords.find((record) => record.clientId === selectedClientId) ??
    filteredRecords[0] ??
    null;

  return (
    <div className="space-y-6">
      <PvModuleHeader
        currentUser={currentUser}
        title="Fiches clients"
        description="Lecture rapide des dossiers PV, des produits actifs et des prochaines commandes probables."
      />

      <Card className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_auto] lg:items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Recherche client</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom du client ou responsable..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Programme</label>
            <select value={programFilter} onChange={(event) => setProgramFilter(event.target.value)}>
              <option value="all">Tous les programmes</option>
              {programOptions.map((program) => (
                <option key={program} value={program}>
                  {program}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-[22px] bg-white/[0.03] px-5 py-4">
            <p className="eyebrow-label">Dossiers</p>
            <p className="mt-2 text-2xl font-semibold text-white">{filteredRecords.length}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_400px]">
        <div className="space-y-4">
          {filteredRecords.map((record) => (
            <button
              type="button"
              key={record.clientId}
              onClick={() => setSelectedClientId(record.clientId)}
              className={`w-full rounded-[28px] text-left transition ${
                selectedRecord?.clientId === record.clientId ? "opacity-100" : "opacity-95 hover:opacity-100"
              }`}
            >
              <Card className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-2xl font-semibold text-white">{record.clientName}</p>
                    <p className="mt-2 text-sm text-slate-400">{record.responsibleName}</p>
                  </div>
                  <PvStatusBadge status={record.status} />
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <ClientFact label="Programme" value={record.program} />
                  <ClientFact label="Demarrage" value={formatDate(record.startDate)} />
                  <ClientFact label="Derniere commande" value={formatDate(record.lastOrderDate)} />
                  <ClientFact label="Reste estime" value={`${record.estimatedRemainingDays} jours`} />
                </div>

                <div className="flex flex-wrap gap-2">
                  {record.activeProducts.map((product) => (
                    <span
                      key={product.id}
                      className="inline-flex items-center rounded-full bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-200"
                    >
                      {product.productName} - {product.estimatedRemainingDays} j
                    </span>
                  ))}
                </div>
              </Card>
            </button>
          ))}
        </div>

        <PvClientPanel record={selectedRecord} title="Fiche client detaillee" />
      </div>
    </div>
  );
}

function ClientFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-slate-950/24 px-4 py-3">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
