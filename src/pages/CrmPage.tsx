// =============================================================================
// CrmPage — CRM commun, tous les leads au même endroit (VIP-4 2026-06-10).
//
// Décision Thomas : « un pipeline pour tous — leads pro, bilan online,
// recos PWA, page VIP — juste avoir l'info d'où ça vient et la bonne route
// après. » + « plus pro avec les messages ».
//
// - Agrégation : hook useCrmLeads (online_bilans + prospect_leads +
//   client_referrals), statut normalisé new → contacted → qualified →
//   converted / lost.
// - Colonnes par statut (pattern LeadsKanban V1 : scroll horizontal +
//   select par card, pas de drag-drop).
// - Par card : badge source, « via X » pour les recos, message de premier
//   contact pro pré-rédigé selon la source (WhatsApp / SMS / copier),
//   relance douce, changement de statut.
// - Les bilans online gardent leur kanban détaillé (/clients?tab=leads)
//   pour la conversion en fiche client — lien direct sur la card.
//
// Accès : route protégée AppLayout, entrée sidebar « CRM ». RLS filtre par
// coach. Tokens var(--ls-*) uniquement.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { JargonTip } from "../components/ui/JargonTip";
import {
  computeCrmStats,
  CRM_SOURCE_META,
  CRM_STATUS_META,
  statusOptionsFor,
  useCrmLeads,
  type CrmLead,
  type CrmSource,
  type CrmStatus,
} from "../hooks/useCrmLeads";
import { buildCrmWhatsAppLink } from "../lib/crmMessages";
import { ProspectFormModal } from "../components/prospect/ProspectFormModal";
import { useCuriousLeads } from "../hooks/useCuriousLeads";
import { RdvBookingsWidget } from "../components/crm/RdvBookingsWidget";
// Étape « À conclure » (28/08) : un rendez-vous passé doit produire une réponse.
import { CrmAConclure, type CibleAConclure } from "../components/crm/CrmAConclure";
import { EFFET_ISSUE, type IssueRdv } from "../features/crm/aConclure";
import { useCoachRdvBookings } from "../hooks/useCoachRdvBookings";
import { useClubDiscoveryBookings } from "../hooks/useClubDiscoveryBookings";
import { useActiveClubId } from "../hooks/useActiveClubId";
import { rdvAConclure } from "../features/crm/aConclure";
import { setRdvBookingStatus } from "../services/sb/rdvBookingStatus";
import { ClubDiscoveryWidget } from "../components/crm/ClubDiscoveryWidget";
import { CrmBoiteArrivee } from "../components/crm/CrmBoiteArrivee";
import { CrmJaugeFiltre } from "../components/crm/CrmJaugeFiltre";
import { CrmListe } from "../components/crm/CrmListe";
import { CrmMenuLigne } from "../components/crm/CrmMenuLigne";
import { caseDuLead, compterParCase, demandeUnGeste, type CaseActive } from "../features/crm/caseLead";
import { CrmPanneauLead } from "../components/crm/CrmPanneauLead";
import { CrmPanneauFiltres } from "../components/crm/CrmPanneauFiltres";
import { clesDoublon, grouperParPersonne } from "../features/crm/cleDoublon";
import { fusionnerGroupe, type Fusion } from "../features/crm/fusionFiches";
import { etapeDuLead } from "../features/crm/etapeLead";
import { buildCrmWhatsAppLink as buildWa } from "../lib/crmMessages";
import {
  FILTRE_VIDE,
  lireVues,
  nbActifs as nbFiltresQualif,
  passe as passeQualif,
  type FiltreQualif,
  type VueSauvee,
} from "../features/crm/filtresQualification";
import { OPTIONS_DE_TRI, type SortKey } from "../components/crm/CrmLeadsListView";
import { Tabs } from "../components/ui/Tabs";
import { formatLeadDate as formatDate } from "../lib/leadDateFormat";
import { dateDeRetour, quandRevient, REPONSE_PAR_CLE, type Reponse } from "../features/crm/qualification";
import { FeuilleQualification } from "../features/crm/FeuilleQualification";

const STATUS_ORDER: CrmStatus[] = ["new", "contacted", "qualified", "converted", "lost"];

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// Le choix Liste / Pipeline, persisté : ouvrir une fiche puis revenir remonte
// la page, et sans mémoire on retombait toujours sur Liste — alors que le
// travail est sur le board (retour Thomas 21/08 : « c'est soit l'un ou
// l'autre »). localStorage et pas l'URL : c'est une préférence d'appareil, pas
// un état à partager par lien.
const VUE_MODE_CLE = "ls-crm-vue-mode";
function lireVueMode(): "list" | "pipeline" {
  try {
    const v = window.localStorage.getItem(VUE_MODE_CLE);
    return v === "pipeline" || v === "list" ? v : "list";
  } catch {
    return "list";
  }
}

