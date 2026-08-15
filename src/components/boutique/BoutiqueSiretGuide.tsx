// =============================================================================
// BoutiqueSiretGuide — bloc « déclare ton activité VDI » du cockpit boutique.
//
// Pourquoi ce bloc : vendre en ligne suppose une activité déclarée. Une VDI est
// dispensée d'immatriculation au REGISTRE DU COMMERCE (RCS), mais PAS de la
// déclaration de début d'activité au guichet unique INPI — c'est elle qui donne
// le SIRET. La confusion entre les deux est la règle, pas l'exception : d'où ce
// tutoriel, avec les libellés exacts des écrans INPI.
//
// Il devient vert dès que le SIRET est renseigné : le bloc se félicite au lieu
// d'alerter, et ne culpabilise plus celle qui a fait le nécessaire.
// =============================================================================

import { useState } from "react";

const INPI_URL = "https://procedures.inpi.fr/";

export function BoutiqueSiretGuide({ siret }: { siret: string }) {
  const done = siret.replace(/\D/g, "").length === 14;
  const [open, setOpen] = useState(!done);

  const accent = done ? "var(--ls-teal)" : "#F43F5E";
  const wash = done ? "rgba(45,212,191,.09)" : "rgba(244,63,94,.09)";

  return (
    <div
      style={{
        background: wash,
        border: `1px solid ${accent}`,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ fontSize: 22, lineHeight: 1 }} aria-hidden="true">
          {done ? "✅" : "🚨"}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 700,
              fontSize: 16,
              color: "var(--ls-text)",
              marginBottom: 4,
            }}
          >
            {done
              ? "Ton activité est déclarée ✨"
              : "À faire en priorité : déclarer ton activité"}
          </div>
          <p style={{ fontSize: 13.5, color: "var(--ls-text-muted)", lineHeight: 1.65, margin: 0 }}>
            {done ? (
              <>
                Ton SIRET est enregistré, il apparaît sur tes mentions légales. Rien d'autre à
                faire de ce côté.
              </>
            ) : (
              <>
                Pour vendre, il faut une activité déclarée. C'est <b>gratuit</b>, en ligne, et ça
                prend une quinzaine de minutes.
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{
            background: "none",
            border: "none",
            color: "var(--ls-text-muted)",
            fontSize: 12.5,
            cursor: "pointer",
            padding: 4,
            whiteSpace: "nowrap",
          }}
        >
          {open ? "Réduire" : "Voir comment"}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 16, fontSize: 13.5, color: "var(--ls-text)", lineHeight: 1.7 }}>
          {/* La confusion la plus fréquente, dite d'emblée. */}
          <div
            style={{
              background: "var(--ls-surface)",
              border: "0.5px solid var(--ls-border)",
              borderRadius: 12,
              padding: "13px 15px",
              marginBottom: 16,
            }}
          >
            <b>Ne pas confondre deux choses différentes.</b>
            <br />
            En VDI, tu es <b>dispensée d'inscription au registre du commerce (RCS)</b> — ça, c'est
            vrai, tant que tu gagnes moins de 24 030 € par an et pendant tes 3 premières années.
            <br />
            Mais tu dois quand même <b>déclarer ton activité</b> au guichet unique de l'INPI. C'est
            cette déclaration qui te donne ton <b>SIRET</b>. Beaucoup pensent que « pas de RCS » veut
            dire « rien à faire » : c'est l'erreur classique.
          </div>

          <div style={{ fontWeight: 700, marginBottom: 8 }}>Pourquoi ça compte vraiment</div>
          <ul style={{ margin: "0 0 16px", paddingLeft: 18, color: "var(--ls-text-muted)" }}>
            <li>
              La déclaration est à faire <b>dans les 8 jours</b> suivant la signature de ton contrat
              de distributrice.
            </li>
            <li>
              Une activité non déclarée est juridiquement du <b>travail dissimulé</b> : redressement
              des cotisations avec majoration de 25 %, et sanctions pénales pouvant aller jusqu'à
              45 000 € d'amende.
            </li>
            <li>
              Sans SIRET, tu ne peux pas justifier tes revenus, ni déduire tes frais, ni faire valoir
              ton activité auprès d'une banque.
            </li>
          </ul>

          <div style={{ fontWeight: 700, marginBottom: 8 }}>Comment faire — pas à pas</div>
          <ol style={{ margin: "0 0 16px", paddingLeft: 18, color: "var(--ls-text-muted)" }}>
            <li style={{ marginBottom: 6 }}>
              Va sur{" "}
              <a href={INPI_URL} target="_blank" rel="noreferrer" style={{ color: "var(--ls-teal)", fontWeight: 600 }}>
                procedures.inpi.fr
              </a>{" "}
              et connecte-toi avec <b>FranceConnect</b> (ou crée un compte INPI).
            </li>
            <li style={{ marginBottom: 6 }}>
              Choisis de <b>déclarer une création d'entreprise</b>, personne physique.
            </li>
            <li style={{ marginBottom: 6 }}>
              <b>Identité</b> : ne coche <b>pas</b> « Entrepreneur non-sédentaire ». Assurance
              maladie : « Régime général ». Adresse de l'entreprise = ton domicile.
            </li>
            <li style={{ marginBottom: 6 }}>
              <b>Insaisissabilité</b> : répondre <b>Non</b> (valeur par défaut).
            </li>
            <li style={{ marginBottom: 6 }}>
              <b>Établissement → activité</b>, les 4 cases dans cet ordre :
              <div
                style={{
                  background: "var(--ls-surface)",
                  border: "0.5px solid var(--ls-border)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  margin: "8px 0",
                  fontSize: 13,
                  color: "var(--ls-text)",
                }}
              >
                Commerce et artisanat de détail → <b>Vente à domicile</b> → <b>Mandataire</b> →{" "}
                <b>Non inscrit au RCS</b>
              </div>
              Date de début = date de signature de ton contrat. Exercice : « Permanente ». Activité
              non-sédentaire : Non.
              <div style={{ marginTop: 6 }}>
                Ces choix donnent le code APE <b>4799A — Vente à domicile</b>, celui de l'activité
                de distributrice.
              </div>
            </li>
            <li style={{ marginBottom: 6 }}>
              <b>Options fiscales</b> : imposition en <b>BNC</b> (« Régime spécial » si tu gagnes
              moins de 77 700 €). Franchise de TVA possible sous 36 800 €. Déclarations
              trimestrielles : Oui.
            </li>
            <li style={{ marginBottom: 6 }}>
              <b>Pièces jointes</b> : ta carte d'identité ou ton passeport.
            </li>
            <li>Vérifie le récapitulatif et valide.</li>
          </ol>

          <div
            style={{
              background: "var(--ls-surface)",
              border: "0.5px solid var(--ls-border)",
              borderRadius: 12,
              padding: "13px 15px",
              marginBottom: 16,
            }}
          >
            <b>Ensuite</b> — tu reçois ton <b>SIRET</b> par courrier sous quelques semaines, avec ta
            fiche INSEE et un courrier du Service des Impôts des Entreprises. Dès que tu l'as, reviens
            le coller ici : il s'affichera automatiquement sur tes mentions légales.
            <div style={{ marginTop: 8, color: "var(--ls-teal)", fontWeight: 600 }}>
              La déclaration est entièrement gratuite — rien à payer.
            </div>
          </div>

          <a
            href={INPI_URL}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-block",
              background: accent,
              color: "#fff",
              borderRadius: 10,
              padding: "11px 20px",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "Syne, sans-serif",
              textDecoration: "none",
            }}
          >
            Ouvrir le guichet unique INPI →
          </a>

          <p style={{ fontSize: 11.5, color: "var(--ls-text-muted)", marginTop: 12, lineHeight: 1.6 }}>
            Ce guide résume la démarche ; il ne remplace pas un conseil comptable. En cas de doute
            sur ta situation, demande à Thomas.
          </p>
        </div>
      )}
    </div>
  );
}
