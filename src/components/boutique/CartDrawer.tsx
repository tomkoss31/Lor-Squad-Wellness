// Panier coulissant de la boutique HL SKIN (Étape 3).
// Jauge frais de port, code promo (validation SERVEUR via RPC), cross-sell,
// totaux. Le checkout (email/adresse/Stripe) arrive à l'Étape 4.

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { formatEuro, formatEuroCompact } from "../../lib/format";
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_COST,
  type AppliedPromo,
  type ShopProduct,
} from "./types";
import type { CartMap } from "./useCart";

type Props = {
  onClose: () => void;
  products: ShopProduct[];
  cart: CartMap;
  add: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  coachUserId: string | null;
  onCheckout: (promo: AppliedPromo | null) => void;
};

const PROMO_ERRORS: Record<string, string> = {
  unknown: "Code inconnu.",
  expired: "Ce code a expiré.",
  not_started: "Ce code n'est pas encore actif.",
  used_up: "Ce code a atteint sa limite d'utilisation.",
  missing: "Saisis un code.",
};

function emoji(p: ShopProduct): string {
  const n = p.name.toLowerCase();
  if (n.includes("collagen")) return "🌿";
  if (n.includes("sérum") || n.includes("serum")) return "💧";
  if (n.includes("gel")) return "🫧";
  if (n.includes("yeux")) return "👁️";
  if (n.includes("lotion")) return "🧴";
  return "✨";
}

