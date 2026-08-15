// =============================================================================
// DeclarerMonActivitePage — tuto « Déclarer mon activité de distributrice »
// Route : /declarer-mon-activite (2026-08-11)
//
// ⚠️ POURQUOI CETTE PAGE N'EST PAS DANS /developpement :
// le hub « Mon développement » est en niveau `complet` (cf. appVisibility.ts),
// donc invisible pour tout le monde sauf Thomas. Y ranger ce tuto le rendrait
// mort-né, alors que l'obligation concerne les 15 distris. La page est donc à
// la racine, et les points d'entrée sont le Co-pilote (vu par 100 %) et le
// cockpit boutique.
//
// ⚠️ SOURCE UNIQUE (règle B9) : tout le contenu du tutoriel vit ICI.
// BoutiqueSiretGuide est un simple RACCOURCI vers cette page, pas une copie.
//
// Contenu vérifié sur sources publiques (août 2026) — ne pas modifier les
// chiffres sans re-vérifier : seuil RCS 24 030 € (50 % du PASS), déclaration
// sous 8 jours, code APE 4799A, franchise TVA 36 800 €, micro-BNC 77 700 €.
// =============================================================================

import { useNavigate } from "react-router-dom";

const INPI_URL = "https://procedures.inpi.fr/";

export function DeclarerMonActivitePage() {
  const navigate = useNavigate();

  return (
    <div style={pageWrap}>
      <button type="button" onClick={() => navigate(-1)} style={backBtn}>
        ← Retour
      </button>

      <div style={heroBox}>
        <div style={heroEyebrow}>📋 Obligatoire · 15 minutes · gratuit</div>
        <h1 style={heroTitle}>Déclarer mon activité de distributrice</h1>
        <p style={heroSubtitle}>
          Pour vendre — en ligne comme en direct — ton activité doit être déclarée. C'est
          gratuit, ça se fait en ligne, et ça te donne ton numéro SIRET.
        </p>
      </div>

      {/* La confusion qui bloque presque tout le monde : à dire en premier. */}
      <article style={{ ...sectionCard("#F43F5E"), marginTop: 20 }}>
        <div style={rowHead}>
          <div style={emojiCircle("#F43F5E")}>⚠️</div>
          <h2 style={sectionTitle}>L'erreur que presque tout le monde fait</h2>
        </div>
        <p style={sectionBody}>
          « Je suis VDI, je suis dispensée d'immatriculation, donc je n'ai rien à faire. »
          <br />
          <b>C'est faux — et c'est la confusion la plus répandue.</b> Deux choses différentes se
          cachent derrière ce mot :
        </p>
        <ul style={bulletList}>
          <li style={bulletItem}>
            <b>Le RCS</b> (registre du commerce) : là, tu es bien <b>dispensée</b>, tant que tu
            gagnes moins de <b>24 030 €</b> par an et pendant tes <b>3 premières années civiles</b>.
          </li>
          <li style={bulletItem}>
            <b>La déclaration d'activité</b> au guichet unique de l'INPI : elle, elle est{" "}
            <b>obligatoire dès le départ</b>. C'est elle qui te donne ton <b>SIRET</b>.
          </li>
        </ul>
        <p style={{ ...sectionBody, marginTop: 10, marginBottom: 0 }}>
          Autrement dit : pas de registre du commerce, mais une déclaration quand même.
        </p>
      </article>

      <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
        <article style={sectionCard("var(--ls-gold)")}>
          <div style={rowHead}>
            <div style={emojiCircle("var(--ls-gold)")}>⏱️</div>
            <h2 style={sectionTitle}>Quand, et ce que tu risques sinon</h2>
          </div>
          <p style={sectionBody}>
            La déclaration est due <b>dans les 8 jours</b> qui suivent la signature de ton contrat
            de distributrice. Si tu as démarré il y a plus longtemps, fais-la maintenant : mieux
            vaut tard que jamais, et personne ne viendra te reprocher de régulariser.
          </p>
          <ul style={bulletList}>
            <li style={bulletItem}>
              Une activité non déclarée est juridiquement du <b>travail dissimulé</b> : redressement
              des cotisations avec majoration de 25 %, et sanctions pénales pouvant atteindre
              45 000 € d'amende pour un indépendant.
            </li>
            <li style={bulletItem}>
              Sans SIRET, tu ne peux <b>ni justifier tes revenus</b> (banque, prêt, allocations),{" "}
              <b>ni déduire tes frais</b>.
            </li>
            <li style={bulletItem}>
              Et tu ne peux pas afficher de mentions légales complètes sur ta boutique en ligne.
            </li>
          </ul>
        </article>

        <article style={sectionCard("var(--ls-teal)")}>
          <div style={rowHead}>
            <div style={emojiCircle("var(--ls-teal)")}>🧭</div>
            <h2 style={sectionTitle}>Le pas à pas, écran par écran</h2>
          </div>
          <p style={sectionBody}>
            Tout se passe sur le site officiel de l'INPI. Prévois ta carte d'identité et la date de
            signature de ton contrat.
          </p>
          <ol style={olList}>
            <li style={olItem}>
              Va sur{" "}
              <a href={INPI_URL} target="_blank" rel="noreferrer" style={linkStyle}>
                procedures.inpi.fr
              </a>{" "}
              et connecte-toi avec <b>FranceConnect</b> (le plus simple), ou crée un compte INPI.
            </li>
            <li style={olItem}>
              Choisis <b>déclarer une création d'entreprise</b>, en <b>personne physique</b>.
            </li>
            <li style={olItem}>
              <b>Identité</b> — ne coche <b>PAS</b> « Entrepreneur non-sédentaire ». Assurance
              maladie : <b>Régime général</b>. Adresse de l'entreprise : <b>ton domicile</b>.
            </li>
            <li style={olItem}>
              <b>Insaisissabilité</b> — réponds <b>Non</b> (c'est la valeur par défaut).
            </li>
            <li style={olItem}>
              <b>Établissement → activité</b>. C'est l'étape qui compte : quatre menus à
              enchaîner exactement dans cet ordre.
              <div style={calloutBox}>
                Commerce et artisanat de détail
                <br />→ <b>Vente à domicile</b>
                <br />→ <b>Mandataire</b>
                <br />→ <b>Non inscrit au RCS</b>
              </div>
              Date de début : la date de signature de ton contrat. Exercice :{" "}
              <b>Permanente</b>. Activité non-sédentaire : <b>Non</b>.
              <div style={{ marginTop: 8 }}>
                Cette combinaison donne le code APE <b>4799A — Vente à domicile</b>, celui de
                l'activité de distributrice. Tu n'as pas à le saisir toi-même.
              </div>
            </li>
            <li style={olItem}>
              <b>Options fiscales</b> — imposition en <b>BNC</b> ; choisis le « Régime spécial »
              (micro) si tu gagnes moins de 77 700 €. Franchise de TVA possible sous 36 800 €.
              Déclarations trimestrielles : <b>Oui</b>.
            </li>
            <li style={olItem}>
              <b>Pièces jointes</b> — ta carte d'identité ou ton passeport.
            </li>
            <li style={olItem}>Relis le récapitulatif et valide. C'est fini.</li>
          </ol>
        </article>

        <article style={sectionCard("var(--ls-teal)")}>
          <div style={rowHead}>
            <div style={emojiCircle("var(--ls-teal)")}>📬</div>
            <h2 style={sectionTitle}>Ce qui arrive ensuite</h2>
          </div>
          <ul style={bulletList}>
            <li style={bulletItem}>
              Tu reçois ton <b>SIRET</b> par courrier sous quelques semaines, avec ta fiche INSEE.
            </li>
            <li style={bulletItem}>
              Puis un courrier du <b>Service des Impôts des Entreprises</b>.
            </li>
            <li style={bulletItem}>
              <b>La démarche est entièrement gratuite.</b> Si un site te demande de payer, ce n'est
              pas le bon — le seul officiel est procedures.inpi.fr.
            </li>
            <li style={bulletItem}>
              Dès que tu as ton SIRET, va le coller dans <b>Ma boutique → Mon identité de
              vendeuse</b> : il s'affichera automatiquement sur tes mentions légales.
            </li>
          </ul>
        </article>
      </div>

      <div style={ctaBlock}>
        <h3 style={ctaTitle}>Prête à le faire ?</h3>
        <p style={ctaText}>
          Compte un quart d'heure. Tu peux enregistrer et reprendre plus tard si tu es
          interrompue.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href={INPI_URL} target="_blank" rel="noreferrer" style={btnPrimaryLink}>
            Ouvrir le guichet unique INPI →
          </a>
          <button type="button" onClick={() => navigate("/ma-boutique")} style={btnGhost}>
            Ma boutique
          </button>
        </div>
        <p style={disclaimer}>
          Ce guide résume la démarche officielle ; il ne remplace pas un conseil comptable. En cas
          de doute sur ta situation personnelle, demande à Thomas ou à un expert-comptable.
        </p>
      </div>
    </div>
  );
}

// ─── Styles (alignés sur CheckListExpliquePage / FlexExpliquePage) ──────────

const pageWrap: React.CSSProperties = { maxWidth: 760, margin: "0 auto", padding: "20px 18px 60px" };

const backBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  cursor: "pointer",
  marginBottom: 14,
  padding: 0,
};

