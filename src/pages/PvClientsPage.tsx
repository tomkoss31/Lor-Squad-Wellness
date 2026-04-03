import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { buildPvTrackingRecords } from "../data/mockPvModule";
import { formatDate } from "../lib/calculations";
import { Card } from "../components/ui/Card";
import { PvModuleHeader } from "../components/pv/PvModuleHeader";
import { PvClientPanel } from "../components/pv/PvClientPanel";
import { PvStatusBadge } from "../components/pv/PvStatusBadge";
import { useAppContext } from "../context/AppContext";

export function PvClientsPage() {
  const { currentUser, clients, visibleClients, pvTransactions, pvClientProducts } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [responsibleFilter, setResponsibleFilter] = useState(
    currentUser?.role === "admin" ? searchParams.get("responsable") ?? "all" : "all"
  );
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  if (!currentUser) {
    return null;
  }

  const isAdmin = currentUser.role === "admin";
  const sourceClients = isAdmin ? clients : visibleClients;
  const records = useMemo(
    () => buildPvTrackingRecords(sourceClients, pvTransactions, pvClientProducts),
    [pvClientProducts, pvTransactions, sourceClients]
  );
  const programOptions = useMemo(
    () => [...new Set(records.map((record) => record.program))].sort((left, right) => left.localeCompare(right, "fr")),
    [records]
  );
  const responsibleOptions = useMemo(
    () =>
      [...new Map(records.map((record) => [record.responsibleId, record.responsibleName])).entries()].map(
        ([id, name]) => ({ id, name })
      ),
    [records]
  );
  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch =
        !normalizedSearch ||
        `${record.clientName} ${record.program} ${record.responsibleName}`.toLowerCase().includes(normalizedSearch);
      const matchesProgram = programFilter === "all" || record.program === programFilter;
      const matchesResponsible =
        !isAdmin ||
        responsibleFilter === "all" ||
        record.responsibleId === responsibleFilter;
      return matchesSearch && matchesProgram && matchesResponsible;
    });
  }, [isAdmin, programFilter, records, responsibleFilter, search]);

  const groupedRecords = useMemo(() => {
    const groups = new Map<string, { responsibleId: string; responsibleName: string; records: typeof filteredRecords }>();

    filteredRecords.forEach((record) => {
      const existing = groups.get(record.responsibleId);
      if (existing) {
        existing.records.push(record);
        return;
      }

      groups.set(record.responsibleId, {
        responsibleId: record.responsibleId,
        responsibleName: record.responsibleName,
        records: [record]
      });
    });

    return [...groups.values()].sort((left, right) =>
      left.responsibleName.localeCompare(right.responsibleName, "fr")
    );
  }, [filteredRecords]);

  const selectedRecord =
    filteredRecords.find((record) => record.clientId === selectedClientId) ??
    filteredRecords[0] ??
    null;

  useEffect(() => {
    const queryClientId = searchParams.get("client");
    if (queryClientId && filteredRecords.some((record) => record.clientId === queryClientId)) {
      setSelectedClientId(queryClientId);
      return;
    }

    if (!selectedClientId || !filteredRecords.some((record) => record.clientId === selectedClientId)) {
      setSelectedClientId(filteredRecords[0]?.clientId ?? null);
    }
  }, [filteredRecords, searchParams, selectedClientId]);

  function handleResponsibleChange(value: string) {
    setResponsibleFilter(value);

    const nextParams = new URLSearchParams(searchParams);
    if (value === "all") {
      nextParams.delete("responsable");
    } else {
      nextParams.set("responsable", value);
    }
    setSearchParams(nextParams, { replace: true });
  }

  function handleSelectClient(clientId: string, responsibleId: string) {
    setSelectedClientId(clientId);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("client", clientId);
    if (isAdmin) {
      nextParams.set("responsable", responsibleId);
    }
    setSearchParams(nextParams, { replace: true });
  }

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

        {isAdmin ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-300">Par distributeur</p>
            <div className="flex flex-wrap gap-2">
              <ResponsibleFilterChip
                label="Tous"
                count={records.length}
                active={responsibleFilter === "all"}
                onClick={() => handleResponsibleChange("all")}
              />
              {responsibleOptions.map((option) => {
                const count = records.filter((record) => record.responsibleId === option.id).length;
                return (
                  <ResponsibleFilterChip
                    key={option.id}
                    label={option.name}
                    count={count}
                    active={responsibleFilter === option.id}
                    onClick={() => handleResponsibleChange(option.id)}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-5 py-4">
            <p className="eyebrow-label">Vue personnelle</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Cette vue ne montre que les clients du distributeur connecte.
            </p>
          </div>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_400px]">
        <div className="space-y-4">
          {groupedRecords.map((group) => (
            <section key={group.responsibleId} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-5 py-4">
                <div>
                  <p className="eyebrow-label">
                    {isAdmin ? "Distributeur" : "Mes clients"}
                  </p>
                  <p className="mt-2 text-xl text-white">{group.responsibleName}</p>
                </div>
                <div className="rounded-full bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200">
                  {group.records.length} client{group.records.length > 1 ? "s" : ""}
                </div>
              </div>

              {group.records.map((record) => (
                <button
                  type="button"
                  key={record.clientId}
                  onClick={() => handleSelectClient(record.clientId, group.responsibleId)}
                  className={`w-full rounded-[28px] text-left transition ${
                    selectedRecord?.clientId === record.clientId ? "opacity-100" : "opacity-95 hover:opacity-100"
                  }`}
                >
                  <Card
                    className={`space-y-4 ${
                      selectedRecord?.clientId === record.clientId
                        ? "border border-sky-300/18 bg-sky-400/[0.05]"
                        : ""
                    }`}
                  >
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
            </section>
          ))}
        </div>

        <PvClientPanel record={selectedRecord} title="Fiche client detaillee" />
      </div>
    </div>
  );
}

function ResponsibleFilterChip({
  label,
  count,
  active,
  onClick
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-sky-300/18 bg-sky-400/[0.14] text-white"
          : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
      }`}
    >
      <span>{label}</span>
      <span className="rounded-full bg-black/20 px-2 py-0.5 text-[11px]">{count}</span>
    </button>
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
