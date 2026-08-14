// =============================================================================
// FormationV2Tracker — la vue admin « qui avance dans la nouvelle formation ».
//
// Thomas (2026-08-04) : « super important de voir l'évolution des gens, s'ils
// font ou pas ». Cette carte liste chaque coach actif avec sa progression dans
// le parcours Duolingo (micro-leçons), un résumé terminé / en cours / pas
// commencé, et la dernière activité. Source : RPC admin get_formation_v2_leaderboard
// (lit user_tour_progress tour_key='formation_v2', last_step = nb de leçons).
// =============================================================================

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { FORMATION_V2_TOTAL } from "../../features/formation-v2/content";

interface Row {
  user_id: string;
  user_name: string;
  user_role: string;
  last_step: number;
  completed_at: string | null;
  last_active_at: string | null;
}

function fmtLast(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function FormationV2Tracker() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data, error: rpcError } = await sb.rpc("get_formation_v2_leaderboard");
        if (cancelled) return;
        if (rpcError) {
          setError(rpcError.message);
          return;
        }
        setRows((data as Row[]) ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "erreur inconnue");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <div style={errBox}>⚠️ Suivi formation indisponible : {error}</div>;
  }
  if (!rows) {
    return <div style={loadBox}>Chargement du suivi formation…</div>;
  }

  const isDone = (r: Row) => Boolean(r.completed_at) || r.last_step >= FORMATION_V2_TOTAL;
  const done = rows.filter(isDone).length;
  const started = rows.filter((r) => r.last_step > 0 && !isDone(r)).length;
  const notStarted = rows.filter((r) => r.last_step === 0).length;

  return (
    <div style={card}>
      <p style={eyebrow}>🎓 Nouvelle formation · l'évolution de l'équipe</p>
      <h2 style={title}>Qui avance, qui ne fait rien</h2>
      <p style={sub}>
        Progression de chaque coach dans le parcours en micro-leçons ({FORMATION_V2_TOTAL} leçons).
        Trié : les plus avancés en haut, ceux qui n'ont rien commencé en bas.
      </p>

      <div style={summaryRow}>
        <Stat n={done} label="terminé" color="var(--ls-teal)" />
        <Stat n={started} label="en cours" color="var(--ls-lime)" />
        <Stat n={notStarted} label="pas commencé" color="var(--ls-coral)" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        {rows.map((r) => {
          const pct = Math.round((Math.min(r.last_step, FORMATION_V2_TOTAL) / FORMATION_V2_TOTAL) * 100);
          const status = isDone(r)
            ? { label: "✓ Terminé", color: "var(--ls-teal)" }
            : r.last_step > 0
              ? { label: "En cours", color: "var(--ls-lime)" }
              : { label: "Pas commencé", color: "var(--ls-coral)" };
          return (
            <div key={r.user_id} style={rowStyle}>
              <span style={initial}>{(r.user_name || "?").charAt(0).toUpperCase()}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                  <span style={nameStyle}>{r.user_name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: status.color, flexShrink: 0 }}>{status.label}</span>
                </div>
                <div style={barTrack}>
                  <i style={{ display: "block", height: "100%", width: `${pct}%`, background: status.color, borderRadius: 999, transition: "width .4s ease" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                  <span style={meta}>{r.last_step}/{FORMATION_V2_TOTAL} leçons</span>
                  <span style={meta}>vu {fmtLast(r.last_active_at)}</span>
                </div>
              </div>
            </div>
          );
        })}
        {rows.length === 0 ? <div style={loadBox}>Aucun coach actif pour l'instant.</div> : null}
      </div>
    </div>
  );
}

function Stat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div style={statBox}>
      <div style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 26, color }}>{n}</div>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ls-text-muted)", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
  borderRadius: 18,
  padding: "18px 18px 20px",
};
const eyebrow: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: 11,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  color: "var(--ls-teal)",
  margin: 0,
};
const title: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 20,
  fontWeight: 800,
  color: "var(--ls-text)",
  margin: "6px 0 0",
};
const sub: React.CSSProperties = { marginTop: 6, fontSize: 13, lineHeight: 1.5, color: "var(--ls-text-muted)" };
const summaryRow: React.CSSProperties = { display: "flex", gap: 10, marginTop: 16 };
const statBox: React.CSSProperties = {
  flex: 1,
  textAlign: "center",
  background: "var(--ls-surface2)",
  border: "1px solid var(--ls-border)",
  borderRadius: 14,
  padding: "12px 8px",
};
const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  background: "var(--ls-surface2)",
  border: "1px solid var(--ls-border)",
  borderRadius: 14,
  padding: "11px 13px",
};
const initial: React.CSSProperties = {
  width: 36,
  height: 36,
  flex: "none",
  borderRadius: "50%",
  background: "color-mix(in srgb, var(--ls-teal) 18%, var(--ls-surface))",
  color: "var(--ls-teal)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  fontSize: 15,
};
const nameStyle: React.CSSProperties = {
  fontSize: 14.5,
  fontWeight: 700,
  color: "var(--ls-text)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const barTrack: React.CSSProperties = {
  height: 7,
  borderRadius: 999,
  background: "var(--ls-border)",
  overflow: "hidden",
  marginTop: 6,
};
const meta: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: 10.5,
  color: "var(--ls-text-muted)",
};
const loadBox: React.CSSProperties = {
  padding: "24px 16px",
  textAlign: "center",
  color: "var(--ls-text-muted)",
  fontSize: 13,
};
const errBox: React.CSSProperties = {
  padding: 16,
  background: "color-mix(in srgb, var(--ls-coral) 8%, transparent)",
  border: "1px solid color-mix(in srgb, var(--ls-coral) 35%, transparent)",
  borderRadius: 12,
  color: "var(--ls-coral)",
  fontSize: 12.5,
};
