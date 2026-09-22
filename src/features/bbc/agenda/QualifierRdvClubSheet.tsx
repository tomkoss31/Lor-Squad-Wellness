// =============================================================================
// « Comment ça s'est passé ? » — qualifier un rendez-vous, depuis L'agenda BBC.
//
// MAQUETTE VALIDÉE PAR THOMAS le 17/09/2026. Toucher un rendez-vous ouvre
// directement cette question, passé comme à venir — la règle de l'agenda
// standard depuis le 16/09 (Gillet demain doit donner le même écran que
// Justine hier). Quatre réponses, pas une de plus :
//   ☕ carte de membre — la seule en vert, c'est la victoire ;
//   📋 suivi classique ;
//   🕓 pas encore — elle réfléchit : on choisit quand elle revient (3/7/15 j) ;
//   🚫 pas venue — a-t-elle prévenu ? Oui : rappel dans 15 jours, ou on recale.
//      Sans nouvelles : PAS de SMS pour lui courir après (règle de Thomas,
//      15/09 : « c'est délibéré ») — on garde l'appel de J+2 ou on la sort.
//
// Cette feuille ne décide rien et n'écrit rien : le parent écrit (par
// `qualifier_rdv_club()`) et ouvre la feuille membre. Une feuille qui décide
// ET écrit est intestable — même principe que QualifierRdvProspect.
// =============================================================================

import { useState, type CSSProperties } from "react";
import { aQualifier, heureDe, libelleJour, libelleNature, marqueDe, nomComplet, type RdvClub } from "./agendaClub";
import { ContactRdv } from "./ContactRdv";
import type { Qualification, ResultatQualif } from "./qualifierRdvClub";

type Etape = "choix" | "reflechit" | "pasvenue" | "lapin" | "replanifier";

interface Props {
  rdv: RdvClub;
  coachPrenom: string;
  couleur: string;
  maintenant: number;
  onClose: () => void;
  /** Ouvre la feuille « nouvelle membre », pré-remplie. Le parent qualifie à la création. */
  onMembre: () => void;
  onQualifie: (q: Qualification) => Promise<ResultatQualif>;
  /** Déplacer ce rendez-vous — seulement pour un rendez-vous posé à la main. */
  onDeplacer: (() => void) | null;
  /** Suivi de cliente (18/09) : « Venue · faire son bilan » — le bilan standard,
   *  ou le bilan des 10 pour une fin de carte. Le parent décide lequel. */
  onBilan?: (() => void) | null;
  /** Suivi de cliente : « Sa fiche complète » (app standard). */
  onFiche?: (() => void) | null;
  /** Depuis Le matin, « Pas venue » ouvre directement la bonne question (livraison C). */
  etapeInitiale?: "choix" | "pasvenue";
}

const JOURS_RELANCE = [3, 7, 15];

