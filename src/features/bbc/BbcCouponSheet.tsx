// =============================================================================
// La feuille de saisie d'un coupon — et son ENCHAÎNEMENT.
//
// C'est le cœur du chantier, pas un détail d'ergonomie. Thomas relève une boîte
// de neuf coupons au comptoir, debout, à 7 h 20. S'il faut ressortir de la
// feuille entre chaque papier, il remonte neuf fois la page : c'est exactement
// le reproche « le bouton est trop bas », et le déplacer ne le règle pas.
//
// « Enregistrer et saisir le suivant » remet donc le formulaire à zéro SANS
// fermer la feuille, en gardant la même boîte. Un paquet = une ouverture.
//
// Les champs sont à 16 px : en dessous, iOS zoome au focus et décale l'écran
// sous les doigts.
// =============================================================================

import { useEffect, useRef, useState } from "react";
import type { Boite } from "./boites";

interface Props {
  boite: Boite;
  onClose: () => void;
  onSaisir: (c: { prenom: string; nom: string; ville: string; telephone: string }) => Promise<boolean>;
  chercherDoublon: (telephone: string) => Promise<{ nom: string; depuis: string } | null>;
}

const VIDE = { prenom: "", nom: "", ville: "", telephone: "" };

export function BbcCouponSheet({ boite, onClose, onSaisir, chercherDoublon }: Props) {
  const [form, setForm] = useState(VIDE);
  const [saisis, setSaisis] = useState(0);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [doublon, setDoublon] = useState<{ nom: string; depuis: string } | null>(null);
  const prenomRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    prenomRef.current?.focus();
  }, []);

  // Le doublon se cherche quand le numéro est complet, pas à chaque frappe.
  useEffect(() => {
    const tel = form.telephone.replace(/\D/g, "");
    if (tel.length < 9) {
      setDoublon(null);
      return;
    }
    let vivant = true;
    const t = setTimeout(() => {
      void chercherDoublon(form.telephone).then((d) => {
        if (vivant) setDoublon(d);
      });
    }, 400);
    return () => {
      vivant = false;
      clearTimeout(t);
    };
  }, [form.telephone, chercherDoublon]);

  const pret = form.prenom.trim().length > 1 && form.telephone.replace(/\D/g, "").length >= 9;

  async function enregistrer(enchainer: boolean) {
    if (!pret || envoi) return;
    setEnvoi(true);
    setErreur(null);
    const ok = await onSaisir({
      prenom: form.prenom,
      nom: form.nom,
      ville: form.ville || boite.ville || "",
      telephone: form.telephone,
    });
    setEnvoi(false);
    if (!ok) {
      setErreur("Le coupon n'a pas pu être enregistré. Garde le papier et réessaie.");
      return;
    }
    setSaisis((n) => n + 1);
    if (!enchainer) {
      onClose();
      return;
    }
    setForm(VIDE);
    setDoublon(null);
    prenomRef.current?.focus();
  }

  return (
    <div style={voile} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bbc-mode" style={panneau}>
        <div style={entete}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={titre}>Un coupon</div>
            <div style={sousTitre}>
              boîte n° {boite.numero} · {boite.commerce}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" style={croix}>
            ✕
          </button>
        </div>

        <div style={corps}>
          {saisis > 0 ? (
            <div style={compteur} role="status">
              ✓ {saisis} coupon{saisis > 1 ? "s" : ""} saisi{saisis > 1 ? "s" : ""} dans cette boîte
            </div>
          ) : null}

          <div style={fige}>
            <span aria-hidden="true" style={{ fontSize: 18 }}>
              📦
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={figeCle}>rapporté par</span>
              <span style={figeValeur}>{boite.poseurNom}</span>
            </span>
          </div>

          <div style={grille2}>
            <Champ
              id="coupon-prenom"
              label="Prénom"
              valeur={form.prenom}
              onChange={(v) => setForm((f) => ({ ...f, prenom: v }))}
              inputRef={(el) => {
                prenomRef.current = el;
              }}
            />
            <Champ id="coupon-nom" label="Nom" valeur={form.nom} onChange={(v) => setForm((f) => ({ ...f, nom: v }))} />
          </div>
          <div style={grille2}>
            <Champ
              id="coupon-ville"
              label="Ville"
              valeur={form.ville}
              onChange={(v) => setForm((f) => ({ ...f, ville: v }))}
              placeholder={boite.ville ?? ""}
            />
            <Champ
              id="coupon-tel"
              label="Téléphone"
              valeur={form.telephone}
              onChange={(v) => setForm((f) => ({ ...f, telephone: v }))}
              type="tel"
            />
          </div>

          {doublon ? (
            <div style={alerteAmbre}>
              <span aria-hidden="true" style={{ fontSize: 15 }}>
                ⚠️
              </span>
              <span>
                <b style={{ color: "var(--ls-bbc-amber)" }}>Ce numéro est déjà connu.</b> {doublon.nom} est au CRM.
                On rattachera le coupon à sa fiche au lieu d'en créer une deuxième — la boîte n° {boite.numero} est
                créditée quand même.
              </span>
            </div>
          ) : null}

          {erreur ? (
            <div style={alerteCorail} role="alert">
              <span aria-hidden="true" style={{ fontSize: 15 }}>
                ⛔
              </span>
              <span>{erreur}</span>
            </div>
          ) : null}
        </div>

        <div style={pied}>
          <button type="button" onClick={() => void enregistrer(true)} disabled={!pret || envoi} style={boutonLime(pret && !envoi)}>
            {envoi ? "Enregistrement…" : "Enregistrer et saisir le suivant"}
          </button>
          <button type="button" onClick={() => void enregistrer(false)} disabled={!pret || envoi} style={boutonFantome}>
            Enregistrer et fermer
          </button>
          <div style={aide}>Visible des admins · rapporté par {boite.poseurNom} · cœur au démarrage</div>
        </div>
      </div>
    </div>
  );
}

