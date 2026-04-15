import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { getPvProductStatusMeta, getPvTypeLabel } from "../../data/mockPvModule";
import { formatDate, formatDateTime } from "../../lib/calculations";
import type { PvClientTrackingRecord, PvProductUsage } from "../../types/pv";
import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";
import { PvStatusBadge } from "./PvStatusBadge";
import { useAppContext } from "../../context/AppContext";

export function PvClientPanel({
  record,
  title = "Fiche client PV"
}: {
  record: PvClientTrackingRecord | null;
  title?: string;
}) {
  const { savePvClientProduct } = useAppContext();
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftQuantity, setDraftQuantity] = useState("1");
  const [draftDuration, setDraftDuration] = useState("21");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function startEditing(product: PvProductUsage) {
    setEditingProductId(product.recordId);
    setDraftStartDate(product.startDate.slice(0, 10));
    setDraftQuantity(String(product.quantityStart));
    setDraftDuration(String(product.durationReferenceDays));
    setSaveError("");
  }

  function cancelEditing() {
    setEditingProductId(null);
    setSaveError("");
  }

  async function handleSaveProduct(product: PvProductUsage) {
    if (!record) {
      return;
    }

    setSaveError("");
    setIsSaving(true);

    try {
      await savePvClientProduct({
        id: product.recordId,
        clientId: record.clientId,
        responsibleId: record.responsibleId,
        responsibleName: record.responsibleName,
        programId: product.programId,
        productId: product.productId,
        productName: product.productName,
        quantityStart: Math.max(1, Number(draftQuantity) || 1),
        startDate: draftStartDate || product.startDate.slice(0, 10),
        durationReferenceDays: Math.max(1, Number(draftDuration) || product.durationReferenceDays),
        pvPerUnit: product.pvPerUnit,
        pricePublicPerUnit: product.pricePublicPerUnit,
        quantiteLabel: product.quantiteLabel,
        noteMetier: product.noteMetier,
        active: true
      });
      setEditingProductId(null);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Impossible de mettre a jour ce produit actif."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!record) {
    return (
      <Card className="space-y-3">
        <p className="eyebrow-label">Detail client</p>
        <h2 className="text-2xl text-white">Choisis un client</h2>
        <p className="text-sm leading-6 text-[var(--ls-text-muted)]">
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
          <p className="mt-2 text-sm text-[var(--ls-text-muted)]">{record.responsibleName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/clients/${record.clientId}`}
            className="inline-flex min-h-[38px] items-center justify-center rounded-full bg-[var(--ls-surface2)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/[0.08]"
          >
            Ouvrir dossier client
          </Link>
          <PvStatusBadge status={record.status} />
        </div>
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
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow-label">Produits actifs</p>
            <p className="mt-1 text-xs text-[var(--ls-text-hint)]">
              Modifier un produit actif, declarer un reassort ou ajouter un nouveau produit.
            </p>
          </div>
          <Link
            to={`/pv/orders?client=${record.clientId}&type=commande`}
            className="inline-flex min-h-[38px] items-center justify-center rounded-full bg-[rgba(45,212,191,0.14)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-400/[0.22]"
          >
            Ajouter un produit
          </Link>
        </div>

        <div className="space-y-3">
          {record.activeProducts.map((product) => {
            const statusMeta = getPvProductStatusMeta(product.status);
            const isEditing = editingProductId === product.recordId;

            return (
              <div
                key={product.id}
                className="rounded-[22px] border border-white/8 bg-[var(--ls-surface2)] px-4 py-3.5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 md:max-w-[52%]">
                    <p className="text-[1.02rem] font-semibold leading-[1.22] text-white">
                      {product.productName}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[var(--ls-text-muted)]">
                      Quantite de depart {product.quantityStart} - {product.quantiteLabel}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <Link
                        to={`/pv/orders?client=${record.clientId}&product=${product.productId}&type=commande`}
                        className="inline-flex min-h-[36px] items-center justify-center rounded-full bg-sky-400/[0.1] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[rgba(201,168,76,0.16)]"
                      >
                        Reassort
                      </Link>
                      <button
                        type="button"
                        onClick={() => (isEditing ? cancelEditing() : startEditing(product))}
                        className="inline-flex min-h-[36px] items-center justify-center rounded-full bg-[var(--ls-surface2)] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/[0.08]"
                      >
                        {isEditing ? "Fermer" : "Modifier"}
                      </button>
                    </div>
                    <div className="md:pr-1">
                      <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 grid gap-3 md:grid-cols-2">
                  <PanelFact label="Date debut" value={formatDate(product.startDate)} />
                  <PanelFact label="Duree reference" value={`${product.durationReferenceDays} jours`} />
                  <PanelFact label="Reste estime" value={`${product.estimatedRemainingDays} jours`} />
                  <PanelFact
                    label="Prochaine commande probable"
                    value={formatDate(product.nextProbableOrderDate)}
                  />
                  <PanelFact label="Prix public" value={`${product.pricePublicPerUnit.toFixed(2)} EUR`} />
                  <PanelFact label="PV" value={`${product.pvPerUnit} PV`} />
                </div>

                {isEditing ? (
                  <div className="mt-4 space-y-4 rounded-[20px] border border-sky-300/12 bg-sky-400/[0.05] p-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <EditorField label="Date debut">
                        <input
                          type="date"
                          value={draftStartDate}
                          onChange={(event) => setDraftStartDate(event.target.value)}
                        />
                      </EditorField>
                      <EditorField label="Quantite de depart">
                        <input
                          value={draftQuantity}
                          onChange={(event) => setDraftQuantity(event.target.value)}
                        />
                      </EditorField>
                      <EditorField label="Duree reference">
                        <input
                          value={draftDuration}
                          onChange={(event) => setDraftDuration(event.target.value)}
                        />
                      </EditorField>
                    </div>

                    {saveError ? (
                      <div className="rounded-[18px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                        {saveError}
                      </div>
                    ) : null}

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-[var(--ls-text)] transition hover:bg-[var(--ls-surface2)]"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveProduct(product)}
                        disabled={isSaving}
                        className="inline-flex min-h-[42px] items-center justify-center rounded-full bg-[rgba(201,168,76,0.18)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[rgba(201,168,76,0.24)] disabled:opacity-70"
                      >
                        {isSaving ? "Enregistrement..." : "Enregistrer"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {product.noteMetier ? (
                  <p className="mt-2.5 text-xs leading-6 text-[var(--ls-text-hint)]">{product.noteMetier}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <p className="eyebrow-label">Historique commandes / reprises</p>
        <div className="space-y-2">
          {record.transactions.slice(0, 6).map((transaction) => (
            <div
              key={transaction.id}
              className="grid gap-2 rounded-[18px] bg-[var(--ls-surface2)] px-4 py-2.5 md:grid-cols-[100px_1fr_80px_84px_84px]"
            >
              <div className="text-[13px] text-[var(--ls-text-muted)]">{formatDate(transaction.date)}</div>
              <div>
                <p className="text-[13px] font-semibold text-white">
                  {getPvTypeLabel(transaction.type)} - {transaction.productName}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--ls-text-muted)]">{transaction.note}</p>
              </div>
              <div className="text-[13px] text-[var(--ls-text-muted)]">{transaction.quantity} un.</div>
              <div className="text-[13px] font-semibold text-white">{transaction.pv} PV</div>
              <div className="text-[13px] text-[var(--ls-text-muted)]">{transaction.price.toFixed(2)} EUR</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] bg-[var(--ls-surface2)] p-5">
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
    <div className="rounded-[18px] bg-[var(--ls-bg)]/60 px-4 py-3">
      <p className="text-[11px] font-medium text-[var(--ls-text-hint)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function EditorField({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[var(--ls-text-muted)]">{label}</label>
      {children}
    </div>
  );
}
