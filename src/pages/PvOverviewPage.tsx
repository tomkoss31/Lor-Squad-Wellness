import { useEffect, useMemo, useState } from "react";
import { buildPvTrackingRecords, getPvStatusMeta } from "../data/mockPvModule";
import { formatDate } from "../lib/calculations";
import { Card } from "../components/ui/Card";
import { MetricTile } from "../components/ui/MetricTile";
import { PvModuleHeader } from "../components/pv/PvModuleHeader";
import { PvClientPanel } from "../components/pv/PvClientPanel";
import { PvStatusBadge } from "../components/pv/PvStatusBadge";
import { useAppContext } from "../context/AppContext";
import type { PvStatus } from "../types/pv";

export function PvOverviewPage() {
  const { currentUser, clients, visibleClients, pvTransactions, pvClientProducts, storageMode } = useAppContext();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PvStatus>("all");
  const [responsibleFilter, setResponsibleFilter] = useState("all");
  const [programFilter, setProgramFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
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
  const responsibleOptions = useMemo(
    () =>
      [...new Map(records.map((record) => [record.responsibleId, record.responsibleName])).entries()].map(
        ([id, name]) => ({ id, name })
      ),
    [records]
  );
  const defaultResponsibleFilter = useMemo(() => {
    if (!isAdmin) {
      return "all";
    }

    const hasOwnClients = records.some((record) => record.responsibleId === currentUser.id);
    return hasOwnClients ? currentUser.id : "all";
  }, [currentUser.id, isAdmin, records]);
  const programOptions = useMemo(
    () => [...new Set(records.map((record) => record.program))].sort((left, right) => left.localeCompare(right, "fr")),
    [records]
  );

  const filteredRecords = useMemo(
    () =>
      records.filter((record) =>
        matchesPvOverviewFilters(record, {
          search,
          statusFilter,
          responsibleFilter,
          programFilter,
          periodFilter,
          isAdmin
        })
      ),
    [isAdmin, periodFilter, programFilter, records, responsibleFilter, search, statusFilter]
  );

  function handleResponsibleChange(nextResponsibleId: string) {
    setResponsibleFilter(nextResponsibleId);
    const nextVisibleRecords = records.filter((record) =>
      matchesPvOverviewFilters(record, {
        search,
        statusFilter,
        responsibleFilter: nextResponsibleId,
        programFilter,
        periodFilter,
        isAdmin
      })
    );
    setSelectedClientId(nextVisibleRecords[0]?.clientId ?? null);
  }

  function handleSelectClient(clientId: string) {
    setSelectedClientId(clientId);
  }

  useEffect(() => {
    if (isAdmin && responsibleFilter === "all" && defaultResponsibleFilter !== "all") {
      const nextVisibleRecords = records.filter((record) =>
        matchesPvOverviewFilters(record, {
          search,
          statusFilter,
          responsibleFilter: defaultResponsibleFilter,
          programFilter,
          periodFilter,
          isAdmin
        })
      );

      setResponsibleFilter(defaultResponsibleFilter);
      setSelectedClientId(nextVisibleRecords[0]?.clientId ?? null);
    }
  }, [defaultResponsibleFilter, isAdmin, periodFilter, programFilter, records, responsibleFilter, search, statusFilter]);

  useEffect(() => {
    if (!selectedClientId || !filteredRecords.some((record) => record.clientId === selectedClientId)) {
      setSelectedClientId(filteredRecords[0]?.clientId ?? null);
    }
  }, [filteredRecords, selectedClientId]);

  const selectedRecord =
    filteredRecords.find((record) => record.clientId === selectedClientId) ??
    filteredRecords[0] ??
    null;
  const monthPv = filteredRecords.reduce((total, record) => total + record.monthlyPv, 0).toFixed(1);
  const restockCount = filteredRecords.filter((record) => record.status === "restock").length;
  const repriseCount = filteredRecords.reduce(
    (total, record) =>
      total +
      record.transactions.filter(
        (transaction) =>
          transaction.type === "reprise-sur-place" &&
          new Date(transaction.date).getMonth() === new Date().getMonth() &&
          new Date(transaction.date).getFullYear() === new Date().getFullYear()
      ).length,
    0
  );

  return (
    <div className="space-y-6">
      <PvModuleHeader
        currentUser={currentUser}
        title="Suivi PV"
        description="Vue simple des clients, des points volume, des démarrages et des besoins de suivi."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="PV du mois" value={`${monthPv} PV`} hint="Lecture du mois en cours" accent="blue" />
        <MetricTile label="Clients actifs" value={filteredRecords.length} hint="Portefeuille visible" accent="green" />
        <MetricTile label="Réassorts probables" value={restockCount} hint="Produits bientôt à renouveler" accent="red" />
        <MetricTile label="Reprises sur place" value={repriseCount} hint="Mouvements du mois" accent="blue" />
      </div>

      <Card className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-[1.25fr_repeat(3,minmax(0,0.8fr))]">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#B0B4C4]">Recherche client</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom, programme ou responsable..."
            />
          </div>

          <ToolbarSelect
            label="Statut"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as "all" | PvStatus)}
            options={[
              { value: "all", label: "Tous les statuts" },
              { value: "ok", label: "RAS" },
              { value: "watch", label: "À surveiller" },
              { value: "restock", label: "Réassort probable" },
              { value: "inconsistent", label: "Incohérence conso" },
              { value: "follow-up", label: "À relancer" }
            ]}
          />

          {isAdmin ? (
            <ToolbarSelect
              label="Responsable"
              value={responsibleFilter}
              onChange={setResponsibleFilter}
              options={[
                { value: "all", label: "Tous les responsables" },
                ...responsibleOptions.map((option) => ({ value: option.id, label: option.name }))
              ]}
            />
          ) : (
            <ToolbarInfo label="Responsable" value={currentUser.name} />
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <ToolbarSelect
              label="Programme"
              value={programFilter}
              onChange={setProgramFilter}
              options={[
                { value: "all", label: "Tous les programmes" },
                ...programOptions.map((program) => ({ value: program, label: program }))
              ]}
            />
            <ToolbarSelect
              label="Période"
              value={periodFilter}
              onChange={setPeriodFilter}
              options={[
                { value: "all", label: "Toutes les périodes" },
                { value: "30", label: "30 derniers jours" },
                { value: "90", label: "90 derniers jours" }
              ]}
            />
          </div>
        </div>

        {isAdmin ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-[#B0B4C4]">Portefeuilles</p>
            <div className="flex flex-wrap gap-2">
              {records.some((record) => record.responsibleId === currentUser.id) ? (
                <ResponsibleFilterChip
                  label="Mon portefeuille"
                  count={records.filter((record) => record.responsibleId === currentUser.id).length}
                  active={responsibleFilter === currentUser.id}
                  onClick={() => handleResponsibleChange(currentUser.id)}
                />
              ) : null}
              {responsibleOptions.map((option) => {
                if (option.id === currentUser.id) {
                  return null;
                }

                const count = records.filter((record) => record.responsibleId === option.id).length;
                return (
                  <ResponsibleFilterChip
                    key={option.id}
                    label={formatPortfolioTabLabel(option.name)}
                    count={count}
                    active={responsibleFilter === option.id}
                    onClick={() => handleResponsibleChange(option.id)}
                  />
                );
              })}
              <ResponsibleFilterChip
                label="Tous"
                count={records.length}
                active={responsibleFilter === "all"}
                onClick={() => handleResponsibleChange("all")}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-5 py-4">
            <p className="eyebrow-label">Vue personnelle</p>
            <p className="mt-2 text-sm leading-6 text-[#B0B4C4]">
              Cette vue ne montre que les clients du distributeur connecté.
            </p>
          </div>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <Card className="space-y-4 overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">Vue globale</p>
              <h2 className="mt-3 text-2xl text-white">Clients, démarrage et conso estimée</h2>
            </div>
            <div className="rounded-[18px] bg-white/[0.03] px-4 py-3 text-sm text-[#B0B4C4]">
              {filteredRecords.length} dossiers
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filteredRecords.length === 0 ? (
              <div className="rounded-[16px] bg-white/[0.03] px-4 py-6 text-center text-sm text-[var(--ls-text-muted)]">Aucun dossier PV visible</div>
            ) : filteredRecords.map((record) => {
              return (
                <button key={record.clientId} type="button" onClick={() => handleSelectClient(record.clientId)}
                  className="w-full rounded-[16px] border border-white/[0.07] bg-[var(--ls-surface)] p-4 text-left transition hover:bg-white/[0.04]">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{record.clientName}</div>
                      <div className="text-[11px] text-[var(--ls-text-muted)] mt-1">{record.program}</div>
                    </div>
                    <div className="text-right">
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: '#C9A84C' }}>{record.pvCumulative} PV</div>
                      <PvStatusBadge status={record.status} />
                    </div>
                  </div>
                  <div className="flex gap-4 text-[11px] text-[var(--ls-text-hint)]">
                    <span>Début : {formatDate(record.startDate)}</span>
                    <span>{record.estimatedRemainingDays}j restants</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            {storageMode === "supabase" && records.length === 0 ? (
              <div className="mb-4 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-[#B0B4C4]">
                Aucun dossier PV actif n&apos;est encore visible avec les filtres en cours.
              </div>
            ) : null}
            <div className="min-w-[1120px] space-y-2">
              <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr_0.9fr_0.9fr_0.9fr_1fr_0.7fr] gap-3 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ls-text-hint)]">
                <span>Client</span>
                <span>Programme</span>
                <span>Date démarrage</span>
                <span>Dernière commande</span>
                <span>PV cumulés</span>
                <span>Jours depuis démarrage</span>
                <span>Reste estimé</span>
                <span>Statut</span>
                <span>Responsable</span>
                <span>Action</span>
              </div>

              {filteredRecords.map((record) => {
                const statusMeta = getPvStatusMeta(record.status);
                const isActive = selectedRecord?.clientId === record.clientId;

                return (
                  <button
                    key={record.clientId}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => handleSelectClient(record.clientId)}
                    className={`grid w-full grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr_0.9fr_0.9fr_0.9fr_1fr_0.7fr] gap-3 rounded-[22px] border px-3 py-4 text-left transition ${
                      isActive
                        ? "border-white/28 bg-white/[0.1] shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_22px_54px_rgba(8,15,28,0.4)]"
                        : "border-white/8 bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.055] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_18px_40px_rgba(7,12,22,0.3)]"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{record.clientName}</p>
                      <p className="mt-1 text-xs text-[var(--ls-text-muted)]">Suivi le {formatDate(record.lastFollowUpDate)}</p>
                    </div>
                    <div className="text-sm text-[#B0B4C4]">{record.program}</div>
                    <div className="text-sm text-[#B0B4C4]">{formatDate(record.startDate)}</div>
                    <div className="text-sm text-[#B0B4C4]">{formatDate(record.lastOrderDate)}</div>
                    <div className="text-sm font-semibold text-white">{record.pvCumulative} PV</div>
                    <div className="text-sm text-[#B0B4C4]">{record.daysSinceStart} j</div>
                    <div className="text-sm text-[#B0B4C4]">{record.estimatedRemainingDays} j</div>
                    <div>
                      <PvStatusBadge status={record.status} />
                      <p className="mt-1 text-[11px] text-[var(--ls-text-hint)]">{statusMeta.label}</p>
                    </div>
                    <div className="text-sm text-[#B0B4C4]">{record.responsibleName}</div>
                    <div>
                      <span
                        className={`inline-flex min-h-[40px] items-center justify-center rounded-full px-4 py-2 text-xs font-semibold transition ${
                          isActive
                            ? "border border-white/18 bg-white/[0.14] text-white"
                            : "bg-white/[0.04] text-white"
                        }`}
                      >
                        {isActive ? "Ouvert" : "Ouvrir"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <PvClientPanel key={selectedRecord?.clientId ?? "empty"} record={selectedRecord} />
      </div>
    </div>
  );
}

function ToolbarSelect({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[#B0B4C4]">{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToolbarInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[#B0B4C4]">{label}</label>
      <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white">
        {value}
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
          ? "border-[rgba(201,168,76,0.18)] bg-[rgba(45,212,191,0.14)] text-white"
          : "border-white/10 bg-white/[0.03] text-[#B0B4C4] hover:bg-white/[0.06]"
      }`}
    >
      <span>{label}</span>
      <span className="rounded-full bg-black/20 px-2 py-0.5 text-[11px]">{count}</span>
    </button>
  );
}

function formatPortfolioTabLabel(name: string) {
  const firstWord = name.trim().split(/\s+/)[0] ?? name;
  return firstWord.length > 14 ? `${firstWord.slice(0, 14)}...` : firstWord;
}

function matchesPvOverviewFilters(
  record: {
    clientName: string;
    program: string;
    responsibleName: string;
    responsibleId: string;
    status: PvStatus;
    lastOrderDate: string;
  },
  {
    search,
    statusFilter,
    responsibleFilter,
    programFilter,
    periodFilter,
    isAdmin
  }: {
    search: string;
    statusFilter: "all" | PvStatus;
    responsibleFilter: string;
    programFilter: string;
    periodFilter: string;
    isAdmin: boolean;
  }
) {
  const normalizedSearch = search.trim().toLowerCase();
  const matchesSearch =
    !normalizedSearch ||
    `${record.clientName} ${record.program} ${record.responsibleName}`.toLowerCase().includes(normalizedSearch);
  const matchesStatus = statusFilter === "all" || record.status === statusFilter;
  const matchesResponsible = !isAdmin || responsibleFilter === "all" || record.responsibleId === responsibleFilter;
  const matchesProgram = programFilter === "all" || record.program === programFilter;
  const daysSinceOrder = Math.floor((Date.now() - new Date(record.lastOrderDate).getTime()) / (24 * 60 * 60 * 1000));
  const matchesPeriod =
    periodFilter === "all" ||
    (periodFilter === "30" && daysSinceOrder <= 30) ||
    (periodFilter === "90" && daysSinceOrder <= 90);

  return matchesSearch && matchesStatus && matchesResponsible && matchesProgram && matchesPeriod;
}
