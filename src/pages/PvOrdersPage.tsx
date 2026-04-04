import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  const navigate = useNavigate();
  const { currentUser, clients, visibleClients, pvTransactions, pvClientProducts, addPvTransaction, storageMode } = useAppContext();
  const [searchParams] = useSearchParams();
  const sourceClients = currentUser?.role === "admin" ? clients : visibleClients;
  const records = useMemo(
    () => buildPvTrackingRecords(sourceClients, pvTransactions, pvClientProducts),
    [pvClientProducts, pvTransactions, sourceClients]
  );
  const initialProduct = pvProductCatalog[0];
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [clientId, setClientId] = useState(records[0]?.clientId ?? "");
  const [productId, setProductId] = useState(initialProduct?.id ?? "formula-1");
  const [quantity, setQuantity] = useState("1");
  const [pv, setPv] = useState(initialProduct ? String(initialProduct.pv) : "0");
  const [price, setPrice] = useState(initialProduct ? String(initialProduct.pricePublic) : "0");
  const [type, setType] = useState<PvTransactionType>("commande");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!clientId && records[0]?.clientId) {
      setClientId(records[0].clientId);
    }
  }, [clientId, records]);

  useEffect(() => {
    const queryClientId = searchParams.get("client");
    const queryProductId = searchParams.get("product");
    const queryType = searchParams.get("type");

    if (queryClientId && records.some((record) => record.clientId === queryClientId)) {
      setClientId(queryClientId);
    }

    if (queryProductId && pvProductCatalog.some((product) => product.id === queryProductId)) {
      applyProductPreset(queryProductId);
    }

    if (queryType === "commande" || queryType === "reprise-sur-place") {
      setType(queryType);
    }
  }, [records, searchParams]);

  const selectedClient = records.find((record) => record.clientId === clientId) ?? null;
  const selectedProduct = pvProductCatalog.find((product) => product.id === productId) ?? null;

  if (!currentUser) {
    return null;
  }

  const transactions = useMemo(() => flattenPvTransactions(records), [records]);
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

  const entryLabel = type === "commande" ? "commande" : "reprise sur place";
  const title = type === "commande" ? "Ajouter un produit / commande" : "Ajouter une reprise produit";
  const submitLabel = type === "commande" ? "Enregistrer la commande" : "Enregistrer la reprise";
  const totalPv = Number((Number(pv || 0) * Number(quantity || 0)).toFixed(2));
  const totalPrice = Number((Number(price || 0) * Number(quantity || 0)).toFixed(2));
  const canSubmit =
    Boolean(selectedClient) &&
    Boolean(selectedProduct) &&
    Number(quantity) > 0 &&
    Number.isFinite(Number(pv)) &&
    Number.isFinite(Number(price));

  async function handleAddTransaction() {
    if (!selectedClient || !selectedProduct) {
      setFeedback({
        tone: "error",
        message: "Choisis d'abord un client et un produit pour enregistrer le mouvement."
      });
      return;
    }

    const parsedQuantity = Number(quantity);
    const parsedPv = Number(pv);
    const parsedPrice = Number(price);

    if (
      Number.isNaN(parsedQuantity) ||
      parsedQuantity <= 0 ||
      Number.isNaN(parsedPv) ||
      Number.isNaN(parsedPrice)
    ) {
      setFeedback({
        tone: "error",
        message: "Quantite, PV et prix doivent contenir des valeurs valides."
      });
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
      pv: Number((parsedPv * parsedQuantity).toFixed(2)),
      price: Number((parsedPrice * parsedQuantity).toFixed(2)),
      type,
      note:
        note ||
        (type === "commande"
          ? "Commande ajoutee dans le module PV"
          : "Reprise sur place ajoutee dans le module PV")
    };

    try {
      setIsSubmitting(true);
      setFeedback(null);
      await addPvTransaction(nextTransaction);
      setQuantity("1");
      setNote("");
      setFeedback({
        tone: "success",
        message: `${selectedProduct.name} a bien ete ajoute en ${entryLabel} pour ${selectedClient.clientName}.`
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Impossible d'enregistrer ce mouvement pour le moment."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function applyProductPreset(nextProductId: string) {
    setProductId(nextProductId);
    const nextProduct = pvProductCatalog.find((product) => product.id === nextProductId);
    if (!nextProduct) {
      return;
    }

    setPv(String(nextProduct.pv));
    setPrice(String(nextProduct.pricePublic));
  }

  return (
    <div className="space-y-6">
      <PvModuleHeader
        currentUser={currentUser}
        title="Reprises / commandes"
        description="Saisie simple des mouvements produits, reliee aux clients et au reste estime du module PV."
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

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="space-y-5">
          <div>
            <p className="eyebrow-label">Saisie rapide</p>
            <h2 className="mt-3 text-2xl text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Choisis le client, le produit et la quantite. Les PV et le prix se prechargent automatiquement et le
              suivi produit se met a jour ensuite.
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
              <select value={productId} onChange={(event) => applyProductPreset(event.target.value)}>
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
            <Field label="PV unitaire">
              <input value={pv} onChange={(event) => setPv(event.target.value)} />
            </Field>
            <Field label="Prix unitaire">
              <input value={price} onChange={(event) => setPrice(event.target.value)} />
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

          <div className="grid gap-3 md:grid-cols-2">
            <QuickSummaryCard
              label="Client relie"
              value={selectedClient?.clientName ?? "Aucun client"}
              hint={selectedClient ? selectedClient.program : "Choisis le bon dossier"}
            />
            <QuickSummaryCard
              label="Produit relie"
              value={selectedProduct?.name ?? "Aucun produit"}
              hint={selectedProduct ? `${selectedProduct.dureeReferenceJours} jours de reference` : "Choisis le produit"}
            />
            <QuickSummaryCard label="PV total" value={`${totalPv || 0} PV`} hint={`${Number(quantity || 0) || 0} unite(s)`} />
            <QuickSummaryCard label="Prix total" value={`${totalPrice || 0} EUR`} hint={getPvTypeLabel(type)} />
          </div>

          {storageMode === "supabase" && records.length === 0 ? (
            <div className="rounded-[22px] border border-amber-300/18 bg-amber-400/[0.08] px-4 py-4 text-sm leading-6 text-amber-50">
              Le module Suivi PV n&apos;a pas encore de base active sur Supabase. Lance le fichier
              <span className="mx-1 font-semibold">supabase/pv-module-migration.sql</span>
              dans SQL Editor, puis recharge l&apos;application.
            </div>
          ) : null}

          {feedback ? (
            <div
              className={`rounded-[18px] px-4 py-3 text-sm ${
                feedback.tone === "success"
                  ? "border border-emerald-400/18 bg-emerald-400/10 text-emerald-100"
                  : "border border-rose-400/18 bg-rose-400/10 text-rose-100"
              }`}
            >
              {feedback.message}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleAddTransaction()}
              disabled={!canSubmit || isSubmitting}
              className="inline-flex min-h-[48px] items-center justify-center rounded-[18px] bg-sky-400/[0.16] px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400/[0.2] disabled:opacity-60"
            >
              {isSubmitting ? "Enregistrement..." : submitLabel}
            </button>
            {selectedClient ? (
              <Link
                to={`/pv/clients?responsable=${selectedClient.responsibleId}&client=${selectedClient.clientId}`}
                className="inline-flex min-h-[48px] items-center justify-center rounded-[18px] border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.04]"
              >
                Revenir a sa fiche PV
              </Link>
            ) : null}
            {selectedClient ? (
              <button
                type="button"
                onClick={() =>
                  navigate(`/pv/clients?responsable=${selectedClient.responsibleId}&client=${selectedClient.clientId}`)
                }
                className="inline-flex min-h-[48px] items-center justify-center rounded-[18px] border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.04]"
              >
                Ouvrir le detail client
              </button>
            ) : null}
          </div>
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
                <span>Qte</span>
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

function QuickSummaryCard({
  label,
  value,
  hint
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[20px] bg-slate-950/24 px-4 py-3">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}
