// =============================================================================
// Caler (ou déplacer) un rendez-vous — deux écrans, pas plus.
//
// MAQUETTE VALIDÉE PAR THOMAS le 17/09/2026.
//   1 · QUAND ET AVEC QUI — le type (bilan 1 h, suivi 30 min), « ⚡ au plus
//       tôt » (le premier trou de toute l'équipe : la réponse à « vous êtes
//       dispo quand ? » au téléphone), la bande des 7 prochains jours, puis
//       LES CRÉNEAUX LIBRES DE CHAQUE COACH, côte à côte. Un créneau pris n'est
//       jamais proposé. Six par coach, puis « +N ».
//   2 · POUR QUI — on cherche dans le CRM par nom ou téléphone : la personne
//       est reprise avec son téléphone et son email, et le rendez-vous apparaît
//       sur sa fiche (c'était le trou de Nathalie Duhayon, 14/09). Sinon
//       « nouvelle personne ». « Pas d'email = pas de rappel la veille », dit
//       au moment où l'on peut encore le demander.
//
// Toucher un trou dans la vue Jour saute l'écran 1. Le créneau est REVÉRIFIÉ à
// l'enregistrement par la fonction en base : s'il vient d'être pris, retour à
// l'écran 1 avec la raison, jamais un doublon.
// =============================================================================

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { getSupabaseClient } from "../../../services/supabaseClient";
import type { CoachRattache } from "../useCoachsDuClub";
import { useAgendaDuClub } from "./useAgendaDuClub";
import { useCreneauxOccupes } from "./useCreneauxOccupes";
import { calerRdv, prevenirCoach } from "./calerRdv";
import { poserIndispo } from "./indispos";
import {
  QUAND_INDISPO,
  plageIndispo,
  rdvSurLaPlage,
  type QuandIndispo,
  auPlusTot,
  cleJour,
  creneauxDuJour,
  decalerJour,
  fmtHeure,
  heureDe,
  jourDe,
  libelleJour,
  libelleJourCourt,
  nomComplet,
  horairesDuJour,
  type Plage,
  type RdvClub,
  type ReglagesHoraires,
} from "./agendaClub";

type Etape = "quand" | "qui";
// « indispo » (18/09) n'est pas un rendez-vous : le même ＋, mais un seul écran —
// quel jour, pour qui, matin / après-midi / journée. Sur TimeTree c'était une
// ligne « Romane absente » ; ici elle retire en plus les créneaux proposés.
type TypeRdv = "bilan" | "suivi" | "autre" | "indispo";
const TYPES: Record<TypeRdv, { nom: string; duree: number }> = {
  bilan: { nom: "Bilan découverte", duree: 60 },
  suivi: { nom: "Suivi", duree: 30 },
  autre: { nom: "Autre", duree: 60 },
  indispo: { nom: "Pas dispo", duree: 60 },
};
const CRENEAUX_VISIBLES = 6;

interface Personne {
  prenom: string;
  nom: string;
  telephone: string;
  email: string;
  /** « lead · pub Meta » — d'où on la connaît. */
  origine: string;
}

interface Props {
  userId?: string | null;
  coachs: CoachRattache[];
  couleur: (id: string | null) => string;
  jourInitial: string;
  coachInitial?: string | null;
  /** Heure décimale — quand on a touché un trou dans la vue Jour. */
  heureInitiale?: number | null;
  /** Le rendez-vous qu'on déplace (table `prospects` seulement). */
  deplace?: RdvClub | null;
  /** Les horaires du club (`settings.discovery`) : jours de repos, fermetures,
   *  plages du jour. Sans eux, on retombe sur 8 h–18 h tous les jours. */
  reglages?: ReglagesHoraires | null;
  onClose: () => void;
  onFait: (jour: string, coachId: string) => void;
}

