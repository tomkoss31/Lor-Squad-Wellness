// =============================================================================
// Le club, ce jour-là — qui ouvre, les réservations du site, les rituels.
//
// C'est ce qui vivait dans « La semaine » et qui permet de la retirer (étape 8,
// 18/09/2026) : sur TimeTree, « Fermé » et « Tom ouvre » sont des lignes du
// calendrier commun. Ici ce sont les VRAIS réglages — fermer une journée la
// retire du site dans la seconde (`discovery.holidays`), changer ses heures
// aussi (`discovery.hours_by_date`).
//
// DROITS : en base, ces trois gestes sont réservés au propriétaire du club et
// aux admins (`clubs_owner_manage`, `bbc_assign_shift`). On ne les élargit pas :
// les autres coachs LISENT la feuille, sans bouton qui échouerait en silence.
// =============================================================================

import { useEffect, useState, type CSSProperties } from "react";
import { cleJour, fmtHeure, jourDe, libelleJour, type HorairesDuJour } from "./agendaClub";

export interface RituelDuJour {
  key: string;
  label: string;
  at: Date;
}

interface Props {
  cle: string;
  horaires: HorairesDuJour;
  /** Le créneau du bar, tel qu'écrit dans les réglages (« 7h-11h »). */
  creneauBar: string;
  /** Le prénom de qui ouvre — `null` = personne. */
  quiOuvre: string | null;
  permanenceEnChargement: boolean;
  rituels: RituelDuJour[];
  /** Propriétaire du club ou admin : les seuls à pouvoir régler. */
  peutRegler: boolean;
  erreur: string | null;
  onClose: () => void;
  onChoisirQuiOuvre: () => void;
  onBasculerFermeture: () => void;
  /** `null` = revenir à l'horaire habituel de ce jour de la semaine. */
  onReglerPlage: (plage: [string, string] | null) => void;
}

export function JourDuClubSheet({ cle, horaires, creneauBar, quiOuvre, permanenceEnChargement, rituels, peutRegler, erreur, onClose, onChoisirQuiOuvre, onBasculerFermeture, onReglerPlage }: Props) {
  const [debut, setDebut] = useState(horaires.texte?.[0] ?? "08:00");
  const [fin, setFin] = useState(horaires.texte?.[1] ?? "12:00");
  useEffect(() => {
    setDebut(horaires.texte?.[0] ?? "08:00");
    setFin(horaires.texte?.[1] ?? "12:00");
  }, [horaires.texte?.[0], horaires.texte?.[1]]);
  const change = debut !== (horaires.texte?.[0] ?? "") || fin !== (horaires.texte?.[1] ?? "");
  const valide = fin > debut;
  // Un jour passé ne se règle plus : on le lit, c'est tout.
  const passe = cle < cleJour(new Date());

  return (
    <div style={voile} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bbc-mode" style={panneau}>
        <div style={{ width: 40, height: 5, borderRadius: 9, background: "var(--ls-bbc-line2)", margin: "10px auto 4px", flex: "none" }} />
        <div style={entete}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 22, lineHeight: 1.1, textTransform: "capitalize" }}>{libelleJour(jourDe(cle))}</div>
            <div style={sousTitre}>le club, ce jour-là</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" style={croix}>
            ✕
          </button>
        </div>

        <div style={corps}>
          {erreur ? <div style={alerte}>{erreur}</div> : null}

          {/* ── Qui ouvre le bar ─────────────────────────────────────────── */}
          <div style={bloc}>
            <div style={etiquette}>☕ qui ouvre · {creneauBar}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 700, color: quiOuvre || permanenceEnChargement ? "var(--ls-bbc-text)" : "var(--ls-bbc-amber)" }}>
                {permanenceEnChargement ? "…" : (quiOuvre ?? "Personne pour l'instant")}
              </span>
              {peutRegler && !passe ? (
                <button type="button" onClick={onChoisirQuiOuvre} style={boutonFantome}>
                  {quiOuvre ? "Changer" : "Choisir"}
                </button>
              ) : null}
            </div>
          </div>

          {/* ── Les réservations du site ─────────────────────────────────── */}
          <div style={bloc}>
            <div style={etiquette}>📅 réservations du site</div>
            <div style={{ marginTop: 8, fontSize: 16, fontWeight: 700, color: horaires.etat === "ferme" ? "var(--ls-bbc-amber)" : "var(--ls-bbc-text)" }}>
              {horaires.etat === "ferme"
                ? "Fermées ce jour-là"
                : horaires.etat === "repos"
                  ? "Pas de créneau ce jour-là"
                  : horaires.plages.map((p) => `${fmtHeure(p.debut)} – ${fmtHeure(p.fin)}`).join("  ·  ")}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", marginTop: 3, lineHeight: 1.45 }}>
              {horaires.etat === "ferme"
                ? "Personne ne peut réserver sur le site. Les rendez-vous déjà pris restent."
                : horaires.etat === "repos"
                  ? "Le club ne propose rien ce jour de la semaine."
                  : horaires.exception
                    ? "Horaire spécial, pour ce jour seulement."
                    : "L'horaire habituel de ce jour de la semaine."}
            </div>

            {peutRegler && !passe ? (
              <>
                {horaires.etat !== "ferme" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                    <span style={{ fontSize: 13, color: "var(--ls-bbc-muted)" }}>de</span>
                    <input type="time" value={debut} onChange={(e) => setDebut(e.target.value)} aria-label="Début des réservations" style={champHeure} />
                    <span style={{ fontSize: 13, color: "var(--ls-bbc-muted)" }}>à</span>
                    <input type="time" value={fin} onChange={(e) => setFin(e.target.value)} aria-label="Fin des réservations" style={champHeure} />
                    <button type="button" disabled={!valide || !change} onClick={() => onReglerPlage([debut, fin])} style={{ ...boutonPlein, background: valide && change ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s3)", color: valide && change ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-hint)" }}>
                      Enregistrer
                    </button>
                  </div>
                ) : null}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {horaires.exception && horaires.etat !== "ferme" ? (
                    <button type="button" onClick={() => onReglerPlage(null)} style={boutonFantome}>
                      Revenir à l'horaire habituel
                    </button>
                  ) : null}
                  {horaires.etat !== "repos" ? (
                    <button type="button" onClick={onBasculerFermeture} style={{ ...boutonFantome, borderColor: "var(--ls-bbc-amber)", color: "var(--ls-bbc-amber)" }}>
                      {horaires.etat === "ferme" ? "Rouvrir cette journée" : "Fermer cette journée"}
                    </button>
                  ) : null}
                </div>
                <div style={{ fontSize: 12, color: "var(--ls-bbc-hint)", marginTop: 8, lineHeight: 1.45 }}>Effet immédiat sur les réservations du site.</div>
              </>
            ) : null}
          </div>

          {/* ── Les rituels ──────────────────────────────────────────────── */}
          {rituels.length ? (
            <div style={bloc}>
              <div style={etiquette}>🎙 rituels · toute l'équipe</div>
              {rituels.map((r) => (
                <div key={`${r.key}-${r.at.getTime()}`} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 9 }}>
                  <span style={{ flex: "none", width: 46, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 13.5, fontWeight: 700 }}>{fmtHeure(r.at.getHours() + r.at.getMinutes() / 60)}</span>
                  <span style={{ flex: "none", width: 4, alignSelf: "stretch", minHeight: 20, borderRadius: 4, background: "var(--ls-bbc-violet)" }} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{r.label}</span>
                </div>
              ))}
              <div style={{ fontSize: 12, color: "var(--ls-bbc-hint)", marginTop: 9, lineHeight: 1.45 }}>Les inscrits se gèrent dans « Les appels ».</div>
            </div>
          ) : null}

          {!peutRegler ? <div style={{ fontSize: 12, color: "var(--ls-bbc-hint)", lineHeight: 1.45 }}>Ces réglages se changent par les responsables du club.</div> : null}
        </div>
      </div>
    </div>
  );
}

