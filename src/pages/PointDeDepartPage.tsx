// =============================================================================
// « Mon point de départ » — le bilan du Breakfast Club.
//
// Route : /point-de-depart[/:coachSlug]
//
// Pourquoi une page de plus alors que /bilan-online existe :
//
//  1. Le bilan La Base 360 ne parle JAMAIS du petit-déjeuner — ni l'heure, ni
//     le contenu, ni même s'il existe. Pour un club qui s'appelle The Breakfast
//     Club et dont le service tourne de 7h à 11h, c'était le trou le plus
//     visible. L'écran 2 le comble, et le matin devient la 7e dimension du
//     score (cf. bilanOnlineScoring.ts).
//  2. Le logo Breakfast Club est en encre presque noire : il disparaît sur le
//     fond sombre du PublicShell. D'où l'identité crème, celle de /reserver.
//  3. Le bilan La Base 360 finit sur « ton coach va t'appeler sous 48 h ».
//     Ici on finit sur DEUX portes — venir au club, ou démarrer à distance —
//     choisies par la réponse de l'écran 5.
//
// Ce qui est PARTAGÉ, et ne doit surtout pas être dupliqué :
//   · le moteur de score (`bilanOnlineScoring`), corrigé une fois en juillet
//     et qu'on ne veut pas corriger deux fois ;
//   · l'edge `submit-online-bilan`, inchangée — `payload` accepte du JSON
//     libre, donc le matin y entre sans migration ;
//   · la table `online_bilans`, donc le CRM voit ces bilans le jour même. Une
//     table à part aurait refait l'erreur de la boîte Messenger : un vivier
//     que personne ne regarde.
//
// Le tutoiement est celui du site club et celui des vingt textes de priorités
// du moteur. Passer la page au vous demanderait de dupliquer ces textes pour
// une page qui serait de toute façon à moitié incohérente.
//
// Maquette validée par Thomas le 09/09/2026.
// =============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";
import { extractFunctionError } from "../lib/utils/extractFunctionError";
import { useEtapeTunnel } from "../features/audience/useEtapeTunnel";
import type { ScoringInput } from "../lib/bilanOnlineScoring";
import "./PointDeDepartPage.css";

import { PointDeDepartAccueil } from "./PointDeDepartAccueil";
import { PointDeDepartAccueilDistance } from "./PointDeDepartAccueilDistance";
const LOGO = "/brand/breakfast-club/logo-heart.png";

/** Clé du brouillon local. Versionnée : un changement de forme du formulaire
 *  doit invalider les brouillons incompatibles plutôt que planter au relire. */
const CLE_BROUILLON = "ls-point-de-depart-v1";

// Les clés de session que la page résultats relit. Mêmes noms de forme que le
// bilan La Base 360, préfixe distinct pour ne pas se marcher dessus si
// quelqu'un fait les deux tunnels dans le même onglet.
export const CLE_RESULTATS = (slug: string) => `ls-pdd-resultats-${slug || "club"}`;
export const CLE_META = (slug: string) => `ls-pdd-meta-${slug || "club"}`;

// ── Types ───────────────────────────────────────────────────────────────────

type BreakfastFreq = "daily" | "sometimes" | "never";
type BreakfastTime = "before7" | "7to9" | "after9" | "varies";
type BreakfastType = "coffee_only" | "sweet" | "cereal_fruit" | "savory";
type BreakfastHolds = "yes" | "no" | "unsure";
type MealsBalanced = "yes" | "no" | "unsure";
type WaterTier = "1-3" | "4-6" | "7-10" | "10+";
type CoffeeTier = "0" | "1-2" | "3-4" | "5+";
type SodaTier = "0" | "1" | "2-3" | "4+";
type AlcoholTier = "0" | "1-3" | "4-7" | "8+";
type Grignotage = "matin" | "aprem" | "soir" | "jamais";
type SleepQuality = "bad" | "meh" | "ok" | "great";
type SleepHours = "<6" | "6-7" | "7-8" | "8+";
type MentalLoad = "light" | "ok" | "heavy" | "crushed";
type SportFrequency = "never" | "1x" | "2-3x" | "4+x";
/** La réponse qui décide de la fin du parcours. */
export type VenirMatin = "matin_ok" | "fin_matinee" | "loin" | "distance";

interface Form {
  first_name: string; age: string; height_cm: string;
  current_weight_kg: string; weight_loss_target_kg: string;
  city: string; phone: string;
  motivation_score: number;
  breakfast_freq: BreakfastFreq | "";
  breakfast_time: BreakfastTime | "";
  breakfast_type: BreakfastType | "";
  breakfast_holds: BreakfastHolds | "";
  meals_balanced: MealsBalanced | "";
  water_per_day: WaterTier | "";
  coffee_per_day: CoffeeTier | "";
  soda_per_day: SodaTier | "";
  alcohol_per_week: AlcoholTier | "";
  grignotage: Grignotage | "";
  sleep_quality: SleepQuality | "";
  sleep_hours: SleepHours | "";
  stress_level: number;
  mental_load: MentalLoad | "";
  active_daily: "yes" | "no" | "";
  sport_frequency: SportFrequency | "";
  venir_matin: VenirMatin | "";
  frein: string;
  consent: boolean;
}

