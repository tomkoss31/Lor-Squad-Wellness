// AdminPaymentStatusTab (2026-07-02) — encaissement : qui a configuré / refusé.
//
// Demande Thomas : depuis l'onboarding, le distri peut « passer » l'encaissement
// Stripe. L'admin doit voir qui a configuré, qui a refusé, qui est en attente.
//
// Statut dérivé :
//   ✅ Configuré   = coach_payment_settings.active = true
//   ⏭️ Refusé      = users.payment_onboarding_declined_at non nul (et pas configuré)
//   ⏳ En attente  = ni l'un ni l'autre

import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { getSupabaseClient } from "../../services/supabaseClient";

type Status = "configured" | "declined" | "pending";

const STATUS_META: Record<Status, { label: string; icon: string; color: string }> = {
  configured: { label: "Configuré", icon: "✅", color: "var(--ls-teal)" },
  declined: { label: "Refusé", icon: "⏭️", color: "var(--ls-coral)" },
  pending: { label: "En attente", icon: "⏳", color: "var(--ls-text-muted)" },
};

export function AdminPaymentStatusTab() {
  const { users } = useAppContext();
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
  const [declinedAt, setDeclinedAt] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const sb = await getSupabaseClient();
      if (!sb) { setLoading(false); return; }
      const [pay, usr] = await Promise.all([
        sb.from("coach_payment_settings").select("coach_user_id, active"),
        sb.from("users").select("id, payment_onboarding_declined_at"),
      ]);
      if (cancelled) return;
      const act = new Set<string>();
      for (const r of (pay.data ?? []) as { coach_user_id: string; active: boolean }[]) {
        if (r.active) act.add(r.coach_user_id);
      }
      const dec = new Map<string, string>();
      for (const r of (usr.data ?? []) as { id: string; payment_onboarding_declined_at: string | null }[]) {
        if (r.payment_onboarding_declined_at) dec.set(r.id, r.payment_onboarding_declined_at);
      }
      setActiveIds(act);
      setDeclinedAt(dec);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo(() => {
    return users
      .filter((u) => !u.isExternal && (u.role === "distributor" || u.role === "referent"))
      .map((u) => {
        const status: Status = activeIds.has(u.id)
          ? "configured"
          : declinedAt.has(u.id)
            ? "declined"
            : "pending";
        return { id: u.id, name: u.name, role: u.role, status, declinedAt: declinedAt.get(u.id) ?? null };
      })
      .sort((a, b) => {
        const order: Record<Status, number> = { declined: 0, pending: 1, configured: 2 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return a.name.localeCompare(b.name);
      });
  }, [users, activeIds, declinedAt]);

  const counts = useMemo(() => {
    const c = { configured: 0, declined: 0, pending: 0 };
    for (const r of rows) c[r.status] += 1;
    return c;
  }, [rows]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {(["configured", "declined", "pending"] as Status[]).map((s) => (
          <div key={s} style={{ background: "var(--ls-surface2)", borderRadius: 12, padding: "12px 10px", textAlign: "center", border: `1px solid color-mix(in srgb, ${STATUS_META[s].color} 25%, var(--ls-border))` }}>
            <div style={{ fontFamily: "Anton, sans-serif", fontSize: 26, color: STATUS_META[s].color, lineHeight: 1 }}>{counts[s]}</div>
            <div style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ls-text-hint)", marginTop: 5, fontWeight: 600 }}>
              {STATUS_META[s].icon} {STATUS_META[s].label}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "20px 0", textAlign: "center", color: "var(--ls-text-muted)", fontSize: 13 }}>Chargement…</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: "20px 0", textAlign: "center", color: "var(--ls-text-muted)", fontSize: 13 }}>Aucun distributeur.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map((r) => {
            const m = STATUS_META[r.status];
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 12, border: "1px solid var(--ls-border)", background: "var(--ls-surface)" }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 600, fontSize: 14, color: "var(--ls-text)" }}>{r.name}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--ls-text-hint)", marginTop: 1 }}>
                    {r.role === "referent" ? "Référent" : "Distributeur"}
                    {r.status === "declined" && r.declinedAt ? ` · refusé le ${new Date(r.declinedAt).toLocaleDateString("fr-FR")}` : ""}
                  </span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 999, background: `color-mix(in srgb, ${m.color} 12%, var(--ls-surface2))`, border: `1px solid color-mix(in srgb, ${m.color} 35%, transparent)`, color: m.color, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                  <span aria-hidden="true">{m.icon}</span> {m.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
