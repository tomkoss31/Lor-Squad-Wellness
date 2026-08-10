// =============================================================================
// ClubCardCheckout — achat d'une carte de visites depuis le site public.
//
// Deux champs seulement (prénom + email) avant de partir chez Square. Pourquoi
// les demander plutôt que de laisser le fournisseur les collecter :
//   • sans email, on ne peut pas envoyer À L'ACHETEUR le mail qui lui sert de
//     preuve d'achat au comptoir — c'est tout l'intérêt du dispositif ;
//   • sans prénom, le mail interne dit « quelqu'un a payé 80 € » et il faut
//     aller fouiller dans Square pour savoir qui.
//
// Le PRIX n'est jamais envoyé : l'edge le lit dans clubs.settings.cards. Ce
// composant ne l'affiche que pour confirmer à la personne ce qu'elle achète.
// =============================================================================

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Prix par visite à la française, sans décimales inutiles : 8 € / 6,17 €. */
export function formatPerVisit(v: number): string {
  return (Number.isInteger(v) ? String(v) : v.toFixed(2)).replace(".", ",");
}

export interface CardOffer {
  type: 10 | 30;
  priceEur: number;
  validityDays: number;
}

/** Messages par code d'erreur de l'edge. Le défaut couvre l'imprévu. */
const MESSAGES: Record<string, string> = {
  prenom_requis: "Il nous faut ton prénom.",
  email_invalide: "Cette adresse email ne semble pas valide.",
  trop_de_tentatives: "Plusieurs liens ont déjà été créés pour cette adresse. Réessaie dans une heure, ou appelle-nous.",
  encaissement_inactif: "Le paiement en ligne n'est pas disponible pour le moment — appelle-nous au 06 79 44 87 59, on s'occupe de toi.",
  encaissement_incomplet: "Le paiement en ligne n'est pas disponible pour le moment — appelle-nous au 06 79 44 87 59, on s'occupe de toi.",
  fournisseur_non_supporte: "Le paiement en ligne n'est pas disponible pour le moment — appelle-nous au 06 79 44 87 59, on s'occupe de toi.",
  fournisseur_indisponible: "Notre prestataire de paiement ne répond pas. Réessaie dans un instant.",
};
const DEFAULT_MESSAGE = "Le paiement n'a pas pu démarrer. Réessaie, ou appelle-nous au 06 79 44 87 59.";

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 46,
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid var(--hair, #E7E1D6)",
  background: "#fff",
  color: "var(--ink)",
  fontSize: 16, // 16 px minimum : en dessous, iOS zoome tout seul sur le champ.
  fontFamily: "inherit",
};

export function ClubCardCheckout({ offer, onClose }: { offer: CardOffer; onClose: () => void }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Le focus entre dans la modale, et Échap en sort : sans ça, au clavier on
  // continue de naviguer dans la page derrière le voile.
  useEffect(() => {
    firstFieldRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    // Honeypot : rempli = robot. On fait semblant de travailler et on s'arrête.
    if ((form.elements.namedItem("site") as HTMLInputElement | null)?.value) {
      onClose();
      return;
    }
    const firstName = ((form.elements.namedItem("first_name") as HTMLInputElement).value || "").trim();
    const email = ((form.elements.namedItem("email") as HTMLInputElement).value || "").trim();
    if (firstName.length < 2) return setError(MESSAGES.prenom_requis);
    if (!EMAIL_RE.test(email)) return setError(MESSAGES.email_invalide);

    setError(null);
    setSending(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("indisponible");
      const { data, error: fnError } = await sb.functions.invoke("create-club-card-payment", {
        body: {
          club_slug: "verdun",
          card_type: offer.type,
          first_name: firstName,
          email,
          redirect_url: `${window.location.origin}/club?carte=payee`,
        },
      });
      const res = data as { url?: string; error?: string } | null;
      if (fnError || !res) throw new Error("transport");
      if (res.error) {
        setError(MESSAGES[res.error] ?? DEFAULT_MESSAGE);
        setSending(false);
        return;
      }
      if (!res.url) throw new Error("sans url");
      // `replace` et non `href` : on ne laisse pas le bouton « précédent »
      // ramener sur un formulaire déjà soumis, qui créerait un 2e lien.
      window.location.replace(res.url);
    } catch {
      setError(DEFAULT_MESSAGE);
      setSending(false);
    }
  }

  // « 8 € » et non « 8,00 € » : la carte de la page affiche « soit 8 € la
  // visite », la modale doit dire exactement le même prix, au caractère près.
  const perVisit = formatPerVisit(offer.priceEur / offer.type);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cl-checkout-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed", inset: 0, zIndex: 200, background: "rgba(23,32,28,.62)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 18,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          background: "var(--cream, #FCF8F1)", borderRadius: 20, padding: "26px 22px 24px",
          width: "100%", maxWidth: 420, boxShadow: "0 24px 70px rgba(23,32,28,.28)",
        }}
      >
        <p style={{ margin: 0, fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 800, color: "var(--orange-h, #E0532A)" }}>
          Carte {offer.type} visites
        </p>
        <h2 id="cl-checkout-title" style={{ margin: "8px 0 0", fontSize: 26, lineHeight: 1.2 }}>
          {offer.priceEur} € — soit {perVisit} € la visite
        </h2>
        <p style={{ margin: "10px 0 18px", fontSize: 15, lineHeight: 1.6, color: "var(--muted2)" }}>
          Valable {offer.validityDays} jours à partir de l'achat, non remboursable. On t'envoie ta preuve d'achat par email — c'est elle qui fait foi au comptoir.
        </p>

        <form onSubmit={onSubmit} noValidate>
          <input type="text" name="site" tabIndex={-1} autoComplete="off" aria-hidden="true"
            style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />

          <label htmlFor="cl-cc-first" style={{ display: "block", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Ton prénom</label>
          <input ref={firstFieldRef} id="cl-cc-first" name="first_name" type="text" required autoComplete="given-name" style={inputStyle} />

          <label htmlFor="cl-cc-email" style={{ display: "block", fontSize: 14, fontWeight: 700, margin: "14px 0 6px" }}>Ton email</label>
          <input id="cl-cc-email" name="email" type="email" required autoComplete="email" inputMode="email" placeholder="ton@email.fr" style={inputStyle} />

          {error ? (
            <p role="alert" style={{ margin: "14px 0 0", fontSize: 14, lineHeight: 1.55, color: "#B3261E" }}>{error}</p>
          ) : null}

          <button type="submit" className="cl-cta" disabled={sending}
            style={{ width: "100%", marginTop: 18, minHeight: 50, opacity: sending ? .7 : 1 }}>
            {sending ? "Préparation du paiement…" : `Payer ${offer.priceEur} €`}
          </button>
          <button type="button" onClick={onClose} disabled={sending}
            style={{ width: "100%", marginTop: 10, minHeight: 44, background: "none", border: "none", font: "inherit", fontSize: 15, color: "var(--muted2)", textDecoration: "underline", cursor: "pointer" }}>
            Annuler
          </button>
        </form>

        <p style={{ margin: "16px 0 0", fontSize: 12.5, lineHeight: 1.6, color: "var(--muted3)", textAlign: "center" }}>
          Paiement sécurisé. Nous ne voyons ni ne stockons ton numéro de carte bancaire.
        </p>
      </div>
    </div>
  );
}
