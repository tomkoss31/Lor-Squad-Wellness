// =============================================================================
// MemberEvolution — onglet Évolution de l'app membre BBC (port du design).
// Poids + courbe · 3 jauges (masse grasse / muscle / hydratation) ·
// mensurations. Données réelles (bilans + client_measurements). Empty states.
//
// ── LE BUG D'UNITÉ CORRIGÉ LE 2026-08-14 ─────────────────────────────────────
// Les trois jauges étaient traitées à l'identique : valeur ÷ 100 pour remplir
// l'anneau, « % » collé derrière le nombre, écart libellé « pts ». Or la masse
// musculaire est stockée en KILOS (la balance Tanita la rend comme ça, et
// `NewAssessmentPage` la saisit en kg). Une membre à 44,1 kg de muscle lisait
// donc « 44 % », avec un anneau rempli à 44 % de rien du tout — deux fois faux,
// et invisible parce que le nombre reste plausible en pourcentage.
//
// Ce qui change ici, et RIEN d'autre :
//   • masse grasse et hydratation restent des pourcentages (÷ 100 correct) ;
//   • le muscle s'affiche en kg, avec son unité, et son écart en kg ;
//   • l'anneau du muscle se remplit sur la part de muscle DANS LE POIDS
//     (muscle ÷ poids du même relevé) : un anneau est une part d'un tout, il
//     lui faut un dénominateur, et le seul juste est le poids de ce relevé-là ;
//   • le départ d'une mesure est le premier relevé qui la porte VRAIMENT.
//     `ClientAppPage` remplace les valeurs absentes par 0 : prendre
//     `metrics[0]` en aveugle faisait passer un vrai écart pour « stable ».
//
// Toute l'arithmétique vient de `lib/bodyMetricUnits`, la même que le coach
// utilise dans le bilan des 10 : les deux écrans ne peuvent pas diverger.
// =============================================================================

import { computeMetricDelta, muscleMassKgToPercent, type DisplayUnit } from "../../../lib/bodyMetricUnits";

interface Metric {
  date?: string;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  hydration?: number;
}
interface Measurement {
  measured_at?: string;
  waist_cm?: number;
  hips_cm?: number;
  thigh_cm?: number;
  arm_cm?: number;
}

interface MemberEvolutionProps {
  metrics: Metric[];
  measurements: Measurement[];
}

type MesureJauge = "bodyFat" | "muscleMass" | "hydration";

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