const heroBox: React.CSSProperties = {
  background:
    "linear-gradient(135deg, color-mix(in srgb, #F43F5E 12%, var(--ls-surface)), var(--ls-surface))",
  border: "0.5px solid color-mix(in srgb, #F43F5E 30%, var(--ls-border))",
  borderRadius: 18,
  padding: "24px 20px",
};

const heroEyebrow: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 1.4,
  color: "#F43F5E",
  marginBottom: 8,
};

const heroTitle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Anton, sans-serif",
  fontSize: 26,
  fontWeight: 400,
  letterSpacing: "0.01em",
  textTransform: "uppercase",
  color: "var(--ls-text)",
  lineHeight: 1.05,
};

const heroSubtitle: React.CSSProperties = {
  margin: "10px 0 0",
  fontSize: 14,
  lineHeight: 1.6,
  color: "var(--ls-text-muted)",
};

const sectionCard = (accent: string): React.CSSProperties => ({
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderLeft: `3px solid ${accent}`,
  borderRadius: 14,
  padding: "18px 20px",
});

const rowHead: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 10,
};

const emojiCircle = (accent: string): React.CSSProperties => ({
  width: 40,
  height: 40,
  borderRadius: 12,
  background: `color-mix(in srgb, ${accent} 14%, var(--ls-surface2))`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 20,
  flexShrink: 0,
});

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 18,
  fontWeight: 700,
  color: "var(--ls-text)",
};

