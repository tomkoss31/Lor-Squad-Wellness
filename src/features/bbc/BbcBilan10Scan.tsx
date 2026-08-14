// =============================================================================
// BbcBilan10Scan — l'étape 1 du bilan des 10, avec des CHIFFRES.
// Maquette validée : « 4 · Bilan des 10 » (bbc-saisie-ebe.html).
//
// ── POURQUOI DES BARRES ET PAS UNE COURBE ────────────────────────────────────
// Deux relevés ne font pas une courbe, ils font un ÉCART. Départ → aujourd'hui
// en barres horizontales : pastille creuse = le départ, pastille pleine =
// aujourd'hui, avec une échelle de lecture propre à chaque mesure. Les courbes
// vivent dans la PWA du membre, qui a autant de points qu'il a de bilans.
//
// ── DEUX RÉGLAGES QUI NE TOUCHENT QUE L'AFFICHAGE ────────────────────────────
//  • l'OBJECTIF décide du sens de « bien » (perdre du poids vs en prendre) ;
//  • l'INVERSEUR « % | kg » bascule d'un coup la masse grasse ET le muscle.
// En base rien ne bouge : `bodyFat` reste un pourcentage, `muscleMass` des
// kilos — c'est ce que la balance affiche et ce que 679 bilans contiennent.
//
// ── L'ÉCART PEUT CHANGER DE SIGNE SELON L'UNITÉ ──────────────────────────────
// 44,1 → 43,8 kg de muscle avec un poids qui tombe de 74,5 à 70,3 : −0,3 kg
// ET +3,1 points. Les deux lectures sont vraies. On ne masque pas ce
// retournement, on l'explique sous la mesure — c'est toute la raison d'être de
// l'inverseur.
//
// Toute l'arithmétique et tout le sens métier viennent de `lib/bodyMetricUnits`.
// Aucune conversion, aucun seuil n'est réécrit ici.
//
// Jetons --ls-bbc-* uniquement. Le lime ne sert JAMAIS de couleur de texte
// (2,18:1 sur blanc) : c'est --ls-bbc-lime-text pour l'encre, --ls-bbc-lime
// pour les aplats.
// =============================================================================

import { useCallback, useMemo, useState } from "react";
import { UnitToggle } from "../../components/bbc/UnitToggle";
import {
  POIDS_MANQUANT_MESSAGE,
  compareReadings,
  displayMetric,
  isConvertibleMetric,
  isWeightUsable,
  nativeUnitOf,
  toNativeValue,
  type BodyMetricKey,
  type DisplayUnit,
  type Goal,
  type MetricComparison,
} from "../../lib/bodyMetricUnits";

/** Les 8 mesures du body scan, valeurs NATIVES (bodyFat en %, muscle en kg). */
export type ScanValues = Record<BodyMetricKey, number | null>;

export const SCAN_VIDE: ScanValues = {
  weight: null,
  bodyFat: null,
  muscleMass: null,
  hydration: null,
  visceralFat: null,
  metabolicAge: null,
  bmr: null,
  boneMass: null,
};

interface Mesure {
  key: BodyMetricKey;
  label: string;
  icone: string;
  /** Échelle de lecture de la barre, par unité affichée. Têtes de gondole seules. */
  echelle?: Record<DisplayUnit, number>;
}

/**
 * Ce que la DERNIÈRE bascule d'unité a écrit dans les champs, et la valeur
 * native d'origine de chacun.
 *
 * Sans cette ancre, l'affichage devient la donnée : 31,1 % de 70,3 kg s'affiche
 * « 21,9 » kg (arrondi au dixième), et relire 21,9 kg redonne 31,2 %. Deux
 * allers-retours sur l'inverseur suffisaient à faire dériver la mesure d'un
 * dixième, à retourner le verdict affiché — et c'est la valeur dérivée qui
 * partait en base. Or l'inverseur ne doit changer QUE l'affichage.
 *
 * La règle : un champ dont le texte n'a pas bougé depuis la bascule garde sa
 * valeur d'origine ; un champ retapé est relu, forcément.
 *
 * Conséquence assumée : corriger le POIDS après une bascule ne réécrit pas les
 * champs graisse / muscle (on ne réécrit jamais pendant qu'on tape). La mesure
 * reste juste — c'est bien le % lu sur la balance qui est conservé — mais son
 * affichage en kilos ne se rafraîchit qu'à la bascule suivante.
 */