export function MemberEvolution({ metrics, measurements }: MemberEvolutionProps) {
  // On garde la DATE avec le poids : sans elle, « 108,0 → 99,0 » ne dit pas
  // depuis quand, et c'est précisément ce que la membre venait chercher.
  const pesees = metrics
    .map((m) => ({ w: num(m.weight), jour: jourCourt(m.date) }))
    .filter((p): p is { w: number; jour: string | null } => p.w != null);
  const weights = pesees.map((p) => p.w);

  // UNE pesée suffit désormais pour afficher un chiffre. Avant il en fallait
  // deux, et une nouvelle membre pesée à son inscription lisait « ta
  // transformation commence » — pas son poids (Thomas, 18/08).
  const hasWeight = pesees.length >= 1;
  const peseeDepart = pesees[0] ?? null;
  const peseeActuelle = pesees[pesees.length - 1] ?? null;
  const firstW = peseeDepart?.w ?? 0;
  const lastW = peseeActuelle?.w ?? 0;
  // L'écart n'a de sens qu'à partir de deux pesées : avec une seule, le héros
  // est le POIDS lui-même, pas un « 0,0 » qui ne raconte rien.
  const delta = pesees.length >= 2 ? Math.round((lastW - firstW) * 10) / 10 : null;

  // courbe
  const W = 300, H = 120, pad = 10;
  const mn = hasWeight ? Math.min(...weights) - 0.3 : 0;
  const mx = hasWeight ? Math.max(...weights) + 0.3 : 1;
  const pts = weights.map((v, i) => [
    pad + (weights.length > 1 ? (i * (W - 2 * pad)) / (weights.length - 1) : 0),
    pad + ((mx - v) / (mx - mn || 1)) * (H - 2 * pad),
  ]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = pts.length ? `${line} L ${pts[pts.length - 1][0].toFixed(1)} ${H - pad} L ${pad} ${H - pad} Z` : "";

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
    label: string;
    aplat: string;
    encre: string;
    val: string;
    off: string;
    delta: string;
    sous: string | null;
  }>;

  const lastM = measurements[measurements.length - 1];
  const firstM = measurements[0];
  const mDefs: Array<{ key: keyof Measurement; label: string }> = [
    { key: "waist_cm", label: "tour de taille" },
    { key: "hips_cm", label: "hanches" },
    { key: "thigh_cm", label: "cuisses" },
    { key: "arm_cm", label: "bras" },
  ];
  const mensur = lastM
    ? (mDefs
        .map((m) => {
          const v = num(lastM[m.key]);
          if (v == null) return null;
          const f = firstM ? num(firstM[m.key]) : null;
          const d = f != null ? Math.round((v - f) * 10) / 10 : null;
          return { label: m.label, val: `${fr(v, 0)} cm`, delta: d == null ? "—" : `${d > 0 ? "+" : ""}${fr(d, 0)}`, up: d != null && d > 0 };
        })
        .filter(Boolean) as Array<{ label: string; val: string; delta: string; up: boolean }>)
    : [];

  return (
    <>
      {hasWeight ? (
        <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 18, padding: 18 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>
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
          {pesees.length >= 2 ? (
          <svg width="100%" height="120" viewBox="0 0 300 120" preserveAspectRatio="none" style={{ marginTop: 12, overflow: "visible" }}>
            <defs><linearGradient id="mwf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--ls-bbc-lime)" stopOpacity="0.22" /><stop offset="1" stopColor="var(--ls-bbc-lime)" stopOpacity="0" /></linearGradient></defs>
            <path d={area} fill="url(#mwf)" />
            <path d={line} fill="none" stroke="var(--ls-bbc-lime)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {pts.length ? <circle cx={pts[pts.length - 1][0].toFixed(1)} cy={pts[pts.length - 1][1].toFixed(1)} r="4.5" fill="var(--ls-bbc-lime)" /> : null}
          </svg>
          ) : null}
        </div>
      ) : (
        <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 18, padding: "22px 18px", textAlign: "center" }}>
          <div style={{ fontSize: 30 }} aria-hidden="true">📈</div>
          <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 20, marginTop: 8 }}>ta transformation commence</div>
          <div style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", marginTop: 6, lineHeight: 1.5 }}>ta 1ʳᵉ pesée au club, c'est ton point de départ. la courbe se remplit à chaque visite.</div>
        </div>
      )}

      {gauges.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {gauges.map((g) => (
            <div key={g.label} style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 16, padding: "14px 10px", textAlign: "center" }}>
              <div style={{ position: "relative", width: 64, height: 64, margin: "0 auto" }}>
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="var(--ls-bbc-s2)" strokeWidth="6" />
                  <circle cx="32" cy="32" r="26" fill="none" stroke={g.aplat} strokeWidth="6" strokeLinecap="round" strokeDasharray="163" strokeDashoffset={g.off} transform="rotate(-90 32 32)" />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 700, fontSize: 15, color: g.encre }}>{g.val}</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, marginTop: 8 }}>{g.label}</div>
              <div style={{ fontSize: 10, color: "var(--ls-bbc-muted)" }}>{g.delta}</div>
              {g.sous ? <div style={{ fontSize: 9.5, color: "var(--ls-bbc-hint)", marginTop: 2 }}>{g.sous}</div> : null}
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 18, padding: 18 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase", marginBottom: 14 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-teal)", boxShadow: "0 0 8px var(--ls-bbc-teal)" }} />mes mensurations
        </div>
        {mensur.length ? (
          <>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <svg width="60" height="130" viewBox="0 0 70 150" style={{ flex: "none" }}>
                <path d="M35 8a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM22 30h26l-4 40h-18zM26 70h18l2 46h-9l-2-30-2 30h-9z" fill="none" stroke="var(--ls-bbc-teal)" strokeWidth="2" strokeLinejoin="round" />
              </svg>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                {mensur.map((m) => (
                  <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: "var(--ls-bbc-muted)" }}>{m.label}</span>
                    <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 14, fontWeight: 700 }}>{m.val}</span>
                    <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, width: 42, textAlign: "right", color: m.up ? "var(--ls-bbc-teal)" : "var(--ls-bbc-lime-text)" }}>{m.delta}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", lineHeight: 1.5 }}>on prend tes premières mesures ensemble à ton prochain passage — c'est ton point de départ.</div>
        )}
      </div>
    </>
  );
}
