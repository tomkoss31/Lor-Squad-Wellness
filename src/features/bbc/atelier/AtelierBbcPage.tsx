// =============================================================================
// Atelier visuel BBC — route /atelier-bbc, DÉVELOPPEMENT UNIQUEMENT.
//
// LE PROBLÈME QU'IL RÉSOUT
// Les écrans coach BBC vivent derrière l'authentification Supabase. Personne ne
// peut donc les REGARDER sans compte — ni un relecteur, ni un agent, ni une
// vérification automatisée. Deux régressions purement visuelles sont parties en
// production avec un build vert : le bascule Classic/BBC invisible sous 1280 px
// et la grille de Formation sans repli mobile. `tsc` ne voit pas une colonne
// écrasée.
//
// CE QU'IL N'EST PAS
// Ce n'est PAS un contournement d'authentification. La page ne touche ni aux
// gardes de route, ni à `AppContext`, ni à la session Supabase. Elle se contente
// de MONTER les vrais composants BBC avec des props. Les hooks BBC continuent
// d'interroger Supabase sans session : ils échouent en silence (c'est leur
// comportement d'origine, on n'y touche pas) et les écrans concernés affichent
// leur VRAI état vide — ce qui est une information en soi.
//
// POURQUOI UNE IFRAME
// Les media queries de `bbc-tokens.css` (`@media (max-width: 900px)`) lisent la
// largeur du VIEWPORT, pas celle du conteneur. Rendre un écran dans un div de
// 390 px au milieu d'une fenêtre de 1280 px ne déclenche donc AUCUN repli
// mobile : on croirait tester le responsive sans en voir un seul pixel. La page
// se recharge donc elle-même dans une iframe large de 390 / 768 px (`?embed=1`),
// seul moyen honnête d'obtenir un vrai viewport étroit.
//
// GARDE DEV : la route n'est déclarée dans `App.tsx` que sous
// `import.meta.env.DEV`, et l'import dynamique est mort en production (Vite
// remplace le drapeau par `false` puis élimine la branche) — ce dossier ne part
// donc pas dans le bundle prod.
// =============================================================================

import "../../../styles/bbc-tokens.css";
import "./atelier-bbc.css";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

import { BbcApp } from "../BbcApp";
import { BbcBilan10Scan, type ScanValues } from "../BbcBilan10Scan";
import { BbcClientApp } from "../BbcClientApp";
import { BbcNewMemberSheet } from "../BbcNewMemberSheet";
import { QualifierRdvSheet } from "../../../components/agenda/QualifierRdvSheet";
import { BbcSupprimerMembre } from "../views/BbcSupprimerMembre";
import { CrmBoiteArrivee } from "../../../components/crm/CrmBoiteArrivee";
import { CrmCarteLead } from "../../../components/crm/CrmCarteLead";
import { CrmColonneEtape } from "../../../components/crm/CrmColonneEtape";
import { CrmPanneauLead } from "../../../components/crm/CrmPanneauLead";
import { CrmPanneauFiltres } from "../../../components/crm/CrmPanneauFiltres";
import { FILTRE_VIDE, lireVues, type FiltreQualif, type VueSauvee } from "../../../features/crm/filtresQualification";
import { CrmJaugeEntonnoir } from "../../../components/crm/CrmJaugeEntonnoir";
import { BbcAppels } from "../views/BbcAppels";
import { BbcClub } from "../views/BbcClub";
import { BbcClub100 } from "../views/BbcClub100";
import { BbcClubs } from "../views/BbcClubs";
import { BbcCoeurs } from "../views/BbcCoeurs";
import { BbcCrm } from "../views/BbcCrm";
import { BbcFormation } from "../views/BbcFormation";
import { BbcLexique } from "../views/BbcLexique";
import { BbcLiens } from "../views/BbcLiens";
import { BbcMessages } from "../views/BbcMessages";
import { BbcPrelancement } from "../views/BbcPrelancement";
import { BbcReglages } from "../views/BbcReglages";
import { BbcScripts } from "../views/BbcScripts";
import { BbcSemaine } from "../views/BbcSemaine";
import {
  ATELIER_CLUB,
  ATELIER_CLUBS,
  ATELIER_COACH_NAME,
  ATELIER_MEMBERS,
  ATELIER_SCAN_AUJOURDHUI,
  ATELIER_SCAN_DEPART,
  ATELIER_SCAN_DEPART_DATE,
  ATELIER_USER_ID,
} from "./bbcAtelierFixtures";

