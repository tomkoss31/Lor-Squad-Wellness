// =============================================================================
// MemberEvolution — onglet Évolution de l'app membre BBC (port du design).
// Poids + départ nommé/daté · courbe PILOTABLE sur 6 métriques · 3 jauges
// (masse grasse / muscle / hydratation) · mensurations.
//
// ── LE PORTAGE DU 2026-08-18 (alignement sur la PWA classique) ───────────────
// Constat de Thomas : « on ne voit pas l'évolution si on tape sur masse grasse,
// muscle, hydrat » — les trois jauges étaient des <div> inertes, et la courbe
// ne savait tracer QUE le poids. Pire : graisse viscérale et âge métabolique
// n'existaient pas du tout côté membre, alors que la donnée arrive (c'était le
// cast du prop dans ClientAppPage qui la jetait).
//
// Ce qui vient de la PWA classique (EvolutionTab), à l'identique :
//   • l'arithmétique de la courbe (padY proportionnel — indispensable dès qu'on
//     trace autre chose que des kilos : un indice viscéral va de 1 à 59) ;
//   • les valeurs écrites sur les points, éclaircies au-delà de 12 relevés ;
//   • ~5 étiquettes de dates réparties sous la courbe ;
//   • la garde « il faut au moins 2 relevés » et son message.
// Ce qui reste BBC : les tokens --ls-bbc-*, la voix minuscule, les jauges.
//
// ⚠️ La teinte de la métrique ne porte JAMAIS le texte (coral clair = 3,69:1,
// dette de contraste connue de bbc-tokens.css) : elle porte la pastille, le
// liseré et le trait de la courbe. Le texte reste --ls-bbc-text / muted.
//
// ── LE BUG D'UNITÉ CORRIGÉ LE 2026-08-14 (conservé tel quel) ─────────────────
// La masse musculaire est stockée en KILOS : elle s'affiche en kg, son anneau
// se remplit sur muscle ÷ poids du même relevé, et le départ d'une mesure est
// le premier relevé qui la porte VRAIMENT (les absentes valent 0 côté payload).
// Toute l'arithmétique vient de `lib/bodyMetricUnits`, la même que le coach.
// =============================================================================

import { useState } from "react";
import { computeMetricDelta, muscleMassKgToPercent, type DisplayUnit } from "../../../lib/bodyMetricUnits";
import { MemberMensurations } from "./MemberMensurations";

export interface Metric {
  date?: string;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  hydration?: number;
  visceralFat?: number;
  metabolicAge?: number;
}
export interface Measurement {
  measured_at?: string;
  waist_cm?: number;
  hips_cm?: number;
  thigh_cm?: number;
  arm_cm?: number;
  neck_cm?: number;
  chest_cm?: number;
  calf_cm?: number;
  by?: "coach" | "client";
  cm?: Partial<Record<
    "neck" | "chest" | "waist" | "hips" | "thigh_left" | "thigh_right"
      | "arm_left" | "arm_right" | "calf_left" | "calf_right",
    number
  >>;
}

interface MemberEvolutionProps {
  token: string;
  metrics: Metric[];
  measurements: Measurement[];
  /**
   * Les jours où elle est passée au club, en ISO (19/08). Posés sous sa courbe :
   * c'est ce qui transforme un constat en démonstration.
   *
   * Optionnel à dessein — une cliente classique n'a pas de passages, et la
   * courbe doit s'afficher exactement comme avant sans cette donnée.
   */
  visitDates?: string[];
}

type CleMetrique = "weight" | "bodyFat" | "muscleMass" | "hydration" | "visceralFat" | "metabolicAge";
type MesureJauge = "bodyFat" | "muscleMass" | "hydration";

/**
 * Les six métriques traçables — le même périmètre que la PWA classique.
 * `dec` : décimales à l'écran (un âge métabolique de « 41,0 ans » serait du
 * bruit). Les teintes sont les jumelles BBC de celles du classique ; gold et
 * emerald n'ont pas d'équivalent BBC → ambre et sauge, leurs voisines.
 */
