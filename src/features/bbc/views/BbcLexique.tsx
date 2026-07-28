// =============================================================================
// BbcLexique — le vocabulaire du club, en onglet à part.
//
// POURQUOI CET ÉCRAN EXISTE (recette client 2026-07-28). Les 25 définitions
// vivaient empilées tout en bas de la page Formation, sous les 10 modules.
// Retour de Thomas : « bien l'index !!! mais c'est empilé, suffit de refaire un
// onglet lexique exemple qui ouvre une modale ». Un index qu'il faut scroller
// après le contenu n'est pas un index : c'est un appendice.
//
// TROIS CHOIX À NE PAS DÉFAIRE :
//
//  · L'onglet va DANS « Ressources », pas dans la barre latérale. La nav BBC
//    tient à 5 sections et ça n'est pas négociable — c'était tout l'objet du
//    passage de 13 entrées à 5.
//
//  · La recherche filtre le TERME **et** la définition. Chercher « remise »
//    doit tomber sur « ambassadeur » même si le mot « remise » n'est que dans
//    l'explication : quelqu'un qui cherche dans un lexique ne connaît
//    justement pas le mot qu'il cherche.
//
//  · Les définitions ne sont PAS dupliquées ici. Elles viennent toutes de
//    `buildGlossary`, qui injecte au passage le barème des cœurs et les jours
//    de rituels RÉGLÉS par le club. Une 2e copie de ces textes aurait divergé
//    en trois semaines, comme les résumés de modules avant elle.
// =============================================================================

import { useMemo, useState } from "react";
import type { ClubSettings } from "../../../types/domain";
import { buildGlossary, type GlossaryEntry } from "../data/bbcFormation";

/** Teinte d'un token BBC — aucune couleur de marque en rgba() littéral, les
 *  tokens changent en thème clair et un rgba figé garderait la version néon. */
function tint(token: string, pct: number): string {
  return `color-mix(in srgb, var(${token}) ${pct}%, transparent)`;
}

/**
 * Bloc Unicode « combining diacritical marks ». Construit depuis une CHAÎNE
 * échappée et pas écrit en littéral dans la regex : posés tels quels, ces
 * caractères sont invisibles dans le fichier (ils se collent au crochet
 * précédent) et le moindre copier-coller les corrompt sans qu'on le voie.
 */
const ACCENTS = new RegExp("[\\u0300-\\u036f]", "g");

/** Retire accents et casse : « cœur » se trouve en tapant « coeur ». */
function normaliser(s: string): string {
  return s.toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(ACCENTS, "");
}

// ── La fiche d'un terme ────────────────────────────────────────────────────

export function BbcTermSheet({ entry, onClose }: { entry: GlossaryEntry; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1250,
        background: "rgba(0,0,0,.6)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bbc-mode"
        role="dialog"
        aria-label={entry.t}
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "80vh",
          overflowY: "auto",
          background: "var(--ls-bbc-s1)",
          border: "1px solid var(--ls-bbc-line2)",
          borderRadius: "24px 24px 0 0",
          padding: "20px 22px calc(24px + env(safe-area-inset-bottom))",
          color: "var(--ls-bbc-text)",
          fontFamily: "var(--ls-bbc-font-body)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--ls-bbc-font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--ls-bbc-muted)",
                fontWeight: 700,
              }}
            >
              lexique du club
            </div>
            <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>
              {entry.t}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "var(--ls-bbc-s2)",
              border: "1px solid var(--ls-bbc-line)",
              color: "var(--ls-bbc-muted)",
              cursor: "pointer",
              fontSize: 15,
              flex: "none",
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--ls-bbc-text)" }}>{entry.d}</div>
      </div>
    </div>
  );
}

// ── Les renvois depuis une fiche module ────────────────────────────────────
//
// C'est ce qui empêche l'onglet Lexique d'être un cul-de-sac : le mot s'explique
// là où il est employé, sans quitter le module qu'on est en train de lire.

