// =============================================================================
// BbcFormation — l'échelle des 5 marches et le parcours 01→10.
//
// CE QUE CET ÉCRAN NE DOIT PLUS JAMAIS FAIRE (recettes client 2026-07-28) :
//
//  · Affirmer une marche. « TU ES Coach stagiaire » était une constante servie
//    à tout le monde, propriétaire de club compris. Ici la marche vient de
//    `useBbcRole` (faits réels) et le bloc « tu es » ne s'affiche QUE si on la
//    connaît. Sinon : formulation neutre, on ne devine pas.
//
//  · COCHER L'ÉCHELLE. C'est le retour le plus dur de la 2e recette : « j'ai
//    croisé les levels ??? chacun dit quoi finalement l'intérêt (c'est joli
//    bien fait mais comment c'est éducatif) ». Les marches sous celle du
//    lecteur portaient un ✓ vert « fait » — or Thomas, propriétaire, n'a jamais
//    été « membre » de son propre club. Barrer une marche, c'est prétendre
//    connaître un passé qu'on n'a pas, et ça n'apprend RIEN.
//    L'échelle est maintenant une CARTE : on met en avant la marche occupée, on
//    n'en barre aucune, et chaque marche répond à deux questions — ce qu'elle
//    apporte, comment on y entre.
//
//  · Verrouiller à tort. `isAdmin || club actif` ⇒ rien n'est verrouillé, et
//    marche inconnue ⇒ rien n'est verrouillé non plus (`fullAccess`). Un module
//    lu trop tôt ne casse rien ; un module fermé à tort humilie.
//
//  · Mentir sur un cadenas. Avant, un module « verrouillé » s'ouvrait quand
//    même au clic : le cadenas était décoratif. Maintenant le bouton est
//    réellement `disabled` ET il dit à quelle marche il s'ouvre.
//
//  · Afficher une progression inventée. « 3 / 9 fait » était une chaîne de
//    caractères. Le compteur vient de `bbc_formation_progress` et ne s'affiche
//    pas du tout tant qu'on ne peut pas le lire (migration non poussée) — mieux
//    vaut aucun compteur qu'un compteur figé.
//
//  · Empiler le lexique en pied de page. Les 25 définitions sont parties dans
//    Ressources → Lexique (recherche + fiche par mot) ; les modules y renvoient
//    par des puces, pour que le mot s'explique là où il est employé.
//
// L'état du lecteur (« tu es ici », « c'est ta marche ») est posé ICI, jamais
// dans les données : les définitions de marches se lisent à la 3e personne.
//
// ─────────────────────────────────────────────────────────────────────────────
// TROISIÈME RECETTE (2026-07-30) — les trois retours et ce qu'ils ont changé :
//
//  1. « tu as perdu un peu de couleur pour le menu des membres, stagiaire,
//     junior ». L'échelle était grise partout sauf la marche courante : on ne
//     lisait plus sa position d'un coup d'œil. Les pastilles reprennent donc de
//     la couleur — lime plein sur la marche occupée, teal sur celles d'EN
//     DESSOUS, gris éteint sur celles à venir — et le rail qui les relie suit la
//     même règle.
//     ⚠️ LE PIÈGE, à ne surtout pas rouvrir : la couleur dit « où tu te situes »,
//     PAS « étape validée ». Aucun ✓ ne revient sur l'échelle (cf. plus haut :
//     un propriétaire n'a jamais été membre de son club). C'est pour ça qu'une
//     légende explicite le code couleur en toutes lettres sous le titre : sans
//     elle, un teal se relit spontanément comme une case cochée.
//
//  2. « je pense c'est mieux de réduire et faire plutôt un clic ou menu
//     déroulant pour les explications ». Les 5 marches dépliaient leur `apport`
//     en permanence, plus un panneau de détail en pied de liste : un mur de
//     texte avant le moindre clic. L'échelle est devenue un ACCORDÉON — titre +
//     critère court d'un côté, description / apport / accès à l'ouverture — et
//     une seule marche peut être ouverte à la fois.
//
//  3. « et tu as verrouillé les étapes ! un junior n'a pas besoin de voir tout
//     ça c'est cadenassé !! ». Le verrou marchait déjà ; le problème est que
//     Thomas, admin ET propriétaire, ne pouvait PAS le voir : `fullAccess` lui
//     ouvre tout, donc aucun cadenas à l'écran avant de lancer son équipe.
//     D'où le sélecteur « voir comme » (option (b), choisie par Thomas), qui
//     rejoue l'affichage à la place d'une autre marche.
//     ⚠️ TROIS RÈGLES SUR CE SÉLECTEUR :
//       · il ne touche NI la base NI le rôle réel — c'est un état local, rien
//         d'autre ; les hooks continuent de lire les faits réels ;
//       · il n'apparaît qu'à quelqu'un qui ENCADRE (`fullAccess`). Il ne peut de
//         toute façon rien débloquer : simuler une marche fait TOMBER le
//         privilège réel, jamais l'inverse (cf. `fullAccessEff`) ;
//       · tant qu'il est actif, l'écran le dit en clair, sinon on croit à un
//         bug — c'est le bandeau ambre avec « revenir à ma vue ».
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { BBC_FORMATION_MODULES, BBC_ROLES, getFormationModule, getModulePoints } from "../data/bbcFormation";
import { bbcRoleRank, useBbcRole, type BbcRole } from "../useBbcRole";
import { useBbcFormationProgress } from "../useBbcFormationProgress";
import { BbcLexiqueChips } from "./BbcLexique";

