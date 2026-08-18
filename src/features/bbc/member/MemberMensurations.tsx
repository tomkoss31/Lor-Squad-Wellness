// =============================================================================
// MemberMensurations — la membre saisit ses dix mensurations elle-même.
//
// Lot 3 de l'alignement BBC ↔ PWA classique (audit du 18/08). Avant : quatre
// lignes en LECTURE SEULE, et « personne ne peut renseigner un membre BBC » —
// ni elle (pas de saisie), ni le coach (pas de bloc mensurations au club).
// Virginie, qui saisissait les siennes dans la PWA classique (3 sessions),
// aurait perdu ce geste en prenant sa carte.
//
// Ce qui vient de la PWA classique, à l'identique :
//   · la silhouette cliquable (même tracé 160×340, mêmes positions de points) ;
//   · le pas de 0,5 cm ;
//   · les guides « comment mesurer » + « à éviter » de measurementGuides.ts —
//     la demande explicite de Thomas (« avec les textes d'explication !!! ») ;
//   · l'écriture par l'edge `client-app-save-measurement` (token-only, la
//     seule voie possible : le membre est en rôle anon, toutes les policies de
//     `client_measurements` sont `to authenticated`).
//
// Ce qui diffère, et pourquoi :
//   · les clés de zone SONT les colonnes SQL (MeasurementKey) — le classique
//     avait inventé les siennes (`cou`, `brasG`…) et traînait un mapping ;
//   · la valeur se TAPE aussi au clavier : le stepper seul obligeait à 72 taps
//     pour entrer « 36 » sur une zone vierge ;
//   · le bouton refuse d'enregistrer hors 10–300 cm : l'edge jette ces valeurs
//     en silence, et un « enregistré » qui n'a rien écrit est le pire des cas ;
//   · pas de crédit XP : Thomas a retiré la gamification de l'app membre.
// =============================================================================

import { useMemo, useState } from "react";
import { getGuide, type MeasurementKey } from "../../../data/measurementGuides";
import { getSupabaseClient } from "../../../services/supabaseClient";
import type { Measurement } from "./MemberEvolution";

interface Props {
  token: string;
  measurements: Measurement[];
  /**
   * Le titre du bloc. Le coach lit « ses mensurations », la membre « mes
   * mensurations » — c'est le seul mot qui change entre les deux usages.
   */
  titre?: string;
  /**
   * Comment écrire. Par défaut : l'edge `client-app-save-measurement`, seule
   * voie du membre (rôle `anon`). Le COACH, lui, est authentifié et doit
   * écrire sous son propre nom — il passe donc son écrivain, et la ligne porte
   * `measured_by_type = 'coach'` au lieu de `'client'`.
   */
  ecrire?: (measures: Partial<Record<MeasurementKey, number>>) => Promise<void>;
}

/** Positions sur la silhouette 160×340 — celles de la PWA classique. */
const POINTS: Array<{ key: MeasurementKey; cx: number; cy: number }> = [
  { key: "neck", cx: 80, cy: 52 },
  { key: "chest", cx: 80, cy: 88 },
  { key: "arm_left", cx: 50, cy: 112 },
  { key: "arm_right", cx: 110, cy: 112 },
  { key: "waist", cx: 80, cy: 138 },
  { key: "hips", cx: 80, cy: 168 },
  { key: "thigh_left", cx: 71, cy: 214 },
  { key: "thigh_right", cx: 89, cy: 214 },
  { key: "calf_left", cx: 71, cy: 288 },
  { key: "calf_right", cx: 89, cy: 288 },
];

/** Repli quand une vieille réponse d'edge n'a pas encore le brut `cm`. */
const MOYENNES: Partial<Record<MeasurementKey, keyof Measurement>> = {
  waist: "waist_cm",
  hips: "hips_cm",
  neck: "neck_cm",
  chest: "chest_cm",
  thigh_left: "thigh_cm",
  thigh_right: "thigh_cm",
  arm_left: "arm_cm",
  arm_right: "arm_cm",
  calf_left: "calf_cm",
  calf_right: "calf_cm",
};

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}
function fr(n: number, d = 1) {
  return n.toFixed(d).replace(".", ",");
}
function valeurDe(session: Measurement | undefined, key: MeasurementKey): number | null {
  if (!session) return null;
  const brut = num(session.cm?.[key]);
  if (brut != null) return brut;
  const repli = MOYENNES[key];
  return repli ? num(session[repli]) : null;
}

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

