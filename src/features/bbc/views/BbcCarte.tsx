// =============================================================================
// BbcCarte — l'ardoise du bar : ce qu'on sert, à quel prix, et ce que ça rapporte.
//
// Deux choses que le tarif Herbalife ne dit PAS et que seul le coach connaît :
//   · le nombre de doses qu'il tire d'un contenant (ça dépend de la dose servie)
//   · le prix auquel il vend LA dose au comptoir
// Tant qu'une ligne n'est pas validée, son prix est affiché comme « proposé »
// (relevé sur le tarif annoté), jamais comme un prix appliqué. Le coût et la
// marge sont CALCULÉS, avec la formule affichée — rien d'inventé.
// =============================================================================

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  CARTE_CLUB,
  RAYON_LABELS,
  coutParDose,
  margeParDose,
  produitDeLaLigne,
  PALIERS_REMISE,
  type LigneCarte,
  type RayonCarte,
} from "../data/bbcClubPrices";
import { useClubSettings } from "../useClubSettings";
import type { ClubSettings } from "../../../types/domain";

const eur2 = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

type CarteMap = NonNullable<ClubSettings["carte"]>;
type LigneEtat = { doses: number | null; prix: number | null; valide: boolean };

interface BbcCarteProps {
  clubId?: string | null;
  /** Raccourci vers « Mes clubs » — sans club, rien n'est enregistrable. */
  onGoClubs?: () => void;
}