const STAR = "M12 2l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L12 16.9 6.4 19.1l1.4-6.3L3 8.5l6.4-.6z";
const LOCK = "M6.5 10V7.5a5.5 5.5 0 0 1 11 0V10M5 10h14v10.5H5z";
const EYE = "M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z";
// Le ✓ ne sert plus QU'aux modules réellement cochés par le coach. Il a été
// retiré de l'échelle des marches : là-bas il affirmait un passé (« tu as été
// membre ») que personne n'a validé. Ne pas le réintroduire côté échelle.
const CHECK = "M20 6 9 17l-5-5";

/** Teinte d'un token BBC. Aucune COULEUR DE MARQUE en rgba() littéral : lime,
 *  teal et coral changent en thème clair (bbc-tokens.css), un rgba figé
 *  garderait la version néon prévue pour le fond noir.
 *  (Le voile noir des modales, lui, reste un rgba : il est identique dans les
 *  deux thèmes et ne dépend d'aucun token — même choix partout dans BBC.) */
function tint(token: string, pct: number): string {
  return `color-mix(in srgb, var(${token}) ${pct}%, transparent)`;
}

/** Position de la marche `i` par rapport à celle du lecteur (`rang`).
 *  Écrit une fois pour que la pastille, le rail et les textes ne puissent pas
 *  diverger — c'est en les recalculant séparément qu'on finit par colorier une
 *  ligne « atteinte » sous une pastille grise. */
type Situation = "sous" | "courante" | "avenir";
function situer(i: number, rang: number): Situation {
  if (rang < 0 || i > rang) return "avenir";
  return i === rang ? "courante" : "sous";
}

/**
 * Un petit bloc « intitulé + texte » du panneau de marche.
 *
 * Les deux blocs (« ce que ça apporte », « comment on y entre ») sont ce qui
 * transforme l'échelle en support pédagogique plutôt qu'en liste de trophées :
 * ils répondent au « chacun dit quoi finalement l'intérêt » de la recette.
 */
function Bloc({ titre, texte, couleur }: { titre: string; texte: string; couleur: string }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          fontFamily: "var(--ls-bbc-font-mono)",
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: couleur,
          marginBottom: 4,
        }}
      >
        {titre}
      </div>
      <div style={{ fontSize: 12, color: "var(--ls-bbc-text)", lineHeight: 1.55 }}>{texte}</div>
    </div>
  );
}

