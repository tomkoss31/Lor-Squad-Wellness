// =============================================================================
// Journal nutritionnel — l'onglet de la membre (maquette v7 validée, 21/09/2026).
//
// Il remplace « Conseils » dans les deux espaces : l'app membre BBC (format
// "bbc", orange du club) et l'espace client standard (format "std", teal ;
// lime réservé aux victoires). Rien de l'ancien onglet ne se perd : le mot du
// coach passe en haut, l'assiette et les points d'attention dans « Mes
// conseils du jour », la routine devient les défis.
//
// L'écran :
//   ‹ le jour ›  (on corrige les 7 derniers jours)
//   le mot du coach
//   l'anneau des protéines · les verres d'eau (la boisson du club comptée)
//   les défis du jour (+5 XP chacun, les niveaux de l'app)
//   une ligne par repas (on touche la ligne : voir, corriger, ajouter)
//   sport + humeur en un bouton
//   « Mes conseils du jour » (Noaly, en rose en BBC)
// Lot 2 (21/09, maquette v8) : « Écris ton repas, Noaly calcule » dans l'ajout,
// « Le mot de Noaly » dans les conseils — edge `journal-noaly`.
// Lot 5 du comptoir (26/09, maquette SHZYSBaqfgWVqdMncgrcPG, écran 3) : au club,
// « À la maison » dans « Mes repas » (ce qu'elle a emporté du club, décompté) et
// « Shake F1 · tes sachets du club » au petit-déj les jours où elle n'est pas
// pointée — un toucher = noté ET un sachet de moins. Jamais noté à sa place.
// =============================================================================

import "./journal.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { JournalIcone } from "./JournalIcone";
import { FeuilleAjout, FeuilleConseils, FeuilleJournee, FeuilleModifier, FeuilleRepas, type AlerteSport } from "./JournalFeuilles";
import { CarteSemaine, FeuilleSemaine } from "./JournalSemaine";
import { XpBarMembre } from "../client-xp/XpBarLigne";
import { chargerAliments, journalMembre, noaly, prevenirCoachNiveau, signalerXp } from "./journalApi";
import { useALaMaison } from "./useALaMaison";
import { avecLeJournal, clubFerme, pastillesStock, phraseSachets, sachetsDuJour, stockMaison } from "../bbc/caisse/maison";
import {
  ACTIVITES,
  COEFFICIENTS,
  CRENEAUX_REPAS,
  HUMEURS,
  INDICE_CRENEAU,
  LIBELLE_GAIN,
  NOM_CRENEAU,
  defisDuJour,
  eauAtteinte,
  formatLitres,
  litres,
  niveauDe,
  protJour,
  bilanSemaine,
  kcalDe,
  resume,
  semaineEnTete,
  texteKcal,
  type SemaineMembre,
  verresObjectif,
  type Aliment,
  type Creneau,
  type EtatJour,
  type Ligne,
} from "./journalCalculs";

type FeuilleOuverte =
  | { type: "ajout"; creneau: Creneau }
  | { type: "repas"; creneau: Creneau }
  | { type: "modifier"; ligne: Ligne }
  | { type: "journee" }
  | { type: "conseils" }
  | null;

const ICONE_CRENEAU: Record<Creneau, string> = { pdj: "cafe", enc1: "pomme", dej: "couverts", enc2: "lait", din: "lune", aut: "plus" };
const ICONE_DEFI: Record<string, string> = { journal_note: "crayon", journal_proteines: "viande", journal_eau: "goutte", journal_complete: "etoile" };
const CIRCONFERENCE = 2 * Math.PI * 50;

