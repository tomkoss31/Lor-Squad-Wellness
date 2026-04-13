import { useEffect, useMemo, useState } from "react";
import Badge from "../components/ui/Badge";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import { supabase } from "../lib/supabaseClient";
import type { Bilan, Client, Recommendation } from "../lib/types";

interface RecommendationRow {
  id: string;
  clientName: string;
  date: string;
  recommendation: Recommendation;
}

export function RecommandationsPage() {
  const [rows, setRows] = useState<RecommendationRow[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<Recommendation["priority"] | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecommendations() {
      setLoading(true);
      const [{ data: clients }, { data: bilans }] = await Promise.all([
        supabase.from("clients").select("id, first_name, last_name"),
        supabase.from("bilans").select("id, client_id, date, recommendations").order("date", { ascending: false })
      ]);

      const clientMap = new Map(
        ((clients ?? []) as Pick<Client, "id" | "first_name" | "last_name">[]).map((client) => [
          client.id,
          `${client.first_name} ${client.last_name}`
        ])
      );

      const flattened = ((bilans ?? []) as Pick<Bilan, "id" | "client_id" | "date" | "recommendations">[]).flatMap(
        (bilan) =>
          (bilan.recommendations ?? []).map((recommendation, index) => ({
            id: `${bilan.id}-${index}`,
            clientName: clientMap.get(bilan.client_id) ?? "Client inconnu",
            date: bilan.date,
            recommendation
          }))
      );

      setRows(flattened);
      setLoading(false);
    }

    void loadRecommendations();
  }, []);

  const filteredRows = useMemo(
    () => rows.filter((row) => priorityFilter === "all" || row.recommendation.priority === priorityFilter),
    [priorityFilter, rows]
  );

  const summary = useMemo(
    () => ({
      haute: rows.filter((row) => row.recommendation.priority === "haute").length,
      moyenne: rows.filter((row) => row.recommendation.priority === "moyenne").length,
      basse: rows.filter((row) => row.recommendation.priority === "basse").length
    }),
    [rows]
  );

  if (loading) {
    return <div className="lor-skeleton h-[280px]" />;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Priorité haute" value={summary.haute} accent="var(--lor-coral)" />
        <SummaryCard label="Priorité moyenne" value={summary.moyenne} accent="var(--lor-gold)" />
        <SummaryCard label="Priorité basse" value={summary.basse} accent="var(--lor-purple)" />
      </section>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          {(["all", "haute", "moyenne", "basse"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className="lor-tab-button"
              data-active={priorityFilter === item}
              onClick={() => setPriorityFilter(item)}
            >
              {item === "all" ? "Toutes" : item}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {filteredRows.length === 0 ? (
            <EmptyState
              icon="✨"
              title="Aucune recommandation"
              subtitle="Les recommandations automatiques des bilans apparaîtront ici."
            />
          ) : (
            filteredRows.map((row) => (
              <div
                key={row.id}
                className="rounded-[12px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-medium text-[var(--lor-text)]">{row.clientName}</p>
                    <p className="mt-1 text-sm text-[var(--lor-muted)]">{row.recommendation.category}</p>
                  </div>
                  <Badge variant={priorityToVariant(row.recommendation.priority)}>
                    Priorité {row.recommendation.priority}
                  </Badge>
                </div>
                <p className="mt-4 text-sm leading-7 text-[var(--lor-muted)]">{row.recommendation.reason}</p>
                {row.recommendation.product ? (
                  <p className="mt-3 text-sm text-[var(--lor-gold2)]">Produit suggéré: {row.recommendation.product}</p>
                ) : null}
                <p className="mt-3 text-xs text-[var(--lor-muted2)]">{formatDate(row.date)}</p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <Card className="p-5">
      <p className="eyebrow-label">{label}</p>
      <p className="mt-4 text-[2rem] font-bold" style={{ color: accent }}>
        {value}
      </p>
    </Card>
  );
}

function priorityToVariant(priority: Recommendation["priority"]) {
  if (priority === "haute") {
    return "danger";
  }

  if (priority === "moyenne") {
    return "warning";
  }

  return "default";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export default RecommandationsPage;
