// Politique de confidentialité (RGPD Phase 1 — 2026-04-30).
// Accessible publiquement (sans auth). Theme-aware var(--ls-*).

import { Link } from "react-router-dom";

export default function PrivacyPolicyPage() {
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
            margin: "0 0 8px 0",
          }}
        >
          Politique de confidentialité
        </h1>
        <p
          style={{
            fontSize: 12.5,
            color: "var(--ls-text-hint)",
            margin: "0 0 28px 0",
            fontStyle: "italic",
          }}
        >
          Dernière mise à jour : 30 avril 2026
        </p>

        <Section title="1. Responsable du traitement">
          <p>
            <strong>SAS HTM FITLIFE</strong>, 6 lotissement Bellevue 55100 Vacherauville, représentée par Thomas Houbert. Contact RGPD :{" "}
            <a href="mailto:lavaserdun@gmail.com" style={linkStyle}>
              lavaserdun@gmail.com
            </a>
            .
          </p>
        </Section>

        <Section title="2. Données collectées">
          <p>L'application Lor'Squad Wellness collecte deux catégories de données :</p>
          <ul style={listStyle}>
            <li>
              <strong>Données d'identification</strong> : prénom, nom, email, téléphone, ville, date de naissance, photo de profil.
            </li>
            <li>
              <strong>Données de santé (article 9 RGPD)</strong> : poids, masse grasse, masse musculaire, masse osseuse, hydratation, âge métabolique, graisse viscérale, mensurations corporelles, objectif (sport / perte de poids), historique d'évolution.
            </li>
          </ul>
        </Section>

        <Section title="3. Finalités du traitement">
          <p>Ces données sont collectées pour :</p>
          <ul style={listStyle}>
            <li>Personnaliser ton accompagnement bien-être avec ton coach</li>
            <li>Recommander des produits Herbalife adaptés à tes objectifs</li>
            <li>Mesurer l'évolution dans le temps</li>
            <li>Programmer des rendez-vous de suivi</li>
            <li>Permettre à ton coach et son sponsor de t'accompagner</li>
          </ul>
        </Section>

        <Section title="4. Base légale">
          <p>
            Pour les données de santé : <strong>consentement explicite</strong> (article 9 paragraphe 2 alinéa a du RGPD). Ce consentement est recueilli au premier bilan, attesté par ton coach après lecture du présent document.
          </p>
          <p>
            Pour les données d'identification : <strong>exécution du contrat</strong> d'accompagnement.
          </p>
        </Section>

        <Section title="5. Destinataires">
          <p>Tes données sont accessibles à :</p>
          <ul style={listStyle}>
            <li>Ton coach Herbalife indépendant (qui a créé ton dossier)</li>
            <li>Le sponsor direct de ton coach (chaîne d'accompagnement Herbalife)</li>
            <li>Les administrateurs techniques de Lor'Squad (Thomas Houbert, Mélanie Houbert) pour la maintenance et le support</li>
          </ul>
          <p>
            Tes données ne sont <strong>jamais vendues ni cédées</strong> à des tiers commerciaux.
          </p>
        </Section>

        <Section title="6. Hébergement et transfert">
          <p>
            Les données sont hébergées sur les serveurs de Supabase Inc. en Irlande (eu-west-1, Dublin), au sein de l'Union européenne. Aucun transfert hors UE n'est effectué pour les données de santé.
          </p>
        </Section>

        <Section title="7. Durée de conservation">
          <p>
            Les données sont conservées <strong>3 ans après ta dernière activité</strong> sur l'application, puis supprimées automatiquement. Tu peux demander leur suppression anticipée à tout moment.
          </p>
        </Section>

        <Section title="8. Tes droits">
          <p>Conformément au RGPD, tu disposes des droits suivants :</p>
          <ul style={listStyle}>
            <li>
              <strong>Accès</strong> : obtenir une copie de tes données
            </li>
            <li>
              <strong>Rectification</strong> : corriger des données erronées
            </li>
            <li>
              <strong>Effacement</strong> : demander la suppression de tes données
            </li>
            <li>
              <strong>Portabilité</strong> : récupérer tes données dans un format réutilisable
            </li>
            <li>
              <strong>Opposition</strong> : refuser certains traitements
            </li>
            <li>
              <strong>Retrait du consentement</strong> : à tout moment, sans justification
            </li>
          </ul>
          <p>
            Pour exercer ces droits, contacte :{" "}
            <a href="mailto:lavaserdun@gmail.com" style={linkStyle}>
              lavaserdun@gmail.com
            </a>
            .
          </p>
          <p>
            En cas de litige, tu peux saisir la <strong>CNIL</strong> (Commission Nationale de l'Informatique et des Libertés) —{" "}
            <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              cnil.fr/plaintes
            </a>
            .
          </p>
        </Section>

        <Section title="9. Sécurité">
          <p>Tes données sont protégées par :</p>
          <ul style={listStyle}>
            <li>Chiffrement TLS pour les communications</li>
            <li>Chiffrement au repos pour le stockage Supabase</li>
            <li>Authentification par mot de passe et liens à usage unique</li>
            <li>Politiques d'accès strictes (Row Level Security)</li>
            <li>Backups quotidiens automatiques</li>
          </ul>
        </Section>

        <Section title="10. Cookies">
          <p>
            L'application utilise uniquement des cookies <strong>strictement nécessaires</strong> à son fonctionnement (authentification, session). Aucun cookie publicitaire ou de tracking tiers n'est déposé.
          </p>
        </Section>

        <Section title="11. Modifications">
          <p>
            Cette politique peut être mise à jour. Toute modification substantielle fera l'objet d'une notification dans l'application.
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            Pour toute question relative à cette politique :{" "}
            <a href="mailto:lavaserdun@gmail.com" style={linkStyle}>
              lavaserdun@gmail.com
            </a>
            .
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
          <Link to="/legal/mentions" style={linkStyle}>
            Mentions légales
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

const listStyle: React.CSSProperties = {
  paddingLeft: 18,
  margin: "10px 0",
  lineHeight: 1.7,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontFamily: "Syne, serif",
          fontSize: 19,
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
          fontSize: 13.5,
          color: "var(--ls-text-muted)",
          lineHeight: 1.7,
        }}
      >
        {children}
      </div>
    </section>
  );
}
