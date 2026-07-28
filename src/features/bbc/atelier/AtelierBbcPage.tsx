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
import { useEffect, useMemo, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

import { BbcApp } from "../BbcApp";
import { BbcClientApp } from "../BbcClientApp";
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
  | "membre";

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
];

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
    return <AtelierScene screen={screen} personaKey={persona} />;
  }

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => next.set(k, v));
    setParams(next, { replace: true });
  };

  const courant = SCREENS.find((s) => s.k === screen) ?? SCREENS[0];
  const largeur = WIDTHS.find((w) => w.k === width) ?? WIDTHS[0];
  const src = `/atelier-bbc?embed=1&screen=${screen}&theme=${theme}&persona=${persona}`;

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

function AtelierScene({ screen, personaKey }: { screen: ScreenKey; personaKey: string }) {
  const persona = useMemo(
    () => ATELIER_MEMBERS.find((m) => m.key === personaKey) ?? ATELIER_MEMBERS[0],
    [personaKey],
  );

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
