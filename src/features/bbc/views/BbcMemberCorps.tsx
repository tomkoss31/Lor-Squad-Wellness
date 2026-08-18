// =============================================================================
// BbcMemberCorps — « son corps » dans la fiche membre BBC.
// Maquette validée par Thomas le 17/08 (scratchpad/bbc-fiche-membre.html).
//
// LE CONSTAT QUI A DÉCLENCHÉ CE COMPOSANT
// Thomas Houbert a dix-neuf bilans en base, chacun avec ses huit mesures, et sa
// fiche BBC n'en montrait AUCUN chiffre — pendant que sa propre application lui
// affichait sa courbe et trois jauges. Le membre en savait plus sur son corps
// que le coach en face de lui.
//
// CE QUI EST MONTRÉ, ET CE QUI NE L'EST PAS
// Trois mesures, pas huit : poids, masse grasse, masse musculaire. Ce sont
// celles qui bougent et dont on parle. Les cinq autres vivent dans le bilan des
// 10, où on a le temps de les lire. Un écran de comptoir qui affiche tout
// n'affiche rien.
//
// ⚠️ UNITÉS — la règle qui casse tout si on l'oublie : `bodyFat` est un
// POURCENTAGE, `muscleMass` des KILOS. Toute conversion passe par
// `bodyMetricUnits.ts`, jamais à la main, et chaque relevé se convertit avec
// SON PROPRE poids. L'écart peut changer de signe selon l'unité — c'est de
// l'arithmétique, pas un bug, et c'est précisément pourquoi l'inverseur existe.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { UnitToggle } from "../../../components/bbc/UnitToggle";
import {
  compareReadings,
  isWeightUsable,
  type BodyMetricKey,
  type DisplayUnit,
  type Goal,
} from "../../../lib/bodyMetricUnits";
import { chargerCorpsMembre, type CorpsMembre } from "../relevesMembre";
import { BbcMensurationsCoach } from "./BbcMensurationsCoach";

interface Props {
  clientId: string;
  prenom: string;
  /** L'objectif du membre, pour colorer les écarts dans le bon sens. */
  objectif: Goal;
  /** Remonte à la fiche ce qui a été chargé (nombre de relevés, dates). */
  onCharge?: (corps: CorpsMembre) => void;
  /** Ouvre la feuille de pesée. */
  onNouvellePesee?: () => void;
  /** Change à chaque enregistrement pour forcer un rechargement. */
  cle?: number;
}

/**
 * Les SIX métriques, celles de la PWA classique et de l'app membre.
 *
 * Il n'y en avait que trois ici — Thomas, 18/08 : « finalement le client a une
 * meilleure visibilité que moi coach ». La donnée était pourtant déjà chargée :
 * `ScanValues` porte les huit mesures de la balance depuis toujours.
 *
 * `teinte` sert au tracé de la courbe. Graisse viscérale et âge métabolique
 * n'ont pas d'équivalent BBC dans la charte : ambre et sauge, les deux teintes
 * encore libres de sens sur cet écran.
 */
const LIGNES: Array<{ k: BodyMetricKey; ic: string; nom: string; teinte: string }> = [
  { k: "weight", ic: "⚖️", nom: "Poids", teinte: "var(--ls-bbc-lime)" },
  { k: "bodyFat", ic: "🔥", nom: "Masse grasse", teinte: "var(--ls-bbc-coral)" },
  { k: "muscleMass", ic: "💪", nom: "Masse musculaire", teinte: "var(--ls-bbc-teal)" },
  { k: "hydration", ic: "💧", nom: "Hydratation", teinte: "var(--ls-bbc-violet)" },
  { k: "visceralFat", ic: "🎯", nom: "Graisse viscérale", teinte: "var(--ls-bbc-amber)" },
  { k: "metabolicAge", ic: "⏳", nom: "Âge métabolique", teinte: "var(--ls-bbc-sage)" },
];

const fr = (n: number, d = 1) => n.toFixed(d).replace(".", ",");