const VIDE: Form = {
  first_name: "", age: "", height_cm: "",
  current_weight_kg: "", weight_loss_target_kg: "",
  city: "", phone: "", motivation_score: 7,
  breakfast_freq: "", breakfast_time: "", breakfast_type: "", breakfast_holds: "",
  meals_balanced: "", water_per_day: "", coffee_per_day: "", soda_per_day: "",
  alcohol_per_week: "", grignotage: "",
  sleep_quality: "", sleep_hours: "", stress_level: 5, mental_load: "",
  active_daily: "", sport_frequency: "",
  venir_matin: "", frein: "", consent: false,
};

/** La méta complétée après coup, quand la réponse arrive passé `PATIENCE_MS`. */
export const EVT_META_TARDIVE = "pdd:meta-tardive";

const TOTAL = 5;
const TITRES = ["On fait connaissance", "Ton matin", "Ton assiette", "Ton énergie", "Et pour la suite"];

/** Clés d'entonnoir COURTES et STABLES : un titre se réécrit, une clé qui
 *  change casse l'historique. Le rang est figé une fois pour toutes. */
const ETAPES = ["accueil", "identite", "matin", "assiette", "energie", "suite"];

const MOTIVATION_LABELS: [number, string][] = [
  [3, "J'hésite encore"], [5, "Je me tâte"], [7, "Plutôt motivée"],
  [9, "Vraiment décidée"], [10, "C'est décidé"],
];
const STRESS_LABELS: [number, string][] = [
  [2, "Plutôt zen"], [4, "Ça va"], [6, "Ça pèse un peu"], [8, "Ça pèse"], [10, "À bout"],
];
function palier(labels: [number, string][], v: number): string {
  return labels.find(([max]) => v <= max)?.[1] ?? labels[labels.length - 1][1];
}

