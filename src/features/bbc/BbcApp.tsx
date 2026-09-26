// =============================================================================
// BbcApp — le mode BBC, « le club en cinq onglets » (livraison A, 18/09/2026).
//
// Thomas, 17-18/09 : « l'app est clairement trop compliquée ». La maquette
// cliquable (scratchpad/maquette-bbc-cliquable.html, v7) a été construite sur
// SA journée, pas sur les menus : ce fichier la pose sur les vues existantes.
//
//   Matin · Agenda · ＋ · Contacter · Membres        ← la barre, une seule
//   ⋯ Plus (en haut à droite)                       ← tout le reste, tel quel
//
// Le ＋ est posé dans une bosse de la barre (CSS, bbc-tokens.css) et ouvre les
// trois gestes du comptoir : Pointer, Caler un RDV, Nouvelle évaluation.
// Le BBC ne refait pas ce que l'app standard fait : « Sa fiche de lead » sort
// vers le CRM, « L'app complète » vers le mode Classic.
//
// Ce qui a été RETIRÉ de l'accueil : « Cobayes du jour » (0/20, 7 envois en
// 2 mois) devient « Contacter aujourd'hui », rempli par l'app ; la bannière
// Formation, les cœurs à un palier et le prochain appel vivent dans Plus, la
// fiche membre et « prochaine étape ». Les vues elles-mêmes n'ont pas bougé.
// =============================================================================

import "../../styles/bbc-tokens.css";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Club, ClubSettings } from "../../types/domain";
import { useCrmLeads } from "../../hooks/useCrmLeads";
import type { Reponse } from "../crm/qualification";
import { BbcModeSwitch } from "./BbcModeSwitch";
import type { VueBbcParAdresse } from "./bbcRoutes";
import { BbcScripts } from "./views/BbcScripts";
import { BbcCoeurs } from "./views/BbcCoeurs";
import { BbcClub } from "./views/BbcClub";
import { BbcClubs } from "./views/BbcClubs";
import { BbcFormation } from "./views/BbcFormation";
import { BbcLexique } from "./views/BbcLexique";
import { BbcCrm } from "./views/BbcCrm";
import { BbcBoites } from "./views/BbcBoites";
import { BbcAgenda } from "./agenda/BbcAgenda";
import { BbcMessages } from "./views/BbcMessages";
import { BbcReglages } from "./views/BbcReglages";
import { BbcAppels } from "./views/BbcAppels";
import { BbcLiensTiroir } from "./views/BbcLiens";
import { BbcPrelancement } from "./views/BbcPrelancement";
import { BbcClub100 } from "./views/BbcClub100";
import { BbcMatin } from "./views/BbcMatin";
import { BbcContacter, BbcContactSheet } from "./views/BbcContacter";
import { BbcPlus } from "./views/BbcPlus";
import { BbcNewMemberSheet } from "./BbcNewMemberSheet";
import { CalerRdvSheet, type MembreACaler } from "./agenda/CalerRdvSheet";
import { QualifierRdvClubSheet } from "./agenda/QualifierRdvClubSheet";
import { qualifierRdvClub } from "./agenda/qualifierRdvClub";
import { ApresCreation } from "./ApresCreation";
import { BbcBilan10 } from "./BbcBilan10";
import { cleJour, contactDe, couleurCoach, heureDe, libelleJour, nomComplet, urlBilanStandard, type RdvClub } from "./agenda/agendaClub";
import { annulerRdv, prevenirCoach } from "./agenda/calerRdv";
import { useCoachsDuClub } from "./useCoachsDuClub";
import { useContactsDuJour } from "./useContactsDuJour";
import { useBbcSignaux } from "./useBbcSignaux";
import { useBbcMembers } from "./useBbcMembers";
import { useBbcHearts } from "./useBbcHearts";
import { aContacter, type AContacter } from "./contacter";
import { useXpApercu } from "../client-xp/useXpApercu";
import { titreNiveau } from "../client-xp/NiveauPastille";
import { DEFAULT_CLUB_SETTINGS } from "./useClubSettings";
import { Feuille, Toast } from "./ui";
import { JournalAccueil } from "../journal/JournalAccueil";
import { MonJournalCoach } from "../journal/MonJournalCoach";
import { RondMonJournal } from "../journal/RondMonJournal";
import { useMonJournal } from "../journal/useMonJournal";
import { journalCoachPerso } from "../journal/journalApi";

export type BbcView =
  | "matin"
  | "agenda"
  | "contacter"
  | "crm"
  | "plus"
  | "club"
  | "boites"
  | "coeurs"
  | "messages"
  | "scripts"
  | "formation"
  | "lexique"
  | "clubs"
  | "appels"
  | "prelancement"
  | "club100"
  | "reglages"
  /** Son journal à elle (22/09) : ouvert par le rond de l'en-tête et la carte du Matin. */
  | "journal";

