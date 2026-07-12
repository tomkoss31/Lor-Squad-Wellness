// =============================================================================
// BoutiqueBundles — section « Kits routine » (packs à prix groupé).
// Un bundle est une entrée shop_products avec bundle_items (slugs inclus).
// On affiche les produits inclus (mini-thumbs), le prix pack, et l'économie
// vs la somme des produits à l'unité. « Ajouter » = ajoute le kit au panier
// (traité comme un produit → prix recalculé serveur).
// =============================================================================

import { formatEuro } from "../../lib/format";
import type { ShopProduct } from "./types";

export function BoutiqueBundles({
  bundles,
  products,
  onAdd,
}: {
  bundles: ShopProduct[];
  products: ShopProduct[];
  onAdd: (id: string) => void;
}) {
  if (bundles.length === 0) return null;
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  return (
    <section id="bk-kits" className="bk-wrap bk-sec bk-reveal">
      <div className="bk-sec-head">
        <div>
          <div className="bk-eyebrow" style={{ marginBottom: 12 }}>
            Routines prêtes
          </div>
          <h2>Les kits, malins et complets.</h2>
        </div>
        <p>La routine assemblée pour toi, à prix groupé. Tu économises vs l'achat à l'unité.</p>
      </div>

      <div className="bk-kits">
        {bundles.map((b) => {
          const items = (b.bundle_items ?? [])
            .map((s) => bySlug.get(s))
            .filter((p): p is ShopProduct => !!p);
          const sum = items.reduce((s, p) => s + Number(p.price_ttc), 0);
          const save = Math.max(0, sum - Number(b.price_ttc));
          return (
            <div className="bk-kit" key={b.id}>
              <div className="bk-kit-head">
                <div className="bk-kit-thumbs">
                  {items.map((p) => (
                    <span className="bk-kit-th" key={p.id}>
                      {p.images[0]?.url ? (
                        <img src={p.images[0].url} alt={p.name} loading="lazy" />
                      ) : (
                        <span className="bk-kit-th-fb">{p.name.charAt(0)}</span>
                      )}
                    </span>
                  ))}
                </div>
                {save > 0 && <span className="bk-kit-save">−{formatEuro(save)}</span>}
              </div>

              <h3>{b.name}</h3>
              {b.tagline && <p className="bk-kit-tag">{b.tagline}</p>}

              <ul className="bk-kit-list">
                {items.map((p) => (
                  <li key={p.id}>
                    <span>✦</span> {p.name}
                  </li>
                ))}
              </ul>

              <div className="bk-kit-foot">
                <div className="bk-kit-price">
                  <span className="bk-price bk-tnum">{formatEuro(b.price_ttc)}</span>
                  {sum > Number(b.price_ttc) && (
                    <span className="bk-kit-was bk-tnum">{formatEuro(sum)}</span>
                  )}
                </div>
                <button className="bk-add" onClick={() => onAdd(b.id)}>
                  Ajouter le kit
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
