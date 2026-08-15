// =============================================================================
// BoutiqueInfosPage — Infos & conditions de la boutique (route publique
// /boutique/:coachSlug/infos). Sections ancrées pointées depuis le footer.
//
// ⚠️ CORRECTION JURIDIQUE 2026-08-11 — à lire avant toute modif de cette page.
// Elle affichait les constantes COMPANY_* (SAS HTM FITLIFE, SIRET et adresse
// personnelle de Thomas) sur la boutique de CHAQUE distributrice. Les CGV de
// Victoria déclaraient donc SAS HTM FITLIFE comme vendeur de ses produits :
// responsabilité contractuelle et réclamations rattachées à Thomas pour des
// ventes qu'il ne réalise pas. 6 commandes réelles étaient déjà passées ainsi.
//
// LE MODÈLE CORRECT, désormais appliqué :
//   • VENDEUR / éditeur de la boutique = LE DISTRIBUTEUR (boutique.legal.*)
//   • Solution technique (plateforme)  = La Base 360 / SAS HTM FITLIFE
//   • Hébergement                      = Supabase (Irlande) + Vercel
//
// RÈGLE ABSOLUE : un champ légal manquant s'affiche comme MANQUANT. On ne
// retombe jamais sur COMPANY_* — ce serait rattribuer la vente à la plateforme.
// =============================================================================

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "../styles/boutique.css";
import { getSupabaseClient } from "../services/supabaseClient";
import type { BoutiqueInfo } from "../components/boutique/types";
import { BoutiqueMobileMenu } from "../components/boutique/BoutiqueMobileMenu";
import { BoutiqueFooter } from "../components/boutique/BoutiqueFooter";
import {
  APP_NAME,
  COMPANY_NAME,
  HOSTING_PROVIDER,
  HOSTING_REGION,
} from "../lib/branding";

type ThemeMode = "light" | "dark";