interface BbcAppProps {
  coachName?: string;
  userId?: string;
  isAdmin?: boolean;
  /** L'onglet que l'ADRESSE demande (`bbcRoutes.ts`) : une notification vers `/agenda`
   *  ouvre L'agenda, vers `/messages` les messages. `cleAdresse` change à chaque
   *  navigation, même vers la même adresse. */
  vueAdresse?: VueBbcParAdresse;
  cleAdresse?: string;
  /** Admin, ou coach du club mise en BBC : voit le bouton Classic ⇄ BBC (17/09). */
  peutBasculer?: boolean;
  onSetPreview?: (v: "classic" | "bbc" | null) => void;
  club?: Club | null;
  clubs?: Club[];
  onCreateClub?: (name: string, city: string) => Promise<boolean>;
  onRenameClub?: (clubId: string, name: string, city: string) => Promise<boolean>;
}

/** L'adresse parle encore de « cockpit » (`/co-pilote`) : c'est « Le matin ». */
function vueDe(v: VueBbcParAdresse): BbcView {
  return v === "cockpit" ? "matin" : v;
}

/** La barre du bas — quatre onglets et le ＋ au milieu. Le ＋ n'est pas une vue. */
const BARRE: { k: BbcView; icone: string; label: string }[] = [
  { k: "matin", icone: "☀️", label: "Matin" },
  { k: "agenda", icone: "📅", label: "Agenda" },
  { k: "contacter", icone: "📞", label: "Contacter" },
  { k: "crm", icone: "👥", label: "Membres" },
];

/** Les vues rangées derrière Plus — pour que la barre latérale (desktop) les garde à un clic. */
const PLUS: { k: BbcView; label: string }[] = [
  { k: "club", label: "Les visites" },
  { k: "messages", label: "Messages" },
  { k: "appels", label: "Les appels" },
  { k: "coeurs", label: "Les cœurs" },
  { k: "boites", label: "Les boîtes" },
  { k: "scripts", label: "Scripts" },
  { k: "formation", label: "Formation" },
  { k: "lexique", label: "Lexique" },
  { k: "prelancement", label: "Pré-lancement" },
  { k: "club100", label: "Rentabilité" },
  { k: "clubs", label: "Mes clubs" },
  { k: "reglages", label: "Réglages" },
];

/**
 * La salutation suit l'heure. « Bon matin, Thomas » à 17 h sonnait faux (vu
 * sur la prod le 17/09) — et l'app classique, elle, disait « Belle après-midi ».
 */
function salutation(maintenant = new Date()): string {
  const h = maintenant.getHours();
  return h < 12 ? "Bon matin" : h < 18 ? "Bel après-midi" : "Bonne soirée";
}

const TITLES: Record<BbcView, { eye: string; title: string }> = {
  matin: { eye: "le club · ce matin", title: "Le matin" },
  agenda: { eye: "le club · toute l'équipe", title: "L'agenda" },
  contacter: { eye: "20 par jour · rangés par urgence", title: "Contacter" },
  crm: { eye: "les membres du club", title: "Membres" },
  plus: { eye: "tout le reste, rangé ici", title: "Plus" },
  boites: { eye: "le terrain · coupons papier", title: "Les boîtes" },
  club: { eye: "pointage en direct", title: "Le club ce matin" },
  coeurs: { eye: "réseau & paliers", title: "Les cœurs" },
  messages: { eye: "messagerie", title: "Messages" },
  scripts: { eye: "tout ce que tu envoies", title: "Scripts" },
  formation: { eye: "accès gradué", title: "Formation BBC" },
  lexique: { eye: "les mots du club", title: "Lexique" },
  clubs: { eye: "réseau bbc", title: "Mes clubs" },
  appels: { eye: "rituels du club", title: "Les appels" },
  prelancement: { eye: "avant l'ouverture", title: "Pré-lancement" },
  club100: { eye: "le modèle · tes chiffres", title: "Club 100 & rentabilité" },
  reglages: { eye: "config du club", title: "Réglages" },
  journal: { eye: "ton journal perso · comme tes membres", title: "Mon journal" },
};