const sectionBody: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: 14,
  lineHeight: 1.65,
  color: "var(--ls-text)",
};

// ⚠️ listStyleType explicite : le reset Tailwind pose `ol,ul,menu{list-style:none}`
// globalement. Et surtout PAS de `display:flex` sur la liste — il supprime les
// marqueurs. L'espacement passe donc par marginBottom sur les <li>.
// Sans ça, un pas à pas s'affiche sans ses numéros (constaté en rendu réel).
const bulletList: React.CSSProperties = {
  margin: 0,
  paddingLeft: 20,
  listStyleType: "disc",
};

const bulletItem: React.CSSProperties = {
  fontSize: 13.5,
  lineHeight: 1.6,
  color: "var(--ls-text-muted)",
  marginBottom: 8,
};

const olList: React.CSSProperties = {
  margin: 0,
  paddingLeft: 22,
  listStyleType: "decimal",
};

const olItem: React.CSSProperties = {
  fontSize: 13.5,
  lineHeight: 1.65,
  color: "var(--ls-text-muted)",
  marginBottom: 12,
  paddingLeft: 4,
};

const calloutBox: React.CSSProperties = {
  background: "var(--ls-surface2, var(--ls-bg))",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 10,
  padding: "12px 14px",
  margin: "10px 0",
  fontSize: 13.5,
  lineHeight: 1.8,
  color: "var(--ls-text)",
};

const linkStyle: React.CSSProperties = {
  color: "var(--ls-teal)",
  fontWeight: 700,
  textDecoration: "none",
};

const ctaBlock: React.CSSProperties = {
  marginTop: 24,
  padding: "22px 20px",
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-teal) 12%, var(--ls-surface)), var(--ls-surface))",
  border: "0.5px solid color-mix(in srgb, var(--ls-teal) 30%, var(--ls-border))",
  borderRadius: 16,
};

const ctaTitle: React.CSSProperties = {
  margin: "0 0 8px",
  fontFamily: "Syne, sans-serif",
  fontSize: 20,
  fontWeight: 800,
  color: "var(--ls-text)",
};

const ctaText: React.CSSProperties = {
  margin: "0 0 16px",
  fontSize: 14,
  color: "var(--ls-text-muted)",
  lineHeight: 1.55,
};

const btnPrimaryLink: React.CSSProperties = {
  display: "inline-block",
  padding: "12px 22px",
  borderRadius: 12,
  border: "none",
  background: "var(--ls-teal)",
  color: "#04120f",
  fontFamily: "Syne, sans-serif",
  fontSize: 14,
  fontWeight: 700,
  textDecoration: "none",
};

const btnGhost: React.CSSProperties = {
  padding: "12px 18px",
  borderRadius: 12,
  border: "0.5px solid var(--ls-border)",
  background: "transparent",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const disclaimer: React.CSSProperties = {
  margin: "14px 0 0",
  fontSize: 11.5,
  lineHeight: 1.6,
  color: "var(--ls-text-muted)",
};
