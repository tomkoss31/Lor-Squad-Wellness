// Conditions générales de vente — cartes de visites du Breakfast Club.
//
// POURQUOI CETTE PAGE EXISTE (2026-08-13)
// Le site du club encaisse 80 € et 185 € auprès de particuliers depuis la page
// d'accueil, et il n'existait AUCUNE condition de vente. Les seules pages
// légales dataient du 30/04, écrites pour l'app coach : elles décrivaient
// « un outil destiné aux distributeurs Herbalife », pas un club qui vend des
// cartes prépayées au public de Verdun.
//
// ⚠ CE QUI A CHANGÉ DANS L'OFFRE, ET POURQUOI
// Le site annonçait « non remboursable », point. Pour une vente de service à
// distance à un particulier, le code de la consommation ouvre 14 jours de
// rétractation (art. L221-18). Un « non remboursable » sec est donc
// contestable. La règle écrite ici — 14 jours pour changer d'avis, les visites
// déjà prises étant déduites (art. L221-25) — est la loi, pas une faveur.
// Les textes du site (caisse, FAQ accueil, FAQ parcours) ont été alignés
// dessus : rien ne doit dire l'inverse d'une autre page.
//
// Style var(--ls-*) comme les deux autres pages légales : c'est une page
// partagée par le club, la boutique et l'app, elle ne prend l'identité
// d'aucune des trois.
//
// ⚠ Ces conditions sont rédigées avec soin mais ne remplacent pas la
// relecture d'un juriste avant l'ouverture des ventes.

import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  COMPANY_NAME,
  COMPANY_ADDRESS,
  COMPANY_DIRECTOR,
  COMPANY_EMAIL,
  COMPANY_SIRET,
  COMPANY_PHONE,
  CLUB_ADDRESS,
  CONSUMER_MEDIATOR_NAME,
  CONSUMER_MEDIATOR_URL,
} from "../lib/branding";

const MAJ = "13 août 2026";