export function BbcApp({ coachName, userId, isAdmin, vueAdresse, cleAdresse, peutBasculer, onSetPreview, club: clubProp, clubs, onCreateClub, onRenameClub }: BbcAppProps) {
  const navigate = useNavigate();
  // Les réglages fraîchement enregistrés priment sur ceux chargés au montage :
  // `useBbcMode` ne les relit qu'au démarrage, et sans ça les appels, les cœurs
  // et les cartes restaient sur les anciennes valeurs jusqu'à un F5 — assez
  // longtemps pour inscrire des membres à la mauvaise heure.
  const [reglagesFrais, setReglagesFrais] = useState<ClubSettings | null>(null);
  /** Le tiroir « 🔗 Mes liens » (15/09, variante B validée par Thomas). */
  const [liensOuverts, setLiensOuverts] = useState(false);

  /**
   * Le thème du mode BBC (Thomas, 18/08 : « faudrait aussi le toggle mode clair
   * pour l'app coach, pas only sombre »). Pas de persistance : le thème client
   * ne l'est pas non plus.
   *
   * ⚠️ LE THÈME NE SE PROPAGE PAS TOUT SEUL. Le sélecteur est
   * `.bbc-mode.bbc-light` : les DEUX classes doivent être sur le MÊME élément.
   * Or les feuilles s'affichent en `position: fixed` hors du flux (pesée, carte,
   * nouveau membre, scanner, appels, les nouvelles feuilles de `ui.tsx`…). On
   * synchronise donc TOUS les `.bbc-mode` du document ; le `MutationObserver`
   * est indispensable pour une feuille montée APRÈS le basculement.
   */
  const [clair, setClair] = useState(false);
  useEffect(() => {
    const appliquer = () => {
      document.querySelectorAll(".bbc-mode").forEach((el) => el.classList.toggle("bbc-light", clair));
    };
    appliquer();
    const observateur = new MutationObserver(appliquer);
    observateur.observe(document.body, { childList: true, subtree: true });
    return () => {
      observateur.disconnect();
      document.querySelectorAll(".bbc-mode").forEach((el) => el.classList.remove("bbc-light"));
    };
  }, [clair]);

  const club = clubProp && reglagesFrais ? { ...clubProp, settings: reglagesFrais } : clubProp;
  const [view, setView] = useState<BbcView>("matin");

  // L'ADRESSE choisit l'onglet (17/09/2026). On suit `cleAdresse` et non
  // `vueAdresse` : deux notifications de suite vers la même adresse doivent
  // rouvrir l'onglet, même si on en est parti entre-temps.
  useEffect(() => {
    if (!vueAdresse) return;
    setView(vueDe(vueAdresse));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleAdresse]);

  // Chaque changement d'onglet remonte en haut : un onglet, c'est un écran.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  // La feuille « Évaluation bien-être » vit ICI et pas dans une vue : elle
  // s'ouvre depuis « Mes membres », depuis le ＋ et depuis Plus. Une seule
  // instance, un seul état.
  const [nouveauMembre, setNouveauMembre] = useState(false);
  /** Le menu du ＋ : Pointer, Caler, Nouvelle évaluation. */
  const [gestes, setGestes] = useState(false);
  /** La barre latérale (ordinateur) : « Plus » est replié par défaut. */
  const [plusOuvert, setPlusOuvert] = useState(false);
  /** « Caler » : un nouveau rendez-vous, un déplacement, ou la prochaine pesée d'une membre (22/09). */
  const [caler, setCaler] = useState<{ deplace?: RdvClub; membre?: MembreACaler } | null>(null);
  /** Venue à sa pesée : sa fiche s'ouvre dans Membres, « Son corps » a la balance. */
  function venueALaPesee(clientId: string) {
    ouvrirMembre(clientId);
    setToast("Sa fiche est ouverte : « Son corps » → nouvelle pesée");
  }
  /** Livraison C — le prochain rendez-vous se qualifie depuis Le matin, sans changer d'écran. */
  const [qualif, setQualif] = useState<{ rdv: RdvClub; etape: "choix" | "pasvenue" } | null>(null);
  /** « Elle prend sa carte de membre » : la fiche papier, pré-remplie du rendez-vous. */
  const [membrePour, setMembrePour] = useState<RdvClub | null>(null);
  /** « Et ensuite ? » après TOUTE création de fiche : son premier pointage, un tap. */
  const [apres, setApres] = useState<{ clientId: string; prenom?: string } | null>(null);
  /** La fiche à ouvrir en arrivant sur « Membres » (depuis Le matin ou « Et ensuite ? »). */
  const [membreOuvert, setMembreOuvert] = useState<string | null>(null);
  /** Le bilan des 10 d'une cliente en fin de carte, depuis la question du matin (18/09). */
  const [bilan10, setBilan10] = useState<{ clientId: string; nom: string } | null>(null);
  // Chaque vue monte sa PROPRE instance des hooks (pas de cache partagé, et
  // AppContext est sacré). Après une création, on bouge cette clé : la vue
  // affichée se remonte et refait sa lecture.
  const [rafraichir, setRafraichir] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  // ── « Contacter aujourd'hui » : une seule source pour Le matin et l'onglet ──
  // Les leads viennent du hook du CRM standard (même liste que /crm) ; les
  // membres et les cœurs des hooks BBC ; la dernière visite de chacune de la base
  // (`bbc_dernieres_visites`) ; le compteur du jour et les « déjà fait » de la
  // table `bbc_contacts` (livraison B).
  const leadsApi = useCrmLeads();
  const membresApi = useBbcMembers(userId);
  const heartsApi = useBbcHearts(userId);
  const { signaux, maison, horaires } = useBbcSignaux(userId);
  const cdj = useContactsDuJour(userId);
  // Les niveaux XP (24/09) : la 8e règle de Contacter — féliciter une montée de niveau.
  const xp = useXpApercu(userId);
  const niveaux = useMemo(() => {
    const m = new Map<string, { niveau: number; monteLe: string | null; titre: string }>();
    xp.donnees?.forEach((x, id) => m.set(id, { niveau: x.niveau, monteLe: x.monteLe, titre: titreNiveau(x.niveau) }));
    return m;
  }, [xp.donnees]);
  const contacts = useMemo(
    () => aContacter({ leads: leadsApi.leads, membres: membresApi.members, coeurs: heartsApi.members, signaux, niveaux, maison, horaires }),
    [leadsApi.leads, membresApi.members, heartsApi.members, signaux, niveaux, maison, horaires],
  );
  const faits = useMemo(() => new Set(cdj.faits.keys()), [cdj.faits]);
  const [contact, setContact] = useState<AContacter | null>(null);
  const { coachs } = useCoachsDuClub(userId);
  // Son journal à elle (22/09, maquette validée) : le jeton de SA fiche membre.
  const journalPerso = useMonJournal(userId);
  /** Sans fiche à son nom : son évaluation, comme une membre (le journal a besoin d'un poids pesé). */
  const [evalPerso, setEvalPerso] = useState(false);
  function journalPret(token: string) {
    journalPerso.setToken(token);
    setToast("Ton journal est prêt ✓");
  }

  async function repondreLead(c: AContacter, r: Reponse): Promise<string | null> {
    if (!c.lead) return "Pas un lead.";
    const err = await leadsApi.qualifier(c.lead, r);
    if (err) return err;
    const e2 = await cdj.noter({ cible: c.key, prenom: c.nom, raison: c.raison, reponse: r.cle });
    if (e2) return e2;
    setToast(`${c.nom} · ${r.resume} — ${cdj.count + 1} / ${cdj.target}`);
    return null;
  }
  async function faitMembre(c: AContacter, libelle: string): Promise<void> {
    const err = await cdj.noter({ cible: c.key, prenom: c.nom, raison: c.raison, reponse: libelle });
    setToast(err ? `Pas enregistré : ${err}` : `${c.nom} · ${libelle.toLowerCase()} — ${cdj.count + 1} / ${cdj.target}`);
  }

  const first = (coachName ?? "").split(/\s+/)[0] || "";
  const prenomCoach = (id: string | null) => coachs.find((c) => c.id === id)?.prenom ?? first;
  /** PASSERELLE — « elle démarre en suivi classique » : le bilan standard, pré-rempli du
   *  rendez-vous quand il vient de l'agenda (table prospects). L'app standard s'ouvre
   *  avec « ← Retour au club » (bbcRoutes). */
  function versSuiviClassique(rdv: RdvClub) {
    navigate(urlBilanStandard(rdv));
  }
  function ouvrirMembre(id: string) {
    setMembreOuvert(id);
    setView("crm");
  }
  const clubName = club?.name ?? "Mon club";
  const clubCity = club?.city ?? "Verdun";
  const t = TITLES[view];
  const restants = Math.max(0, cdj.target - cdj.count);
  /** On est sur une vue rangée dans « Plus » : le tiroir reste ouvert, sinon on ne
   *  verrait pas où l'on se trouve. */
  const dansPlus = PLUS.some((p) => p.k === view);

  return (
    <div className={clair ? "bbc-mode bbc-shell bbc-light" : "bbc-mode bbc-shell"}>
      {/* ── Barre latérale (desktop) : les quatre du quotidien, le ＋, puis Plus ── */}
      <aside className="bbc-sidebar">
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "4px 8px 14px" }}>
          <span style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 22, color: "var(--ls-bbc-orange)", lineHeight: 1, letterSpacing: ".02em" }}>BBC</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 14, lineHeight: 1 }}>{clubName}</div>
            <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-hint)", letterSpacing: "0.06em", marginTop: 3 }}>
              {clubCity} · {club?.settings?.open_hours || DEFAULT_CLUB_SETTINGS.open_hours}
            </div>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, overflowY: "auto", paddingTop: 4 }}>
          {BARRE.map((s) => (
            <NavItem key={s.k} active={view === s.k} icone={s.icone} label={s.k === "contacter" ? `${s.label} · ${cdj.count}/${cdj.target}` : s.label} onClick={() => setView(s.k)} />
          ))}
          <button type="button" className="bbc-pression" onClick={() => setGestes(true)} style={{ display: "flex", alignItems: "center", gap: 12, margin: "6px 0", padding: "11px 12px", borderRadius: 999, border: 0, cursor: "pointer", background: "var(--ls-bbc-grad)", color: "#fff", boxShadow: "var(--ls-bbc-grad-ombre)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 14, fontWeight: 700 }}>
            <span aria-hidden="true" style={{ fontSize: 18, width: 20, textAlign: "center" }}>＋</span>
            Pointer · Caler · Évaluer
          </button>
          {/* « Plus » se déroule (Thomas, 18/09) : douze entrées dépliées en
              permanence, c'était le menu à rallonge que la barre du bas venait
              justement supprimer. Il s'ouvre tout seul si on est dedans. */}
          <button
            type="button"
            onClick={() => setPlusOuvert((o) => !o)}
            aria-expanded={plusOuvert || dansPlus}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%", border: 0, cursor: "pointer", background: "transparent",
              padding: "12px 12px 6px", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase",
              color: "var(--ls-bbc-hint)", minHeight: 44,
            }}
          >
            <span style={{ flex: 1, textAlign: "left" }}>Plus</span>
            <span aria-hidden="true" style={{ fontSize: 11, transform: plusOuvert || dansPlus ? "rotate(180deg)" : "none", transition: "transform .15s" }}>▾</span>
          </button>
          {plusOuvert || dansPlus ? (
            <>
              {PLUS.map((p) => (
                <NavItem key={p.k} active={view === p.k} label={p.label} onClick={() => setView(p.k)} petit />
              ))}
              <NavItem active={false} label="Mes liens" onClick={() => setLiensOuverts(true)} petit />
            </>
          ) : null}
        </nav>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 12, borderTop: "1px solid var(--ls-bbc-line)" }}>
          {(isAdmin || peutBasculer) && onSetPreview ? <BbcModeSwitch value="bbc" onChange={(v) => onSetPreview(v)} compact /> : null}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 4px" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--ls-bbc-s3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 12, fontWeight: 700, color: "var(--ls-bbc-teal)", flex: "none" }}>
              {(first[0] ?? "?").toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{first || "Coach"}</div>
              <div style={{ fontSize: 11, color: "var(--ls-bbc-hint)" }}>{isAdmin ? "admin · propriétaire" : "coach"}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── L'écran ─────────────────────────────────────────────────────── */}
      <main className="bbc-main">
        <div className="bbc-entete">
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-orange)", boxShadow: "0 0 8px var(--ls-bbc-orange)" }} />
              {t.eye}
            </div>
            <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 30, letterSpacing: "0.02em", lineHeight: 1.05, marginTop: 6, textTransform: "uppercase" }}>
              {view === "matin" ? (first ? `${salutation()}, ${first}` : salutation()) : t.title}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
            {(isAdmin || peutBasculer) && onSetPreview ? <span className="bbc-seulement-large"><BbcModeSwitch value="bbc" onChange={(v) => onSetPreview(v)} /></span> : null}
            {/* Relu seulement en passant par les écrans où l'on note (Le matin, Mon journal) : pas un appel par onglet. */}
            {userId ? <RondMonJournal token={journalPerso.token} prenom={first} cle={view === "matin" || view === "journal" ? view : "ailleurs"} onOuvrir={() => setView("journal")} /> : null}
            {view !== "plus" ? (
              <button type="button" className="bbc-plus-btn bbc-pression" onClick={() => setView("plus")} aria-label="Plus">⋯</button>
            ) : (
              <button type="button" className="bbc-plus-btn bbc-pression" onClick={() => setView("matin")} aria-label="Retour au matin">✕</button>
            )}
          </div>
        </div>

        {view === "matin" && (
          <BbcMatin
            key={rafraichir}
            userId={userId}
            club={club ?? null}
            contacts={contacts}
            faits={faits}
            count={cdj.count}
            target={cdj.target}
            onGo={setView}
            onContact={setContact}
            onLiens={() => setLiensOuverts(true)}
            onQualifier={(rdv, etape) => setQualif({ rdv, etape })}
            onMembre={ouvrirMembre}
            monJournal={journalPerso.token ? <JournalAccueil token={journalPerso.token} format="bbc" onOuvrirJournal={() => setView("journal")} /> : null}
          />
        )}
        {view === "journal" && (
          <MonJournalCoach
            token={journalPerso.token}
            pret={journalPerso.pret}
            onRelie={journalPret}
            onDelie={async () => {
              try {
                await journalCoachPerso.delier();
                journalPerso.setToken(null);
              } catch (e) {
                setToast((e as Error).message);
              }
            }}
            onEvaluation={() => setEvalPerso(true)}
            onRetour={() => setView("matin")}
          />
        )}
        {view === "contacter" && <BbcContacter contacts={contacts} faits={faits} count={cdj.count} target={cdj.target} onContact={setContact} />}
        {view === "plus" && (
          <BbcPlus
            onGo={setView}
            onLiens={() => setLiensOuverts(true)}
            onEval={() => setNouveauMembre(true)}
            onClassic={(isAdmin || peutBasculer) && onSetPreview ? () => onSetPreview("classic") : undefined}
            clair={clair}
            onClair={() => setClair((v) => !v)}
          />
        )}
        {view === "scripts" && <BbcScripts settings={club?.settings ?? null} />}
        {view === "agenda" && <BbcAgenda key={rafraichir} userId={userId} coachName={coachName} club={club ?? null} onMembreCree={(clientId, prenom) => setApres({ clientId, prenom })} onSuiviClassique={versSuiviClassique} onPesee={venueALaPesee} />}
        {view === "coeurs" && <BbcCoeurs userId={userId} club={club ?? null} />}
        {view === "club" && <BbcClub userId={userId} club={club ?? null} />}
        {view === "clubs" && <BbcClubs clubs={clubs} isAdmin={isAdmin} onCreateClub={onCreateClub} onRenameClub={onRenameClub} />}
        {view === "formation" && <BbcFormation />}
        {view === "lexique" && <BbcLexique settings={club?.settings ?? null} />}
        {view === "crm" && (
          <BbcCrm
            key={rafraichir}
            userId={userId}
            club={club ?? null}
            onNouveauMembre={() => setNouveauMembre(true)}
            ouvrirId={membreOuvert}
            onGo={(v) => setView(v)}
            onCalerPesee={(m) => {
              const [prenom, ...reste] = m.name.trim().split(/\s+/);
              setCaler({
                membre: {
                  clientId: m.id,
                  prenom: prenom || m.name,
                  nom: reste.join(" "),
                  telephone: m.phone,
                  email: m.email,
                  coachId: m.ownerId ?? userId ?? "",
                  prochainRdv: m.nextFollowUp ?? null,
                },
              });
            }}
          />
        )}
        {view === "boites" && <BbcBoites userId={userId} club={club ?? null} />}
        {view === "messages" && <BbcMessages userId={userId} coachName={coachName} />}
        {view === "appels" && <BbcAppels userId={userId} club={club ?? null} />}
        {view === "prelancement" && <BbcPrelancement userId={userId} coachName={coachName} />}
        {view === "club100" && <BbcClub100 userId={userId} clubId={club?.id ?? null} />}
        {view === "reglages" && <BbcReglages club={club ?? null} onSaved={setReglagesFrais} />}
      </main>

      {/* ── La barre du bas (mobile) : Matin · Agenda · ＋ · Contacter · Membres ── */}
      <nav className="bbc-bottomnav bbc-mode" aria-label="Navigation">
        {BARRE.slice(0, 2).map((s) => (
          <BarreItem key={s.k} active={view === s.k} icone={s.icone} label={s.label} onClick={() => setView(s.k)} />
        ))}
        <button type="button" onClick={() => setGestes(true)} aria-label="Pointer, caler ou évaluer" style={barreBouton}>
          <span className="bbc-plus-rond" aria-hidden="true">＋</span>
          <span>Ajouter</span>
        </button>
        <BarreItem active={view === "contacter"} label="Contacter" onClick={() => setView("contacter")} icone={<Anneau fait={cdj.count} sur={cdj.target} />} badge={restants > 0 ? restants : undefined} />
        <BarreItem active={view === "crm"} icone="👥" label="Membres" onClick={() => setView("crm")} />
      </nav>

      {/* ── Feuilles ────────────────────────────────────────────────────── */}
      {gestes ? (
        <Feuille titre="Ajouter" sous="Les trois gestes du comptoir." onClose={() => setGestes(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <Geste icone="🔍" label="Pointer une visite" fort onClick={() => { setGestes(false); setView("club"); }} />
            <Geste icone="📅" label="Caler un RDV" onClick={() => { setGestes(false); setCaler({}); }} />
            <Geste icone="📝" label="Nouvelle évaluation" onClick={() => { setGestes(false); setNouveauMembre(true); }} />
          </div>
        </Feuille>
      ) : null}

      {caler ? (
        <CalerRdvSheet
          userId={userId}
          coachs={coachs}
          couleur={(id) => couleurCoach(id, coachs)}
          reglages={club?.settings?.discovery ?? null}
          jourInitial={caler.deplace ? cleJour(new Date(caler.deplace.debut)) : cleJour(new Date())}
          coachInitial={caler.deplace?.coachId ?? caler.membre?.coachId ?? userId ?? null}
          deplace={caler.deplace ?? null}
          membre={caler.membre ?? null}
          onClose={() => setCaler(null)}
          onFait={(_jour, _coach, info) => {
            const pesee = Boolean(caler.membre);
            const deplace = Boolean(caler.deplace);
            setCaler(null);
            setRafraichir((n) => n + 1);
            setView("agenda");
            // Un déplacement dit si la personne a été prévenue (22/09) ; le reste garde ses mots.
            setToast(pesee ? "Pesée calée ✓ — elle reçoit sa confirmation" : deplace && info ? info : "Rendez-vous calé ✓");
          }}
        />
      ) : null}

      {contact ? (
        <BbcContactSheet
          c={contact}
          coachPrenom={first}
          coachUserId={userId}
          fait={faits.has(contact.key)}
          onClose={() => setContact(null)}
          onReponseLead={repondreLead}
          onFaitMembre={faitMembre}
          onOuvrirLead={(lead) => { setContact(null); navigate(`/crm/leads/${lead.key}`); }}
        />
      ) : null}

      {liensOuverts ? (
        <BbcLiensTiroir coachName={coachName} settings={club?.settings ?? null} clubName={club?.name} onFermer={() => setLiensOuverts(false)} />
      ) : null}

      {nouveauMembre ? (
        <BbcNewMemberSheet
          userId={userId}
          coachName={coachName}
          club={club ?? null}
          onClose={() => setNouveauMembre(false)}
          onCreated={(clientId) => { setRafraichir((n) => n + 1); void membresApi.refetch(); setApres({ clientId }); }}
        />
      ) : null}

      {qualif ? (
        <QualifierRdvClubSheet
          rdv={qualif.rdv}
          etapeInitiale={qualif.etape}
          coachPrenom={prenomCoach(qualif.rdv.coachId)}
          couleur={couleurCoach(qualif.rdv.coachId, coachs)}
          maintenant={Date.now()}
          onClose={() => setQualif(null)}
          onMembre={() => { setMembrePour(qualif.rdv); setQualif(null); }}
          onQualifie={async (q) => {
            const res = await qualifierRdvClub(qualif.rdv, q);
            if (res.ok) {
              setQualif(null);
              setRafraichir((n) => n + 1);
              setToast(q.issue === "fait" ? "Rangé ✓ — son bilan s'ouvre" : "Rangé ✓");
              if (q.issue === "fait" && qualif.rdv.source !== "suivi") versSuiviClassique(qualif.rdv);
            }
            return res;
          }}
          onBilan={qualif.rdv.source === "suivi" && qualif.rdv.clientId ? () => { const r = qualif.rdv; setQualif(null); if (/carte/i.test(r.nature)) setBilan10({ clientId: r.clientId!, nom: `${r.prenom} ${r.nom ?? ""}`.trim() }); else if (/pes/i.test(r.nature)) venueALaPesee(r.clientId!); else navigate(`/clients/${r.clientId}/follow-up/new`); } : null}
          onFiche={qualif.rdv.source === "suivi" && qualif.rdv.clientId ? () => navigate(`/clients/${qualif.rdv.clientId}`) : null}
          onDeplacer={qualif.rdv.source === "prospect" || qualif.rdv.source === "suivi" || qualif.rdv.source === "reservation" ? () => { const r = qualif.rdv; setQualif(null); setCaler({ deplace: r }); } : null}
          onAnnuler={async () => {
            const r = qualif.rdv;
            const res = await annulerRdv(r);
            if (res.ok) {
              setQualif(null);
              setRafraichir((n) => n + 1);
              setToast("Rendez-vous annulé · personne n'a été prévenu");
              if (r.coachId) {
                const moi = coachs.find((c) => c.id === userId);
                void prevenirCoach(r.coachId, userId, "Rendez-vous annulé", `${nomComplet(r)} · ${libelleJour(new Date(r.debut))} ${heureDe(r.debut)}` + (moi ? ` · par ${moi.prenom}` : ""), prenomCoach(r.coachId));
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
          club={club ?? null}
          prefill={{ prenom: membrePour.prenom, nom: membrePour.nom ?? "", tel: contactDe(membrePour).tel, email: contactDe(membrePour).mail }}
          onClose={() => setMembrePour(null)}
          onCreated={(clientId) => {
            const r = membrePour;
            setMembrePour(null);
            if (r) void qualifierRdvClub(r, { issue: "membre", clientId }).then(() => setRafraichir((n) => n + 1));
            void membresApi.refetch();
            setApres({ clientId, prenom: r?.prenom });
          }}
        />
      ) : null}

      {evalPerso ? (
        <BbcNewMemberSheet
          userId={userId}
          coachName={coachName}
          club={club ?? null}
          prefill={{ prenom: first, nom: (coachName ?? "").trim().split(/\s+/).slice(1).join(" ") }}
          onClose={() => setEvalPerso(false)}
          onCreated={(clientId) => {
            void membresApi.refetch();
            // Sa fiche est à son prénom et à elle : on la relie tout de suite. Si elle a
            // tapé un autre prénom, « Mon journal » la lui proposera à la prochaine ouverture.
            void journalCoachPerso.relier(clientId).then(journalPret).catch(() => { /* proposée plus tard */ });
            setView("journal");
          }}
        />
      ) : null}

      {bilan10 && userId ? (
        <BbcBilan10 clientId={bilan10.clientId} clientName={bilan10.nom} coachUserId={userId} onClose={() => setBilan10(null)} onDone={() => setRafraichir((n) => n + 1)} />
      ) : null}

      {apres ? (
        <ApresCreation
          clientId={apres.clientId}
          prenom={apres.prenom || membresApi.members.find((m) => m.id === apres.clientId)?.name.trim().split(/\s+/)[0]}
          onClose={() => setApres(null)}
          onFiche={() => { const id = apres.clientId; setApres(null); ouvrirMembre(id); }}
        />
      ) : null}

      <Toast message={toast} />
    </div>
  );
}

// ── Les petites pièces de la coquille ─────────────────────────────────────

function NavItem({ active, icone, label, onClick, petit }: { active: boolean; icone?: string; label: string; onClick: () => void; petit?: boolean }) {
  return (
    <button
      type="button"
      className="bbc-navitem"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 12, width: "100%", border: 0, cursor: "pointer", textAlign: "left",
        padding: petit ? "8px 12px" : "12px 12px", borderRadius: 12,
        background: active ? "var(--ls-bbc-s2)" : "transparent",
        color: active ? "var(--ls-bbc-orange-text)" : "var(--ls-bbc-muted)",
        fontFamily: "var(--ls-bbc-font-body)", fontSize: petit ? 13 : 14, fontWeight: 600, transition: "background 0.15s, color 0.15s",
      }}
    >
      {icone ? <span aria-hidden="true" style={{ fontSize: 17, width: 20, textAlign: "center" }}>{icone}</span> : null}
      <span style={{ flex: 1 }}>{label}</span>
    </button>
  );
}

const barreBouton = {
  flex: 1, background: "transparent", border: 0, cursor: "pointer", display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 3,
  padding: "4px 2px", color: "var(--ls-bbc-hint)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 11, fontWeight: 600, position: "relative" as const,
};

function BarreItem({ active, icone, label, onClick, badge }: { active: boolean; icone: React.ReactNode; label: string; onClick: () => void; badge?: number }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? "page" : undefined} style={{ ...barreBouton, color: active ? "var(--ls-bbc-orange-text)" : "var(--ls-bbc-hint)" }}>
      <span aria-hidden="true" style={{ fontSize: 18, height: 24, display: "grid", placeItems: "center" }}>{icone}</span>
      {label}
      {badge ? <span style={{ position: "absolute", top: 0, right: 12, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, background: "var(--ls-bbc-orange)", color: "#fff", borderRadius: 999, padding: "1px 5px" }}>{badge}</span> : null}
    </button>
  );
}