interface Ancrage {
  unit: DisplayUnit;
  texte: Record<BodyMetricKey, string>;
  natifs: ScanValues;
}

/** Les 3 mesures qu'on lit à bout de bras pendant le rendez-vous. */
const EN_TETE: Mesure[] = [
  { key: "weight", label: "Poids", icone: "⚖️", echelle: { percent: 8, kg: 8 } },
  { key: "bodyFat", label: "Masse grasse", icone: "🔥", echelle: { percent: 8, kg: 8 } },
  { key: "muscleMass", label: "Masse musculaire", icone: "💪", echelle: { percent: 8, kg: 4 } },
];

/** Les 5 autres, repliées : utiles, mais pas pendant qu'on regarde le membre. */
const REPLIEES: Mesure[] = [
  { key: "hydration", label: "Hydratation", icone: "💧" },
  { key: "visceralFat", label: "Graisse viscérale", icone: "🫀" },
  { key: "metabolicAge", label: "Âge métabolique", icone: "🧬" },
  { key: "bmr", label: "Métabolisme (BMR)", icone: "⚡" },
  { key: "boneMass", label: "Masse osseuse", icone: "🦴" },
];

const TOUTES: Mesure[] = [...EN_TETE, ...REPLIEES];

// -----------------------------------------------------------------------------
// Formatage — français, virgule décimale, chiffres à chasse fixe
// -----------------------------------------------------------------------------

function fmt(n: number, decimales: number): string {
  return n.toFixed(decimales).replace(".", ",");
}

/** Un écart s'écrit toujours avec son signe : « +3,7 », « −0,3 », « 0,0 ». */
function signe(n: number, decimales: number): string {
  const prefixe = n > 0 ? "+" : n < 0 ? "−" : "";
  return prefixe + Math.abs(n).toFixed(decimales).replace(".", ",");
}

/** Le champ contient ce que le coach a tapé : virgule tolérée, vide = null. */
function parseNombre(texte: string): number | null {
  const brut = texte.trim().replace(",", ".");
  if (!brut) return null;
  const n = Number(brut);
  return Number.isFinite(n) ? n : null;
}

// -----------------------------------------------------------------------------
// Couleurs du verdict — aplats d'un côté, encre de l'autre
// -----------------------------------------------------------------------------

function aplatVerdict(v: MetricComparison["verdict"]): string {
  if (v === "bon") return "var(--ls-bbc-lime)";
  if (v === "mauvais") return "var(--ls-bbc-coral)";
  return "var(--ls-bbc-hint)";
}
function encreVerdict(v: MetricComparison["verdict"]): string {
  if (v === "bon") return "var(--ls-bbc-lime-text)";
  if (v === "mauvais") return "var(--ls-bbc-coral)";
  return "var(--ls-bbc-hint)";
}
const MOT_VERDICT: Record<MetricComparison["verdict"], string> = {
  bon: "va dans le bon sens",
  mauvais: "va dans le mauvais sens",
  neutre: "stable",
};

/**
 * Position des deux pastilles sur la barre. On centre la lecture sur les DEUX
 * relevés et on déroule l'échelle propre à la mesure autour : sans ça, 44,1 et
 * 44,2 kg de muscle seraient deux points superposés sur une barre de 0 à 100.
 */
function positions(echelle: number, depart: number, actuel: number) {
  const ref = echelle || Math.max(Math.abs(depart), 1);
  const milieu = (depart + actuel) / 2;
  const x = (n: number) => Math.min(96, Math.max(4, 50 + ((n - milieu) / ref) * 100));
  return { depart: x(depart), actuel: x(actuel) };
}

/** La phrase sous la mesure : ce qu'on cherche, puis le verdict. */
function phraseDe(mesure: Mesure, cmp: MetricComparison, goal: Goal): string {
  if (mesure.key === "weight") {
    return goal === "mass-gain" ? "on cherche à en prendre" : "on cherche à en perdre";
  }
  if (mesure.key === "bodyFat") {
    // La masse grasse se juge dans les DEUX objectifs (cf. bodyMetricUnits) :
    // aucune phrase « on ne la juge pas » ici, elle mentirait sur le verdict.
    return cmp.unit === "kg" ? "des kilos de gras, pas des points" : "on cherche à la faire baisser";
  }
  return cmp.unit === "%"
    ? "en %, la part de muscle monte aussi quand le poids baisse"
    : "en perdre serait le mauvais signe";
}

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

