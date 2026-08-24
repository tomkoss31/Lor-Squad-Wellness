// Mentions légales (RGPD Phase 1 — 2026-04-30).
// Accessible publiquement (sans auth) pour les liens depuis emails / app client.
// Style theme-aware var(--ls-*) coherent avec le reste de l'app.

import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  APP_NAME_FULL,
  COMPANY_NAME,
  COMPANY_ADDRESS,
  COMPANY_DIRECTOR,
  COMPANY_EMAIL,
  COMPANY_SIRET,
  CLUB_ADDRESS,
  SITE_HOST,
  SITE_HOST_ADDRESS,
  HOSTING_PROVIDER,
  HOSTING_REGION,
} from "../lib/branding";

export default function LegalNoticePage() {
  // Titre d'onglet propre à la page (14/08). Ces trois pages sont dans le plan
  // du site, donc destinées à être indexées — or aucune ne posait de titre : elles
  // héritaient toutes les trois de celui de index.html, « La Base 360 — The
  // wellness nutrition club ». Trois URL publiques sous le même titre, et le nom
  // de l'outil interne affiché au visiteur du club.
  useEffect(() => {
    const precedent = document.title;
    document.title = "Mentions légales · La Base, Verdun";
    return () => { document.title = precedent; };
  }, []);

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
            fontFamily: "Syne, sans-serif",
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
            <strong>{COMPANY_NAME}</strong>
            <br />
            {COMPANY_ADDRESS}
            <br />
            SIRET : {COMPANY_SIRET}
            <br />
            Email :{" "}
            <a href={`mailto:${COMPANY_EMAIL}`} style={linkStyle}>
              {COMPANY_EMAIL}
            </a>
            <br />
            Directeur de la publication : {COMPANY_DIRECTOR}
          </p>
        </Section>

        <Section title="Hébergement">
          {/* La LCEN (art. 6) demande l'hébergeur du SITE. On ne citait que
              l'hébergeur des DONNÉES, en reléguant Vercel au rang de « CDN » :
              c'est pourtant lui qui héberge les pages que vous lisez. Les deux
              sont désormais nommés, chacun pour ce qu'il fait. */}
          <p>
            Le site est hébergé par <strong>{SITE_HOST}</strong>, {SITE_HOST_ADDRESS}.
          </p>
          <p style={{ marginTop: 10 }}>
            Les données (base et traitements) sont hébergées par <strong>{HOSTING_PROVIDER}</strong>{" "}
            sur des serveurs situés en <strong>{HOSTING_REGION}</strong>. Les requêtes transitent
            par le CDN <strong>Cloudflare</strong>.
          </p>
        </Section>

        <Section title="Propriété intellectuelle">
          <p>
            L'ensemble des éléments du site (textes, images, logos, code) est la propriété de la {COMPANY_NAME}. Toute reproduction sans autorisation écrite préalable est interdite.
          </p>
        </Section>

        {/* Ces mentions ne décrivaient que l'app coach (« destiné aux
            distributeurs Herbalife »). Or le même pied de page est affiché par
            le site du Breakfast Club, qui vend des cartes de visites à des
            particuliers : la page ne couvrait pas la moitié de ce qu'elle
            servait. Les deux activités sont désormais nommées. */}
        <Section title="Activités couvertes">
          <p>
            Ces mentions valent pour l'ensemble des sites et applications édités par la{" "}
            {COMPANY_NAME} :
          </p>
          <ul style={{ margin: "10px 0 0 0", paddingLeft: 20, display: "grid", gap: 4 }}>
            <li>
              <strong>{APP_NAME_FULL}</strong> — outil d'accompagnement destiné aux distributeurs
              indépendants ;
            </li>
            <li>
              <strong>The Breakfast Club</strong> — club de petit-déjeuner et de coaching
              nutrition, {CLUB_ADDRESS}, qui propose à la vente des cartes de visites.
            </li>
          </ul>
          <p style={{ marginTop: 10 }}>
            Les ventes réalisées en ligne sont régies par les{" "}
            <Link to="/legal/cgv" style={linkStyle}>
              conditions générales de vente
            </Link>
            .
          </p>
        </Section>

        <Section title="Limitation de responsabilité">
          <p>
            Les recommandations produites par l'application, comme l'accompagnement proposé au
            club, relèvent du <strong>bien-être et de la nutrition</strong>. Ils n'ont pas de
            valeur médicale : ils ne soignent, ne préviennent ni ne guérissent aucune maladie et
            ne remplacent pas l'avis d'un professionnel de santé.
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
          </Link>{" "}
          ·{" "}
          <Link to="/legal/cgv" style={linkStyle}>
            Conditions générales de vente
          </Link>
        </div>
      </article>
    </main>
  );
}

const linkStyle: React.CSSProperties = {
  color: "var(--ls-teal)",
  textDecoration: "none",
  fontWeight: 600,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 20,
          fontWeight: 700,
          color: "var(--ls-text)",
          letterSpacing: "-0.01em",
          margin: "0 0 12px 0",
          paddingBottom: 8,
          borderBottom: "0.5px solid color-mix(in srgb, var(--ls-teal) 25%, var(--ls-border))",
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