/** L'anneau des 20 contacts, dans la barre. */
function Anneau({ fait, sur }: { fait: number; sur: number }) {
  const C = 2 * Math.PI * 9;
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="11" cy="11" r="9" fill="none" stroke="var(--ls-bbc-s3)" strokeWidth="3" />
      <circle cx="11" cy="11" r="9" fill="none" stroke="var(--ls-bbc-orange)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(C * Math.min(1, fait / sur)).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 11 11)" style={{ transition: "stroke-dasharray .5s cubic-bezier(.32,.72,0,1)" }} />
      <text x="11" y="13.5" textAnchor="middle" fontFamily="var(--ls-bbc-font-mono)" fontSize="7" fontWeight="700" fill="currentColor">{fait}</text>
    </svg>
  );
}

function Geste({ icone, label, fort, onClick }: { icone: string; label: string; fort?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className="bbc-pression"
      onClick={onClick}
      style={{
        display: "grid", gap: 6, justifyItems: "center", padding: "16px 8px 12px", borderRadius: 16, cursor: "pointer",
        border: fort ? "1px solid transparent" : "1px solid var(--ls-bbc-line2)", background: fort ? "var(--ls-bbc-grad)" : "var(--ls-bbc-s1)",
        color: fort ? "#fff" : "var(--ls-bbc-text)", boxShadow: fort ? "var(--ls-bbc-grad-ombre)" : undefined,
        fontFamily: "var(--ls-bbc-font-body)", fontSize: 12.5, fontWeight: 600, textAlign: "center",
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 26 }}>{icone}</span>
      {label}
    </button>
  );
}