export function CalerRdvSheet({ userId, coachs, couleur, jourInitial, coachInitial, heureInitiale, deplace, reglages, onClose, onFait }: Props) {
  const aujourdhui = cleJour(new Date());
  const [etape, setEtape] = useState<Etape>(heureInitiale != null && coachInitial ? "qui" : "quand");
  const [type, setType] = useState<TypeRdv>(() => {
    if (!deplace) return "bilan";
    const min = Math.round((new Date(deplace.fin).getTime() - new Date(deplace.debut).getTime()) / 60_000);
    return min === 30 ? "suivi" : "bilan";
  });
  // Ouvert sur AUJOURD'HUI alors que la journée est finie (plus une seule heure
  // proposable POUR LE TYPE PAR DÉFAUT — un bilan d'1 h —, même agenda vide) :
  // on arrive sur demain. Vu sur la prod à
  // 17 h 20 — quatre coachs, quatre « complet », et il fallait deviner qu'il
  // suffisait de toucher le jour suivant.
  const [jour, setJour] = useState(() =>
    heureInitiale == null && !deplace && jourInitial === aujourdhui && creneauxDuJour([], aujourdhui, TYPES.bilan.duree, Date.now(), reglages).length === 0
      ? decalerJour(jourInitial, 1)
      : jourInitial,
  );
  const [coach, setCoach] = useState<string | null>(coachInitial ?? null);
  const [heure, setHeure] = useState<number | null>(heureInitiale ?? null);
  const [tout, setTout] = useState<Set<string>>(new Set());
  const [personne, setPersonne] = useState<Personne | null>(
    deplace ? { prenom: deplace.prenom, nom: deplace.nom ?? "", telephone: deplace.telephone ?? "", email: "", origine: "déjà dans l'agenda" } : null,
  );
  const [nouveau, setNouveau] = useState(false);
  const [np, setNp] = useState({ prenom: "", nom: "", telephone: "", email: "" });
  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState<Personne[]>([]);
  const [note, setNote] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  // « Pas dispo » : pour qui (soi d'abord — c'est le cas de tous les jours) et quand.
  const [coachIndispo, setCoachIndispo] = useState<string | null>(
    () => coachInitial ?? (coachs.some((c) => c.id === userId) ? (userId ?? null) : (coachs[0]?.id ?? null)),
  );
  const [quandIndispo, setQuandIndispo] = useState<QuandIndispo | null>(null);
  const [noteIndispo, setNoteIndispo] = useState("");
  const maintenant = Date.now();
  const duree = TYPES[type].duree;
  /** Le club ferme le dimanche et à 15 h en semaine : on ne propose que ses
   *  heures. Ce bouton rouvre 8 h–18 h pour les suivis du soir — proposer le
   *  normal, n'interdire rien (Thomas, 18/09). */
  const [horsHoraires, setHorsHoraires] = useState(false);
  const libresDe = (occupes: readonly Plage[], cle: string) => creneauxDuJour(occupes, cle, duree, maintenant, reglages, horsHoraires);

  // Sept jours à la fois, mais la bande peut avancer de semaine en semaine
  // (urgence du 18/09 : Sandrine Miltgen au 7 octobre était hors des 7 jours
  // fixes — aucun moyen d'y aller). `decalage` est un multiple de 7, jamais
  // négatif : on ne recule pas avant aujourd'hui.
  // Ouverte depuis l'agenda posé sur une autre semaine (« caler le 7 octobre »),
  // la bande doit commencer LÀ — sinon elle propose les 7 prochains jours et on
  // croit que la date demandée est interdite (vu le 18/09).
  const [decalage, setDecalage] = useState(() =>
    Math.max(0, Math.round((jourDe(jourInitial).getTime() - jourDe(aujourdhui).getTime()) / 86_400_000)),
  );
  const semaine = useMemo(() => Array.from({ length: 7 }, (_, i) => decalerJour(aujourdhui, decalage + i)), [aujourdhui, decalage]);
  const fenetre = useMemo(() => ({ du: jourDe(decalerJour(aujourdhui, decalage)), au: jourDe(decalerJour(aujourdhui, decalage + 7)) }), [aujourdhui, decalage]);
  const { rdvs: rdvsSemaine } = useAgendaDuClub(fenetre.du, fenetre.au, userId);
  const idsCoachs = useMemo(() => coachs.map((c) => c.id), [coachs]);
  // Le jour choisi : la vraie occupation (rituels compris), lue en base.
  const { occupes: occupesExacts, loading: chargeOccupes } = useCreneauxOccupes(idsCoachs, jour, userId);

  /** Les plages occupées de la semaine, par coach, depuis l'agenda (approché :
   *  sans les rituels). Sert aux compteurs de la bande et à « au plus tôt » ;
   *  le jour choisi passe par `creneaux_occupes`, et le serveur revérifie. */
  const occupesSemaine = useMemo(() => {
    const m = new Map<string, Plage[]>();
    for (const id of idsCoachs) m.set(id, []);
    for (const r of rdvsSemaine) {
      if (!r.coachId || !m.has(r.coachId)) continue;
      // Un rendez-vous qu'on déplace ne bloque pas son propre nouveau créneau.
      if (deplace && r.source === deplace.source && r.id === deplace.id) continue;
      m.get(r.coachId)!.push({ debut: new Date(r.debut).getTime(), fin: new Date(r.fin).getTime() });
    }
    return m;
  }, [rdvsSemaine, idsCoachs, deplace]);

  const occupesDe = (coachId: string): Plage[] => {
    const exact = occupesExacts.get(coachId);
    const base = exact && !chargeOccupes ? exact : (occupesSemaine.get(coachId) ?? []);
    if (!deplace || deplace.coachId !== coachId) return base;
    // En déplacement, l'ancien créneau ne compte pas — comme en base.
    const d0 = new Date(deplace.debut).getTime();
    return base.filter((p) => p.debut !== d0);
  };

  const plusTot = useMemo(() => auPlusTot(occupesSemaine, semaine, duree, maintenant, reglages, horsHoraires), [occupesSemaine, semaine, duree, maintenant, reglages, horsHoraires]);
  const moi = coachs.find((c) => c.id === userId);

  // ── CRM : chercher quelqu'un ──
  const derniereRecherche = useRef(0);
  useEffect(() => {
    if (etape !== "qui" || personne || nouveau) return;
    const n = ++derniereRecherche.current;
    const q = recherche.trim();
    const t = setTimeout(async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        let req = sb.from("prospect_leads").select("first_name, last_name, phone, email, source, created_at").order("created_at", { ascending: false }).limit(6);
        if (q) {
          const chiffres = q.replace(/\D/g, "");
          const clauses = [`first_name.ilike.%${q}%`, `last_name.ilike.%${q}%`];
          if (chiffres.length >= 3) clauses.push(`phone.ilike.%${chiffres.slice(-Math.min(9, chiffres.length))}%`);
          req = req.or(clauses.join(","));
        }
        const { data } = await req;
        if (n !== derniereRecherche.current || !Array.isArray(data)) return;
        setResultats(
          (data as Array<Record<string, unknown>>).map((l) => ({
            prenom: String(l.first_name ?? "").trim(),
            nom: String(l.last_name ?? "").trim(),
            telephone: String(l.phone ?? "").trim(),
            email: String(l.email ?? "").trim(),
            origine: `lead · ${String(l.source ?? "") || "site"}`,
          })),
        );
      } catch {
        /* silent-fail */
      }
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [recherche, etape, personne, nouveau]);

  const pret = Boolean(coach && heure != null && (personne || (nouveau && np.prenom.trim().length > 1 && np.telephone.replace(/\D/g, "").length >= 9)));

  async function enregistrer() {
    if (!pret || envoi || !coach || heure == null) return;
    setEnvoi(true);
    setErreur(null);
    const d = jourDe(jour);
    const debut = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(heure), Math.round((heure % 1) * 60));
    const qui: Personne = personne ?? { ...np, origine: "" };
    const res = await calerRdv({
      coachId: coach,
      debut: debut.toISOString(),
      dureeMin: duree,
      prenom: qui.prenom,
      nom: qui.nom || null,
      telephone: qui.telephone || null,
      email: qui.email || null,
      note: note.trim() || null,
      rdvId: deplace?.source === "prospect" ? deplace.id : null,
    });
    setEnvoi(false);
    if (!res.ok) {
      setErreur(res.message);
      if (res.raison === "creneau_pris") {
        setHeure(null);
        setEtape("quand");
      }
      return;
    }
    void prevenirCoach(
      coach,
      userId,
      deplace ? "Rendez-vous déplacé" : "Nouveau rendez-vous",
      `${qui.prenom} ${qui.nom}`.trim() + ` · ${libelleJourCourt(d)} ${fmtHeure(heure)}` + (moi ? ` · par ${moi.prenom}` : ""),
    );
    onFait(jour, coach);
  }

  // ── « Pas dispo » ──
  const cibleIndispo = coachIndispo ?? coachs[0]?.id ?? null;
  const plageChoisie = quandIndispo ? plageIndispo(jour, quandIndispo) : null;
  // Des rendez-vous déjà calés là ? On le DIT — on ne bloque pas : c'est elle
  // qui sait si elle les déplace. (Lecture sur les 7 jours de la bande.)
  const dejaCales = plageChoisie && cibleIndispo ? rdvSurLaPlage(rdvsSemaine, cibleIndispo, plageChoisie.debut, plageChoisie.fin) : 0;
  const pretIndispo = Boolean(cibleIndispo && plageChoisie && plageChoisie.fin.getTime() > maintenant);

  async function enregistrerIndispo() {
    if (!pretIndispo || envoi || !cibleIndispo || !plageChoisie || !quandIndispo) return;
    setEnvoi(true);
    setErreur(null);
    const res = await poserIndispo({ coachId: cibleIndispo, debut: plageChoisie.debut, fin: plageChoisie.fin, note: noteIndispo });
    setEnvoi(false);
    if (!res.ok) {
      setErreur(res.message);
      return;
    }
    void prevenirCoach(
      cibleIndispo,
      userId,
      "Pas dispo noté dans l'agenda",
      `${libelleJourCourt(jourDe(jour))} · ${QUAND_INDISPO[quandIndispo].nom.toLowerCase()}` + (moi ? ` · par ${moi.prenom}` : ""),
    );
    onFait(jour, cibleIndispo);
  }

  const dJour = jourDe(jour);
  const finHeure = heure != null ? heure + duree / 60 : null;
  /** Ce que le club fait du jour choisi — dit en clair sous les créneaux. */
  const horairesJour = horairesDuJour(reglages, jour);
  const texteHoraires = horairesJour.plages.length
    ? horairesJour.plages.map((p) => `de ${fmtHeure(p.debut)} à ${fmtHeure(p.fin)}`).join(" et ")
    : "aux heures du club";

  return (
    <div style={voile} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bbc-mode" style={panneau}>
        <div style={{ width: 40, height: 5, borderRadius: 9, background: "var(--ls-bbc-line2)", margin: "10px auto 4px", flex: "none" }} />
        <div style={entete}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={titre}>{etape === "quand" ? (deplace ? "Déplacer le rendez-vous" : type === "indispo" ? "Pas dispo" : "Nouveau rendez-vous") : deplace ? "On le déplace ?" : "Pour qui ?"}</div>
            <div style={sousTitre}>{etape === "quand" ? (type === "indispo" ? "personne ne calera rien sur cette plage" : "étape 1 sur 2 · quand et avec qui") : "étape 2 sur 2"}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" style={croix}>
            ✕
          </button>
        </div>

        {etape === "quand" ? (
          <>
          <div style={corps}>
            {erreur ? <div style={alerte("coral")}>{erreur}</div> : null}

            {!deplace ? (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(Object.keys(TYPES) as TypeRdv[]).map((t) => (
                  <button key={t} type="button" onClick={() => { setType(t); setErreur(null); }} style={{ ...puce, background: type === t ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s2)", borderColor: type === t ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line)", color: type === t ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-muted)" }}>
                    {t === "indispo" ? "🚫 Pas dispo" : `${TYPES[t].nom} · ${TYPES[t].duree === 30 ? "30 min" : "1 h"}`}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--ls-bbc-muted)" }}>
                {nomComplet(deplace)} · {libelleJour(new Date(deplace.debut))} {heureDe(deplace.debut)} → choisis le nouveau créneau.
              </div>
            )}

            {plusTot && type !== "indispo" && decalage === 0 ? (
              <button
                type="button"
                onClick={() => {
                  setJour(plusTot.jour);
                  setCoach(plusTot.coachId);
                  setHeure(plusTot.heure);
                  setEtape("qui");
                }}
                style={boutonPlusTot}
              >
                <span aria-hidden="true" style={{ fontSize: 20 }}>
                  ⚡
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>
                    Au plus tôt : {coachs.find((c) => c.id === plusTot.coachId)?.prenom ?? "—"} · {plusTot.jour === aujourdhui ? "aujourd'hui" : libelleJourCourt(jourDe(plusTot.jour))} à {fmtHeure(plusTot.heure)}
                  </span>
                  <span style={{ display: "block", fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 2 }}>Le premier créneau libre de toute l'équipe</span>
                </span>
                <span aria-hidden="true" style={{ color: "var(--ls-bbc-lime-text)", fontSize: 18 }}>
                  ›
                </span>
              </button>
            ) : null}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={etiquette}>quel jour ?</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button type="button" disabled={decalage <= 0} onClick={() => { setDecalage((d) => Math.max(0, d - 7)); setHeure(null); }} aria-label="Semaine précédente" style={{ ...navSemaine, opacity: decalage <= 0 ? 0.35 : 1, cursor: decalage <= 0 ? "default" : "pointer" }}>
                  ‹
                </button>
                <button type="button" onClick={() => { setDecalage((d) => d + 7); setHeure(null); }} aria-label="Semaine suivante" style={navSemaine}>
                  ›
                </button>
                {/* Illimité, en un geste — urgence du 18/09 : cliquer 8 fois pour dans
                    2 mois n'a pas de sens. Le calendrier natif accepte n'importe quelle
                    date à venir ; `min`/`value` sont déjà au format YYYY-MM-DD de `jour`. */}
                <input
                  type="date"
                  aria-label="Aller directement à une date"
                  min={aujourdhui}
                  value={jour}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    const diff = Math.round((jourDe(v).getTime() - jourDe(aujourdhui).getTime()) / 86_400_000);
                    setDecalage(Math.max(0, diff));
                    setJour(v);
                    setHeure(null);
                  }}
                  style={dateJump}
                />
              </div>
            </div>
            <div style={bande}>
              {semaine.map((k) => {
                const d = jourDe(k);
                const etat = horsHoraires ? "ouvert" : horairesDuJour(reglages, k).etat;
                let libres = 0;
                for (const id of idsCoachs) if (libresDe(occupesSemaine.get(id) ?? [], k).length) libres += 1;
                const on = k === jour;
                return (
                  <button key={k} type="button" onClick={() => { setJour(k); setHeure(null); }} style={{ ...jb, background: on ? "var(--ls-bbc-text)" : "var(--ls-bbc-s2)", borderColor: on ? "var(--ls-bbc-text)" : "var(--ls-bbc-line)", color: on ? "var(--ls-bbc-bg)" : "var(--ls-bbc-text)" }}>
                    <span style={{ display: "block", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, opacity: 0.75 }}>{k === aujourdhui ? "auj." : libelleJourCourt(d).split(" ")[0]}</span>
                    <span style={{ display: "block", fontSize: 17, fontWeight: 800, marginTop: 2 }}>{d.getDate()}</span>
                    {type !== "indispo" ? (
                      <span style={{ display: "block", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: on ? "var(--ls-bbc-bg)" : etat === "ouvert" ? "var(--ls-bbc-lime-text)" : "var(--ls-bbc-hint)", marginTop: 2 }}>
                        {etat === "ferme" ? "fermé" : etat === "repos" ? "repos" : `${libres} coach${libres > 1 ? "s" : ""}`}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {type === "indispo" ? (
              <>
                <div style={etiquette}>pour qui ?</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {coachs.map((c) => {
                    const on = c.id === cibleIndispo;
                    return (
                      <button key={c.id} type="button" onClick={() => setCoachIndispo(c.id)} aria-pressed={on} style={{ ...puce, display: "flex", alignItems: "center", gap: 7, background: on ? "var(--ls-bbc-s3)" : "var(--ls-bbc-s2)", borderColor: on ? couleur(c.id) : "var(--ls-bbc-line)", color: on ? "var(--ls-bbc-text)" : "var(--ls-bbc-muted)" }}>
                        <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 999, background: couleur(c.id), flex: "none" }} />
                        {c.id === userId ? "Moi" : c.prenom}
                      </button>
                    );
                  })}
                </div>

                <div style={etiquette}>quand ?</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(Object.keys(QUAND_INDISPO) as QuandIndispo[]).map((q) => {
                    const on = quandIndispo === q;
                    const passee = plageIndispo(jour, q).fin.getTime() <= maintenant;
                    return (
                      <button key={q} type="button" disabled={passee} onClick={() => setQuandIndispo(q)} aria-pressed={on} style={{ ...choixIndispo, borderColor: on ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line)", background: on ? "color-mix(in srgb, var(--ls-bbc-lime) 12%, var(--ls-bbc-s2))" : "var(--ls-bbc-s2)", opacity: passee ? 0.4 : 1 }}>
                        <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{QUAND_INDISPO[q].nom}</span>
                        <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 12.5, color: "var(--ls-bbc-muted)" }}>
                          {fmtHeure(QUAND_INDISPO[q].debut)} – {fmtHeure(QUAND_INDISPO[q].fin)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {dejaCales > 0 ? (
                  <div style={alerte("amber")}>
                    {dejaCales} rendez-vous {dejaCales > 1 ? "sont déjà calés" : "est déjà calé"} sur cette plage. Ils restent en place — pense à les déplacer.
                  </div>
                ) : null}

                <div style={champ}>
                  <label htmlFor="note-indispo" style={etiquette}>
                    pourquoi · facultatif
                  </label>
                  <input id="note-indispo" value={noteIndispo} maxLength={60} placeholder="Ex. médecin, formation" onChange={(e) => setNoteIndispo(e.target.value)} style={saisie} />
                </div>
                <div style={{ fontSize: 12, color: "var(--ls-bbc-hint)", lineHeight: 1.45 }}>
                  Toute l'équipe le voit dans l'agenda. Plus aucun créneau n'est proposé sur cette plage — ni ici, ni sur le site du club.
                </div>
              </>
            ) : (
              <>
            {!horsHoraires && horairesJour.etat !== "ouvert" ? (
              <div style={alerte("amber")}>
                {horairesJour.etat === "ferme" ? "Le club est fermé ce jour-là" : "Le club ne reçoit pas ce jour-là"} : aucun créneau n'est proposé.
                Tu peux quand même caler quelque chose avec « hors horaires », plus bas.
              </div>
            ) : null}
            <div style={etiquette}>avec qui ?</div>
            {[...coachs]
              .sort((a, b) => Number(b.id === coachInitial) - Number(a.id === coachInitial))
              .map((c) => {
                const l = libresDe(occupesDe(c.id), jour);
                const ouvert = tout.has(c.id);
                const montre = ouvert ? l : l.slice(0, CRENEAUX_VISIBLES);
                return (
                  <div key={c.id} style={{ padding: "12px 0 10px", borderBottom: "1px solid var(--ls-bbc-line)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700 }}>
                      <span aria-hidden="true" style={{ width: 11, height: 11, borderRadius: 999, background: couleur(c.id), flex: "none" }} />
                      {c.prenom}
                      <span style={{ marginLeft: "auto", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, color: "var(--ls-bbc-hint)" }}>
                        {chargeOccupes ? "…" : l.length ? `${l.length} créneau${l.length > 1 ? "x" : ""}` : "complet"}
                      </span>
                    </div>
                    {l.length ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
                        {montre.map((x) => (
                          <button key={x} type="button" onClick={() => { setCoach(c.id); setHeure(x); setErreur(null); setEtape("qui"); }} style={{ ...creneau, borderColor: couleur(c.id), color: couleur(c.id) }}>
                            {fmtHeure(x)}
                          </button>
                        ))}
                        {!ouvert && l.length > CRENEAUX_VISIBLES ? (
                          <button type="button" onClick={() => setTout((s) => new Set(s).add(c.id))} style={{ ...creneau, borderColor: "var(--ls-bbc-line2)", color: "var(--ls-bbc-muted)" }}>
                            +{l.length - CRENEAUX_VISIBLES}
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)", marginTop: 6 }}>Plus rien de libre ce jour-là.</div>
                    )}
                  </div>
                );
              })}
            <div style={{ fontSize: 12, color: "var(--ls-bbc-hint)", lineHeight: 1.45, padding: "10px 0 4px" }}>
              {horsHoraires
                ? "Hors horaires : 8 h – 18 h, même les jours de fermeture. Les créneaux déjà pris restent exclus, et tout est revérifié à l'enregistrement."
                : `Seuls les créneaux libres sont proposés, ${texteHoraires}. Ils sont revérifiés à l'enregistrement.`}
            </div>
            <button type="button" onClick={() => { setHorsHoraires((v) => !v); setHeure(null); }} style={lienBas}>
              {horsHoraires ? "Revenir aux horaires du club" : "Proposer aussi hors horaires (8 h – 18 h)"}
            </button>
              </>
            )}
          </div>
          {type === "indispo" ? (
            <div style={pied}>
              <button type="button" onClick={() => void enregistrerIndispo()} disabled={!pretIndispo || envoi} style={{ ...boutonLime, background: pretIndispo && !envoi ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s3)", color: pretIndispo && !envoi ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-hint)" }}>
                {envoi ? "Enregistrement…" : "Bloquer cette plage"}
              </button>
              <div style={{ fontSize: 12, color: "var(--ls-bbc-hint)", textAlign: "center", lineHeight: 1.45 }}>
                {cibleIndispo && cibleIndispo !== userId ? `${coachs.find((c) => c.id === cibleIndispo)?.prenom ?? "La coach"} sera prévenue.` : "Tu pourras la libérer en la touchant dans l'agenda."}
              </div>
            </div>
          ) : null}
          </>
        ) : (
          <>
            <div style={corps}>
              <div style={recap}>
                <span style={{ width: 4, borderRadius: 4, background: couleur(coach), flex: "none" }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14.5, fontWeight: 700 }}>
                    {libelleJour(dJour)} · {heure != null ? fmtHeure(heure) : "—"} – {finHeure != null ? fmtHeure(finHeure) : "—"}
                  </span>
                  <span style={{ display: "block", fontSize: 12.5, color: "var(--ls-bbc-muted)", marginTop: 2 }}>
                    avec {coachs.find((c) => c.id === coach)?.prenom ?? "—"} · {TYPES[type].nom}
                  </span>
                </span>
                <button type="button" onClick={() => setEtape("quand")} style={lien}>
                  Changer
                </button>
              </div>

              {personne ? (
                <div>
                  <div style={etiquette}>la personne</div>
                  <div style={bloc}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <b style={{ flex: 1, minWidth: 0, fontSize: 15 }}>{`${personne.prenom} ${personne.nom}`.trim()}</b>
                      {!deplace ? (
                        <button type="button" onClick={() => setPersonne(null)} style={lien}>
                          Changer
                        </button>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", marginTop: 3 }}>{[personne.origine, personne.telephone].filter(Boolean).join(" · ")}</div>
                    {!deplace ? (
                      <div style={{ fontSize: 12.5, color: personne.email ? "var(--ls-bbc-muted)" : "var(--ls-bbc-amber)", marginTop: 3 }}>
                        {personne.email || "⚠️ pas d'email : pas de rappel la veille"}
                      </div>
                    ) : null}
                    <div style={{ fontSize: 12.5, color: "var(--ls-bbc-lime-text)", marginTop: 8 }}>{deplace ? "✓ l'ancien créneau sera libéré" : "✓ le rendez-vous apparaîtra sur sa fiche du CRM"}</div>
                  </div>
                </div>
              ) : nouveau ? (
                <div>
                  <div style={etiquette}>nouvelle personne</div>
                  <Champ id="np-prenom" label="Prénom" valeur={np.prenom} onChange={(v) => setNp((s) => ({ ...s, prenom: v }))} auto />
                  <Champ id="np-nom" label="Nom" valeur={np.nom} onChange={(v) => setNp((s) => ({ ...s, nom: v }))} />
                  <Champ id="np-tel" label="Téléphone" valeur={np.telephone} onChange={(v) => setNp((s) => ({ ...s, telephone: v }))} type="tel" />
                  <Champ id="np-email" label="Email · pour le rappel de la veille" valeur={np.email} onChange={(v) => setNp((s) => ({ ...s, email: v }))} type="email" />
                  <button type="button" onClick={() => setNouveau(false)} style={{ ...lien, marginTop: 8 }}>
                    ← Chercher plutôt dans le CRM
                  </button>
                </div>
              ) : (
                <div>
                  <div style={champ}>
                    <label htmlFor="recherche-crm" style={etiquette}>
                      chercher dans le crm
                    </label>
                    <input id="recherche-crm" type="search" value={recherche} placeholder="Nom ou téléphone" autoComplete="off" onChange={(e) => setRecherche(e.target.value)} style={saisie} />
                  </div>
                  <div style={{ ...etiquette, marginTop: 10 }}>{recherche.trim() ? `${resultats.length} trouvée${resultats.length > 1 ? "s" : ""}` : "récentes"}</div>
                  {resultats.map((p, i) => (
                    <button key={`${p.telephone}-${i}`} type="button" onClick={() => setPersonne(p)} style={ligneRes}>
                      <span style={{ ...avatar, color: "var(--ls-bbc-teal)" }}>{(p.prenom[0] ?? "?").toUpperCase()}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{`${p.prenom} ${p.nom}`.trim() || "—"}</span>
                        <span style={{ display: "block", fontSize: 12, color: "var(--ls-bbc-muted)" }}>{[p.origine, p.telephone].filter(Boolean).join(" · ")}</span>
                      </span>
                    </button>
                  ))}
                  {recherche.trim() && !resultats.length ? <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)", padding: "6px 0" }}>Personne à ce nom. Crée-la juste en dessous.</div> : null}
                  <button type="button" onClick={() => setNouveau(true)} style={ligneRes}>
                    <span style={{ ...avatar, color: "var(--ls-bbc-lime-text)" }}>＋</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>Nouvelle personne</span>
                      <span style={{ display: "block", fontSize: 12, color: "var(--ls-bbc-muted)" }}>Pas encore dans le CRM</span>
                    </span>
                  </button>
                </div>
              )}

              {!deplace ? (
                <div style={champ}>
                  <label htmlFor="note-rdv" style={etiquette}>
                    note · facultatif
                  </label>
                  <textarea id="note-rdv" value={note} placeholder="Ex. vient avec sa sœur" onChange={(e) => setNote(e.target.value)} style={{ ...saisie, minHeight: 70, resize: "none", paddingTop: 10 }} />
                </div>
              ) : null}
              {erreur ? <div style={alerte("coral")}>{erreur}</div> : null}
            </div>
            <div style={pied}>
              <button type="button" onClick={() => void enregistrer()} disabled={!pret || envoi} style={{ ...boutonLime, background: pret && !envoi ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s3)", color: pret && !envoi ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-hint)" }}>
                {envoi ? "Enregistrement…" : deplace ? "Déplacer le rendez-vous" : "Caler le rendez-vous"}
              </button>
              <div style={{ fontSize: 12, color: "var(--ls-bbc-hint)", textAlign: "center", lineHeight: 1.45 }}>
                {coach && coach !== userId ? `${coachs.find((c) => c.id === coach)?.prenom ?? "La coach"} sera prévenue.` : "Le créneau est revérifié à l'enregistrement."}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Champ({ id, label, valeur, onChange, type = "text", auto }: { id: string; label: string; valeur: string; onChange: (v: string) => void; type?: string; auto?: boolean }) {
  return (
    <div style={champ}>
      <label htmlFor={id} style={etiquette}>
        {label}
      </label>
      <input id={id} type={type} value={valeur} autoFocus={auto} autoComplete="off" onChange={(e) => onChange(e.target.value)} style={saisie} />
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const voile: CSSProperties = { position: "fixed", inset: 0, zIndex: 60, background: "rgba(8, 20, 18, .74)", display: "flex", alignItems: "flex-end", justifyContent: "center" };
const panneau: CSSProperties = {
  width: "min(560px, 100%)", height: "92vh", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden",
  background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line2)", borderRadius: "24px 24px 0 0", color: "var(--ls-bbc-text)",
};
const entete: CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "6px 18px 12px", borderBottom: "1px solid var(--ls-bbc-line)", flex: "none" };
const titre: CSSProperties = { fontFamily: "var(--ls-bbc-font-display)", fontSize: 22, lineHeight: 1.1 };
const sousTitre: CSSProperties = { fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-hint)", letterSpacing: ".08em", textTransform: "uppercase", marginTop: 3 };
const croix: CSSProperties = { flex: "none", width: 44, height: 44, minHeight: 44, borderRadius: 99, border: 0, background: "var(--ls-bbc-s3)", color: "var(--ls-bbc-muted)", fontSize: 16, cursor: "pointer" };
const corps: CSSProperties = { flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: "12px 18px 18px", display: "flex", flexDirection: "column", gap: 12 };
const pied: CSSProperties = { flex: "none", padding: "12px 18px calc(18px + env(safe-area-inset-bottom))", borderTop: "1px solid var(--ls-bbc-line)", display: "flex", flexDirection: "column", gap: 8 };
const puce: CSSProperties = { minHeight: 44, padding: "0 13px", borderRadius: 11, border: "1px solid", fontFamily: "var(--ls-bbc-font-body)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" };
const boutonPlusTot: CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 56, padding: "10px 14px", borderRadius: 14,
  border: "1px solid color-mix(in srgb, var(--ls-bbc-lime) 40%, transparent)", background: "color-mix(in srgb, var(--ls-bbc-lime) 8%, transparent)",
  color: "var(--ls-bbc-text)", textAlign: "left", fontFamily: "var(--ls-bbc-font-body)", cursor: "pointer",
};
const etiquette: CSSProperties = { fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-bbc-hint)" };
const bande: CSSProperties = { flex: "none", display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", margin: "0 -18px", padding: "0 18px 4px" };
const lienBas: CSSProperties = { width: "100%", minHeight: 44, border: 0, background: "transparent", color: "var(--ls-bbc-muted)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 };
const navSemaine: CSSProperties = { flex: "none", width: 44, minHeight: 44, borderRadius: 11, border: "1px solid var(--ls-bbc-line)", background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-text)", fontSize: 17, fontWeight: 700, cursor: "pointer" };
const dateJump: CSSProperties = { flex: "none", minHeight: 44, maxWidth: 128, borderRadius: 11, border: "1px solid var(--ls-bbc-line)", background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 13, padding: "0 8px" };
const jb: CSSProperties = { flex: "none", width: 60, minHeight: 66, padding: "7px 0", borderRadius: 12, border: "1px solid", textAlign: "center", cursor: "pointer", fontFamily: "var(--ls-bbc-font-body)" };
const creneau: CSSProperties = { minWidth: 64, minHeight: 44, padding: "0 10px", borderRadius: 10, border: "1.5px solid", background: "transparent", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 13.5, fontWeight: 700, cursor: "pointer" };
const recap: CSSProperties = { display: "flex", gap: 12, alignItems: "stretch", padding: "12px 14px", borderRadius: 14, background: "var(--ls-bbc-s2)" };
const lien: CSSProperties = { flex: "none", alignSelf: "center", border: 0, background: "transparent", color: "var(--ls-bbc-lime-text)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 13, fontWeight: 700, cursor: "pointer", minHeight: 44, padding: "0 4px" };
const bloc: CSSProperties = { marginTop: 8, padding: "12px 14px", borderRadius: 14, border: "1px solid var(--ls-bbc-line2)", background: "var(--ls-bbc-s2)" };
const champ: CSSProperties = { display: "flex", flexDirection: "column", gap: 6, marginTop: 10 };
/* 16 px obligatoire : en dessous, iOS zoome au focus et décale l'écran. */
const saisie: CSSProperties = { minHeight: 48, borderRadius: 12, border: "1px solid var(--ls-bbc-line)", background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-text)", padding: "0 14px", fontFamily: "var(--ls-bbc-font-body)", fontSize: 16 };
const ligneRes: CSSProperties = { display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 56, padding: "8px 0", border: 0, borderBottom: "1px solid var(--ls-bbc-line)", background: "transparent", color: "var(--ls-bbc-text)", textAlign: "left", fontFamily: "var(--ls-bbc-font-body)", cursor: "pointer" };
const avatar: CSSProperties = { flex: "none", width: 36, height: 36, borderRadius: 99, background: "var(--ls-bbc-s3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 14, fontWeight: 700 };
const choixIndispo: CSSProperties = { display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 56, padding: "0 16px", borderRadius: 14, border: "1.5px solid", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)", textAlign: "left", cursor: "pointer" };
const boutonLime: CSSProperties = { width: "100%", minHeight: 52, border: 0, borderRadius: 14, fontFamily: "var(--ls-bbc-font-body)", fontSize: 15.5, fontWeight: 800, cursor: "pointer" };
function alerte(ton: "coral" | "amber"): CSSProperties {
  const c = ton === "coral" ? "var(--ls-bbc-coral)" : "var(--ls-bbc-amber)";
  return { padding: "11px 13px", borderRadius: 13, fontSize: 13, lineHeight: 1.5, background: `color-mix(in srgb, ${c} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${c} 40%, transparent)`, color: "var(--ls-bbc-text)" };
}