function normalizeSlug(input: string): string {
  return input.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// ── Petits composants ───────────────────────────────────────────────────────

function Choix<T extends string>({ value, onPick, options, cols = 2 }: {
  value: T | "";
  onPick: (v: T) => void;
  options: { key: T; label: string; emoji?: string; wide?: boolean }[];
  cols?: 1 | 2 | 3;
}) {
  const cls = cols === 1 ? "pdd-opts one" : cols === 3 ? "pdd-opts three" : "pdd-opts";
  return (
    <div className={cls}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          className={`pdd-opt${o.wide ? " wide" : ""}`}
          aria-pressed={value === o.key}
          onClick={() => onPick(o.key)}
        >
          {o.emoji ? <span className="e" aria-hidden="true">{o.emoji}</span> : null}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="pdd-fld"><label>{label}</label>{children}</div>;
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function PointDeDepartPage() {
  const { coachSlug } = useParams<{ coachSlug?: string }>();
  const slug = useMemo(() => normalizeSlug(coachSlug ?? ""), [coachSlug]);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Mode « distance » (campagne zone large) : ?mode=distance. Change l'accueil
  // (jumeau non-Verdun) et fait sauter la question « tu peux passer le matin ? »
  // — pour ce public, tout mène à « démarre d'ici ». Le tunnel, le score et les
  // résultats sont identiques.
  const distance = params.get("mode") === "distance";

  const [ecran, setEcran] = useState(0); // 0 = accueil, 1..5 = étapes
  const [form, setForm] = useState<Form>(VIDE);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const brouillonId = useRef<string | null>(null);
  const hautRef = useRef<HTMLDivElement | null>(null);

  useEtapeTunnel("point-de-depart", ETAPES[ecran] ?? null, ecran + 1);


  // Reprise du brouillon local — quelqu'un qui ferme l'onglet à l'écran 3 et
  // revient ne recommence pas à zéro.
  useEffect(() => {
    try {
      const brut = localStorage.getItem(CLE_BROUILLON);
      if (!brut) return;
      const d = JSON.parse(brut) as { form?: Partial<Form>; ecran?: number; id?: string };
      if (d.form) setForm((f) => ({ ...f, ...d.form }));
      if (typeof d.ecran === "number") setEcran(Math.min(Math.max(d.ecran, 0), TOTAL));
      if (typeof d.id === "string") brouillonId.current = d.id;
    } catch {
      // Brouillon illisible (forme changée, stockage refusé) : on repart à
      // neuf plutôt que de planter au premier rendu.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CLE_BROUILLON, JSON.stringify({
        form, ecran, id: brouillonId.current,
      }));
    } catch { /* navigation privée stricte : tant pis pour la reprise */ }
  }, [form, ecran]);

  // Remonter en haut à chaque changement d'écran : sinon on arrive au milieu
  // de la question suivante, ce qui donne l'impression que rien ne s'est passé.
  useEffect(() => {
    hautRef.current?.scrollIntoView({ block: "start" });
  }, [ecran]);

  const set = useCallback(<K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErreur(null);
  }, []);

  /** Capture « Curieux » : dès que le prénom et le téléphone sont posés, la
   *  personne existe dans le CRM — même si elle abandonne à l'écran 3. C'est
   *  exactement ce qui manquait : sur l'entonnoir mesuré depuis le 01/09, 76 %
   *  des gens s'arrêtaient avant de laisser quoi que ce soit. */
  const poserBrouillon = useCallback(async () => {
    if (brouillonId.current) return;
    const tel = form.phone.trim();
    if (!form.first_name.trim() || !tel) return;
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { data, error } = await sb.functions.invoke("submit-online-bilan", {
        body: {
          draft: true, last_step: 1,
          coach_slug: slug || null,
          first_name: form.first_name.trim(),
          age: form.age ? Number(form.age) : null,
          height_cm: form.height_cm ? Number(form.height_cm) : null,
          city: form.city.trim() || null,
          phone: tel,
        },
      });
      if (!error && data && (data as { id?: string }).id) {
        brouillonId.current = (data as { id: string }).id;
      }
    } catch {
      // Jamais bloquant : la capture est un bonus, pas une étape du parcours.
    }
  }, [form.first_name, form.phone, form.age, form.height_cm, form.city, slug]);

  const scoringInput: ScoringInput = useMemo(() => ({
    meals_balanced: form.meals_balanced,
    water_per_day: form.water_per_day,
    coffee_per_day: form.coffee_per_day,
    soda_per_day: form.soda_per_day,
    alcohol_per_week: form.alcohol_per_week,
    sleep_quality: form.sleep_quality,
    sleep_hours: form.sleep_hours,
    stress_level: form.stress_level,
    mental_load: form.mental_load,
    // Le job n'est pas demandé ici : « au boulot, en ce moment » sonde l'envie
    // de changer de vie — c'est une question de recrutement La Base 360, pas
    // une question de santé pour quelqu'un qui arrive d'une pub Facebook.
    social_circle: "",
    active_daily: form.active_daily,
    sport_frequency: form.sport_frequency,
    breakfast_freq: form.breakfast_freq,
    breakfast_time: form.breakfast_time,
    breakfast_type: form.breakfast_type,
    breakfast_holds: form.breakfast_holds,
  }), [form]);

  /** Ce qui manque pour passer à l'écran suivant, ou null si c'est bon. */
  const bloquant = useMemo((): string | null => {
    if (ecran === 1) {
      if (!form.first_name.trim()) return "Il nous manque ton prénom.";
      if (!form.age.trim()) return "Il nous manque ton âge.";
      if (!form.city.trim()) return "Il nous manque ta ville.";
      if (!form.phone.trim()) return "Il nous manque ton téléphone — c'est le seul moyen qu'on a de te répondre.";
      return null;
    }
    if (ecran === 2) {
      if (!form.breakfast_freq) return "Dis-nous si tu petit-déjeunes.";
      // Les questions suivantes n'ont pas de sens pour quelqu'un qui ne
      // petit-déjeune jamais : le formulaire ne les affiche pas.
      if (form.breakfast_freq !== "never") {
        if (!form.breakfast_time) return "Vers quelle heure ?";
        if (!form.breakfast_type) return "Et c'est plutôt quoi, le matin ?";
        if (!form.breakfast_holds) return "Est-ce que ça tient jusqu'au repas suivant ?";
      }
      return null;
    }
    if (ecran === 3) {
      if (!form.meals_balanced) return "Tes repas te semblent équilibrés ?";
      if (!form.water_per_day) return "Combien d'eau par jour ?";
      return null;
    }
    if (ecran === 4) {
      if (!form.sleep_quality) return "Comment tu dors ?";
      if (!form.active_daily) return "Tu bouges au quotidien ?";
      if (!form.sport_frequency) return "Et le sport ?";
      return null;
    }
    if (ecran === 5) {
      if (!distance && !form.venir_matin) return "Dis-nous si tu peux passer au club le matin.";
      if (!form.consent) return "Il nous faut ton accord pour transmettre tes réponses à l'équipe.";
      return null;
    }
    return null;
  }, [ecran, form, distance]);

  const suivant = useCallback(() => {
    if (bloquant) { setErreur(bloquant); return; }
    if (ecran === 1) void poserBrouillon();
    setEcran((e) => e + 1);
  }, [bloquant, ecran, poserBrouillon]);

  /**
   * Combien de temps on accepte de faire attendre quelqu'un après son dernier
   * tap. Mesuré le 09/09 : l'edge met **8,2 secondes** à répondre, parce
   * qu'elle appelle Noaly (l'IA), Resend et le push AVANT de renvoyer quoi que
   * ce soit. Huit secondes d'écran figé après cinq écrans remplis, c'est là
   * qu'on ferme l'onglet.
   *
   * Or la page résultats ne dépend de RIEN du serveur : elle recalcule tout
   * depuis la session. On peut donc y aller sans attendre.
   */
  const PATIENCE_MS = 1500;

  const envoyer = useCallback(async () => {
    if (bloquant) { setErreur(bloquant); return; }
    setEnvoi(true);
    setErreur(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      // L'objectif n'est pas demandé — il se déduit : un nombre de kilos visé
      // veut dire perte de poids, sinon c'est du bien-être. Si Thomas veut le
      // demander explicitement, c'est un tap de plus à l'écran 1.
      const objectives = form.weight_loss_target_kg.trim() ? ["weight_loss"] : ["wellbeing"];
      // En distance, la question « venir le matin » n'est pas posée : on force
      // la valeur ici, au moment de l'envoi. Robuste — contrairement à un effet,
      // aucun risque que la reprise du brouillon la réécrase. C'est cette valeur
      // qui fait que l'écran de résultats n'affiche QUE « démarre d'ici ».
      const venirMatin = distance ? "distance" : form.venir_matin;
      const requete = sb.functions.invoke("submit-online-bilan", {
        body: {
          draft_id: brouillonId.current,
          coach_slug: slug || null,
          first_name: form.first_name.trim(),
          age: Number(form.age),
          height_cm: form.height_cm ? Number(form.height_cm) : null,
          city: form.city.trim() || null,
          phone: form.phone.trim(),
          objectives,
          weight_loss_target_kg: form.weight_loss_target_kg ? Number(form.weight_loss_target_kg) : null,
          current_weight_kg: form.current_weight_kg ? Number(form.current_weight_kg) : null,
          motivation_score: form.motivation_score,
          consent: true,
          last_step: TOTAL,
          payload: {
            // Marqueur de variante : c'est ce qui distingue un bilan du club
            // d'un bilan La Base 360 dans une table partagée.
            // "bbc-distance" pour la campagne zone large, "bbc" pour le club.
            // Permet de filtrer les leads distance dans le CRM et l'analyse.
            variante: distance ? "bbc-distance" : "bbc",
            matin: {
              freq: form.breakfast_freq, heure: form.breakfast_time,
              type: form.breakfast_type, tient: form.breakfast_holds,
            },
            meals: {
              meals_balanced: form.meals_balanced,
              water_per_day: form.water_per_day,
              coffee_per_day: form.coffee_per_day,
              soda_per_day: form.soda_per_day,
              alcohol_per_week: form.alcohol_per_week,
              grignotage: form.grignotage,
            },
            sleep_mind: {
              sleep_quality: form.sleep_quality, sleep_hours: form.sleep_hours,
              stress_level: form.stress_level, mental_load: form.mental_load,
            },
            active_daily: form.active_daily,
            sport_frequency: form.sport_frequency,
            suite: { venir_matin: venirMatin, frein: form.frein.trim() || null },
          },
        },
      }).then(async ({ data, error }) => {
        // L'edge peut répondre 200 avec `{ success: false, error }` : tester
        // `error` seul laisserait passer un refus de validation en silence.
        const ok = (data as { success?: boolean } | null)?.success === true;
        if (error || !ok) {
          throw new Error(await extractFunctionError(data, error, "L'envoi n'est pas passé."));
        }
        const d = data as { id?: string; result_token?: string } | null;
        return { id: d?.id ?? null, jeton: d?.result_token ?? null };
      });
      // On laisse une courte chance à la réponse d'arriver. Si elle traîne, on
      // affiche les résultats sans elle et la requête finit en arrière-plan.
      //
      // Ce qui rend ça sûr : la personne existe DÉJÀ dans le CRM depuis
      // l'écran 1 (le brouillon « Curieux » porte son prénom et son
      // téléphone). Même si l'écriture complète échouait, on ne perdrait que
      // le détail des réponses — jamais le contact.
      let idRecu: string | null = null;
      let jetonRecu: string | null = null;
      let echec: Error | null = null;
      const suivi = requete.then(
        ({ id, jeton }) => { idRecu = id; jetonRecu = jeton; return true; },
        (e: unknown) => { echec = e instanceof Error ? e : new Error(String(e)); return false; },
      );
      const issue = await Promise.race([
        suivi,
        new Promise<null>((r) => { setTimeout(() => r(null), PATIENCE_MS); }),
      ]);
      // Échec ARRIVÉ À TEMPS : on peut encore le dire à la personne.
      if (issue === false) throw echec ?? new Error("L'envoi n'est pas passé.");

      sessionStorage.setItem(CLE_RESULTATS(slug), JSON.stringify(scoringInput));
      sessionStorage.setItem(CLE_META(slug), JSON.stringify({
        first_name: form.first_name.trim(),
        venir_matin: venirMatin,
        bilan_id: idRecu,
        result_token: jetonRecu,
      }));
      // Le brouillon local ne s'efface qu'une fois l'écriture CONFIRMÉE : tant
      // qu'on n'a pas la réponse, il reste, et un retour en arrière retrouve
      // les réponses.
      if (issue === true) {
        try { localStorage.removeItem(CLE_BROUILLON); } catch { /* stockage refusé */ }
      } else {
        void suivi.then((abouti) => {
          if (!abouti) return;
          try { localStorage.removeItem(CLE_BROUILLON); } catch { /* idem */ }
          // La réponse est arrivée après coup : on complète la méta déjà écrite
          // et on prévient l'écran de résultats, qui est déjà à l'affiche.
          try {
            const brut = sessionStorage.getItem(CLE_META(slug));
            const meta = brut ? JSON.parse(brut) : {};
            meta.bilan_id = idRecu;
            meta.result_token = jetonRecu;
            sessionStorage.setItem(CLE_META(slug), JSON.stringify(meta));
            window.dispatchEvent(new CustomEvent(EVT_META_TARDIVE, { detail: meta }));
          } catch { /* stockage refusé : la porte garde son repli, rien ne casse */ }
        });
      }
      navigate(`/point-de-depart${slug ? `/${slug}` : ""}/resultats`);
    } catch (e) {
      // Un message qui dit quoi faire, pas « Erreur inconnue » — le bilan
      // La Base 360 affiche ça après sept écrans remplis, et c'est un
      // cul-de-sac. Ici on garde le brouillon et on le dit.
      const cause = e instanceof Error && e.message ? e.message : "L'envoi n'est pas passé.";
      setErreur(`${cause} Tes réponses sont gardées sur ce téléphone — réessaie dans un instant.`);
      setEnvoi(false);
    }
  }, [bloquant, form, slug, scoringInput, navigate, distance]);

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="pdd">
      <div ref={hautRef} />
      <header className="pdd-header"><div className="pdd-wrap in">
        <a href="/club" aria-label="Aller au site du Breakfast Club">
          <img src={LOGO} alt="The Breakfast Club by La Base" />
        </a>
        <span className="pdd-badge">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l7 3v5c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6l7-3Z" /><path d="m9 12 2 2 4-4" />
          </svg>
          Offert
        </span>
      </div></header>

      <main className="pdd-wrap">
        {ecran > 0 && (
          <div className="pdd-prog-bar">
            <div className="pdd-prog-row">
              <span>Étape {ecran}/{TOTAL}</span>
              <span className="save">Sauvegardé</span>
            </div>
            <div className="pdd-prog"><i style={{ width: `${(ecran / TOTAL) * 100}%` }} /></div>
            <p className="pdd-prog-title">{TITRES[ecran - 1]}</p>
          </div>
        )}

        {/* ══ Accueil ══════════════════════════════════════════════════════ */}
        {/* Refondu le 09/09 sur la maquette de Thomas : une vraie page de
            capture (miroir, ce qu'on reçoit, exemple légendé, bandeau vert,
            preuve, CTA collant) au lieu du court écran d'ouverture. Le tunnel
            lui-même — les 5 écrans et les résultats — ne bouge pas. */}
        {ecran === 0 && (distance
          ? <PointDeDepartAccueilDistance onStart={() => setEcran(1)} />
          : <PointDeDepartAccueil onStart={() => setEcran(1)} />)}

        {/* ══ 1 · On fait connaissance ═════════════════════════════════════ */}
        {ecran === 1 && (
          <section className="pdd-screen">
            <p className="pdd-eyebrow">Toi, en six lignes</p>
            <h1 className="pdd-title">Dis-nous<br />qui tu es</h1>

            <Champ label="Ton prénom">
              <input className="pdd-field" value={form.first_name} maxLength={50}
                     autoComplete="given-name" placeholder="Sylvie"
                     onChange={(e) => set("first_name", e.target.value)} />
            </Champ>
            <div className="pdd-two" style={{ marginTop: 11 }}>
              <Champ label="Âge">
                <input className="pdd-field" type="number" inputMode="numeric" min={16} max={99}
                       value={form.age} placeholder="59"
                       onChange={(e) => set("age", e.target.value)} />
              </Champ>
              <Champ label="Taille (cm)">
                <input className="pdd-field" type="number" inputMode="numeric" min={100} max={220}
                       value={form.height_cm} placeholder="162"
                       onChange={(e) => set("height_cm", e.target.value)} />
              </Champ>
            </div>
            <div className="pdd-two" style={{ marginTop: 11 }}>
              <Champ label="Poids (kg)">
                <input className="pdd-field" type="number" inputMode="numeric" min={20} max={400}
                       value={form.current_weight_kg} placeholder="facultatif"
                       onChange={(e) => set("current_weight_kg", e.target.value)} />
              </Champ>
              <Champ label="Objectif (kg)">
                <input className="pdd-field" type="number" inputMode="numeric" min={1} max={50}
                       value={form.weight_loss_target_kg} placeholder="facultatif"
                       onChange={(e) => set("weight_loss_target_kg", e.target.value)} />
              </Champ>
            </div>
            <Champ label="Ta ville">
              <input className="pdd-field" value={form.city} maxLength={80}
                     autoComplete="address-level2" placeholder="Verdun"
                     onChange={(e) => set("city", e.target.value)} />
            </Champ>
            <Champ label="Ton téléphone">
              <input className="pdd-field" type="tel" inputMode="tel" maxLength={20}
                     value={form.phone} autoComplete="tel" placeholder="06 12 34 56 78"
                     onChange={(e) => set("phone", e.target.value)} />
            </Champ>

            <div className="pdd-hint">
              <span className="i" aria-hidden="true">🔒</span>
              <span>Le poids et la taille servent à calculer ton point de départ. Vus par l'équipe du club, personne d'autre.</span>
            </div>

            <div className="pdd-grp">
              <span className="pdd-glab">Ta motivation, aujourd'hui</span>
              <div className="pdd-slider">
                <div className="v">{form.motivation_score}<small>/10</small></div>
                <div className="l">{palier(MOTIVATION_LABELS, form.motivation_score)}</div>
                <input className="pdd-range" type="range" min={1} max={10} step={1}
                       aria-label="Ta motivation sur 10"
                       value={form.motivation_score}
                       onChange={(e) => set("motivation_score", Number(e.target.value))} />
                <div className="ends"><span>1 · j'hésite</span><span>10 · c'est décidé</span></div>
              </div>
            </div>

            {erreur && <p className="pdd-err">{erreur}</p>}
            <div className="pdd-actions">
              <button type="button" className="pdd-cta" onClick={suivant}>Suivant →</button>
              <button type="button" className="pdd-back" onClick={() => setEcran(0)}>← Retour</button>
            </div>
          </section>
        )}

        {/* ══ 2 · Ton matin ════════════════════════════════════════════════ */}
        {ecran === 2 && (
          <section className="pdd-screen">
            <p className="pdd-eyebrow">Notre métier</p>
            <h1 className="pdd-title">Ton matin</h1>
            <p className="pdd-sub">C'est là que tout se joue — et c'est pour ça que le club ouvre à 7h.</p>

            <div className="pdd-grp">
              <span className="pdd-glab">Tu petit-déjeunes&nbsp;?</span>
              <Choix cols={3} value={form.breakfast_freq}
                     onPick={(v) => set("breakfast_freq", v)}
                     options={[
                       { key: "daily", label: "Tous les jours", emoji: "☀️" },
                       { key: "sometimes", label: "De temps en temps", emoji: "🌥️" },
                       { key: "never", label: "Jamais", emoji: "🚫" },
                     ]} />
            </div>

            {form.breakfast_freq && form.breakfast_freq !== "never" && (
              <>
                <div className="pdd-grp">
                  <span className="pdd-glab">Vers quelle heure&nbsp;?</span>
                  <Choix value={form.breakfast_time} onPick={(v) => set("breakfast_time", v)}
                         options={[
                           { key: "before7", label: "Avant 7h", emoji: "🌅" },
                           { key: "7to9", label: "Entre 7h et 9h", emoji: "🕖" },
                           { key: "after9", label: "Après 9h", emoji: "🕙" },
                           { key: "varies", label: "Ça dépend", emoji: "🤷" },
                         ]} />
                </div>

                <div className="pdd-grp">
                  <span className="pdd-glab">Le matin, c'est plutôt</span>
                  <Choix value={form.breakfast_type} onPick={(v) => set("breakfast_type", v)}
                         options={[
                           { key: "coffee_only", label: "Un café, c'est tout", emoji: "☕" },
                           { key: "sweet", label: "Sucré — tartines, viennoiserie", emoji: "🥐" },
                           { key: "cereal_fruit", label: "Céréales, fruits", emoji: "🥣" },
                           { key: "savory", label: "Salé — œufs, fromage", emoji: "🍳" },
                         ]} />
                </div>

                <div className="pdd-grp">
                  <span className="pdd-glab">Ça tient jusqu'au repas suivant&nbsp;?</span>
                  <Choix cols={3} value={form.breakfast_holds} onPick={(v) => set("breakfast_holds", v)}
                         options={[
                           { key: "yes", label: "Oui", emoji: "👍" },
                           { key: "no", label: "Non, j'ai faim", emoji: "😕" },
                           { key: "unsure", label: "Je ne sais pas", emoji: "🤔" },
                         ]} />
                </div>
              </>
            )}

            {form.breakfast_freq === "never" && (
              <div className="pdd-hint">
                <span className="i" aria-hidden="true">☕</span>
                <span>C'est le cas de beaucoup de monde. On en reparle — c'est souvent le premier levier.</span>
              </div>
            )}

            {erreur && <p className="pdd-err">{erreur}</p>}
            <div className="pdd-actions">
              <button type="button" className="pdd-cta" onClick={suivant}>Suivant →</button>
              <button type="button" className="pdd-back" onClick={() => setEcran(1)}>← Retour</button>
            </div>
          </section>
        )}

        {/* ══ 3 · Ton assiette ═════════════════════════════════════════════ */}
        {ecran === 3 && (
          <section className="pdd-screen">
            <p className="pdd-eyebrow">Le reste de la journée</p>
            <h1 className="pdd-title">Ton assiette<br />&amp; ton verre</h1>

            <div className="pdd-grp">
              <span className="pdd-glab">Tes repas te semblent équilibrés&nbsp;?</span>
              <Choix cols={3} value={form.meals_balanced} onPick={(v) => set("meals_balanced", v)}
                     options={[
                       { key: "yes", label: "Oui, plutôt", emoji: "✅" },
                       { key: "no", label: "Pas vraiment", emoji: "❌" },
                       { key: "unsure", label: "Je ne sais pas", emoji: "🤔" },
                     ]} />
            </div>

            <div className="pdd-grp">
              <span className="pdd-glab">💧 Eau par jour</span>
              <Choix value={form.water_per_day} onPick={(v) => set("water_per_day", v)}
                     options={[
                       { key: "1-3", label: "1 à 3 verres" }, { key: "4-6", label: "4 à 6" },
                       { key: "7-10", label: "7 à 10" }, { key: "10+", label: "10 et +" },
                     ]} />
            </div>

            <div className="pdd-grp">
              <span className="pdd-glab">☕ Cafés par jour</span>
              <Choix cols={2} value={form.coffee_per_day} onPick={(v) => set("coffee_per_day", v)}
                     options={[
                       { key: "0", label: "Aucun" }, { key: "1-2", label: "1 à 2" },
                       { key: "3-4", label: "3 à 4" }, { key: "5+", label: "5 et +" },
                     ]} />
            </div>

            <div className="pdd-grp">
              <span className="pdd-glab">🥤 Sodas et jus sucrés par jour</span>
              <Choix cols={2} value={form.soda_per_day} onPick={(v) => set("soda_per_day", v)}
                     options={[
                       { key: "0", label: "Aucun" }, { key: "1", label: "1" },
                       { key: "2-3", label: "2 à 3" }, { key: "4+", label: "4 et +" },
                     ]} />
            </div>

            <div className="pdd-grp">
              <span className="pdd-glab">🍷 Alcool par semaine</span>
              <Choix cols={2} value={form.alcohol_per_week} onPick={(v) => set("alcohol_per_week", v)}
                     options={[
                       { key: "0", label: "Aucun" }, { key: "1-3", label: "1 à 3 verres" },
                       { key: "4-7", label: "4 à 7" }, { key: "8+", label: "8 et +" },
                     ]} />
            </div>

            <div className="pdd-grp">
              <span className="pdd-glab">Tu grignotes plutôt</span>
              <Choix value={form.grignotage} onPick={(v) => set("grignotage", v)}
                     options={[
                       { key: "matin", label: "Le matin", emoji: "🌤️" },
                       { key: "aprem", label: "L'après-midi", emoji: "🕓" },
                       { key: "soir", label: "Le soir", emoji: "🌙" },
                       { key: "jamais", label: "Jamais", emoji: "🚫" },
                     ]} />
            </div>

            {erreur && <p className="pdd-err">{erreur}</p>}
            <div className="pdd-actions">
              <button type="button" className="pdd-cta" onClick={suivant}>Suivant →</button>
              <button type="button" className="pdd-back" onClick={() => setEcran(2)}>← Retour</button>
            </div>
          </section>
        )}

        {/* ══ 4 · Ton énergie ══════════════════════════════════════════════ */}
        {ecran === 4 && (
          <section className="pdd-screen">
            <p className="pdd-eyebrow">Sommeil, tête, mouvement</p>
            <h1 className="pdd-title">Ton énergie</h1>

            <div className="pdd-grp">
              <span className="pdd-glab">Ton sommeil</span>
              <Choix value={form.sleep_quality} onPick={(v) => set("sleep_quality", v)}
                     options={[
                       { key: "bad", label: "Mauvais", emoji: "😫" }, { key: "meh", label: "Moyen", emoji: "😕" },
                       { key: "ok", label: "Correct", emoji: "🙂" }, { key: "great", label: "Top", emoji: "😊" },
                     ]} />
            </div>

            <div className="pdd-grp">
              <span className="pdd-glab">Heures par nuit</span>
              <Choix value={form.sleep_hours} onPick={(v) => set("sleep_hours", v)}
                     options={[
                       { key: "<6", label: "Moins de 6h" }, { key: "6-7", label: "6 à 7h" },
                       { key: "7-8", label: "7 à 8h" }, { key: "8+", label: "Plus de 8h" },
                     ]} />
            </div>

            <div className="pdd-grp">
              <span className="pdd-glab">Ton niveau de stress</span>
              <div className="pdd-slider">
                <div className="v">{form.stress_level}<small>/10</small></div>
                <div className="l">{palier(STRESS_LABELS, form.stress_level)}</div>
                <input className="pdd-range" type="range" min={1} max={10} step={1}
                       aria-label="Ton niveau de stress sur 10"
                       value={form.stress_level}
                       onChange={(e) => set("stress_level", Number(e.target.value))} />
                <div className="ends"><span>1 · zen</span><span>10 · à bout</span></div>
              </div>
            </div>

            <div className="pdd-grp">
              <span className="pdd-glab">Ta charge mentale</span>
              <Choix value={form.mental_load} onPick={(v) => set("mental_load", v)}
                     options={[
                       { key: "light", label: "Légère", emoji: "🌿" }, { key: "ok", label: "Ça va", emoji: "😐" },
                       { key: "heavy", label: "Lourde", emoji: "😰" }, { key: "crushed", label: "Écrasante", emoji: "🌪️" },
                     ]} />
            </div>

            <div className="pdd-grp">
              <span className="pdd-glab">Au quotidien (marche, escaliers, jardin)</span>
              <Choix value={form.active_daily} onPick={(v) => set("active_daily", v)}
                     options={[
                       { key: "yes", label: "Je bouge", emoji: "🚶" },
                       { key: "no", label: "Plutôt assis(e)", emoji: "🛋️" },
                     ]} />
            </div>

            <div className="pdd-grp">
              <span className="pdd-glab">Sport par semaine</span>
              <Choix value={form.sport_frequency} onPick={(v) => set("sport_frequency", v)}
                     options={[
                       { key: "never", label: "Jamais" }, { key: "1x", label: "1× / semaine" },
                       { key: "2-3x", label: "2 à 3×" }, { key: "4+x", label: "4× et +" },
                     ]} />
            </div>

            {erreur && <p className="pdd-err">{erreur}</p>}
            <div className="pdd-actions">
              <button type="button" className="pdd-cta" onClick={suivant}>Suivant →</button>
              <button type="button" className="pdd-back" onClick={() => setEcran(3)}>← Retour</button>
            </div>
          </section>
        )}

        {/* ══ 5 · Et pour la suite ═════════════════════════════════════════ */}
        {ecran === 5 && (
          <section className="pdd-screen">
            <p className="pdd-eyebrow">Dernier écran</p>
            <h1 className="pdd-title">Et pour<br />la suite&nbsp;?</h1>

            {/* En distance, cette question n'a pas de sens (personne ne vient
                à Verdun le matin) : on la masque, `venir_matin` vaut déjà
                "distance", et la fin mène droit à « démarre d'ici ». */}
            {!distance && (
              <>
                <div className="pdd-grp">
                  <span className="pdd-glab">
                    Le club est ouvert dès 7h, à Verdun. Tu pourrais passer un matin&nbsp;?
                  </span>
                  <Choix cols={1} value={form.venir_matin} onPick={(v) => set("venir_matin", v)}
                         options={[
                           { key: "matin_ok", label: "Oui, le matin ça me va", emoji: "☀️", wide: true },
                           { key: "fin_matinee", label: "Plutôt en fin de matinée", emoji: "🕓", wide: true },
                           { key: "loin", label: "Verdun c'est loin pour moi", emoji: "🚗", wide: true },
                           { key: "distance", label: "Je préfère à distance", emoji: "💻", wide: true },
                         ]} />
                </div>

                <div className="pdd-hint">
                  <span className="i" aria-hidden="true">💡</span>
                  <span>Ça ne bloque rien. C'est juste pour te proposer la bonne suite à la fin.</span>
                </div>
              </>
            )}

            <div className="pdd-grp">
              <span className="pdd-glab">S'il y a un truc qui te freine, dis-le en une phrase</span>
              <textarea className="pdd-field" value={form.frein} maxLength={400}
                        placeholder="Facultatif — mais c'est souvent le plus utile."
                        onChange={(e) => set("frein", e.target.value)} />
            </div>

            <div className="pdd-grp">
              <button type="button" className="pdd-opt wide" aria-pressed={form.consent}
                      style={{ textAlign: "left", alignItems: "flex-start" }}
                      onClick={() => set("consent", !form.consent)}>
                <span className="e" aria-hidden="true" style={{ color: "var(--sage-d)" }}>
                  {form.consent ? "☑" : "☐"}
                </span>
                <span style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 400, lineHeight: 1.45 }}>
                  J'accepte que mes réponses soient transmises à l'équipe du Breakfast Club.
                  Pas de revente, pas de diffusion.
                </span>
              </button>
            </div>

            {/* Pas de titre en dur ici : le même encart sert aux questions
                oubliées ET à un envoi raté. Annoncer « ça n'est pas parti »
                alors qu'il manque juste une case cochée fait peur pour rien. */}
            {erreur && <p className="pdd-err">{erreur}</p>}
            <div className="pdd-actions">
              <button type="button" className="pdd-cta" onClick={envoyer} disabled={envoi}>
                {envoi ? "Un instant…" : "Voir mes résultats ✓"}
              </button>
              <button type="button" className="pdd-back" onClick={() => setEcran(4)} disabled={envoi}>
                ← Retour
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
