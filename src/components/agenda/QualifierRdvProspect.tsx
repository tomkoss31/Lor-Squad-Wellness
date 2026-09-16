// =============================================================================
// QualifierRdvProspect — « ce RDV est passé. Elle est venue, et alors ? »
//
// LE TROU (Thomas, 16/09) : cliquer un RDV réservé PAR la personne (tunnel du
// club) ouvrait la qualification « membre / suivi / pas venue » ; mais un RDV
// que le coach a calé lui-même depuis le CRM (table `prospects`, ex. une lead
// Meta comme Justine) tombait sur une simple fiche, SANS qualification. Deux
// tables, deux clics — « on a un super outil mais trop compliqué ».
//
// Cette feuille pose la MÊME question pour un RDV `prospects` passé, en deux
// écrans simples (maquette validée le 16/09) :
//   1. Elle démarre ? → membre du club · suivi classique · pas encore · pas venue
//   2. (pas encore / pas venue) → je la relance · elle est perdue
//
// Elle ne décide rien et n'écrit rien : `AgendaPage` orchestre les écritures
// (BbcNewMemberSheet, bilan classique, mise en pause datée, perdu). Même
// principe que `QualifierRdvSheet` — une feuille qui décide ET écrit est
// intestable.
// =============================================================================

import { useEffect, useState } from "react";
import type { Prospect } from "../../types/domain";

/** Ce qui a manqué au démarrage — décide du délai et du mot de la relance. */
export type MotifRelance = "reflechit" | "pas_venue";

interface Props {
  prospect: Prospect;
  onMembre: () => void;
  onClassique: () => void;
  /** Relancer : elle revient dans la file. `reflechit` = J+7, `pas_venue` = J+2. */
  onRelance: (motif: MotifRelance) => void;
  onPerdue: () => void;
  onFermer: () => void;
}

const eyebrow: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ls-text-muted)",
};

const choix: React.CSSProperties = {
  display: "flex",
  gap: 11,
  alignItems: "flex-start",
  width: "100%",
  textAlign: "left",
  background: "var(--ls-surface2)",
  border: "1px solid var(--ls-line)",
  borderRadius: 14,
  padding: 13,
  marginBottom: 9,
  color: "var(--ls-text)",
  fontFamily: "inherit",
  fontSize: 14,
  cursor: "pointer",
  minHeight: 56,
};

const titreChoix: React.CSSProperties = {
  display: "block",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 14.5,
  fontWeight: 700,
  marginBottom: 2,
};

// `--ls-text-muted` sur fond teinté retombe sous le seuil lisible : on dérive
// de l'encre du texte (recette qui tient dans les deux thèmes, cf. QualifierRdvSheet).
const sousTexte: React.CSSProperties = {
  display: "block",
  fontSize: 12.5,
  lineHeight: 1.45,
  color: "color-mix(in srgb, var(--ls-text) 72%, transparent)",
};

const ico: React.CSSProperties = { fontSize: 20, flex: "none", lineHeight: 1.2 };

const HEURE = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
const JOUR = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short" });

