import { useMemo, useState, type ReactNode } from "react";
import {
  buildPvTrackingRecords,
  flattenPvTransactions,
  getPvTypeLabel,
  pvProductCatalog
} from "../data/mockPvModule";
import { formatDate } from "../lib/calculations";
import { Card } from "../components/ui/Card";
import { MetricTile } from "../components/ui/MetricTile";
import { PvModuleHeader } from "../components/pv/PvModuleHeader";
import { useAppContext } from "../context/AppContext";
import type { PvClientTransaction, PvTransactionType } from "../types/pv";

export function PvOrdersPage() {
  const { currentUser, clients, visibleClients } = useAppContext();
  const sourceClients = currentUser?.role === "admin" ? clients : visibleClients;
  const records = useMemo(() => buildPvTrackingRecords(sourceClients), [sourceClients]);
  const [localTransactions, setLocalTransactions] = useState<PvClientTransaction[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [clientId, setClientId] = useState(records[0]?.clientId ?? "");
  const [productId, setProductId] = useState(pvProductCatalog[0]?.id ?? "formula-1");
  const [quantity, setQuantity] = useState("1");
  const [type, setType] = useState<PvTransactionType>("reprise-sur-place");
  const [note, setNote] = useState("");

  if (!currentUser) {
    return null;
  }

  const transactions = useMemo(
    () => [...localTransactions, ...flattenPvTransactions(records)].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()),
    [localTransactions, records]
  );
  const monthPv = transactions
    .filter((transaction) => {
      const current = new Date();
      const dateValue = new Date(transaction.date);
      return (
        dateValue.getMonth() === current.getMonth() &&
        dateValue.getFullYear() === current.getFullYear()
      );
    })
    .reduce((total, transaction) => total + transaction.pv, 0)
    .toFixed(1);

  function handleAddTransaction() {
    const selectedClient = records.find((record) => record.clientId === clientId);
    const selectedProduct = pvProductCatalog.find((product) => product.id === productId);
    const parsedQuantity = Number(quantity);

    if (!selectedClient || !selectedProduct || Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return;
    }

    const nextTransaction: PvClientTransaction = {
      id: `local-${Date.now()}`,
      date,
      clientId: selectedClient.clientId,
      clientName: selectedClient.clientName,
      responsibleId: selectedClient.responsibleId,
      responsibleName: selectedClient.responsibleName,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: parsedQuantity,
      pv: Number((selectedProduct.pv * parsedQuantity).toFixed(1)),
      price: Number((selectedProduct.price * parsedQuantity).toFixed(2)),
      type,
      note: note || (type === "commande" ? "Commande ajoutee dans le module PV" : "Reprise sur place ajoutee dans le module PV")
    };

    setLocalTransactions((previous) => [nextTransaction, ...previous]);
    setQuantity("1");
    setNote("");
  }

  return (
    <div className="space-y-6">
      <PvModuleHeader
        currentUser={currentUser}
        title="Reprises / commandes"
        description="Saisie simple des mouvements produits, avec historique lisible et placeholders deja relies aux clients."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricTile label="PV du mois" value={`${monthPv} PV`} hint="Commandes + reprises visibles" accent="blue" />
        <MetricTile
          label="Commandes"
          value={transactions.filter((item) => item.type === "commande").length}
          hint="Historique visible"
          accent="green"
        />
        <MetricTile
          label="Reprises sur place"
          value={transactions.filter((item) => item.type === "reprise-sur-place").length}
          hint="Historique visible"
          accent="red"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-5">
          <div>
            <p className="eyebrow-label">Saisie rapide</p>
            <h2 className="mt-3 text-2xl text-white">Ajouter une reprise produit</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              La logique finale viendra plus tard. Ici, on pose deja la structure de saisie.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Date">
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </Field>
            <Field label="Client">
              <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
                {records.map((record) => (
                  <option key={record.clientId} value={record.clientId}>
                    {record.clientName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Produit">
              <select value={productId} onChange={(event) => setProductId(event.target.value)}>
                {pvProductCatalog.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Quantite">
              <input value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            </Field>
            <Field label="Type">
              <select value={type} onChange={(event) => setType(event.target.value as PvTransactionType)}>
                <option value="commande">Commande</option>
                <option value="reprise-sur-place">Reprise sur place</option>
              </select>
            </Field>
            <Field label="Note">
              <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note libre" />
            </Field>
          </div>

          <button
            type="button"
            onClick={handleAddTransaction}
            className="inline-flex min-h-[48px] items-center justify-center rounded-[18px] bg-sky-400/[0.16] px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400/[0.2]"
          >
            Ajouter une reprise produit
          </button>
        </Card>

        <Card className="space-y-4 overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">Historique</p>
              <h2 className="mt-3 text-2xl text-white">Commandes et reprises</h2>
            </div>
            <div className="rounded-[18px] bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
              {transactions.length} lignes
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[860px] space-y-2">
              <div className="grid grid-cols-[110px_1.2fr_1fr_70px_80px_90px_1.2fr] gap-3 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                <span>Date</span>
                <span>Client</span>
                <span>Produit</span>
                <span>Qté</span>
                <span>PV</span>
                <span>Type</span>
                <span>Note</span>
              </div>

              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="grid grid-cols-[110px_1.2fr_1fr_70px_80px_90px_1.2fr] gap-3 rounded-[20px] border border-white/8 bg-white/[0.03] px-3 py-4"
                >
                  <div className="text-sm text-slate-300">{formatDate(transaction.date)}</div>
                  <div>
                    <p className="text-sm font-semibold text-white">{transaction.clientName}</p>
                    <p className="mt-1 text-xs text-slate-400">{transaction.responsibleName}</p>
                  </div>
                  <div className="text-sm text-slate-300">{transaction.productName}</div>
                  <div className="text-sm text-slate-300">{transaction.quantity}</div>
                  <div className="text-sm font-semibold text-white">{transaction.pv}</div>
                  <div className="text-sm text-slate-300">{getPvTypeLabel(transaction.type)}</div>
                  <div className="text-sm text-slate-400">{transaction.note}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      {children}
    </div>
  );
}
