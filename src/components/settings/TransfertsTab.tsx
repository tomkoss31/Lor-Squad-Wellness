// Chantier Paramètres Admin (2026-04-23) — commit 5/7.
//
// Onglet Transferts : réassigne un distributeur à un nouveau parrain via
// la RPC SECURITY DEFINER transfer_distributor_atomic() qui fait en
// transaction : UPDATE users.sponsor_id, INSERT distributor_transfers,
// INSERT activity_logs.
//
// Historique : 10 derniers transferts affichés en bas.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "../ui/Card";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import { getSupabaseClient } from "../../services/supabaseClient";

interface TransferHistoryRow {
  id: string;
  distributor_id: string;
  from_sponsor_id: string | null;
  to_sponsor_id: string;
  transferred_by: string;
  transferred_at: string;
  notes: string | null;
}

export function TransfertsTab() {
  const { users, clients, pvTransactions } = useAppContext();
  const { push: pushToast } = useToast();

  const [distriId, setDistriId] = useState<string>("");
  const [newSponsorId, setNewSponsorId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<TransferHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const distriOptions = useMemo(
    () => users.filter((u) => u.role === "distributor" || u.role === "referent"),
    [users],
  );
  const sponsorOptions = useMemo(() => users, [users]);

  const selectedDistri = useMemo(
    () => users.find((u) => u.id === distriId) ?? null,
    [users, distriId],
  );

  const distriStats = useMemo(() => {
    if (!selectedDistri) return null;
    const clientCount = clients.filter(
      (c) => c.distributorId === selectedDistri.id,
    ).length;
    const pvTotal = pvTransactions
      .filter((t) => t.responsibleId === selectedDistri.id)
      .reduce((acc, t) => acc + (t.pv || 0), 0);
    return { clientCount, pvTotal };
  }, [selectedDistri, clients, pvTransactions]);

  const canSubmit =
    Boolean(distriId) &&
    Boolean(newSponsorId) &&
    distriId !== newSponsorId &&
    confirmed &&
    !submitting;

  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { data } = await sb
        .from("distributor_transfers")
        .select("id, distributor_id, from_sponsor_id, to_sponsor_id, transferred_by, transferred_at, notes")
        .order("transferred_at", { ascending: false })
        .limit(10);
      setHistory((data as TransferHistoryRow[] | null) ?? []);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { error: rpcErr } = await sb.rpc("transfer_distributor_atomic", {
        p_distributor_id: distriId,
        p_new_sponsor_id: newSponsorId,
        p_notes: notes.trim() || null,
      });
      if (rpcErr) throw new Error(rpcErr.message);

      pushToast({
        tone: "success",
        title: "Transfert effectué",
        message: `${selectedDistri?.name ?? "Le distributeur"} a changé de parrain.`,
      });

      setDistriId("");
      setNewSponsorId("");
      setNotes("");
      setConfirmed(false);
      await refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec du transfert.");
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, distriId, newSponsorId, notes, selectedDistri, pushToast, refreshHistory]);

  const userNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of users) m.set(u.id, u.name);
    return m;
  }, [users]);

  return (
    <div className="space-y-4">
      <Card className="space-y-5">
        <div>
          <p className="eyebrow-label">Transfert de parrainage</p>
          <p style={{ fontSize: 13, color: "var(--ls-text-muted)", marginTop: 4 }}>
            Réassigne un distributeur à un nouveau parrain. Ses clients restent
            liés à lui (ils le suivent). Seule la remontée PV vers le parrain
            change via son nouveau <code>sponsor_id</code>.
          </p>
        </div>

        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "1fr" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--ls-text-muted)",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
              }}
            >
              Distributeur à transférer
            </span>
            <select
              value={distriId}
              onChange={(e) => setDistriId(e.target.value)}
              disabled={submitting}
              style={selectStyle}
            >
              <option value="">— Choisis un distributeur —</option>
              {distriOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                  {u.sponsorName ? ` · actuel : ${u.sponsorName}` : ""}
                </option>
              ))}
            </select>
          </label>

          {selectedDistri && distriStats ? (
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                background: "var(--ls-surface2)",
                border: "1px solid var(--ls-border)",
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <InfoMini label="Parrain actuel" value={selectedDistri.sponsorName ?? "Aucun"} />
              <InfoMini label="Clients" value={`${distriStats.clientCount}`} />
              <InfoMini
                label="PV historique"
                value={distriStats.pvTotal.toLocaleString("fr-FR")}
              />
            </div>
          ) : null}

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--ls-text-muted)",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
              }}
            >
              Nouveau parrain
            </span>
            <select
              value={newSponsorId}
              onChange={(e) => setNewSponsorId(e.target.value)}
              disabled={submitting || !distriId}
              style={selectStyle}
            >
              <option value="">— Choisis un nouveau parrain —</option>
              {sponsorOptions
                .filter((u) => u.id !== distriId)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--ls-text-muted)",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
              }}
            >
              Note (optionnel)
            </span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Raison du transfert, contexte…"
              disabled={submitting}
              style={selectStyle}
            />
          </label>

          {distriId && newSponsorId && distriId !== newSponsorId ? (
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: "rgba(251,113,133,0.08)",
                border: "1px solid rgba(251,113,133,0.3)",
                color: "#B91C1C",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              ⚠️ Ce transfert est irréversible (sans action manuelle). Tous les
              futurs PV et la remontée de {selectedDistri?.name ?? "ce distributeur"}
              iront désormais vers{" "}
              <strong>
                {users.find((u) => u.id === newSponsorId)?.name ?? "le nouveau parrain"}
              </strong>
              .
            </div>
          ) : null}

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              fontSize: 13,
              color: "var(--ls-text)",
            }}
          >
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={submitting}
              style={{ width: 18, height: 18 }}
            />
            Je confirme avoir compris que ce transfert est irréversible.
          </label>

          {error ? (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(251,113,133,0.12)",
                color: "#FBBFC8",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              style={{
                padding: "12px 20px",
                borderRadius: 12,
                background: canSubmit ? "#A32D2D" : "rgba(220,38,38,0.35)",
                color: "#FFFFFF",
                border: "none",
                fontFamily: "Syne, sans-serif",
                fontWeight: 700,
                fontSize: 14,
                cursor: canSubmit ? "pointer" : "default",
                letterSpacing: 0.3,
              }}
            >
              {submitting ? "Transfert en cours…" : "Confirmer le transfert"}
            </button>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="eyebrow-label">Historique (10 derniers)</p>
        {historyLoading ? (
          <p style={{ fontSize: 13, color: "var(--ls-text-muted)" }}>Chargement…</p>
        ) : history.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ls-text-muted)" }}>
            Aucun transfert enregistré pour l'instant.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {history.map((h) => (
              <div
                key={h.id}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "var(--ls-surface2)",
                  border: "1px solid var(--ls-border)",
                  fontSize: 12,
                  color: "var(--ls-text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ flexShrink: 0, color: "var(--ls-text-hint)" }}>
                  {new Date(h.transferred_at).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span style={{ color: "var(--ls-text)", fontWeight: 500 }}>
                  {userNameById.get(h.distributor_id) ?? h.distributor_id.slice(0, 8)}
                </span>
                <span>
                  {userNameById.get(h.from_sponsor_id ?? "") ?? "aucun"} →{" "}
                  <strong style={{ color: "var(--ls-text)" }}>
                    {userNameById.get(h.to_sponsor_id) ?? h.to_sponsor_id.slice(0, 8)}
                  </strong>
                </span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ls-text-hint)" }}>
                  par {userNameById.get(h.transferred_by) ?? "?"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function InfoMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: "var(--ls-text-hint)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 15, fontWeight: 700, color: "var(--ls-text)" }}>
        {value}
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontSize: 14,
  fontFamily: "DM Sans, sans-serif",
  outline: "none",
  boxSizing: "border-box",
};