type ScreenKey =
  | "shell"
  | "semaine"
  | "visites"
  | "appels"
  | "membres"
  | "messages"
  | "coeurs"
  | "scripts"
  | "formation"
  | "lexique"
  | "prelancement"
  | "rentabilite"
  | "clubs"
  | "reglages"
  | "membre"
  | "saisie"
  | "qualifier"
  | "supprimer"
  | "arrivees"
  | "cartes-lead"
  | "board-crm"
  | "volet-lead"
  | "filtres-crm"
  | "entonnoir"
  | "bilan10";

/**
 * `source` dit d'où l'écran tire ses données. C'est la mention la plus utile de
 * tout l'atelier : elle évite de conclure « l'écran est cassé » devant un état
 * vide qui est en réalité le comportement normal hors session.
 */
type Source = "props" | "hooks" | "mixte";

interface Screen {
  k: ScreenKey;
  label: string;
  source: Source;
  /** Ce qu'on voit réellement dans l'atelier, dit sans enjoliver. */
  note: string;
}

const SCREENS: Screen[] = [
  {
    k: "shell",
    label: "Cockpit + coquille",
    source: "mixte",
    note: "Coquille complète (BbcApp) : sidebar, onglets, bottom-nav mobile. Le Cockpit n'existe qu'ici — il n'est pas exporté séparément. Ses compteurs (membres, cœurs, suivis) viennent de hooks Supabase : sans session ils affichent leurs états vides. Les rituels, eux, sont calculés depuis les réglages du club et s'affichent pour de vrai.",
  },
  { k: "semaine", label: "La semaine", source: "mixte", note: "Grille de la semaine calculée depuis `open_hours` (6h45-11h ici) + les rituels des réglages. Les permanences (`club_shifts`) et les RDV viennent de la base : tous les matins apparaissent donc « non couverts », ce qui est exactement l'état à contrôler." },
  { k: "visites", label: "Les visites", source: "hooks", note: "Pointage du matin : liste alimentée par `useBbcMembers` / `useBbcVisits`. Hors session → état vide. On y vérifie la mise en page de l'en-tête, des filtres et du message vide." },
  { k: "appels", label: "Les appels", source: "mixte", note: "Les occurrences des rituels sont dérivées des réglages du club (donc visibles) ; les inscrits viennent de `club_call_registrations` (donc vides)." },
  { k: "membres", label: "Mes membres", source: "hooks", note: "Pipeline cobayes/membres : entièrement issu de la base. Hors session → état vide." },
  { k: "messages", label: "Messages", source: "hooks", note: "Messagerie du club : entièrement issue de la base. Hors session → état vide." },
  { k: "coeurs", label: "Cœurs", source: "mixte", note: "Le barème des paliers vient des réglages du club (visible) ; les cœurs des membres viennent de la base (vide)." },
  { k: "scripts", label: "Scripts & liens", source: "props", note: "Entièrement alimenté par les réglages du club → écran complet, rien de vide." },
  { k: "formation", label: "Formation", source: "mixte", note: "Les 9 modules viennent d'un fichier de données local → écran complet. Seule la progression (cases cochées) vient de la base." },
  { k: "lexique", label: "Lexique", source: "props", note: "Définitions locales + valeurs du club → écran complet." },
  { k: "prelancement", label: "Pré-lancement", source: "mixte", note: "La check-list est locale (visible) ; l'avancement vient de la base (tout décoché)." },
  { k: "rentabilite", label: "Rentabilité", source: "mixte", note: "Attention : cet écran relit les réglages du club EN BASE (`useClubSettings(clubId)`), il ne prend pas la fixture — hors session il retombe donc sur la recette de référence et les repères du Club 100. Le bloc « la recette de ton club » et le calculateur s'affichent quand même en entier. Seul le compteur « membres BBC » reste à 0." },
  { k: "clubs", label: "Mes clubs", source: "props", note: "Les 3 clubs sont passés en prop → écran complet, y compris la carte « dupliquer un club »." },
  { k: "reglages", label: "Réglages", source: "props", note: "Formulaire alimenté par le club en fixture → écran complet. L'enregistrement échouera (pas de session) : c'est normal, on ne regarde que le rendu." },
  { k: "membre", label: "App MEMBRE", source: "props", note: "`BbcClientApp` prend TOUTES ses données en props : le seul écran BBC entièrement remplissable. Choisis un stade de carte ci-dessous." },
  {
    k: "entonnoir",
    label: "Jauge entonnoir (CRM)",
    source: "props",
    note: "La jauge cliquable du CRM (lot 3). Écran de l'app classique. Le pourcentage est un INSTANTANÉ (part de ceux arrivés à une étape qui sont allés plus loin) — la base ne garde aucun historique des changements d'étape, un vrai taux de passage serait inventé.",
  },
  {
    k: "filtres-crm",
    label: "Tiroir filtres (CRM)",
    source: "props",
    note: "Le tiroir de qualification (lot 5) : température, ce qui cloche, objectif — chaque puce avec son compteur de facette. Vues sauvées en localStorage. Sur 6 leads fictifs.",
  },
  {
    k: "volet-lead",
    label: "Volet lead (CRM)",
    source: "props",
    note: "Le volet lead docké (lot 4) : anneau de score + détail, coordonnées, gestes. Fictif. Les boutons et flèches ne font rien ici.",
  },
  {
    k: "board-crm",
    label: "Board CRM (5 colonnes)",
    source: "props",
    note: "Les 5 colonnes du board CRM V2 (lot 3) avec leurs cartes, fictives. Écran de l'app classique. Le drop et les boutons ne font rien ici.",
  },
  {
    k: "cartes-lead",
    label: "Cartes lead (CRM)",
    source: "props",
    note: "Les 5 variantes de la carte du board CRM V2 (lot 2), fictives : saine / en retard / sans suite / pourrit / RDV passé. Écran de l'app classique. Vérifie le contraste et les 4 lignes dont « Pourquoi 82 ».",
  },
  {
    k: "arrivees",
    label: "Boîte d'arrivée (CRM)",
    source: "props",
    note: "La file d'attente du CRM (lot 2 du Board V2). Écran de l'app classique, pas du mode BBC : il est monté SANS `bbc-mode`, avec les jetons --ls-*. Les boutons ne font rien ici.",
  },
  {
    k: "supprimer",
    label: "Supprimer un membre",
    source: "props",
    note: "La confirmation avant d'effacer quelqu'un (19/08). Tout est en props → écran complet. Le bouton rouge ne s'active qu'une fois le prénom recopié — c'est le garde-fou qu'on vérifie ici. Rien n'est supprimé depuis l'atelier.",
  },
  {
    k: "qualifier",
    label: "Qualifier un RDV",
    source: "props",
    note: "La feuille « elle est venue, et alors ? » ouverte depuis l'agenda (19/08). Tout est en props → écran complet. Les trois boutons ne font rien ici : on regarde la question, pas ce qu'elle déclenche.",
  },
  {
    k: "saisie",
    label: "Saisie EBE",
    source: "mixte",
    note: "La feuille de recopie d'une fiche papier (chantier saisie EBE). Formulaire, chips, steppers et body scan s'affichent en entier — c'est du local. La VALIDATION échouera faute de session : c'est attendu, on regarde la saisie, pas l'écriture. ⚠️ La feuille écrit un brouillon en localStorage : si elle se rouvre pré-remplie, c'est une saisie précédente, pas un défaut.",
  },
  {
    k: "bilan10",
    label: "Bilan des 10 · comparatif",
    source: "props",
    note: "`BbcBilan10Scan` prend tout en props → écran complet, avec les valeurs EXACTES de la maquette validée (74,5 → 70,3 kg). C'est ici qu'on vérifie l'inverseur « % | kg » : en kg le muscle est stable (+0,1), en pourcentage il monte (+3,7 points). Le sélecteur d'objectif recolore les écarts. Bascule « départ seul » pour voir l'écran AVANT toute saisie.",
  },
];

