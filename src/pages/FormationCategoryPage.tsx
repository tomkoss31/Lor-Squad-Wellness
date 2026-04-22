// Chantier Centre de Formation V1 (2026-04-23).
// Page détail /formation/:slug — liste verticale des ressources + dispatch
// au clic selon resource_type.

import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";
import { ResourceCard } from "../components/formation/ResourceCard";
import { VideoPlayerModal } from "../components/formation/VideoPlayerModal";
import { useTraining } from "../hooks/useTraining";
import type { TrainingResource } from "../types/training";

export function FormationCategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const {
    loading,
    error,
    categories,
    resourcesByCategoryId,
    isCompleted,
    markCompleted,
  } = useTraining();

  const [videoOpen, setVideoOpen] = useState<TrainingResource | null>(null);

  const category = useMemo(
    () => categories.find((c) => c.slug === slug) ?? null,
    [categories, slug],
  );

  const resources = useMemo(
    () => (category ? resourcesByCategoryId.get(category.id) ?? [] : []),
    [category, resourcesByCategoryId],
  );

  function handleClick(r: TrainingResource) {
    switch (r.resource_type) {
      case "video":
        setVideoOpen(r);
        break;
      case "pdf":
        if (r.content_url) {
          window.open(r.content_url, "_blank", "noopener,noreferrer");
          void markCompleted(r.id);
        }
        break;
      case "guide":
        if (r.internal_route) {
          // Marque la ressource dès le clic — l'user va lire.
          void markCompleted(r.id);
          navigate(r.internal_route);
        }
        break;
      case "external":
        if (r.content_url) {
          window.open(r.content_url, "_blank", "noopener,noreferrer");
          void markCompleted(r.id);
        }
        break;
    }
  }

  return (
    <div className="space-y-6">
      <div style={{ fontSize: 11, color: "var(--ls-text-hint)" }}>
        <Link to="/formation" style={{ color: "var(--ls-text-muted)", textDecoration: "none" }}>
          Centre de formation
        </Link>
        {" → "}
        {category?.title ?? "…"}
      </div>

      {loading ? (
        <Card>
          <p style={{ fontSize: 13, color: "var(--ls-text-muted)" }}>
            Chargement…
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
            {error}
          </p>
        </Card>
      ) : !category ? (
        <Card>
          <p style={{ fontSize: 13, color: "var(--ls-text-muted)" }}>
            Catégorie introuvable.{" "}
            <Link to="/formation" style={{ color: "var(--ls-gold)" }}>
              Retour au Centre de formation
            </Link>
          </p>
        </Card>
      ) : (
        <>
          <PageHeading
            eyebrow={category.level.toUpperCase()}
            title={category.title}
            description={category.description ?? undefined}
          />

          {resources.length === 0 ? (
            <Card>
              <p style={{ fontSize: 13, color: "var(--ls-text-muted)" }}>
                Aucune ressource dans cette catégorie pour l'instant.
              </p>
            </Card>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {resources.map((r) => (
                <ResourceCard
                  key={r.id}
                  resource={r}
                  isCompleted={isCompleted(r.id)}
                  onClick={() => handleClick(r)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <VideoPlayerModal
        open={videoOpen !== null}
        title={videoOpen?.title ?? ""}
        videoUrl={videoOpen?.content_url ?? null}
        alreadyCompleted={videoOpen ? isCompleted(videoOpen.id) : false}
        onClose={() => setVideoOpen(null)}
        onCompleted={() => {
          if (videoOpen) {
            void markCompleted(videoOpen.id);
          }
          setVideoOpen(null);
        }}
      />
    </div>
  );
}
