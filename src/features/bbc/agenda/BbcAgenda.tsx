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
//
// ÉTAPE 8 (18/09) — ce qui vivait dans « La semaine » est ici, et elle a pu
// disparaître : QUI OUVRE le bar, les RITUELS (en violet, toute l'équipe), les
// HEURES de réservation du jour et les FERMETURES (bande lime / hachures
// ambre), et les « PAS DISPO » des coachs (hachures grises, posés depuis le ＋).
// Tout ça se lit par tout le club ; régler le club reste aux responsables.
// =============================================================================

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import type { Club } from "../../../types/domain";
import { useAppContext } from "../../../context/AppContext";
import { setClubDayClosed, setClubDayHours } from "../../../services/sb/club-bookings";
import { useCoachsDuClub, type CoachRattache } from "../useCoachsDuClub";
import { useClubShifts, equipeAffectable, equipeParClub } from "../useClubShifts";
import { getCallsForWeek } from "../data/bbcCalls";
import { FeuilleAffectation } from "../views/BbcSemaine";
import { useAgendaDuClub } from "./useAgendaDuClub";
import { useMaintenant } from "./useMaintenant";
import { CalerRdvSheet } from "./CalerRdvSheet";
import { QualifierRdvClubSheet } from "./QualifierRdvClubSheet";
import { JourDuClubSheet, type RituelDuJour } from "./JourDuClubSheet";
import { GuideAgendaSheet } from "./GuideAgendaSheet";
import { NotifsAgendaSheet } from "./NotifsAgendaSheet";
import { ContactRdv } from "./ContactRdv";
import { qualifierRdvClub } from "./qualifierRdvClub";
import { annulerRdv, prevenirCoach } from "./calerRdv";
import { libererIndispo } from "./indispos";
import { Toast } from "../ui";
import { BbcNewMemberSheet } from "../BbcNewMemberSheet";
import { BbcBilan10 } from "../BbcBilan10";
import {
  aQualifier,
  contactDe,
  cleJour,
  couleurCoach,
  couloirs,
  decalerJour,
  estIndispo,
  fmtHeure,
  grilleMois,
  heureDe,
  heureDecimale,
  horairesDuJour,
  jourDe,
  libelleJour,
  libelleMois,
  libelleNature,
  libelleSemaine,
  lundiDe,
  marqueDe,
  nomComplet,
  parJour,
  prenomSeul,
  sansIndispos,
  semaineDe,
  type HorairesDuJour,
  type RdvClub,
} from "./agendaClub";

type Vue = "jour" | "semaine" | "mois";

/** « J'ai vu la carte d'accueil » — par navigateur, c'est un confort, pas une donnée. */
const CLE_GUIDE = "ls-agenda-club-guide-vu";

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
  /**
   * L'agenda vit aussi dans l'app standard (étape 9 — Maria n'est pas en mode
   * BBC). Là-bas, un en-tête de 64 px reste collé en haut sur téléphone et le
   * bouton Noaly occupe déjà le coin bas-droit : on décale ce qui colle et le ＋.
   */
  collantHaut?: string;
  fabBas?: string;
  /** Livraison C : après « elle prend sa carte de membre », BbcApp enchaîne (son 1er pointage). */
  onMembreCree?: (clientId: string, prenom: string) => void;
  /** Livraison C : « elle démarre en suivi classique » → le bilan standard, tout de suite. */
  onSuiviClassique?: (rdv: RdvClub) => void;
  /** Venue à sa pesée (22/09) : BBC ouvre sa fiche du club. Sans (app standard) → son suivi standard. */
  onPesee?: (clientId: string) => void;
}