export function CartDrawer({
  onClose,
  products,
  cart,
  add,
  setQty,
  remove,
  coachUserId,
  onCheckout,
}: Props) {
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [promoMsg, setPromoMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const lines = useMemo(
    () =>
      Object.keys(cart)
        .map((id) => ({ product: products.find((p) => p.id === id), qty: cart[id] }))
        .filter((l): l is { product: ShopProduct; qty: number } => !!l.product && l.qty > 0),
    [cart, products],
  );

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.product.price_ttc * l.qty, 0),
    [lines],
  );
  const discount = useMemo(() => {
    if (!promo) return 0;
    const raw = promo.kind === "amount" ? promo.value : (subtotal * promo.value) / 100;
    return Math.min(Math.round(raw * 100) / 100, subtotal);
  }, [promo, subtotal]);

  const afterDiscount = subtotal - discount;
  const freeShip = afterDiscount >= FREE_SHIPPING_THRESHOLD;
  const shipping = lines.length === 0 || freeShip ? 0 : SHIPPING_COST;
  const remain = Math.max(0, FREE_SHIPPING_THRESHOLD - afterDiscount);
  const pct = Math.min(100, (afterDiscount / FREE_SHIPPING_THRESHOLD) * 100);
  const total = afterDiscount + shipping;

  const crossSell = useMemo(
    () => products.find((p) => !cart[p.id]) ?? null,
    [products, cart],
  );

  async function applyPromo() {
    const code = promoInput.trim();
    if (!code) {
      setPromo(null);
      setPromoMsg({ text: PROMO_ERRORS.missing, ok: false });
      return;
    }
    if (!coachUserId) {
      setPromoMsg({ text: "Les codes ne sont pas disponibles sur cette boutique.", ok: false });
      return;
    }
    setChecking(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("no client");
      const { data, error } = await sb.rpc("validate_promo_code", {
        p_coach_user_id: coachUserId,
        p_code: code,
      });
      if (error) throw error;
      const res = data as { valid: boolean; reason?: string; code?: string; kind?: string; value?: number };
      if (res?.valid) {
        setPromo({ code: res.code!, kind: res.kind!, value: Number(res.value) });
        setPromoMsg({ text: `Code ${res.code} appliqué`, ok: true });
      } else {
        setPromo(null);
        setPromoMsg({ text: PROMO_ERRORS[res?.reason ?? "unknown"] ?? PROMO_ERRORS.unknown, ok: false });
      }
    } catch {
      setPromoMsg({ text: "Impossible de vérifier le code, réessaie.", ok: false });
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <div className="bk-scrim" onClick={onClose} />
      <aside className="bk-drawer" role="dialog" aria-modal="true" aria-label="Panier">
        <div className="bk-dh">
          <h3>Ton panier</h3>
          <button className="bk-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>

        <div className="bk-dbody">
          {lines.length === 0 ? (
            <div className="bk-empty">
              <div className="bk-circ">🧴</div>
              <div>
                <b style={{ color: "var(--ink)" }}>Ton panier est vide</b>
                <br />
                La routine éclat commence par un geste.
              </div>
            </div>
          ) : (
            <>
              {lines.map(({ product: p, qty }) => (
                <div className="bk-li" key={p.id}>
                  <div className="bk-im">
                    {p.images[0]?.url ? <img src={p.images[0].url} alt="" /> : emoji(p)}
                  </div>
                  <div>
                    <div className="bk-nm">{p.name}</div>
                    <div className="bk-mt">
                      {p.volume_label ? `${p.volume_label} · ` : ""}
                      {formatEuro(p.price_ttc)}
                    </div>
                    <button className="bk-rm" onClick={() => remove(p.id)}>
                      Retirer
                    </button>
                  </div>
                  <div className="bk-rt">
                    <span className="bk-pr bk-tnum">{formatEuro(p.price_ttc * qty)}</span>
                    <div className="bk-qty">
                      <button onClick={() => setQty(p.id, qty - 1)} aria-label="Retirer un">
                        −
                      </button>
                      <span className="bk-tnum">{qty}</span>
                      <button onClick={() => setQty(p.id, qty + 1)} aria-label="Ajouter un">
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {crossSell && (
                <div className="bk-xsell">
                  <div className="bk-xt">Complète ta routine</div>
                  <div className="bk-xrow">
                    <div className="bk-xi">{emoji(crossSell)}</div>
                    <div className="bk-xn">
                      <b>{crossSell.name}</b>
                      <span>{formatEuro(crossSell.price_ttc)}</span>
                    </div>
                    <button className="bk-xa" onClick={() => add(crossSell.id)} aria-label="Ajouter">
                      +
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {lines.length > 0 && (
          <div className="bk-dfoot">
            <div className={`bk-ship${freeShip ? " bk-free" : ""}`}>
              <div className="bk-top">
                <span className="bk-lead">
                  Ajoute <b>{formatEuro(remain)}</b> pour la livraison offerte
                </span>
                <span className="bk-amt">{formatEuroCompact(FREE_SHIPPING_THRESHOLD)}</span>
              </div>
              <div className="bk-track">
                <div className="bk-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="bk-won">✓ Livraison offerte débloquée</div>
            </div>

            <div className="bk-promo">
              <input
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                placeholder="Code promo"
                aria-label="Code promo"
              />
              <button onClick={applyPromo} disabled={checking}>
                {checking ? "…" : "Appliquer"}
              </button>
            </div>
            {promoMsg && (
              <div className={`bk-pmsg ${promoMsg.ok ? "bk-ok" : "bk-err"}`}>{promoMsg.text}</div>
            )}

            <div className="bk-row">
              <span>Sous-total</span>
              <span className="bk-tnum">{formatEuro(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="bk-row bk-disc">
                <span>Réduction · {promo?.code}</span>
                <span className="bk-tnum">−{formatEuro(discount)}</span>
              </div>
            )}
            <div className="bk-row">
              <span>Livraison</span>
              <span className="bk-tnum">{freeShip ? "Offerte" : formatEuro(shipping)}</span>
            </div>
            <div className="bk-row bk-tot">
              <span>Total</span>
              <span className="bk-v bk-tnum">{formatEuro(total)}</span>
            </div>

            <button className="bk-co" onClick={() => onCheckout(promo)}>
              Passer au paiement · {formatEuro(total)}
            </button>
            <div className="bk-pays" aria-label="Moyens de paiement acceptés">
              <span className="bk-pays-label">Paiement sécurisé</span>
              <span className="bk-pay">CB</span>
              <span className="bk-pay">Visa</span>
              <span className="bk-pay">Mastercard</span>
              <span className="bk-pay"> Pay</span>
              <span className="bk-pay">G&nbsp;Pay</span>
            </div>
            <div className="bk-cosec">
              <span>🔒 Stripe</span>
              <span>↩︎ Retours 14 j</span>
              <span>🚚 Expédié en 48 h</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