const voile: CSSProperties = { position: "fixed", inset: 0, zIndex: 60, background: "rgba(8, 20, 18, .74)", display: "flex", alignItems: "flex-end", justifyContent: "center" };
const panneau: CSSProperties = {
  width: "100%", maxWidth: 560, maxHeight: "92dvh", display: "flex", flexDirection: "column", background: "var(--ls-bbc-s1)", color: "var(--ls-bbc-text)",
  borderRadius: "22px 22px 0 0", border: "1px solid var(--ls-bbc-line)", borderBottom: 0, fontFamily: "var(--ls-bbc-font-body)",
};
const entete: CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "6px 18px 12px", borderBottom: "1px solid var(--ls-bbc-line)", flex: "none" };
const sousTitre: CSSProperties = { fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-hint)", letterSpacing: ".08em", textTransform: "uppercase", marginTop: 3 };
const croix: CSSProperties = { flex: "none", width: 44, height: 44, minHeight: 44, borderRadius: 99, border: 0, background: "var(--ls-bbc-s3)", color: "var(--ls-bbc-muted)", fontSize: 16, cursor: "pointer" };
const corps: CSSProperties = { flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: "14px 18px calc(18px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 12 };
const bloc: CSSProperties = { padding: "14px 16px", borderRadius: 16, border: "1px solid var(--ls-bbc-line)", background: "var(--ls-bbc-s2)" };
const etiquette: CSSProperties = { fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-bbc-hint)" };
const boutonFantome: CSSProperties = { flex: "none", minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--ls-bbc-line2)", background: "transparent", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 13.5, fontWeight: 700, cursor: "pointer" };
const boutonPlein: CSSProperties = { flex: "none", minHeight: 44, padding: "0 16px", borderRadius: 12, border: 0, fontFamily: "var(--ls-bbc-font-body)", fontSize: 13.5, fontWeight: 800, cursor: "pointer" };
// 16 px : en dessous, iOS zoome dans le champ et ne dézoome plus.
const champHeure: CSSProperties = { width: 104, minHeight: 44, borderRadius: 12, border: "1px solid var(--ls-bbc-line)", background: "var(--ls-bbc-s1)", color: "var(--ls-bbc-text)", padding: "0 10px", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 16 };
const alerte: CSSProperties = { padding: "10px 12px", borderRadius: 12, background: "color-mix(in srgb, var(--ls-bbc-coral) 14%, transparent)", border: "1px solid var(--ls-bbc-coral)", color: "var(--ls-bbc-text)", fontSize: 13, lineHeight: 1.45 };
