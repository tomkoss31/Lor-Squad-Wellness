// =============================================================================
// BbcSupprimerMembre — la confirmation avant d'effacer quelqu'un.
//
// Thomas (19/08) : « les clients rentrés par erreur sur l'app BBC ». Le besoin
// est réel — au comptoir on crée une fiche en trop, on tape deux fois — et il
// n'y avait AUCUN moyen de la retirer côté club.
//
// ── POURQUOI UNE SAISIE DU PRÉNOM ET PAS UN SIMPLE « ES-TU SÛR ? » ────────
// Parce que ce bouton vit dans un panneau qu'on ouvre pour CONSULTER, sur un
// téléphone, debout, souvent avec quelqu'un en face. Un « oui / non » se tape
// par réflexe. Recopier le prénom oblige à regarder QUI on supprime — c'est le
// même garde-fou que la fiche client classique, et il a déjà servi.
//
// ── CE QUI PART VRAIMENT ──────────────────────────────────────────────────
// Mesuré le 19/08 : 18 tables suivent en cascade (bilans, mesures, visites,
// carte, cœurs, suivis, consentements…) et aucune ne bloque. On l'écrit en
// toutes lettres à l'écran plutôt que de dire « cette action est irréversible »,
// formule que plus personne ne lit.
//
// ⚠️ `client_app_accounts` ne part PAS en cascade (client_id en TEXT, donc pas
// de clé étrangère) : c'est `api/admin-delete-client.ts` qui le retire à la
// main, avant le reste. Deux comptes orphelins traînaient depuis avril.
// =============================================================================

import { useEffect, useState } from "react";

interface Props {
  prenom: string;
  nomComplet: string;
  visites: number;
  /** Rend l'erreur, ou null si tout s'est bien passé. */
  onConfirmer: () => Promise<string | null>;
  onFermer: () => void;
}

export function BbcSupprimerMembre({ prenom, nomComplet, visites, onConfirmer, onFermer }: Props) {
  const [saisie, setSaisie] = useState("");
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onFermer();
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onFermer, busy]);

  const attendu = prenom.trim().toLowerCase();
  const peut = attendu.length > 0 && saisie.trim().toLowerCase() === attendu && !busy;

  async function confirmer() {
    if (!peut) return;
    setBusy(true);
    setErreur(null);
    const e = await onConfirmer();
    if (e) {
      setErreur(e);
      setBusy(false);
      return;
    }
    onFermer();
  }

  return (
    <div
      onClick={() => { if (!busy) onFermer(); }}
      style={{ position: "fixed", inset: 0, zIndex: 95, background: "rgba(0,0,0,.66)", display: "flex", alignItems: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Supprimer ${nomComplet}`}
        style={{
          width: "100%",
          maxWidth: 460,
          margin: "0 auto",
          maxHeight: "88vh",
          overflowY: "auto",
          background: "var(--ls-bbc-s1)",
          border: "1px solid var(--ls-bbc-line2)",
          borderRadius: "26px 26px 0 0",
          padding: "20px 20px calc(24px + env(safe-area-inset-bottom))",
          color: "var(--ls-bbc-text)",
          fontFamily: "var(--ls-bbc-font-body)",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 999, background: "var(--ls-bbc-line2)", margin: "0 auto 16px" }} />

        <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ls-bbc-coral)" }}>
          suppression définitive
        </div>
        <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 21, margin: "5px 0 10px" }}>{nomComplet}</div>

        <div
          style={{
            border: "1px solid color-mix(in srgb, var(--ls-bbc-coral) 40%, var(--ls-bbc-line))",
            background: "color-mix(in srgb, var(--ls-bbc-coral) 9%, transparent)",
            borderRadius: 14,
            padding: "12px 13px",
            fontSize: 12.5,
            lineHeight: 1.55,
            color: "var(--ls-bbc-text)",
          }}
        >
          Tout part avec elle : son bilan de départ, ses mensurations,{" "}
          <strong>ses {visites} passage{visites > 1 ? "s" : ""}</strong>, sa carte, ses cœurs et son accès à
          l'app. Rien ne se récupère ensuite.
        </div>

        <label style={{ display: "block", marginTop: 16 }}>
          <span style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", display: "block", marginBottom: 7 }}>
            Recopie <strong style={{ color: "var(--ls-bbc-text)" }}>{prenom}</strong> pour confirmer.
          </span>
          <input
            type="text"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            disabled={busy}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: 48,
              padding: "10px 13px",
              borderRadius: 12,
              background: "var(--ls-bbc-s2)",
              border: "1px solid var(--ls-bbc-line)",
              color: "var(--ls-bbc-text)",
              fontFamily: "var(--ls-bbc-font-body)",
              fontSize: 16, // 16px : en dessous, iOS zoome tout seul sur le champ
            }}
          />
        </label>

        {erreur ? (
          <div role="alert" style={{ marginTop: 10, fontSize: 12.5, color: "var(--ls-bbc-coral)", lineHeight: 1.5 }}>
            {erreur}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void confirmer()}
          disabled={!peut}
          style={{
            width: "100%",
            minHeight: 50,
            marginTop: 14,
            border: 0,
            borderRadius: 13,
            background: peut ? "var(--ls-bbc-coral)" : "var(--ls-bbc-s2)",
            // Jamais du blanc en dur : sur le coral SOMBRE (#F2775F) il tombe
            // à 3,39. `coral-ink` s'inverse avec le thème, comme `lime-ink`.
            color: peut ? "var(--ls-bbc-coral-ink)" : "var(--ls-bbc-hint)",
            fontFamily: "var(--ls-bbc-font-body)",
            fontSize: 15,
            fontWeight: 700,
            cursor: peut ? "pointer" : "not-allowed",
          }}
        >
          {busy ? "suppression…" : "Supprimer définitivement"}
        </button>

        <button
          type="button"
          onClick={onFermer}
          disabled={busy}
          style={{
            width: "100%",
            minHeight: 44,
            marginTop: 9,
            background: "none",
            border: 0,
            color: "var(--ls-bbc-muted)",
            fontFamily: "inherit",
            fontSize: 13,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