export function CrmPage() {
  const { currentUser, users } = useAppContext();
  const { push: pushToast } = useToast();
  const navigate = useNavigate();
  const { leads, loading, error, refetch, qualifier, updateStatus, updateSource, accepter, setDormant, deleteLead } = useCrmLeads();
  // Vue : Actifs (pipeline ouvert) · Historique (convertis/perdus) · Endormis.
  const [view, setView] = useState<"active" | "historique" | "archived">("active");
  // Liste (défaut, type Attio) vs Pipeline (kanban existant) — chantier refonte
  // CRM 2026-07, demande Thomas « arrêter le kanban empilé comme vue principale ».
  // Persisté (cf. lireVueMode) : le choix survit à l'aller-retour vers une fiche.
  const [viewMode, setViewMode] = useState<"list" | "pipeline">(() => lireVueMode());
  useEffect(() => {
    try {
      window.localStorage.setItem(VUE_MODE_CLE, viewMode);
    } catch {
      // Navigation privée / stockage plein : le confort saute, pas la page.
    }
  }, [viewMode]);
  // Le filtre posé en tapant un segment de la jauge (CRM Board V2, lot 3).
  // Une étape OU le signal « à relancer », jamais les deux : deux filtres
  // cumulés sur une seule barre donnent une liste vide qu'on ne s'explique pas.
  // ⚠️ 28/08 — UNE SEULE NOTION DE CASE. L'ancien filtre comparait `l.status`
  // brut alors que la jauge, elle, comptait un entonnoir cumulé : taper
  // « Contacté 18 » rendait 7 lignes dont aucune contactée. On filtre
  // désormais avec `caseDuLead`, la fonction qui sert AUSSI à compter.
  const [caseFiltre, setCaseFiltre] = useState<CaseActive | null>(null);
  const isAdmin = currentUser?.role === "admin";

  // ── Filtre par ligne (2026-06-15) : par défaut chacun voit SES leads. Un
  // admin / référent (= a une downline) peut élargir à ligne 1, ligne 2, un
  // distri précis, ou tout. Empêche un membre (ex. Mandy) de voir les
  // prospects de son upline.
  const { line1Ids, line2Ids, downlineMembers, canFilterTeam } = useMemo(() => {
    const l1 = new Set<string>();
    const l2 = new Set<string>();
    const uid = currentUser?.id;
    if (uid) {
      for (const u of users ?? []) if (u.sponsorId === uid) l1.add(u.id);
      for (const u of users ?? []) if (u.sponsorId && l1.has(u.sponsorId)) l2.add(u.id);
    }
    const members = (users ?? [])
      .filter((u) => l1.has(u.id) || l2.has(u.id))
      .map((u) => ({ id: u.id, name: u.name, line: l1.has(u.id) ? 1 : 2 }))
      .sort((a, b) => a.line - b.line || a.name.localeCompare(b.name));
    return { line1Ids: l1, line2Ids: l2, downlineMembers: members, canFilterTeam: isAdmin || l1.size > 0 };
  }, [users, currentUser?.id, isAdmin]);

  // "me" | "l1" | "l2" | "all" | <userId>
  const [scope, setScope] = useState<string>("me");

  const [filterSource, setFilterSource] = useState<CrmSource | "all">("all");
  const [search, setSearch] = useState("");
  // Le volet lead docké (lot 4) : la carte cliquée. La navigation ↑↓ se fait
  // sur `ordreBoard`, la file dans l'ordre des colonnes.
  const [panneauLead, setPanneauLead] = useState<CrmLead | null>(null);
  // Le contact déposé, en attente de sa question. Tant qu'il est là, la feuille
  // « Et alors ? » est ouverte et rien n'a encore été écrit.
  const [qualifApresDrop, setQualifApresDrop] = useState<CrmLead | null>(null);
  // Wagon 2 chantier 3 : lead chaud → RDV agenda en 1 clic (prospect pré-rempli).
  const [agendaLead, setAgendaLead] = useState<CrmLead | null>(null);
  // Le « ⋯ » d'une ligne : tout ce qui n'est pas joindre la personne.
  const [menuLead, setMenuLead] = useState<CrmLead | null>(null);
  // Wagon 3 chantier 6 : panneau stats par source (toggle).
  const [showStats, setShowStats] = useState(false);
  // ONLINE-B : section « Curieux » (commencé le bilan, pas fini) — repliable.
  const { curious, completionRate, loading: curiousLoading } = useCuriousLeads();
  const [showCurious, setShowCurious] = useState(false);
  // Tout ce qui n'est pas « qui dois-je appeler aujourd'hui » passe derrière ce
  // panneau. Mesure du 16/08 : 24 contrôles à traverser avant d'atteindre le
  // premier lead, dont 5 pastilles de compteur qui ne sont même pas cliquables.
  // Rien n'est supprimé — un tap et tout revient.
  const [filtresOuverts, setFiltresOuverts] = useState(false);
  // Le tiroir de qualification (CRM Board V2, lot 5), séparé du panneau
  // périmètre/sources.
  const [qualifOuvert, setQualifOuvert] = useState(false);
  // Les questions qui qualifient (CRM Board V2, lot 5) : température, signaux
  // d'alerte, objectif. Et les vues sauvées, en localStorage — une vue est un
  // confort personnel, propre à l'appareil sur lequel on travaille.
  const [qualif, setQualif] = useState<FiltreQualif>(FILTRE_VIDE);
  const [vues, setVues] = useState<VueSauvee[]>(() => lireVues());
  // Les deux blocs de rendez-vous étaient AU-DESSUS des filtres, donc au-dessus
  // de la liste. Quelqu'un qui a réservé sur le site du club y figurait ET
  // figurait plus bas dans la liste : le même nom, deux fois sur un écran.
  // Repliés, pas retirés : « Confirmer » n'existe nulle part ailleurs.
  // Ouvert à l'arrivée (Mélanie, 19/08 : « pas caché quand on ouvre la page »).
  // Il l'était pour garder le premier écran court — mais c'est d'ici que part
  // l'email d'acceptation, et un bloc replié se traduit par des RDV oubliés.
  //
  // ⚠️ 26/08 — OUVERT SUR GRAND ÉCRAN, REPLIÉ SUR TÉLÉPHONE.
  // Thomas, capture à l'appui : « trop d'info sur mobile, c'est affreux ».
  // Il devait faire défiler NEUF grosses cartes de rendez-vous avant
  // d'atteindre ses leads — son vrai travail. Sur un écran de 390 px, ces
  // blocs ne cadrent pas le premier écran : ils le confisquent.
  // Le souhait de Mélanie (« pas caché quand on ouvre la page ») reste servi
  // sur ordinateur, là où la place existe.
  const [rdvOuverts, setRdvOuverts] = useState(() => {
    try {
      return window.innerWidth >= 768;
    } catch {
      return true;
    }
  });
  // Le tri vit désormais chez le parent : il a rejoint le panneau, et sa
  // valeur sert aussi à savoir si un réglage est actif.
  const [sortKey, setSortKey] = useState<SortKey>("echeance");

  useEffect(() => {
    document.title = "La Base 360 — CRM";
  }, []);

  const stats = useMemo(() => computeCrmStats(leads), [leads]);

  // Wagon 3 chantier 7 : anti-doublon. Index des téléphones déjà clients +
  // détection des leads en double dans le pipeline.
  //
  // ⚠️ 24/08 — la normalisation maison était une mine. `(s).replace(/\D/g,"")`
  // ne vérifiait pas qu'il s'agissait d'un téléphone : appliquée à une adresse,
  // elle n'en gardait que les chiffres (« sarah123456@gmail.com » → « 123456 »,
  // six chiffres, seuil atteint). Deux inconnus partageant six chiffres dans
  // leur adresse étaient déclarés doublons. Vérifié en base le 24/08 : pas
  // encore d'explosion, mais c'est le bug « Manon Legrand héritait du RDV de
  // Manon PERRIN ». On passe sur la clé unique et testée.


  const msgCtx = useMemo(() => {
    const slug = normalizeSlug((currentUser?.name ?? "").split(/\s+/)[0] ?? "");
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return {
      coachFirstName: (currentUser?.name ?? "").split(/\s+/)[0] || "Ton coach",
      bilanUrl: `${origin}/bilan-online/${slug}`,
      vipUrl: `${origin}/vip/${slug}`,
    };
  }, [currentUser?.name]);

  // ⚠️ 28/08 — UN SEUL PRÉDICAT, DEUX USAGES.
  // La jauge comptait `leadsEntonnoir` (tout le périmètre, sans filtre) pendant
  // que la liste, elle, appliquait vue + périmètre + source + recherche.
  // Vérifié sur dev : la jauge annonçait « 12 à relancer » et le filtre en
  // affichait 5 — les leads de l'équipe étaient comptés mais pas montrés.
  // Le prédicat vit désormais ici, en un seul endroit, et la jauge s'en sert
  // avec `avecCase = false` : elle décrit EXACTEMENT ce qu'un tap produira.
  const passeFiltres = useCallback(
    (l: CrmLead, avecCase: boolean): boolean => {
        // Un lead pas encore accepté n'est NULLE PART dans l'entonnoir (CRM
        // Board V2, lot 2) : ni dans une colonne, ni dans l'historique, ni
        // dans les compteurs. Il attend dans la boîte d'arrivée, au-dessus.
        // Sans cette ligne il apparaîtrait aux deux endroits, et « rien
        // n'entre sans ton geste » ne voudrait plus rien dire.
        if (l.enAttente) return false;

        // Répartition par vue :
        //   - Endormis  → uniquement les archivés (dormant)
        //   - Historique→ non-dormant + statut clos (converti / perdu)
        //   - Actifs    → non-dormant + pipeline ouvert (nouveau/contacté/qualifié)
        const closed = l.status === "converted" || l.status === "lost";
        if (l.dormant) {
          if (view !== "archived") return false;
        } else {
          if (view === "archived") return false;
          if (view === "historique" && !closed) return false;
          if (view === "active" && closed) return false;
        }
        // Périmètre par ligne. Sans droit d'équipe → toujours "moi".
        const effScope = canFilterTeam ? scope : "me";
        const owner = l.ownerUserId;
        if (effScope === "me") {
          // Admin : voit aussi les leads NON attribués (coach null) — sinon un
          // lien /bilan-online sans slug donne un lead invisible.
          // + Campagne club « colis » (funnel /colis, référent Mélanie par
          //   défaut) : visible sous « Moi » pour TOUS les admins — décision
          //   Thomas 2026-07-24, les 2 admins pilotent la même campagne.
          const isMine = owner === currentUser?.id || (isAdmin && !owner) || (isAdmin && l.source === "colis");
          if (!isMine) return false;
        } else if (effScope === "l1") {
          if (!owner || !line1Ids.has(owner)) return false;
        } else if (effScope === "l2") {
          if (!owner || !line2Ids.has(owner)) return false;
        } else if (effScope === "all") {
          /* admin : aucun filtre propriétaire */
        } else {
          if (owner !== effScope) return false; // distributeur précis
        }
        if (filterSource !== "all" && l.source !== filterSource) return false;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          if (
            !l.firstName.toLowerCase().includes(q) &&
            !(l.viaName ?? "").toLowerCase().includes(q) &&
            !(l.contact ?? "").toLowerCase().includes(q)
          )
            return false;
        }
        // Le segment de jauge tapé. `avecCase = false` sert à calculer ce que
        // la jauge ANNONCE : la population telle qu'elle serait sans son
        // propre filtre. Sans ça, la jauge décrirait un monde et la liste un
        // autre — le bug qu'on est en train de supprimer.
        if (avecCase && caseFiltre && caseDuLead(l) !== caseFiltre) return false;

        // Les questions de qualification (température, signaux, objectif).
        if (!passeQualif(l, qualif)) return false;

        return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, canFilterTeam, scope, currentUser?.id, isAdmin, line1Ids, line2Ids, filterSource, search, caseFiltre, qualif],
  );

  const filtered = useMemo(() => leads.filter((l) => passeFiltres(l, true)), [leads, passeFiltres]);

  /** La population que la jauge décrit : tout sauf son propre filtre. */
  const baseJauge = useMemo(() => leads.filter((l) => passeFiltres(l, false)), [leads, passeFiltres]);

  // ── Une personne = une ligne (2026-08-12) ─────────────────────────────────
  //
  // Fatiha a rempli le tunnel /reserver deux fois, à 10 h 12 puis à 11 h 44 :
  // deux fiches dans le CRM pour une seule personne. Le repère ⚠️ existait
  // déjà, mais il SIGNALAIT sans regrouper — et seulement sur le téléphone.
  //
  // ── MISE À JOUR DU 24/08 : on ne choisit plus, on RÉUNIT ──────────────────
  //
  // La version du 12/08 gardait « la plus récente » et repliait les autres —
  // donc tout ce qu'elles portaient devenait invisible. Mesure en base : la
  // fiche club de Florian et son bilan en ligne sont arrivés à UNE MINUTE
  // d'écart ; si le bilan était arrivé en premier, ses 3 objectifs et sa
  // motivation seraient restés cachés derrière un « 2 fiches ».
  //
  // Désormais : `grouperParPersonne` (téléphone ET adresse, transitif) puis
  // `fusionnerGroupe` (chaque champ pris là où il est le plus utile). Rien
  // n'est supprimé en base — c'est une VUE, réversible.
  //
  // Le regroupement se fait APRÈS le filtrage : filtrer sur « Colis » ne doit
  // pas faire disparaître une fiche colis parce qu'elle serait absorbée par
  // une fiche d'une autre source.
  const { regroupes, doublonsDe } = useMemo(() => {
    const principaux: CrmLead[] = [];
    const doublons = new Map<string, CrmLead[]>();
    const fusions = new Map<string, Fusion<CrmLead>>();
    for (const groupe of grouperParPersonne(filtered)) {
      const f = fusionnerGroupe(groupe);
      principaux.push(f.vue);
      if (f.autres.length > 0) {
        doublons.set(f.vue.key, f.autres);
        fusions.set(f.vue.key, f);
      }
    }
    principaux.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { regroupes: principaux, doublonsDe: doublons, fusionsDe: fusions };
  }, [filtered]);

  // Le seul chiffre qui mérite d'être en haut de l'écran : combien de gens
  // attendent un geste AUJOURD'HUI. Les cinq compteurs par statut (Nouveaux,
  // Contactés, Qualifiés…) ne disaient pas quoi faire — ils sont descendus
  // dans « Plus de filtres ».
  // ⚠️ 28/08 — c'était un QUATRIÈME compteur, sur encore une autre règle
  // (`groupeDe(...) === "aujourdhui"`). Il annonçait « 11 personnes
  // t'attendent » au-dessus d'une section « À faire aujourd'hui · 5 ».
  // Il lit maintenant le même compte que la section : `capDuJour.total`.

  /**
   * Le cap du jour (CRM Board V2, lot 4). La maquette met en tête de la file
   * « 11 gestes · ≈ 25 min — commence en haut ».
   *
   * ⚠️ On garde le décompte et on ABANDONNE la durée : rien en base ne dit
   * combien de temps prend un appel. « ≈ 25 min » serait un chiffre inventé —
   * et un coach qui se fie à une estimation fausse organise sa matinée dessus.
   *
   * À la place, la ventilation par zone : elle dit la même chose (l'ampleur)
   * en n'affirmant que du mesuré, et elle annonce l'ordre dans lequel la liste
   * est rangée juste en dessous.
   */
  // ⚠️ 28/08 — L'EN-TÊTE DISAIT AUTRE CHOSE QUE LA LISTE.
  // Il comptait avec `groupeDe(...) === "aujourdhui"` et sa propre définition
  // de « jamais contacté » : sur dev, il annonçait « 11 personnes t'attendent,
  // 5 à qui personne n'a parlé » au-dessus d'une jauge qui affichait
  // « 0 Nouveau » et d'une section « À faire aujourd'hui · 5 ». Trois chiffres,
  // trois calculs. Il lit désormais la MÊME règle que la section.
  const capDuJour = useMemo(() => {
    const ici = regroupes.filter((l) => demandeUnGeste(l));
    const jamais = ici.filter((l) => caseDuLead(l) === "nouveau").length;
    const retard = ici.filter((l) => caseDuLead(l) === "relance").length;
    return { total: ici.length, jamais, retard };
  }, [regroupes]);

  // Combien de réglages ne sont PAS à leur valeur par défaut : le badge du
  // Compteurs cohérents avec la vue Actifs (endormis hors flux) ET le périmètre.
  const counts = useMemo(() => {
    const by: Record<CrmStatus, number> = { new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 };
    const effScope = canFilterTeam ? scope : "me";
    for (const l of leads) {
      if (l.dormant) continue;
      const owner = l.ownerUserId;
      if (effScope === "me") { if (!(owner === currentUser?.id || (isAdmin && !owner) || (isAdmin && l.source === "colis"))) continue; }
      else if (effScope === "l1") { if (!owner || !line1Ids.has(owner)) continue; }
      else if (effScope === "l2") { if (!owner || !line2Ids.has(owner)) continue; }
      else if (effScope !== "all") { if (owner !== effScope) continue; }
      by[l.status] += 1;
    }
    return by;
  }, [leads, scope, canFilterTeam, currentUser?.id, isAdmin, line1Ids, line2Ids]);
  // La jauge d'entonnoir comptait les DOUBLONS : elle lisait `leads` brut,
  // alors que la liste, elle, regroupe. claire y pesait 3 personnes et Manon 3
  // — mesuré le 24/08 : 8 lignes en trop sur 42, soit ~19 % de gonflement sur
  // tous les chiffres du haut de page. Elle lit désormais le même monde que le
  // reste de l'écran.
  const leadsEntonnoir = useMemo(
    () => grouperParPersonne(leads.filter((l) => !l.enAttente)).map((g) => fusionnerGroupe(g).vue),
    [leads],
  );

  // Les compteurs de la jauge. Ils lisent la population dédoublonnée du
  // périmètre — et NON `filtered`, sinon la jauge se recalculerait sur son
  // propre filtre et afficherait 100 % partout dès qu'on tape un segment.
  const jaugeRegroupee = useMemo(
    () => grouperParPersonne(baseJauge).map((g) => fusionnerGroupe(g).vue),
    [baseJauge],
  );
  const comptesParCase = useMemo(() => compterParCase(jaugeRegroupee), [jaugeRegroupee]);

  // La boîte d'arrivée : ce qui attend un geste, le plus récent d'abord.
  // On ne la filtre PAS par la recherche ni par les onglets — c'est une file
  // d'attente, pas une vue. La masquer derrière un filtre reviendrait à
  // laisser des gens à la porte sans le savoir.
  const enAttente = useMemo(
    () =>
      leads
        .filter((l) => l.enAttente && !l.dormant)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [leads],
  );

  const dormantCount = useMemo(() => leads.filter((l) => l.dormant).length, [leads]);

  // ── Le board V2 : 5 colonnes par ZONE (CRM Board V2, lot 3) ──────────────
  // « À relancer » n'est pas un statut mais un DÉRIVÉ (relanceDue) — comme dans
  // la jauge. Un lead à relancer va dans cette colonne quelle que soit son
  // étape réelle. Converti/perdu/endormi ne sont pas des colonnes ouvertes.
  const BOARD_COLONNES: Array<{ cle: string; label: string; teinte: string; drop: CrmStatus | null }> = [
    { cle: "new", label: "Nouveau", teinte: "var(--ls-lime)", drop: "new" },
    { cle: "contacted", label: "Contacté", teinte: "var(--ls-teal)", drop: "contacted" },
    { cle: "relance", label: "À relancer", teinte: "var(--ls-coral)", drop: null },
    { cle: "qualified", label: "RDV calé", teinte: "var(--ls-purple)", drop: "qualified" },
    { cle: "converted", label: "Converti", teinte: "var(--ls-amber)", drop: null },
  ];
  const colonneDe = (l: CrmLead): string => {
    if (l.status === "converted") return "converted";
    if (l.status === "lost" || l.dormant) return "hors";
    // ⚠️ 25/08 — le board ne regardait QUE `status`, jamais le rendez-vous.
    // Ghislaine, Amandine et Cassandre avaient un créneau CONFIRMÉ le jour même
    // et s'affichaient en « Nouveau », parce que leur colonne `status` en base
    // était restée à `new`. Pendant ce temps la vue Liste, elle, les rangeait
    // bien dans « Rendez-vous calés » — `zones.ts` regarde le RDV. Le même lead
    // était donc à deux endroits différents selon la vue qu'on ouvrait.
    //
    // On reprend EXACTEMENT la règle de `zoneDe` (features/crm/zones.ts), y
    // compris son ordre : un rendez-vous passe AVANT l'échéance de relance —
    // quelqu'un qui a un créneau vendredi n'est pas « à relancer » parce qu'une
    // date de rappel traîne, il faut le recevoir.
    if (etapeDuLead(l) === "qualified") return "qualified";
    if (l.relanceDue) return "relance";
    return l.status; // new | contacted
  };
  // Combien de rendez-vous attendent : sert au libellé du bloc replié, pour
  // qu'un repli ne cache jamais un chiffre.
  //
  // ⚠️ 27/08 — c'était `l.rdv && !l.rdv.passe`, qui donnait 0 alors que Thomas
  // avait 6 RDV calés : `l.rdv` n'est pas peuplé pour les résas du tunnel club.
  // Un bloc replié qui annonce « 0 à venir » au-dessus de RDV bien réels, c'est
  // pire que pas de chiffre. On prend EXACTEMENT le compte « RDV calé » de la
  // jauge juste au-dessus (`etapeDuLead === "qualified"` sur les leads
  // dédoublonnés) : le bloc et la jauge affichent alors le même nombre.
  const rdvAVenirCount = useMemo(
    () => leadsEntonnoir.filter((l) => !l.dormant && etapeDuLead(l) === "qualified").length,
    [leadsEntonnoir],
  );

  // La file du board mise à plat, dans l'ordre des colonnes — support des
  // flèches ↑↓ du volet.
  const ordreBoard = useMemo(() => {
    const parCle: Record<string, CrmLead[]> = {};
    for (const l of regroupes) { const c = colonneDe(l); (parCle[c] ??= []).push(l); }
    return BOARD_COLONNES.flatMap((c) => parCle[c.cle] ?? []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regroupes]);

  // WhatsApp direct depuis la carte du board (variante en retard). Message de
  // relance douce ; les templates fins vivent dans la fiche.
  // ⚠️ 28/08 — IL N'Y AVAIT AUCUN MOYEN D'APPELER. Vérifié en base : les 25
  // leads ont TOUS un téléphone, et la moitié des lignes disent « appelé·e,
  // pas de réponse — tu devais rappeler il y a 2 jours ». L'action que la fiche
  // réclamait était la seule que l'écran ne proposait pas : zéro lien `tel:`
  // dans tout le CRM, ni sur ordinateur ni sur téléphone.
  function appeler(lead: CrmLead) {
    const brut = lead.phone ?? (lead.contactIsPhone ? lead.contact : null);
    if (!brut) return;
    // On garde le « + » international et les chiffres, rien d'autre : les
    // espaces et points d'un numéro saisi à la main cassent le lien tel:.
    const numero = brut.replace(/[^\d+]/g, "");
    if (!numero) return;
    window.location.href = `tel:${numero}`;
  }

  function ouvrirWhatsApp(lead: CrmLead) {
    const msg = `Bonjour ${lead.firstName}, ${msgCtx.coachFirstName} de La Base 360. Je reviens vers toi 🙂`;
    const url = buildWa(lead.contact, msg);
    if (url) window.open(url, "_blank", "noopener");
  }
  const historiqueCount = useMemo(
    () => leads.filter((l) => !l.dormant && (l.status === "converted" || l.status === "lost")).length,
    [leads],
  );

  const sourcesPresent = useMemo(() => {
    const set = new Set<CrmSource>();
    for (const l of leads) set.add(l.source);
    return set;
  }, [leads]);

  async function handleStatusChange(lead: CrmLead, next: CrmStatus) {
    const err = await updateStatus(lead, next);
    if (err) {
      pushToast({ tone: "warning", title: "Statut non enregistré", message: err });
    }
  }

  // « Et alors ? » depuis la liste. La confirmation NOMME la date de retour :
  // c'est ce qui rend le geste sûr — on voit tout de suite ce qu'on vient de
  // caler, sans avoir à rouvrir la fiche.
  async function handleQualifier(lead: CrmLead, reponse: Reponse, enLot = false) {
    const err = await qualifier(lead, reponse);
    if (err) {
      pushToast({ tone: "warning", title: "Qualification non enregistrée", message: err });
      return;
    }
    // En lot, on se tait : cinq personnes cochées empilaient cinq bandeaux.
    // La barre dit « Enregistrement… » puis disparaît, et les lignes changent
    // de zone sous les yeux — c'est déjà la preuve que c'est passé. Les échecs,
    // eux, parlent toujours.
    if (enLot) return;
    const due = dateDeRetour(reponse, new Date());
    pushToast({
      tone: "success",
      title: `${lead.firstName} · ${reponse.titre}`,
      message: due
        ? `Revient ${quandRevient(due, new Date())} — tu n'as rien à noter.`
        : reponse.quand,
    });
  }

  // ── ÉTAPE « À CONCLURE » (28/08) ──────────────────────────────────────────
  // Mesuré en base ce jour-là : 5 rendez-vous encore « confirmed » alors que
  // leur créneau était passé, et UN SEUL `honored` sur 31. Rien ne posait la
  // question, donc personne n'y répondait, et ces gens ne revenaient dans
  // aucune file. Ce bloc la pose, en haut, et ne descend pas avant réponse.
  //
  // ⚠️ IL FAUT LES DEUX SOURCES. Vérifié en base le 28/08 : sur les 3 rendez-vous
  // passés non soldés, DEUX portaient un `club_id` (Marie Rose, Manon) et le
  // troisième n'était pas rattaché à Thomas. En ne lisant que les rendez-vous
  // du coach (`club_id is null`), ce bloc serait resté VIDE — la fonctionnalité
  // aurait eu l'air livrée sans rien montrer.
  const { aConclure: rdvCoach, reload: rechargerCoach } = useCoachRdvBookings(currentUser?.id ?? null);
  const clubIdActif = useActiveClubId();
  const { bookings: rdvClub, reload: rechargerClub } = useClubDiscoveryBookings(
    isAdmin ? clubIdActif : null,
  );

  const ciblesAConclure: CibleAConclure[] = useMemo(() => {
    const duCoach = rdvCoach.map((b) => ({
      id: b.id,
      slotStart: b.slot_start,
      status: b.status,
      nom: `${b.first_name ?? ""} ${b.last_name ?? ""}`.trim() || "Sans nom",
      detail: b.mode === "visio" ? "visio" : "présentiel",
      contact: b.contact,
    }));
    // Le hook du club remonte déjà les 14 derniers jours non soldés : on lui
    // applique la MÊME règle qu'au coach plutôt qu'un second filtre maison.
    const duClub = rdvAConclure(
      rdvClub.map((b) => ({
        id: b.id,
        slotStart: b.slot_start,
        status: b.status,
        nom: `${b.first_name ?? ""} ${b.last_name ?? ""}`.trim() || "Sans nom",
        detail: b.objectif ?? "découverte du club",
        contact: b.contact,
      })),
      new Date(),
    );
    // Une même personne ne peut pas apparaître deux fois : on dédoublonne par
    // identifiant de rendez-vous (les deux requêtes peuvent se recouvrir).
    const vus = new Set<string>();
    return [...duCoach, ...duClub].filter((c) => {
      if (vus.has(c.id)) return false;
      vus.add(c.id);
      return true;
    });
  }, [rdvCoach, rdvClub]);

  const rechargerRdv = async () => {
    await Promise.all([rechargerCoach(), rechargerClub()]);
  };

  async function handleConclure(cible: CibleAConclure & { contact?: string | null }, issue: IssueRdv) {
    const effet = EFFET_ISSUE[issue];

    // 1. Solder le rendez-vous. On passe par le chemin unique.
    const { error } = await setRdvBookingStatus(cible.id, effet.statutRdv);
    if (error) {
      pushToast({
        tone: "warning",
        title: "Rendez-vous non rangé",
        message: error instanceof Error ? error.message : "Droits insuffisants ?",
      });
      return;
    }

    // 2. Retrouver la personne dans le CRM. On réutilise l'appariement du
    //    dédoublonnage — `contact = phone || email` a déjà coûté assez cher.
    const cles = clesDoublon({ contact: cible.contact ?? null });
    const lead = cles.length
      ? leads.find((l) => clesDoublon(l).some((k) => cles.includes(k)))
      : undefined;

    // 3. La renvoyer dans la file avec son échéance (J+2 / J+7), ou la sortir.
    if (effet.reponseLead && lead) {
      await handleQualifier(lead, REPONSE_PAR_CLE[effet.reponseLead]);
    } else if (effet.sortDuCrm && lead) {
      // « Elle démarre » : on ouvre la conversion — c'est elle qui crée la
      // fiche cliente. On ne l'écrit pas ici en double.
      navigate(`/crm/leads/${lead.key}?convert=1`);
    } else {
      // Aucun lead retrouvé : le rendez-vous est rangé quand même, mais on le
      // DIT — un succès muet ferait croire que la relance est posée.
      pushToast({
        tone: effet.reponseLead ? "warning" : "success",
        title: `${cible.nom} · ${effet.libelle}`,
        message: effet.reponseLead
          ? "Rendez-vous rangé, mais aucune fiche CRM ne correspond — pense à la relancer à la main."
          : "Rendez-vous rangé.",
      });
    }

    await rechargerRdv();
  }

  async function handleSourceChange(lead: CrmLead, next: CrmSource) {
    const err = await updateSource(lead, next);
    if (err) pushToast({ tone: "warning", title: "Source non modifiée", message: err });
    else pushToast({ tone: "success", title: "Source mise à jour", message: CRM_SOURCE_META[next].label });
  }

  async function handleDormant(lead: CrmLead, value: boolean) {
    const err = await setDormant(lead, value);
    pushToast(
      err
        ? { tone: "warning", title: "Action impossible", message: err }
        : { tone: "success", title: value ? "Lead endormi 💤" : "Lead réveillé", message: lead.firstName },
    );
  }

  async function handleDelete(lead: CrmLead) {
    if (typeof window !== "undefined" && !window.confirm(`Supprimer définitivement ${lead.firstName} ? Cette action est irréversible.`)) {
      return;
    }
    const err = await deleteLead(lead);
    pushToast(
      err
        ? { tone: "warning", title: "Suppression impossible", message: err }
        : { tone: "success", title: "Lead supprimé", message: lead.firstName },
    );
  }


  async function copyMessage(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      pushToast({ tone: "success", title: "Message copié", message: "Colle-le où tu veux." });
    } catch {
      pushToast({ tone: "warning", title: "Copie impossible", message: "" });
    }
  }

  // ── CRM Board V2, lot 1 : deux colonnes (maquette validée 21/08) ─────────
  // Arrivées à gauche, entonnoir à droite. Fini l'empilement. La colonne gauche
  // n'apparaît QUE s'il y a des arrivées — sinon l'entonnoir prend 100 %, comme
  // avant (aucune régression quand la boîte est vide).
  // ⚠️ Responsive PAR CLASSE, jamais par style en ligne : un style en ligne bat
  //    une media query (piège payé le 18/08 sur la barre de relances).
  const aDesArrivees = enAttente.length > 0;

  return (
    <div style={pageWrap}>
      <style>{CRM_COLS_CSS}</style>
      <div className={aDesArrivees ? "crm-cols" : undefined}>
        {aDesArrivees ? (
          <aside className="crm-aside">
            <CrmBoiteArrivee
              leads={enAttente}
              onAccepter={accepter}
              onRefuser={(lead) => setDormant(lead, true)}
              onOuvrir={(lead) => navigate(`/crm/leads/${lead.key}`)}
            />
          </aside>
        ) : null}
        <div className={aDesArrivees ? "crm-droite" : undefined}>
      {/* En-tête. Le pavé de présentation (« Bilan online, Club VIP,
          opportunité… ») et les cinq compteurs par statut occupaient le premier
          écran entier sans jamais dire quoi faire. Il reste le titre et le seul
          chiffre qui appelle un geste. */}
      <header style={{ margin: "4px 0 2px" }}>
        <h1 style={heroTitle}>Tes contacts<JargonTip term="crm" /></h1>
        <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--ls-text-muted)" }}>
          {loading
            ? "Chargement…"
            : capDuJour.total === 0
              ? "Personne n'attend de toi aujourd'hui. 👌"
              : `${capDuJour.total} personne${capDuJour.total > 1 ? "s" : ""} t'${capDuJour.total > 1 ? "attendent" : "attend"} aujourd'hui.`}
        </p>
        {!loading && capDuJour.total > 0 ? (
          <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--ls-text-muted)" }}>
            {[
              capDuJour.jamais > 0 ? `${capDuJour.jamais} à qui personne n'a parlé` : null,
              capDuJour.retard > 0 ? `${capDuJour.retard} en retard` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "rangés du plus urgent au moins pressé"}
            {capDuJour.jamais > 0 || capDuJour.retard > 0 ? " — commence en haut." : "."}
          </p>
        ) : null}
      </header>

      {/* ═══ À CONCLURE — tout en haut, avant tout le reste ══════════════════
          Un rendez-vous passé sans réponse est un trou : la personne ne revient
          dans aucune file. Ce bloc passe DEVANT la jauge et les rendez-vous à
          venir, et disparaît de lui-même dès que tout est soldé. */}
      <CrmAConclure
        cibles={ciblesAConclure}
        maintenant={new Date()}
        onRepondre={(cible, issue) => handleConclure(cible, issue)}
      />

      {/* L'entonnoir en une ligne. Il lit `leads` — la population entière du
          périmètre — et NON `filtered` : une jauge qui se recalcule sur son
          propre filtre afficherait 100 % partout dès qu'on tape un segment. */}
      <CrmJaugeFiltre
        comptes={comptesParCase}
        filtre={caseFiltre}
        onFiltrer={setCaseFiltre}
      />

      {/* Les deux blocs de rendez-vous, repliés. Ils restent à un tap — c'est
          d'ici que part l'email d'acceptation, qui n'existe nulle part
          ailleurs. */}
      <div style={{ margin: "14px 0 0" }}>
        <button
          type="button"
          onClick={() => setRdvOuverts((v) => !v)}
          aria-expanded={rdvOuverts}
          style={replisBtn}
        >
          {/* Le compte s'affiche quand c'est replié : un bloc fermé qui ne dit
              pas ce qu'il contient, c'est un rendez-vous oublié. */}
          🗓️ Rendez-vous {rdvOuverts ? "" : `· ${rdvAVenirCount} à venir `}
          {rdvOuverts ? "▲" : "▼"}
        </button>
        {rdvOuverts ? (
          <div style={{ marginTop: 10 }}>
            <RdvBookingsWidget />
            <ClubDiscoveryWidget />
          </div>
        ) : null}
      </div>

      {error ? (
        <div style={errorBanner}>
          ⚠️ Une source n'a pas pu charger : {error}
          <button type="button" onClick={() => void refetch()} style={retryBtn}>
            Réessayer
          </button>
        </div>
      ) : null}

      {/* LA barre. Trois choses seulement : à qui appartiennent les leads, la
          recherche, et une porte vers tout le reste. */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "14px 0 12px" }}>
        {canFilterTeam ? (
          <>
            <button type="button" onClick={() => setScope("me")} style={sourceChip(scope === "me", "var(--ls-teal)")}>
              👤 Moi
            </button>
            <button
              type="button"
              onClick={() => setScope(isAdmin ? "all" : "l1")}
              style={sourceChip(scope !== "me", "var(--ls-teal)")}
            >
              Mon équipe
            </button>
          </>
        ) : null}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Un nom, un numéro…"
          style={searchInput}
          aria-label="Rechercher un lead"
        />
        {/* Les questions qui qualifient : dans un tiroir (lot 5), plus dans
            l'empilement. */}
        <button
          type="button"
          onClick={() => setQualifOuvert(true)}
          style={sourceChip(nbFiltresQualif(qualif) > 0, "var(--ls-coral)")}
        >
          ⋯ Filtres{nbFiltresQualif(qualif) > 0 ? ` · ${nbFiltresQualif(qualif)}` : ""}
        </button>
        {/* Périmètre & sources : l'analytique, séparée du travail de qualif.
            Neutre plutôt que violet (mesuré 4,08:1 en violet sur fond teinté). */}
        <button
          type="button"
          onClick={() => setFiltresOuverts((v) => !v)}
          aria-expanded={filtresOuverts}
          style={sourceChip(filtresOuverts, "var(--ls-text)")}
        >
          📊 Périmètre & sources {filtresOuverts ? "▲" : "▼"}
        </button>
      </div>

      {/* ── Tout le reste, replié ────────────────────────────────────────── */}
      {filtresOuverts ? (
      <div style={panneauFiltres}>
      {/* Filtre par ligne (admin / référent uniquement) */}
      {canFilterTeam && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "0 0 12px" }}>
          <span style={{ fontSize: 12, color: "var(--ls-text-muted)", fontWeight: 600 }}>Périmètre :</span>
          <button type="button" onClick={() => setScope("me")} style={sourceChip(scope === "me", "var(--ls-teal)")}>👤 Moi</button>
          {line1Ids.size > 0 && (
            <button type="button" onClick={() => setScope("l1")} style={sourceChip(scope === "l1", "var(--ls-teal)")}>
              Ligne 1 ({line1Ids.size})
            </button>
          )}
          {isAdmin && line2Ids.size > 0 && (
            <button type="button" onClick={() => setScope("l2")} style={sourceChip(scope === "l2", "var(--ls-teal)")}>
              Ligne 2 ({line2Ids.size})
            </button>
          )}
          {isAdmin && (
            <button type="button" onClick={() => setScope("all")} style={sourceChip(scope === "all", "var(--ls-purple)")}>
              Tous
            </button>
          )}
          {(isAdmin ? downlineMembers : downlineMembers.filter((m) => m.line === 1)).length > 0 && (
            <select
              value={["me", "l1", "l2", "all"].includes(scope) ? "" : scope}
              onChange={(e) => e.target.value && setScope(e.target.value)}
              aria-label="Filtrer par distributeur"
              style={{
                height: 32,
                padding: "0 10px",
                borderRadius: 999,
                border: "1px solid var(--ls-border)",
                background: "var(--ls-surface)",
                color: "var(--ls-text)",
                fontSize: 12.5,
                fontFamily: "DM Sans, sans-serif",
                cursor: "pointer",
              }}
            >
              <option value="">Un distributeur…</option>
              {(isAdmin ? downlineMembers : downlineMembers.filter((m) => m.line === 1)).map((m) => (
                <option key={m.id} value={m.id}>
                  L{m.line} · {m.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Filtres par source + compteurs par statut */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 12px" }}>
        <button
          type="button"
          onClick={() => setFilterSource("all")}
          style={sourceChip(filterSource === "all", "var(--ls-text)")}
        >
          Toutes sources
        </button>
        {(Object.keys(CRM_SOURCE_META) as CrmSource[])
          .filter((s) => sourcesPresent.has(s))
          .map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterSource(filterSource === s ? "all" : s)}
              style={sourceChip(filterSource === s, "var(--ls-teal)")}
            >
              {CRM_SOURCE_META[s].emoji} {CRM_SOURCE_META[s].label}
            </button>
          ))}
        <button
          type="button"
          onClick={() => setShowStats((s) => !s)}
          style={sourceChip(showStats, "var(--ls-purple)")}
        >
          📊 Stats {showStats ? "▲" : "▼"}
        </button>
      </div>

      {/* Les cinq compteurs par statut. Ils ne sont pas cliquables et ne
          disent pas quoi faire — ils ont quitté le haut de page, pas l'app. */}
      <div style={statsRow}>
        {STATUS_ORDER.map((s) => (
          <div key={s} style={statChip(CRM_STATUS_META[s].color)}>
            <span aria-hidden="true">{CRM_STATUS_META[s].emoji}</span>
            <strong style={{ fontFamily: "Syne, sans-serif" }}>{counts[s]}</strong>
            <span style={{ fontSize: 11 }}>{CRM_STATUS_META[s].label}</span>
          </div>
        ))}
      </div>

      {/* Stats par source (wagon 3 chantier 6) */}
      {showStats ? (
        <div style={statsPanel}>
          <div style={statsPanelHead}>
            📊 Performance par source · {stats.overall.converted}/{stats.overall.total} convertis<JargonTip term="conversion" /> (
            {Math.round(stats.overall.conversionRate * 100)}%)
          </div>
          <div style={statsGrid}>
            {stats.bySource.map((s) => (
              <div key={s.source} style={statsCard}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ls-text)" }}>
                  {CRM_SOURCE_META[s.source].emoji} {CRM_SOURCE_META[s.source].label}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "4px 0" }}>
                  <span style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, color: "var(--ls-teal)" }}>
                    {Math.round(s.conversionRate * 100)}%
                  </span>
                  <span style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>conversion</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
                  {s.total} lead{s.total > 1 ? "s" : ""} · {s.active} actifs · {s.converted} convertis · {s.lost} perdus
                </div>
                {/* Barre conversion */}
                <div style={statsBarTrack}>
                  <div style={{ ...statsBarFill, width: `${Math.max(2, Math.round(s.conversionRate * 100))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Section Curieux (ONLINE-B) : commencé le bilan, pas fini.
          Toujours visible dès qu'il y a de l'activité bilan (curieux OU bilans
          complétés). État positif quand personne n'est en cours (avant : bug
          « 0 a commencé … 100% » ; puis masquée à tort → « où est passée la
          section ? » de Thomas 2026-07-15). */}
      {!curiousLoading && (curious.length > 0 || completionRate > 0) ? (
        <div style={curiousPanel}>
          {curious.length === 0 ? (
            // Tout le monde a fini son bilan → état sain, pas de relance à faire.
            <div style={{ ...curiousHeader, cursor: "default" }}>
              <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13.5 }}>
                💭 Aucun lead en cours de bilan — ceux qui démarrent vont au bout 🎉
              </span>
              <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ls-text-muted)" }}>
                complétion <strong style={{ color: "var(--ls-teal)" }}>{Math.round(completionRate * 100)}%</strong>
              </span>
            </div>
          ) : (
          <>
          <button
            type="button"
            onClick={() => setShowCurious((s) => !s)}
            style={curiousHeader}
            aria-expanded={showCurious}
          >
            <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13.5 }}>
              💭 Curieux — {curious.length} {curious.length > 1 ? "ont commencé" : "a commencé"} sans finir
            </span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ls-text-muted)" }}>
              taux de complétion <strong style={{ color: "var(--ls-teal)" }}>{Math.round(completionRate * 100)}%</strong>
            </span>
            <span style={{ fontSize: 12, color: "var(--ls-text-muted)" }}>{showCurious ? "▲" : "▼"}</span>
          </button>
          {showCurious ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              <p style={{ fontSize: 11.5, color: "var(--ls-text-muted)", margin: 0, lineHeight: 1.5 }}>
                Ces prospects ont saisi leur étape 1 mais n'ont pas terminé le bilan. Ils ne sont pas
                dans ta liste de prospects qualifiés — relance-les en douceur, sans pression.
              </p>
              {curious.length === 0 ? (
                <div style={columnEmpty}>Aucun curieux en attente 👏</div>
              ) : (
                curious.map((c) => {
                  const msg = `Salut ${c.firstName} ! 🌿 Tu as commencé ton bilan bien-être mais tu ne l'as pas terminé — pas de souci. Si tu veux, on le finit ensemble en 2 minutes, ça me permet de te faire un retour perso. Dis-moi 🙂\n${msgCtx.coachFirstName}`;
                  return (
                    <div key={c.id} style={curiousRow}>
                      <span style={{ fontWeight: 700, fontFamily: "Syne, sans-serif", fontSize: 13 }}>
                        {c.firstName}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--ls-text-muted)" }}>
                        {c.city ? `${c.city} · ` : ""}{c.contact ?? "—"}
                      </span>
                      <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ls-text-hint)" }}>
                        {formatDate(c.createdAt)}
                      </span>
                      {c.contactIsPhone ? (
                        <a
                          href={buildCrmWhatsAppLink(c.contact, msg)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={actionBtn("#25D366")}
                          title="Relancer en douceur"
                        >
                          📱 Relancer
                        </a>
                      ) : (
                        <button type="button" onClick={() => void copyMessage(msg)} style={actionBtn("var(--ls-teal)")}>
                          📋 Message
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : null}
          </>
          )}
        </div>
      ) : null}

      {/* Toggle Actifs / Historique / Endormis */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {([
          { id: "active" as const, label: "📋 Actifs" },
          { id: "historique" as const, label: `📜 Historique${historiqueCount ? ` (${historiqueCount})` : ""}` },
          { id: "archived" as const, label: `💤 Endormis${dormantCount ? ` (${dormantCount})` : ""}` },
        ]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setView(t.id)}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "DM Sans, sans-serif",
              fontWeight: view === t.id ? 700 : 500,
              background: view === t.id ? "var(--ls-text)" : "var(--ls-surface)",
              color: view === t.id ? "var(--ls-bg)" : "var(--ls-text-muted)",
              border: "1px solid var(--ls-border)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Switch Liste (défaut) / Pipeline — chantier refonte CRM 2026-07 */}
      <div style={{ marginBottom: 2 }}>
        <Tabs
          tabs={[
            { key: "list" as const, label: "Liste", icon: "📋" },
            { key: "pipeline" as const, label: "Pipeline", icon: "🗂️" },
          ]}
          active={viewMode}
          onChange={setViewMode}
          variant="soft"
          ariaLabel="Vue Liste ou Pipeline"
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <label htmlFor="crm-tri" style={{ fontSize: 12, color: "var(--ls-text-muted)", fontWeight: 600 }}>
          Trier :
        </label>
        <select
          id="crm-tri"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          style={{
            minHeight: 40,
            padding: "0 10px",
            borderRadius: 999,
            border: "1px solid var(--ls-border)",
            background: "var(--ls-surface)",
            color: "var(--ls-text)",
            fontSize: 12.5,
            fontFamily: "DM Sans, sans-serif",
            cursor: "pointer",
          }}
        >
          {OPTIONS_DE_TRI.map((o) => (
            <option key={o.valeur} value={o.valeur}>{o.label}</option>
          ))}
        </select>
      </div>
      </div>
      ) : null}
      {/* ═══ LA LISTE — UNE SEULE, POUR TOUS LES ÉCRANS ══════════════════════
          Chantier 2 de la refonte, maquette validée par Thomas.

          Ce qui disparaît ici : la vue Liste (ordinateur), le tableau en
          colonnes (ordinateur) et la file du jour (téléphone) — trois codes
          pour la même donnée, avec trois idées différentes de ce qu'on peut
          faire d'un lead. Sur téléphone, la file ne montrait QUE les gestes du
          jour : mesuré le 28/08, 19 personnes sur 31 n'étaient atteignables ni
          par la jauge, ni par la recherche, ni par un filtre.

          `CrmListe` montre tout le monde, met « Appeler » et « Écrire » sur la
          ligne, et compte ce qu'elle affiche. Une seule règle CSS la fait
          passer de la colonne (téléphone) à la ligne (ordinateur). */}
      {loading ? (
        <div style={hint}>Chargement de tes leads…</div>
      ) : (
        <CrmListe
          leads={regroupes}
          total={jaugeRegroupee.length}
          maintenant={new Date()}
          onOuvrir={(l) => setPanneauLead(l)}
          onAppeler={appeler}
          onEcrire={ouvrirWhatsApp}
          onPlus={(l) => setMenuLead(l)}
          doublonsDe={doublonsDe}
          messageVide={
            view === "archived"
              ? "Aucun lead endormi. Mets un lead froid de côté avec 💤 sur sa fiche."
              : view === "historique"
              ? "Aucun converti ni perdu pour l'instant."
              : leads.length === 0
              ? "Aucun contact pour l'instant. Partage ton lien bilan online ou ta page Club VIP pour remplir ta liste 🌱"
              : "Personne ne correspond aux filtres."
          }
        />
      )}

      {menuLead ? (
        <CrmMenuLigne
          lead={menuLead}
          onFermer={() => setMenuLead(null)}
          onQualifier={() => { const l = menuLead; setMenuLead(null); setQualifApresDrop(l); }}
          onCalerRdv={() => { const l = menuLead; setMenuLead(null); setAgendaLead(l); }}
          onFiche={() => { const l = menuLead; setMenuLead(null); navigate(`/crm/leads/${l.key}`); }}
          onEndormir={() => { const l = menuLead; setMenuLead(null); void handleDormant(l, true); }}
          onReveiller={() => { const l = menuLead; setMenuLead(null); void handleDormant(l, false); }}
          onSupprimer={isAdmin ? () => { const l = menuLead; setMenuLead(null); void handleDelete(l); } : undefined}
          onSource={(src) => { const l = menuLead; setMenuLead(null); void handleSourceChange(l, src); }}
        />
      ) : null}

      {/* Lead → RDV agenda (wagon 2 chantier 3) : prospect pré-rempli, et le
          lead passe automatiquement en Qualifié/Contacté à la création. */}
      {agendaLead ? (
        <ProspectFormModal
          prefill={{
            firstName: agendaLead.firstName,
            phone: agendaLead.contactIsPhone ? agendaLead.contact ?? undefined : undefined,
            source:
              agendaLead.source === "reco-client" || agendaLead.source === "intention"
                ? "Parrainage"
                : "Autre",
            sourceDetail: `CRM · ${CRM_SOURCE_META[agendaLead.source].label}${agendaLead.viaName ? ` (via ${agendaLead.viaName})` : ""}`,
            note: agendaLead.notes ?? undefined,
          }}
          onClose={() => setAgendaLead(null)}
          onSaved={() => {
            const lead = agendaLead;
            setAgendaLead(null);
            if (lead) {
              const next: CrmStatus = statusOptionsFor(lead.table).includes("qualified")
                ? "qualified"
                : "contacted";
              void handleStatusChange(lead, next);
              pushToast({
                tone: "success",
                title: "RDV créé",
                message: `${lead.firstName} est dans l'agenda — lead passé en ${CRM_STATUS_META[next].label}.`,
              });
            }
          }}
        />
      ) : null}

      {/* « Et alors ? » après un glisser-déposer (CRM Board V2, lot 1).
          Elle monte du bas, comme sur mobile, et non en modale centrée : c'est
          le même geste que partout ailleurs dans l'app. */}
      {qualifApresDrop ? (
        <div
          onClick={() => setQualifApresDrop(null)}
          style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "flex-end" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 460,
              margin: "0 auto",
              maxHeight: "88vh",
              overflowY: "auto",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <FeuilleQualification
              prenom={qualifApresDrop.firstName}
              onChoisir={(r) => {
                const lead = qualifApresDrop;
                setQualifApresDrop(null);
                void handleQualifier(lead, r);
              }}
              onIgnorer={() => setQualifApresDrop(null)}
            />
          </div>
        </div>
      ) : null}
        </div>{/* fin colonne droite (entonnoir) */}
      </div>{/* fin des deux colonnes */}

      {/* Le volet lead docké (lot 4). Ouvert par une carte du board ; la fiche
          pleine reste a un clic (route inchangee). */}
      {panneauLead ? (() => {
        const i = ordreBoard.findIndex((l) => l.key === panneauLead.key);
        const idx = i >= 0 ? i : 0;
        return (
          <CrmPanneauLead
            lead={panneauLead}
            index={idx + 1}
            total={Math.max(1, ordreBoard.length)}
            onFermer={() => setPanneauLead(null)}
            onNaviguer={(d) => {
              const suivant = ordreBoard[idx + d];
              if (suivant) setPanneauLead(suivant);
            }}
            onWhatsApp={ouvrirWhatsApp}
            onAlors={(lead) => { setPanneauLead(null); setQualifApresDrop(lead); }}
            onFiche={(lead) => navigate(`/crm/leads/${lead.key}`)}
            onConvertir={(lead) => navigate(`/crm/leads/${lead.key}?convert=1`)}
          />
        );
      })() : null}

      {/* Le tiroir de filtres qualifiants (lot 5). Alimenté par le périmètre
          courant (regroupes) pour des compteurs de facette justes. */}
      {qualifOuvert ? (
        <CrmPanneauFiltres
          leads={regroupes}
          qualif={qualif}
          setQualif={setQualif}
          vues={vues}
          setVues={setVues}
          onFermer={() => setQualifOuvert(false)}
        />
      ) : null}

      <footer style={footerHint}>
        💡 Clique sur un lead pour ouvrir sa fiche complète (réponses, conversion, RDV,
        notes). Les <strong>💭 Intentions</strong> sont les prénoms confiés par tes clients
        dans leur simulateur VIP : pas encore de numéro — le bouton t'aide à le demander au
        parrain.
      </footer>
    </div>
  );
}

// ─── LeadCard ────────────────────────────────────────────────────────────────



// ─── Styles ──────────────────────────────────────────────────────────────────


const pageWrap: React.CSSProperties = {
  maxWidth: 1280,
  margin: "0 auto",
  padding: "20px 18px 60px",
};

/**
 * Les deux colonnes du CRM Board V2 (lot 1). Arrivées à gauche (largeur fixe,
 * collée en défilement), entonnoir à droite. Sous 1024 px, elles s'empilent —
 * l'aside repasse en pleine largeur au-dessus, exactement comme le bandeau iPad
 * de la maquette. Tout en CLASSE : un style en ligne battrait la media query.
 */
const CRM_COLS_CSS = `
.crm-cols{display:flex;gap:18px;align-items:flex-start}
.crm-aside{width:300px;flex:none;position:sticky;top:16px}
.crm-droite{flex:1;min-width:0}
@media (max-width:1023.98px){
  .crm-cols{flex-direction:column}
  .crm-aside{width:auto;position:static}
}
`;

/** Le repli des blocs de rendez-vous et le panneau de filtres. */
const replisBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  minHeight: 40,
  padding: "8px 14px",
  borderRadius: 999,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface)",
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};

