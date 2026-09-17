// =============================================================================
// « L'agenda » — l'agenda partagé du club, dans le mode BBC.
//
// MAQUETTE VALIDÉE PAR THOMAS le 17/09/2026 (v5). Le but, dit par lui : que
// l'équipe lâche TimeTree. Donc ce que TimeTree fait bien, on le fait pareil :
// un seul calendrier pour tout le club, une couleur par coach, les noms
// visibles de tous, les rituels et fermetures dedans.
//
// Trois vues, un seul socle (`agenda_du_club()` en base, `agendaClub.ts` pour
// la logique) :
//   · MOIS     la grille, une pastille par personne, « +N » quand ça déborde ;
//   · SEMAINE  une LISTE de sept jours — sept colonnes de 45 px ne montraient
//              qu'une initiale par bloc, en liste on lit les noms ;
//   · JOUR     une colonne PAR COACH : on voit d'un coup d'œil que Romane est
//              prise à 11 h et Mélanie non. C'est la vue qui sert à caler.
//
// Règles de l'écran, à ne pas défaire :
//   · la couleur dit la coach, la place de la pastille va au PRÉNOM ;
//   · tout ce qu'on touche fait 44 px (garde-fou visuel BBC) ;
//   · on arrive sur l'heure qu'il est, pas sur 7 h.
// L'ajout, la qualification, les permanences et fermetures arrivent dans les
// lots suivants, sur ce même socle.
// =============================================================================

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Club } from "../../../types/domain";
import { useCoachsDuClub, type CoachRattache } from "../useCoachsDuClub";
import { useAgendaDuClub } from "./useAgendaDuClub";
import { CalerRdvSheet } from "./CalerRdvSheet";
import { QualifierRdvClubSheet } from "./QualifierRdvClubSheet";
import { qualifierRdvClub } from "./qualifierRdvClub";
import { BbcNewMemberSheet } from "../BbcNewMemberSheet";
import {
  aQualifier,
  cleJour,
  couleurCoach,
  couloirs,
  decalerJour,
  grilleMois,
  heureDe,
  heureDecimale,
  jourDe,
  libelleJour,
  libelleMois,
  libelleNature,
  libelleSemaine,
  lundiDe,
  marqueDe,
  nomComplet,
  parJour,
  plageOuverture,
  prenomSeul,
  semaineDe,
  type RdvClub,
} from "./agendaClub";

type Vue = "jour" | "semaine" | "mois";

/** Au-delà, la case du mois n'affiche plus les pastilles mais « +N ». */
const PASTILLES_MAX = 3;
/** La grille horaire de la vue Jour. */
const H0 = 7;
const H1 = 21;
const PX_PAR_HEURE = 52;

interface Props {
  userId?: string;
  coachName?: string;
  club: Club | null;
}

