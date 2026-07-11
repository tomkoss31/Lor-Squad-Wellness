// Fiche produit en « vue rapide » (PDP) — modale lecture seule (Étape 2).
// L'ajout au panier arrive à l'Étape 3 (panier) : ici on affiche l'anatomie
// complète (galerie, bénéfices, actif héros, mode d'emploi, FAQ, réassurance).

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatEuro } from "../../lib/format";
import type { ShopProduct } from "./types";

type Props = {
  product: ShopProduct;
  onClose: () => void;
  onAdd: (id: string) => void;
  coachSlug?: string;
};

export function ProductQuickView({ product, onClose, onAdd, coachSlug }: Props) {
  const [bigIdx, setBigIdx] = useState(0);
  // Fermeture au clavier + verrou du scroll body.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const hasRating = typeof product.rating === "number" && product.reviews_count > 0;

  return (
    <div
      className="bk-qvm"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bk-pdp">
        <button className="bk-close" onClick={onClose} aria-label="Fermer">
          ×
        </button>

        {/* Média : galerie (photos réelles si dispo, sinon flacon stylisé) */}
        <div className="bk-pdp-media">
          <div className="bk-big">
            {product.images[bigIdx]?.url ? (
              <img
                src={product.images[bigIdx].url}
                alt={product.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 16 }}
              />
            ) : (
              <div className="bk-bottle" aria-hidden="true" />
            )}
          </div>
          {product.images.length > 1 && (
            <div className="bk-thumbs">
              {product.images.map((img, i) => (
                <button
                  className="bk-th"
                  key={img.url}
                  onClick={() => setBigIdx(i)}
                  style={{ borderColor: bigIdx === i ? "var(--jade)" : undefined, cursor: "pointer" }}
                >
                  <img
                    src={img.url}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 9 }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Infos produit */}
        <div className="bk-pdp-info">
          {hasRating && (
            <div className="bk-rate">
              <span className="bk-stars">★★★★★</span>{" "}
              {product.rating!.toString().replace(".", ",")} · {product.reviews_count} avis
            </div>
          )}
          <h2>{product.name}</h2>
          {product.volume_label && <div className="bk-vol">{product.volume_label}</div>}
          <div className="bk-pdp-price bk-tnum">{formatEuro(product.price_ttc)}</div>

          {product.benefits.length > 0 && (
            <ul className="bk-ben">
              {product.benefits.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}

          <button className="bk-pdp-add" onClick={() => onAdd(product.id)}>
            Ajouter au panier · {formatEuro(product.price_ttc)}
          </button>

          {product.ingredient_hero && (
            <div className="bk-pdp-sec">
              <h4>L'actif héros</h4>
              <p>{product.ingredient_hero}</p>
            </div>
          )}
          {product.how_to && (
            <div className="bk-pdp-sec">
              <h4>Mode d'emploi</h4>
              <p>{product.how_to}</p>
            </div>
          )}
          {product.faq.length > 0 && (
            <div className="bk-pdp-sec bk-faq">
              <h4>Questions fréquentes</h4>
              {product.faq.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          )}
          <div className="bk-pdp-sec">
            <h4>Réassurance</h4>
            <p>🔒 Paiement Stripe sécurisé · ↩︎ Retours 14 j · 🚚 Expédié en 48 h</p>
          </div>

          {coachSlug && (
            <Link
              to={`/boutique/${coachSlug}/produit/${product.slug}`}
              onClick={onClose}
              style={{
                display: "block",
                textAlign: "center",
                marginTop: 10,
                fontSize: 13,
                color: "var(--jade-deep)",
              }}
            >
              Voir la page complète →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