/** Les deux états du bilan des 10 : avant la pesée, et une fois remplie. */
const ETATS_BILAN10 = [
  { k: "rempli", label: "2e pesée saisie" },
  { k: "vide", label: "départ seul (avant pesée)" },
] as const;

const WIDTHS: Array<{ k: string; label: string; px: number | null }> = [
  { k: "390", label: "390 px · mobile", px: 390 },
  { k: "768", label: "768 px · tablette", px: 768 },
  { k: "full", label: "pleine largeur", px: null },
];

// ─────────────────────────────────────────────────────────────────────────────

export function AtelierBbcPage() {
  const [params, setParams] = useSearchParams();
  const embed = params.get("embed") === "1";
  const screen = (params.get("screen") as ScreenKey | null) ?? "shell";
  const theme = params.get("theme") === "light" ? "light" : "dark";
  const persona = params.get("persona") ?? ATELIER_MEMBERS[0].key;
  const etatB10 = params.get("b10") ?? ETATS_BILAN10[0].k;
  const width = params.get("w") ?? "390";

  // Le thème clair BBC se déclare `.bbc-mode.bbc-light` : les DEUX classes sur
  // le MÊME élément. Or `BbcApp` et `BbcClientApp` fabriquent leur `.bbc-mode`
  // eux-mêmes — impossible de leur ajouter `bbc-light` par un parent sans les
  // modifier, ce qu'on s'interdit. On synchronise donc la classe sur le DOM
  // rendu. L'observateur couvre les vues montées après coup (changement
  // d'onglet dans la coquille).
  useEffect(() => {
    if (!embed) return;
    const sync = () => {
      document
        .querySelectorAll(".bbc-mode")
        .forEach((el) => el.classList.toggle("bbc-light", theme === "light"));
    };
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => {
      obs.disconnect();
      document.querySelectorAll(".bbc-mode").forEach((el) => el.classList.remove("bbc-light"));
    };
  }, [embed, theme, screen]);

  // Le fond de l'iframe doit suivre le thème, sinon le blanc du navigateur
  // borde l'écran en mode sombre et fausse la lecture des contrastes.
  useEffect(() => {
    if (!embed) return;
    const prev = document.body.style.background;
    document.body.style.background = theme === "light" ? "#F3F4EF" : "#0B0D11";
    return () => {
      document.body.style.background = prev;
    };
  }, [embed, theme]);

  if (embed) {
    return <AtelierScene screen={screen} personaKey={persona} etatB10={etatB10} />;
  }

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => next.set(k, v));
    setParams(next, { replace: true });
  };

  const courant = SCREENS.find((s) => s.k === screen) ?? SCREENS[0];
  const largeur = WIDTHS.find((w) => w.k === width) ?? WIDTHS[0];
  const src = `/atelier-bbc?embed=1&screen=${screen}&theme=${theme}&persona=${persona}&b10=${etatB10}`;

  return (
    <div className="bbc-mode atelier-shell">
      <div className="atelier-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 4 }}>
          <span style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 20, color: "var(--ls-bbc-lime)", lineHeight: 1 }}>
            ATELIER BBC
          </span>
          <span
            style={{
              fontFamily: "var(--ls-bbc-font-mono)",
              fontSize: 9.5,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--ls-bbc-lime-ink)",
              background: "var(--ls-bbc-amber)",
              borderRadius: 999,
              padding: "3px 8px",
              fontWeight: 700,
            }}
          >
            dev only
          </span>
        </div>

        <div className="atelier-groupe">
          <span className="atelier-legende">écran</span>
          {SCREENS.map((s) => (
            <button
              key={s.k}
              type="button"
              className="atelier-chip"
              aria-pressed={s.k === screen}
              onClick={() => set({ screen: s.k })}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="atelier-groupe">
          <span className="atelier-legende">largeur</span>
          {WIDTHS.map((w) => (
            <button
              key={w.k}
              type="button"
              className="atelier-chip"
              aria-pressed={w.k === width}
              onClick={() => set({ w: w.k })}
            >
              {w.label}
            </button>
          ))}
        </div>

        <div className="atelier-groupe">
          <span className="atelier-legende">thème</span>
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className="atelier-chip"
              aria-pressed={t === theme}
              onClick={() => set({ theme: t })}
            >
              {t === "dark" ? "sombre" : "clair"}
            </button>
          ))}
        </div>

        {screen === "bilan10" ? (
          <div className="atelier-groupe">
            <span className="atelier-legende">état</span>
            {ETATS_BILAN10.map((e) => (
              <button
                key={e.k}
                type="button"
                className="atelier-chip"
                aria-pressed={e.k === etatB10}
                onClick={() => set({ b10: e.k })}
              >
                {e.label}
              </button>
            ))}
          </div>
        ) : null}

        {screen === "membre" ? (
          <div className="atelier-groupe">
            <span className="atelier-legende">stade de carte</span>
            {ATELIER_MEMBERS.map((m) => (
              <button
                key={m.key}
                type="button"
                className="atelier-chip"
                aria-pressed={m.key === persona}
                onClick={() => set({ persona: m.key })}
              >
                {m.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="atelier-scene">
        <p className="atelier-note">
          <strong>{courant.label}</strong> — {courant.note}
        </p>
        <iframe
          title={`Atelier BBC — ${courant.label} à ${largeur.label}`}
          className="atelier-viewport"
          src={src}
          style={{ maxWidth: largeur.px ? `${largeur.px}px` : "100%" }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// La scène : ce qui est réellement rendu DANS l'iframe.
//
// Chaque vue est montée telle quelle, sans adaptateur ni composant de
// remplacement. Un atelier qui montre autre chose que la vraie app ne sert à
// rien : on préfère un écran vide honnête à une belle démo mensongère.
// ─────────────────────────────────────────────────────────────────────────────

function SceneFiltres() {
  const j = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
  const b = { table: "prospect_leads", contact: "06 00 00 00 00", contactIsPhone: true, bilanMotivation: 8, dormant: false };
  const L = [
    { ...b, key: "a", id: "a", firstName: "Anthony", lastName: "M.", status: "new", objectif: "Perte de poids", createdAt: j(1), contactedAt: null, relanceDue: false, relanceDueAt: null, derniereReponse: null, ownerUserId: null, viaName: "Jeremy" },
    { ...b, key: "c2", id: "c2", firstName: "Claire", lastName: "T.", status: "contacted", objectif: "Sport", createdAt: j(6), contactedAt: j(4), relanceDue: true, relanceDueAt: j(3), derniereReponse: j(4), ownerUserId: "u1", viaName: null },
    { ...b, key: "k", id: "k", firstName: "Karim", lastName: "B.", status: "contacted", objectif: "Perte de poids", createdAt: j(20), contactedAt: j(12), relanceDue: false, relanceDueAt: null, derniereReponse: j(12), ownerUserId: "u1", viaName: null },
    { ...b, key: "s", id: "s", firstName: "Sabrina", lastName: "L.", status: "new", objectif: "Sommeil", contact: "s@x.fr", contactIsPhone: false, createdAt: j(40), contactedAt: null, relanceDue: false, relanceDueAt: null, derniereReponse: null, ownerUserId: null, viaName: null },
    { ...b, key: "j", id: "j", firstName: "Jeremy", lastName: "P.", status: "qualified", objectif: "Sport", rdvLabel: "demain 14 h", createdAt: j(2), contactedAt: j(1), relanceDue: false, relanceDueAt: j(-1), derniereReponse: j(1), ownerUserId: "u1", viaName: null },
    { ...b, key: "n", id: "n", firstName: "Nadia", lastName: "R.", status: "contacted", objectif: "Perte de poids", createdAt: j(9), contactedAt: j(8), relanceDue: false, relanceDueAt: j(1), derniereReponse: j(8), ownerUserId: "u1", viaName: null },
  ] as unknown as Parameters<typeof CrmPanneauFiltres>[0]["leads"];
  const [qualif, setQualif] = useState<FiltreQualif>(FILTRE_VIDE);
  const [vues, setVues] = useState<VueSauvee[]>(() => lireVues());
  return (
    <div style={{ minHeight: "100vh", background: "var(--ls-bg)" }}>
      <CrmPanneauFiltres leads={L} qualif={qualif} setQualif={setQualif} vues={vues} setVues={setVues} onFermer={() => undefined} />
    </div>
  );
}

function AtelierScene({
  screen,
  personaKey,
  etatB10,
}: {
  screen: ScreenKey;
  personaKey: string;
  etatB10: string;
}) {
  const persona = useMemo(
    () => ATELIER_MEMBERS.find((m) => m.key === personaKey) ?? ATELIER_MEMBERS[0],
    [personaKey],
  );

  // La feuille de saisie est en `position: fixed` : elle pose sa propre pleine
  // page, exactement comme dans `BbcApp`. On la monte donc sans cadre.
  // Elle vit dans l'app coach (jetons --ls-*), pas en mode BBC : on la monte
  // donc SANS la classe `bbc-mode`, sinon on verifierait des couleurs qu'elle
  // n'aura jamais a l'ecran.
  if (screen === "entonnoir") {
    // 20 leads repartis pour que les 3 taux soient calculables (base >= 3).
    const fabrique = (statut: string, n: number, relance = false) =>
      Array.from({ length: n }, (_, i) => ({
        key: `${statut}-${i}`, id: `${statut}-${i}`, table: "prospect_leads",
        firstName: "Test", status: statut, relanceDue: relance, dormant: false,
      }));
    const faux = [
      ...fabrique("new", 6),
      ...fabrique("contacted", 5, true),
      ...fabrique("contacted", 3),
      ...fabrique("qualified", 4),
      ...fabrique("converted", 2),
      ...fabrique("lost", 3),
    ] as unknown as Parameters<typeof CrmJaugeEntonnoir>[0]["leads"];
    return (
      <div style={{ padding: 18, background: "var(--ls-bg)", minHeight: "100vh" }}>
        <CrmJaugeEntonnoir leads={faux} filtre={{ etape: null, relance: false }} onFiltrer={() => undefined} />
      </div>
    );
  }

  if (screen === "filtres-crm") return <SceneFiltres />;

  if (screen === "volet-lead") {
    const faux = { key: "z", id: "z", table: "prospect_leads", firstName: "Laure", lastName: "Petit",
      contact: "06 51 55 55 08", contactIsPhone: true, city: "Toulouse", viaName: "Jeremy",
      status: "contacted", createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      contactedAt: new Date(Date.now() - 4 * 86400000).toISOString(), relanceDue: true,
      relanceDueAt: new Date(Date.now() - 3 * 86400000).toISOString(), objectif: "Perte de poids",
      bilanObjectives: ["Perte de poids", "Sommeil"], bilanWeightTarget: 9, bilanMotivation: 8,
      bilanAge: 41, dormant: false } as unknown as Parameters<typeof CrmPanneauLead>[0]["lead"];
    return (
      <div style={{ position: "relative", minHeight: "100vh", background: "var(--ls-bg)" }}>
        <CrmPanneauLead lead={faux} index={2} total={7}
          onFermer={() => undefined} onNaviguer={() => undefined}
          onWhatsApp={() => undefined} onAlors={() => undefined}
          onFiche={() => undefined} onConvertir={() => undefined} />
      </div>
    );
  }

  if (screen === "board-crm") {
    const j = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
    const b = { table: "prospect_leads", contact: "x@y.fr", contactIsPhone: true,
      bilanObjectives: ["Perte de poids"], bilanWeightTarget: 8, bilanMotivation: 8,
      bilanAge: 41, city: "Toulouse", viaName: null, dormant: false } as Record<string, unknown>;
    const mk = (k: string, nom: string, st: string, o: Record<string, unknown>) =>
      ({ ...b, key: k, id: k, firstName: nom, lastName: "T.", status: st, createdAt: j(3), contactedAt: null, relanceDue: false, relanceDueAt: null, ...o });
    const cols = [
      { cle: "new", label: "Nouveau", teinte: "var(--ls-lime)", drop: "new",
        leads: [mk("n1","Anthony","new",{contactedAt:null,relanceDueAt:j(0)}), mk("n2","Sabrina","new",{createdAt:j(6),relanceDueAt:j(-2)})] },
      { cle: "contacted", label: "Contacté", teinte: "var(--ls-teal)", drop: "contacted",
        leads: [mk("c1","Claire","contacted",{contactedAt:j(2),relanceDueAt:j(-1)}), mk("c2","Karim","contacted",{contactedAt:j(2)})] },
      { cle: "relance", label: "À relancer", teinte: "var(--ls-coral)", drop: null,
        leads: [mk("r1","Laure","contacted",{relanceDue:true,relanceDueAt:j(3)})] },
      { cle: "qualified", label: "RDV calé", teinte: "var(--ls-purple)", drop: "qualified",
        leads: [mk("q1","Jeremy","qualified",{rdvLabel:"demain 14 h"})] },
      { cle: "converted", label: "Converti", teinte: "var(--ls-amber)", drop: null,
        leads: [mk("v1","Mélanie","converted",{})] },
    ] as unknown as Array<{ cle: string; label: string; teinte: string; drop: string | null; leads: Parameters<typeof CrmColonneEtape>[0]["leads"] }>;
    return (
      <div style={{ padding: 18, background: "var(--ls-bg)", minHeight: "100vh" }}>
        <div style={{ display: "flex", gap: 12, overflowX: "auto" }}>
          {cols.map((c) => (
            <CrmColonneEtape key={c.cle} label={c.label} teinte={c.teinte} leads={c.leads}
              cibleDrop={c.drop} survole={false}
              onDragOver={() => undefined} onDragLeave={() => undefined} onDrop={() => undefined}
              onOuvrir={() => undefined} onWhatsApp={() => undefined} onAlors={() => undefined}
              onDragStartCard={() => undefined} onDragEndCard={() => undefined} />
          ))}
        </div>
      </div>
    );
  }

  if (screen === "cartes-lead") {
    // Cinq leads fictifs, un par variante. Dates calees pour declencher chaque etat.
    const base = { key: "x", table: "prospect_leads", contact: "x@y.fr", contactIsPhone: true,
      bilanObjectives: ["Perte de poids", "Sommeil"], bilanWeightTarget: 8, bilanMotivation: 8,
      bilanAge: 41, city: "Toulouse", viaName: null, dormant: false } as Record<string, unknown>;
    const jours = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
    const faux = [
      { ...base, key: "a", id: "a", firstName: "Anthony", lastName: "Marin", status: "new",
        createdAt: jours(1), contactedAt: null, relanceDue: false, relanceDueAt: jours(-0) },
      { ...base, key: "b", id: "b", firstName: "Laure", lastName: "Petit", status: "contacted",
        createdAt: jours(6), contactedAt: jours(4), relanceDue: true, relanceDueAt: jours(3) },
      { ...base, key: "c", id: "c", firstName: "Karim", lastName: "Thabet", status: "contacted",
        createdAt: jours(2), contactedAt: jours(2), relanceDue: false, relanceDueAt: null },
      { ...base, key: "d", id: "d", firstName: "Sabrina", lastName: "Long", status: "new",
        createdAt: jours(6), contactedAt: null, relanceDue: false, relanceDueAt: jours(-2) },
      { ...base, key: "e", id: "e", firstName: "Sonia", lastName: "Roche", status: "qualified",
        createdAt: jours(10), contactedAt: jours(8), relanceDue: false, relanceDueAt: jours(5),
        rdvLabel: "hier 14 h", rdv: { id: "r", slotStart: jours(1), slotEnd: null, clubId: null, coachUserId: null, passe: true, label: "hier 14 h" } },
    ] as unknown as Parameters<typeof CrmCarteLead>[0]["lead"][];
    return (
      <div style={{ padding: 18, background: "var(--ls-bg)", minHeight: "100vh", maxWidth: 340 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {faux.map((l, i) => (
            <CrmCarteLead key={i} lead={l} onOuvrir={() => undefined}
              onWhatsApp={() => undefined} onAlors={() => undefined} />
          ))}
        </div>
      </div>
    );
  }

  if (screen === "arrivees") {
    // Trois arrivees types : un bilan en ligne, un lead du site, un prenom
    // confie sans numero. De quoi voir les trois libelles de source et le
    // « depuis » a trois echelles (minutes, heures, hier).
    // Les TROIS cas de la maquette : un RDV du club (violet), un doublon
    // (ambre, deux fiches au meme contact), et des arrivees neutres.
    const faux = [
      { key: "a", id: "a", table: "prospect_leads", firstName: "nadia", lastName: "CHEVALIER",
        source: "site-club", contact: "nadia@exemple.fr",
        createdAt: new Date(Date.now() - 25 * 60000).toISOString() },
      { key: "b", id: "b", table: "prospect_leads", firstName: "Fatiha", lastName: "Lamri",
        source: "colis", contact: "fatiha@exemple.fr",
        createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
      { key: "b2", id: "b2", table: "online_bilans", firstName: "Fatiha", lastName: "Lamri",
        source: "bilan-online", contact: "fatiha@exemple.fr",
        createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
      { key: "c", id: "c", table: "online_bilans", firstName: "Marc", lastName: "Leroy",
        source: "bilan-online", contact: "marc@exemple.fr",
        createdAt: new Date(Date.now() - 4 * 3600000).toISOString() },
      { key: "d", id: "d", table: "client_referral_intentions", firstName: "Léa", lastName: null,
        source: "intention", contact: null,
        createdAt: new Date(Date.now() - 30 * 3600000).toISOString() },
    ] as unknown as Parameters<typeof CrmBoiteArrivee>[0]["leads"];
    return (
      <div style={{ padding: 18, background: "var(--ls-bg)", minHeight: "100vh" }}>
        <CrmBoiteArrivee
          leads={faux}
          onAccepter={async () => null}
          onRefuser={async () => null}
          onOuvrir={() => undefined}
        />
      </div>
    );
  }

  if (screen === "supprimer") {
    return (
      <div className="bbc-mode">
        <BbcSupprimerMembre
          prenom="Gwendoline"
          nomComplet="Gwendoline DROUET"
          visites={7}
          onFermer={() => undefined}
          onConfirmer={async () => "Atelier : rien n'est supprimé ici."}
        />
      </div>
    );
  }

  if (screen === "qualifier") {
    return (
      <QualifierRdvSheet
        cible={{
          nomComplet: "Céline Ducastelle",
          heure: "09:00",
          jour: "mercredi 19 août",
          objectif: "perte de poids",
          contact: "celine-ducastelle@outlook.fr",
          partenaire: null,
        }}
        onMembre={() => undefined}
        onClassique={() => undefined}
        onPasEncore={() => undefined}
        onFermer={() => undefined}
      />
    );
  }

  if (screen === "saisie") {
    return (
      <BbcNewMemberSheet
        userId={ATELIER_USER_ID}
        coachName={ATELIER_COACH_NAME}
        club={ATELIER_CLUB}
        onClose={() => undefined}
      />
    );
  }

  if (screen === "bilan10") {
    const rempli = etatB10 !== "vide";
    return (
      <VuePleinePage>
        <BbcBilan10Scan
          depart={ATELIER_SCAN_DEPART as ScanValues}
          departDate={ATELIER_SCAN_DEPART_DATE}
          dejaEnregistre={rempli ? (ATELIER_SCAN_AUJOURDHUI as ScanValues) : null}
          objectifInitial="weight-loss"
          fait={rempli}
          onBasculer={() => undefined}
          enCoursEnregistrement={false}
          enregistreLe={null}
          erreur={null}
          onEnregistrer={() => undefined}
          numero={1}
          titre="Refaire le scan corporel"
          sousTitre="on compare avec le point de départ"
        />
      </VuePleinePage>
    );
  }

  // La coquille et l'app membre gèrent leur propre pleine page.
  if (screen === "shell") {
    return (
      <BbcApp
        coachName={ATELIER_COACH_NAME}
        userId={ATELIER_USER_ID}
        isAdmin
        // Le bascule Classic/BBC n'apparaît que si `onSetPreview` est fourni :
        // c'est précisément le contrôle qui avait disparu sous 1280 px, il doit
        // donc être visible dans l'atelier. Il ne fait rien ici (pas de session).
        onSetPreview={() => undefined}
        club={ATELIER_CLUB}
        clubs={ATELIER_CLUBS}
      />
    );
  }
  if (screen === "membre") {
    // `key` : les personas changent des états internes (onglet, écran d'entrée).
    // Sans remontage, passer de « carte pleine » à « écran d'entrée » ne
    // montrerait rien.
    return <BbcClientApp key={persona.key} {...persona.props} />;
  }

  return <VuePleinePage>{vue(screen)}</VuePleinePage>;
}

/** Reproduit le cadre dans lequel `BbcApp` pose ses vues (fond, police,
 *  gouttières) — sans quoi une vue isolée flotterait sur du blanc et on
 *  jugerait ses contrastes dans un contexte qui n'existe pas. */
function VuePleinePage({ children }: { children: ReactNode }) {
  return (
    <div
      className="bbc-mode"
      style={{
        minHeight: "100vh",
        background: "var(--ls-bbc-bg)",
        color: "var(--ls-bbc-text)",
        fontFamily: "var(--ls-bbc-font-body)",
      }}
    >
      <div className="bbc-main" style={{ padding: "20px 16px 40px" }}>
        {children}
      </div>
    </div>
  );
}

function vue(screen: ScreenKey): ReactNode {
  const settings = ATELIER_CLUB.settings ?? null;
  switch (screen) {
    case "semaine":
      return <BbcSemaine userId={ATELIER_USER_ID} club={ATELIER_CLUB} />;
    case "visites":
      return <BbcClub userId={ATELIER_USER_ID} club={ATELIER_CLUB} />;
    case "appels":
      return <BbcAppels userId={ATELIER_USER_ID} club={ATELIER_CLUB} />;
    case "membres":
      return <BbcCrm userId={ATELIER_USER_ID} />;
    case "messages":
      return <BbcMessages userId={ATELIER_USER_ID} coachName={ATELIER_COACH_NAME} />;
    case "coeurs":
      return <BbcCoeurs userId={ATELIER_USER_ID} club={ATELIER_CLUB} />;
    case "scripts":
      // Même composition que dans `BbcApp` : les liens PUIS les scripts.
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <BbcLiens coachName={ATELIER_COACH_NAME} settings={settings} clubName={ATELIER_CLUB.name} />
          <BbcScripts settings={settings} />
        </div>
      );
    case "formation":
      return <BbcFormation />;
    case "lexique":
      return <BbcLexique settings={settings} />;
    case "prelancement":
      return <BbcPrelancement userId={ATELIER_USER_ID} coachName={ATELIER_COACH_NAME} />;
    case "rentabilite":
      return <BbcClub100 userId={ATELIER_USER_ID} clubId={ATELIER_CLUB.id} />;
    case "clubs":
      return (
        <BbcClubs
          clubs={ATELIER_CLUBS}
          isAdmin
          onCreateClub={async () => false}
          onRenameClub={async () => false}
        />
      );
    case "reglages":
      return <BbcReglages club={ATELIER_CLUB} onSaved={() => undefined} />;
    default:
      return null;
  }
}

export default AtelierBbcPage;
