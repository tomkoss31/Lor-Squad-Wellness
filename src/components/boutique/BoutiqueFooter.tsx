// =============================================================================
// BoutiqueFooter — pied de page e-commerce complet (partagé vitrine / produit /
// affiliation). Colonnes nav + aide + légal + moyens de paiement + copyright.
// Les liens légaux pointent vers la page /boutique/:slug/infos (ancres).
// =============================================================================

import { Link } from "react-router-dom";

export function BoutiqueFooter({
  coachSlug,
  shopName,
  distriFirstName,
  aiScanUrl,
}: {
  coachSlug?: string;
  shopName: string;
  distriFirstName?: string | null;
  aiScanUrl?: string | null;
}) {
  const base = `/boutique/${coachSlug ?? ""}`;
  const infos = `${base}/infos`;
  const year = "2026";

  return (
    <footer className="bk-footer">
      <div className="bk-wrap bk-foot-grid">
        {/* Marque + paiement */}
        <div className="bk-foot-brand">
          <div className="bk-mark" style={{ fontSize: 20 }}>
            {shopName}
          </div>
          <p className="bk-foot-tag">
            Skincare coréen HL Skin{distriFirstName ? ` · par ${distriFirstName}` : ""}. Une peau
            nette et repulpée, sans les dix étapes.
          </p>
          <div className="bk-foot-pays" aria-label="Moyens de paiement">
            {["VISA", "Mastercard", "CB", "Apple Pay", "Google Pay"].map((p) => (
              <span key={p} className="bk-pay-badge">
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* Boutique */}
        <nav className="bk-foot-col" aria-label="Boutique">
          <div className="bk-foot-h">Boutique</div>
          <a href={`${base}#bk-gamme`}>La gamme</a>
          <a href={`${base}#bk-concern`}>Par besoin</a>
          <Link to={`${base}/affiliation`}>Devenir affiliée</Link>
          {aiScanUrl ? (
            <a href={aiScanUrl} target="_blank" rel="noreferrer">
              Diagnostic peau IA
            </a>
          ) : null}
        </nav>

        {/* Aide */}
        <nav className="bk-foot-col" aria-label="Aide">
          <div className="bk-foot-h">Aide</div>
          <Link to={`${infos}#contact`}>Nous contacter</Link>
          <Link to={`${infos}#livraison`}>Livraison & expédition</Link>
          <Link to={`${infos}#retours`}>Retours & remboursement</Link>
          <Link to={`${infos}#paiement`}>Paiement sécurisé</Link>
        </nav>

        {/* Légal */}
        <nav className="bk-foot-col" aria-label="Informations légales">
          <div className="bk-foot-h">Informations</div>
          <Link to={`${infos}#cgv`}>Conditions de vente</Link>
          <Link to={`${infos}#mentions`}>Mentions légales</Link>
          <Link to={`${infos}#confidentialite`}>Confidentialité</Link>
        </nav>
      </div>

      <div className="bk-wrap bk-foot-bottom">
        <div>
          © {year} {shopName} · HL Skin
        </div>
        <div>Propulsé par La Base 360 · chaque distributrice a sa boutique</div>
      </div>
    </footer>
  );
}
