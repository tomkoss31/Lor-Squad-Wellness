// Chantier Centre de Formation V1 (2026-04-23).
// Remplace CentreFormationPage placeholder du chantier 2.
//
// Home /formation : progression globale + grid 3 cards catégories.

import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";
import { CategoryCard } from "../components/formation/CategoryCard";
import { useTraining } from "../hooks/useTraining";

export function FormationPage() {
  const { loading, error, byCategory, globalStats } = useTraining();

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Formation"
        title="Centre de formation"
        description="Tout ce qu'il te faut pour progresser — des fondamentaux au business 100 clubs."
      />

      <Card className="space-y-3">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "var(--ls-text-muted)",
                marginBottom: 4,
              }}
            >
              Ta progression
            </div>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 700, color: "var(--ls-text)" }}>
              {globalStats.completed} / {globalStats.total} ressources vues · {globalStats.percent}%
            </div>
          </div>
        </div>
        <div
          style={{
            height: 8,
            borderRadius: 4,
            background: "var(--ls-surface2)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${globalStats.percent}%`,
              height: "100%",
              background: "linear-gradient(90deg, #EF9F27 0%, #BA7517 100%)",
              transition: "width 0.4s",
            }}
          />
        </div>
      </Card>

      {loading ? (
        <Card>
          <p style={{ fontSize: 13, color: "var(--ls-text-muted)" }}>
            Chargement des catégories…
          </p>
        </Card>
      ) : error ? (
        <Card>
          <p
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(251,113,133,0.12)",
              color: "#FBBFC8",
              fontSize: 13,
            }}
          >
            {error} — Exécute la migration SQL du chantier Centre de formation
            pour activer cette page.
          </p>
        </Card>
      ) : byCategory.length === 0 ? (
        <Card>
          <p style={{ fontSize: 13, color: "var(--ls-text-muted)" }}>
            Aucune catégorie pour l'instant.
          </p>
        </Card>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          }}
        >
          {byCategory.map((stats) => (
            <CategoryCard key={stats.category.id} stats={stats} />
          ))}
        </div>
      )}
    </div>
  );
}