export function QualifierRdvClubSheet({ rdv, coachPrenom, couleur, maintenant, onClose, onMembre, onQualifie, onDeplacer, etapeInitiale, onBilan, onFiche }: Props) {
  const [etape, setEtape] = useState<Etape>(etapeInitiale ?? "choix");
  const [jours, setJours] = useState(7);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const marque = marqueDe(rdv);
  const passe = new Date(rdv.fin).getTime() < maintenant;
  const urgent = aQualifier(rdv, maintenant);
  const debut = new Date(rdv.debut);
  const quand = `${libelleJour(debut)} · ${heureDe(rdv.debut)} · ${coachPrenom}`;
  const prenom = rdv.prenom || "Elle";
  const suivi = rdv.source === "suivi";
  const finDeCarte = /carte/i.test(rdv.nature);
  /** Sa prochaine pesée, calée depuis sa fiche du club (22/09). */
  const pesee = /pes/i.test(rdv.nature);

  async function repondre(q: Qualification) {
    if (envoi) return;
    setEnvoi(true);
    setErreur(null);
    const res = await onQualifie(q);
    setEnvoi(false);
    if (!res.ok) setErreur(res.message);
  }

  const dateDans = (n: number) => {
    const d = new Date(maintenant + n * 86_400_000);
    return libelleJour(d);
  };

  return (
    <div style={voile} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bbc-mode" style={panneau} role="dialog" aria-modal="true" aria-label={`Qualifier le rendez-vous de ${nomComplet(rdv)}`}>
        <div style={{ width: 40, height: 5, borderRadius: 9, background: "var(--ls-bbc-line2)", margin: "10px auto 4px", flex: "none" }} />
        <div style={entete}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={titre}>{etape === "choix" ? nomComplet(rdv) : etape === "reflechit" ? "Elle réfléchit" : etape === "pasvenue" || etape === "replanifier" ? "Pas venue" : "Sans nouvelles"}</div>
            <div style={sousTitre}>{etape === "choix" ? `rdv ${quand}` : `${prenom} · ${quand}`}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" style={croix}>
            ✕
          </button>
        </div>

        <div style={corps}>
          {erreur ? <div style={alerte("coral")}>{erreur}</div> : null}

          {etape === "choix" ? (
            <>
              <div style={{ fontSize: 13, color: "var(--ls-bbc-muted)", lineHeight: 1.5 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 999, background: couleur }} />
                  {libelleNature(rdv)}
                </span>
              </div>
              {/* Les mêmes coordonnées que le CRM (22/09) : Mélanie devait repasser par le CRM standard. */}
              <ContactRdv rdv={rdv} />

              {marque ? (
                <div style={encart}>
                  Déjà qualifiée : <b>{marque.symbole} {marque.libelle}</b>. Tu peux changer ci-dessous.
                </div>
              ) : !passe ? (
                <div style={encart}>Rendez-vous à venir : tu peux déjà noter l'issue, ou revenir après.</div>
              ) : urgent ? (
                <div style={{ ...encart, borderColor: "color-mix(in srgb, var(--ls-bbc-coral) 40%, transparent)" }}>Ce rendez-vous est passé et n'a pas encore de réponse.</div>
              ) : null}

              <div style={etiquette}>comment ça s'est passé ?</div>
              {suivi ? (
                <>
                  {onBilan ? (
                    <Choix
                      emoji="✅"
                      titre={finDeCarte ? "Venue · faire son bilan des 10" : pesee ? "Venue · faire sa pesée" : "Venue · faire son bilan"}
                      sous={finDeCarte ? "La check-list en 9 points : scan, carte suivante, recos." : pesee ? "Sa fiche s'ouvre : « Son corps » a la balance et ses chiffres de départ." : "Le suivi s'ouvre tout de suite, avec ses derniers chiffres."}
                      onClick={onBilan}
                      victoire
                    />
                  ) : null}
                  <Choix emoji="✓" titre="Venue · c'est fait" sous="Le suivi est coché. Rien d'autre à faire." onClick={() => void repondre({ issue: "fait" })} />
                  {onDeplacer ? <Choix emoji="🔁" titre="Déplacer" sous="Un autre créneau, chez sa coach." onClick={onDeplacer} /> : null}
                  <Choix emoji="🚫" titre="Pas venue" sous="On la replanifie dans 3, 7 ou 15 jours. Pas de SMS." onClick={() => setEtape("replanifier")} />
                  {onFiche ? (
                    <button type="button" onClick={onFiche} style={lienBas}>
                      Sa fiche complète →
                    </button>
                  ) : null}
                </>
              ) : (
                <>
              <Choix emoji="☕" titre="Elle prend sa carte de membre" sous="Fiche créée dans le club, carte activée. Tout ce qu'on sait d'elle est déjà rempli." onClick={onMembre} victoire />
              <Choix
                emoji="📋"
                titre="Elle démarre en suivi classique"
                sous="Fiche hors club. Le rendez-vous est rangé ici ; le bilan se fait dans l'app classique."
                onClick={() => void repondre({ issue: "fait" })}
              />
              <Choix emoji="🕓" titre="Pas encore" sous="Elle réfléchit. Tu choisis quand elle revient dans ta liste d'appels." onClick={() => setEtape("reflechit")} />
              <Choix emoji="🚫" titre="Pas venue" sous="On décide de la suite juste après." onClick={() => setEtape("pasvenue")} />

              {onDeplacer && !marque ? (
                <button type="button" onClick={onDeplacer} style={lienBas}>
                  Déplacer ou modifier ce rendez-vous
                </button>
              ) : null}
                </>
              )}
            </>
          ) : etape === "reflechit" ? (
            <>
              <div style={{ fontSize: 13, color: "var(--ls-bbc-muted)", lineHeight: 1.5 }}>Le rendez-vous reste dans l'agenda et {prenom} reste dans le CRM. Tu choisis quand elle revient dans ta liste d'appels.</div>
              <div style={etiquette}>je la rappelle dans</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {JOURS_RELANCE.map((n) => (
                  <button key={n} type="button" onClick={() => setJours(n)} style={{ ...puce, background: jours === n ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s2)", borderColor: jours === n ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line)", color: jours === n ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-muted)" }}>
                    {n} jours
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 13, color: "var(--ls-bbc-muted)" }}>
                → elle revient le <b style={{ color: "var(--ls-bbc-text)" }}>{dateDans(jours)}</b>
              </div>
              <button type="button" disabled={envoi} onClick={() => void repondre({ issue: "relance", jours, raison: "Venue au RDV, réfléchit" })} style={boutonLime}>
                🔄 Je la relance le {dateDans(jours)}
              </button>
              <button type="button" disabled={envoi} onClick={() => void repondre({ issue: "perdue" })} style={boutonFantome}>
                🗂️ Elle ne donnera pas suite
              </button>
              <button type="button" onClick={() => setEtape("choix")} style={lienBas}>
                ‹ Retour
              </button>
            </>
          ) : etape === "pasvenue" ? (
            <>
              <div style={etiquette}>elle a prévenu ?</div>
              <Choix emoji="📩" titre="Oui, elle a prévenu" sous="On la rappelle dans 15 jours pour lui reproposer un créneau." onClick={() => void repondre({ issue: "relance", jours: 15, raison: "A prévenu, à rappeler" })} />
              <Choix emoji="🔇" titre="Sans nouvelles" sous="On ne lui court pas après par SMS : c'est son choix." onClick={() => setEtape("lapin")} />
              {onDeplacer ? (
                <button type="button" onClick={onDeplacer} style={boutonFantome}>
                  Elle veut un autre créneau : recaler
                </button>
              ) : null}
              <button type="button" onClick={() => setEtape("choix")} style={lienBas}>
                ‹ Retour
              </button>
            </>
          ) : etape === "replanifier" ? (
            <>
              <div style={{ fontSize: 13, color: "var(--ls-bbc-muted)", lineHeight: 1.5 }}>Le suivi reste dans l'agenda, à la même heure, un autre jour. Pas de SMS : c'est toi qui la préviens.</div>
              <ContactRdv rdv={rdv} />
              <div style={etiquette}>je la replanifie dans</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {JOURS_RELANCE.map((n) => (
                  <button key={n} type="button" onClick={() => setJours(n)} style={{ ...puce, background: jours === n ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s2)", borderColor: jours === n ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line)", color: jours === n ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-muted)" }}>
                    {n} jours
                  </button>
                ))}
              </div>
              <button type="button" disabled={envoi} onClick={() => void repondre({ issue: "pas_venue", jours })} style={boutonLime}>
                🔁 Je la replanifie le {dateDans(jours)}
              </button>
              <button type="button" onClick={() => setEtape("choix")} style={lienBas}>
                ‹ Retour
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, color: "var(--ls-bbc-muted)", lineHeight: 1.5 }}>Le mot « vous n'avez pas pu venir » part tout seul si on garde l'appel. Pas de SMS en plus.</div>
              <div style={etiquette}>et maintenant ?</div>
              <Choix emoji="📞" titre="Garder l'appel prévu" sous={`Elle revient dans ta liste le ${dateDans(2)}.`} onClick={() => void repondre({ issue: "pas_venue", jours: 2, raison: "Pas venue au RDV", mailPasVenue: true })} />
              <Choix emoji="🗂️" titre="La sortir des relances" sous="Elle passe en perdue. Plus aucun rappel." onClick={() => void repondre({ issue: "perdue" })} />
              <button type="button" onClick={() => setEtape("pasvenue")} style={lienBas}>
                ‹ Retour
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Choix({ emoji, titre, sous, onClick, victoire }: { emoji: string; titre: string; sous: string; onClick: () => void; victoire?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...choix,
        borderColor: victoire ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line2)",
        background: victoire ? "color-mix(in srgb, var(--ls-bbc-lime) 10%, var(--ls-bbc-s2))" : "var(--ls-bbc-s2)",
      }}
    >
      <span aria-hidden="true" style={{ flex: "none", fontSize: 24 }}>
        {emoji}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{titre}</span>
        <span style={{ display: "block", fontSize: 12.5, color: "var(--ls-bbc-muted)", marginTop: 2, lineHeight: 1.4 }}>{sous}</span>
      </span>
    </button>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const voile: CSSProperties = { position: "fixed", inset: 0, zIndex: 60, background: "rgba(8, 20, 18, .74)", display: "flex", alignItems: "flex-end", justifyContent: "center" };
const panneau: CSSProperties = { width: "min(560px, 100%)", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line2)", borderRadius: "24px 24px 0 0", color: "var(--ls-bbc-text)" };
const entete: CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "6px 18px 12px", borderBottom: "1px solid var(--ls-bbc-line)", flex: "none" };
const titre: CSSProperties = { fontFamily: "var(--ls-bbc-font-display)", fontSize: 22, lineHeight: 1.1 };
const sousTitre: CSSProperties = { fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-hint)", letterSpacing: ".08em", textTransform: "uppercase", marginTop: 3 };
const croix: CSSProperties = { flex: "none", width: 44, height: 44, minHeight: 44, borderRadius: 99, border: 0, background: "var(--ls-bbc-s3)", color: "var(--ls-bbc-muted)", fontSize: 16, cursor: "pointer" };
const corps: CSSProperties = { flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: "14px 18px calc(22px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 10 };
const etiquette: CSSProperties = { fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-bbc-hint)", marginTop: 6 };
const encart: CSSProperties = { padding: "10px 12px", borderRadius: 11, border: "1px dashed var(--ls-bbc-line2)", fontSize: 12.5, color: "var(--ls-bbc-muted)", lineHeight: 1.45 };
const choix: CSSProperties = { display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 66, padding: "10px 14px", borderRadius: 14, border: "1px solid", color: "var(--ls-bbc-text)", textAlign: "left", fontFamily: "var(--ls-bbc-font-body)", cursor: "pointer" };
const puce: CSSProperties = { minHeight: 44, padding: "0 13px", borderRadius: 11, border: "1px solid", fontFamily: "var(--ls-bbc-font-body)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" };
const boutonLime: CSSProperties = { width: "100%", minHeight: 52, border: 0, borderRadius: 14, background: "var(--ls-bbc-lime)", color: "var(--ls-bbc-lime-ink)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 15, fontWeight: 800, cursor: "pointer" };
const boutonFantome: CSSProperties = { width: "100%", minHeight: 46, borderRadius: 13, border: "1px solid var(--ls-bbc-line2)", background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-muted)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 13.5, fontWeight: 700, cursor: "pointer" };
const lienBas: CSSProperties = { width: "100%", minHeight: 44, border: 0, background: "transparent", color: "var(--ls-bbc-muted)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 };
function alerte(ton: "coral" | "amber"): CSSProperties {
  const c = ton === "coral" ? "var(--ls-bbc-coral)" : "var(--ls-bbc-amber)";
  return { padding: "11px 13px", borderRadius: 13, fontSize: 13, lineHeight: 1.5, background: `color-mix(in srgb, ${c} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${c} 40%, transparent)`, color: "var(--ls-bbc-text)" };
}
