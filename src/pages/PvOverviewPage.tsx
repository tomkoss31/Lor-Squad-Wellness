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
  const { currentUser, clients, visibleClients, pvTransactions, pvClientProducts } = useAppContext();
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

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch =
        !normalizedSearch ||
        `${record.clientName} ${record.program} ${record.responsibleName}`.toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      const matchesResponsible =
        !isAdmin ||
        responsibleFilter === "all" ||
        record.responsibleId === responsibleFilter;
      const matchesProgram = programFilter === "all" || record.program === programFilter;
      const daysSinceOrder = Math.floor(
        (Date.now() - new Date(record.lastOrderDate).getTime()) / (24 * 60 * 60 * 1000)
      );
      const matchesPeriod =
        periodFilter === "all" ||
        (periodFilter === "30" && daysSinceOrder <= 30) ||
        (periodFilter === "90" && daysSinceOrder <= 90);

      return matchesSearch && matchesStatus && matchesResponsible && matchesProgram && matchesPeriod;
    });
  }, [isAdmin, periodFilter, programFilter, records, responsibleFilter, search, statusFilter]);

  useEffect(() => {
    if (isAdmin && responsibleFilter === "all" && defaultResponsibleFilter !== "all") {
      setResponsibleFilter(defaultResponsibleFilter);
    }
  }, [defaultResponsibleFilter, isAdmin, responsibleFilter]);

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
        description="Vue simple des clients, des points volume, des demarrages et des besoins de suivi."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="PV du mois" value={`${monthPv} PV`} hint="Lecture du mois en cours" accent="blue" />
        <MetricTile label="Clients actifs" value={filteredRecords.length} hint="Portefeuille visible" accent="green" />
        <MetricTile label="Reassorts probables" value={restockCount} hint="Produits bientot a renouveler" accent="red" />
        <MetricTile label="Reprises sur place" value={repriseCount} hint="Mouvements du mois" accent="blue" />
      </div>

      <Card className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-[1.25fr_repeat(3,minmax(0,0.8fr))]">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Recherche client</label>
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
              { value: "watch", label: "A surveiller" },
              { value: "restock", label: "Reassort probable" },
              { value: "inconsistent", label: "Incoherence conso" },
              { value: "follow-up", label: "A relancer" }
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
              label="Periode"
              value={periodFilter}
              onChange={setPeriodFilter}
              options={[
                { value: "all", label: "Toutes les periodes" },
                { value: "30", label: "30 derniers jours" },
                { value: "90", label: "90 derniers jours" }
              ]}
            />
          </div>
        </div>

        {isAdmin ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-300">Portefeuilles</p>
            <div className="flex flex-wrap gap-2">
              {records.some((record) => record.responsibleId === currentUser.id) ? (
                <ResponsibleFilterChip
                  label="Mon portefeuille"
                  count={records.filter((record) => record.responsibleId === currentUser.id).length}
                  active={responsibleFilter === currentUser.id}
                  onClick={() => setResponsibleFilter(currentUser.id)}
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
                    onClick={() => setResponsibleFilter(option.id)}
                  />
                );
              })}
              <ResponsibleFilterChip
                label="Tous"
                count={records.length}
                active={responsibleFilter === "all"}
                onClick={() => setResponsibleFilter("all")}
              />
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <Card className="space-y-4 overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">Vue globale</p>
              <h2 className="mt-3 text-2xl text-white">Clients, demarrage et conso estimee</h2>
            </div>
            <div className="rounded-[18px] bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
              {filteredRecords.length} dossiers
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[1120px] space-y-2">
              <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr_0.9fr_0.9fr_0.9fr_1fr_0.7fr] gap-3 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                <span>Client</span>
                <span>Programme</span>
                <span>Date demarrage</span>
                <span>Derniere commande</span>
                <span>PV cumules</span>
                <span>Jours depuis demarrage</span>
                <span>Reste estime</span>
                <span>Statut</span>
                <span>Responsable</span>
                <span>Action</span>
              </div>

              {filteredRecords.map((record) => {
                const statusMeta = getPvStatusMeta(record.status);
                const isActive = selectedRecord?.clientId === record.clientId;

                return (
                  <div
                    key={record.clientId}
                    className={`grid grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr_0.9fr_0.9fr_0.9fr_1fr_0.7fr] gap-3 rounded-[22px] border px-3 py-4 transition ${
                      isActive
                        ? "border-white/18 bg-white/[0.07] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_45px_rgba(8,15,28,0.34)]"
                        : "border-white/8 bg-white/[0.03] hover:border-white/12 hover:bg-white/[0.05] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_16px_36px_rgba(7,12,22,0.26)]"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{record.clientName}</p>
                      <p className="mt-1 text-xs text-slate-400">Suivi le {formatDate(record.lastFollowUpDate)}</p>
                    </div>
                    <div className="text-sm text-slate-300">{record.program}</div>
                    <div className="text-sm text-slate-300">{formatDate(record.startDate)}</div>
                    <div className="text-sm text-slate-300">{formatDate(record.lastOrderDate)}</div>
                    <div className="text-sm font-semibold text-white">{record.pvCumulative} PV</div>
                    <div className="text-sm text-slate-300">{record.daysSinceStart} j</div>
                    <div className="text-sm text-slate-300">{record.estimatedRemainingDays} j</div>
                    <div>
                      <PvStatusBadge status={record.status} />
                      <p className="mt-1 text-[11px] text-slate-500">{statusMeta.label}</p>
                    </div>
                    <div className="text-sm text-slate-300">{record.responsibleName}</div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setSelectedClientId(record.clientId)}
                        className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/[0.08]"
                      >
                        Ouvrir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <PvClientPanel record={selectedRecord} />
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
      <label className="text-sm font-medium text-slate-300">{label}</label>
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
      <label className="text-sm font-medium text-slate-300">{label}</label>
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
          ? "border-sky-300/18 bg-sky-400/[0.14] text-white"
          : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
      }`}
    >
      <span>{label}</span>
      <span className="rounded-full bg-black/20 px-2 py-0.5 text-[11px]">{count}</span>
    </button>
  );
}

function formatPortfolioTabLabel(name: string) {
  const firstWord = name.trim().split(/\s+/)[0] ?? name;
  return firstWord.length > 14 ? `${firstWord.slice(0, 14)}…` : firstWord;
}