export function BbcCarte({ clubId, onGoClubs }: BbcCarteProps) {
  const { settings, saving, save } = useClubSettings(clubId);
  const [draft, setDraft] = useState<CarteMap | null>(null);
  const [saved, setSaved] = useState(false);

  // État courant = brouillon local s'il existe, sinon la config du club, sinon
  // la proposition relevée sur le tarif (non validée).
  const carte: CarteMap = useMemo(() => {
    if (draft) return draft;
    const base: CarteMap = {};
    for (const l of CARTE_CLUB) {
      const stored = settings.carte?.[l.ref];
      base[l.ref] = stored ?? { doses: l.doses, prix: l.prixReleve, valide: false };
    }
    return base;
  }, [draft, settings.carte]);

  const palier = settings.palier_remise ?? 50;
  const aValider = CARTE_CLUB.filter((l) => !carte[l.ref]?.valide).length;
  const sansDoses = CARTE_CLUB.filter((l) => carte[l.ref]?.doses == null).length;

  function patch(ref: string, next: Partial<LigneEtat>) {
    setSaved(false);
    setDraft({ ...carte, [ref]: { ...carte[ref], ...next } });
  }

  async function enregistrer(nextPalier = palier) {
    const ok = await save({ ...settings, carte, palier_remise: nextPalier });
    if (ok) {
      setDraft(null);
      setSaved(true);
    }
  }

  const rayons = Array.from(new Set(CARTE_CLUB.map((l) => l.rayon))) as RayonCarte[];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 900 }}>
      {/* ── Sans club, rien n'est enregistrable : on le dit franchement ──── */}
      {!clubId && (
        <div style={{ ...card, border: "1px solid rgba(251,113,133,.34)", background: "rgba(251,113,133,.08)" }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>Tu n'as pas encore de club</div>
          <div style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", lineHeight: 1.6, marginBottom: 12 }}>
            La carte, les réglages et les rituels s'enregistrent <b style={{ color: "var(--ls-bbc-text)" }}>sur un club</b>.
            Tant qu'il n'existe pas, tu peux tout préparer ici mais rien ne sera sauvegardé.
          </div>
          {onGoClubs ? (
            <button
              type="button"
              onClick={onGoClubs}
              style={{
                padding: "10px 18px",
                border: 0,
                borderRadius: 12,
                background: "var(--ls-bbc-lime)",
                color: "var(--ls-bbc-lime-ink)",
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "var(--ls-bbc-font-body)",
              }}
            >
              Créer mon club →
            </button>
          ) : null}
        </div>
      )}

      {/* ── En-tête + palier ─────────────────────────────────────────────── */}
      <div style={card}>
        <Eye>la carte du club</Eye>
        <p style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", lineHeight: 1.6, margin: "0 0 16px" }}>
          Le tarif Herbalife donne le prix d'un <b style={{ color: "var(--ls-bbc-text)" }}>contenant</b>. Le club vend
          des <b style={{ color: "var(--ls-bbc-text)" }}>doses</b>. Renseigne combien de doses tu tires d'un contenant
          et à combien tu la vends : le coût et la marge se calculent tout seuls.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--ls-bbc-muted)" }}>Ton palier de remise :</span>
          {PALIERS_REMISE.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => void enregistrer(p)}
              style={{
                padding: "7px 14px",
                borderRadius: 10,
                cursor: "pointer",
                fontFamily: "var(--ls-bbc-font-mono)",
                fontSize: 12.5,
                fontWeight: 700,
                border: p === palier ? "1px solid var(--ls-bbc-lime)" : "1px solid var(--ls-bbc-line)",
                background: p === palier ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s2)",
                color: p === palier ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-muted)",
              }}
            >
              {p} %
            </button>
          ))}
        </div>
        <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10.5, color: "var(--ls-bbc-hint)", marginTop: 10 }}>
          coût d'une dose = prix public du contenant × (1 − {palier} %) ÷ doses · confronte-le à ta facture réelle
        </div>
      </div>

      {/* ── Ce qu'il reste à trancher ───────────────────────────────────── */}
      {(aValider > 0 || sansDoses > 0) && (
        <div
          style={{
            ...card,
            border: "1px solid rgba(251,191,36,.32)",
            background: "rgba(251,191,36,.07)",
          }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>⚠️ La carte n'est pas encore la tienne</div>
          <div style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", lineHeight: 1.6 }}>
            {aValider > 0 ? (
              <>
                <b style={{ color: "var(--ls-bbc-text)" }}>{aValider} ligne{aValider > 1 ? "s" : ""}</b> affiche
                {aValider > 1 ? "nt" : ""} un prix <i>relevé sur le tarif annoté</i>, pas encore confirmé par toi.
                <br />
              </>
            ) : null}
            {sansDoses > 0 ? (
              <>
                <b style={{ color: "var(--ls-bbc-text)" }}>{sansDoses} ligne{sansDoses > 1 ? "s" : ""}</b> attend
                {sansDoses > 1 ? "ent" : ""} le nombre de doses par contenant — sans lui, pas de marge calculable.
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Les rayons ──────────────────────────────────────────────────── */}
      {rayons.map((rayon) => (
        <div key={rayon} style={card}>
          <Eye>{RAYON_LABELS[rayon]}</Eye>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {CARTE_CLUB.filter((l) => l.rayon === rayon).map((ligne) => (
              <LigneRow
                key={ligne.ref}
                ligne={ligne}
                etat={carte[ligne.ref]}
                palier={palier}
                onPatch={(n) => patch(ligne.ref, n)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* ── Barre d'enregistrement ──────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, position: "sticky", bottom: 0, padding: "12px 0" }}>
        <button
          type="button"
          onClick={() => void enregistrer()}
          disabled={saving || !clubId}
          style={{
            padding: "13px 22px",
            border: 0,
            borderRadius: 13,
            background: clubId ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s2)",
            color: clubId ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-muted)",
            fontWeight: 800,
            fontSize: 14,
            cursor: clubId && !saving ? "pointer" : "default",
            fontFamily: "var(--ls-bbc-font-body)",
          }}
        >
          {saving ? "Enregistrement…" : "Enregistrer la carte"}
        </button>
        {saved ? <span style={{ fontSize: 12.5, color: "var(--ls-bbc-lime-text)" }}>✓ carte enregistrée</span> : null}
        {!clubId ? (
          <span style={{ fontSize: 12, color: "var(--ls-bbc-muted)" }}>Crée ton club pour enregistrer la carte.</span>
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function LigneRow({
  ligne,
  etat,
  palier,
  onPatch,
}: {
  ligne: LigneCarte;
  etat: LigneEtat;
  palier: number;
  onPatch: (n: Partial<LigneEtat>) => void;
}) {
  const produit = produitDeLaLigne(ligne);
  const cout = produit ? coutParDose(produit.publicPrice, etat?.doses ?? null, palier) : null;
  const marge = margeParDose(etat?.prix ?? null, cout);
  const margePct = marge != null && etat?.prix ? Math.round((marge / etat.prix) * 100) : null;

  return (
    <div
      style={{
        background: "var(--ls-bbc-s2)",
        border: etat?.valide ? "1px solid rgba(197,248,42,.30)" : "1px solid var(--ls-bbc-line)",
        borderRadius: 14,
        padding: "13px 15px",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{ligne.libelle}</span>
        <span style={{ fontSize: 11.5, color: "var(--ls-bbc-muted)" }}>· {ligne.unite}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-hint)" }}>
          réf {ligne.ref} · contenant {produit ? eur2(produit.publicPrice) : "?"}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: 11, flexWrap: "wrap" }}>
        <Champ
          label="doses / contenant"
          value={etat?.doses ?? ""}
          placeholder={ligne.doses != null ? String(ligne.doses) : "?"}
          onChange={(v) => onPatch({ doses: v === "" ? null : Math.max(1, Math.round(Number(v))), valide: false })}
        />
        <Champ
          label="prix de la dose"
          suffix="€"
          step="0.05"
          value={etat?.prix ?? ""}
          placeholder={ligne.prixReleve != null ? ligne.prixReleve.toFixed(2) : "?"}
          onChange={(v) => onPatch({ prix: v === "" ? null : Math.max(0, Number(v)), valide: false })}
        />

        <div style={{ flex: 1, minWidth: 150 }}>
          {cout != null && marge != null ? (
            <div style={{ fontSize: 12, lineHeight: 1.5 }}>
              <span style={{ color: "var(--ls-bbc-muted)" }}>coûte </span>
              <b style={{ fontFamily: "var(--ls-bbc-font-mono)" }}>{eur2(cout)}</b>
              <span style={{ color: "var(--ls-bbc-muted)" }}> → marge </span>
              <b style={{ fontFamily: "var(--ls-bbc-font-mono)", color: marge > 0 ? "var(--ls-bbc-lime-text)" : "var(--ls-bbc-coral)" }}>
                {eur2(marge)}
              </b>
              {margePct != null ? <span style={{ color: "var(--ls-bbc-muted)" }}> ({margePct} %)</span> : null}
            </div>
          ) : (
            <div style={{ fontSize: 11.5, color: "var(--ls-bbc-hint)", lineHeight: 1.5 }}>
              {etat?.doses == null ? "combien de doses dans un contenant ?" : "indique le prix de la dose"}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onPatch({ valide: !etat?.valide })}
          disabled={etat?.prix == null}
          style={{
            padding: "8px 13px",
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 700,
            cursor: etat?.prix == null ? "default" : "pointer",
            fontFamily: "var(--ls-bbc-font-body)",
            border: etat?.valide ? "1px solid var(--ls-bbc-lime)" : "1px solid var(--ls-bbc-line)",
            background: etat?.valide ? "rgba(197,248,42,.14)" : "var(--ls-bbc-s1)",
            color: etat?.valide ? "var(--ls-bbc-lime-text)" : "var(--ls-bbc-muted)",
          }}
        >
          {etat?.valide ? "✓ validé" : "valider"}
        </button>
      </div>

      {!etat?.valide && ligne.prixReleve != null ? (
        <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, color: "var(--ls-bbc-hint)", marginTop: 8 }}>
          proposé {ligne.prixReleve.toFixed(2)} € — {ligne.releveNet ? "relevé net" : "lecture à confirmer"} sur le tarif
          annoté du 25/06/2026
          {ligne.dosesSource === "note-tarif" ? " · doses notées à la main sur le tarif" : ""}
        </div>
      ) : null}
    </div>
  );
}

function Champ({
  label,
  value,
  onChange,
  placeholder,
  suffix,
  step,
}: {
  label: string;
  value: number | string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: string;
  step?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 10.5, color: "var(--ls-bbc-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
        {label}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min={0}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 84,
            height: 40,
            borderRadius: 11,
            border: "1px solid var(--ls-bbc-line)",
            background: "var(--ls-bbc-s1)",
            color: "var(--ls-bbc-text)",
            fontFamily: "var(--ls-bbc-font-mono)",
            fontSize: 15,
            textAlign: "center",
            outline: "none",
          }}
        />
        {suffix ? <span style={{ fontSize: 13, color: "var(--ls-bbc-muted)" }}>{suffix}</span> : null}
      </span>
    </label>
  );
}

function Eye({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--ls-bbc-font-mono)",
        fontSize: 10.5,
        letterSpacing: ".14em",
        textTransform: "uppercase",
        color: "var(--ls-bbc-lime-text)",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

const card: CSSProperties = {
  background: "var(--ls-bbc-s1)",
  border: "1px solid var(--ls-bbc-line)",
  borderRadius: 20,
  padding: "20px 22px",
};
