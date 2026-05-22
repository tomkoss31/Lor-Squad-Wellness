// =============================================================================
// PassiveSupervisorPage — chantier Aurélie 2026-05-22
//
// Page publique /distri-passif?token=XXX qui affiche :
//   - Hero : nom + rang
//   - Montant gagné ce mois + delta vs M-1 + projection
//   - Bar chart 12 mois
//   - Liste filleuls directs (name + rang + chip statut)
//
// Données via edge function passive-supervisor-data (service_role).
// Pas d'auth Supabase, juste le token URL.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BarChart } from "../components/rentability/shared/BarChart";

const FUNCTIONS_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "");

interface Payload {
  ok: boolean;
  error?: string;
  profile?: { id: string; name: string; currentRank: string | null };
  currentMonth?: {
    margin_eur: number;
    revenue_brut: number;
    month_start: string | null;
    products_count: number;
    prev_month_eur: number;
    projection_eur: number;
    days_elapsed: number;
    days_in_month: number;
  } | null;
  history12?: Array<{ month: string; margin_eur: number }>;
  downline?: Array<{ name: string; rank: string | null; external: boolean; active: boolean }>;
}

const RANK_LABELS: Record<string, string> = {
  distributor_25: "Distributor (25%)",
  senior_consultant_35: "Senior Consultant (35%)",
  success_builder_42: "Success Builder (42%)",
  supervisor_50: "Supervisor (50%)",
  active_supervisor_50: "Active Supervisor (50%)",
  world_team_50: "World Team (50%)",
  active_world_team_50: "Active World Team (50%)",
  get_team_50: "GET Team (50%)",
  get_team_2500_50: "GET Team 2500 (50%)",
  millionaire_50: "Millionaire Team (50%)",
  millionaire_7500_50: "Millionaire 7500 (50%)",
  presidents_50: "President's Team (50%)",
};

function fmtEur(n: number): string {
  return Math.round(n).toLocaleString("fr-FR") + " €";
}

function shortMonth(iso: string): string {
  try {
    const d = new Date(iso + (iso.length <= 10 ? "T12:00:00Z" : ""));
    return new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" }).format(d).replace(".", "");
  } catch {
    return iso;
  }
}

function monthLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso + "T12:00:00Z");
    const f = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(d);
    return f.charAt(0).toUpperCase() + f.slice(1);
  } catch {
    return iso;
  }
}