export function QualifierRdvProspect({ prospect, onMembre, onClassique, onRelance, onPerdue, onFermer }: Props) {
  // `demarre` = l'écran d'entrée ; sinon on est sur « je la relance / perdue »,
  // avec le motif qui fixe le délai (réfléchit → 1 semaine, pas venue → 2 jours).
  const [etape, setEtape] = useState<"demarre" | MotifRelance>("demarre");

  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onFermer]);

  const quand = new Date(prospect.rdvDate);
  const contexte = [prospect.note?.trim() || null, prospect.phone || prospect.email || null].filter(Boolean).join(" · ");

  return (
    <div
      onClick={onFermer}
      style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Qualifier le rendez-vous de ${prospect.firstName} ${prospect.lastName}`}
        style={{
          width: "100%",
          maxWidth: 460,
          margin: "0 auto",
          maxHeight: "88vh",
          overflowY: "auto",
          background: "var(--ls-surface)",
          borderTop: "1px solid var(--ls-line2)",
          borderRadius: "22px 22px 0 0",
          padding: "16px 15px calc(20px + env(safe-area-inset-bottom))",
          color: "var(--ls-text)",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div style={{ width: 38, height: 4, borderRadius: 99, background: "var(--ls-line2)", margin: "0 auto 14px" }} />

        <div style={eyebrow}>
          rdv de {HEURE.format(quand)} · {JOUR.format(quand)}
        </div>
        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 21, margin: "4px 0 3px" }}>
          {prospect.firstName} {prospect.lastName}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--ls-text-muted)", marginBottom: 15 }}>{contexte || " "}</div>

        {etape === "demarre" ? (
          <>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 17, margin: "2px 0 12px" }}>
              Elle démarre avec toi ?
            </div>

            {/* Membre du club en premier (Thomas, 16/09) — l'accent teal dit
                « c'est le principal ». Pas de lime : c'est un jeton du mode BBC,
                absent de l'app coach. */}
            <button
              type="button"
              onClick={onMembre}
              style={{
                ...choix,
                background: "color-mix(in srgb, var(--ls-teal) 10%, var(--ls-surface2))",
                borderColor: "color-mix(in srgb, var(--ls-teal) 45%, var(--ls-line))",
              }}
            >
              <span aria-hidden="true" style={ico}>☕</span>
              <span>
                <span style={titreChoix}>Oui — membre du club</span>
                <span style={sousTexte}>On ouvre le formulaire du club : fiche, carte, prix au comptoir.</span>
              </span>
            </button>

            <button type="button" onClick={onClassique} style={choix}>
              <span aria-hidden="true" style={ico}>📋</span>
              <span>
                <span style={titreChoix}>Oui — en suivi classique</span>
                <span style={sousTexte}>On ouvre une fiche client normale, hors club.</span>
              </span>
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                margin: "6px 2px 10px",
                color: "var(--ls-text-hint)",
                fontSize: 11,
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              <span style={{ height: 1, background: "var(--ls-line)", flex: 1 }} />
              sinon
              <span style={{ height: 1, background: "var(--ls-line)", flex: 1 }} />
            </div>

            <button type="button" onClick={() => setEtape("reflechit")} style={{ ...choix, background: "transparent", minHeight: 46 }}>
              <span aria-hidden="true" style={ico}>⏳</span>
              <span>
                <span style={titreChoix}>Pas encore</span>
                <span style={sousTexte}>Elle est venue mais ne démarre pas aujourd'hui.</span>
              </span>
            </button>

            <button type="button" onClick={() => setEtape("pas_venue")} style={{ ...choix, background: "transparent", minHeight: 46 }}>
              <span aria-hidden="true" style={ico}>🚫</span>
              <span>
                <span style={titreChoix}>Elle n'est pas venue</span>
                <span style={sousTexte}>Le rendez-vous est manqué.</span>
              </span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setEtape("demarre")}
              style={{ background: "none", border: 0, color: "var(--ls-text-muted)", fontSize: 13, padding: "6px 2px 8px", cursor: "pointer", fontFamily: "inherit" }}
            >
              ← retour
            </button>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 17, margin: "2px 0 12px" }}>
              {etape === "pas_venue" ? "Pas venue — on fait quoi ?" : "Elle réfléchit — on fait quoi ?"}
            </div>

            <button
              type="button"
              onClick={() => onRelance(etape)}
              style={{
                ...choix,
                background: "color-mix(in srgb, var(--ls-teal) 10%, var(--ls-surface2))",
                borderColor: "color-mix(in srgb, var(--ls-teal) 45%, var(--ls-line))",
              }}
            >
              <span aria-hidden="true" style={ico}>🔄</span>
              <span>
                <span style={titreChoix}>Je la relance</span>
                <span style={sousTexte}>
                  {etape === "pas_venue"
                    ? "Elle revient dans ta liste dans 2 jours."
                    : "Elle revient dans ta liste dans 1 semaine."}
                </span>
              </span>
            </button>

            <button type="button" onClick={onPerdue} style={choix}>
              <span aria-hidden="true" style={ico}>🗂️</span>
              <span>
                <span style={{ ...titreChoix, color: "var(--ls-coral)" }}>Elle est perdue</span>
                <span style={sousTexte}>Plus intéressée. Elle sort de ta liste.</span>
              </span>
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onFermer}
          style={{
            display: "block",
            width: "100%",
            minHeight: 44,
            marginTop: 6,
            background: "none",
            border: 0,
            color: "var(--ls-text-muted)",
            fontFamily: "inherit",
            fontSize: 13,
            padding: 13,
            cursor: "pointer",
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