const METRIQUES: Array<{ key: CleMetrique; court: string; unite: string; dec: number; teinte: string }> = [
  { key: "weight", court: "poids", unite: "kg", dec: 1, teinte: "var(--ls-bbc-lime)" },
  { key: "bodyFat", court: "masse grasse", unite: "%", dec: 1, teinte: "var(--ls-bbc-coral)" },
  { key: "muscleMass", court: "muscle", unite: "kg", dec: 1, teinte: "var(--ls-bbc-teal)" },
  { key: "hydration", court: "eau", unite: "%", dec: 1, teinte: "var(--ls-bbc-violet)" },
  { key: "visceralFat", court: "graisse visc.", unite: "", dec: 0, teinte: "var(--ls-bbc-amber)" },
  { key: "metabolicAge", court: "âge méta.", unite: "ans", dec: 0, teinte: "var(--ls-bbc-sage)" },
];

/**
 * Les trois jauges. `unite` dit dans quelle unité la valeur s'AFFICHE : c'est
 * toujours son unité NATIVE, celle qui est en base — on ne convertit rien pour
 * l'écran du membre, on arrête simplement de mentir dessus.
 * `aplat` = le trait de l'anneau, `encre` = la couleur du texte : le lime ne se
 * lit pas sur clair (2,18:1), c'est --ls-bbc-lime-text qui sert d'encre.
 */
const GAUGES: Array<{
  key: MesureJauge;
  label: string;
  aplat: string;
  encre: string;
  unite: DisplayUnit;
}> = [
  { key: "bodyFat", label: "masse grasse", aplat: "var(--ls-bbc-lime)", encre: "var(--ls-bbc-lime-text)", unite: "percent" },
  { key: "muscleMass", label: "muscle (kg)", aplat: "var(--ls-bbc-teal)", encre: "var(--ls-bbc-teal)", unite: "kg" },
  { key: "hydration", label: "hydratation", aplat: "var(--ls-bbc-violet)", encre: "var(--ls-bbc-violet)", unite: "percent" },
];

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}
function fr(n: number, d = 1) {
  return n.toFixed(d).replace(".", ",");
}

/** « 2 mars », « 18 août » — jamais l'année : elle n'aide personne ici. */
function jourCourt(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

/* Le couple « départ → aujourd'hui ». La teinte ne porte JAMAIS ces textes :
   ils restent en --ls-bbc-text / --ls-bbc-muted, mesurés au-dessus de 4,5:1
   dans les deux thèmes. */
const etiquette: React.CSSProperties = {
  fontFamily: "var(--ls-bbc-font-mono)",
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--ls-bbc-muted)",
};
const valeur: React.CSSProperties = {
  fontFamily: "var(--ls-bbc-font-display)",
  fontSize: 22,
  lineHeight: 1,
  marginTop: 5,
  color: "var(--ls-bbc-text)",
};
const unite: React.CSSProperties = {
  fontFamily: "var(--ls-bbc-font-mono)",
  fontSize: 11.5,
  fontWeight: 600,
  color: "var(--ls-bbc-muted)",
  marginLeft: 3,
};
const quandStyle: React.CSSProperties = {
  fontFamily: "var(--ls-bbc-font-mono)",
  fontSize: 11,
  marginTop: 4,
  color: "var(--ls-bbc-muted)",
};

const carte: React.CSSProperties = {
  background: "var(--ls-bbc-s1)",
  border: "1px solid var(--ls-bbc-line)",
  borderRadius: 18,
  padding: 18,
};
const eyebrow: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontFamily: "var(--ls-bbc-font-mono)",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.14em",
  color: "var(--ls-bbc-muted)",
  textTransform: "uppercase",
};