export function BbcAgenda({ userId, coachName, club }: Props) {
  const cleAuj = cleJour(new Date());
  const [vue, setVue] = useState<Vue>("semaine");
  /** Le jour autour duquel on regarde — la clé d'un jour, quelle que soit la vue. */
  const [ancre, setAncre] = useState<string>(cleAuj);
  const [filtre, setFiltre] = useState<string>("tous");
  const [jourOuvert, setJourOuvert] = useState<string | null>(null);
  const [rdvOuvert, setRdvOuvert] = useState<RdvClub | null>(null);
  /** La feuille « caler / déplacer » — null = fermée. */
  const [caler, setCaler] = useState<{ jour: string; coach?: string | null; heure?: number | null; deplace?: RdvClub | null } | null>(null);
  /** Le rendez-vous qu'on qualifie — toucher un rendez-vous ouvre directement la question. */
  const [qualif, setQualif] = useState<RdvClub | null>(null);
  /** Le rendez-vous dont on crée la fiche membre (feuille pré-remplie). */
  const [membrePour, setMembrePour] = useState<RdvClub | null>(null);
  // Un suivi se règle depuis la fiche du membre : lui, on ne le qualifie pas ici.
  const ouvrirRdv = (r: RdvClub) => (r.source === "suivi" ? setRdvOuvert(r) : setQualif(r));

  const { coachs } = useCoachsDuClub(userId);
  const ouverture = plageOuverture(club?.settings?.open_hours ?? null);

  const dAncre = jourDe(ancre);
  const lundi = useMemo(() => lundiDe(jourDe(ancre)), [ancre]);
  const semaines = useMemo(() => grilleMois(dAncre.getFullYear(), dAncre.getMonth()), [ancre]);

  // La fenêtre lue = ce qui est affiché, débords du mois compris.
  const { du, au } = useMemo(() => {
    if (vue === "mois") {
      const fin = jourDe(semaines[semaines.length - 1][6]);
      fin.setDate(fin.getDate() + 1);
      return { du: jourDe(semaines[0][0]), au: fin };
    }
    const fin = new Date(lundi);
    fin.setDate(fin.getDate() + 7);
    return { du: lundi, au: fin };
  }, [vue, semaines, lundi]);
  const { rdvs, loading, refetch } = useAgendaDuClub(du, au, userId);

  const visibles = useMemo(
    () => (filtre === "tous" ? rdvs : rdvs.filter((r) => r.coachId === filtre)),
    [rdvs, filtre],
  );
  const parJourMap = useMemo(() => parJour(visibles), [visibles]);
  const maintenant = Date.now();
  const couleur = (id: string | null) => couleurCoach(id, coachs);
  const prenomCoach = (id: string | null) => coachs.find((c) => c.id === id)?.prenom ?? "le club";

  const decaler = (n: number) => {
    if (vue === "jour") setAncre(decalerJour(ancre, n));
    else if (vue === "semaine") setAncre(decalerJour(ancre, 7 * n));
    else setAncre(cleJour(new Date(dAncre.getFullYear(), dAncre.getMonth() + n, 1)));
  };
  const titre = vue === "mois" ? libelleMois(dAncre) : vue === "semaine" ? libelleSemaine(lundi) : libelleJour(dAncre);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* ── Où l'on regarde ───────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" onClick={() => decaler(-1)} aria-label="Précédent" style={fleche}>
          ‹
        </button>
        <div style={{ flex: 1, minWidth: 0, fontSize: 18, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textTransform: vue === "jour" ? "capitalize" : "none" }}>
          {titre}
        </div>
        <button type="button" onClick={() => setAncre(cleAuj)} style={boutonAuj}>
          Auj.
        </button>
        <button type="button" onClick={() => decaler(1)} aria-label="Suivant" style={fleche}>
          ›
        </button>
      </div>

      <div role="tablist" aria-label="Vue" style={segments}>
        {(["jour", "semaine", "mois"] as Vue[]).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={vue === v} onClick={() => setVue(v)} style={{ ...segment, background: vue === v ? "var(--ls-bbc-s3)" : "transparent", color: vue === v ? "var(--ls-bbc-text)" : "var(--ls-bbc-muted)" }}>
            {v === "jour" ? "Jour" : v === "semaine" ? "Semaine" : "Mois"}
          </button>
        ))}
      </div>

      {/* ── Les coachs : « Tous », puis chacune avec sa couleur ───────────── */}
      <div style={rangeeCoachs}>
        <Puce on={filtre === "tous"} onClick={() => setFiltre("tous")}>
          Tous
        </Puce>
        {coachs.map((c) => (
          <Puce key={c.id} on={filtre === c.id} onClick={() => setFiltre(c.id)} couleur={couleur(c.id)}>
            {c.prenom}
          </Puce>
        ))}
      </div>

      {vue === "mois" ? (
        <VueMois semaines={semaines} moisAffiche={dAncre.getMonth()} cleAuj={cleAuj} parJourMap={parJourMap} couleur={couleur} onJour={setJourOuvert} />
      ) : vue === "semaine" ? (
        <VueSemaine
          cles={semaineDe(lundi)}
          cleAuj={cleAuj}
          parJourMap={parJourMap}
          couleur={couleur}
          prenomCoach={prenomCoach}
          maintenant={maintenant}
          onJour={(k) => {
            setAncre(k);
            setVue("jour");
          }}
          onRdv={ouvrirRdv}
        />
      ) : (
        <VueJour
          cle={ancre}
          estAuj={ancre === cleAuj}
          coachs={filtre === "tous" ? coachs : coachs.filter((c) => c.id === filtre)}
          rdvs={parJourMap.get(ancre) ?? []}
          ouverture={ouverture}
          couleur={couleur}
          onRdv={ouvrirRdv}
          onTrou={(coachId, heure) => setCaler({ jour: ancre, coach: coachId, heure })}
        />
      )}

      {/* ＋ : toujours au même endroit, au-dessus du pouce. */}
      <button type="button" onClick={() => setCaler({ jour: vue !== "mois" && ancre >= cleAuj ? ancre : cleAuj })} aria-label="Ajouter un rendez-vous" style={fab}>
        ＋
      </button>

      <div style={{ fontSize: 12, color: "var(--ls-bbc-hint)", lineHeight: 1.5 }}>
        {loading ? "Chargement…" : vue === "mois" ? `${visibles.length} rendez-vous sur la période · touche un jour pour sa liste.` : vue === "semaine" ? "Touche un jour pour le voir coach par coach." : "Une colonne par coach. Touche un rendez-vous pour l'ouvrir."}
      </div>

      {/* ── La liste d'un jour (depuis le mois) ────────────────────────── */}
      {jourOuvert ? (
        <Feuille onClose={() => setJourOuvert(null)} titre={libelleJour(jourDe(jourOuvert))} sous={`${(parJourMap.get(jourOuvert) ?? []).length} rendez-vous · ${filtre === "tous" ? "toute l'équipe" : prenomCoach(filtre)}`}>
          {(parJourMap.get(jourOuvert) ?? []).length === 0 ? (
            <div style={vide}>Rien de prévu ce jour-là.</div>
          ) : (
            (parJourMap.get(jourOuvert) ?? []).map((r) => (
              <LigneRdv key={`${r.source}-${r.id}`} r={r} couleur={couleur(r.coachId)} coach={prenomCoach(r.coachId)} maintenant={maintenant} onClick={() => ouvrirRdv(r)} />
            ))
          )}
          <button
            type="button"
            onClick={() => {
              setAncre(jourOuvert);
              setVue("jour");
              setJourOuvert(null);
            }}
            style={boutonPlein}
          >
            Voir la journée coach par coach
          </button>
        </Feuille>
      ) : null}

      {/* ── Un rendez-vous ─────────────────────────────────────────────── */}
      {rdvOuvert ? (
        <Feuille onClose={() => setRdvOuvert(null)} titre={nomComplet(rdvOuvert)} sous={`${libelleJour(new Date(rdvOuvert.debut))} · ${heureDe(rdvOuvert.debut)} – ${heureDe(rdvOuvert.fin)}`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 0 6px" }}>
            <Ligne couleur={couleur(rdvOuvert.coachId)}>
              {libelleNature(rdvOuvert)} <span style={{ color: "var(--ls-bbc-muted)" }}>avec {prenomCoach(rdvOuvert.coachId)}</span>
            </Ligne>
            {marqueDe(rdvOuvert) ? (
              <Ligne couleur="var(--ls-bbc-lime)">
                {marqueDe(rdvOuvert)!.symbole} {marqueDe(rdvOuvert)!.libelle}
              </Ligne>
            ) : aQualifier(rdvOuvert, maintenant) ? (
              <Ligne couleur="var(--ls-bbc-coral)">Passé, pas encore qualifié</Ligne>
            ) : null}
            {rdvOuvert.telephone ? (
              <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
                <a href={`tel:${rdvOuvert.telephone.replace(/\D/g, "")}`} style={lienAction}>
                  📞 Appeler
                </a>
                <a href={`sms:${rdvOuvert.telephone.replace(/\D/g, "")}`} style={lienAction}>
                  💬 SMS
                </a>
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)" }}>Pas de téléphone sur ce rendez-vous.</div>
            )}
            {rdvOuvert.source === "prospect" && !marqueDe(rdvOuvert) ? (
              <button
                type="button"
                onClick={() => {
                  const r = rdvOuvert;
                  setRdvOuvert(null);
                  setCaler({ jour: cleJour(new Date(r.debut)), coach: r.coachId, deplace: r });
                }}
                style={boutonFantome}
              >
                Déplacer ce rendez-vous
              </button>
            ) : null}
          </div>
        </Feuille>
      ) : null}

      {qualif ? (
        <QualifierRdvClubSheet
          rdv={qualif}
          coachPrenom={prenomCoach(qualif.coachId)}
          couleur={couleur(qualif.coachId)}
          maintenant={maintenant}
          onClose={() => setQualif(null)}
          onMembre={() => {
            setMembrePour(qualif);
            setQualif(null);
          }}
          onQualifie={async (q) => {
            const res = await qualifierRdvClub(qualif, q);
            if (res.ok) {
              setQualif(null);
              void refetch();
            }
            return res;
          }}
          onDeplacer={
            qualif.source === "prospect"
              ? () => {
                  const r = qualif;
                  setQualif(null);
                  setCaler({ jour: cleJour(new Date(r.debut)), coach: r.coachId, deplace: r });
                }
              : null
          }
        />
      ) : null}

      {membrePour ? (
        <BbcNewMemberSheet
          userId={userId}
          coachName={coachName}
          club={club}
          prefill={{ prenom: membrePour.prenom, nom: membrePour.nom ?? "", tel: membrePour.telephone, email: null }}
          onClose={() => setMembrePour(null)}
          onCreated={(clientId) => {
            const r = membrePour;
            setMembrePour(null);
            if (r) void qualifierRdvClub(r, { issue: "membre", clientId }).then(() => refetch());
          }}
        />
      ) : null}

      {caler ? (
        <CalerRdvSheet
          userId={userId}
          coachs={coachs}
          couleur={couleur}
          jourInitial={caler.jour}
          coachInitial={caler.coach ?? null}
          heureInitiale={caler.heure ?? null}
          deplace={caler.deplace ?? null}
          onClose={() => setCaler(null)}
          onFait={(jour) => {
            setCaler(null);
            setAncre(jour);
            setVue("jour");
            void refetch();
          }}
        />
      ) : null}
    </div>
  );
}