interface BbcBilan10ScanProps {
  /** Le point de départ : le body scan du premier bilan chiffré du membre. */
  depart: ScanValues | null;
  /** La date de ce point de départ, pour le dire au coach. */
  departDate?: string | null;
  /** Ce qui a déjà été enregistré aujourd'hui (ré-ouverture de la feuille). */
  dejaEnregistre?: ScanValues | null;
  /** L'objectif du membre, tel qu'il est en base. Ne sert qu'à colorer. */
  objectifInitial: Goal;
  /** L'étape 1 est-elle cochée ? */
  fait: boolean;
  /** Cocher / décocher l'étape à la main (le coach peut l'avoir fait sur papier). */
  onBasculer: () => void;
  enCoursEnregistrement: boolean;
  enregistreLe: string | null;
  erreur: string | null;
  onEnregistrer: (valeurs: ScanValues) => void;
  numero: number;
  titre: string;
  sousTitre: string;
}

export function BbcBilan10Scan({
  depart,
  departDate,
  dejaEnregistre,
  objectifInitial,
  fait,
  onBasculer,
  enCoursEnregistrement,
  enregistreLe,
  erreur,
  onEnregistrer,
  numero,
  titre,
  sousTitre,
}: BbcBilan10ScanProps) {
  const [unit, setUnit] = useState<DisplayUnit>("percent");
  const [goal, setGoal] = useState<Goal>(objectifInitial);
  const [detailOuvert, setDetailOuvert] = useState(false);

  // Le champ contient ce que le coach a tapé, DANS L'UNITÉ AFFICHÉE. La valeur
  // native (celle qui partira en base) en est déduite, jamais l'inverse.
  const [texte, setTexte] = useState<Record<BodyMetricKey, string>>(() =>
    texteDepuisNatif(dejaEnregistre ?? null, "percent", dejaEnregistre?.weight ?? null),
  );

  // L'ancre de la dernière bascule (cf. `Ancrage`). À l'ouverture d'une feuille
  // déjà enregistrée, elle porte les valeurs telles qu'elles sont en base : une
  // bascule immédiate repart donc du chiffre écrit, pas de son arrondi affiché.
  const [ancrage, setAncrage] = useState<Ancrage | null>(() =>
    dejaEnregistre
      ? {
          unit: "percent",
          texte: texteDepuisNatif(dejaEnregistre, "percent", dejaEnregistre.weight),
          natifs: dejaEnregistre,
        }
      : null,
  );

  const poidsAujourdhui = parseNombre(texte.weight);
  const poidsUtilisable = isWeightUsable(poidsAujourdhui);

  const natifs = useMemo<ScanValues>(
    () => natifsDepuisTexte(texte, unit, poidsAujourdhui, ancrage),
    [texte, unit, poidsAujourdhui, ancrage],
  );

  const comparaisons = useMemo(() => {
    const sortie = {} as Record<BodyMetricKey, MetricComparison>;
    for (const m of TOUTES) {
      sortie[m.key] = compareReadings(
        m.key,
        unit,
        goal,
        { value: depart?.[m.key] ?? null, weight: depart?.weight ?? null },
        { value: natifs[m.key], weight: poidsAujourdhui },
      );
    }
    return sortie;
  }, [depart, natifs, poidsAujourdhui, unit, goal]);

  /**
   * Bascule d'unité : on relit d'abord les natifs sous l'ANCIENNE unité, puis on
   * réécrit les champs sous la nouvelle. Sans ce passage par le natif, on
   * relirait « 31,1 » comme des kilos après avoir tapé des pourcentages.
   *
   * Deux garde-fous, chacun pour un dégât constaté :
   *  • les natifs viennent de l'ancre quand le champ n'a pas bougé, sinon
   *    l'arrondi d'affichage deviendrait la donnée à chaque aller-retour ;
   *  • seuls la graisse et le muscle sont réécrits : reformater le poids
   *    changerait « 82,45 » en « 82,5 », c'est-à-dire le dénominateur de toutes
   *    les conversions — et le champ en cours de frappe.
   */
  const changerUnite = useCallback(
    (suivante: DisplayUnit) => {
      if (suivante === unit) return;
      const poids = parseNombre(texte.weight);
      const natifsAvant = natifsDepuisTexte(texte, unit, poids, ancrage);
      const apres = texteApresBascule(texte, natifsAvant, suivante, poids);
      setTexte(apres);
      setAncrage({ unit: suivante, texte: apres, natifs: natifsAvant });
      setUnit(suivante);
    },
    [unit, texte, ancrage],
  );

  function saisir(key: BodyMetricKey, valeur: string) {
    setTexte((avant) => ({ ...avant, [key]: valeur }));
  }

  const peutEnregistrer = poidsUtilisable && !enCoursEnregistrement;
  const departVide = !depart || !isWeightUsable(depart.weight);

  // ── Le hero : l'écart de poids, en grand, et la masse grasse juste dessous ──
  const cmpPoids = comparaisons.weight;
  const cmpGras = comparaisons.bodyFat;

  return (
    <>
      {/* ═══ Hero résultat, calculé en direct ═══════════════════════════════ */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 20,
          padding: 20,
          textAlign: "center",
          background: "var(--ls-bbc-s1)",
          border: "1px solid color-mix(in srgb, var(--ls-bbc-lime) 30%, transparent)",
          marginBottom: 14,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -40,
            left: "50%",
            transform: "translateX(-50%)",
            width: 230,
            height: 230,
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--ls-bbc-lime) 15%, transparent), transparent 66%)",
          }}
        />
        <div style={{ position: "relative" }}>
          <div
            style={{
              fontFamily: "var(--ls-bbc-font-mono)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ls-bbc-muted)",
              fontWeight: 600,
            }}
          >
            en 10 visites
          </div>
          <div
            style={{
              fontFamily: "var(--ls-bbc-font-display)",
              fontSize: 46,
              lineHeight: 1,
              marginTop: 6,
              color: encreVerdict(cmpPoids.verdict),
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {cmpPoids.delta.value == null ? "—" : signe(cmpPoids.delta.value, cmpPoids.decimals)}
          </div>
          <div
            style={{
              fontFamily: "var(--ls-bbc-font-mono)",
              fontSize: 11,
              color: "var(--ls-bbc-muted)",
              marginTop: 5,
            }}
          >
            kg depuis le départ ·{" "}
            {cmpPoids.current.value == null ? "—" : fmt(cmpPoids.current.value, cmpPoids.decimals)} kg
            aujourd'hui
          </div>
          <div
            style={{
              fontSize: 11.5,
              marginTop: 9,
              color: cmpGras.verdict === "bon" ? "var(--ls-bbc-teal)" : encreVerdict(cmpGras.verdict),
            }}
          >
            {cmpGras.delta.value == null
              ? "masse grasse : à saisir"
              : `et ${signe(cmpGras.delta.value, cmpGras.decimals)} ${
                  cmpGras.unit === "kg" ? "kg" : "points"
                } de masse grasse`}
          </div>
        </div>
      </div>

      {/* ═══ Étape 1, dépliée : la 2e pesée ════════════════════════════════ */}
      <div
        style={{
          background: "var(--ls-bbc-s1)",
          border: "1px solid color-mix(in srgb, var(--ls-bbc-lime) 32%, transparent)",
          borderRadius: 18,
          padding: "14px 14px 16px",
          marginBottom: 12,
        }}
      >
        <button
          type="button"
          onClick={onBasculer}
          aria-pressed={fait}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 11,
            width: "100%",
            textAlign: "left",
            background: "transparent",
            border: 0,
            padding: 0,
            marginBottom: 10,
            cursor: "pointer",
            color: "var(--ls-bbc-text)",
            fontFamily: "var(--ls-bbc-font-body)",
          }}
        >
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 999,
              flex: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: fait ? "var(--ls-bbc-lime)" : "transparent",
              border: `1px solid ${fait ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line2)"}`,
              fontFamily: "var(--ls-bbc-font-mono)",
              fontSize: 11,
              fontWeight: 700,
              color: fait ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-hint)",
            }}
          >
            {fait ? "✓" : numero}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 13.5, fontWeight: 700 }}>{titre}</span>
            <span
              style={{
                display: "block",
                fontSize: 11.5,
                color: "var(--ls-bbc-muted)",
                marginTop: 2,
                lineHeight: 1.45,
              }}
            >
              {sousTitre}
            </span>
          </span>
        </button>

        {/* ── Objectif : il décide du sens de « bien » ───────────────────── */}
        <div style={{ margin: "2px 0 12px" }}>
          <span
            style={{
              display: "block",
              fontFamily: "var(--ls-bbc-font-mono)",
              fontSize: 9,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ls-bbc-hint)",
              marginBottom: 8,
              lineHeight: 1.5,
            }}
          >
            objectif du membre — il décide du sens de « bien »
          </span>
          <div role="group" aria-label="Objectif du membre" style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {([
              { valeur: "weight-loss" as Goal, libelle: "Perte de poids" },
              { valeur: "mass-gain" as Goal, libelle: "Prise de masse" },
            ]).map((o) => {
              const actif = goal === o.valeur;
              return (
                <button
                  key={o.valeur}
                  type="button"
                  aria-pressed={actif}
                  onClick={() => setGoal(o.valeur)}
                  style={{
                    minHeight: 44,
                    padding: "0 14px",
                    borderRadius: 999,
                    border: `1px solid ${actif ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line2)"}`,
                    background: actif ? "var(--ls-bbc-lime)" : "transparent",
                    color: actif ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-muted)",
                    fontFamily: "var(--ls-bbc-font-body)",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {o.libelle}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── L'inverseur % | kg ─────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 10px" }}>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: "var(--ls-bbc-font-mono)",
              fontSize: 9,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ls-bbc-hint)",
              lineHeight: 1.4,
            }}
          >
            graisse &amp; muscle affichés en
          </span>
          <UnitToggle
            unit={unit}
            onChange={changerUnite}
            disabled={!poidsUtilisable}
            disabledReason={POIDS_MANQUANT_MESSAGE}
            label="Unité d'affichage de la graisse et du muscle"
          />
        </div>

        {departVide ? (
          <p
            style={{
              margin: "0 0 10px",
              fontSize: 10.5,
              lineHeight: 1.5,
              color: "var(--ls-bbc-amber)",
            }}
          >
            Pas de point de départ chiffré pour ce membre : les écarts restent vides, cette pesée
            devient la référence.
          </p>
        ) : null}

        {/* ── Légende ────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--ls-bbc-font-mono)",
            fontSize: 9,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ls-bbc-hint)",
            marginBottom: 9,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 9,
              height: 9,
              borderRadius: 999,
              border: "2px solid var(--ls-bbc-hint)",
              flex: "none",
            }}
          />
          départ{departDate ? ` (${departDate})` : ""}
          <span
            aria-hidden="true"
            style={{
              width: 9,
              height: 9,
              borderRadius: 999,
              background: "var(--ls-bbc-lime)",
              flex: "none",
              marginLeft: 9,
            }}
          />
          aujourd'hui
        </div>

        {/* ── Les 3 mesures en tête ──────────────────────────────────────── */}
        {EN_TETE.map((m) => {
          const cmp = comparaisons[m.key];
          const converti = isConvertibleMetric(m.key) && cmp.unit !== nativeUnitOf(m.key);
          const cle =
            goal === "mass-gain"
              ? m.key === "weight" || m.key === "muscleMass"
              : m.key === "weight" || m.key === "bodyFat";
          const a = cmp.start.value;
          const b = cmp.current.value;
          const pos = a != null && b != null ? positions(m.echelle?.[unit] ?? 0, a, b) : null;
          const aplat = aplatVerdict(cmp.verdict);

          return (
            <div
              key={m.key}
              style={{
                background: "var(--ls-bbc-s2)",
                border: "1px solid var(--ls-bbc-line)",
                borderRadius: 14,
                padding: "11px 12px 12px",
                marginBottom: 9,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                <span aria-hidden="true">{m.icone}</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--ls-bbc-muted)",
                    flex: 1,
                    minWidth: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {m.label}
                </span>
                {converti ? <Badge tone="teal">converti</Badge> : null}
                {cle ? <Badge tone="lime">mesure clé</Badge> : null}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--ls-bbc-font-mono)",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--ls-bbc-hint)",
                    flex: "none",
                  }}
                >
                  {a == null ? "—" : fmt(a, cmp.decimals)}
                </span>
                <span aria-hidden="true" style={{ color: "var(--ls-bbc-hint)", fontSize: 12, flex: "none" }}>
                  →
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={texte[m.key]}
                  onChange={(e) => saisir(m.key, e.target.value)}
                  aria-label={`${m.label} aujourd'hui, en ${cmp.unit}`}
                  style={{
                    width: 72,
                    height: 40,
                    flex: "none",
                    borderRadius: 10,
                    border: "1px solid var(--ls-bbc-line2)",
                    background: "var(--ls-bbc-bg)",
                    color: "var(--ls-bbc-text)",
                    fontFamily: "var(--ls-bbc-font-mono)",
                    fontWeight: 800,
                    // 16 px minimum : en dessous, iOS zoome le champ à la mise au
                    // point et déplace tout l'écran sous les doigts du coach.
                    fontSize: 16,
                    textAlign: "center",
                    outline: "none",
                    fontVariantNumeric: "tabular-nums",
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--ls-bbc-font-mono)",
                    fontSize: 10,
                    color: "var(--ls-bbc-hint)",
                    flex: "none",
                  }}
                >
                  {cmp.unit}
                </span>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    textAlign: "right",
                    fontFamily: "var(--ls-bbc-font-mono)",
                    fontSize: 20,
                    fontWeight: 800,
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                    color: encreVerdict(cmp.verdict),
                  }}
                >
                  {cmp.delta.value == null ? "—" : signe(cmp.delta.value, cmp.decimals)}
                </span>
              </div>

              {/* barre départ → aujourd'hui */}
              <div
                aria-hidden="true"
                style={{
                  position: "relative",
                  height: 8,
                  borderRadius: 5,
                  background: "color-mix(in srgb, var(--ls-bbc-text) 9%, transparent)",
                  marginTop: 11,
                }}
              >
                {pos ? (
                  <>
                    <i
                      style={{
                        position: "absolute",
                        top: 2,
                        height: 4,
                        borderRadius: 3,
                        left: `${Math.min(pos.depart, pos.actuel)}%`,
                        width: `${Math.abs(pos.actuel - pos.depart)}%`,
                        background: aplat,
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: -1,
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        marginLeft: -5,
                        left: `${pos.depart}%`,
                        border: "2px solid var(--ls-bbc-hint)",
                        background: "var(--ls-bbc-bg)",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: -1,
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        marginLeft: -5,
                        left: `${pos.actuel}%`,
                        background: aplat,
                        boxShadow: `0 0 8px ${aplat}`,
                      }}
                    />
                  </>
                ) : null}
              </div>

              <div
                style={{
                  fontSize: 10.5,
                  lineHeight: 1.45,
                  color: "var(--ls-bbc-hint)",
                  marginTop: 9,
                }}
              >
                {cmp.delta.value == null ? (
                  "valeur à saisir"
                ) : (
                  <>
                    {phraseDe(m, cmp, goal)} ·{" "}
                    <b style={{ fontWeight: 800, whiteSpace: "nowrap", color: encreVerdict(cmp.verdict) }}>
                      {MOT_VERDICT[cmp.verdict]}
                    </b>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* ── Les 5 autres, repliées ─────────────────────────────────────── */}
        <div style={{ borderTop: "1px solid var(--ls-bbc-line)", marginTop: 3 }}>
          <button
            type="button"
            onClick={() => setDetailOuvert((v) => !v)}
            aria-expanded={detailOuvert}
            aria-controls="bbc-b10-detail"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              minHeight: 44,
              padding: "0 2px",
              background: "transparent",
              border: 0,
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 700,
              color: "var(--ls-bbc-muted)",
              fontFamily: "var(--ls-bbc-font-body)",
              textAlign: "left",
            }}
          >
            Voir tout le détail
            <span
              style={{
                fontFamily: "var(--ls-bbc-font-mono)",
                fontSize: 9,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ls-bbc-hint)",
                fontWeight: 600,
              }}
            >
              {REPLIEES.length} mesures
            </span>
            <span
              aria-hidden="true"
              style={{
                marginLeft: "auto",
                color: "var(--ls-bbc-lime-text)",
                fontSize: 11,
                transform: detailOuvert ? "rotate(180deg)" : "none",
                transition: "transform .2s",
              }}
            >
              ▾
            </span>
          </button>

          {detailOuvert ? (
            <div id="bbc-b10-detail" style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  tableLayout: "fixed",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <colgroup>
                  <col style={{ width: "37%" }} />
                  <col style={{ width: "17%" }} />
                  <col style={{ width: "26%" }} />
                  <col style={{ width: "20%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <ThDtl>mesure</ThDtl>
                    <ThDtl align="right">départ</ThDtl>
                    <ThDtl align="center">aujourd'hui</ThDtl>
                    <ThDtl align="right">écart</ThDtl>
                  </tr>
                </thead>
                <tbody>
                  {REPLIEES.map((m) => {
                    const cmp = comparaisons[m.key];
                    return (
                      <tr key={m.key}>
                        <td style={{ padding: "7px 0", borderTop: "1px solid var(--ls-bbc-line)" }}>
                          <span
                            style={{
                              display: "block",
                              fontSize: 11.5,
                              color: "var(--ls-bbc-text)",
                              lineHeight: 1.25,
                              paddingRight: 6,
                            }}
                          >
                            {m.label}
                          </span>
                          <span
                            style={{
                              display: "block",
                              fontFamily: "var(--ls-bbc-font-mono)",
                              fontSize: 9,
                              color: "var(--ls-bbc-hint)",
                              marginTop: 2,
                            }}
                          >
                            {cmp.unit}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "7px 7px 7px 0",
                            borderTop: "1px solid var(--ls-bbc-line)",
                            textAlign: "right",
                            fontFamily: "var(--ls-bbc-font-mono)",
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: "var(--ls-bbc-hint)",
                          }}
                        >
                          {cmp.start.value == null ? "—" : fmt(cmp.start.value, cmp.decimals)}
                        </td>
                        <td
                          style={{
                            padding: "7px 7px 7px 0",
                            borderTop: "1px solid var(--ls-bbc-line)",
                          }}
                        >
                          <input
                            type="text"
                            inputMode="decimal"
                            value={texte[m.key]}
                            onChange={(e) => saisir(m.key, e.target.value)}
                            aria-label={`${m.label} aujourd'hui, en ${cmp.unit}`}
                            style={{
                              width: "100%",
                              height: 36,
                              borderRadius: 8,
                              border: "1px solid var(--ls-bbc-line2)",
                              background: "var(--ls-bbc-s2)",
                              color: "var(--ls-bbc-text)",
                              fontFamily: "var(--ls-bbc-font-mono)",
                              fontWeight: 800,
                              fontSize: 16,
                              textAlign: "center",
                              outline: "none",
                              padding: 0,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          />
                        </td>
                        <td
                          style={{
                            padding: "7px 0",
                            borderTop: "1px solid var(--ls-bbc-line)",
                            textAlign: "right",
                            fontFamily: "var(--ls-bbc-font-mono)",
                            fontSize: 12.5,
                            fontWeight: 800,
                            color: encreVerdict(cmp.verdict),
                          }}
                        >
                          {cmp.delta.value == null ? "—" : signe(cmp.delta.value, cmp.decimals)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p
                style={{
                  fontSize: 10,
                  color: "var(--ls-bbc-hint)",
                  lineHeight: 1.5,
                  margin: "10px 0 4px",
                }}
              >
                La masse osseuse ne bouge quasiment pas en cinq semaines : on l'affiche, on ne la
                juge pas.
              </p>
            </div>
          ) : null}
        </div>

        {/* ── L'enregistrement : c'est LUI qui allume la courbe du membre ── */}
        <button
          type="button"
          onClick={() => onEnregistrer(natifs)}
          disabled={!peutEnregistrer}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
            width: "100%",
            minHeight: 50,
            marginTop: 14,
            border: 0,
            borderRadius: 14,
            background: peutEnregistrer ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s2)",
            color: peutEnregistrer ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-hint)",
            fontFamily: "var(--ls-bbc-font-body)",
            fontSize: 15,
            fontWeight: 700,
            cursor: peutEnregistrer ? "pointer" : "not-allowed",
          }}
        >
          {enCoursEnregistrement
            ? "enregistrement…"
            : enregistreLe
              ? "mettre à jour la pesée"
              : "enregistrer la 2ᵉ pesée"}
        </button>

        <p
          role="status"
          style={{
            margin: "8px 0 0",
            fontSize: 11,
            lineHeight: 1.5,
            textAlign: "center",
            color: erreur
              ? "var(--ls-bbc-coral)"
              : enregistreLe
                ? "var(--ls-bbc-teal)"
                : "var(--ls-bbc-hint)",
          }}
        >
          {erreur
            ? erreur
            : enregistreLe
              ? "Pesée enregistrée — sa courbe est allumée dans son app."
              : poidsUtilisable
                ? "L'enregistrement crée un vrai bilan de suivi : c'est lui, et lui seul, qui allume la courbe du membre."
                : "Le poids d'aujourd'hui est obligatoire : sans lui, ni conversion ni écart."}
        </p>

        {/* ── Ce que le membre voit de son côté ──────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: 9,
            alignItems: "flex-start",
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 12,
            background: "color-mix(in srgb, var(--ls-bbc-violet) 9%, transparent)",
            border: "1px solid color-mix(in srgb, var(--ls-bbc-violet) 24%, transparent)",
          }}
        >
          <span aria-hidden="true">📱</span>
          <p style={{ margin: 0, fontSize: 10.5, lineHeight: 1.5, color: "var(--ls-bbc-muted)" }}>
            <b style={{ color: "var(--ls-bbc-violet)" }}>Ce que le membre voit de son côté.</b> Ces
            mêmes chiffres allument sa courbe dans son app : il lui fallait deux relevés pour
            qu'elle existe, celui d'aujourd'hui est le second.
          </p>
        </div>
      </div>
    </>
  );
}

// -----------------------------------------------------------------------------
// Petits morceaux d'écran
// -----------------------------------------------------------------------------

function Badge({ tone, children }: { tone: "lime" | "teal"; children: string }) {
  return (
    <span
      style={{
        fontFamily: "var(--ls-bbc-font-mono)",
        fontSize: 8,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: "3px 6px",
        borderRadius: 5,
        flex: "none",
        background:
          tone === "lime"
            ? "color-mix(in srgb, var(--ls-bbc-lime) 14%, transparent)"
            : "color-mix(in srgb, var(--ls-bbc-teal) 14%, transparent)",
        color: tone === "lime" ? "var(--ls-bbc-lime-text)" : "var(--ls-bbc-teal)",
      }}
    >
      {children}
    </span>
  );
}

function ThDtl({ children, align = "left" }: { children: string; align?: "left" | "right" | "center" }) {
  return (
    <th
      scope="col"
      style={{
        fontFamily: "var(--ls-bbc-font-mono)",
        fontSize: 8,
        fontWeight: 600,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: "var(--ls-bbc-hint)",
        padding: "0 0 7px",
        textAlign: align,
        overflow: "hidden",
      }}
    >
      {children}
    </th>
  );
}

// -----------------------------------------------------------------------------
// Natif → texte affiché
// -----------------------------------------------------------------------------

/**
 * Réécrit les 8 champs dans l'unité demandée, à partir des valeurs natives et
 * du poids du relevé. Une valeur qu'on ne sait pas convertir (poids manquant)
 * laisse le champ VIDE : mieux vaut un champ à remplir qu'un nombre inventé.
 *
 * Réservé à l'INITIALISATION de la feuille (les 8 champs partent de la base).
 * Une bascule d'unité, elle, passe par `texteApresBascule` — elle n'a pas le
 * droit de reformater ce que le coach a tapé.
 */
function texteDepuisNatif(
  natifs: ScanValues | null,
  unit: DisplayUnit,
  poids: number | null,
): Record<BodyMetricKey, string> {
  const sortie = {} as Record<BodyMetricKey, string>;
  for (const m of TOUTES) {
    const valeur = natifs?.[m.key] ?? null;
    const affiche = displayMetric(m.key, unit, { value: valeur, weight: poids });
    sortie[m.key] = affiche.value == null ? "" : fmt(affiche.value, affiche.decimals);
  }
  return sortie;
}

/**
 * Les valeurs NATIVES correspondant aux champs. Un champ retapé depuis la
 * dernière bascule est relu ; un champ intact garde la valeur d'origine portée
 * par l'ancre — sinon l'arrondi de l'affichage remplacerait la mesure.
 */
function natifsDepuisTexte(
  texte: Record<BodyMetricKey, string>,
  unit: DisplayUnit,
  poids: number | null,
  ancrage: Ancrage | null,
): ScanValues {
  const sortie = { ...SCAN_VIDE };
  for (const m of TOUTES) {
    const intact =
      ancrage !== null && ancrage.unit === unit && ancrage.texte[m.key] === texte[m.key];
    sortie[m.key] = intact
      ? ancrage.natifs[m.key]
      : toNativeValue(m.key, unit, parseNombre(texte[m.key]), poids);
  }
  return sortie;
}

/**
 * Les champs après une bascule d'unité : SEULES la graisse et le muscle sont
 * réécrits. Les six autres mesures n'ont rien à convertir — les reformater
 * ferait de « 82,45 » un « 82,5 » (deux poids différents, et c'est le second
 * qui servirait ensuite de dénominateur à toutes les conversions).
 */
function texteApresBascule(
  avant: Record<BodyMetricKey, string>,
  natifs: ScanValues,
  unit: DisplayUnit,
  poids: number | null,
): Record<BodyMetricKey, string> {
  const sortie = { ...avant };
  for (const m of TOUTES) {
    if (!isConvertibleMetric(m.key)) continue;
    const affiche = displayMetric(m.key, unit, { value: natifs[m.key], weight: poids });
    sortie[m.key] = affiche.value == null ? "" : fmt(affiche.value, affiche.decimals);
  }
  return sortie;
}