export function BbcLexiqueChips({ termes, settings }: { termes: string[]; settings: ClubSettings | null }) {
  const [ouvert, setOuvert] = useState<GlossaryEntry | null>(null);
  // Un terme mal orthographié dans un module ne doit pas produire une puce
  // morte : on ne garde que ceux qui existent vraiment dans le lexique.
  const entrees = useMemo(() => {
    const g = buildGlossary(settings);
    return termes.map((t) => g.find((e) => e.t === t)).filter((e): e is GlossaryEntry => Boolean(e));
  }, [termes, settings]);

  if (entrees.length === 0) return null;

  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          fontFamily: "var(--ls-bbc-font-mono)",
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ls-bbc-muted)",
          marginBottom: 8,
        }}
      >
        les mots de ce module
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {entrees.map((e) => (
          <button
            key={e.t}
            type="button"
            onClick={() => setOuvert(e)}
            style={{
              cursor: "pointer",
              padding: "6px 12px",
              borderRadius: 999,
              background: tint("--ls-bbc-teal", 10),
              border: `1px solid ${tint("--ls-bbc-teal", 32)}`,
              color: "var(--ls-bbc-teal)",
              fontFamily: "var(--ls-bbc-font-body)",
              fontSize: 11.5,
              fontWeight: 600,
            }}
          >
            {e.t}
          </button>
        ))}
      </div>
      {ouvert ? <BbcTermSheet entry={ouvert} onClose={() => setOuvert(null)} /> : null}
    </div>
  );
}

// ── L'onglet ───────────────────────────────────────────────────────────────

export function BbcLexique({ settings }: { settings: ClubSettings | null }) {
  const [q, setQ] = useState("");
  const [ouvert, setOuvert] = useState<GlossaryEntry | null>(null);

  const tous = useMemo(() => buildGlossary(settings), [settings]);
  const resultats = useMemo(() => {
    const n = normaliser(q.trim());
    if (!n) return tous;
    return tous.filter((g) => normaliser(g.t).includes(n) || normaliser(g.d).includes(n));
  }, [q, tous]);

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ fontSize: 13, color: "var(--ls-bbc-muted)", lineHeight: 1.55, marginBottom: 16 }}>
        Les mots qu'on emploie tous les matins, expliqués comme à un pote — du point de vue du coach. Les
        chiffres réglables (barème des cœurs, jours des rituels, prix des cartes) sont ceux de TON club.
      </div>

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Chercher un mot… (ex. cœur, remise, carte)"
        aria-label="Chercher dans le lexique"
        style={{
          width: "100%",
          height: 46,
          padding: "0 16px",
          borderRadius: 13,
          background: "var(--ls-bbc-s2)",
          border: "1px solid var(--ls-bbc-line)",
          color: "var(--ls-bbc-text)",
          fontFamily: "var(--ls-bbc-font-body)",
          fontSize: 14,
          marginBottom: 14,
        }}
      />

      {resultats.length === 0 ? (
        <div
          style={{
            padding: "18px 20px",
            borderRadius: 14,
            background: "var(--ls-bbc-s1)",
            border: "1px solid var(--ls-bbc-line)",
            fontSize: 13,
            color: "var(--ls-bbc-muted)",
            lineHeight: 1.55,
          }}
        >
          Aucun mot ne correspond à « {q} ». Si c'est un mot que l'équipe emploie vraiment au club, il manque
          au lexique — dis-le, on l'ajoute.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(228px, 1fr))", gap: 10 }}>
          {resultats.map((g) => (
            <button
              key={g.t}
              type="button"
              onClick={() => setOuvert(g)}
              style={{
                textAlign: "left",
                cursor: "pointer",
                background: "var(--ls-bbc-s1)",
                border: "1px solid var(--ls-bbc-line)",
                borderRadius: 14,
                padding: "14px 16px",
                color: "var(--ls-bbc-text)",
                fontFamily: "var(--ls-bbc-font-body)",
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ls-bbc-lime-text)" }}>{g.t}</div>
              {/* Un extrait, pas la définition entière : la carte sert à
                  repérer le mot, la fiche sert à le comprendre. Tout afficher
                  ici, c'est reconstruire l'empilement qu'on vient de retirer. */}
              <div
                style={{
                  fontSize: 11.5,
                  color: "var(--ls-bbc-muted)",
                  marginTop: 5,
                  lineHeight: 1.5,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {g.d}
              </div>
            </button>
          ))}
        </div>
      )}

      {ouvert ? <BbcTermSheet entry={ouvert} onClose={() => setOuvert(null)} /> : null}
    </div>
  );
}
