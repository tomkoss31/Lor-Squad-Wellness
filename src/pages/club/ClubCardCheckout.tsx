// =============================================================================
// ClubCardCheckout — achat d'une carte de visites depuis le site public.
// Maquette validée par Thomas le 2026-08-10.
//
// POURQUOI CE FORMULAIRE ET PAS DEUX CHAMPS
// La première version ne demandait que prénom + email. Insuffisant, non pas
// pour « collecter des données » mais parce que sans NOM ni TÉLÉPHONE le coach
// ne peut ni retrouver ni créer la fiche client — donc pas attribuer la carte
// dans BBC — et doit rappeler la personne pour obtenir ce qu'on aurait pu lui
// demander pendant qu'elle était là.
//
// CE QU'ON NE DEMANDE PAS, ET C'EST VOULU
// Date de naissance, taille, poids, objectif : ça se remplit au body scan,
// avec un coach en face. Six champs de plus sur un écran de paiement, ce sont
// des ventes perdues pour une information qu'on aura de toute façon.
//
// Le PRIX n'est jamais envoyé : l'edge le lit dans clubs.settings.cards. Il
// n'est affiché ici que pour confirmer à la personne ce qu'elle achète.
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
const INDISPO = "Le paiement en ligne n'est pas disponible pour le moment — appelle-nous au 06 79 44 87 59, on s'occupe de toi.";
const MESSAGES: Record<string, string> = {
  prenom_requis: "Il nous faut ton prénom.",
  nom_requis: "Il nous faut ton nom de famille.",
  telephone_requis: "Ce numéro de téléphone ne semble pas complet.",
  email_invalide: "Cette adresse email ne semble pas valide.",
  trop_de_tentatives: "Plusieurs liens ont déjà été créés pour cette adresse. Réessaie dans une heure, ou appelle-nous.",
  encaissement_inactif: INDISPO,
  encaissement_incomplet: INDISPO,
  fournisseur_non_supporte: INDISPO,
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
const labelStyle: CSSProperties = { display: "block", fontSize: 14, fontWeight: 700, marginBottom: 6 };

function SegButton({ on, children, onClick }: { on: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      style={{
        padding: "12px 8px", borderRadius: 12, minHeight: 46, cursor: "pointer",
        border: `1.5px solid ${on ? "var(--orange, #FF6A2B)" : "var(--hair, #E7E1D6)"}`,
        background: on ? "#FFF3EE" : "#fff",
        color: on ? "var(--orange-h, #FF3B2E)" : "var(--muted, #55605A)",
        fontFamily: "inherit", fontSize: 14.5, fontWeight: on ? 800 : 600,
      }}
    >
      {children}
    </button>
  );
}

export function ClubCardCheckout({ offer, onClose }: { offer: CardOffer; onClose: () => void }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // null = pas encore répondu. On ne présume pas : c'est la réponse qui décide
  // de ce que le coach devra faire, la laisser vide par défaut fausserait tout.
  const [isMember, setIsMember] = useState<boolean | null>(null);
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
    const val = (n: string) => ((form.elements.namedItem(n) as HTMLInputElement).value || "").trim();
    const firstName = val("first_name");
    const lastName = val("last_name");
    const phone = val("phone");
    const email = val("email");
    const consent = (form.elements.namedItem("consent") as HTMLInputElement).checked;

    if (firstName.length < 2) return setError(MESSAGES.prenom_requis);
    if (lastName.length < 2) return setError(MESSAGES.nom_requis);
    if ((phone.match(/\d/g) ?? []).length < 8) return setError(MESSAGES.telephone_requis);
    if (!EMAIL_RE.test(email)) return setError(MESSAGES.email_invalide);
    if (isMember === null) return setError("Dis-nous si tu es déjà venu(e) au club.");
    if (!consent) return setError("Il nous faut ton accord pour conserver ces informations.");

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
          last_name: lastName,
          phone,
          email,
          is_member: isMember,
          // L'edge y ajoute lui-même l'identifiant de commande : c'est ce qui
          // permet à l'écran de retour de savoir ce qui a été acheté.
          redirect_url: `${window.location.origin}/club`,
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
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "18px 18px 40px", overflowY: "auto",
      }}
    >
      <div
        style={{
          background: "var(--cream, #FCF8F1)", borderRadius: 20, padding: "24px 20px 22px",
          width: "100%", maxWidth: 430, margin: "auto",
          boxShadow: "0 24px 70px rgba(23,32,28,.28)",
        }}
      >
        <p style={{ margin: 0, fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 800, color: "var(--orange-h, #E0532A)" }}>
          Carte {offer.type} visites
        </p>
        <h2 id="cl-checkout-title" style={{ margin: "8px 0 0", fontSize: 26, lineHeight: 1.2 }}>
          {offer.priceEur} € — soit {perVisit} € la visite
        </h2>
        <p style={{ margin: "10px 0 18px", fontSize: 14.5, lineHeight: 1.6, color: "var(--muted2)" }}>
          Valable {offer.validityDays} jours à partir de l'achat, non remboursable. On t'envoie ta preuve d'achat par email — c'est elle qui fait foi au comptoir.
        </p>

        <form onSubmit={onSubmit} noValidate>
          <input type="text" name="site" tabIndex={-1} autoComplete="off" aria-hidden="true"
            style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label htmlFor="cl-cc-first" style={labelStyle}>Prénom</label>
              <input ref={firstFieldRef} id="cl-cc-first" name="first_name" type="text" required autoComplete="given-name" style={inputStyle} />
            </div>
            <div>
              <label htmlFor="cl-cc-last" style={labelStyle}>Nom</label>
              <input id="cl-cc-last" name="last_name" type="text" required autoComplete="family-name" style={inputStyle} />
            </div>
          </div>

          <label htmlFor="cl-cc-phone" style={labelStyle}>Téléphone</label>
          <input id="cl-cc-phone" name="phone" type="tel" required autoComplete="tel" inputMode="tel" placeholder="06 12 34 56 78" style={inputStyle} />

          <label htmlFor="cl-cc-email" style={{ ...labelStyle, marginTop: 14 }}>Email</label>
          <input id="cl-cc-email" name="email" type="email" required autoComplete="email" inputMode="email" placeholder="ton@email.fr" style={inputStyle} />

          <p style={{ ...labelStyle, marginTop: 16 }} id="cl-cc-member-label">Tu es déjà venu(e) au club ?</p>
          <div role="group" aria-labelledby="cl-cc-member-label" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <SegButton on={isMember === true} onClick={() => setIsMember(true)}>Oui, déjà membre</SegButton>
            <SegButton on={isMember === false} onClick={() => setIsMember(false)}>Non, jamais</SegButton>
          </div>

          {/* On PROPOSE le body scan sans bloquer l'achat (arbitrage Thomas) :
              le bouton « Payer » reste actif juste en dessous. Quelqu'un qui a
              décidé d'acheter ne doit pas se heurter à une porte fermée. */}
          {isMember === false ? (
            <div style={{ background: "#FFF3EE", border: "1px solid #FFC9B4", borderRadius: 13, padding: "13px 15px", marginTop: 14 }}>
              <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>
                On commence toujours par le body scan — et il est offert.
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 13.5, lineHeight: 1.55, color: "var(--muted)" }}>
                45 min avec un coach pour poser ton objectif. Tu prendras ta carte après, en sachant à quoi elle sert. Tu peux quand même payer maintenant si tu préfères.
              </p>
              <a className="cl-cta" href="/reserver?utm_source=site&amp;from=carte"
                style={{ marginTop: 12, minHeight: 46, fontSize: 14.5 }}>
                Réserver mon body scan offert
              </a>
            </div>
          ) : null}

          {/* Le lien de confidentialité est DEHORS du label, volontairement :
              à l'intérieur, le taper cochait la case en même temps qu'il
              ouvrait la page — mesuré au doigt à 375 px. Un lien dans un label
              hérite de la zone cliquable de la case, les deux se déclenchent. */}
          <label style={{ display: "flex", gap: 9, alignItems: "flex-start", margin: "16px 0 0", fontSize: 13, lineHeight: 1.5, color: "var(--muted)" }}>
            <input type="checkbox" name="consent" required style={{ marginTop: 3, flex: "none", accentColor: "var(--orange, #FF6A2B)" }} />
            <span>J'accepte que le club conserve ces informations pour gérer ma carte et me contacter.</span>
          </label>
          <a href="/legal/confidentialite" target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", minHeight: 44, marginLeft: 27, fontSize: 13 }}>
            Politique de confidentialité
          </a>

          {error ? (
            <p role="alert" style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.55, color: "#B3261E" }}>{error}</p>
          ) : null}

          <button type="submit" className="cl-cta" disabled={sending}
            style={{ width: "100%", marginTop: 16, minHeight: 50, border: "none", font: "inherit", cursor: "pointer", opacity: sending ? .7 : 1 }}>
            {sending ? "Préparation du paiement…" : `Payer ${offer.priceEur} €`}
          </button>
          <button type="button" onClick={onClose} disabled={sending}
            style={{ width: "100%", marginTop: 10, minHeight: 44, background: "none", border: "none", fontFamily: "inherit", fontSize: 15, color: "var(--muted2)", textDecoration: "underline", cursor: "pointer" }}>
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