export function PassiveSupervisorPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Lien invalide : token manquant dans l'URL.");
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${FUNCTIONS_BASE_URL}/passive-supervisor-data?token=${encodeURIComponent(token)}`, {
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
    })
      .then(async (r) => {
        const body = (await r.json().catch(() => ({}))) as Payload;
        if (!r.ok || !body.ok) {
          setError(body.error ?? `Erreur HTTP ${r.status}`);
        } else {
          setData(body);
        }
      })
      .catch((err) => setError(err?.message ?? "Réseau indisponible"))
      .finally(() => setLoading(false));
  }, [token]);

  const historyBars = useMemo(() => data?.history12?.map((h) => h.margin_eur) ?? [], [data]);
  const historyLabels = useMemo(() => data?.history12?.map((h) => shortMonth(h.month)) ?? [], [data]);
  const peakIdx = useMemo(() => {
    if (historyBars.length === 0) return -1;
    let max = -Infinity;
    let idx = -1;
    historyBars.forEach((v, i) => { if (v > max) { max = v; idx = i; } });
    return idx;
  }, [historyBars]);
  const currentIdx = historyBars.length - 1;

  if (loading) {
    return (
      <div className="lr" style={wrapStyle}>
        <div style={{ textAlign: "center", padding: 60, color: "var(--ls-rentab-ink-3)" }}>Chargement…</div>
      </div>
    );
  }

  if (error || !data?.profile) {
    return (
      <div className="lr" style={wrapStyle}>
        <div style={errorBoxStyle}>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: 22, margin: 0, color: "var(--ls-rentab-coral)" }}>
            ⚠️ Accès indisponible
          </h1>
          <p style={{ fontSize: 14, color: "var(--ls-rentab-ink-2)", marginTop: 8 }}>
            {error ?? "Lien invalide ou révoqué."}
          </p>
          <p style={{ fontSize: 12, color: "var(--ls-rentab-ink-3)", marginTop: 12 }}>
            Contacte ton parrain pour obtenir un nouveau lien.
          </p>
        </div>
      </div>
    );
  }

  const { profile, currentMonth, downline } = data;
  const delta = currentMonth ? currentMonth.margin_eur - currentMonth.prev_month_eur : 0;
  const deltaPct = currentMonth && currentMonth.prev_month_eur > 0
    ? Math.round((delta / currentMonth.prev_month_eur) * 100)
    : 0;

  return (
    <div className="lr" style={wrapStyle}>
      {/* Hero */}
      <header style={heroStyle}>
        <div className="lr-mesh" />
        <div style={{ position: "relative" }}>
          <div className="lr-eyebrow">
            <span aria-hidden="true">◆</span>
            La Base 360 · Mes royalties
          </div>
          <h1 style={titleStyle}>{profile.name}</h1>
          <div style={subStyle}>
            {profile.currentRank ? RANK_LABELS[profile.currentRank] ?? profile.currentRank : "Rang non défini"}
            {currentMonth?.month_start && ` · ${monthLabel(currentMonth.month_start)}`}
          </div>
        </div>
      </header>

      {/* Ce mois */}
      {currentMonth && (
        <section className="lr-card" style={{ padding: 24, marginBottom: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ls-rentab-ink-3)", fontWeight: 600 }}>
            Mes gains ce mois
          </div>
          <div className="lr-display lr-num" style={{ fontSize: 56, marginTop: 8, lineHeight: 1 }}>
            {fmtEur(currentMonth.margin_eur)}
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {currentMonth.prev_month_eur > 0 && (
              <span className={`lr-chip ${delta >= 0 ? "lr-chip--teal" : "lr-chip--coral"}`}>
                {delta >= 0 ? "↑" : "↓"} {delta >= 0 ? "+" : ""}{Math.round(delta)}€ · {delta >= 0 ? "+" : ""}{deltaPct}% vs mois précédent
              </span>
            )}
            <span className="lr-chip lr-chip--gold">
              Projection fin de mois : {fmtEur(currentMonth.projection_eur)}
            </span>
          </div>
        </section>
      )}

      {/* Historique 12 mois */}
      {historyBars.length > 0 && (
        <section className="lr-card" style={{ padding: 24, marginBottom: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ls-rentab-ink-3)", fontWeight: 600, marginBottom: 14 }}>
            12 derniers mois
          </div>
          <BarChart
            data={historyBars}
            labels={historyLabels}
            width={620}
            height={200}
            current={currentIdx}
            peak={peakIdx}
          />
        </section>
      )}

      {/* Downline directe */}
      {downline && downline.length > 0 && (
        <section className="lr-card" style={{ padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ls-rentab-ink-3)", fontWeight: 600, marginBottom: 14 }}>
            Ma lignée directe ({downline.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {downline.map((d, i) => (
              <div key={i} style={downlineRowStyle}>
                <div>
                  <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--ls-rentab-ink)" }}>
                    {d.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ls-rentab-ink-3)", marginTop: 2 }}>
                    {d.rank ? RANK_LABELS[d.rank] ?? d.rank : "—"}
                    {d.external && " · externe"}
                    {!d.external && !d.active && " · inactif"}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 12, fontSize: 11.5, color: "var(--ls-rentab-ink-3)", lineHeight: 1.5 }}>
            ℹ️ Tu vois ta lignée mais pas le détail de leurs ventes (confidentialité clients).
            Pour toute question, contacte ton parrain.
          </p>
        </section>
      )}

      <footer style={footerStyle}>
        Lien personnel · ne pas partager · La Base 360
      </footer>
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "var(--ls-rentab-bg)",
  padding: "24px 18px 60px",
  maxWidth: 760,
  margin: "0 auto",
};

const heroStyle: React.CSSProperties = {
  position: "relative",
  background: "var(--ls-rentab-bg-1)",
  border: "1px solid var(--ls-rentab-line)",
  borderRadius: 22,
  padding: 28,
  marginBottom: 18,
  overflow: "hidden",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontStyle: "italic",
  fontWeight: 700,
  fontSize: 36,
  color: "var(--ls-rentab-ink)",
  margin: "8px 0 4px",
  letterSpacing: "-0.01em",
};

const subStyle: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  color: "var(--ls-rentab-ink-3)",
};

const errorBoxStyle: React.CSSProperties = {
  marginTop: 80,
  padding: 24,
  background: "var(--ls-rentab-bg-1)",
  border: "1px solid var(--ls-rentab-line)",
  borderRadius: 18,
  textAlign: "center",
};

const downlineRowStyle: React.CSSProperties = {
  padding: "12px 14px",
  background: "var(--ls-rentab-bg-2)",
  borderRadius: 12,
  border: "0.5px solid var(--ls-rentab-line)",
};

const footerStyle: React.CSSProperties = {
  textAlign: "center",
  marginTop: 30,
  fontSize: 11,
  color: "var(--ls-rentab-ink-3)",
  fontFamily: "DM Sans, sans-serif",
};
