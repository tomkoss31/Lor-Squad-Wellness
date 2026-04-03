import { getPvTypeLabel } from "../../data/mockPvModule";
import { formatDate, formatDateTime } from "../../lib/calculations";
import type { PvClientTrackingRecord } from "../../types/pv";
import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";
import { PvStatusBadge } from "./PvStatusBadge";

export function PvClientPanel({
  record,
  title = "Fiche client PV"
}: {
  record: PvClientTrackingRecord | null;
  title?: string;
}) {
  if (!record) {
    return (
      <Card className="space-y-3">
        <p className="eyebrow-label">Detail client</p>
        <h2 className="text-2xl text-white">Choisis un client</h2>
        <p className="text-sm leading-6 text-slate-400">
          Ouvre un dossier pour voir les produits actifs, l&apos;historique des commandes et la
          lecture rapide du suivi PV.
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow-label">{title}</p>
          <h2 className="mt-3 text-2xl text-white">{record.clientName}</h2>
          <p className="mt-2 text-sm text-slate-400">{record.responsibleName}</p>
        </div>
        <PvStatusBadge status={record.status} />
      </div>

      <section className="space-y-3">
        <p className="eyebrow-label">Identite client</p>
        <div className="grid gap-3 md:grid-cols-2">
          <PanelFact label="Programme" value={record.program} />
          <PanelFact label="Date de demarrage" value={formatDate(record.startDate)} />
          <PanelFact label="Dernier suivi" value={formatDate(record.lastFollowUpDate)} />
          <PanelFact label="Derniere commande" value={formatDate(record.lastOrderDate)} />
        </div>
      </section>

      <section className="space-y-3">
        <p className="eyebrow-label">Produits actifs</p>
        <div className="space-y-3">
          {record.activeProducts.map((product) => (
            <div
              key={product.id}
              className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">{product.productName}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Quantite de depart {product.quantityStart}
                  </p>
                </div>
                <StatusBadge
                  label={`${product.estimatedRemainingDays} j restants`}
                  tone={product.estimatedRemainingDays <= 5 ? "amber" : "blue"}
                />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <PanelFact label="Date debut" value={formatDate(product.startDate)} />
                <PanelFact label="Duree estimee" value={`${product.estimatedDurationDays} jours`} />
                <PanelFact label="Reste estime" value={`${product.estimatedRemainingDays} jours`} />
                <PanelFact
                  label="Prochaine commande probable"
                  value={formatDate(product.nextProbableOrderDate)}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <p className="eyebrow-label">Historique commandes / reprises</p>
        <div className="space-y-2">
          {record.transactions.slice(0, 6).map((transaction) => (
            <div
              key={transaction.id}
              className="grid gap-2 rounded-[18px] bg-slate-950/28 px-4 py-3 md:grid-cols-[110px_1fr_90px_90px]"
            >
              <div className="text-sm text-slate-300">{formatDate(transaction.date)}</div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {getPvTypeLabel(transaction.type)} - {transaction.productName}
                </p>
                <p className="mt-1 text-xs text-slate-400">{transaction.note}</p>
              </div>
              <div className="text-sm text-slate-300">{transaction.quantity} un.</div>
              <div className="text-sm font-semibold text-white">{transaction.pv} PV</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] bg-white/[0.03] p-5">
        <p className="eyebrow-label">Lecture rapide</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <PanelFact label="Demarre il y a" value={`${record.daysSinceStart} jours`} />
          <PanelFact label="Reste estime" value={`${record.estimatedRemainingDays} jours`} />
          <PanelFact label="Prochaine relance" value={formatDateTime(record.nextProbableOrderDate)} />
          <PanelFact label="PV du mois" value={`${record.monthlyPv} PV`} />
        </div>
      </section>
    </Card>
  );
}

function PanelFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-slate-950/24 px-4 py-3">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