// ── Mois ────────────────────────────────────────────────────────────────────
function VueMois({
  semaines,
  moisAffiche,
  cleAuj,
  parJourMap,
  couleur,
  onJour,
}: {
  semaines: string[][];
  moisAffiche: number;
  cleAuj: string;
  parJourMap: Map<string, RdvClub[]>;
  couleur: (id: string | null) => string;
  onJour: (k: string) => void;
}) {
  return (
    <div>
      <div style={teteJours}>
        {["lu", "ma", "me", "je", "ve", "sa", "di"].map((j) => (
          <span key={j} style={{ textAlign: "center", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-hint)", letterSpacing: ".06em" }}>
            {j}
          </span>
        ))}
      </div>
      {semaines.map((semaine) => (
        <div key={semaine[0]} style={ligneSemaine}>
          {semaine.map((k, i) => {
            const d = jourDe(k);
            const horsMois = d.getMonth() !== moisAffiche;
            const liste = parJourMap.get(k) ?? [];
            const estAuj = k === cleAuj;
            return (
              <button key={k} type="button" onClick={() => onJour(k)} style={caseJour}>
                <span
                  style={{
                    ...numero,
                    color: estAuj ? "var(--ls-bbc-bg)" : i === 6 ? "var(--ls-bbc-coral)" : horsMois ? "var(--ls-bbc-hint)" : "var(--ls-bbc-text)",
                    background: estAuj ? "var(--ls-bbc-lime)" : "transparent",
                    opacity: horsMois && !estAuj ? 0.55 : 1,
                  }}
                >
                  {d.getDate()}
                </span>
                {liste.slice(0, PASTILLES_MAX).map((r) => {
                  const m = marqueDe(r);
                  const c = couleur(r.coachId);
                  return (
                    <span
                      key={`${r.source}-${r.id}`}
                      style={{
                        ...pastille,
                        background: `color-mix(in srgb, ${c} 18%, transparent)`,
                        borderLeft: `3px solid ${c}`,
                        opacity: m?.code === "pas_venue" ? 0.55 : 1,
                        textDecoration: m?.code === "pas_venue" ? "line-through" : "none",
                      }}
                    >
                      {m ? `${m.symbole} ` : ""}
                      {prenomSeul(r)}
                    </span>
                  );
                })}
                {liste.length > PASTILLES_MAX ? (
                  <span style={{ display: "block", textAlign: "center", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 700, color: "var(--ls-bbc-hint)" }}>
                    +{liste.length - PASTILLES_MAX}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Semaine : sept jours en liste ───────────────────────────────────────────
function VueSemaine({
  cles,
  cleAuj,
  parJourMap,
  couleur,
  prenomCoach,
  maintenant,
  onJour,
  onRdv,
}: {
  cles: string[];
  cleAuj: string;
  parJourMap: Map<string, RdvClub[]>;
  couleur: (id: string | null) => string;
  prenomCoach: (id: string | null) => string;
  maintenant: number;
  onJour: (k: string) => void;
  onRdv: (r: RdvClub) => void;
}) {
  const refAuj = useRef<HTMLDivElement | null>(null);
  // On arrive sur aujourd'hui, pas sur lundi : un jeudi, trois journées
  // passées avant d'atteindre la sienne, c'est ce que Thomas a refusé le 03/09.
  useEffect(() => {
    refAuj.current?.scrollIntoView({ block: "start" });
  }, [cles.join(",")]);

  return (
    <div>
      {cles.map((k) => {
        const d = jourDe(k);
        const liste = parJourMap.get(k) ?? [];
        const estAuj = k === cleAuj;
        return (
          <div key={k} ref={estAuj ? refAuj : undefined} style={{ borderTop: "1px solid var(--ls-bbc-line)", scrollMarginTop: 8 }}>
            <button type="button" onClick={() => onJour(k)} style={teteJourListe}>
              <span style={{ ...numeroListe, background: estAuj ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s2)", color: estAuj ? "var(--ls-bbc-bg)" : "var(--ls-bbc-text)" }}>{d.getDate()}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 700, textTransform: "capitalize" }}>{libelleJour(d).split(" ")[0]}</span>
                <span style={{ display: "block", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-hint)" }}>
                  {liste.length ? `${liste.length} rdv` : "rien de prévu"}
                </span>
              </span>
              <span aria-hidden="true" style={{ color: "var(--ls-bbc-hint)", fontSize: 18 }}>
                ›
              </span>
            </button>
            {liste.map((r) => (
              <LigneRdv key={`${r.source}-${r.id}`} r={r} couleur={couleur(r.coachId)} coach={prenomCoach(r.coachId)} maintenant={maintenant} onClick={() => onRdv(r)} retrait />
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── Jour : une colonne par coach ────────────────────────────────────────────
function VueJour({
  cle,
  estAuj,
  coachs,
  rdvs,
  ouverture,
  couleur,
  onRdv,
  onTrou,
}: {
  cle: string;
  estAuj: boolean;
  coachs: CoachRattache[];
  rdvs: RdvClub[];
  ouverture: { debut: number; fin: number } | null;
  couleur: (id: string | null) => string;
  onRdv: (r: RdvClub) => void;
  /** On a touché un trou dans la colonne d'une coach, à cette heure (décimale). */
  onTrou: (coachId: string, heure: number) => void;
}) {
  const passe = cle < cleJour(new Date());
  const refMaintenant = useRef<HTMLDivElement | null>(null);
  const now = new Date();
  const heureMaintenant = now.getHours() + now.getMinutes() / 60;
  // Les rendez-vous sans coach vont dans une colonne « Le club », seulement s'il y en a.
  const sansCoach = rdvs.filter((r) => !r.coachId);
  const colonnes: Array<{ id: string | null; prenom: string }> = [
    ...coachs.map((c) => ({ id: c.id, prenom: c.prenom })),
    ...(sansCoach.length ? [{ id: null, prenom: "Le club" }] : []),
  ];
  const hauteur = (H1 - H0) * PX_PAR_HEURE;

  // On arrive sur l'heure qu'il est, pas sur 7 h.
  useEffect(() => {
    if (estAuj) refMaintenant.current?.scrollIntoView({ block: "center" });
  }, [cle, estAuj]);

  const heures: number[] = [];
  for (let h = H0; h < H1; h += 1) heures.push(h);

  return (
    <div>
      <div style={{ display: "flex", position: "sticky", top: 0, zIndex: 3, background: "var(--ls-bbc-bg)", borderBottom: "1px solid var(--ls-bbc-line)" }}>
        <div style={{ flex: "none", width: 38 }} />
        {colonnes.map((c) => {
          const n = rdvs.filter((r) => r.coachId === c.id).length;
          return (
            <div key={c.id ?? "club"} style={{ flex: 1, minWidth: 0, padding: "8px 2px 8px", textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 999, background: couleur(c.id), flex: "none" }} />
                {c.prenom}
              </div>
              <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-hint)", marginTop: 3 }}>{n ? `${n} rdv` : "libre"}</div>
            </div>
          );
        })}
      </div>

      <div style={{ position: "relative", display: "flex", height: hauteur }}>
        <div style={{ flex: "none", width: 38 }}>
          {heures.map((h) => (
            <span key={h} style={{ display: "block", height: PX_PAR_HEURE, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-hint)", textAlign: "right", paddingRight: 6, transform: "translateY(-7px)" }}>
              {h === H0 ? "" : `${String(h).padStart(2, "0")}h`}
            </span>
          ))}
        </div>
        {colonnes.map((c, i) => {
          const miens = rdvs.filter((r) => r.coachId === c.id);
          const { items, nb } = couloirs(miens);
          return (
            <div
              key={c.id ?? "club"}
              onClick={(e) => {
                // Toucher un trou = caler chez cette coach à cette heure, au quart d'heure près.
                if (!c.id || passe) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = H0 + Math.floor(((e.clientY - rect.top) / PX_PAR_HEURE) * 2) / 2;
                if (x >= H0 && x < H1) onTrou(c.id, x);
              }}
              style={{ position: "relative", flex: 1, minWidth: 0, borderLeft: "1px solid var(--ls-bbc-line)", cursor: c.id && !passe ? "pointer" : "default" }}
            >
              {heures.map((h) => (
                <div key={h} style={{ position: "absolute", left: 0, right: 0, top: (h - H0) * PX_PAR_HEURE, borderTop: "1px solid var(--ls-bbc-line)", pointerEvents: "none" }} />
              ))}
              {ouverture ? (
                <div style={{ position: "absolute", left: 0, right: 0, top: (ouverture.debut - H0) * PX_PAR_HEURE, height: (ouverture.fin - ouverture.debut) * PX_PAR_HEURE, background: "color-mix(in srgb, var(--ls-bbc-lime) 7%, transparent)", pointerEvents: "none" }}>
                  {i === 0 ? <span style={{ position: "absolute", left: 4, top: 3, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-lime-text)", letterSpacing: ".06em", textTransform: "uppercase" }}>club ouvert</span> : null}
                </div>
              ) : null}
              {estAuj && heureMaintenant >= H0 && heureMaintenant <= H1 ? (
                <div ref={i === 0 ? refMaintenant : undefined} style={{ position: "absolute", left: 0, right: 0, top: (heureMaintenant - H0) * PX_PAR_HEURE, borderTop: "2px solid var(--ls-bbc-coral)", zIndex: 2, pointerEvents: "none", scrollMarginTop: 120 }}>
                  {i === 0 ? <span style={{ position: "absolute", left: -4, top: -5, width: 8, height: 8, borderRadius: 999, background: "var(--ls-bbc-coral)" }} /> : null}
                </div>
              ) : null}
              {items.map(({ rdv, couloir }) => {
                const top = (heureDecimale(rdv.debut) - H0) * PX_PAR_HEURE + 1;
                const duree = Math.max(0.5, (new Date(rdv.fin).getTime() - new Date(rdv.debut).getTime()) / 3_600_000);
                const h = Math.max(26, duree * PX_PAR_HEURE - 3);
                const m = marqueDe(rdv);
                const c = couleur(rdv.coachId);
                return (
                  <button
                    key={`${rdv.source}-${rdv.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRdv(rdv);
                    }}
                    title={`${heureDe(rdv.debut)} · ${libelleNature(rdv)} · ${nomComplet(rdv)}`}
                    style={{
                      ...bloc,
                      top,
                      height: h,
                      left: `calc(${couloir} * 100% / ${nb} + 2px)`,
                      width: `calc(100% / ${nb} - 4px)`,
                      borderLeft: `3px solid ${c}`,
                      background: `color-mix(in srgb, ${c} 22%, var(--ls-bbc-bg))`,
                      opacity: m?.code === "pas_venue" ? 0.55 : 1,
                    }}
                  >
                    <span style={{ display: "block", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, opacity: 0.85 }}>{heureDe(rdv.debut)}</span>
                    <span style={{ display: "block", fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: m?.code === "pas_venue" ? "line-through" : "none" }}>
                      {m ? `${m.symbole} ` : ""}
                      {prenomSeul(rdv)}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Une ligne de rendez-vous (liste du jour, semaine) ───────────────────────
function LigneRdv({ r, couleur, coach, maintenant, onClick, retrait }: { r: RdvClub; couleur: string; coach: string; maintenant: number; onClick: () => void; retrait?: boolean }) {
  const m = marqueDe(r);
  const urgent = aQualifier(r, maintenant);
  return (
    <button type="button" onClick={onClick} style={{ ...ligneRdv, paddingLeft: retrait ? 46 : 0 }}>
      <span style={{ flex: "none", width: 46, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 13.5, fontWeight: 700 }}>{heureDe(r.debut)}</span>
      <span style={{ flex: "none", width: 4, alignSelf: "stretch", borderRadius: 4, background: couleur }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: m?.code === "pas_venue" ? "line-through" : "none", opacity: m?.code === "pas_venue" ? 0.6 : 1 }}>
          {libelleNature(r)} · {nomComplet(r)}
        </span>
        <span style={{ display: "block", fontSize: 11.5, color: urgent ? "var(--ls-bbc-coral)" : "var(--ls-bbc-muted)", marginTop: 2 }}>
          avec {coach}
          {m ? ` · ${m.symbole} ${m.libelle}` : urgent ? " · passé, à qualifier" : ""}
        </span>
      </span>
      <span aria-hidden="true" style={{ flex: "none", color: "var(--ls-bbc-hint)", fontSize: 18 }}>
        ›
      </span>
    </button>
  );
}

// ── Petits composants ───────────────────────────────────────────────────────
function Puce({ on, onClick, couleur, children }: { on: boolean; onClick: () => void; couleur?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={{
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 6,
        minHeight: 44,
        padding: "0 13px",
        borderRadius: 999,
        border: `1px solid ${on ? "var(--ls-bbc-text)" : "var(--ls-bbc-line)"}`,
        background: "var(--ls-bbc-s1)",
        color: on ? "var(--ls-bbc-text)" : "var(--ls-bbc-muted)",
        fontFamily: "var(--ls-bbc-font-body)",
        fontSize: 12.5,
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {couleur ? <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 999, background: couleur, flex: "none" }} /> : null}
      {children}
    </button>
  );
}

function Ligne({ couleur, children }: { couleur: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
      <span aria-hidden="true" style={{ flex: "none", width: 12, height: 12, borderRadius: 999, background: couleur }} />
      <span>{children}</span>
    </div>
  );
}

/** La feuille bas d'écran du mode BBC — même patron que les autres. */
function Feuille({ titre, sous, onClose, children }: { titre: string; sous?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={voile} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bbc-mode" style={panneau}>
        <div style={{ width: 40, height: 5, borderRadius: 9, background: "var(--ls-bbc-line2)", margin: "10px auto 4px", flex: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 18px 12px", borderBottom: "1px solid var(--ls-bbc-line)", flex: "none" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 22, lineHeight: 1.1 }}>{titre}</div>
            {sous ? (
              <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-hint)", letterSpacing: ".08em", textTransform: "uppercase", marginTop: 3 }}>{sous}</div>
            ) : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" style={croix}>
            ✕
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: "4px 18px calc(18px + env(safe-area-inset-bottom))" }}>{children}</div>
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const fleche: CSSProperties = {
  flex: "none", width: 44, height: 44, minHeight: 44, borderRadius: 12, border: "1px solid var(--ls-bbc-line)",
  background: "var(--ls-bbc-s1)", color: "var(--ls-bbc-text)", fontSize: 18, cursor: "pointer",
};
const boutonAuj: CSSProperties = {
  flex: "none", height: 44, minHeight: 44, padding: "0 12px", borderRadius: 12, border: "1px solid var(--ls-bbc-lime)",
  background: "transparent", color: "var(--ls-bbc-lime-text)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 12, fontWeight: 700, cursor: "pointer",
};
const segments: CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, padding: 4, borderRadius: 13,
  background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)",
};
const segment: CSSProperties = {
  minHeight: 44, border: 0, borderRadius: 10, fontFamily: "var(--ls-bbc-font-body)", fontSize: 13, fontWeight: 700, cursor: "pointer",
};
const rangeeCoachs: CSSProperties = { display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 };
const teteJours: CSSProperties = {
  position: "sticky", top: 0, zIndex: 2, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "var(--ls-bbc-bg)", padding: "8px 0 6px",
};
const ligneSemaine: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderTop: "1px solid var(--ls-bbc-line)" };
const caseJour: CSSProperties = {
  minWidth: 0, minHeight: 104, padding: "4px 2px 6px", border: 0, borderRadius: 8, background: "transparent",
  color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)", textAlign: "left", cursor: "pointer",
  display: "flex", flexDirection: "column", alignItems: "stretch", gap: 2,
};
const numero: CSSProperties = {
  display: "block", width: 26, height: 26, margin: "0 auto 3px", borderRadius: 999, textAlign: "center", lineHeight: "26px", fontSize: 13, fontWeight: 700,
};
const pastille: CSSProperties = {
  display: "block", margin: "0 1px", padding: "2px 4px", borderRadius: 4, fontSize: 11, lineHeight: 1.25, fontWeight: 600,
  whiteSpace: "nowrap", overflow: "hidden", color: "var(--ls-bbc-text)",
};
const teteJourListe: CSSProperties = {
  position: "sticky", top: 0, zIndex: 2, display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 50, padding: "6px 0",
  border: 0, background: "var(--ls-bbc-bg)", color: "var(--ls-bbc-text)", textAlign: "left", fontFamily: "var(--ls-bbc-font-body)", cursor: "pointer",
};
const numeroListe: CSSProperties = {
  flex: "none", width: 34, height: 34, borderRadius: 999, textAlign: "center", lineHeight: "34px", fontSize: 15, fontWeight: 800,
};
const ligneRdv: CSSProperties = {
  display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 52, padding: "8px 0",
  border: 0, borderBottom: "1px solid var(--ls-bbc-line)", background: "transparent", color: "var(--ls-bbc-text)",
  textAlign: "left", fontFamily: "var(--ls-bbc-font-body)", cursor: "pointer",
};
const bloc: CSSProperties = {
  position: "absolute", borderRadius: 7, padding: "3px 5px", overflow: "hidden", cursor: "pointer", border: 0,
  color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)", textAlign: "left", lineHeight: 1.25,
};
const vide: CSSProperties = { padding: "22px 0", textAlign: "center", fontSize: 13, color: "var(--ls-bbc-hint)" };
const boutonPlein: CSSProperties = {
  width: "100%", minHeight: 52, marginTop: 12, border: 0, borderRadius: 14, background: "var(--ls-bbc-lime)", color: "var(--ls-bbc-lime-ink)",
  fontFamily: "var(--ls-bbc-font-body)", fontSize: 15, fontWeight: 800, cursor: "pointer",
};
const fab: CSSProperties = {
  position: "fixed", right: 16, bottom: "calc(96px + env(safe-area-inset-bottom))", zIndex: 41,
  width: 58, height: 58, minHeight: 44, borderRadius: 99, border: 0, background: "var(--ls-bbc-lime)", color: "var(--ls-bbc-lime-ink)",
  fontSize: 30, lineHeight: 1, boxShadow: "0 8px 22px rgba(0,0,0,.35)", cursor: "pointer",
};
const boutonFantome: CSSProperties = {
  width: "100%", minHeight: 46, marginTop: 6, borderRadius: 13, border: "1px solid var(--ls-bbc-line2)", background: "var(--ls-bbc-s2)",
  color: "var(--ls-bbc-muted)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
};
const lienAction: CSSProperties = {
  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44, borderRadius: 12,
  border: "1px solid var(--ls-bbc-line2)", background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-text)",
  fontFamily: "var(--ls-bbc-font-body)", fontSize: 13, fontWeight: 700, textDecoration: "none",
};
const voile: CSSProperties = {
  position: "fixed", inset: 0, zIndex: 60, background: "rgba(8, 20, 18, .6)", display: "flex", alignItems: "flex-end", justifyContent: "center",
};
const panneau: CSSProperties = {
  width: "min(560px, 100%)", maxHeight: "78vh", display: "flex", flexDirection: "column", overflow: "hidden",
  background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line2)", borderRadius: "24px 24px 0 0", color: "var(--ls-bbc-text)",
};
const croix: CSSProperties = {
  flex: "none", width: 44, height: 44, minHeight: 44, borderRadius: 99, border: 0, background: "var(--ls-bbc-s3)",
  color: "var(--ls-bbc-muted)", fontSize: 16, cursor: "pointer",
};
