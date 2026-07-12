// =============================================================================
// BoutiqueInfosPage — Infos & conditions de la boutique (route publique
// /boutique/:coachSlug/infos). Sections ancrées pointées depuis le footer.
//
// Le pratique (livraison, retours, paiement, contact) est rempli et exact.
// Le légal (mentions, CGV, confidentialité) est un MODÈLE de base : le distri
// doit compléter son identité (raison sociale, adresse, SIRET, email) — marqué
// clairement « à compléter ».
// =============================================================================

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "../styles/boutique.css";
import { getSupabaseClient } from "../services/supabaseClient";
import type { BoutiqueInfo } from "../components/boutique/types";
import {
  COMPANY_NAME,
  COMPANY_ADDRESS,
  COMPANY_DIRECTOR,
  COMPANY_EMAIL,
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

  useEffect(() => {
    document.title = `Infos & conditions · ${shopName}`;
  }, [shopName]);

  const todo = (label: string) => (
    <span className="bk-todo">à compléter par {distri} : {label}</span>
  );

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
          </div>
        </div>
      </header>

      <div className="bk-wrap bk-infos">
        <h1>Infos & conditions</h1>
        <p className="bk-infos-lead">
          Tout ce qu'il faut savoir avant et après ta commande chez {shopName}.
        </p>

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
              Email : <a href={`mailto:${COMPANY_EMAIL}`}><b>{COMPANY_EMAIL}</b></a>
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
            <li>Paiement 100 % sécurisé (Stripe / Square selon la boutique).</li>
            <li>Cartes acceptées : Visa, Mastercard, CB, Apple Pay, Google Pay.</li>
            <li>Tes données bancaires ne transitent jamais par nos serveurs.</li>
            <li>Les prix sont en euros (€), TTC.</li>
          </ul>
        </section>

        <section id="cgv" className="bk-infos-sec">
          <h2>Conditions générales de vente</h2>
          <p>
            Les présentes CGV régissent les ventes réalisées sur cette boutique, éditée par{" "}
            <b>{COMPANY_NAME}</b> ({COMPANY_ADDRESS}). Toute commande implique l'acceptation des
            présentes conditions. Les produits sont ceux de la gamme HL Skin (Herbalife). Les prix
            sont indiqués en euros TTC ; les frais de port sont précisés avant validation. La vente
            est conclue au paiement. Le droit de rétractation de 14 jours s'applique (voir Retours).
            Réclamations : {COMPANY_EMAIL}. {todo("n° SIRET + médiateur de la consommation")}
          </p>
        </section>

        <section id="mentions" className="bk-infos-sec">
          <h2>Mentions légales</h2>
          <ul>
            <li>Boutique de {distri}, distributeur·rice indépendant·e Herbalife.</li>
            <li>
              Éditeur : <b>{COMPANY_NAME}</b> — {COMPANY_ADDRESS}.
            </li>
            <li>Directeur de la publication : {COMPANY_DIRECTOR}.</li>
            <li>
              Contact : <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>.
            </li>
            <li>
              Hébergement : {HOSTING_PROVIDER} — {HOSTING_REGION} ; front Vercel.
            </li>
            <li>Marque & produits : HL Skin / Herbalife International.</li>
            <li>{todo("n° SIRET / RCS")}</li>
          </ul>
        </section>

        <section id="confidentialite" className="bk-infos-sec">
          <h2>Politique de confidentialité</h2>
          <ul>
            <li>
              Responsable de traitement : <b>{COMPANY_NAME}</b>.
            </li>
            <li>
              Données collectées : prénom, nom, email, adresse et téléphone — uniquement pour traiter
              ta commande et te tenir informée.
            </li>
            <li>Elles ne sont ni revendues ni cédées à des tiers à des fins commerciales.</li>
            <li>Hébergement des données en Union européenne ({HOSTING_REGION}).</li>
            <li>
              Tu peux demander l'accès, la rectification ou la suppression de tes données à tout
              moment (RGPD) en écrivant à <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>.
            </li>
          </ul>
        </section>

        <div style={{ margin: "34px 0 60px" }}>
          <Link className="bk-btn bk-btn-primary" to={`/boutique/${coachSlug}`} style={{ textDecoration: "none" }}>
            ← Retour à la boutique
          </Link>
        </div>
      </div>
    </div>
  );
}