export default function TermsOfSalePage() {
  // Titre d'onglet propre à la page (14/08). Ces trois pages sont dans le plan
  // du site, donc destinées à être indexées — or aucune ne posait de titre : elles
  // héritaient toutes les trois de celui de index.html, « La Base 360 — The
  // wellness nutrition club ». Trois URL publiques sous le même titre, et le nom
  // de l'outil interne affiché au visiteur du club.
  useEffect(() => {
    const precedent = document.title;
    document.title = "Conditions de vente · La Base, Verdun";
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
      <article style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ marginBottom: 24 }}>
          <Link
            to="/club"
            style={{
              fontSize: 12,
              color: "var(--ls-text-muted)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              minHeight: 44,
            }}
          >
            ← Retour au club
          </Link>
        </div>

        <h1
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            margin: "0 0 8px 0",
          }}
        >
          Conditions générales de vente
        </h1>
        <p style={{ fontSize: 13, color: "var(--ls-text-muted)", margin: "0 0 28px 0" }}>
          Cartes de visites du Breakfast Club · en vigueur au {MAJ}
        </p>

        <Section title="1. Qui vend">
          <p>
            <strong>{COMPANY_NAME}</strong>, société par actions simplifiée.
            <br />
            Siège social : {COMPANY_ADDRESS}
            <br />
            Établissement recevant le public : {CLUB_ADDRESS}
            <br />
            SIRET : {COMPANY_SIRET}
            <br />
            Représentant légal : {COMPANY_DIRECTOR}
            <br />
            Téléphone : {COMPANY_PHONE} · Email :{" "}
            <a href={`mailto:${COMPANY_EMAIL}`} style={linkStyle}>
              {COMPANY_EMAIL}
            </a>
          </p>
        </Section>

        {/* ⚠ LA DISTINCTION QUI ÉVITE DE SE CONTREDIRE AVEC LA CHARTE DU CLUB
            Le club a ses propres conditions, remises au comptoir, et elles ne
            prévoient aucun délai de rétractation. Elles ont raison : le délai
            de 14 jours ne vaut que pour les contrats conclus À DISTANCE ou hors
            établissement (art. L221-18). Une carte achetée en face à face au
            club n'en ouvre aucun.
            Ce n'est donc pas la charte qui était fausse — c'est le site qui a
            ouvert un second canal de vente, soumis à d'autres règles. D'où ce
            paragraphe : ces CGV ne parlent que du canal EN LIGNE, et le disent,
            pour que les deux documents cessent de sembler se contredire. */}
        <Section title="2. Ce que couvrent ces conditions">
          <p>
            Elles s'appliquent aux <strong>cartes de visites achetées en ligne, sur ce site</strong>.
            En validant ton paiement, tu déclares en avoir pris connaissance et les accepter.
          </p>
          <p style={{ marginTop: 10 }}>
            Une carte prise <strong>sur place au club</strong>, au comptoir, relève des conditions
            qui te sont remises là-bas : ce n'est pas le même mode d'achat, et les règles ne sont
            pas les mêmes — en particulier le délai de rétractation prévu à l'article 6, qui est
            propre à l'achat en ligne.
          </p>
          <p style={{ marginTop: 10 }}>
            Ces conditions peuvent évoluer : celle qui s'applique à ton achat est la version
            affichée le jour où tu l'as fait.
          </p>
        </Section>

        <Section title="3. Ce que tu achètes">
          <p>
            Une carte donne droit à un nombre de <strong>visites</strong> au club, aux horaires
            d'ouverture, sans rendez-vous. Une visite comprend :
          </p>
          <ul style={ulStyle}>
            <li>les trois boissons du rituel (aloe vera, boisson thermo, smoothie nutritionnel) ;</li>
            <li>la pesée et le report de tes valeurs ;</li>
            <li>le point avec ton coach.</li>
          </ul>
          <p style={{ marginTop: 10 }}>
            Deux cartes sont proposées : <strong>10 visites</strong> et <strong>30 visites</strong>.
            Le premier body scan est offert et n'engage à rien : il ne nécessite aucun achat.
            Aucun produit n'est à acheter en plus pour utiliser ta carte.
          </p>
        </Section>

        <Section title="4. Prix et paiement">
          <p>
            Les prix sont indiqués en euros, sur la page d'achat, avant toute validation. Le tarif
            applicable est celui affiché au moment de l'achat ; une offre de pré-lancement,
            limitée en nombre, peut faire varier le prix de la carte 30 visites.
          </p>
          {/* La SAS est en franchise en base de TVA (confirmé par Thomas le
              13/08). La mention de l'article 293 B est alors OBLIGATOIRE sur
              les documents de vente — son absence est une irrégularité. */}
          <p style={{ marginTop: 10 }}>
            <strong>TVA non applicable, article 293 B du Code général des impôts.</strong> Les
            montants affichés sont donc les montants définitifs : aucune taxe ne s'y ajoute.
          </p>
          <p style={{ marginTop: 10 }}>
            Le paiement se fait en ligne par carte bancaire, via un prestataire de paiement
            sécurisé. <strong>Nous ne voyons ni ne conservons ton numéro de carte.</strong> La
            vente est ferme une fois le paiement encaissé ; tu reçois alors une preuve d'achat par
            email — c'est elle qui fait foi au comptoir.
          </p>
        </Section>

        <Section title="5. Durée de validité">
          <p>
            Chaque carte a une durée de validité qui court <strong>à partir du jour de
            l'achat</strong> : 30 jours pour la carte 10 visites, 90 jours pour la carte 30
            visites. Cette durée est rappelée sur la page d'achat avant paiement et sur ta preuve
            d'achat.
          </p>
          <p style={{ marginTop: 10 }}>
            À l'échéance, les visites non utilisées sont perdues. Il n'y a ni abonnement, ni
            reconduction, ni prélèvement automatique : la carte se paie une fois.
          </p>
        </Section>

        <Section title="6. Changer d'avis : 14 jours (achat en ligne)">
          <p>
            Parce que tu as acheté <strong>à distance</strong>, tu disposes de{" "}
            <strong>14 jours à compter de ton achat</strong> pour te rétracter, sans avoir à te
            justifier ni à payer de pénalité. Ce délai est propre à l'achat en ligne : une carte
            prise au comptoir n'en ouvre pas.
          </p>
          <p style={{ marginTop: 10 }}>
            Si tu as déjà utilisé des visites pendant ce délai, elles te sont décomptées au prix
            unitaire de ta carte et le solde t'est remboursé. Si tu n'en as utilisé aucune, tu es
            remboursé intégralement. Le remboursement intervient dans les 14 jours suivant ta
            demande, par le moyen de paiement utilisé lors de l'achat.
          </p>
          <p style={{ marginTop: 10 }}>
            Pour te rétracter, il suffit de nous écrire à{" "}
            <a href={`mailto:${COMPANY_EMAIL}`} style={linkStyle}>
              {COMPANY_EMAIL}
            </a>{" "}
            ou de nous le dire au club. Tu peux utiliser ce modèle, sans obligation :
          </p>
          <blockquote style={quoteStyle}>
            À l'attention de {COMPANY_NAME}, {CLUB_ADDRESS} — {COMPANY_EMAIL}
            <br />
            <br />
            Je vous notifie par la présente ma rétractation du contrat portant sur l'achat de la
            carte de visites ci-dessous :
            <br />
            Carte commandée le : … · Nom : … · Adresse : … · Email : …
            <br />
            <br />
            Date : …
          </blockquote>
          <p style={{ marginTop: 10 }}>
            <strong>Passé ce délai de 14 jours, la carte n'est plus remboursable.</strong> Si un
            imprévu sérieux t'empêche de venir — hospitalisation, déménagement — parle-nous-en :
            on regarde au cas par cas, à titre commercial.
          </p>
        </Section>

        <Section title="7. Ce que le club n'est pas">
          <p>
            Le Breakfast Club propose un accompagnement de bien-être et de nutrition. Ce n'est
            <strong> ni un service médical, ni un traitement</strong> : rien de ce qui est
            proposé ne soigne, ne prévient ni ne guérit une maladie, et rien ne remplace un avis
            médical. En cas de traitement en cours, de grossesse ou de pathologie, parles-en à ton
            médecin avant de commencer. Les boissons servies sont des denrées alimentaires
            courantes.
          </p>
        </Section>

        <Section title="8. Une réclamation ?">
          <p>
            Écris-nous d'abord à{" "}
            <a href={`mailto:${COMPANY_EMAIL}`} style={linkStyle}>
              {COMPANY_EMAIL}
            </a>{" "}
            ou appelle le {COMPANY_PHONE} : la plupart des situations se règlent en une
            conversation.
          </p>
          <p style={{ marginTop: 10 }}>
            Si la réponse ne te convient pas, tu peux recourir gratuitement à un{" "}
            <strong>médiateur de la consommation</strong>, dans un délai d'un an à compter de ta
            réclamation écrite.{" "}
            {CONSUMER_MEDIATOR_NAME ? (
              <>
                Le médiateur dont nous relevons est <strong>{CONSUMER_MEDIATOR_NAME}</strong>
                {CONSUMER_MEDIATOR_URL ? (
                  <>
                    {" "}
                    —{" "}
                    <a href={CONSUMER_MEDIATOR_URL} style={linkStyle} target="_blank" rel="noopener noreferrer">
                      {CONSUMER_MEDIATOR_URL}
                    </a>
                  </>
                ) : null}
                .
              </>
            ) : (
              <>Écris-nous pour en obtenir les coordonnées.</>
            )}
          </p>
        </Section>

        <Section title="9. Tes données">
          <p>
            Les informations demandées à l'achat servent uniquement à établir ta preuve d'achat,
            à te reconnaître au comptoir et à te contacter en cas de problème. Le détail est dans
            la{" "}
            <Link to="/legal/confidentialite" style={linkStyle}>
              politique de confidentialité
            </Link>
            .
          </p>
        </Section>

        <Section title="10. Droit applicable">
          <p>
            Ces conditions sont soumises au droit français. En cas de litige, les tribunaux
            français sont compétents. Rien ici ne prive un consommateur des droits que la loi lui
            garantit.
          </p>
        </Section>

        <div style={footerBoxStyle}>
          Voir aussi :{" "}
          <Link to="/legal/mentions" style={linkStyle}>
            Mentions légales
          </Link>{" "}
          ·{" "}
          <Link to="/legal/confidentialite" style={linkStyle}>
            Politique de confidentialité
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

const ulStyle: React.CSSProperties = {
  margin: "10px 0 0 0",
  paddingLeft: 20,
  display: "grid",
  gap: 4,
};

const quoteStyle: React.CSSProperties = {
  margin: "12px 0 0 0",
  padding: "14px 16px",
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderLeft: "3px solid var(--ls-teal)",
  borderRadius: 10,
  fontSize: 13,
  lineHeight: 1.7,
  fontStyle: "italic",
};

const footerBoxStyle: React.CSSProperties = {
  marginTop: 40,
  padding: "16px 18px",
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--ls-text-muted)",
  lineHeight: 1.6,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          margin: "0 0 12px 0",
          paddingBottom: 8,
          borderBottom: "0.5px solid color-mix(in srgb, var(--ls-teal) 25%, var(--ls-border))",
        }}
      >
        {title}
      </h2>
      <div style={{ fontSize: 14, color: "var(--ls-text-muted)", lineHeight: 1.7 }}>{children}</div>
    </section>
  );
}