export function BbcAgenda({ userId, coachName, club, collantHaut = "env(safe-area-inset-top, 0px)", fabBas, onMembreCree, onSuiviClassique, onPesee }: Props) {
  // L'heure est VIVANTE (18/09) : la tablette du comptoir ne se ferme jamais.
  // Sans ça, « Auj. » et le liseré du jour restaient sur le jour du montage —
  // au petit-déjeuner suivant, l'agenda s'ouvrait encore sur la veille.
  const maintenant = useMaintenant();
  const cleAuj = cleJour(new Date(maintenant));
  const [vue, setVue] = useState<Vue>("semaine");
  /** Le jour autour duquel on regarde — la clé d'un jour, quelle que soit la vue. */
  const [ancre, setAncre] = useState<string>(cleAuj);
  // On passe minuit avec l'app ouverte : si on regardait « aujourd'hui », on
  // suit le vrai aujourd'hui. Si la coach s'était déplacée à une autre semaine
  // (caler un rendez-vous en octobre), on ne lui reprend pas la main.
  const dernierAuj = useRef(cleAuj);
  useEffect(() => {
    if (dernierAuj.current === cleAuj) return;
    setAncre((a) => (a === dernierAuj.current ? cleAuj : a));
    dernierAuj.current = cleAuj;
  }, [cleAuj]);
  const [filtre, setFiltre] = useState<string>("tous");
  const [jourOuvert, setJourOuvert] = useState<string | null>(null);
  const [rdvOuvert, setRdvOuvert] = useState<RdvClub | null>(null);
  /** La feuille « caler / déplacer » — null = fermée. */
  const [caler, setCaler] = useState<{ jour: string; coach?: string | null; heure?: number | null; deplace?: RdvClub | null } | null>(null);
  /** Le rendez-vous qu'on qualifie — toucher un rendez-vous ouvre directement la question. */
  const [qualif, setQualif] = useState<RdvClub | null>(null);
  /** Le mot qui suit un geste (22/09) : « déplacé · elle a reçu sa nouvelle date », « annulé ». */
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);
  /** Le rendez-vous dont on crée la fiche membre (feuille pré-remplie). */
  const [membrePour, setMembrePour] = useState<RdvClub | null>(null);
  const navigate = useNavigate();
  /** Le bilan des 10 d'une cliente en fin de carte, ouvert depuis la question (18/09). */
  const [bilan10, setBilan10] = useState<{ clientId: string; nom: string } | null>(null);
  // Un suivi se règle depuis la fiche du membre, un « pas dispo » se libère :
  // ni l'un ni l'autre ne se qualifie.
  // Depuis le 18/09 (agenda unique), un SUIVI de cliente ouvre la même question
  // qu'un prospect — avant il finissait dans une feuille « se règle depuis la
  // fiche », une impasse pour les deux tiers de l'agenda. Seul « pas dispo »
  // garde sa petite feuille.
  const ouvrirRdv = (r: RdvClub) => (r.source === "indispo" ? setRdvOuvert(r) : setQualif(r));

  // Le mode d'emploi (étape 10). La carte d'accueil ne s'affiche qu'une fois ;
  // si le navigateur refuse le stockage, on ne la montre pas plutôt que de la
  // remontrer à chaque visite.
  const [guide, setGuide] = useState(false);
  /** « Me prévenir » (22/09) : les notifications de l'agenda, au choix de chaque coach. */
  const [notifs, setNotifs] = useState(false);
  const [guideVu, setGuideVu] = useState(() => {
    try {
      return localStorage.getItem(CLE_GUIDE) === "1";
    } catch {
      return true;
    }
  });
  const marquerGuideVu = () => {
    setGuideVu(true);
    try {
      localStorage.setItem(CLE_GUIDE, "1");
    } catch {
      /* navigation privée */
    }
  };
  const ouvrirGuide = () => {
    setGuide(true);
    marquerGuideVu();
  };

  const { coachs } = useCoachsDuClub(userId);
  const { users, currentUser } = useAppContext();

  const dAncre = jourDe(ancre);
  const lundi = useMemo(() => lundiDe(jourDe(ancre)), [ancre]);

  // ── Le club, jour par jour (étape 8) ──────────────────────────────────────
  const clubId = club?.id ?? null;
  const creneauBar = club?.settings?.open_hours || "7h-11h";
  // En base, régler le club est réservé à son propriétaire et aux admins.
  const peutRegler = Boolean(clubId && (club?.ownerUserId === userId || currentUser?.role === "admin"));
  /** Le jour dont la feuille « le club, ce jour-là » est ouverte. */
  const [jourClub, setJourClub] = useState<string | null>(null);
  /** Le jour dont on choisit qui ouvre. */
  const [affecter, setAffecter] = useState<string | null>(null);
  const [erreurClub, setErreurClub] = useState<string | null>(null);
  const [erreurAffecter, setErreurAffecter] = useState<string | null>(null);
  const [erreurRdv, setErreurRdv] = useState<string | null>(null);

  const shifts = useClubShifts(clubId, club?.settings?.open_hours, lundi);
  const quiOuvre = (cle: string): string | null => {
    const id = shifts.parJour.get(cle)?.userId;
    if (!id) return null;
    return coachs.find((c) => c.id === id)?.prenom ?? users.find((u) => u.id === id)?.name?.split(" ")[0] ?? "Quelqu'un";
  };
  const idsClub = useMemo(() => coachs.map((c) => c.id), [coachs]);
  const equipeClassee = useMemo(
    () => equipeParClub(equipeAffectable(users, currentUser?.id, idsClub), idsClub, currentUser?.id),
    [users, currentUser?.id, idsClub],
  );

  // Fermetures et heures du jour : on part de ce que porte le club, et on
  // garde à jour ici après chaque geste (même patron que « La semaine »).
  const decouverte = club?.settings?.discovery;
  const [joursFermes, setJoursFermes] = useState<string[]>(() => decouverte?.holidays ?? []);
  const [horairesParDate, setHorairesParDate] = useState<Record<string, Array<[string, string]>>>(() => decouverte?.hours_by_date ?? {});
  // Le club arrive en différé (`useBbcMode`) : sans ce recalage, l'écran
  // garderait les réglages vides du premier rendu.
  useEffect(() => {
    setJoursFermes(decouverte?.holidays ?? []);
    setHorairesParDate(decouverte?.hours_by_date ?? {});
  }, [clubId]);
  const reglages = useMemo(
    () => ({ hours: decouverte?.hours ?? null, hours_by_date: horairesParDate, holidays: joursFermes }),
    [decouverte?.hours, horairesParDate, joursFermes],
  );
  const horairesDe = useCallback((cle: string) => horairesDuJour(reglages, cle), [reglages]);

  const basculerFermeture = async (cle: string) => {
    if (!clubId) return;
    const ferme = joursFermes.includes(cle);
    setErreurClub(null);
    setJoursFermes((p) => (ferme ? p.filter((d) => d !== cle) : [...p, cle]));
    try {
      setJoursFermes(await setClubDayClosed(clubId, cle, !ferme));
    } catch {
      setJoursFermes((p) => (ferme ? [...p, cle] : p.filter((d) => d !== cle)));
      setErreurClub("Impossible d'enregistrer — vérifie ta connexion, puis réessaie.");
    }
  };
  const reglerPlage = async (cle: string, plage: [string, string] | null) => {
    if (!clubId) return;
    const avant = horairesParDate;
    setErreurClub(null);
    setHorairesParDate((p) => {
      const n = { ...p };
      if (plage) n[cle] = [plage];
      else delete n[cle];
      return n;
    });
    try {
      setHorairesParDate(await setClubDayHours(clubId, cle, plage));
    } catch {
      setHorairesParDate(avant);
      setErreurClub("Impossible d'enregistrer — vérifie ta connexion, puis réessaie.");
    }
  };

  // Les rituels de la semaine affichée, rangés par jour.
  const rituelsParJour = useMemo(() => {
    const m = new Map<string, RituelDuJour[]>();
    for (const r of getCallsForWeek(club?.settings ?? null, lundi)) {
      const k = cleJour(r.at);
      const l = m.get(k) ?? [];
      l.push({ key: r.key, label: r.label, at: r.at });
      m.set(k, l);
    }
    for (const l of m.values()) l.sort((a, b) => a.at.getTime() - b.at.getTime());
    return m;
  }, [club?.settings, lundi]);
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

      <div style={{ display: "flex", gap: 8 }}>
        <div role="tablist" aria-label="Vue" style={{ ...segments, flex: 1 }}>
          {(["jour", "semaine", "mois"] as Vue[]).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={vue === v} onClick={() => setVue(v)} style={{ ...segment, background: vue === v ? "var(--ls-bbc-s3)" : "transparent", color: vue === v ? "var(--ls-bbc-text)" : "var(--ls-bbc-muted)" }}>
              {v === "jour" ? "Jour" : v === "semaine" ? "Semaine" : "Mois"}
            </button>
          ))}
        </div>
        {/* Ses notifications à elle (22/09) : le choix est à la coach, la personne a toujours sa confirmation. */}
        <button type="button" onClick={() => setNotifs(true)} aria-label="Me prévenir : les notifications de l'agenda" title="Me prévenir" style={boutonGuide}>
          🔔
        </button>
        {/* Le mode d'emploi : toujours là, jamais imposé (étape 10). */}
        <button type="button" onClick={ouvrirGuide} aria-label="L'agenda, mode d'emploi" title="Mode d'emploi" style={boutonGuide}>
          ?
        </button>
      </div>

      {/* La première fois seulement : une carte DANS la page, pas un popup. */}
      {!guideVu ? (
        <div style={carteAccueil}>
          <span aria-hidden="true" style={{ fontSize: 22, flex: "none" }}>
            👋
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 14.5, fontWeight: 800 }}>Nouveau : l'agenda du club</span>
            <span style={{ display: "block", fontSize: 12.5, color: "var(--ls-bbc-muted)", marginTop: 2, lineHeight: 1.45 }}>Une minute pour voir comment caler, déplacer et noter un « pas dispo ».</span>
          </span>
          <button type="button" onClick={ouvrirGuide} style={boutonCarte}>
            Voir
          </button>
          <button type="button" onClick={marquerGuideVu} aria-label="Masquer" style={croixCarte}>
            ✕
          </button>
        </div>
      ) : null}

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
        <VueMois semaines={semaines} moisAffiche={dAncre.getMonth()} cleAuj={cleAuj} parJourMap={parJourMap} couleur={couleur} horairesDe={horairesDe} collantHaut={collantHaut} onJour={setJourOuvert} />
      ) : vue === "semaine" ? (
        <VueSemaine
          cles={semaineDe(lundi)}
          cleAuj={cleAuj}
          parJourMap={parJourMap}
          couleur={couleur}
          prenomCoach={prenomCoach}
          maintenant={maintenant}
          horairesDe={horairesDe}
          rituelsParJour={rituelsParJour}
          quiOuvre={quiOuvre}
          permanenceEnChargement={shifts.loading}
          collantHaut={collantHaut}
          onJour={(k) => {
            setAncre(k);
            setVue("jour");
          }}
          onClub={(k) => {
            setErreurClub(null);
            setJourClub(k);
          }}
          onRdv={ouvrirRdv}
        />
      ) : (
        <VueJour
          cle={ancre}
          estAuj={ancre === cleAuj}
          coachs={filtre === "tous" ? coachs : coachs.filter((c) => c.id === filtre)}
          rdvs={parJourMap.get(ancre) ?? []}
          horaires={horairesDe(ancre)}
          rituels={rituelsParJour.get(ancre) ?? []}
          quiOuvre={quiOuvre(ancre)}
          permanenceEnChargement={shifts.loading}
          collantHaut={collantHaut}
          couleur={couleur}
          onRdv={ouvrirRdv}
          onClub={() => {
            setErreurClub(null);
            setJourClub(ancre);
          }}
          onTrou={(coachId, heure) => setCaler({ jour: ancre, coach: coachId, heure })}
        />
      )}

      {/* ＋ : toujours au même endroit, au-dessus du pouce. */}
      <button type="button" onClick={() => setCaler({ jour: vue !== "mois" && ancre >= cleAuj ? ancre : cleAuj })} aria-label="Ajouter un rendez-vous ou un pas dispo" style={fabBas ? { ...fab, bottom: fabBas } : fab}>
        ＋
      </button>

      <div style={{ fontSize: 12, color: "var(--ls-bbc-hint)", lineHeight: 1.5 }}>
        {loading ? "Chargement…" : vue === "mois" ? `${sansIndispos(visibles).length} rendez-vous sur la période · touche un jour pour sa liste.` : vue === "semaine" ? "Touche un jour pour le voir coach par coach, ☕ pour le club ce jour-là." : "Une colonne par coach. Touche un trou pour caler, le ＋ pour un « pas dispo »."}
      </div>

      {/* ── La liste d'un jour (depuis le mois) ────────────────────────── */}
      {jourOuvert ? (
        <Feuille onClose={() => setJourOuvert(null)} titre={libelleJour(jourDe(jourOuvert))} sous={`${sansIndispos(parJourMap.get(jourOuvert) ?? []).length} rendez-vous · ${horairesDe(jourOuvert).etat === "ferme" ? "club fermé · " : ""}${filtre === "tous" ? "toute l'équipe" : prenomCoach(filtre)}`}>
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
        <Feuille onClose={() => { setRdvOuvert(null); setErreurRdv(null); }} titre={estIndispo(rdvOuvert) ? "Pas dispo" : nomComplet(rdvOuvert)} sous={`${libelleJour(new Date(rdvOuvert.debut))} · ${heureDe(rdvOuvert.debut)} – ${heureDe(rdvOuvert.fin)}`}>
          {estIndispo(rdvOuvert) ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 0 6px" }}>
              <Ligne couleur={couleur(rdvOuvert.coachId)}>
                {prenomCoach(rdvOuvert.coachId)} n'est pas disponible
                {rdvOuvert.nom ? <span style={{ color: "var(--ls-bbc-muted)" }}> · {rdvOuvert.nom}</span> : null}
              </Ligne>
              <div style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", lineHeight: 1.5 }}>
                Aucun créneau n'est proposé sur cette plage — ni dans « ＋ », ni sur le site du club.
              </div>
              {erreurRdv ? <div style={{ fontSize: 13, color: "var(--ls-bbc-coral)" }}>{erreurRdv}</div> : null}
              {new Date(rdvOuvert.fin).getTime() > maintenant ? (
                <button
                  type="button"
                  onClick={async () => {
                    const r = rdvOuvert;
                    setErreurRdv(null);
                    const res = await libererIndispo(r.id);
                    if (!res.ok) {
                      setErreurRdv(res.message);
                      return;
                    }
                    setRdvOuvert(null);
                    void refetch();
                  }}
                  style={boutonFantome}
                >
                  Libérer cette plage
                </button>
              ) : null}
            </div>
          ) : (
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
            {/* Les mêmes coordonnées que le CRM (22/09) : numéro, mail, et les quatre gestes. */}
            <div style={{ paddingTop: 4 }}>
              <ContactRdv rdv={rdvOuvert} />
            </div>
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
          )}
        </Feuille>
      ) : null}

      {guide ? <GuideAgendaSheet coachs={coachs} couleur={couleur} userId={userId} peutEnvoyer={peutRegler} onClose={() => setGuide(false)} /> : null}
      {notifs ? <NotifsAgendaSheet userId={userId} onClose={() => setNotifs(false)} /> : null}

      {/* ── Le club, ce jour-là : qui ouvre, heures, fermeture, rituels ─── */}
      {jourClub && !affecter ? (
        <JourDuClubSheet
          cle={jourClub}
          horaires={horairesDe(jourClub)}
          creneauBar={creneauBar}
          quiOuvre={quiOuvre(jourClub)}
          permanenceEnChargement={shifts.loading}
          rituels={rituelsParJour.get(jourClub) ?? []}
          peutRegler={peutRegler}
          erreur={erreurClub}
          onClose={() => setJourClub(null)}
          onChoisirQuiOuvre={() => {
            setErreurAffecter(null);
            setAffecter(jourClub);
          }}
          onBasculerFermeture={() => void basculerFermeture(jourClub)}
          onReglerPlage={(plage) => void reglerPlage(jourClub, plage)}
        />
      ) : null}

      {/* « Qui tient le bar ? » — LA feuille de « La semaine », pas une copie. */}
      {affecter ? (
        <FeuilleAffectation
          jour={jourDe(affecter)}
          creneauTexte={creneauBar}
          equipe={equipeClassee}
          actuelId={shifts.parJour.get(affecter)?.userId ?? null}
          erreur={erreurAffecter}
          onFermer={() => setAffecter(null)}
          onAffecter={async (id) => {
            setErreurAffecter(null);
            // On ne referme QUE si la base a dit oui (même règle que « La semaine »).
            if (await shifts.assign(jourDe(affecter), id)) setAffecter(null);
            else setErreurAffecter("Impossible d'affecter — vérifie ta connexion, puis réessaie.");
          }}
          onLiberer={async () => {
            setErreurAffecter(null);
            if (await shifts.clear(jourDe(affecter))) setAffecter(null);
            else setErreurAffecter("Impossible de libérer ce matin — réessaie.");
          }}
        />
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
              if (q.issue === "fait" && qualif.source !== "suivi") onSuiviClassique?.(qualif);
            }
            return res;
          }}
          onBilan={
            qualif.source === "suivi" && qualif.clientId
              ? () => {
                  const r = qualif;
                  setQualif(null);
                  // Fin de carte → le bilan des 10 ; sa pesée → sa fiche du club ; sinon son suivi, dans l'app standard.
                  if (/carte/i.test(r.nature)) setBilan10({ clientId: r.clientId!, nom: nomComplet(r) });
                  else if (/pes/i.test(r.nature) && onPesee) onPesee(r.clientId!);
                  else navigate(`/clients/${r.clientId}/follow-up/new`);
                }
              : null
          }
          onFiche={qualif.source === "suivi" && qualif.clientId ? () => navigate(`/clients/${qualif.clientId}`) : null}
          onDeplacer={
            // Toutes les sortes depuis le 22/09 — la réservation du site comprise :
            // avant, on ne pouvait que la recréer, et l'ancienne restait.
            qualif.source === "prospect" || qualif.source === "suivi" || qualif.source === "reservation"
              ? () => {
                  const r = qualif;
                  setQualif(null);
                  setCaler({ jour: cleJour(new Date(r.debut)), coach: r.coachId, deplace: r });
                }
              : null
          }
          onAnnuler={async () => {
            const r = qualif;
            const res = await annulerRdv(r);
            if (res.ok) {
              setQualif(null);
              void refetch();
              setToast("Rendez-vous annulé · personne n'a été prévenu");
              // La coach dont on a touché l'agenda le sait (selon SA cloche), comme pour un déplacement.
              if (r.coachId) {
                const moi = coachs.find((c) => c.id === userId);
                void prevenirCoach(
                  r.coachId,
                  userId,
                  "Rendez-vous annulé",
                  `${nomComplet(r)} · ${libelleJour(new Date(r.debut))} ${heureDe(r.debut)}` + (moi ? ` · par ${moi.prenom}` : ""),
                  prenomCoach(r.coachId),
                );
              }
            }
            return res;
          }}
        />
      ) : null}

      {membrePour ? (
        <BbcNewMemberSheet
          userId={userId}
          coachName={coachName}
          club={club}
          prefill={{ prenom: membrePour.prenom, nom: membrePour.nom ?? "", tel: contactDe(membrePour).tel, email: contactDe(membrePour).mail }}
          onClose={() => setMembrePour(null)}
          onCreated={(clientId) => {
            const r = membrePour;
            setMembrePour(null);
            if (r) void qualifierRdvClub(r, { issue: "membre", clientId }).then(() => refetch());
            onMembreCree?.(clientId, r?.prenom ?? "");
          }}
        />
      ) : null}

      {bilan10 && userId ? (
        <BbcBilan10 clientId={bilan10.clientId} clientName={bilan10.nom} coachUserId={userId} onClose={() => setBilan10(null)} onDone={() => void refetch()} />
      ) : null}

      {caler ? (
        <CalerRdvSheet
          userId={userId}
          coachs={coachs}
          couleur={couleur}
          reglages={reglages}
          jourInitial={caler.jour}
          coachInitial={caler.coach ?? null}
          heureInitiale={caler.heure ?? null}
          deplace={caler.deplace ?? null}
          onClose={() => setCaler(null)}
          onFait={(jour, _coach, info) => {
            setCaler(null);
            setAncre(jour);
            setVue("jour");
            void refetch();
            if (info) setToast(info);
          }}
        />
      ) : null}
      <Toast message={toast} />
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
  horairesDe,
  collantHaut,
  onJour,
}: {
  semaines: string[][];
  moisAffiche: number;
  cleAuj: string;
  parJourMap: Map<string, RdvClub[]>;
  couleur: (id: string | null) => string;
  horairesDe: (cle: string) => HorairesDuJour;
  collantHaut: string;
  onJour: (k: string) => void;
}) {
  return (
    <div>
      <div style={{ ...teteJours, top: collantHaut }}>
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
            // Dans une case de 50 px, la place va aux personnes : les « pas
            // dispo » se lisent dans la liste du jour et dans la vue Jour.
            const liste = sansIndispos(parJourMap.get(k) ?? []);
            const estAuj = k === cleAuj;
            const ferme = horairesDe(k).etat === "ferme";
            return (
              <button key={k} type="button" onClick={() => onJour(k)} style={{ ...caseJour, background: ferme ? "color-mix(in srgb, var(--ls-bbc-amber) 7%, transparent)" : "transparent" }}>
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
                {ferme ? <span style={{ ...pastille, background: "color-mix(in srgb, var(--ls-bbc-amber) 20%, transparent)", borderLeft: "3px solid var(--ls-bbc-amber)", color: "var(--ls-bbc-amber)" }}>fermé</span> : null}
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
  horairesDe,
  rituelsParJour,
  quiOuvre,
  permanenceEnChargement,
  collantHaut,
  onJour,
  onClub,
  onRdv,
}: {
  collantHaut: string;
  cles: string[];
  cleAuj: string;
  parJourMap: Map<string, RdvClub[]>;
  couleur: (id: string | null) => string;
  prenomCoach: (id: string | null) => string;
  maintenant: number;
  horairesDe: (cle: string) => HorairesDuJour;
  rituelsParJour: Map<string, RituelDuJour[]>;
  quiOuvre: (cle: string) => string | null;
  permanenceEnChargement: boolean;
  onJour: (k: string) => void;
  /** Ouvre « le club, ce jour-là ». */
  onClub: (k: string) => void;
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
        const nbRdv = sansIndispos(liste).length;
        const estAuj = k === cleAuj;
        const horaires = horairesDe(k);
        const ouvre = quiOuvre(k);
        // Personne n'ouvre un jour où le club reçoit : ça doit se voir. Un
        // dimanche ou un jour fermé, ce n'est pas une alerte.
        const aCouvrir = !permanenceEnChargement && !ouvre && horaires.etat === "ouvert" && k >= cleAuj;
        // Rendez-vous et rituels dans le même fil, à leur heure.
        const fil: Array<{ t: number; el: React.ReactNode }> = [
          ...liste.map((r) => ({
            t: new Date(r.debut).getTime(),
            el: <LigneRdv key={`${r.source}-${r.id}`} r={r} couleur={couleur(r.coachId)} coach={prenomCoach(r.coachId)} maintenant={maintenant} onClick={() => onRdv(r)} retrait />,
          })),
          ...(rituelsParJour.get(k) ?? []).map((rt) => ({
            t: rt.at.getTime(),
            el: (
              <div key={`rituel-${rt.key}-${rt.at.getTime()}`} style={ligneRituel}>
                <span style={{ flex: "none", width: 46, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 13.5, fontWeight: 700 }}>{fmtHeure(rt.at.getHours() + rt.at.getMinutes() / 60)}</span>
                <span style={{ flex: "none", width: 4, alignSelf: "stretch", borderRadius: 4, background: "var(--ls-bbc-violet)" }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{rt.label}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--ls-bbc-muted)", marginTop: 2 }}>rituel · toute l'équipe</span>
                </span>
              </div>
            ),
          })),
        ].sort((a, b) => a.t - b.t);
        return (
          <div key={k} ref={estAuj ? refAuj : undefined} style={{ borderTop: "1px solid var(--ls-bbc-line)", scrollMarginTop: `calc(8px + ${collantHaut})`, background: horaires.etat === "ferme" ? "color-mix(in srgb, var(--ls-bbc-amber) 5%, transparent)" : "transparent" }}>
            <div style={{ ...teteJourRangee, top: collantHaut }}>
              <button type="button" onClick={() => onJour(k)} style={teteJourListe}>
                <span style={{ ...numeroListe, background: estAuj ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s2)", color: estAuj ? "var(--ls-bbc-bg)" : "var(--ls-bbc-text)" }}>{d.getDate()}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 700, textTransform: "capitalize" }}>{libelleJour(d).split(" ")[0]}</span>
                  <span style={{ display: "block", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-hint)" }}>
                    {nbRdv ? `${nbRdv} rdv` : "rien de prévu"}
                  </span>
                </span>
              </button>
              {/* Le club ce jour-là : qui ouvre, ou « fermé ». Un bouton à part —
                  on ne met pas un bouton dans un bouton. */}
              <button type="button" onClick={() => onClub(k)} aria-label="Le club ce jour-là" style={{ ...puceClub, color: horaires.etat === "ferme" || aCouvrir ? "var(--ls-bbc-amber)" : "var(--ls-bbc-muted)" }}>
                {horaires.etat === "ferme" ? "fermé" : permanenceEnChargement ? "☕ …" : ouvre ? `☕ ${ouvre}` : aCouvrir ? "☕ à couvrir" : "☕ —"}
                <span aria-hidden="true" style={{ color: "var(--ls-bbc-hint)", fontSize: 16 }}>
                  ›
                </span>
              </button>
            </div>
            {fil.map((x) => x.el)}
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
  horaires,
  rituels,
  quiOuvre,
  permanenceEnChargement,
  collantHaut,
  couleur,
  onRdv,
  onClub,
  onTrou,
}: {
  collantHaut: string;
  cle: string;
  estAuj: boolean;
  coachs: CoachRattache[];
  rdvs: RdvClub[];
  /** Les heures de réservation de CE jour (exception, habituel, ou fermé). */
  horaires: HorairesDuJour;
  rituels: RituelDuJour[];
  quiOuvre: string | null;
  permanenceEnChargement: boolean;
  couleur: (id: string | null) => string;
  onRdv: (r: RdvClub) => void;
  /** Ouvre « le club, ce jour-là ». */
  onClub: () => void;
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

  const aCouvrir = !permanenceEnChargement && !quiOuvre && horaires.etat === "ouvert" && !passe;

  return (
    <div>
      {/* Le club ce jour-là, en une ligne : qui ouvre · les heures du site. */}
      <button type="button" onClick={onClub} style={{ ...bandeauClub, borderColor: horaires.etat === "ferme" || aCouvrir ? "var(--ls-bbc-amber)" : "var(--ls-bbc-line)" }}>
        <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          <span style={{ color: aCouvrir ? "var(--ls-bbc-amber)" : "var(--ls-bbc-text)" }}>☕ {permanenceEnChargement ? "…" : quiOuvre ? `${quiOuvre} ouvre` : aCouvrir ? "personne n'ouvre" : "—"}</span>
          <span style={{ color: "var(--ls-bbc-hint)" }}> · </span>
          <span style={{ color: horaires.etat === "ferme" ? "var(--ls-bbc-amber)" : "var(--ls-bbc-muted)" }}>
            {horaires.etat === "ferme" ? "réservations fermées" : horaires.etat === "repos" ? "pas de créneau sur le site" : horaires.plages.map((p) => `${fmtHeure(p.debut)}–${fmtHeure(p.fin)}`).join(" · ")}
          </span>
        </span>
        <span aria-hidden="true" style={{ flex: "none", color: "var(--ls-bbc-hint)", fontSize: 18 }}>
          ›
        </span>
      </button>

      <div style={{ display: "flex", position: "sticky", top: collantHaut, zIndex: 3, background: "var(--ls-bbc-bg)", borderBottom: "1px solid var(--ls-bbc-line)" }}>
        <div style={{ flex: "none", width: 38 }} />
        {colonnes.map((c) => {
          const n = sansIndispos(rdvs.filter((r) => r.coachId === c.id)).length;
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
          // Un « pas dispo » est un FOND, pas un bloc : rangé dans les couloirs,
          // il couperait en deux la largeur des rendez-vous qu'il recouvre.
          const indispos = miens.filter(estIndispo);
          const { items, nb } = couloirs(sansIndispos(miens));
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
              {/* Les heures où le site propose des créneaux CE jour-là — pas un
                  horaire théorique : l'exception du jour si elle existe. */}
              {horaires.plages.map((p, n) => {
                const d0 = Math.max(p.debut, H0);
                const f0 = Math.min(p.fin, H1);
                if (f0 <= d0) return null;
                return (
                  <div key={n} style={{ position: "absolute", left: 0, right: 0, top: (d0 - H0) * PX_PAR_HEURE, height: (f0 - d0) * PX_PAR_HEURE, background: "color-mix(in srgb, var(--ls-bbc-lime) 7%, transparent)", pointerEvents: "none" }}>
                    {i === 0 && n === 0 ? <span style={{ position: "absolute", left: 4, top: 3, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-lime-text)", letterSpacing: ".06em", textTransform: "uppercase" }}>club ouvert</span> : null}
                  </div>
                );
              })}
              {horaires.etat === "ferme" ? (
                <div style={{ position: "absolute", inset: 0, background: hachures("var(--ls-bbc-amber)", 12), pointerEvents: "none" }}>
                  {i === 0 ? <span style={{ position: "absolute", left: 4, top: 3, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-amber)", letterSpacing: ".06em", textTransform: "uppercase" }}>club fermé</span> : null}
                </div>
              ) : null}
              {/* Les rituels : toute l'équipe, donc sur toutes les colonnes. On
                  voit au travers et on touche au travers. */}
              {rituels.map((rt) => {
                const x = rt.at.getHours() + rt.at.getMinutes() / 60;
                if (x < H0 || x >= H1) return null;
                return (
                  <div key={`${rt.key}-${rt.at.getTime()}`} style={{ position: "absolute", left: 0, right: 0, top: (x - H0) * PX_PAR_HEURE, height: Math.min(1, H1 - x) * PX_PAR_HEURE, background: "color-mix(in srgb, var(--ls-bbc-violet) 16%, transparent)", borderTop: "2px solid var(--ls-bbc-violet)", pointerEvents: "none", overflow: "hidden" }}>
                    {i === 0 ? <span style={{ position: "absolute", left: 4, top: 3, right: 2, fontSize: 11, fontWeight: 700, color: "var(--ls-bbc-text)", whiteSpace: "nowrap" }}>{rt.label}</span> : null}
                  </div>
                );
              })}
              {indispos.map((rdv) => {
                const d0 = Math.max(heureDecimale(rdv.debut), H0);
                const f0 = Math.min(heureDecimale(rdv.debut) + (new Date(rdv.fin).getTime() - new Date(rdv.debut).getTime()) / 3_600_000, H1);
                if (f0 <= d0) return null;
                return (
                  <button
                    key={`indispo-${rdv.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRdv(rdv);
                    }}
                    title={nomComplet(rdv)}
                    style={{ ...bloc, left: 0, width: "100%", top: (d0 - H0) * PX_PAR_HEURE, height: (f0 - d0) * PX_PAR_HEURE, borderRadius: 0, background: `${hachures("var(--ls-bbc-muted)", 30)}, color-mix(in srgb, var(--ls-bbc-bg) 55%, transparent)`, color: "var(--ls-bbc-muted)" }}
                  >
                    <span style={{ display: "block", fontSize: 11.5, fontWeight: 700 }}>Pas dispo</span>
                    {rdv.nom ? <span style={{ display: "block", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{rdv.nom}</span> : null}
                  </button>
                );
              })}
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
          {estIndispo(r) ? nomComplet(r) : `${libelleNature(r)} · ${nomComplet(r)}`}
        </span>
        <span style={{ display: "block", fontSize: 11.5, color: urgent ? "var(--ls-bbc-coral)" : "var(--ls-bbc-muted)", marginTop: 2 }}>
          {estIndispo(r) ? `${coach} · jusqu'à ${heureDe(r.fin)}` : `avec ${coach}`}
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
const boutonGuide: CSSProperties = {
  flex: "none", width: 48, minHeight: 48, borderRadius: 14, border: "1px solid var(--ls-bbc-line)", background: "var(--ls-bbc-s1)",
  color: "var(--ls-bbc-muted)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 17, fontWeight: 800, cursor: "pointer",
};
const carteAccueil: CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, padding: "12px 12px 12px 14px", borderRadius: 16, border: "1px solid var(--ls-bbc-lime)",
  background: "color-mix(in srgb, var(--ls-bbc-lime) 8%, var(--ls-bbc-s1))",
};
const boutonCarte: CSSProperties = {
  flex: "none", minHeight: 44, padding: "0 16px", borderRadius: 12, border: 0, background: "var(--ls-bbc-lime)", color: "var(--ls-bbc-lime-ink)",
  fontFamily: "var(--ls-bbc-font-body)", fontSize: 13.5, fontWeight: 800, cursor: "pointer",
};
const croixCarte: CSSProperties = {
  flex: "none", width: 44, minHeight: 44, borderRadius: 12, border: 0, background: "transparent", color: "var(--ls-bbc-hint)", fontSize: 15, cursor: "pointer",
};
/** La tête d'un jour reste collée en haut pendant qu'on fait défiler ses rendez-vous. */
const teteJourRangee: CSSProperties = { position: "sticky", top: 0, zIndex: 2, display: "flex", alignItems: "stretch", background: "var(--ls-bbc-bg)" };
const teteJourListe: CSSProperties = {
  flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, minHeight: 50, padding: "6px 0",
  border: 0, background: "transparent", color: "var(--ls-bbc-text)", textAlign: "left", fontFamily: "var(--ls-bbc-font-body)", cursor: "pointer",
};
/** « ☕ Thomas › » — le club ce jour-là, à droite de la tête du jour. */
const puceClub: CSSProperties = {
  flex: "none", display: "flex", alignItems: "center", gap: 6, minHeight: 50, maxWidth: "46%", padding: "0 2px 0 10px", border: 0, background: "transparent",
  fontFamily: "var(--ls-bbc-font-mono)", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: "pointer",
};
/** Un rituel dans la liste : même gabarit qu'un rendez-vous, mais il ne s'ouvre pas. */
const ligneRituel: CSSProperties = {
  display: "flex", alignItems: "center", gap: 12, minHeight: 52, padding: "8px 0 8px 46px", borderBottom: "1px solid var(--ls-bbc-line)",
  color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)",
};
/** Le bandeau « le club ce jour-là » de la vue Jour. */
const bandeauClub: CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, width: "100%", minHeight: 44, padding: "0 12px", marginBottom: 8, borderRadius: 12,
  border: "1px solid var(--ls-bbc-line)", background: "var(--ls-bbc-s1)", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)",
  fontSize: 13, fontWeight: 600, textAlign: "left", cursor: "pointer",
};
/** Hachures : ambre = club fermé, gris = « pas dispo ». */
function hachures(couleur: string, force: number): string {
  return `repeating-linear-gradient(135deg, color-mix(in srgb, ${couleur} ${force}%, transparent) 0 6px, transparent 6px 12px)`;
}
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
