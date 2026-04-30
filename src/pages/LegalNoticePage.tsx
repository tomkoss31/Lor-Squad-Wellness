// Mentions légales (RGPD Phase 1 — 2026-04-30).
// Accessible publiquement (sans auth) pour les liens depuis emails / app client.
// Style theme-aware var(--ls-*) coherent avec le reste de l'app.

import { Link } from "react-router-dom";

export default function LegalNoticePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--ls-bg)",
        color: "var(--ls-text)",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <article
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "40px 24px 80px",
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <Link
            to="/"
            style={{
              fontSize: 12,
              color: "var(--ls-text-muted)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            ← Retour
          </Link>
        </div>

        <h1
          style={{
            fontFamily: "Syne, serif",
            fontSize: 32,
            fontWeight: 800,
            color: "var(--ls-text)",
            letterSpacing: "-0.02em",
            margin: "0 0 24px 0",
          }}
        >
          Mentions légales
        </h1>

        <Section title="Éditeur">
          <p>
            <strong>SAS HTM FITLIFE</strong>
            <br />
            6 lotissement Bellevue, 55100 Vacherauville, France
            <br />
            Email :{" "}
            <a href="mailto:lavaserdun@gmail.com" style={linkStyle}>
              lavaserdun@gmail.com
            </a>
            <br />
            Directeur de la publication : Thomas Houbert
          </p>
        </Section>

        <Section title="Hébergement">
          <p>
            Les données sont hébergées par <strong>Supabase Inc.</strong> (États-Unis) sur des serveurs situés en <strong>Irlande</strong> (Union européenne, région eu-west-1, Dublin). Les requêtes transitent via les CDN <strong>Cloudflare</strong> et <strong>Vercel</strong>.
          </p>
        </Section>

        <Section title="Propriété intellectuelle">
          <p>
            L'ensemble des éléments du site (textes, images, logos, code) est la propriété de la SAS HTM FITLIFE. Toute reproduction sans autorisation écrite préalable est interdite.
          </p>
        </Section>

        <Section title="Limitation de responsabilité">
          <p>
            <strong>Lor'Squad Wellness</strong> est un outil d'accompagnement bien-être destiné aux distributeurs Herbalife indépendants. Les recommandations produites par l'application n'ont pas de valeur médicale et ne remplacent pas un avis professionnel de santé.
          </p>
        </Section>

        <Section title="Droit applicable">
          <p>
            Les présentes mentions légales sont soumises au droit français. Tout litige relatif à leur interprétation ou leur exécution relève de la compétence exclusive des tribunaux français.
          </p>
        </Section>

        <div
          style={{
            marginTop: 40,
            padding: "16px 18px",
            background: "var(--ls-surface)",
            border: "0.5px solid var(--ls-border)",
            borderRadius: 12,
            fontSize: 12,
            color: "var(--ls-text-muted)",
            lineHeight: 1.6,
          }}
        >
          Voir aussi :{" "}
          <Link to="/legal/confidentialite" style={linkStyle}>
            Politique de confidentialité
          </Link>
        </div>
      </article>
    </main>
  );
}

const linkStyle: React.CSSProperties = {
  color: "var(--ls-gold)",
  textDecoration: "none",
  fontWeight: 600,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontFamily: "Syne, serif",
          fontSize: 20,
          fontWeight: 700,
          color: "var(--ls-text)",
          letterSpacing: "-0.01em",
          margin: "0 0 12px 0",
          paddingBottom: 8,
          borderBottom: "0.5px solid color-mix(in srgb, var(--ls-gold) 25%, var(--ls-border))",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          fontSize: 14,
          color: "var(--ls-text-muted)",
          lineHeight: 1.7,
        }}
      >
        {children}
      </div>
    </section>
  );
}