function Champ({
  id,
  label,
  valeur,
  onChange,
  type = "text",
  placeholder,
  inputRef,
}: {
  id: string;
  label: string;
  valeur: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  /** Rappel plutôt qu'objet de référence : les types de React divergent d'une
   *  version à l'autre sur `RefObject<T | null>`, pas sur la fonction. */
  inputRef?: (el: HTMLInputElement | null) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={etiquette}>
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        type={type}
        value={valeur}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        style={saisie}
      />
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const voile: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 60,
  background: "rgba(8, 20, 18, .74)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
};
const panneau: React.CSSProperties = {
  width: "min(560px, 100%)",
  maxHeight: "94vh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  background: "var(--ls-bbc-s1)",
  border: "1px solid var(--ls-bbc-line2)",
  borderRadius: "24px 24px 0 0",
  color: "var(--ls-bbc-text)",
};
const entete: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  flex: "none",
  padding: "18px 20px 12px",
  borderBottom: "1px solid var(--ls-bbc-line)",
};
const titre: React.CSSProperties = { fontFamily: "var(--ls-bbc-font-display)", fontSize: 20, lineHeight: 1.12 };
const sousTitre: React.CSSProperties = {
  fontFamily: "var(--ls-bbc-font-mono)",
  fontSize: 11,
  color: "var(--ls-bbc-hint)",
  letterSpacing: ".1em",
  textTransform: "uppercase",
  marginTop: 5,
};
const croix: React.CSSProperties = {
  flex: "none",
  width: 44,
  height: 44,
  borderRadius: "50%",
  background: "var(--ls-bbc-s3)",
  border: 0,
  color: "var(--ls-bbc-muted)",
  fontSize: 17,
  cursor: "pointer",
  minHeight: 44,
};
const corps: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "16px 20px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};
const pied: React.CSSProperties = {
  flex: "none",
  padding: "12px 18px calc(18px + env(safe-area-inset-bottom))",
  borderTop: "1px solid var(--ls-bbc-line)",
  display: "flex",
  flexDirection: "column",
  gap: 9,
};
const compteur: React.CSSProperties = {
  fontFamily: "var(--ls-bbc-font-mono)",
  fontSize: 12,
  color: "var(--ls-bbc-lime-text)",
  background: "color-mix(in srgb, var(--ls-bbc-lime) 10%, transparent)",
  borderRadius: 10,
  padding: "9px 12px",
};
const fige: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  background: "var(--ls-bbc-s2)",
  border: "1px dashed var(--ls-bbc-line2)",
  borderRadius: 12,
  padding: "11px 13px",
};
const figeCle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--ls-bbc-font-mono)",
  fontSize: 11,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "var(--ls-bbc-hint)",
};
const figeValeur: React.CSSProperties = { display: "block", fontSize: 14, fontWeight: 700, marginTop: 2 };
const grille2: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 11 };
const etiquette: React.CSSProperties = {
  fontFamily: "var(--ls-bbc-font-mono)",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "var(--ls-bbc-hint)",
};
const saisie: React.CSSProperties = {
  minHeight: 48,
  borderRadius: 12,
  padding: "0 14px",
  background: "var(--ls-bbc-s2)",
  border: "1px solid var(--ls-bbc-line)",
  color: "var(--ls-bbc-text)",
  fontFamily: "var(--ls-bbc-font-body)",
  fontSize: 16,
};
const alerteBase: React.CSSProperties = {
  display: "flex",
  gap: 11,
  alignItems: "flex-start",
  borderRadius: 13,
  padding: "11px 13px",
  fontSize: 13,
  lineHeight: 1.5,
};
const alerteAmbre: React.CSSProperties = {
  ...alerteBase,
  background: "color-mix(in srgb, var(--ls-bbc-amber) 13%, transparent)",
  border: "1px solid color-mix(in srgb, var(--ls-bbc-amber) 38%, transparent)",
};
const alerteCorail: React.CSSProperties = {
  ...alerteBase,
  background: "color-mix(in srgb, var(--ls-bbc-coral) 14%, transparent)",
  border: "1px solid color-mix(in srgb, var(--ls-bbc-coral) 40%, transparent)",
};
function boutonLime(actif: boolean): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 52,
    border: 0,
    borderRadius: 14,
    background: actif ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s3)",
    color: actif ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-hint)",
    fontFamily: "var(--ls-bbc-font-body)",
    fontSize: 15.5,
    fontWeight: 800,
    cursor: actif ? "pointer" : "default",
  };
}
const boutonFantome: React.CSSProperties = {
  width: "100%",
  minHeight: 46,
  borderRadius: 13,
  background: "var(--ls-bbc-s2)",
  border: "1px solid var(--ls-bbc-line2)",
  color: "var(--ls-bbc-muted)",
  fontFamily: "var(--ls-bbc-font-body)",
  fontSize: 13.5,
  fontWeight: 700,
  cursor: "pointer",
};
const aide: React.CSSProperties = {
  fontSize: 11.5,
  color: "var(--ls-bbc-hint)",
  textAlign: "center",
  lineHeight: 1.45,
};