function jour(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function BbcMemberCorps({ clientId, prenom, objectif, onCharge, onNouvellePesee, cle }: Props) {
  const [corps, setCorps] = useState<CorpsMembre | null>(null);
  const [unite, setUnite] = useState<DisplayUnit>("percent");
  const [ouvert, setOuvert] = useState(false);
  // La métrique dont on trace la courbe. Le poids par défaut : c'est celle
  // qu'on regarde en premier, et la seule qui est toujours renseignée.
  const [choisie, setChoisie] = useState<BodyMetricKey>("weight");

  useEffect(() => {
    let vivant = true;
    setCorps(null);
    void chargerCorpsMembre(clientId).then((c) => {
      if (!vivant) return;
      setCorps(c);
      onCharge?.(c);
    });
    return () => {
      vivant = false;
    };
    // `onCharge` volontairement hors dépendances : une fonction recréée à chaque
    // rendu relancerait la requête en boucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, cle]);

  const seul = (corps?.releves.length ?? 0) < 2;
  const poidsUtilisable = isWeightUsable(corps?.dernier?.scan.weight ?? null) && isWeightUsable(corps?.depart?.scan.weight ?? null);

  const mesures = useMemo(() => {
    if (!corps?.depart || !corps.dernier) return [];
    return LIGNES.map((l) => {
      const c = compareReadings(
        l.k,
        unite,
        objectif,
        { value: corps.depart!.scan[l.k], weight: corps.depart!.scan.weight },
        { value: corps.dernier!.scan[l.k], weight: corps.dernier!.scan.weight },
      );
      return { ...l, c };
    });
  }, [corps, unite, objectif]);

  if (!corps) {
    return (
      <div style={enveloppe}>
        <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)" }}>chargement de ses mesures…</div>
      </div>
    );
  }

  return (
    <div style={enveloppe}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
        <span style={legende}>
          <span style={pointLime} />son corps
        </span>
        {!seul ? (
          <UnitToggle
            unit={unite}
            onChange={setUnite}
            disabled={!poidsUtilisable}
            disabledReason="Il manque un poids : la conversion en a besoin."
            label="Unité d'affichage des mesures"
          />
        ) : null}
      </div>

      {seul ? (
        <>
          <div style={{ padding: "14px 13px", borderRadius: 14, background: "var(--ls-bbc-s2)", border: "1px dashed var(--ls-bbc-line2)", fontSize: 12.5, lineHeight: 1.55, color: "var(--ls-bbc-muted)" }}>
            {corps.depart ? (
              <>
                <strong style={{ color: "var(--ls-bbc-text)" }}>Un seul relevé, celui du {jour(corps.depart.date)}.</strong>{" "}
                Il n'y a donc rien à comparer — et c'est aussi ce que voit {prenom} dans son application :
                « ta transformation commence ». La deuxième pesée allumera sa courbe.
              </>
            ) : (
              <>
                <strong style={{ color: "var(--ls-bbc-text)" }}>Aucune pesée enregistrée.</strong>{" "}
                Tant qu'il n'y en a pas, ni toi ni {prenom} ne voyez la moindre mesure.
              </>
            )}
          </div>
          {corps.depart ? (
            <div style={{ marginTop: 11, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 12.5, color: "var(--ls-bbc-muted)" }}>
              départ · {fr(corps.depart.scan.weight ?? 0)} kg
              {corps.depart.scan.bodyFat != null ? ` · ${fr(corps.depart.scan.bodyFat)} % de gras` : ""}
              {corps.depart.scan.muscleMass != null ? ` · ${fr(corps.depart.scan.muscleMass)} kg de muscle` : ""}
            </div>
          ) : null}
        </>
      ) : (
        mesures.map((m, i) => (
          <button
            key={m.k}
            type="button"
            onClick={() => setChoisie(m.k)}
            aria-pressed={choisie === m.k}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              textAlign: "left",
              background: choisie === m.k ? `color-mix(in srgb, ${m.teinte} 10%, transparent)` : "transparent",
              border: 0,
              borderTop: i === 0 ? 0 : "1px solid var(--ls-bbc-line)",
              borderLeft: `3px solid ${choisie === m.k ? m.teinte : "transparent"}`,
              borderRadius: choisie === m.k ? 10 : 0,
              cursor: "pointer",
              fontFamily: "var(--ls-bbc-font-body)",
              color: "var(--ls-bbc-text)",
              padding: i === 0 ? "2px 8px 12px" : "12px 8px",
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 18, flex: "none", lineHeight: 1.2 }}>{m.ic}</span>
            {/* Le nom sur sa propre ligne : à 390 px, « Masse musculaire » sur la
                même ligne que les chiffres se coupait (mesuré, pas vu à l'œil). */}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 600 }}>{m.nom}</span>
              <span style={{ display: "block", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 12.5, color: "var(--ls-bbc-hint)", marginTop: 3 }}>
                {m.c.start.value != null ? fr(m.c.start.value, m.c.decimals) : "—"} →{" "}
                <strong style={{ color: "var(--ls-bbc-text)", fontSize: 14 }}>
                  {m.c.current.value != null ? fr(m.c.current.value, m.c.decimals) : "—"}
                </strong>{" "}
                {m.c.unit}
              </span>
            </span>
            <span
              style={{
                fontFamily: "var(--ls-bbc-font-mono)",
                fontSize: 19,
                fontWeight: 800,
                flex: "none",
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
                color:
                  m.c.verdict === "bon"
                    ? "var(--ls-bbc-lime)"
                    : m.c.verdict === "mauvais"
                      ? "var(--ls-bbc-coral)"
                      : "var(--ls-bbc-hint)",
              }}
            >
              {m.c.delta.value == null
                ? "—"
                : `${m.c.delta.value > 0 ? "+" : m.c.delta.value < 0 ? "−" : ""}${fr(Math.abs(m.c.delta.value), m.c.decimals)}`}
            </span>
          </button>
        ))
      )}

      {/* LA COURBE. Elle n'existait pas côté coach : il lisait trois écarts et
          aucune tendance, alors que la membre a la sienne depuis ce matin.
          Même arithmétique que la PWA classique — dont le `padY` proportionnel,
          indispensable dès qu'on trace autre chose que des kilos (l'indice
          viscéral va de 1 à 59, l'âge métabolique de 20 à 60). */}
      {(() => {
        const ligne = LIGNES.find((l) => l.k === choisie) ?? LIGNES[0];
        const pts = corps.releves
          .map((r) => ({ date: r.date, v: r.scan[choisie] }))
          .filter((p): p is { date: string; v: number } => typeof p.v === "number" && Number.isFinite(p.v) && p.v > 0);
        if (pts.length < 2) {
          return (
            <div style={{ marginTop: 13, paddingTop: 12, borderTop: "1px solid var(--ls-bbc-line)", fontSize: 12, color: "var(--ls-bbc-muted)", lineHeight: 1.5 }}>
              Il faut deux relevés portant {ligne.nom.toLowerCase()} pour tracer sa courbe.
            </div>
          );
        }
        const L = 300, H = 116, marge = 14, haut = 8, bas = 100;
        const vals = pts.map((p) => p.v);
        const bas0 = Math.min(...vals), haut0 = Math.max(...vals);
        const jeu = (haut0 - bas0) * 0.12 || Math.max(1, haut0 * 0.05);
        const lo = bas0 - jeu, hi = haut0 + jeu, ampleur = hi - lo || 1;
        const coords = vals.map((v, i) => [
          marge + (pts.length > 1 ? (i * (L - 2 * marge)) / (pts.length - 1) : 0),
          haut + ((hi - v) / ampleur) * (bas - haut),
        ] as [number, number]);
        const trace = coords.map((c) => c.join(",")).join(" ");
        const aire = `${marge},${bas} ${trace} ${L - marge},${bas}`;
        // On n'écrit pas toutes les valeurs quand il y en a trente : elles se
        // chevaucheraient et deviendraient illisibles.
        const pas = Math.max(1, Math.ceil(pts.length / 12));
        const iDates = pts.length <= 5
          ? pts.map((_, i) => i)
          : [0, Math.round(pts.length * 0.33), Math.round(pts.length * 0.66), pts.length - 1];
        return (
          <div style={{ marginTop: 13, paddingTop: 12, borderTop: "1px solid var(--ls-bbc-line)" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ls-bbc-muted)" }}>
                courbe · {ligne.nom.toLowerCase()}
              </span>
              <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, color: "var(--ls-bbc-muted)" }}>
                {pts.length} relevés
              </span>
            </div>
            <svg viewBox={`0 0 ${L} ${H}`} style={{ width: "100%", height: "auto", display: "block", overflow: "visible", marginTop: 8 }} aria-hidden="true">
              <defs>
                <linearGradient id={`corps-${choisie}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={ligne.teinte} stopOpacity="0.26" />
                  <stop offset="1" stopColor={ligne.teinte} stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1={marge} y1={bas} x2={L - marge} y2={bas} stroke="var(--ls-bbc-line)" strokeWidth="1" />
              <polygon points={aire} fill={`url(#corps-${choisie})`} />
              <polyline points={trace} fill="none" stroke={ligne.teinte} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              {coords.map((c, i) => {
                const dernier = i === coords.length - 1;
                return (
                  <g key={i}>
                    <circle cx={c[0]} cy={c[1]} r={dernier ? 4.2 : 2.2} fill={ligne.teinte} stroke="var(--ls-bbc-s1)" strokeWidth={dernier ? 2 : 1.2} />
                    {i % pas === 0 || dernier ? (
                      <text x={Math.max(12, Math.min(c[0], L - 12))} y={c[1] - 7} fill="var(--ls-bbc-text)" fontFamily="var(--ls-bbc-font-mono)" fontSize="6.5" fontWeight="700" textAnchor="middle">
                        {fr(vals[i], vals[i] >= 100 ? 0 : 1)}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 9.5, color: "var(--ls-bbc-muted)", marginTop: 5 }}>
              {[...new Set(iDates)].map((i) => <span key={i}>{jour(pts[i].date)}</span>)}
            </div>
          </div>
        );
      })()}

      {corps.exclus > 0 ? (
        <div style={{ marginTop: 11, fontSize: 11.5, lineHeight: 1.5, color: "var(--ls-bbc-hint)" }}>
          {corps.exclus} pesée{corps.exclus > 1 ? "s" : ""} écartée{corps.exclus > 1 ? "s" : ""} de la référence — gardée
          {corps.exclus > 1 ? "s" : ""} dans l'historique, mais {corps.exclus > 1 ? "elles ne comptent" : "elle ne compte"} pas comme départ.
        </div>
      ) : null}

      {corps.releves.length > 1 ? (
        <div style={{ marginTop: 13, borderTop: "1px solid var(--ls-bbc-line)", paddingTop: 11 }}>
          <button
            type="button"
            aria-expanded={ouvert}
            onClick={() => setOuvert((o) => !o)}
            style={{
              width: "100%",
              minHeight: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              background: "transparent",
              border: 0,
              cursor: "pointer",
              color: "var(--ls-bbc-text)",
              fontFamily: "var(--ls-bbc-font-body)",
              fontSize: 13,
              fontWeight: 600,
              padding: 0,
            }}
          >
            <span>Tous ses relevés</span>
            <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ls-bbc-hint)" }}>
              {corps.releves.length} pesées {ouvert ? "▴" : "▾"}
            </span>
          </button>
          {ouvert ? (
            <div style={{ marginTop: 4 }}>
              {[...corps.releves].reverse().map((r, i, arr) => {
                const prec = arr[i + 1];
                const e =
                  prec && r.scan.weight != null && prec.scan.weight != null
                    ? Math.round((r.scan.weight - prec.scan.weight) * 10) / 10
                    : null;
                return (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 0",
                      borderTop: "1px solid var(--ls-bbc-line)",
                      fontFamily: "var(--ls-bbc-font-mono)",
                      fontSize: 12,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    <span style={{ width: 66, flex: "none", color: "var(--ls-bbc-hint)" }}>{jour(r.date)}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      {fr(r.scan.weight ?? 0)} kg
                      {r.scan.bodyFat != null ? ` · ${fr(r.scan.bodyFat)} %` : ""}
                      {r.scan.muscleMass != null ? ` · ${fr(r.scan.muscleMass)} kg` : ""}
                    </span>
                    <span
                      style={{
                        width: 54,
                        flex: "none",
                        textAlign: "right",
                        fontWeight: 700,
                        color: e == null ? "var(--ls-bbc-hint)" : e < 0 ? "var(--ls-bbc-lime)" : e > 0 ? "var(--ls-bbc-coral)" : "var(--ls-bbc-hint)",
                      }}
                    >
                      {e == null ? "départ" : `${e > 0 ? "+" : e < 0 ? "−" : ""}${fr(Math.abs(e))}`}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {onNouvellePesee ? (
        <button
          type="button"
          onClick={onNouvellePesee}
          style={{
            marginTop: 13,
            width: "100%",
            minHeight: 48,
            border: 0,
            borderRadius: 13,
            background: "var(--ls-bbc-lime)",
            color: "var(--ls-bbc-lime-ink)",
            fontFamily: "var(--ls-bbc-font-body)",
            fontSize: 14,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          ⚖️ Nouvelle pesée
        </button>
      ) : null}

      {/* LES MENSURATIONS. Elles manquaient totalement à la fiche du club
          (Thomas, 18/08 : « je ne vois nulle part les mensurations, ni où les
          appliquer manuellement »). Même silhouette et mêmes guides que côté
          membre — seul l'auteur de la ligne change. */}
      <div style={{ marginTop: 14 }}>
        <BbcMensurationsCoach clientId={clientId} prenom={prenom} />
      </div>
    </div>
  );
}

const enveloppe: React.CSSProperties = {
  background: "var(--ls-bbc-s2)",
  border: "1px solid var(--ls-bbc-line)",
  borderRadius: 16,
  padding: "15px 14px",
};

const legende: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontFamily: "var(--ls-bbc-font-mono)",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ls-bbc-hint)",
};

const pointLime: React.CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: 999,
  background: "var(--ls-bbc-lime)",
  boxShadow: "0 0 8px var(--ls-bbc-lime)",
};