const panneauFiltres: React.CSSProperties = {
  border: "1px solid var(--ls-border)",
  borderRadius: 14,
  background: "var(--ls-surface2)",
  padding: "14px 14px 12px",
  marginBottom: 14,
};

const heroTitle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Anton, sans-serif",
  fontSize: "clamp(26px, 5vw, 34px)",
  fontWeight: 400,
  letterSpacing: "0.01em",
  textTransform: "uppercase",
  color: "var(--ls-text)",
  lineHeight: 1.02,
};

const statsRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const statChip = (color: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  borderRadius: 999,
  background: `color-mix(in srgb, ${color} 10%, var(--ls-surface))`,
  border: `0.5px solid color-mix(in srgb, ${color} 35%, transparent)`,
  fontSize: 12.5,
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
});

const errorBanner: React.CSSProperties = {
  marginTop: 14,
  padding: "10px 14px",
  borderRadius: 12,
  background: "color-mix(in srgb, var(--ls-coral) 10%, var(--ls-surface))",
  border: "0.5px solid color-mix(in srgb, var(--ls-coral) 40%, transparent)",
  fontSize: 12.5,
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const retryBtn: React.CSSProperties = {
  background: "transparent",
  border: "0.5px solid var(--ls-border)",
  color: "var(--ls-text)",
  fontSize: 12,
  padding: "4px 12px",
  borderRadius: 999,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
};

const sourceChip = (active: boolean, color: string): React.CSSProperties => ({
  padding: "7px 13px",
  borderRadius: 999,
  fontSize: 12.5,
  fontWeight: active ? 700 : 500,
  fontFamily: "DM Sans, sans-serif",
  cursor: "pointer",
  background: active ? `color-mix(in srgb, ${color} 12%, var(--ls-surface))` : "var(--ls-surface)",
  border: active
    ? `0.5px solid color-mix(in srgb, ${color} 50%, transparent)`
    : "0.5px solid var(--ls-border)",
  color: active ? color : "var(--ls-text-muted)",
});

const searchInput: React.CSSProperties = {
  flex: "1 1 180px",
  minWidth: 160,
  padding: "7px 13px",
  borderRadius: 999,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface)",
  color: "var(--ls-text)",
  fontSize: 12.5,
  fontFamily: "DM Sans, sans-serif",
  outline: "none",
};


