import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import ScoreBar from "../components/ui/ScoreBar";
import { readBilans, readBodyScans, readClientProduits, readClients, readSuivis } from "../lib/localData";
import { hasSupabaseEnv, supabase } from "../lib/supabaseClient";
import type { Bilan, BodyScan, Client } from "../lib/types";

interface DashboardStats {
  activeClients: number;
  monthBilans: number;
  followUpRate: number;
  renewalsSoon: number;
}

interface RecentClient extends Client {
  latestBilanDate?: string;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentClients, setRecentClients] = useState<RecentClient[]>([]);
  const [latestScans, setLatestScans] = useState<BodyScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      if (!hasSupabaseEnv) {
        const clients = readClients();
        const bilans = readBilans();
        const scans = readBodyScans();
        const suivis = readSuivis();
        const products = readClientProduits();
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
        const followUpStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const renewalsEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const latestBilansMap = new Map<string, string>();
        [...bilans]
          .sort((left, right) => right.date.localeCompare(left.date))
          .forEach((bilan) => {
            if (!latestBilansMap.has(bilan.client_id)) {
              latestBilansMap.set(bilan.client_id, bilan.date);
            }
          });
        const activeClients = clients.filter((client) => client.status === "actif");
        const clientsWithFollowUp = new Set(
          suivis.filter((suivi) => suivi.date >= followUpStart).map((suivi) => suivi.client_id)
        );
        setStats({
          activeClients: activeClients.length,
          monthBilans: bilans.filter((bilan) => bilan.date >= monthStart).length,
          followUpRate: activeClients.length === 0 ? 0 : Math.round((clientsWithFollowUp.size / activeClients.length) * 100),
          renewalsSoon: products.filter(
            (program) =>
              (program.status === "actif" || program.status === "pause") &&
              Boolean(program.expected_end_date) &&
              (program.expected_end_date as string) <= renewalsEnd
          ).length
        });
        setRecentClients(
          [...clients]
            .sort((left, right) => right.created_at.localeCompare(left.created_at))
            .slice(0, 5)
            .map((client) => ({ ...client, latestBilanDate: latestBilansMap.get(client.id) }))
        );
        setLatestScans([...scans].sort((left, right) => right.date.localeCompare(left.date)).slice(0, 3));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
        const followUpStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const renewalsEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        const [
          activeClientsResult,
          monthBilansResult,
          recentClientsResult,
          bilansResult,
          scansResult,
          followUpsResult,
          renewalsResult
        ] = await Promise.all([
          supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "actif"),
          supabase.from("bilans").select("*", { count: "exact", head: true }).gte("date", monthStart),
          supabase.from("clients").select("*").order("created_at", { ascending: false }).limit(5),
          supabase.from("bilans").select("client_id, date").order("date", { ascending: false }),
          supabase.from("body_scans").select("*").order("date", { ascending: false }).limit(3),
          supabase.from("suivis").select("client_id, date").gte("date", followUpStart),
          supabase
            .from("client_produits")
            .select("*", { count: "exact", head: true })
            .in("status", ["actif", "pause"])
            .lte("expected_end_date", renewalsEnd)
        ]);

        const errors = [
          activeClientsResult.error,
          monthBilansResult.error,
          recentClientsResult.error,
          bilansResult.error,
          scansResult.error,
          followUpsResult.error,
          renewalsResult.error
        ].filter(Boolean);

        if (errors.length > 0) {
          throw errors[0];
        }

        const recentClientRows = (recentClientsResult.data ?? []) as Client[];
        const latestBilansMap = new Map<string, string>();
        ((bilansResult.data ?? []) as Pick<Bilan, "client_id" | "date">[]).forEach((bilan) => {
          if (!latestBilansMap.has(bilan.client_id)) {
            latestBilansMap.set(bilan.client_id, bilan.date);
          }
        });

        const clientsWithFollowUp = new Set(
          ((followUpsResult.data ?? []) as { client_id: string }[]).map((item) => item.client_id)
        );

        const totalClients = activeClientsResult.count ?? 0;
        const followUpRate = totalClients === 0 ? 0 : Math.round((clientsWithFollowUp.size / totalClients) * 100);

        setStats({
          activeClients: activeClientsResult.count ?? 0,
          monthBilans: monthBilansResult.count ?? 0,
          followUpRate,
          renewalsSoon: renewalsResult.count ?? 0
        });
        setRecentClients(
          recentClientRows.map((client) => ({
            ...client,
            latestBilanDate: latestBilansMap.get(client.id)
          }))
        );
        setLatestScans((scansResult.data ?? []) as BodyScan[]);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Chargement impossible.");
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  const statCards = useMemo(
    () => [
      { label: "Clients actifs", value: stats?.activeClients ?? 0 },
      { label: "Bilans ce mois", value: stats?.monthBilans ?? 0 },
      { label: "Taux de suivi", value: `${stats?.followUpRate ?? 0}%` },
      { label: "Renouvellements à venir", value: stats?.renewalsSoon ?? 0 }
    ],
    [stats]
  );

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="lor-danger-banner rounded-[12px] px-5 py-4 text-sm">
        Impossible de charger le dashboard: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label} className="p-5">
            <p className="eyebrow-label">{card.label}</p>
            <p className="mt-4 text-[2rem] font-bold">{card.value}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow-label">Clients récents</p>
              <h2 className="mt-3 text-[1.4rem] font-bold">Les 5 derniers dossiers créés</h2>
            </div>
            <Button variant="secondary" onClick={() => navigate("/clients")}>
              Voir tous
            </Button>
          </div>

          <div className="mt-5 space-y-3">
            {recentClients.length === 0 ? (
              <EmptyState
                icon="🗂️"
                title="Aucun client pour l'instant"
                subtitle="Ajoute ton premier client pour commencer les bilans et les suivis."
              />
            ) : (
              recentClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between gap-4 rounded-[12px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] px-4 py-4"
                >
                  <div>
                    <p className="text-base font-medium text-[var(--lor-text)]">
                      {client.first_name} {client.last_name}
                    </p>
                    <p className="mt-1 text-sm text-[var(--lor-muted)]">
                      {client.objective || "Objectif à définir"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--lor-muted2)]">
                      Dernier bilan: {client.latestBilanDate ? formatDate(client.latestBilanDate) : "Aucun"}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/clients/${client.id}`)}>
                    Voir
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="eyebrow-label">Derniers body scans</p>
          <h2 className="mt-3 text-[1.4rem] font-bold">Lecture rapide des dernières mesures</h2>

          <div className="mt-5 space-y-5">
            {latestScans.length === 0 ? (
              <EmptyState
                icon="📈"
                title="Aucun body scan"
                subtitle="Les mesures récentes s'afficheront ici avec les indicateurs clés."
              />
            ) : (
              latestScans.map((scan) => (
                <div
                  key={scan.id}
                  className="rounded-[12px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--lor-text)]">{formatDate(scan.date)}</p>
                      <p className="text-xs text-[var(--lor-muted)]">Scan enregistré</p>
                    </div>
                    <p className="text-sm text-[var(--lor-muted)]">{scan.weight_kg ?? "-"} kg</p>
                  </div>
                  <div className="mt-4 space-y-3">
                    <ScoreBar
                      label="Masse grasse"
                      value={scan.fat_mass_percent ?? 0}
                      max={50}
                      unit="%"
                      color="var(--lor-coral)"
                    />
                    <ScoreBar
                      label="Masse musculaire"
                      value={scan.muscle_mass_kg ?? 0}
                      max={80}
                      unit=" kg"
                      color="var(--lor-teal)"
                    />
                    <ScoreBar
                      label="Hydratation"
                      value={scan.water_percent ?? 0}
                      max={100}
                      unit="%"
                      color="var(--lor-purple)"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      <button
        type="button"
        onClick={() => navigate("/clients?new=1")}
        className="fixed bottom-6 right-6 z-20 inline-flex min-h-[54px] items-center justify-center rounded-full bg-[var(--lor-gold)] px-5 font-['Syne'] text-sm font-bold text-[var(--lor-bg)] shadow-[0_20px_40px_rgba(0,0,0,0.34)] transition hover:brightness-110"
      >
        Nouveau client
      </button>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="lor-skeleton h-[120px]" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="lor-skeleton h-[420px]" />
        <div className="lor-skeleton h-[420px]" />
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export default DashboardPage;