export function BoutiqueInfosPage() {
  const { coachSlug } = useParams<{ coachSlug?: string }>();
  const [boutique, setBoutique] = useState<BoutiqueInfo | null>(null);
  const [theme] = useState<ThemeMode>(() => {
    try {
      const v = localStorage.getItem("bk-shop-theme");
      return v === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = await getSupabaseClient();
      if (!sb || !coachSlug) return;
      const { data } = await sb.rpc("get_boutique_by_slug", { p_slug: coachSlug });
      if (!cancelled && data) setBoutique(data as BoutiqueInfo);
    })();
    return () => {
      cancelled = true;
    };
  }, [coachSlug]);

  const shopName = boutique?.shop_name ?? "Beauté K Skin";
  const distri = boutique?.first_name ?? "ta distributrice";
  const phone = boutique?.contact_phone?.trim();
  const legal = boutique?.legal ?? null;

  useEffect(() => {
    document.title = `Infos & conditions · ${shopName}`;
  }, [shopName]);

  // Champ légal manquant : on le DIT. Jamais de repli sur les données de la
  // plateforme, qui reviendrait à désigner SAS HTM FITLIFE comme vendeur.
  const manque = (label: string) => (
    <span className="bk-todo">à compléter par {distri} : {label}</span>
  );
  /** Valeur du vendeur, ou mention « manquant » explicite. */
  const v = (value: string | null | undefined, label: string) =>
    value ? <b>{value}</b> : manque(label);

  // Email de contact : celui du vendeur uniquement.
  const contactEmail = legal?.email ?? null;

  return (
    <div className="bk-shop" data-bk-theme={theme}>
      <header className="bk-bar">
        <div className="bk-wrap bk-bar-in">
          <Link className="bk-brand" to={`/boutique/${coachSlug}`}>
            <span>
              <span className="bk-mark">{shopName}</span>
              <span className="bk-by" style={{ display: "block" }}>
                Infos & conditions
              </span>
            </span>
          </Link>
          <div className="bk-bar-actions">
            <Link className="bk-btn bk-btn-ghost" to={`/boutique/${coachSlug}`} style={{ padding: "9px 16px" }}>
              ← Retour
            </Link>
            <BoutiqueMobileMenu
              coachSlug={coachSlug}
              shopName={shopName}
              aiScanUrl={boutique?.ai_scan_url}
            />
          </div>
        </div>
      </header>

      <div className="bk-wrap bk-infos">
        <h1>Infos & conditions</h1>
        <p className="bk-infos-lead">
          Tout ce qu'il faut savoir avant et après ta commande chez {shopName}.
        </p>

        {/* Le visiteur a le droit de savoir à qui il achète. Si le vendeur n'a
            pas renseigné son identité, on le dit — plutôt que d'afficher celle
            de la plateforme, ce qui serait faux. */}
        {boutique && !legal?.complete ? (
          <div className="bk-infos-warn" role="status">
            <b>Identité du vendeur en cours de mise à jour.</b> {distri} finalise ses informations
            légales. Pour toute question avant commande, contacte-la directement
            {phone ? ` au ${phone}` : ""}.
          </div>
        ) : null}

        <section id="contact" className="bk-infos-sec">
          <h2>Nous contacter</h2>
          <p>
            Une question sur un produit, ta routine ou ta commande ? Écris à {distri}, ta
            distributrice — elle te répond personnellement.
          </p>
          <ul>
            {phone ? (
              <li>
                Téléphone / WhatsApp : <b>{phone}</b>
              </li>
            ) : null}
            <li>
              Email :{" "}
              {contactEmail ? (
                <a href={`mailto:${contactEmail}`}>
                  <b>{contactEmail}</b>
                </a>
              ) : (
                manque("email de contact")
              )}
            </li>
            <li>Réponse sous 24–48 h ouvrées.</li>
          </ul>
        </section>

        <section id="livraison" className="bk-infos-sec">
          <h2>Livraison & expédition</h2>
          <ul>
            <li>
              <b>Livraison offerte dès 90 €</b> d'achat. En dessous : <b>8,90 €</b> de frais de port.
            </li>
            <li>Commande préparée et expédiée sous <b>48 h ouvrées</b>.</li>
            <li>Livraison en France métropolitaine (autres zones : contacte {distri}).</li>
            <li>Un email de confirmation t'est envoyé dès la commande validée.</li>
          </ul>
        </section>

        <section id="retours" className="bk-infos-sec">
          <h2>Retours & remboursement</h2>
          <ul>
            <li>
              Tu disposes de <b>14 jours</b> après réception pour changer d'avis (droit de
              rétractation).
            </li>
            <li>
              Les produits doivent être <b>non ouverts</b> et dans leur état d'origine (hygiène des
              cosmétiques et compléments alimentaires).
            </li>
            <li>
              Pour toute demande, contacte {distri} : elle t'indique la marche à suivre et procède au
              remboursement sous 14 jours après réception du retour.
            </li>
          </ul>
        </section>

        <section id="paiement" className="bk-infos-sec">
          <h2>Paiement sécurisé</h2>
          <ul>
            <li>Paiement 100 % sécurisé, traité par un prestataire bancaire agréé (Square ou Stripe selon la boutique).</li>
            <li>Cartes acceptées : Visa, Mastercard, CB, Apple Pay, Google Pay.</li>
            <li>Tes données bancaires ne transitent jamais par nos serveurs.</li>
            <li>Les prix sont en euros (€), TTC.</li>
          </ul>
        </section>

        <section id="cgv" className="bk-infos-sec">
          <h2>Conditions générales de vente</h2>
          <p>
            Les présentes CGV régissent les ventes réalisées sur cette boutique. Le vendeur est{" "}
            {v(legal?.entity_name, "raison sociale du vendeur")}
            {legal?.form ? ` (${legal.form})` : null}
            {legal?.address ? `, ${legal.address}` : <> , {manque("adresse du siège")}</>}
            {legal?.siret ? `, SIRET ${legal.siret}` : <> , {manque("SIRET")}</>}.{" "}
            Toute commande implique l'acceptation des présentes conditions. Les produits sont ceux de
            la gamme HL Skin (Herbalife). Les prix sont indiqués en euros TTC ; les frais de port sont
            précisés avant validation. La vente est conclue au paiement. Le droit de rétractation de
            14 jours s'applique (voir Retours).
          </p>
          <p style={{ marginTop: 10 }}>
            Réclamations :{" "}
            {contactEmail ? (
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            ) : (
              manque("email de réclamation")
            )}
            .
          </p>
          <p style={{ marginTop: 10 }}>
            <b>Médiation de la consommation.</b> Après une réclamation écrite restée sans solution
            sous 30 jours, tu peux saisir gratuitement un médiateur de la consommation :{" "}
            {legal?.mediator_name ? (
              <>
                <b>{legal.mediator_name}</b>
                {legal.mediator_url ? (
                  <>
                    {" — "}
                    <a href={legal.mediator_url} target="_blank" rel="noreferrer">
                      {legal.mediator_url}
                    </a>
                  </>
                ) : null}
              </>
            ) : (
              manque("médiateur de la consommation (obligatoire pour la vente en ligne aux particuliers)")
            )}
            .
          </p>
        </section>

        <section id="mentions" className="bk-infos-sec">
          <h2>Mentions légales</h2>
          <p style={{ marginBottom: 10 }}>
            Cette boutique est éditée et exploitée par {distri}, distributeur·rice indépendant·e
            Herbalife, seul·e vendeur·se des produits proposés ici.
          </p>
          <ul>
            <li>
              Éditeur & vendeur : {v(legal?.entity_name, "raison sociale")}
              {legal?.form ? ` — ${legal.form}` : null}
              {legal?.capital ? ` au capital de ${legal.capital}` : null}.
            </li>
            <li>Siège : {v(legal?.address, "adresse du siège")}.</li>
            <li>SIRET : {v(legal?.siret, "SIRET")}.</li>
            {legal?.rcs ? <li>RCS : {legal.rcs}.</li> : null}
            {legal?.vat ? <li>TVA intracommunautaire : {legal.vat}.</li> : null}
            <li>Directeur de la publication : {v(legal?.director, "directeur de la publication")}.</li>
            <li>
              Contact :{" "}
              {contactEmail ? (
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
              ) : (
                manque("email de contact")
              )}
              .
            </li>
            <li>
              Solution technique : la boutique fonctionne sur la plateforme <b>{APP_NAME}</b>, éditée
              par {COMPANY_NAME}. {COMPANY_NAME} fournit l'outil et n'intervient ni dans la vente,
              ni dans l'expédition, ni dans le service après-vente.
            </li>
            <li>
              Hébergement : {HOSTING_PROVIDER} — {HOSTING_REGION} ; front Vercel Inc.
            </li>
            <li>Marque & produits : HL Skin / Herbalife International.</li>
          </ul>
        </section>

        <section id="confidentialite" className="bk-infos-sec">
          <h2>Politique de confidentialité</h2>
          <ul>
            <li>
              Responsable de traitement : {v(legal?.entity_name, "raison sociale du vendeur")} — c'est{" "}
              {distri} qui collecte tes données pour traiter ta commande.
            </li>
            <li>
              Sous-traitant technique : {COMPANY_NAME} ({APP_NAME}), qui héberge la boutique pour son
              compte et n'utilise pas tes données à ses propres fins.
            </li>
            <li>
              Données collectées : prénom, nom, email, adresse et téléphone — uniquement pour traiter
              ta commande et te tenir informée.
            </li>
            <li>Elles ne sont ni revendues ni cédées à des tiers à des fins commerciales.</li>
            <li>Hébergement des données en Union européenne ({HOSTING_REGION}).</li>
            <li>
              Tu peux demander l'accès, la rectification ou la suppression de tes données à tout
              moment (RGPD) en écrivant à{" "}
              {contactEmail ? (
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
              ) : (
                manque("email de contact RGPD")
              )}
              .
            </li>
          </ul>
        </section>

        <div style={{ margin: "34px 0 20px" }}>
          <Link className="bk-btn bk-btn-primary" to={`/boutique/${coachSlug}`} style={{ textDecoration: "none" }}>
            ← Retour à la boutique
          </Link>
        </div>
      </div>

      <BoutiqueFooter
        coachSlug={coachSlug}
        shopName={shopName}
        distriFirstName={boutique?.first_name}
        aiScanUrl={boutique?.ai_scan_url}
      />
    </div>
  );
}