// (Les anciens styles column / columnHeader / columnCount sont retirés : le
//  board V2 les remplace par CrmColonneEtape, lot 3.)

const columnEmpty: React.CSSProperties = {
  textAlign: "center",
  color: "var(--ls-text-hint)",
  fontSize: 12,
  padding: "18px 0",
};





// Badge de stagnation ⏳ Nj (Phase 3, 2026-07-16) — neutre volontairement
// (pas rouge/urgent comme relanceBadge) : c'est une info, pas une alerte.


const curiousPanel: React.CSSProperties = {
  marginBottom: 16,
  padding: "12px 16px",
  borderRadius: 14,
  background: "color-mix(in srgb, var(--ls-teal) 6%, var(--ls-surface))",
  border: "0.5px dashed color-mix(in srgb, var(--ls-teal) 40%, var(--ls-border))",
};

const curiousHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "var(--ls-text)",
  padding: 0,
  textAlign: "left",
  flexWrap: "wrap",
};

const curiousRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  padding: "9px 12px",
  borderRadius: 10,
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  fontFamily: "DM Sans, sans-serif",
};

const statsPanel: React.CSSProperties = {
  marginBottom: 16,
  padding: "14px 16px",
  borderRadius: 14,
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
};

const statsPanelHead: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontWeight: 700,
  fontSize: 13.5,
  color: "var(--ls-text)",
  marginBottom: 12,
};

const statsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
  gap: 10,
};

const statsCard: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 12,
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
};

const statsBarTrack: React.CSSProperties = {
  marginTop: 8,
  width: "100%",
  height: 5,
  borderRadius: 100,
  background: "color-mix(in srgb, var(--ls-text) 8%, transparent)",
  overflow: "hidden",
};

const statsBarFill: React.CSSProperties = {
  height: "100%",
  borderRadius: 100,
  background: "linear-gradient(90deg, var(--ls-teal), var(--ls-teal))",
};

const actionBtn = (accent: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "6px 10px",
  borderRadius: 9,
  background: `color-mix(in srgb, ${accent} 10%, var(--ls-surface2))`,
  border: `0.5px solid color-mix(in srgb, ${accent} 35%, transparent)`,
  color: "var(--ls-text)",
  fontSize: 11.5,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
  fontFamily: "DM Sans, sans-serif",
});


// Libellés courts des objectifs bilan online (résumé inline carte CRM).





const hint: React.CSSProperties = {
  marginTop: 20,
  fontSize: 13,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
};


const footerHint: React.CSSProperties = {
  marginTop: 20,
  padding: "14px 16px",
  borderRadius: 12,
  background: "var(--ls-surface)",
  border: "0.5px dashed var(--ls-border)",
  fontSize: 12.5,
  color: "var(--ls-text-muted)",
  lineHeight: 1.6,
  fontFamily: "DM Sans, sans-serif",
};