export function MemberMensurations({ token, measurements, titre, ecrire }: Props) {
  // Sessions triées : la plus ancienne est le point de départ des écarts.
  const sessions = useMemo(
    () => [...measurements].sort((a, b) => (a.measured_at ?? "").localeCompare(b.measured_at ?? "")),
    [measurements],
  );
  const premiere = sessions[0];
  const derniere = sessions[sessions.length - 1];

  // La saisie du jour, gardée localement après enregistrement : la donnée
  // serveur arrivera au prochain chargement, l'écran ne doit pas « oublier »
  // ce qu'on vient d'écrire en attendant.
  const [locales, setLocales] = useState<Partial<Record<MeasurementKey, number>>>({});
  const [brouillon, setBrouillon] = useState<MeasurementKey[]>([]);
  const [zoneOuverte, setZoneOuverte] = useState<MeasurementKey | null>(null);
  const [saisie, setSaisie] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [fait, setFait] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const zones = POINTS.map((p) => {
    const g = getGuide(p.key);
    const cur = locales[p.key] ?? valeurDe(derniere, p.key);
    const depart = valeurDe(premiere, p.key);
    // Écart « à la manière du coach » : positif = des centimètres en moins.
    const perdu = cur != null && depart != null ? Math.round((depart - cur) * 10) / 10 : null;
    return {
      key: p.key,
      cx: p.cx,
      cy: p.cy,
      label: g.label.toLowerCase(),
      cur,
      perdu,
      enBrouillon: brouillon.includes(p.key),
    };
  });
  const remplies = zones.filter((z) => z.cur != null).length;
  const totalPerdu = zones.reduce((s, z) => (z.perdu != null && z.perdu > 0 ? s + z.perdu : s), 0);

  const valeur = Number(saisie.replace(",", "."));
  const valeurOk = Number.isFinite(valeur) && valeur >= 10 && valeur <= 300;

  function ouvrir(key: MeasurementKey) {
    const z = zones.find((x) => x.key === key);
    // On propose la dernière valeur connue, sinon celle du côté symétrique —
    // partir de zéro imposerait 72 taps de stepper pour un tour de cou.
    const symetrique = key.endsWith("_left")
      ? (key.replace("_left", "_right") as MeasurementKey)
      : key.endsWith("_right")
        ? (key.replace("_right", "_left") as MeasurementKey)
        : null;
    const base = z?.cur ?? (symetrique ? zones.find((x) => x.key === symetrique)?.cur ?? null : null);
    setSaisie(base != null ? String(base) : "");
    setZoneOuverte(key);
  }

  function pas(delta: number) {
    const v = Number(saisie.replace(",", "."));
    const depuis = Number.isFinite(v) ? v : 0;
    setSaisie(String(Math.max(0, Math.round((depuis + delta) * 2) / 2)));
  }

  function validerZone() {
    if (!zoneOuverte || !valeurOk) return;
    setLocales((m) => ({ ...m, [zoneOuverte]: Math.round(valeur * 2) / 2 }));
    setBrouillon((d) => (d.includes(zoneOuverte) ? d : [...d, zoneOuverte]));
    setZoneOuverte(null);
  }

  async function enregistrer() {
    if (envoi || brouillon.length === 0) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("hors ligne");
      const measures: Partial<Record<MeasurementKey, number>> = {};
      for (const k of brouillon) {
        const v = locales[k];
        if (v != null) measures[k] = v;
      }
      if (ecrire) {
        // Chemin coach : il est authentifié, il écrit sous son nom.
        await ecrire(measures);
      } else {
        const { error } = await sb.functions.invoke("client-app-save-measurement", {
          body: { token, measures },
        });
        // `functions.invoke` remonte bien une erreur sur 400/403 : c'est ce qui
        // empêche un faux « enregistré » quand l'edge a tout refusé.
        if (error) throw error;
      }
      setBrouillon([]);
      setFait(true);
      window.setTimeout(() => setFait(false), 2500);
    } catch {
      setErreur("l'enregistrement n'est pas passé — tes valeurs sont gardées, réessaie.");
    } finally {
      setEnvoi(false);
    }
  }

  const guide = zoneOuverte ? getGuide(zoneOuverte) : null;

  return (
    <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 18, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={eyebrow}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-teal)" }} />{titre ?? "mes mensurations"}
        </div>
        <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, color: "var(--ls-bbc-muted)" }}>
          {remplies}/10 zones{totalPerdu > 0 ? ` · − ${fr(totalPerdu)} cm` : ""}
        </span>
      </div>

      {/* La silhouette de la PWA classique, en tokens BBC. Un point vide pulse
          pour appeler le doigt ; un point saisi aujourd'hui passe lime. */}
      <div style={{ display: "flex", justifyContent: "center", margin: "12px 0 6px" }}>
        <svg viewBox="0 0 160 340" style={{ width: 140, height: "auto", overflow: "visible" }}>
          <g fill="color-mix(in srgb, var(--ls-bbc-teal) 5%, transparent)" stroke="var(--ls-bbc-line2)" strokeWidth="1.4" strokeLinejoin="round">
            <circle cx="80" cy="30" r="16" />
            <path d="M64 66 C64 60 72 54 80 54 C88 54 96 60 96 66 L100 98 C102 114 98 130 92 142 L88 176 C88 183 72 183 72 176 L68 142 C62 130 58 114 60 98 Z" />
            <path d="M64 70 C54 76 48 98 47 120 C46 130 53 131 55 121 C57 103 61 88 67 80" />
            <path d="M96 70 C106 76 112 98 113 120 C114 130 107 131 105 121 C103 103 99 88 93 80" />
            <path d="M74 177 C72 212 70 252 68 302 C67 314 77 314 79 302 C80 252 80 212 80 179" />
            <path d="M86 177 C88 212 90 252 92 302 C93 314 83 314 81 302 C80 252 80 212 80 179" />
          </g>
          {zones.map((z) => (
            <circle
              key={z.key}
              cx={z.cx}
              cy={z.cy}
              r="9"
              fill={z.enBrouillon ? "var(--ls-bbc-lime)" : z.cur != null ? "var(--ls-bbc-teal)" : "transparent"}
              stroke={z.cur != null ? "var(--ls-bbc-teal)" : "var(--ls-bbc-lime)"}
              strokeWidth="2"
              style={{ cursor: "pointer", animation: z.cur == null ? "lbPulse 1.8s infinite" : "none" }}
              onClick={() => ouvrir(z.key)}
            />
          ))}
        </svg>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {zones.map((z) => (
          <button
            key={z.key}
            type="button"
            onClick={() => ouvrir(z.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textAlign: "left",
              padding: "10px 13px",
              minHeight: 44,
              borderRadius: 11,
              background: "var(--ls-bbc-s2)",
              border: `1px solid ${z.enBrouillon ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line)"}`,
              color: "var(--ls-bbc-text)",
              fontFamily: "var(--ls-bbc-font-body)",
              cursor: "pointer",
            }}
          >
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999, flex: "none", background: z.cur != null ? "var(--ls-bbc-teal)" : "transparent", border: z.cur != null ? "none" : "1px solid var(--ls-bbc-lime)" }} />
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{z.label}</span>
            <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 12.5, fontWeight: 700 }}>
              {z.cur != null ? `${fr(z.cur, z.cur % 1 ? 1 : 0)} cm` : "—"}
            </span>
            {z.perdu != null && z.perdu !== 0 ? (
              <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-muted)" }}>
                {z.perdu > 0 ? `− ${fr(z.perdu)}` : `+ ${fr(Math.abs(z.perdu))}`}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {brouillon.length > 0 ? (
        <button
          type="button"
          disabled={envoi}
          onClick={() => void enregistrer()}
          style={{
            width: "100%",
            minHeight: 50,
            marginTop: 12,
            border: 0,
            borderRadius: 13,
            background: "var(--ls-bbc-lime)",
            color: "var(--ls-bbc-lime-ink, #06241F)",
            fontFamily: "var(--ls-bbc-font-body)",
            fontSize: 15,
            fontWeight: 700,
            cursor: envoi ? "wait" : "pointer",
            opacity: envoi ? 0.6 : 1,
          }}
        >
          {envoi ? "enregistrement…" : `enregistrer ${brouillon.length} mesure${brouillon.length > 1 ? "s" : ""}`}
        </button>
      ) : null}
      {fait ? (
        <div role="status" style={{ marginTop: 10, fontSize: 12.5, color: "var(--ls-bbc-lime-text)", fontWeight: 600 }}>
          c'est noté — tes mesures sont enregistrées.
        </div>
      ) : null}
      {erreur ? (
        <div role="alert" style={{ marginTop: 10, fontSize: 12.5, color: "var(--ls-bbc-coral)" }}>{erreur}</div>
      ) : null}

      {sessions.length > 0 ? (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--ls-bbc-line)" }}>
          <div style={{ ...eyebrow, fontSize: 9, marginBottom: 8 }}>sessions enregistrées</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sessions.slice(-3).reverse().map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 11px", borderRadius: 9, background: "var(--ls-bbc-s2)", fontSize: 12 }}>
                <span style={{ flex: 1 }}>
                  {s.measured_at ? new Date(s.measured_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : ""}
                </span>
                <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, color: "var(--ls-bbc-muted)" }}>
                  {s.by === "coach" ? "par ton coach" : "par toi"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── La feuille de saisie : guide + valeur + pas de 0,5 ─────────────── */}
      {zoneOuverte && guide ? (
        <div
          onClick={() => setZoneOuverte(null)}
          style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "flex-end" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bbc-mode"
            role="dialog"
            aria-modal="true"
            aria-label={guide.label}
            style={{
              width: "100%",
              maxWidth: 460,
              margin: "0 auto",
              background: "var(--ls-bbc-s1)",
              border: "1px solid var(--ls-bbc-line2)",
              borderRadius: "26px 26px 0 0",
              padding: "20px 20px calc(24px + env(safe-area-inset-bottom))",
              color: "var(--ls-bbc-text)",
              fontFamily: "var(--ls-bbc-font-body)",
              animation: "lbSheet .3s cubic-bezier(.16,1,.3,1)",
            }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 999, background: "var(--ls-bbc-line2)", margin: "0 auto 16px" }} />
            <div style={{ ...eyebrow, color: "var(--ls-bbc-teal)" }}>mensuration</div>
            <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 20, margin: "4px 0 14px" }}>{guide.label.toLowerCase()}</div>

            {/* Les textes d'explication — la demande explicite de Thomas. */}
            <div style={{ background: "color-mix(in srgb, var(--ls-bbc-teal) 8%, var(--ls-bbc-s2))", border: "1px solid color-mix(in srgb, var(--ls-bbc-teal) 22%, var(--ls-bbc-line))", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
              <div style={{ ...eyebrow, fontSize: 9, color: "var(--ls-bbc-teal)", marginBottom: 8 }}>comment mesurer</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {guide.howToMeasure.map((etape, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, fontSize: 12.5, lineHeight: 1.45 }}>
                    <span style={{ flex: "none", width: 16, height: 16, borderRadius: 999, background: "color-mix(in srgb, var(--ls-bbc-teal) 18%, transparent)", color: "var(--ls-bbc-teal)", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>{i + 1}</span>
                    <span>{etape}</span>
                  </div>
                ))}
              </div>
              {guide.commonMistakes.length > 0 ? (
                <div style={{ marginTop: 9, paddingTop: 9, borderTop: "1px dashed var(--ls-bbc-line)", fontSize: 11.5, color: "var(--ls-bbc-coral)", lineHeight: 1.45 }}>
                  à éviter : {guide.commonMistakes.join(" · ")}
                </div>
              ) : null}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginBottom: 18 }}>
              <button type="button" onClick={() => pas(-0.5)} aria-label="Retirer 0,5 cm" style={{ width: 52, height: 52, borderRadius: 15, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line2)", color: "var(--ls-bbc-text)", fontSize: 26, fontWeight: 700, cursor: "pointer", lineHeight: 1 }}>−</button>
              <div style={{ textAlign: "center", minWidth: 116 }}>
                {/* La valeur se TAPE aussi : 72 taps de stepper pour « 36 »,
                    personne ne le fera deux fois. */}
                <input
                  value={saisie}
                  onChange={(e) => setSaisie(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  aria-label={`${guide.label} en centimètres`}
                  style={{ width: 116, background: "transparent", border: 0, outline: "none", textAlign: "center", fontFamily: "var(--ls-bbc-font-display)", fontSize: 42, color: "var(--ls-bbc-text)", lineHeight: 1 }}
                />
                <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-muted)", marginTop: 2 }}>CENTIMÈTRES</div>
              </div>
              <button type="button" onClick={() => pas(0.5)} aria-label="Ajouter 0,5 cm" style={{ width: 52, height: 52, borderRadius: 15, background: "var(--ls-bbc-lime)", border: "none", color: "var(--ls-bbc-lime-ink, #06241F)", fontSize: 26, fontWeight: 700, cursor: "pointer", lineHeight: 1 }}>+</button>
            </div>

            {saisie !== "" && !valeurOk ? (
              <div style={{ fontSize: 11.5, color: "var(--ls-bbc-coral)", marginBottom: 10, textAlign: "center" }}>
                une mesure se situe entre 10 et 300 cm.
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={() => setZoneOuverte(null)} style={{ flex: "none", padding: "0 20px", minHeight: 50, borderRadius: 13, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line2)", color: "var(--ls-bbc-muted)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--ls-bbc-font-body)" }}>annuler</button>
              <button
                type="button"
                onClick={validerZone}
                disabled={!valeurOk}
                style={{ flex: 1, minHeight: 50, borderRadius: 13, border: "none", cursor: valeurOk ? "pointer" : "not-allowed", background: "var(--ls-bbc-lime)", color: "var(--ls-bbc-lime-ink, #06241F)", fontFamily: "var(--ls-bbc-font-body)", fontWeight: 700, fontSize: 15, opacity: valeurOk ? 1 : 0.45 }}
              >
                valider
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