function decaler(iso: string, jours: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + jours));
  return t.toISOString().slice(0, 10);
}
function titreDuJour(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const s = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function surTitreDuJour(e: EtatJour): string {
  if (e.jour === e.aujourdhui) return "Aujourd'hui";
  if (e.jour === decaler(e.aujourdhui, -1)) return "Hier";
  return "Les jours d'avant";
}

export interface JournalMembreProps {
  token?: string;
  format: "bbc" | "std";
  /** Prénom de la coach (« Thomas ») : le mot du coach, les réglages. */
  coachPrenom?: string;
  /** Le mot du coach du bilan (ancien onglet Conseils), tant qu'aucune remarque du journal n'existe. */
  motDuBilan?: string | null;
  /** Espace standard, objectif sport : les points d'attention du bilan. */
  alertesSport?: AlerteSport[];
}

export function JournalMembre({ token, format, coachPrenom, motDuBilan, alertesSport }: JournalMembreProps) {
  const coach = (coachPrenom ?? "").trim().split(/\s+/)[0] || "ta coach";
  const [jourDemande, setJourDemande] = useState<string | null>(null);
  const [etat, setEtat] = useState<EtatJour | null>(null);
  const [aliments, setAliments] = useState<Aliment[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [feuille, setFeuille] = useState<FeuilleOuverte>(null);
  const [pourquoi, setPourquoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [justes, setJustes] = useState<string[]>([]);
  const [montee, setMontee] = useState<{ badge: string; niveau: number; titre: string; hint: string } | null>(null);
  const niveauVu = useRef<number | null>(null);
  const minuteur = useRef<number | undefined>(undefined);
  // Ta semaine (bloc B, 7)
  const [semaine, setSemaine] = useState<SemaineMembre | null>(null);
  const [semaineOuverte, setSemaineOuverte] = useState(false);
  // À la maison (lot 5 du comptoir) : au club seulement.
  const aLaMaison = useALaMaison(token, format === "bbc");

  const dire = useCallback((txt: string, duree = 2200) => {
    setMessage(txt);
    window.clearTimeout(minuteur.current);
    minuteur.current = window.setTimeout(() => setMessage(null), duree);
  }, []);

  const charger = useCallback(async () => {
    if (!token) { setChargement(false); setErreur("Ton lien n'est plus valide. Demande-en un nouveau à ta coach."); return; }
    setErreur(null);
    try {
      const [e, a] = await Promise.all([journalMembre.jour(token, jourDemande), chargerAliments()]);
      setEtat(e);
      setAliments(a);
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setChargement(false);
    }
  }, [token, jourDemande]);

  useEffect(() => { void charger(); }, [charger]);

  const chargerSemaine = useCallback(async () => {
    if (!token) return;
    try {
      setSemaine(await journalMembre.semaine(token));
    } catch {
      /* la carte « Ta semaine » reste cachée : le journal du jour, lui, marche */
    }
  }, [token]);
  useEffect(() => { void chargerSemaine(); }, [chargerSemaine]);

  // La notification du dimanche ouvre son bilan (`?semaine=1`), une seule fois.
  useEffect(() => {
    if (!semaine) return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("semaine") !== "1") return;
    setSemaineOuverte(true);
    p.delete("semaine");
    const q = p.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${q ? `?${q}` : ""}${window.location.hash}`);
  }, [semaine]);

  // Retour sur l'app (iOS gèle les onglets cachés) : la journée a pu bouger —
  // un pointage au club, minuit passé, une remarque de la coach.
  useEffect(() => {
    const revoir = () => {
      if (document.visibilityState !== "visible") return;
      void charger();
      void chargerSemaine();
    };
    document.addEventListener("visibilitychange", revoir);
    return () => document.removeEventListener("visibilitychange", revoir);
  }, [charger, chargerSemaine]);

  // Le niveau affiché : on repère la montée (BBC : le journal la fête et prévient
  // la coach ; standard : l'app le fait déjà, on lui signale seulement l'XP).
  useEffect(() => {
    if (!etat || etat.jour !== etat.aujourdhui) return;
    const n = niveauDe(etat.xp_total).courant;
    if (niveauVu.current != null && n.level > niveauVu.current && format === "bbc") {
      setMontee({ badge: n.badge, niveau: n.level, titre: n.title, hint: n.hint });
      if (token) void prevenirCoachNiveau(token, n.level);
    }
    niveauVu.current = n.level;
  }, [etat, format, token]);

  /** `suite` : une phrase dite même quand l'XP tombe (« Il te reste 4 sachets… »). */
  const agir = useCallback(async (appel: () => Promise<EtatJour>, confirmation: string | null, suite?: string) => {
    if (!token) return;
    setOccupe(true);
    try {
      const e = await appel();
      setEtat(e);
      const gains = e.gains ?? [];
      if (gains.length) {
        const xp = gains.reduce((a, g) => a + g.xp, 0);
        const txt = `+${xp} XP · ${gains.map((g) => LIBELLE_GAIN[g.cle] ?? g.cle).join(" + ")}`;
        dire(suite ? `${txt}. ${suite}` : txt, suite ? 3600 : 2200);
        setJustes(gains.map((g) => g.cle));
        signalerXp();
      } else if (confirmation) {
        dire(suite ? `${confirmation}. ${suite}` : confirmation, suite ? 3600 : 2200);
      }
    } catch (err) {
      dire((err as Error).message);
    } finally {
      setOccupe(false);
    }
  }, [token, dire]);

  const fermer = useCallback(() => setFeuille(null), []);
  const defis = useMemo(() => (etat ? defisDuJour(etat) : []), [etat]);

  if (chargement) {
    return <div className="jr" data-format={format}><div className="jr-card jr-vide">Ton journal arrive…</div></div>;
  }
  if (erreur || !etat) {
    return (
      <div className="jr" data-format={format}>
        <div className="jr-card">
          <div className="jr-vide">{erreur ?? "Ton journal n'a pas pu s'ouvrir."}</div>
          <button type="button" className="jr-cta" onClick={() => { setChargement(true); void charger(); }}>Réessayer</button>
        </div>
      </div>
    );
  }

  const e = etat;
  const aujourdhui = e.jour === e.aujourdhui;
  const prot = protJour(e.lignes);
  const obj = e.objectifs.proteines;
  const atteint = obj != null && prot >= obj;
  const l = litres(e.verres, e.boisson_club);
  const eauOk = eauAtteinte(e.objectifs.eau_l, e.verres, e.boisson_club);
  const avecGobelet = format === "bbc";
  const nbVerres = Math.min(20, Math.max(verresObjectif(e.objectifs.eau_l, avecGobelet && e.boisson_club), e.verres + (eauOk ? 1 : 0)));
  const niv = niveauDe(e.xp_total);
  const coefInfo = COEFFICIENTS.find((c) => Math.abs(c.coef - e.objectifs.coef) < 0.01) ?? COEFFICIENTS[0];
  const note = e.remarque?.texte ?? (motDuBilan && motDuBilan.trim() ? motDuBilan.trim() : null);
  const auteurNote = e.remarque?.coach || coach;
  const humeur = HUMEURS.find((h) => h.cle === e.humeur) ?? null;
  const activite = ACTIVITES.find((a) => a.cle === e.activite) ?? null;
  const journeeRemplie = !!activite || !!humeur;
  // Les kcal (bloc B, 9) : en gris, sauf si sa coach les a masquées.
  const kcalOn = e.kcal_visibles !== false;
  const kcalJ = kcalDe(e.lignes);
  // Ta semaine : en tête le dimanche soir et le lundi, en bas le reste de la semaine ;
  // seulement sur la journée d'aujourd'hui, et s'il y a au moins un jour noté.
  const bilan = semaine ? bilanSemaine(semaine) : null;
  const carteSemaine = semaine && bilan && bilan.joursNotes > 0 && e.jour === e.aujourdhui ? (
    <CarteSemaine s={semaine} bilan={bilan} onOuvrir={() => { setSemaineOuverte(true); void chargerSemaine(); }} />
  ) : null;
  const semaineEnHaut = semaine ? semaineEnTete(semaine.aujourdhui, new Date().getHours()) : false;
  // À la maison (lot 5 du comptoir) : le stock suit son journal ouvert, sans rappeler la base.
  const maisonJour = aujourdhui && aLaMaison ? avecLeJournal(aLaMaison.maison, e.jour, e.lignes) : null;
  const stock = maisonJour ? stockMaison(maisonJour, e.jour) : null;
  const pastilles = stock ? pastillesStock(stock.restant) : [];
  const sachets = sachetsDuJour(maisonJour, stock, e.jour, e.lignes);
  const shakeSachets = sachets ? aliments.find((a) => a.cle === sachets.aliment) ?? null : null;
  const fermeAujourdhui = !!aLaMaison && clubFerme(aLaMaison.horaires, e.jour);

  const poserVerres = (v: number) => {
    setEtat({ ...e, verres: v }); // tout de suite à l'écran, la base suit
    void agir(() => journalMembre.eau(token!, e.jour, v, null), null);
  };

  return (
    <div className="jr" data-format={format}>
      {semaineEnHaut ? carteSemaine : null}

      {/* ‹ le jour › */}
      <div className="jr-row">
        <button type="button" className="jr-nav-jour" aria-label="Jour précédent" disabled={e.jour <= decaler(e.aujourdhui, -6) || occupe}
          onClick={() => setJourDemande(decaler(e.jour, -1))}>
          <JournalIcone nom="gauche" />
        </button>
        <div className="jr-grow jr-date">
          <div className="jr-eye">{surTitreDuJour(e)}</div>
          <div className="jr-h1">{titreDuJour(e.jour)}</div>
        </div>
        <button type="button" className="jr-nav-jour" aria-label="Jour suivant" disabled={aujourdhui || occupe}
          onClick={() => setJourDemande(decaler(e.jour, 1) === e.aujourdhui ? null : decaler(e.jour, 1))}>
          <JournalIcone nom="droite" />
        </button>
      </div>

      {note ? (
        <div className="jr-note">
          <JournalIcone nom="bulle" taille={18} />
          <span><b>{auteurNote} :</b> {note}</span>
        </div>
      ) : null}

      {/* L'anneau des protéines, les verres d'eau */}
      <section className="jr-card" aria-label="Protéines et eau">
        <div className="jr-hero">
          <div className={`jr-ring${atteint ? " ok" : ""}`}>
            <svg viewBox="0 0 120 120" width="124" height="124" aria-hidden="true">
              <circle cx="60" cy="60" r="50" fill="none" strokeWidth="11" style={{ stroke: "var(--jr-s3)" }} />
              <circle
                className="jr-arc"
                cx="60" cy="60" r="50" fill="none" strokeWidth="11" strokeLinecap="round" transform="rotate(-90 60 60)"
                style={{
                  stroke: atteint ? "var(--jr-win)" : "var(--jr-acc)",
                  strokeDasharray: CIRCONFERENCE,
                  strokeDashoffset: obj ? CIRCONFERENCE * (1 - Math.min(1, prot / obj)) : CIRCONFERENCE,
                }}
              />
            </svg>
            <div className="jr-ring-t">
              <b>{Math.round(prot)}</b>
              <small>{obj != null ? `/ ${obj} g` : "g"}</small>
              <span>{atteint ? "objectif atteint" : "protéines"}</span>
            </div>
          </div>
          <div className="jr-grow">
            <div className="jr-eye"><JournalIcone nom="goutte" taille={14} />Eau</div>
            <div className="jr-eau-n">{formatLitres(l)} <small>/ {formatLitres(e.objectifs.eau_l)} L</small></div>
            <div className="jr-verres">
              {avecGobelet ? (
                <button type="button" className={`jr-verre${e.boisson_club ? " plein" : ""}`} aria-pressed={e.boisson_club}
                  aria-label="Boisson du club, 40 cl" disabled={occupe}
                  onClick={() => { setEtat({ ...e, boisson_club: !e.boisson_club }); void agir(() => journalMembre.eau(token!, e.jour, e.verres, !e.boisson_club), null); }}>
                  <JournalIcone nom="gobelet" taille={16} />
                </button>
              ) : null}
              {Array.from({ length: nbVerres }, (_, i) => (
                <button key={i} type="button" className={`jr-verre${i < e.verres ? " plein" : ""}`} aria-label={`Verre ${i + 1}`}
                  onClick={() => poserVerres(i + 1 === e.verres ? i : i + 1)} />
              ))}
            </div>
            <div className="jr-tiny" style={{ marginTop: 7 }}>
              {avecGobelet ? "Ta boisson du club (40 cl) compte. Touche un verre (25 cl) pour le remplir." : "Touche un verre (25 cl) pour le remplir."}
            </div>
          </div>
        </div>
        <button type="button" className="jr-pourquoi" aria-expanded={pourquoi} onClick={() => setPourquoi((v) => !v)}>
          <JournalIcone nom="info" taille={16} />Pourquoi ces objectifs ?
        </button>
        {pourquoi ? (
          <div className="jr-pourquoi-texte">
            {obj != null && e.objectifs.poids != null ? (
              <><b>Protéines : {String(e.objectifs.poids).replace(".", ",")} kg × {String(e.objectifs.coef).replace(".", ",")} = {obj} g</b> — {coefInfo.phrase}, réglé avec {coach}. Ton activité change ? Dis-le-lui, vous l'ajustez ensemble.<br /></>
            ) : (
              <><b>Protéines :</b> ton objectif sera fixé à ton prochain bilan pesé, avec {coach}.<br /></>
            )}
            <b>Eau : 1 L par 30 kg = {formatLitres(e.objectifs.eau_l)} L</b>
            {avecGobelet ? " — ta boisson du club compte, puis des verres de 25 cl." : " — des verres de 25 cl dans la journée."}
          </div>
        ) : null}
      </section>

      {/* Les défis du jour = l'XP */}
      {aujourdhui ? (
        <section className="jr-card" aria-label="Défis du jour">
          <div className="jr-row">
            <div className="jr-eye jr-grow">Tes défis du jour</div>
            <span className="jr-niveau">{niv.courant.badge} Niveau {niv.courant.level}</span>
          </div>
          <div className="jr-defis">
            {defis.map((d) => (
              <div key={d.cle} className={`jr-defi${d.atteint ? " ok" : ""}${justes.includes(d.cle) ? " juste" : ""}`}>
                <JournalIcone nom={d.atteint ? "coche" : ICONE_DEFI[d.cle]} taille={20} />
                <small>{d.libelle}</small>
                <i>+5 XP</i>
              </div>
            ))}
          </div>
          <div className="jr-xpbar"><i style={{ width: `${Math.round(niv.part * 100)}%` }} /></div>
          <div className="jr-xptxt">
            <b>{e.xp_total} XP</b>
            {niv.suivant ? <> · encore {niv.suivant.threshold - e.xp_total} avant {niv.suivant.badge} {niv.suivant.title}</> : <> · niveau maximum</>}
          </div>
          {montee ? (
            <div className="jr-montee" role="status">
              <span className="jr-badge" aria-hidden="true">{montee.badge}</span>
              <span><b>Niveau {montee.niveau} : {montee.titre} !</b><br />{montee.hint}. {coach} est prévenu·e.</span>
            </div>
          ) : null}
        </section>
      ) : (
        <div className="jr-card" style={{ fontSize: 13, color: "var(--jr-mut)", lineHeight: 1.5 }}>
          Une erreur ce jour-là ? <b style={{ color: "var(--jr-tx)" }}>Touche le repas</b> pour la corriger. Les défis, eux, se jouent le jour même.
        </div>
      )}

      {/* Tes XP au bar (24/09, bloc 5) : une ligne sous les défis, jamais dans le journal du jour. */}
      {aujourdhui && token ? <XpBarMembre token={token} format={format} /> : null}

      {/* Mes repas : une ligne chacun (les kcal en gris, si sa coach ne les a pas masquées) */}
      <section className="jr-card" style={{ paddingTop: 12, paddingBottom: 6 }} aria-label="Mes repas">
        <div className="jr-row" style={{ justifyContent: "space-between" }}>
          <span className="jr-eye">Mes repas</span>
          {kcalOn && kcalJ.connu ? <span className="jr-kcal">{texteKcal(kcalJ.kcal, true, true)}</span> : null}
        </div>
        {pastilles.length ? (
          <div className="jr-maison" aria-label="À la maison, du club">
            <span className="jr-maison-t">À la maison</span>
            {pastilles.map((p) => <span key={p} className="jr-maison-p">{p}</span>)}
            {fermeAujourdhui ? <span className="jr-maison-p ferme">club fermé aujourd'hui</span> : null}
          </div>
        ) : null}
        <div className="jr-repas">
          {[...CRENEAUX_REPAS, ...(e.lignes.some((x) => x.creneau === "aut") ? (["aut"] as Creneau[]) : [])].map((c) => {
            const ls = e.lignes.filter((x) => x.creneau === c);
            if (ls.length) {
              return (
                <button key={c} type="button" className="jr-ligne" onClick={() => setFeuille({ type: "repas", creneau: c })}>
                  <span className="jr-ico"><JournalIcone nom={ICONE_CRENEAU[c]} taille={18} /></span>
                  <span className="jr-grow">
                    <b>{NOM_CRENEAU[c]}</b>
                    <small>{resume(ls)}{ls.some((x) => x.origine === "club") ? " · pris au club" : ""}</small>
                  </span>
                  <span className="jr-mp">
                    <span className="jr-g">{Math.round(protJour(ls))} g</span>
                    {kcalOn && kcalDe(ls).connu ? <span className="jr-kcal">{texteKcal(kcalDe(ls).kcal, kcalDe(ls).estime)}</span> : null}
                  </span>
                  <span className="jr-chev"><JournalIcone nom="droite" taille={18} /></span>
                </button>
              );
            }
            const hier = aujourdhui ? e.veille.filter((x) => x.creneau === c) : [];
            return (
              <button key={c} type="button" className="jr-ligne vide" aria-label={`Ajouter : ${NOM_CRENEAU[c]}`} onClick={() => setFeuille({ type: "ajout", creneau: c })}>
                <span className="jr-ico"><JournalIcone nom={ICONE_CRENEAU[c]} taille={18} /></span>
                <span className="jr-grow">
                  <b>{NOM_CRENEAU[c]}</b>
                  {c === "pdj" && shakeSachets ? (
                    <small className="hier">Shake F1 · tes sachets du club</small>
                  ) : hier.length ? (
                    <small className="hier">hier : {resume(hier)} · {Math.round(protJour(hier))} g</small>
                  ) : (
                    <small>{INDICE_CRENEAU[c]}</small>
                  )}
                </span>
                <span className="jr-plus"><JournalIcone nom="plus" taille={18} /></span>
              </button>
            );
          })}
          {!e.lignes.some((x) => x.creneau === "aut") ? (
            <button type="button" className="jr-autre" onClick={() => setFeuille({ type: "ajout", creneau: "aut" })}>
              <JournalIcone nom="plus" taille={16} />Autre chose · grignotage, boisson
            </button>
          ) : null}
        </div>
      </section>

      {/* Sport + humeur */}
      <button type="button" className="jr-card jr-journee" onClick={() => setFeuille({ type: "journee" })}>
        <span className="jr-ico"><JournalIcone nom="pas" taille={18} /></span>
        <span className="jr-grow">
          <b>
            {journeeRemplie ? (
              <>
                {activite ? (activite.cle === "repos" ? "Repos" : `${activite.libelle} de sport`) : "sport ?"} ·{" "}
                {humeur ? <><span className="jr-point" style={{ background: humeur.couleur }} />{humeur.libelle}</> : "humeur ?"}
              </>
            ) : "Sport et humeur"}
          </b>
          <small>{journeeRemplie ? "Ta journée · touche pour modifier" : "à noter le soir, en 2 gestes"}</small>
        </span>
        <span className="jr-chev"><JournalIcone nom="droite" taille={18} /></span>
      </button>

      {aujourdhui ? (
        <button type="button" className="jr-nly-btn" onClick={() => setFeuille({ type: "conseils" })}>
          <JournalIcone nom="etincelle" taille={18} />Mes conseils du jour
        </button>
      ) : null}

      {!semaineEnHaut ? carteSemaine : null}
      {semaineOuverte && semaine && bilan ? <FeuilleSemaine s={semaine} bilan={bilan} onFermer={() => setSemaineOuverte(false)} /> : null}

      <div className={`jr-toast${message ? " on" : ""}`} role="status" aria-live="polite">{message}</div>

      {feuille?.type === "ajout" ? (
        <FeuilleAjout
          creneau={feuille.creneau} etat={e} aliments={aliments} occupe={occupe} onFermer={fermer}
          onAjouter={(a, g, q) => { fermer(); void agir(() => journalMembre.ajouter(token!, e.jour, feuille.creneau, a.cle, g, q), "Noté"); }}
          onPlusUn={(l) => { fermer(); void agir(() => journalMembre.modifier(token!, l.id, l.aliment, l.grammes, l.quantite + 1), `${l.libelle} × ${l.quantite + 1}`); }}
          onReprendreVeille={() => { fermer(); void agir(() => journalMembre.reprendreVeille(token!, e.jour, feuille.creneau), "Repris d'hier"); }}
          onLireRepas={(texte) => noaly.lireRepas(token!, feuille.creneau, texte)}
          onAjouterLot={(lignes) => { fermer(); void agir(() => journalMembre.ajouterLot(token!, e.jour, feuille.creneau, lignes), "Noté · calculé par Noaly"); }}
          onAjouterHabituel={(h) => { fermer(); void agir(() => journalMembre.ajouterHabituel(token!, e.jour, feuille.creneau, h), `Noté · ${resume([{ libelle: h.libelle, quantite: h.quantite }])}`); }}
          sachets={sachets && shakeSachets ? { aliment: shakeSachets, restant: sachets.f1 } : null}
          onSachets={sachets && shakeSachets ? () => {
            fermer();
            void agir(() => journalMembre.ajouter(token!, e.jour, "pdj", shakeSachets.cle, null, 1), "Noté", phraseSachets(sachets.f1 - 1));
          } : undefined}
        />
      ) : null}
      {feuille?.type === "repas" ? (
        <FeuilleRepas
          creneau={feuille.creneau} etat={e} onFermer={fermer}
          onModifier={(ligne) => setFeuille({ type: "modifier", ligne })}
          onAjouter={() => setFeuille({ type: "ajout", creneau: feuille.creneau })}
        />
      ) : null}
      {feuille?.type === "modifier" ? (
        <FeuilleModifier
          ligne={feuille.ligne} aliments={aliments} occupe={occupe} onFermer={fermer}
          onEnregistrer={(cle, g, q) => { const id = feuille.ligne.id; fermer(); void agir(() => journalMembre.modifier(token!, id, cle, g, q), "Corrigé"); }}
          onRetirer={() => { const id = feuille.ligne.id; fermer(); void agir(() => journalMembre.retirer(token!, id), "Retiré"); }}
        />
      ) : null}
      {feuille?.type === "journee" ? (
        <FeuilleJournee
          etat={e} onFermer={fermer}
          onActivite={(a) => { setEtat({ ...e, activite: a }); void agir(() => journalMembre.activite(token!, e.jour, a), null); }}
          onHumeur={(h) => { setEtat({ ...e, humeur: h }); void agir(() => journalMembre.humeur(token!, e.jour, h), null); }}
        />
      ) : null}
      {feuille?.type === "conseils" ? (
        <FeuilleConseils
          etat={e} aliments={aliments} format={format} coachPrenom={coach} alertes={format === "std" ? alertesSport : undefined}
          maintenant={new Date()}
          chargerMot={(plan) => noaly.conseil(token!, e.jour, plan.map((x) => ({ creneau: x.creneau, aliment: x.aliment.cle, grammes: x.grammes })))}
          onFermer={fermer}
        />
      ) : null}
    </div>
  );
}
