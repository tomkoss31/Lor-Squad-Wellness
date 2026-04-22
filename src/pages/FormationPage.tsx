// Chantier Centre de Formation (2026-04-23) — V1 coming soon.
// Le seed SQL est posé, les composants (CategoryCard, ResourceCard,
// VideoPlayerModal, hook useTraining) sont prêts, mais les contenus
// réels (vidéos, PDFs, scripts) ne sont pas encore fournis. On affiche
// donc une page d'attente claire, en attendant que Thomas collecte
// les ressources.
//
// Dès que les contenus arrivent, il suffira de remettre le rendu du
// catalogue (préservé en commentaire ci-dessous) pour reprendre sur
// les données déjà seedées.

import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";

export function FormationPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Formation"
        title="Centre de formation"
        description="Un espace pour progresser — du premier rendez-vous jusqu'au business 100 clubs."
      />

      <Card
        className="space-y-5"
        style={{
          textAlign: "center",
          padding: "40px 28px",
          background:
            "linear-gradient(160deg, rgba(201,168,76,0.08) 0%, rgba(45,212,191,0.06) 100%)",
          border: "1px solid rgba(201,168,76,0.25)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            margin: "0 auto",
            background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
            fontSize: 28,
            boxShadow: "0 8px 24px rgba(186,117,23,0.25)",
          }}
        >
          🎓
        </div>

        <div>
          <p
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: 24,
              fontWeight: 700,
              color: "var(--ls-text)",
              margin: 0,
              marginBottom: 8,
            }}
          >
            Bientôt disponible
          </p>
          <p
            style={{
              fontSize: 14,
              color: "var(--ls-text-muted)",
              lineHeight: 1.7,
              margin: 0,
              maxWidth: 520,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Le catalogue de formation se prépare en coulisses. Vidéos,
            scripts, PDFs et parcours par niveau (débutant · intermédiaire ·
            avancé) arriveront au fil des semaines.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "center",
            flexWrap: "wrap",
            marginTop: 6,
          }}
        >
          <Link
            to="/guide"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              borderRadius: 10,
              background: "var(--ls-gold)",
              color: "#0B0D11",
              textDecoration: "none",
              fontFamily: "DM Sans, sans-serif",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            📖 Guide rendez-vous
          </Link>
          <Link
            to="/guide-suivi"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              borderRadius: 10,
              background: "var(--ls-surface)",
              color: "var(--ls-text)",
              border: "1px solid var(--ls-border)",
              textDecoration: "none",
              fontFamily: "DM Sans, sans-serif",
              fontWeight: 500,
              fontSize: 13,
            }}
          >
            📚 Guide suivi client
          </Link>
        </div>

        <p
          style={{
            fontSize: 11,
            color: "var(--ls-text-hint)",
            marginTop: 12,
          }}
        >
          Patience — on te prévient dès que la première vague arrive. En attendant,
          les 2 guides existants restent accessibles ci-dessus.
        </p>
      </Card>
    </div>
  );
}