export function MemberEvolution({ token, metrics, measurements, visitDates = [] }: MemberEvolutionProps) {
  // On garde la DATE avec le poids : sans elle, « 108,0 → 99,0 » ne dit pas
  // depuis quand, et c'est précisément ce que la membre venait chercher.
  const pesees = metrics
    .map((m) => ({ w: num(m.weight), jour: jourCourt(m.date) }))
    .filter((p): p is { w: number; jour: string | null } => p.w != null);

  // UNE pesée suffit pour afficher un chiffre. Avant il en fallait deux, et
  // une nouvelle membre pesée à son inscription lisait « ta transformation
  // commence » — pas son poids (Thomas, 18/08).
  const hasWeight = pesees.length >= 1;
  const peseeDepart = pesees[0] ?? null;
  const peseeActuelle = pesees[pesees.length - 1] ?? null;
  const firstW = peseeDepart?.w ?? 0;
  const lastW = peseeActuelle?.w ?? 0;
  // L'écart n'a de sens qu'à partir de deux pesées : avec une seule, le héros
  // est le POIDS lui-même, pas un « 0,0 » qui ne raconte rien.
  const delta = pesees.length >= 2 ? Math.round((lastW - firstW) * 10) / 10 : null;

  // ── La courbe pilotable ────────────────────────────────────────────────────
  // Même règle que le classique, mais avec le `num()` local : côté payload les
  // métriques absentes valent 0, un `typeof === "number"` afficherait les six
  // chips à tout le monde.
  const disponibles = METRIQUES.filter((mt) => metrics.some((m) => num(m[mt.key]) != null));
  const [choisie, setChoisie] = useState<CleMetrique>("weight");
  const cleActive = disponibles.some((m) => m.key === choisie)
    ? choisie
    : (disponibles[0]?.key ?? "weight");
  const sel = METRIQUES.find((m) => m.key === cleActive) ?? METRIQUES[0];

  // Arithmétique portée telle quelle d'EvolutionTab : le padY proportionnel
  // remplace l'ancien ±0,3 en dur — vital hors kilos (indice viscéral 1→59).
  const W = 300, H = 132, P = 14, top = 8, bottom = 104;
  const serie = metrics
    .map((m) => ({ date: m.date ?? "", v: num(m[cleActive]) }))
    .filter((p): p is { date: string; v: number } => p.v != null);
  const n = serie.length;
  const vals = serie.map((p) => p.v);
  const rawMin = n ? Math.min(...vals) : 0;
  const rawMax = n ? Math.max(...vals) : 1;
  const padY = (rawMax - rawMin) * 0.12 || Math.max(1, rawMax * 0.05);
  const lo = rawMin - padY, hi = rawMax + padY, span = hi - lo || 1;
  const pts = vals.map((v, i) => {
    const x = P + (n > 1 ? (i * (W - 2 * P)) / (n - 1) : 0);
    const y = top + ((hi - v) / span) * (bottom - top);
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10] as [number, number];
  });
  const chartLine = pts.map((p) => p.join(",")).join(" ");
  const chartArea = `${P},${bottom} ${chartLine} ${W - P},${bottom}`;
  // Étiquettes de date : ~5 réparties. Valeurs sur les points : éclaircies
  // au-delà de 12 relevés, sinon elles se marchent dessus.
  const idxDates = n <= 5 ? serie.map((_, i) => i) : [0, Math.round(n * 0.25), Math.round(n * 0.5), Math.round(n * 0.75), n - 1];
  const dateLabels = [...new Set(idxDates)].map((i) =>
    new Date(serie[i].date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
  );
  const labelStep = Math.max(1, Math.ceil(n / 12));

  // ── Ses passages au club, posés sous sa courbe (19/08) ──────────────────
  //
  // POURQUOI : une courbe de poids est un constat. La même courbe AVEC ses
  // passages dessous est une démonstration — « quand je viens, ça descend ».
  // C'est la seule chose qui décide d'un renouvellement, et le seul
  // recoupement qu'un club seul ou une app seule ne peuvent pas faire.
  //
  // ⚠️ L'AXE X N'EST PAS UNE ÉCHELLE DE TEMPS : les relevés sont espacés
  // RÉGULIÈREMENT (`i * (W-2P)/(n-1)`), quelle que soit leur date réelle. Une
  // visite ne peut donc pas se convertir en X par une règle de trois sur les
  // dates — il faut l'interpoler DANS le segment qui l'encadre, sinon les
  // marques se décalent dès que deux pesées ne sont pas espacées pareil.
  const tempsReleves = serie.map((p) => new Date(p.date).getTime());
  const marquesVisites = (() => {
    // Sous deux relevés il n'y a pas de segment : rien à poser dessus.
    if (n < 2 || visitDates.length === 0) return [] as number[];
    const debut = tempsReleves[0], fin = tempsReleves[n - 1];
    const xs: number[] = [];
    for (const iso of visitDates) {
      const t = new Date(iso).getTime();
      // Hors plage : une visite d'avant sa première pesée n'a nulle part où
      // aller. On l'ignore plutôt que de l'écraser sur le bord, ce qui
      // inventerait un passage le jour du départ.
      if (!Number.isFinite(t) || t < debut || t > fin) continue;
      for (let i = 0; i < n - 1; i += 1) {
        const a = tempsReleves[i], b = tempsReleves[i + 1];
        if (t >= a && t <= b) {
          const f = b === a ? 0 : (t - a) / (b - a);
          xs.push(pts[i][0] + f * (pts[i + 1][0] - pts[i][0]));
          break;
        }
      }
    }
    return xs;
  })();

  /** L'écart sur la métrique affichée, entre le premier et le dernier relevé. */
  const ecartSerie = n >= 2 ? serie[n - 1].v - serie[0].v : null;

  const dernier = metrics[metrics.length - 1] ?? {};

  /** Le premier relevé qui porte VRAIMENT cette mesure (0 = non mesurée). */
  function premierAvec(key: MesureJauge): Metric | null {
    for (const m of metrics) {
      if (num(m[key]) != null) return m;
    }
    return null;
  }

  const gauges = GAUGES
    .map((g) => {
      const v = num(dernier[g.key]);
      if (v == null) return null;

      const depart = premierAvec(g.key);
      const ecart = computeMetricDelta(
        g.key,
        g.unite,
        { value: depart ? num(depart[g.key]) : null, weight: depart ? num(depart.weight) : null },
        { value: v, weight: num(dernier.weight) },
      );

      // La part de muscle dans le poids : c'est elle qui remplit l'anneau, et
      // c'est aussi le chiffre qui monte quand le poids baisse à muscle égal.
      const partMuscle =
        g.unite === "kg" ? muscleMassKgToPercent(num(dernier.weight), v) : null;
      const ratio = g.unite === "percent" ? v / 100 : partMuscle == null ? null : partMuscle / 100;
      // Sans dénominateur, l'anneau reste vide : mieux qu'un remplissage inventé.
      const off = ratio == null ? "163.0" : (163 * (1 - Math.min(Math.max(ratio, 0), 1))).toFixed(1);

      const suffixe = ecart.unit === "kg" ? " kg" : " pts";
      const delta =
        depart === dernier
          ? "point de départ"
          : ecart.value == null
            ? "—"
            : ecart.state === "stable"
              ? "stable"
              : `${ecart.value > 0 ? "+" : "−"}${fr(Math.abs(ecart.value), ecart.decimals)}${suffixe}`;

      return {
        cle: g.key as CleMetrique,
        label: g.label,
        aplat: g.aplat,
        encre: g.encre,
        val: g.unite === "percent" ? `${Math.round(v)}%` : fr(v, 1),
        off,
        delta,
        sous: partMuscle == null ? null : `${fr(partMuscle, 0)} % du poids`,
      };
    })
    .filter(Boolean) as Array<{
    cle: CleMetrique;
    label: string;
    aplat: string;
    encre: string;
    val: string;
    off: string;
    delta: string;
    sous: string | null;
  }>;

  return (
    <>
      {hasWeight ? (
        <div style={carte}>
          <div style={eyebrow}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-lime)", boxShadow: "0 0 8px var(--ls-bbc-lime)" }} />ton poids
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: 12 }}>
            {/* Encre lime, pas l'aplat : --ls-bbc-lime ne se lit pas sur clair.
                Une seule pesée → on montre le POIDS ; deux ou plus → l'écart. */}
            <span style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 44, lineHeight: 0.85, color: "var(--ls-bbc-lime-text)" }}>{delta != null && delta > 0 ? "+" : ""}{fr(delta != null ? delta : firstW)}</span>
            <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 600, fontSize: 18, color: "var(--ls-bbc-muted)", paddingBottom: 4 }}>kg</span>
          </div>
          {delta != null ? (
            /* LE COUPLE NOMMÉ ET DATÉ. Avant, cette ligne disait « 108,0 → 99,0 »
               en 12 px : le bon chiffre, mais rien ne disait que 108 était son
               DÉPART ni qu'il datait du 2 mars. C'est ce que la membre venait
               chercher (Thomas, 18/08 : « c'est le plus important »). */
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginTop: 13, paddingTop: 12, borderTop: "1px solid var(--ls-bbc-line)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={etiquette}>départ</div>
                <div style={valeur}>{fr(firstW)}<small style={unite}>kg</small></div>
                {peseeDepart?.jour ? <div style={quandStyle}>{peseeDepart.jour}</div> : null}
              </div>
              <div aria-hidden="true" style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 15, color: "var(--ls-bbc-muted)", paddingTop: 20 }}>→</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={etiquette}>aujourd'hui</div>
                <div style={valeur}>{fr(lastW)}<small style={unite}>kg</small></div>
                {peseeActuelle?.jour ? <div style={quandStyle}>{peseeActuelle.jour}</div> : null}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 4 }}>
              ton départ{peseeDepart?.jour ? ` · ${peseeDepart.jour}` : ""}
            </div>
          )}
        </div>
      ) : (
        <div style={{ ...carte, padding: "22px 18px", textAlign: "center" }}>
          <div style={{ fontSize: 30 }} aria-hidden="true">📈</div>
          <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 20, marginTop: 8 }}>ta transformation commence</div>
          <div style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", marginTop: 6, lineHeight: 1.5 }}>ta 1ʳᵉ pesée au club, c'est ton point de départ. la courbe se remplit à chaque visite.</div>
        </div>
      )}

      {gauges.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {/* Les jauges PILOTENT la courbe : c'étaient des <div> inertes —
              « on tape dessus, rien ne bouge » (Thomas, 18/08). */}
          {gauges.map((g) => {
            const active = cleActive === g.cle;
            return (
              <button
                key={g.label}
                type="button"
                onClick={() => setChoisie(g.cle)}
                aria-pressed={active}
                style={{
                  background: active ? `color-mix(in srgb, ${g.aplat} 9%, var(--ls-bbc-s1))` : "var(--ls-bbc-s1)",
                  border: `1px solid ${active ? `color-mix(in srgb, ${g.aplat} 55%, var(--ls-bbc-line))` : "var(--ls-bbc-line)"}`,
                  borderRadius: 16,
                  padding: "14px 10px",
                  textAlign: "center",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: "var(--ls-bbc-text)",
                }}
              >
                <div style={{ position: "relative", width: 64, height: 64, margin: "0 auto" }}>
                  <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="var(--ls-bbc-s2)" strokeWidth="6" />
                    <circle cx="32" cy="32" r="26" fill="none" stroke={g.aplat} strokeWidth="6" strokeLinecap="round" strokeDasharray="163" strokeDashoffset={g.off} transform="rotate(-90 32 32)" />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 700, fontSize: 15, color: g.encre }}>{g.val}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, marginTop: 8 }}>{g.label}</div>
                <div style={{ fontSize: 10, color: "var(--ls-bbc-muted)" }}>{g.delta}</div>
                {g.sous ? <div style={{ fontSize: 9.5, color: "var(--ls-bbc-muted)", marginTop: 2 }}>{g.sous}</div> : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* ── La courbe, pour n'importe laquelle des six métriques ─────────── */}
      {disponibles.length > 0 ? (
        <div style={carte}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={eyebrow}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: sel.teinte }} />
              courbe · {sel.court}{n >= 2 ? ` · ${n} relevés` : ""}
            </div>
          </div>

          {/* Les chips : toutes les métriques qui ont au moins une vraie valeur.
              La teinte va sur la pastille et le liseré, jamais sur le texte. */}
          {disponibles.length > 1 ? (
            <div style={{ display: "flex", gap: 7, overflowX: "auto", scrollbarWidth: "none", padding: "12px 0 2px" }}>
              {disponibles.map((mt) => {
                const on = cleActive === mt.key;
                return (
                  <button
                    key={mt.key}
                    type="button"
                    onClick={() => setChoisie(mt.key)}
                    aria-pressed={on}
                    style={{
                      flex: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 12px",
                      minHeight: 34,
                      borderRadius: 999,
                      background: on ? `color-mix(in srgb, ${mt.teinte} 12%, var(--ls-bbc-s2))` : "var(--ls-bbc-s2)",
                      border: `1px solid ${on ? `color-mix(in srgb, ${mt.teinte} 55%, var(--ls-bbc-line))` : "var(--ls-bbc-line)"}`,
                      color: on ? "var(--ls-bbc-text)" : "var(--ls-bbc-muted)",
                      fontFamily: "var(--ls-bbc-font-body)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 999, background: mt.teinte, flex: "none" }} />
                    {mt.court}
                  </button>
                );
              })}
            </div>
          ) : null}

          {n >= 2 ? (
            <>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", overflow: "visible", marginTop: 8 }}>
                <defs>
                  <linearGradient id="bbcCourbeAire" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={sel.teinte} stopOpacity="0.24" />
                    <stop offset="1" stopColor={sel.teinte} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <line x1={P} y1={bottom} x2={W - P} y2={bottom} stroke="var(--ls-bbc-line)" strokeWidth="1" />

                {/* Ses passages au club, en petits traits SOUS l'axe. Sous la
                    ligne et non dessus : ils accompagnent la courbe, ils ne la
                    concurrencent pas. Le lime, parce qu'un passage est une
                    victoire — c'est ce à quoi la charte le réserve. */}
                {marquesVisites.map((x, i) => (
                  <line
                    key={`v${i}`}
                    x1={x}
                    y1={bottom + 2}
                    x2={x}
                    y2={bottom + 7}
                    stroke="var(--ls-bbc-lime)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                ))}
                <polygon points={chartArea} fill="url(#bbcCourbeAire)" />
                <polyline points={chartLine} fill="none" stroke={sel.teinte} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                {pts.map((p, i) => {
                  const isLast = i === pts.length - 1;
                  const showLabel = i % labelStep === 0 || isLast;
                  return (
                    <g key={i}>
                      <circle cx={p[0]} cy={p[1]} r={isLast ? 4.5 : 2.4} fill={sel.teinte} stroke="var(--ls-bbc-s1)" strokeWidth={isLast ? 2 : 1.2} />
                      {showLabel ? (
                        <text x={Math.max(11, Math.min(p[0], W - 11))} y={p[1] - 7} fill="var(--ls-bbc-text)" fontFamily="var(--ls-bbc-font-mono)" fontSize="6.5" fontWeight="700" textAnchor="middle">
                          {fr(vals[i], sel.dec)}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </svg>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 9.5, color: "var(--ls-bbc-muted)", marginTop: 6 }}>
                {dateLabels.map((d, i) => <span key={i}>{d}</span>)}
              </div>

              {/* Le recoupement, en une phrase. C'est LUI le produit : le
                  nombre de passages et l'écart sont deux chiffres qu'elle a
                  déjà chacun de leur côté — mis dans la même phrase, ils
                  répondent enfin à « est-ce que ça marche pour moi ? ».
                  On ne l'affiche que si les deux existent : « 0 passage » ou
                  « 0,0 kg » ne démontrent rien et découragent. */}
              {marquesVisites.length > 0 && ecartSerie != null && Math.abs(ecartSerie) >= 0.05 ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 10,
                    padding: "9px 11px",
                    borderRadius: 12,
                    background: "color-mix(in srgb, var(--ls-bbc-lime) 10%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--ls-bbc-lime) 32%, var(--ls-bbc-line))",
                  }}
                >
                  <span aria-hidden="true" style={{ width: 3, height: 22, borderRadius: 99, background: "var(--ls-bbc-lime)", flex: "none" }} />
                  <span style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--ls-bbc-text)" }}>
                    <strong>
                      {marquesVisites.length} passage{marquesVisites.length > 1 ? "s" : ""} au club
                    </strong>{" "}
                    depuis ton départ, et {sel.court.toLowerCase()}{" "}
                    {ecartSerie < 0 ? "en baisse de" : "en hausse de"}{" "}
                    <strong>
                      {fr(Math.abs(ecartSerie), sel.dec)} {sel.unite}
                    </strong>
                    . C'est le rythme qui fait la différence.
                  </span>
                </div>
              ) : null}
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", marginTop: 12, lineHeight: 1.5 }}>
              il faut au moins 2 relevés pour tracer {sel.court} — {n === 1 ? "il y en a un, le prochain dessine la courbe." : "ils arrivent avec tes pesées au club."}
            </div>
          )}
        </div>
      ) : null}

      <MemberMensurations token={token} measurements={measurements} />
    </>
  );
}
