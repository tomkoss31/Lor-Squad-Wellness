// Formulaire de checkout boutique HL SKIN (Étape 4).
// Capture email + prénom + adresse AVANT le paiement (lead récupéré même en cas
// d'abandon). Appelle l'edge create-shop-checkout qui recalcule tout côté serveur
// et renvoie l'URL Stripe (compte du distri), ou un fallback si pas de paiement.

import { useMemo, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { formatEuro } from "../../lib/format";
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_COST,
  type AppliedPromo,
  type ShopProduct,
} from "./types";
import type { CartMap } from "./useCart";

type Props = {
  slug: string;
  products: ShopProduct[];
  cart: CartMap;
  promo: AppliedPromo | null;
  onClose: () => void;
  onBack: () => void;
};

export function CheckoutForm({ slug, products, cart, promo, onClose, onBack }: Props) {
  const [idempotencyKey] = useState(() => {
    try {
      return crypto.randomUUID();
    } catch {
      return `${slug}-${Object.keys(cart).join("")}`;
    }
  });
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [postal, setPostal] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("France");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const lines = useMemo(
    () =>
      Object.keys(cart)
        .map((id) => ({ p: products.find((x) => x.id === id), qty: cart[id] }))
        .filter((l): l is { p: ShopProduct; qty: number } => !!l.p && l.qty > 0),
    [cart, products],
  );
  const subtotal = lines.reduce((s, l) => s + l.p.price_ttc * l.qty, 0);
  const discount = promo
    ? Math.min(
        Math.round((promo.kind === "amount" ? promo.value : (subtotal * promo.value) / 100) * 100) / 100,
        subtotal,
      )
    : 0;
  const afterDiscount = subtotal - discount;
  const freeShip = afterDiscount >= FREE_SHIPPING_THRESHOLD;
  const shipping = lines.length === 0 || freeShip ? 0 : SHIPPING_COST;
  const total = afterDiscount + shipping;

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit =
    emailOk && firstName.trim() && line1.trim() && postal.trim() && city.trim() && lines.length > 0;

  async function submit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setMessage(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("no client");
      const { data, error } = await sb.functions.invoke("create-shop-checkout", {
        body: {
          slug,
          items: lines.map((l) => ({ product_id: l.p.id, quantity: l.qty })),
          customer: {
            email: email.trim(),
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim(),
            address: {
              line1: line1.trim(),
              line2: line2.trim(),
              postal_code: postal.trim(),
              city: city.trim(),
              country: country.trim(),
            },
          },
          promo_code: promo?.code ?? null,
          redirect_base: `${window.location.origin}/boutique/${slug}`,
          idempotency_key: idempotencyKey,
        },
      });
      if (error) throw error;
      const res = data as { url?: string; fallback?: boolean; error?: string };
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
      if (res?.fallback) {
        setMessage({
          text: "Ta commande est enregistrée ✓ Cette boutique n'accepte pas encore le paiement en ligne — la coach te recontacte pour finaliser.",
          ok: true,
        });
      } else {
        setMessage({ text: "Une erreur est survenue. Réessaie dans un instant.", ok: false });
      }
    } catch {
      setMessage({ text: "Impossible de lancer le paiement, réessaie.", ok: false });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="bk-qvm"
      role="dialog"
      aria-modal="true"
      aria-label="Finaliser ma commande"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bk-checkout">
        <button className="bk-close" onClick={onClose} aria-label="Fermer">
          ×
        </button>
        <div className="bk-co-head">
          <button className="bk-back" onClick={onBack}>
            ← Panier
          </button>
          <h2>Finaliser ma commande</h2>
          <div className="bk-co-recap">
            {lines.reduce((s, l) => s + l.qty, 0)} article(s) · Total{" "}
            <b>{formatEuro(total)}</b>
            {discount > 0 && <span className="bk-co-disc"> (−{formatEuro(discount)} {promo?.code})</span>}
          </div>
        </div>

        <div className="bk-co-body">
          <div className="bk-co-sec-t">Tes coordonnées</div>
          <input
            className="bk-field"
            type="email"
            placeholder="Email *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <div className="bk-fieldrow">
            <input
              className="bk-field"
              placeholder="Prénom *"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
            />
            <input
              className="bk-field"
              placeholder="Nom"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
            />
          </div>
          <input
            className="bk-field"
            placeholder="Téléphone (facultatif)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />

          <div className="bk-co-sec-t">Adresse de livraison</div>
          <input
            className="bk-field"
            placeholder="Adresse *"
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
            autoComplete="address-line1"
          />
          <input
            className="bk-field"
            placeholder="Complément (facultatif)"
            value={line2}
            onChange={(e) => setLine2(e.target.value)}
            autoComplete="address-line2"
          />
          <div className="bk-fieldrow">
            <input
              className="bk-field"
              placeholder="Code postal *"
              value={postal}
              onChange={(e) => setPostal(e.target.value)}
              autoComplete="postal-code"
              style={{ maxWidth: 140 }}
            />
            <input
              className="bk-field"
              placeholder="Ville *"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              autoComplete="address-level2"
            />
          </div>
          <input
            className="bk-field"
            placeholder="Pays"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            autoComplete="country-name"
          />

          {message && (
            <div className={`bk-co-msg ${message.ok ? "bk-ok" : "bk-err"}`}>{message.text}</div>
          )}
        </div>

        <div className="bk-co-foot">
          <button className="bk-co" onClick={submit} disabled={!canSubmit || loading}>
            {loading ? "Redirection…" : `Payer ${formatEuro(total)}`}
          </button>
          <div className="bk-cosec">
            <span>🔒 Paiement sécurisé Stripe</span>
            <span>Tes infos servent à l'expédition</span>
          </div>
        </div>
      </div>
    </div>
  );
}