export function BbcFormation() {
  const { role, source, loading, clubsOwned, hearts, fullAccess, clubSettings } = useBbcRole();
  const progress = useBbcFormationProgress();

  const rang = bbcRoleRank(role);

  // ── « Voir comme » ────────────────────────────────────────────────────────
  // null = ma vue réelle. Aucune écriture, aucun effet hors de ce composant.
  const [vueSimulee, setVueSimulee] = useState<BbcRole | null>(null);
  const rungSimulee = vueSimulee ? BBC_ROLES.find((r) => r.role === vueSimulee) ?? null : null;

  // Le sélecteur ne s'ouvre qu'à quelqu'un qui encadre. `fullAccess` est le seul
  // signal disponible ici, et il suffit : un stagiaire (marche connue, ni admin
  // ni propriétaire) est exclu, et un lecteur dont la marche est inconnue a
  // DÉJÀ tout ouvert — simuler ne peut donc rien lui débloquer de plus.
  const peutSimuler = fullAccess;

  const rangEff = vueSimulee ? bbcRoleRank(vueSimulee) : rang;
  // En simulation on LÂCHE volontairement le privilège réel (admin, club actif) :
  // sinon `fullAccess` resterait vrai, aucun cadenas n'apparaîtrait, et l'aperçu
  // ne montrerait strictement rien — c'est-à-dire exactement le problème qu'on
  // vient corriger. On rejoue donc la règle de `useBbcRole` telle quelle :
  // seul un propriétaire (et le roll out, qui possède aussi son club) a tout.
  const fullAccessEff = vueSimulee ? vueSimulee === "proprietaire" || vueSimulee === "rollout" : fullAccess;

  // ── Accordéon de l'échelle ────────────────────────────────────────────────
  // null = toutes repliées. Une seule marche ouverte à la fois (recette 3).
  const [sel, setSel] = useState<number | null>(null);
  const [openModule, setOpenModule] = useState<string | null>(null);
  const openMod = openModule ? getFormationModule(openModule) : null;

  // La marche courante n'est connue qu'après un aller-retour réseau : on ouvre
  // celle du lecteur UNE FOIS, et jamais après qu'il a cliqué (sinon on lui
  // reprendrait sa sélection sous les doigts).
  const alignee = useRef(false);
  useEffect(() => {
    if (alignee.current || rang < 0) return;
    alignee.current = true;
    setSel(rang);
  }, [rang]);

  /** Un clic sur une marche gèle l'alignement ET referme la précédente. */
  function basculerMarche(i: number) {
    alignee.current = true;
    setSel((p) => (p === i ? null : i));
  }

  /** Changer de vue est un geste explicite : on peut donc replacer l'accordéon
   *  sur la marche regardée sans risquer de voler sa sélection au lecteur. */
  function changerVue(v: BbcRole | null) {
    alignee.current = true;
    setVueSimulee(v);
    const r = v ? bbcRoleRank(v) : rang;
    setSel(r >= 0 ? r : null);
  }

  // Statut de chaque module, CALCULÉ : plus aucun `st` écrit à la main.
  // ⚠️ La progression se lit sur `m.key` (slug stable), JAMAIS sur `m.n` (le
  // numéro affiché). Le module « modèle économique » est passé de 00 à 09 dans
  // la réorganisation du 2026-07-28 : indexée sur le numéro, la case cochée
  // d'un coach aurait suivi le module qui a pris sa place.
  const modules = BBC_FORMATION_MODULES.map((m) => ({
    m,
    done: Boolean(progress.done[m.key]),
    // fullAccessEff couvre déjà l'admin, le propriétaire de club ET la marche
    // inconnue : dans ces trois cas on ne calcule même pas de verrou.
    locked: !fullAccessEff && bbcRoleRank(m.minRole) > rangEff,
  }));
  const faits = modules.filter((x) => x.done).length;
  // « à faire » = le premier module ni coché ni verrouillé. Un simple statut,
  // pas un bouton : l'ancien badge « reprendre » promettait de reprendre là où
  // on s'était arrêté et ouvrait en fait la même fiche que les autres.
  const aFaire = progress.available ? modules.find((x) => !x.done && !x.locked)?.m.key ?? null : null;

  const rungCourante = rang >= 0 ? BBC_ROLES[rang] : null;
  const rungSuivante = rang >= 0 ? BBC_ROLES[rang + 1] ?? null : null;

  /** Pourquoi cette marche — l'écran doit pouvoir se justifier.
   *  Muet en simulation : « tu as 1 club actif » n'explique pas la marche d'un
   *  stagiaire qu'on regarde par-dessus l'épaule. */
  const pourquoi =
    source === "override"
      ? "marche posée par ton club owner"
      : source === "equipe"
        ? "un membre de ton équipe a ouvert son club"
        : source === "club"
          ? `tu as ${clubsOwned} club${clubsOwned > 1 ? "s" : ""} actif${clubsOwned > 1 ? "s" : ""}`
          : source === "prelancement"
            ? "ton pré-lancement est lancé"
            : source === "coeurs"
              ? `${hearts} cœurs validés dans ton club`
              : "";

  /** L'entête du parcours parle à la 2e personne en vue réelle, à la 3e en
   *  simulation : « tout est ouvert pour toi » serait faux quand on regarde
   *  l'écran d'un stagiaire. */
  const introParcours = rungSimulee
    ? fullAccessEff
      ? `Pour un ${rungSimulee.label.toLowerCase()}, tout est ouvert.`
      : `Un ${rungSimulee.label.toLowerCase()} ouvre ${modules.filter((x) => !x.locked).length} module${modules.filter((x) => !x.locked).length > 1 ? "s" : ""} sur ${modules.length} ; le reste se débloque à la marche suivante.`
    : fullAccess
      ? "Tout est ouvert pour toi. Tu inventes rien, tu déroules."
      : "Les modules se débloquent à chaque marche. Tu inventes rien, tu déroules.";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── « Voir comme » ───────────────────────────────────────────────────
          Placé AVANT la grille pour rester le premier élément lu à 390 px : un
          bandeau d'état qui arrive après le contenu qu'il qualifie ne sert à
          rien. */}
      {peutSimuler ? (
        <div
          style={{
            background: rungSimulee ? tint("--ls-bbc-amber", 10) : "var(--ls-bbc-s1)",
            border: `1px solid ${rungSimulee ? tint("--ls-bbc-amber", 34) : "var(--ls-bbc-line)"}`,
            borderRadius: 16,
            padding: "12px 14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--ls-bbc-font-mono)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: rungSimulee ? "var(--ls-bbc-amber)" : "var(--ls-bbc-muted)",
                marginRight: 2,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={EYE} />
                <circle cx="12" cy="12" r="2.6" />
              </svg>
              voir comme
            </span>
            {/* « ma vue » d'abord : c'est la sortie de secours, elle doit être
                au même endroit que l'entrée. */}
            {[{ k: "moi", label: "ma vue", role: null as BbcRole | null }, ...BBC_ROLES.map((r) => ({ k: r.role, label: r.label, role: r.role as BbcRole | null }))].map((v) => {
              const actif = (v.role ?? null) === vueSimulee;
              return (
                <button
                  key={v.k}
                  type="button"
                  aria-pressed={actif}
                  onClick={() => changerVue(v.role)}
                  style={{
                    fontFamily: "var(--ls-bbc-font-mono)",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "6px 11px",
                    borderRadius: 999,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    background: actif ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s2)",
                    border: `1px solid ${actif ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line)"}`,
                    color: actif ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-muted)",
                  }}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "var(--ls-bbc-muted)", marginTop: 9 }}>
            {rungSimulee ? (
              <>
                <span style={{ color: "var(--ls-bbc-amber)", fontWeight: 700 }}>
                  Tu regardes comme un {rungSimulee.label.toLowerCase()}.
                </span>{" "}
                Rien n'est modifié : ni ta marche, ni tes accès, ni la base. C'est un aperçu de ce que
                verra ton équipe.{" "}
                <button
                  type="button"
                  onClick={() => changerVue(null)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    font: "inherit",
                    cursor: "pointer",
                    color: "var(--ls-bbc-lime-text)",
                    fontWeight: 700,
                    textDecoration: "underline",
                  }}
                >
                  revenir à ma vue
                </button>
              </>
            ) : (
              "Avant de lancer quelqu'un, regarde l'écran avec ses yeux : ce qui lui est ouvert, ce qui est encore cadenassé. Ça ne change que ton affichage."
            )}
          </div>
        </div>
      ) : null}

      <div className="bbc-formation-grid">
        {/* ── Colonne gauche ───────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Statut du lecteur — affiché SEULEMENT si on sait qui lit. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              background: "var(--ls-bbc-s1)",
              border: `1px solid ${rungSimulee ? tint("--ls-bbc-amber", 34) : rungCourante ? tint("--ls-bbc-lime", 32) : "var(--ls-bbc-line)"}`,
              borderRadius: 20,
              padding: "18px 20px",
            }}
          >
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 14,
                background: rungSimulee ? "var(--ls-bbc-amber)" : rungCourante ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "none",
              }}
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke={rungSimulee || rungCourante ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-hint)"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={rungSimulee ? EYE : STAR} />
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              {rungSimulee ? (
                // En simulation on n'écrit PAS « tu es » : ce serait le mensonge
                // d'origine, juste déplacé.
                <>
                  <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-amber)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    tu regardes comme
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{rungSimulee.label}</div>
                  <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 2, lineHeight: 1.45 }}>
                    {rungCourante ? `ta marche à toi : ${rungCourante.label.toLowerCase()}` : "ta marche à toi n'est pas connue"}
                  </div>
                </>
              ) : rungCourante ? (
                <>
                  <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    tu es
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{rungCourante.label}</div>
                  <div style={{ fontSize: 12, color: "var(--ls-bbc-lime-text)", marginTop: 2 }}>
                    {rungSuivante ? `prochaine marche : ${rungSuivante.label.toLowerCase()}` : "dernière marche de l'échelle"}
                    {pourquoi ? <span style={{ color: "var(--ls-bbc-hint)" }}> · {pourquoi}</span> : null}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    l'échelle des rôles
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>
                    {loading ? "on regarde où tu en es…" : "on ne sait pas encore situer ta marche"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 2, lineHeight: 1.45 }}>
                    {loading ? " " : "Tant qu'on ne peut pas la déduire, on ne l'invente pas — et rien n'est verrouillé."}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* L'échelle = une CARTE, pas une liste de cases à cocher.
              Aucune marche n'est barrée « faite » (cf. entête). La couleur dit
              une POSITION — ta marche, celles d'en dessous, celles à venir —
              et la légende ci-dessous l'écrit noir sur blanc pour qu'un teal ne
              se relise pas comme un ✓. */}
          <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-lime)", boxShadow: "0 0 8px var(--ls-bbc-lime)" }} />
              l'échelle des rôles
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ls-bbc-muted)", lineHeight: 1.5, marginBottom: 12 }}>
              Où mène le modèle. Touche une marche pour l'ouvrir : ce qu'elle apporte, et comment on y entre.
            </div>
            {/* La légende du code couleur. Elle n'est là que si une marche est
                située — sans repère, il n'y a rien à légender. */}
            {rangEff >= 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ls-bbc-hint)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 999, background: "var(--ls-bbc-lime)", flex: "none" }} />
                  ta marche
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 999, background: "var(--ls-bbc-teal)", flex: "none" }} />
                  en dessous
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 999, border: "1.5px solid var(--ls-bbc-line2)", flex: "none" }} />
                  ce qui vient après
                </span>
              </div>
            ) : null}
            <div>
              {BBC_ROLES.map((r, i) => {
                const situation = situer(i, rangEff);
                const courante = situation === "courante";
                const sous = situation === "sous";
                const ouverte = sel === i;
                // Le rail est découpé PAR MARCHE : un segment au-dessus de la
                // pastille, un en dessous. Une seule barre absolue sur toute la
                // liste ne pourrait pas changer de couleur au niveau du lecteur,
                // et une hauteur calculée casserait au premier retour à la ligne.
                const railHaut = rangEff >= 0 && i <= rangEff ? "var(--ls-bbc-teal)" : "var(--ls-bbc-line)";
                const railBas = rangEff >= 0 && i + 1 <= rangEff ? "var(--ls-bbc-teal)" : "var(--ls-bbc-line)";
                return (
                  <div key={r.role} style={{ position: "relative" }}>
                    {i > 0 ? (
                      <span aria-hidden="true" style={{ position: "absolute", left: 21, top: 0, height: 31, width: 2, background: railHaut }} />
                    ) : null}
                    {i < BBC_ROLES.length - 1 ? (
                      <span aria-hidden="true" style={{ position: "absolute", left: 21, top: 31, bottom: 0, width: 2, background: railBas }} />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => basculerMarche(i)}
                      aria-current={courante && !rungSimulee ? "step" : undefined}
                      aria-expanded={ouverte}
                      style={{
                        position: "relative",
                        display: "flex",
                        gap: 13,
                        alignItems: "flex-start",
                        padding: "9px 10px",
                        margin: "0 -10px",
                        borderRadius: 12,
                        cursor: "pointer",
                        width: "calc(100% + 20px)",
                        textAlign: "left",
                        border: 0,
                        background: ouverte ? "var(--ls-bbc-s2)" : "transparent",
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 999,
                          flex: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "var(--ls-bbc-font-mono)",
                          fontWeight: 700,
                          fontSize: 14,
                          // Le NUMÉRO reste affiché sur toutes les marches, y
                          // compris celles d'en dessous : c'est ce qui empêche la
                          // pastille teal de redevenir une case cochée.
                          background: courante ? "var(--ls-bbc-lime)" : sous ? tint("--ls-bbc-teal", 16) : "var(--ls-bbc-bg)",
                          border: `2px solid ${courante ? "var(--ls-bbc-lime)" : sous ? "var(--ls-bbc-teal)" : "var(--ls-bbc-line)"}`,
                          color: courante ? "var(--ls-bbc-lime-ink)" : sous ? "var(--ls-bbc-teal)" : "var(--ls-bbc-hint)",
                          zIndex: 1,
                        }}
                      >
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, paddingTop: 3 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: situation === "avenir" ? "var(--ls-bbc-muted)" : "var(--ls-bbc-text)" }}>
                            {r.label}
                          </span>
                          {courante ? (
                            <span
                              style={{
                                fontFamily: "var(--ls-bbc-font-mono)",
                                fontSize: 9,
                                fontWeight: 700,
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                color: "var(--ls-bbc-lime-ink)",
                                background: rungSimulee ? "var(--ls-bbc-amber)" : "var(--ls-bbc-lime)",
                                padding: "2px 7px",
                                borderRadius: 999,
                              }}
                            >
                              {/* « tu es ici » est faux quand on regarde par-dessus
                                  l'épaule de quelqu'un d'autre. */}
                              {rungSimulee ? "vue simulée" : "tu es ici"}
                            </span>
                          ) : null}
                          {/* Dire tout de suite que « Membre » ne se franchit pas
                              ici évite la question que Thomas s'est posée en
                              voyant la marche cochée sur son propre écran. */}
                          {r.horsAppCoach ? (
                            <span
                              style={{
                                fontFamily: "var(--ls-bbc-font-mono)",
                                fontSize: 9,
                                fontWeight: 700,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                color: "var(--ls-bbc-hint)",
                                border: "1px solid var(--ls-bbc-line2)",
                                padding: "2px 7px",
                                borderRadius: 999,
                              }}
                            >
                              hors app coach
                            </span>
                          ) : null}
                        </div>
                        {/* Replié : le CRITÈRE court, une ligne. Le reste attend
                            le clic (recette 3 — « réduire … menu déroulant »). */}
                        <div
                          style={{
                            fontSize: 11.5,
                            color: courante ? "var(--ls-bbc-lime-text)" : situation === "avenir" ? "var(--ls-bbc-hint)" : "var(--ls-bbc-muted)",
                            marginTop: 2,
                            lineHeight: 1.45,
                          }}
                        >
                          {r.critere}
                        </div>
                      </div>
                      <span
                        aria-hidden="true"
                        style={{
                          flex: "none",
                          alignSelf: "center",
                          fontSize: 15,
                          lineHeight: 1,
                          color: "var(--ls-bbc-hint)",
                          transform: ouverte ? "rotate(90deg)" : "none",
                          transition: "transform .15s ease",
                        }}
                      >
                        ›
                      </span>
                    </button>

                    {/* Le détail, DANS la marche. Il était en pied de liste : on
                        cliquait en haut, le texte changeait en bas, hors du champ
                        de vision à 390 px.
                        `zIndex` : le panneau doit recouvrir le rail qui le
                        traverse, sinon un trait court au milieu du texte. */}
                    {ouverte ? (
                      <div
                        className="bbc-rung-detail"
                        style={{
                          position: "relative",
                          zIndex: 1,
                          marginTop: 2,
                          marginBottom: 8,
                          padding: "14px 16px",
                          borderRadius: 14,
                          background: "var(--ls-bbc-s2)",
                          border: "1px solid var(--ls-bbc-line)",
                        }}
                      >
                        <div style={{ fontSize: 12.5, color: "var(--ls-bbc-text)", lineHeight: 1.55 }}>{r.description}</div>

                        {/* Les deux questions qui rendent l'échelle éducative. */}
                        <Bloc titre="ce que ça apporte" texte={r.apport} couleur="var(--ls-bbc-lime-text)" />
                        <Bloc titre="comment on y entre" texte={r.acces} couleur="var(--ls-bbc-teal)" />

                        {/* La 2e personne n'apparaît QUE sur la marche réellement
                            occupée, et jamais pendant une simulation. */}
                        {!rungSimulee && rang >= 0 && i === rang ? (
                          <div style={{ fontSize: 12, color: "var(--ls-bbc-lime-text)", marginTop: 10, fontWeight: 600 }}>C'est ta marche.</div>
                        ) : null}
                        {!rungSimulee && rang >= 0 && i < rang && r.vuDenHaut ? (
                          <div style={{ fontSize: 12, color: "var(--ls-bbc-teal)", marginTop: 8, lineHeight: 1.45 }}>{r.vuDenHaut}</div>
                        ) : null}
                        {/* Une marche dont les prérequis ne sont pas sourcés le dit,
                            comme un module le dit dans son `todo`. Même règle partout. */}
                        {r.todo ? (
                          <div
                            style={{
                              marginTop: 12,
                              padding: "10px 12px",
                              borderRadius: 11,
                              background: tint("--ls-bbc-amber", 10),
                              border: `1px solid ${tint("--ls-bbc-amber", 30)}`,
                              fontSize: 11.5,
                              lineHeight: 1.5,
                              color: "var(--ls-bbc-muted)",
                            }}
                          >
                            <span style={{ color: "var(--ls-bbc-amber)", fontWeight: 700 }}>À trancher · </span>
                            {r.todo}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              background: tint("--ls-bbc-coral", 8),
              border: `1px solid ${tint("--ls-bbc-coral", 26)}`,
              borderRadius: 18,
              padding: "16px 18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-coral)", textTransform: "uppercase" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ls-bbc-coral)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={LOCK} />
              </svg>
              la règle qui gouverne tout
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>On ne modifie rien.</div>
            <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 4, lineHeight: 1.5 }}>
              Mêmes prix, mêmes horaires, mêmes scripts, mêmes formulaires. Chaque « amélioration » perso casse la duplication.
            </div>
          </div>
        </div>

        {/* ── Colonne droite ───────────────────────────────────────────────── */}
        <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-teal)", boxShadow: "0 0 8px var(--ls-bbc-teal)", flex: "none" }} />
            <span style={{ flex: 1, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>
              le parcours étape par étape
            </span>
            {/* Rien tant qu'on ne peut pas compter pour de vrai : un « 0 / 9 »
                qui clignote puis saute vaut moins que pas de compteur. */}
            {progress.available && !progress.loading ? (
              <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-lime-text)" }}>
                {faits} / {modules.length} fait
              </span>
            ) : null}
          </div>
          <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginBottom: 16, lineHeight: 1.5 }}>{introParcours}</div>

          {modules.map(({ m, done, locked }) => {
            const enCours = m.key === aFaire;
            const badge = done ? "var(--ls-bbc-teal)" : locked ? "var(--ls-bbc-hint)" : "var(--ls-bbc-lime)";
            const bBg = done ? tint("--ls-bbc-teal", 12) : enCours ? tint("--ls-bbc-lime", 12) : "transparent";
            const marcheRequise = BBC_ROLES.find((r) => r.role === m.minRole)?.label ?? m.minRole;
            return (
              <button
                key={m.n}
                type="button"
                disabled={locked}
                aria-disabled={locked}
                onClick={locked ? undefined : () => setOpenModule(m.n)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 15,
                  padding: "13px 8px",
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  borderTop: "1px solid var(--ls-bbc-line)",
                  cursor: locked ? "not-allowed" : "pointer",
                  textAlign: "left",
                  color: "var(--ls-bbc-text)",
                  opacity: locked ? 0.6 : 1,
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 13,
                    flex: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--ls-bbc-font-mono)",
                    fontWeight: 800,
                    fontSize: 16,
                    background: bBg,
                    border: `1px solid ${badge}`,
                    color: badge,
                  }}
                >
                  {done ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ls-bbc-teal)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={CHECK} />
                    </svg>
                  ) : (
                    m.n
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: locked ? "var(--ls-bbc-muted)" : "var(--ls-bbc-text)" }}>{m.title}</div>
                  <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 2 }}>
                    {locked ? `se débloque à la marche « ${marcheRequise} »` : m.listLabel}
                  </div>
                </div>
                {enCours ? (
                  <span
                    style={{
                      fontFamily: "var(--ls-bbc-font-mono)",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--ls-bbc-lime-text)",
                      border: `1px solid ${tint("--ls-bbc-lime", 40)}`,
                      padding: "5px 10px",
                      borderRadius: 999,
                      whiteSpace: "nowrap",
                    }}
                  >
                    à faire
                  </span>
                ) : locked ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ls-bbc-hint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={LOCK} />
                  </svg>
                ) : null}
                {locked ? null : (
                  <span aria-hidden="true" style={{ fontSize: 16, color: "var(--ls-bbc-hint)" }}>
                    ›
                  </span>
                )}
              </button>
            );
          })}

          {/* Le lexique n'est plus empilé ici — il a son onglet. On garde juste
              le panneau qui dit où il est parti, sinon un habitué de l'ancienne
              page croit qu'on l'a supprimé. */}
          <div style={{ marginTop: 22, paddingTop: 20, borderTop: "1px solid var(--ls-bbc-line)", fontSize: 12, color: "var(--ls-bbc-muted)", lineHeight: 1.55 }}>
            Un mot que tu ne connais pas ? Le vocabulaire du club vit dans l'onglet{" "}
            <span style={{ color: "var(--ls-bbc-lime-text)", fontWeight: 600 }}>Lexique</span>, juste à côté — et
            chaque module rappelle ses propres mots en bas de sa fiche.
          </div>
        </div>
      </div>

      {/* ── Fiche module ─────────────────────────────────────────────────── */}
      {openMod ? (
        <div
          onClick={() => setOpenModule(null)}
          style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bbc-mode"
            style={{
              width: "100%",
              maxWidth: 560,
              maxHeight: "85vh",
              overflowY: "auto",
              background: "var(--ls-bbc-s1)",
              border: "1px solid var(--ls-bbc-line2)",
              borderRadius: "24px 24px 0 0",
              padding: "20px 22px calc(24px + env(safe-area-inset-bottom))",
              color: "var(--ls-bbc-text)",
              fontFamily: "var(--ls-bbc-font-body)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, flex: "none", background: "var(--ls-bbc-lime)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 16, color: "var(--ls-bbc-lime-ink)" }}>
                {openMod.n}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 20, lineHeight: 1.1 }}>{openMod.title}</div>
                <div style={{ fontSize: 12, color: "var(--ls-bbc-lime-text)", marginTop: 2 }}>{openMod.subtitle}</div>
              </div>
              <button
                type="button"
                onClick={() => setOpenModule(null)}
                aria-label="Fermer"
                style={{ width: 32, height: 32, borderRadius: 10, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", color: "var(--ls-bbc-muted)", cursor: "pointer", fontSize: 15, flex: "none" }}
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.55, marginBottom: 14 }}>{openMod.summary}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {getModulePoints(openMod, clubSettings).map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "11px 13px", borderRadius: 12, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)" }}>
                  <span style={{ color: "var(--ls-bbc-lime)", flex: "none", fontWeight: 800 }}>•</span>
                  <span style={{ fontSize: 12.5, lineHeight: 1.5 }}>{p}</span>
                </div>
              ))}
            </div>

            {/* Les mots du module, cliquables. C'est ce qui permet au lexique
                de vivre dans son onglet sans devenir inaccessible depuis le
                contenu qui l'emploie. */}
            {openMod.lexique?.length ? <BbcLexiqueChips termes={openMod.lexique} settings={clubSettings} /> : null}

            {/* Ce qui manque, dit franchement : un module qui promet un déroulé
                qu'il n'a pas fait plus de dégâts qu'un module qui l'annonce. */}
            {openMod.todo ? (
              <div
                style={{
                  marginTop: 12,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: tint("--ls-bbc-amber", 10),
                  border: `1px solid ${tint("--ls-bbc-amber", 30)}`,
                }}
              >
                <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ls-bbc-amber)", marginBottom: 5 }}>
                  à compléter
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--ls-bbc-muted)" }}>{openMod.todo}</div>
              </div>
            ) : null}

            {/* « Fait » = le coach a coché, pas « la fiche a été ouverte » :
                ouvrir n'est pas dérouler, et c'est le même geste que le
                pré-lancement dans tout le mode BBC. */}
            {progress.available ? (
              <button
                type="button"
                onClick={() => void progress.toggle(openMod.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  width: "100%",
                  marginTop: 14,
                  padding: "13px 15px",
                  borderRadius: 13,
                  cursor: "pointer",
                  textAlign: "left",
                  background: progress.done[openMod.key] ? tint("--ls-bbc-lime", 7) : "var(--ls-bbc-s2)",
                  border: `1px solid ${progress.done[openMod.key] ? tint("--ls-bbc-lime", 28) : "var(--ls-bbc-line)"}`,
                  color: "var(--ls-bbc-text)",
                }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    flex: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: progress.done[openMod.key] ? "var(--ls-bbc-lime)" : "transparent",
                    border: `1px solid ${progress.done[openMod.key] ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line2)"}`,
                    fontSize: 12,
                    fontWeight: 800,
                    color: progress.done[openMod.key] ? "var(--ls-bbc-lime-ink)" : "transparent",
                  }}
                >
                  ✓
                </span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>J'ai déroulé ce module</span>
              </button>
            ) : null}

            {/* La source ne dit plus « Notion Formation BBC 04 » : depuis la
                relecture du 2026-07-28, l'essentiel des déroulés vient des
                documents officiels du Drive, et le numéro n'identifie plus
                rien de stable (il change à chaque réorganisation). */}
            <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, color: "var(--ls-bbc-hint)", textAlign: "center", marginTop: 14 }}>
              source · documents officiels du club + Playbook BBC
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
