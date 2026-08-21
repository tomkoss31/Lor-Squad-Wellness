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

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { JargonTip } from "../components/ui/JargonTip";
import { FunnelAnswers } from "../components/crm/FunnelAnswers";
import {
  computeCrmStats,
  CRM_EDITABLE_SOURCES,
  CRM_SOURCE_META,
  CRM_STATUS_META,
  statusOptionsFor,
  useCrmLeads,
  type CrmLead,
  type CrmSource,
  type CrmStatus,
} from "../hooks/useCrmLeads";
import {
  buildCrmSmsLink,
  buildCrmWhatsAppLink,
} from "../lib/crmMessages";
import { ProspectFormModal } from "../components/prospect/ProspectFormModal";
import { useCuriousLeads } from "../hooks/useCuriousLeads";
import { useLeadQuickActions } from "../hooks/useLeadQuickActions";
import { RdvBookingsWidget } from "../components/crm/RdvBookingsWidget";
import { ClubDiscoveryWidget } from "../components/crm/ClubDiscoveryWidget";
import { CrmBoiteArrivee } from "../components/crm/CrmBoiteArrivee";
import { CrmJaugeEntonnoir, type JaugeFiltre } from "../components/crm/CrmJaugeEntonnoir";
import {
  ecrireVues,
  estVide as qualifEstVide,
  FILTRE_VIDE,
  lireVues,
  nbActifs as nbFiltresQualif,
  passe as passeQualif,
  SIGNAUX,
  type FiltreQualif,
  type VueSauvee,
} from "../features/crm/filtresQualification";
import { groupeDe } from "../features/crm/echeances";
import { CrmLeadsListView, OPTIONS_DE_TRI, type SortKey } from "../components/crm/CrmLeadsListView";
import { Tabs } from "../components/ui/Tabs";
import { formatLeadDate as formatDate, relativeLeadDays as relativeDays } from "../lib/leadDateFormat";
import { computeLeadScore, TEMP_META } from "../lib/leadScoring";
import { isStagnant, stagnationDays } from "../lib/leadActivity";
import { tableSupportsAssignment } from "../lib/leadRouting";
import { dateDeRetour, quandRevient, type Reponse } from "../features/crm/qualification";
import { FeuilleQualification } from "../features/crm/FeuilleQualification";
import { estQualifiable } from "../features/crm/ecrireQualification";

const STATUS_ORDER: CrmStatus[] = ["new", "contacted", "qualified", "converted", "lost"];

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function CrmPage() {
  const { currentUser, clients, users } = useAppContext();
  const { push: pushToast } = useToast();
  const navigate = useNavigate();
  const { leads, loading, error, refetch, qualifier, updateStatus, updateSource, accepter, setDormant, deleteLead } = useCrmLeads();
  // Vue : Actifs (pipeline ouvert) · Historique (convertis/perdus) · Endormis.
  const [view, setView] = useState<"active" | "historique" | "archived">("active");
  // Liste (défaut, type Attio) vs Pipeline (kanban existant) — chantier refonte
  // CRM 2026-07, demande Thomas « arrêter le kanban empilé comme vue principale ».
  const [viewMode, setViewMode] = useState<"list" | "pipeline">("list");
  // Le filtre posé en tapant un segment de la jauge (CRM Board V2, lot 3).
  // Une étape OU le signal « à relancer », jamais les deux : deux filtres
  // cumulés sur une seule barre donnent une liste vide qu'on ne s'explique pas.
  const [jauge, setJauge] = useState<JaugeFiltre>({ etape: null, relance: false });
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
  // Upgrade V1.1 : drag & drop des cards entre colonnes (HTML5 DnD —
  // desktop ; sur mobile le select par card reste le moyen principal).
  const [dragOverStatus, setDragOverStatus] = useState<CrmStatus | null>(null);
  // Le contact déposé, en attente de sa question. Tant qu'il est là, la feuille
  // « Et alors ? » est ouverte et rien n'a encore été écrit.
  const [qualifApresDrop, setQualifApresDrop] = useState<CrmLead | null>(null);
  // Wagon 2 chantier 3 : lead chaud → RDV agenda en 1 clic (prospect pré-rempli).
  const [agendaLead, setAgendaLead] = useState<CrmLead | null>(null);
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
  const [rdvOuverts, setRdvOuverts] = useState(true);
  // Le tri vit désormais chez le parent : il a rejoint le panneau, et sa
  // valeur sert aussi à savoir si un réglage est actif.
  const [sortKey, setSortKey] = useState<SortKey>("echeance");

  useEffect(() => {
    document.title = "La Base 360 — CRM";
  }, []);

  const stats = useMemo(() => computeCrmStats(leads), [leads]);

  // Wagon 3 chantier 7 : anti-doublon. Index des téléphones déjà clients +
  // détection des leads en double dans le pipeline (même téléphone).
  const dupeInfo = useMemo(() => {
    const norm = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "").slice(-9);
    const clientPhones = new Map<string, string>();
    for (const c of clients ?? []) {
      const p = norm(c.phone);
      if (p.length >= 6) clientPhones.set(p, `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim());
    }
    const leadPhoneCount = new Map<string, number>();
    for (const l of leads) {
      const p = norm(l.contact);
      if (p.length >= 6) leadPhoneCount.set(p, (leadPhoneCount.get(p) ?? 0) + 1);
    }
    return { norm, clientPhones, leadPhoneCount };
  }, [clients, leads]);

  function dupeFlagFor(lead: CrmLead): { kind: "client" | "dupe"; label: string } | null {
    const p = dupeInfo.norm(lead.contact);
    if (p.length < 6) return null;
    const clientName = dupeInfo.clientPhones.get(p);
    if (clientName) return { kind: "client", label: `déjà client (${clientName})` };
    if ((dupeInfo.leadPhoneCount.get(p) ?? 0) > 1) return { kind: "dupe", label: "doublon pipeline" };
    return null;
  }

  const msgCtx = useMemo(() => {
    const slug = normalizeSlug((currentUser?.name ?? "").split(/\s+/)[0] ?? "");
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return {
      coachFirstName: (currentUser?.name ?? "").split(/\s+/)[0] || "Ton coach",
      bilanUrl: `${origin}/bilan-online/${slug}`,
      vipUrl: `${origin}/vip/${slug}`,
    };
  }, [currentUser?.name]);

  const filtered = useMemo(
    () =>
      leads.filter((l) => {
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
        // Le segment de jauge tapé, s'il y en a un.
        if (jauge.etape && l.status !== jauge.etape) return false;
        if (jauge.relance && !l.relanceDue) return false;

        // Les questions de qualification (température, signaux, objectif).
        if (!passeQualif(l, qualif)) return false;

        return true;
      }),
    [leads, filterSource, search, view, scope, canFilterTeam, currentUser?.id, isAdmin, line1Ids, line2Ids, jauge, qualif],
  );

  // ── Une personne = une ligne (2026-08-12) ─────────────────────────────────
  //
  // Fatiha a rempli le tunnel /reserver deux fois, à 10 h 12 puis à 11 h 44 :
  // deux fiches dans le CRM pour une seule personne. Le repère ⚠️ existait
  // déjà, mais il SIGNALAIT sans regrouper — et seulement sur le téléphone.
  //
  // On regroupe sur l'email OU le téléphone normalisé. La fiche la plus
  // RÉCENTE devient la ligne visible ; les autres sont repliées derrière un
  // badge « n fiches ». Rien n'est supprimé en base : c'est un regroupement
  // d'affichage, réversible en retirant ces lignes.
  //
  // Le regroupement se fait APRÈS le filtrage : filtrer sur « Colis » ne doit
  // pas faire disparaître une fiche colis parce qu'elle serait absorbée par
  // une fiche d'une autre source.
  const { regroupes, doublonsDe } = useMemo(() => {
    const cle = (l: CrmLead): string | null => {
      const c = (l.contact ?? "").trim().toLowerCase();
      if (!c) return null;
      if (c.includes("@")) return "e:" + c;
      const tel = c.replace(/\D/g, "").replace(/^0+/, "").replace(/^33/, "");
      return tel.length >= 8 ? "t:" + tel.slice(-9) : null;
    };
    const paquets = new Map<string, CrmLead[]>();
    const seuls: CrmLead[] = [];
    for (const l of filtered) {
      const k = cle(l);
      if (!k) { seuls.push(l); continue; }
      const p = paquets.get(k);
      if (p) p.push(l); else paquets.set(k, [l]);
    }
    const principaux: CrmLead[] = [...seuls];
    const doublons = new Map<string, CrmLead[]>();
    for (const groupe of paquets.values()) {
      // Le plus récent porte le fil : c'est celui qui reflète l'intention
      // actuelle de la personne.
      const tries = [...groupe].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      principaux.push(tries[0]);
      if (tries.length > 1) doublons.set(tries[0].key, tries.slice(1));
    }
    principaux.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { regroupes: principaux, doublonsDe: doublons };
  }, [filtered]);

  // Le seul chiffre qui mérite d'être en haut de l'écran : combien de gens
  // attendent un geste AUJOURD'HUI. Les cinq compteurs par statut (Nouveaux,
  // Contactés, Qualifiés…) ne disaient pas quoi faire — ils sont descendus
  // dans « Plus de filtres ».
  const nbAujourdhui = useMemo(
    () => {
      const maintenant = new Date();
      return regroupes.filter((l) => groupeDe(l, maintenant) === "aujourdhui").length;
    },
    [regroupes],
  );

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
  const capDuJour = useMemo(() => {
    const maintenant = new Date();
    const ici = regroupes.filter((l) => groupeDe(l, maintenant) === "aujourdhui");
    const jamais = ici.filter((l) => !l.contactedAt && l.derniereReponse === null && l.status === "new").length;
    const retard = ici.filter((l) => l.relanceDue).length;
    return { total: ici.length, jamais, retard };
  }, [regroupes]);

  // Combien de réglages ne sont PAS à leur valeur par défaut : le badge du
  // bouton « Plus de filtres ». Sans lui, on peut filtrer sans le savoir et
  // croire que sa liste est vide.
  const filtresActifs = useMemo(() => {
    let n = 0;
    if (scope !== "me") n += 1;
    if (filterSource !== "all") n += 1;
    if (view !== "active") n += 1;
    if (viewMode !== "list") n += 1;
    if (sortKey !== "echeance") n += 1;
    n += nbFiltresQualif(qualif);
    return n;
  }, [scope, filterSource, view, viewMode, sortKey, qualif]);

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

  // ── DÉPOSER UNE CARTE POSE LA QUESTION (CRM Board V2, lot 1) ─────────────
  //
  // Avant : le drop écrivait le statut À SEC (`handleStatusChange`). Une carte
  // glissée sur « Contacté » changeait de colonne SANS date de suite — donc la
  // personne sortait de tous les radars de relance. C'est le bug que la
  // maquette V2 nomme : « l'étape ne change jamais sans sa date de suite ».
  //
  // Depuis : le drop OUVRE « Et alors ? ». La réponse choisie écrit l'issue ET
  // la date, par le même chemin que partout ailleurs (`handleQualifier`) — il
  // n'y a pas deux façons de faire avancer un lead dans l'app.
  //
  // ⚠️ La colonne cible ne décide de RIEN. Elle a servi à ouvrir la question,
  // c'est la réponse qui fait foi : déposer sur « Contacté » puis répondre
  // « pas de réponse » laisse la carte à relancer, et c'est juste. Prétendre
  // l'inverse rendrait le geste menteur.
  function handleDrop(leadKey: string, target: CrmStatus) {
    setDragOverStatus(null);
    const lead = leads.find((l) => l.key === leadKey);
    if (!lead || lead.status === target) return;

    // Converti reste verrouillé au glisser-déposer : créer une fiche client
    // demande un nom, un sexe, un point de départ. Ça passe par la fiche.
    if (target === "converted") {
      pushToast({
        tone: "warning",
        title: "La conversion passe par la fiche",
        message: "Ouvre le contact pour créer sa fiche client — un glisser-déposer ne peut pas saisir son bilan.",
      });
      return;
    }

    if (!statusOptionsFor(lead.table).includes(target)) {
      pushToast({
        tone: "warning",
        title: "Pas par ici",
        message: "Ce statut n'est pas disponible pour cette source.",
      });
      return;
    }

    if (!estQualifiable(lead.table)) {
      // Une source sans qualification (reco, intention) garde l'ancien chemin :
      // pour elle, le statut EST l'information, il n'y a pas de date à poser.
      void handleStatusChange(lead, target);
      return;
    }

    setQualifApresDrop(lead);
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
            : nbAujourdhui === 0
              ? "Personne n'attend de toi aujourd'hui. 👌"
              : `${nbAujourdhui} personne${nbAujourdhui > 1 ? "s" : ""} t'${nbAujourdhui > 1 ? "attendent" : "attend"} aujourd'hui.`}
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

      {/* L'entonnoir en une ligne. Il lit `leads` — la population entière du
          périmètre — et NON `filtered` : une jauge qui se recalcule sur son
          propre filtre afficherait 100 % partout dès qu'on tape un segment. */}
      <CrmJaugeEntonnoir leads={leads.filter((l) => !l.enAttente)} filtre={jauge} onFiltrer={setJauge} />

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
          🗓️ Rendez-vous demandés {rdvOuverts ? "▲" : "▼"}
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
        <button
          type="button"
          onClick={() => setFiltresOuverts((v) => !v)}
          aria-expanded={filtresOuverts}
          // Neutre plutôt que violet : mesuré à 4,08:1 en violet sur son propre
          // fond teinté, sous le seuil de 4,5.
          style={sourceChip(filtresOuverts || filtresActifs > 0, "var(--ls-text)")}
        >
          ⋯ Plus de filtres{filtresActifs > 0 ? ` · ${filtresActifs}` : ""} {filtresOuverts ? "▲" : "▼"}
        </button>
      </div>

      {/* ── Tout le reste, replié ────────────────────────────────────────── */}
      {filtresOuverts ? (
      <div style={panneauFiltres}>
      {/* ── Les questions qui qualifient (lot 5) ────────────────────────────
          Elles passent AVANT le périmètre et la source : ce sont elles qui
          disent qui vaut la peine d'être rappelé aujourd'hui, pas la
          provenance. */}
      <div style={{ margin: "0 0 12px" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "var(--ls-text-muted)", fontWeight: 600 }}>Température :</span>
          {(["hot", "warm", "cold"] as const).map((t) => {
            const actif = qualif.temperatures.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() =>
                  setQualif((q) => ({
                    ...q,
                    temperatures: actif ? q.temperatures.filter((x) => x !== t) : [...q.temperatures, t],
                  }))
                }
                style={sourceChip(actif, TEMP_META[t].color)}
              >
                {TEMP_META[t].emoji} {TEMP_META[t].label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--ls-text-muted)", fontWeight: 600 }}>Ce qui cloche :</span>
          {SIGNAUX.map((sig) => {
            const actif = qualif.signaux.includes(sig.cle);
            return (
              <button
                key={sig.cle}
                type="button"
                title={sig.pourquoi}
                onClick={() =>
                  setQualif((q) => ({
                    ...q,
                    signaux: actif ? q.signaux.filter((x) => x !== sig.cle) : [...q.signaux, sig.cle],
                  }))
                }
                style={sourceChip(actif, "var(--ls-coral)")}
              >
                {sig.label}
              </button>
            );
          })}
        </div>

        {/* Sauver / rappeler une combinaison. N'apparaît que quand il y a
            quelque chose à sauver — un bouton « Sauver » sur un filtre vide
            n'aurait rien à enregistrer. */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
          {vues.map((v) => (
            <button
              key={v.nom}
              type="button"
              onClick={() => setQualif(v.filtre)}
              onDoubleClick={() => {
                const reste = vues.filter((x) => x.nom !== v.nom);
                setVues(reste);
                ecrireVues(reste);
              }}
              title="Double-clic pour retirer cette vue"
              style={sourceChip(false, "var(--ls-purple)")}
            >
              ⭐ {v.nom}
            </button>
          ))}
          {!qualifEstVide(qualif) ? (
            <>
              <button
                type="button"
                onClick={() => {
                  const nom = window.prompt("Nom de la vue ?", "Mes prioritaires")?.trim();
                  if (!nom) return;
                  const reste = [...vues.filter((v) => v.nom !== nom), { nom, filtre: qualif }];
                  setVues(reste);
                  ecrireVues(reste);
                }}
                style={sourceChip(false, "var(--ls-teal)")}
              >
                💾 Sauver comme vue
              </button>
              <button type="button" onClick={() => setQualif(FILTRE_VIDE)} style={sourceChip(false, "var(--ls-text)")}>
                Tout effacer
              </button>
            </>
          ) : null}
        </div>
      </div>

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

      {loading ? (
        <div style={hint}>Chargement de tes leads…</div>
      ) : viewMode === "list" ? (
        <CrmLeadsListView
          triExterne={{ valeur: view === "archived" ? "recent" : sortKey, onChange: setSortKey }}
          leads={regroupes}
          doublonsDe={doublonsDe}
          msgCtx={msgCtx}
          archived={view === "archived"}
          onStatusChange={(lead, s) => void handleStatusChange(lead, s)}
          onSourceChange={(lead, s) => void handleSourceChange(lead, s)}
          onCopy={(text) => void copyMessage(text)}
          onAgenda={(lead) => setAgendaLead(lead)}
          dupeFlagFor={dupeFlagFor}
          onDormant={(lead) => void handleDormant(lead, true)}
          onWake={(lead) => void handleDormant(lead, false)}
          onDelete={isAdmin ? (lead) => void handleDelete(lead) : undefined}
          onQualifier={(lead, r, enLot) => {
            // On RENVOIE la promesse : la barre en lot l'attend pour écrire une
            // fiche à la fois. Un `void` ici et les cinq écritures partaient
            // d'un coup sur une base qui tient sur une t4g.nano.
            return handleQualifier(lead, r, enLot);
          }}
          emptyMessage={
            view === "archived"
              ? "Aucun lead endormi. Mets un lead froid de côté avec 💤 sur sa carte."
              : view === "historique"
              ? "Aucun converti ni perdu pour l'instant. Dès qu'un lead passe en ✅ Converti ou 🌙 Perdu, il arrive ici automatiquement."
              : leads.length === 0
              ? "Aucun contact pour l'instant. Partage ton lien bilan online ou ta page Club VIP pour remplir ta liste 🌱"
              : "Aucun lead ne correspond aux filtres."
          }
        />
      ) : regroupes.length === 0 ? (
        <div style={emptyState}>
          {view === "archived"
            ? "Aucun lead endormi. Mets un lead froid de côté avec 💤 sur sa carte."
            : view === "historique"
            ? "Aucun converti ni perdu pour l'instant. Dès qu'un lead passe en ✅ Converti ou 🌙 Perdu, il arrive ici automatiquement."
            : leads.length === 0
            ? "Aucun contact pour l'instant. Partage ton lien bilan online ou ta page Club VIP pour remplir ta liste 🌱"
            : "Aucun lead ne correspond aux filtres."}
        </div>
      ) : view === "archived" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 560 }}>
          {regroupes.map((lead) => (
            <LeadCard
              key={lead.key}
              lead={lead}
              msgCtx={msgCtx}
              onStatusChange={(s) => void handleStatusChange(lead, s)}
              onSourceChange={(s) => void handleSourceChange(lead, s)}
              onCopy={(text) => void copyMessage(text)}
              onAgenda={() => setAgendaLead(lead)}
              dupeFlag={dupeFlagFor(lead)}
              archived
              onWake={() => void handleDormant(lead, false)}
              onDelete={isAdmin ? () => void handleDelete(lead) : undefined}
            />
          ))}
        </div>
      ) : (
        <div style={columnsWrap}>
          {(view === "historique"
            ? (["converted", "lost"] as CrmStatus[])
            : (["new", "contacted", "qualified"] as CrmStatus[])
          ).map((status) => {
            const col = regroupes.filter((l) => l.status === status);
            const isDragOver = dragOverStatus === status;
            return (
              <div
                key={status}
                style={{
                  ...column,
                  ...(isDragOver
                    ? {
                        borderColor: `color-mix(in srgb, ${CRM_STATUS_META[status].color} 60%, transparent)`,
                        background: `color-mix(in srgb, ${CRM_STATUS_META[status].color} 6%, var(--ls-surface2))`,
                      }
                    : {}),
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStatus(status);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStatus(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(e.dataTransfer.getData("text/plain"), status);
                }}
              >
                <div style={columnHeader(CRM_STATUS_META[status].color)}>
                  <span aria-hidden="true">{CRM_STATUS_META[status].emoji}</span>{" "}
                  {CRM_STATUS_META[status].label}
                  {/* Pendant le survol, l'en-tête dit ce qui va se passer —
                      « dépose ici », ou le cadenas sur Converti qui n'accepte
                      pas le drop (la conversion demande un bilan, pas un geste
                      de la souris). Repris de la maquette V2. */}
                  {isDragOver ? (
                    <span style={{ marginLeft: 6, fontSize: 11.5, fontWeight: 600, opacity: 0.85 }}>
                      {status === "converted" ? "🔒 passe par la fiche" : "— dépose ici ✊"}
                    </span>
                  ) : null}
                  <span style={columnCount}>{col.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {col.map((lead) => (
                    <LeadCard
                      key={lead.key}
                      lead={lead}
                      msgCtx={msgCtx}
                      onStatusChange={(s) => void handleStatusChange(lead, s)}
              onSourceChange={(s) => void handleSourceChange(lead, s)}
                      onCopy={(text) => void copyMessage(text)}
                      onAgenda={() => setAgendaLead(lead)}
                      dupeFlag={dupeFlagFor(lead)}
                      onDormant={() => void handleDormant(lead, true)}
                      onDelete={isAdmin ? () => void handleDelete(lead) : undefined}
                    />
                  ))}
                  {col.length === 0 ? <div style={columnEmpty}>—</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

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

function LeadCard({
  lead,
  msgCtx,
  onStatusChange,
  onSourceChange,
  onCopy,
  onAgenda,
  dupeFlag,
  onDormant,
  onWake,
  onDelete,
  archived,
}: {
  lead: CrmLead;
  msgCtx: { coachFirstName: string; bilanUrl: string; vipUrl: string };
  onStatusChange: (s: CrmStatus) => void;
  onSourceChange?: (s: CrmSource) => void;
  onCopy: (text: string) => void;
  onAgenda: () => void;
  dupeFlag: { kind: "client" | "dupe"; label: string } | null;
  onDormant?: () => void;
  onWake?: () => void;
  onDelete?: () => void;
  archived?: boolean;
}) {
  const { users } = useAppContext();
  const { push: pushToast } = useToast();
  const navigate = useNavigate();
  const src = CRM_SOURCE_META[lead.source];
  // Provenance bilan online : nom du coach dont le lien a servi (via ownerUserId
  // quand un slug est présent) — sinon « lien public ».
  const bilanVia =
    lead.table === "online_bilans"
      ? lead.bilanCoachSlug
        ? (users.find((u) => u.id === lead.ownerUserId)?.name ?? lead.bilanCoachSlug)
        : null
      : null;
  const [menuOpen, setMenuOpen] = useState(false);
  // Logique message/canal/IA/touch — extraite dans useLeadQuickActions (chantier
  // refonte CRM Liste/Pipeline 2026-07), partagée avec la vue Liste.
  const {
    isIntention,
    message,
    messageLabel,
    aiMessage,
    setAiMessage,
    aiLoading,
    generateAi,
    lastTouch,
    recordTouch,
  } = useLeadQuickActions(lead, msgCtx);
  // Score/température unifiés + badge de stagnation (Phase 3).
  const { temperature } = computeLeadScore(lead);
  const temp = TEMP_META[temperature];
  const stagnant = isStagnant(lead);

  return (
    <div
      style={card}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", lead.key);
        e.dataTransfer.effectAllowed = "move";
      }}
      title="Glisse-moi dans une autre colonne (ou utilise le sélecteur de statut)"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span title={temp.label} aria-hidden="true">{temp.emoji}</span>
        <strong style={{ fontFamily: "Syne, sans-serif", fontSize: 14, color: "var(--ls-text)" }}>
          {lead.firstName}
        </strong>
        {lead.table === "prospect_leads" && onSourceChange ? (
          <select
            value={lead.source}
            onChange={(e) => onSourceChange(e.target.value as CrmSource)}
            title="Re-catégoriser la source de ce lead"
            style={{ ...srcBadge, cursor: "pointer", appearance: "none", WebkitAppearance: "none", paddingRight: 18 }}
          >
            {CRM_EDITABLE_SOURCES.map((s) => (
              <option key={s} value={s}>
                {CRM_SOURCE_META[s].emoji} {CRM_SOURCE_META[s].label}
              </option>
            ))}
          </select>
        ) : (
          <span style={srcBadge}>
            {src.emoji} {src.label}
          </span>
        )}
        {lead.relanceDue ? <span style={relanceBadge}>🔔 Relance due</span> : null}
        {dupeFlag ? (
          <span style={dupeFlag.kind === "client" ? clientBadge : dupeBadge}>⚠️ {dupeFlag.label}</span>
        ) : null}
        {stagnant ? (
          <span title={`Aucun mouvement depuis ${stagnationDays(lead)} jour(s)`} style={stagnantBadge}>
            ⏳ {stagnationDays(lead)}j
          </span>
        ) : null}
        {!lead.ownerUserId && tableSupportsAssignment(lead.table) ? (
          <span title="Non attribué — ouvre la fiche pour assigner" style={clientBadge}>
            👤 Non attribué
          </span>
        ) : null}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ls-text-hint)" }}>
          {formatDate(lead.createdAt)}
        </span>
      </div>

      <div style={{ fontSize: 12, color: "var(--ls-text-muted)", lineHeight: 1.5 }}>
        {lead.viaName ? <>🤝 via <strong>{lead.viaName}</strong> · </> : null}
        {lead.extra ? <>{lead.extra} · </> : null}
        {lead.city ? <>{lead.city} · </> : null}
        {lead.contact ?? (isIntention ? "contact à demander au parrain" : "pas de contact")}
        {lastTouch ? (
          <span style={{ color: "var(--ls-teal)" }}> · 📨 contacté {relativeDays(lastTouch)}</span>
        ) : null}
      </div>

      {/* Réponses du questionnaire funnel Opportunité (repliable) */}
      {lead.funnelAnswers && Object.keys(lead.funnelAnswers).length > 0 ? (
        <FunnelAnswers
          answers={lead.funnelAnswers}
          temperature={lead.funnelTemperature}
          score={lead.funnelScore}
        />
      ) : null}

      {/* Bilan online : résumé clé INLINE (objectifs · cible · motivation) —
          comme les réponses funnel — + bouton vers le détail complet (modale).
          Avant : seul le bouton était affiché, l'info restait cachée. */}
      {lead.table === "online_bilans" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Provenance : via le lien d'un distri, ou lien public générique */}
          <div style={{ fontSize: 11.5, fontWeight: 600, color: bilanVia ? "var(--ls-purple)" : "var(--ls-text-hint)" }}>
            {bilanVia ? <>🔗 via {bilanVia}</> : <>🌐 Lien public (pas de distri)</>}
          </div>
          {(lead.bilanObjectives && lead.bilanObjectives.length > 0) ||
          lead.bilanWeightTarget != null ||
          lead.bilanMotivation != null ? (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
              {(lead.bilanObjectives ?? []).map((o) => (
                <span key={o} style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ls-teal)", background: "color-mix(in srgb, var(--ls-teal) 12%, transparent)", borderRadius: 999, padding: "2px 9px" }}>
                  {BILAN_OBJECTIVE_LABELS[o] ?? o}
                </span>
              ))}
              {lead.bilanWeightTarget != null ? (
                <span style={{ fontSize: 11.5, color: "var(--ls-text-muted)" }}>🎯 −{lead.bilanWeightTarget} kg</span>
              ) : null}
              {lead.bilanMotivation != null ? (
                <span style={{ fontSize: 11.5, color: "var(--ls-text-muted)" }}>🔥 {lead.bilanMotivation}/10</span>
              ) : null}
              {lead.bilanAge != null ? (
                <span style={{ fontSize: 11.5, color: "var(--ls-text-hint)" }}>· {lead.bilanAge} ans</span>
              ) : null}
            </div>
          ) : null}
          <Link
            to={`/crm/leads/${lead.key}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              width: "100%",
              padding: "8px 11px",
              borderRadius: 9,
              border: "1px solid color-mix(in srgb, var(--ls-teal) 32%, var(--ls-border))",
              background: "color-mix(in srgb, var(--ls-teal) 7%, var(--ls-surface))",
              color: "var(--ls-text)",
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: "DM Sans, sans-serif",
              textDecoration: "none",
              boxSizing: "border-box",
            }}
          >
            📋 Voir tout le bilan (habitudes, repas, sommeil…)
            <span aria-hidden="true" style={{ marginLeft: "auto", color: "var(--ls-teal)" }}>→</span>
          </Link>
        </div>
      ) : null}

      {/* Actions — menu déroulant (aéré sur mobile, Noaly explicite) */}
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          style={{ ...actionBtn("var(--ls-teal)"), fontWeight: 700 }}
        >
          ⚡ Actions {menuOpen ? "▴" : "▾"}
        </button>
        {menuOpen ? (
          <>
            <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} aria-hidden="true" />
            <div style={actionMenu}>
              {isIntention && lead.parrainPhone ? (
                <MenuItem
                  onClick={() => {
                    recordTouch();
                    window.open(buildCrmWhatsAppLink(lead.parrainPhone!, message), "_blank", "noopener,noreferrer");
                    setMenuOpen(false);
                  }}
                >
                  📱 Demander à {(lead.viaName ?? "").split(/\s+/)[0] || "ton client"}
                </MenuItem>
              ) : null}
              {!isIntention && lead.contactIsPhone ? (
                <>
                  <MenuItem
                    onClick={() => {
                      recordTouch();
                      window.open(buildCrmWhatsAppLink(lead.contact, message), "_blank", "noopener,noreferrer");
                      setMenuOpen(false);
                    }}
                  >
                    📱 WhatsApp
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      recordTouch();
                      window.location.href = buildCrmSmsLink(lead.contact, message);
                      setMenuOpen(false);
                    }}
                  >
                    💬 SMS
                  </MenuItem>
                </>
              ) : null}
              <MenuItem
                onClick={() => {
                  recordTouch();
                  onCopy(message);
                  setMenuOpen(false);
                }}
              >
                📋 Copier {messageLabel.toLowerCase()}
              </MenuItem>
              {lead.status !== "converted" && lead.status !== "lost" ? (
                <MenuItem
                  onClick={() => {
                    onAgenda();
                    setMenuOpen(false);
                  }}
                >
                  📅 Caler un RDV
                </MenuItem>
              ) : null}
              <MenuItem
                onClick={() => {
                  navigate(`/crm/leads/${lead.key}`);
                  setMenuOpen(false);
                }}
              >
                📂 Voir la fiche complète
              </MenuItem>
              {lead.resultToken ? (
                <MenuItem
                  onClick={() => {
                    recordTouch();
                    const origin = typeof window !== "undefined" ? window.location.origin : "";
                    void navigator.clipboard?.writeText(`${origin}/resultat-bilan/${lead.resultToken}`).then(() =>
                      pushToast({
                        tone: "success",
                        title: "Lien Résultat copié",
                        message: "Page premium personnalisée — envoie-la à ton prospect 🌿",
                      }),
                    );
                    setMenuOpen(false);
                  }}
                >
                  🔗 Copier le lien Résultat
                </MenuItem>
              ) : null}
              <MenuItem
                disabled={aiLoading}
                onClick={() => {
                  setMenuOpen(false);
                  // Anti-gaspillage IA : génération seulement si confirmée.
                  if (
                    !window.confirm(
                      "✨ Noaly va rédiger un message personnalisé avec l'IA. Ça consomme des crédits — générer ?",
                    )
                  )
                    return;
                  void generateAi();
                }}
              >
                ✨ {aiLoading ? "Noaly écrit…" : "Noaly écrit un message IA"}
              </MenuItem>
            </div>
          </>
        ) : null}
      </div>

      {/* Message IA généré (wagon 3 chantier 8) */}
      {aiMessage ? (
        <div style={aiPanel}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ls-purple)", marginBottom: 6 }}>
            ✨ Proposition de Noaly — édite avant d'envoyer
          </div>
          <textarea
            value={aiMessage}
            onChange={(e) => setAiMessage(e.target.value)}
            rows={6}
            style={aiTextarea}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            {lead.contactIsPhone ? (
              <a
                href={buildCrmWhatsAppLink(lead.contact, aiMessage)}
                target="_blank"
                rel="noopener noreferrer"
                style={actionBtn("#25D366")}
              >
                📱 WhatsApp
              </a>
            ) : null}
            {isIntention && lead.parrainPhone ? (
              <a
                href={buildCrmWhatsAppLink(lead.parrainPhone, aiMessage)}
                target="_blank"
                rel="noopener noreferrer"
                style={actionBtn("#25D366")}
              >
                📱 Au parrain
              </a>
            ) : null}
            <button type="button" onClick={() => onCopy(aiMessage)} style={actionBtn("var(--ls-teal)")}>
              📋 Copier
            </button>
            <button type="button" onClick={() => setAiMessage(null)} style={actionBtn("var(--ls-text-muted)")}>
              ✕ Fermer
            </button>
          </div>
        </div>
      ) : null}

      {/* Statut */}
      <select
        value={lead.status}
        onChange={(e) => onStatusChange(e.target.value as CrmStatus)}
        style={statusSelect(CRM_STATUS_META[lead.status].color)}
        aria-label={`Statut de ${lead.firstName}`}
      >
        {statusOptionsFor(lead.table).map((s) => (
          <option key={s} value={s}>
            {CRM_STATUS_META[s].emoji} {CRM_STATUS_META[s].label}
          </option>
        ))}
        {/* Statut courant hors options natives (ex: converti via kanban) */}
        {!statusOptionsFor(lead.table).includes(lead.status) ? (
          <option value={lead.status}>
            {CRM_STATUS_META[lead.status].emoji} {CRM_STATUS_META[lead.status].label}
          </option>
        ) : null}
      </select>

      {/* Actions endormir / réveiller / supprimer (2026-06-14) */}
      {(onDormant || onWake || onDelete) && (
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {archived && onWake ? (
            <button type="button" onClick={onWake} style={cardActionBtn}>
              ☀️ Réveiller
            </button>
          ) : null}
          {!archived && onDormant ? (
            <button type="button" onClick={onDormant} style={cardActionBtn} title="Mettre de côté — sort du flux, plus de relance">
              💤 Endormir
            </button>
          ) : null}
          {onDelete ? (
            <button type="button" onClick={onDelete} style={{ ...cardActionBtn, color: "var(--ls-coral)", borderColor: "color-mix(in srgb, var(--ls-coral) 35%, var(--ls-border))" }}>
              🗑 Supprimer
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

const cardActionBtn: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 8,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text-muted)",
  fontSize: 11.5,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
};

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

const columnsWrap: React.CSSProperties = {
  display: "flex",
  gap: 12,
  overflowX: "auto",
  paddingBottom: 12,
  alignItems: "flex-start",
};

const column: React.CSSProperties = {
  flex: "0 0 290px",
  minWidth: 290,
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 14,
  padding: 10,
};

const columnHeader = (color: string): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "Syne, sans-serif",
  fontSize: 13,
  fontWeight: 700,
  color,
  padding: "4px 6px 10px",
});

const columnCount: React.CSSProperties = {
  marginLeft: "auto",
  fontSize: 11,
  fontWeight: 800,
  color: "var(--ls-text-muted)",
  background: "var(--ls-surface)",
  borderRadius: 999,
  padding: "1px 8px",
  border: "0.5px solid var(--ls-border)",
};

const columnEmpty: React.CSSProperties = {
  textAlign: "center",
  color: "var(--ls-text-hint)",
  fontSize: 12,
  padding: "18px 0",
};

const card: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 12,
  padding: "12px 12px",
  display: "flex",
  flexDirection: "column",
  gap: 9,
  fontFamily: "DM Sans, sans-serif",
  cursor: "grab",
};

const srcBadge: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  padding: "2px 8px",
  borderRadius: 999,
  background: "color-mix(in srgb, var(--ls-teal) 10%, transparent)",
  border: "0.5px solid color-mix(in srgb, var(--ls-teal) 35%, transparent)",
  color: "var(--ls-teal)",
  whiteSpace: "nowrap",
};

const relanceBadge: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  padding: "2px 8px",
  borderRadius: 999,
  background: "color-mix(in srgb, var(--ls-coral) 12%, transparent)",
  border: "0.5px solid color-mix(in srgb, var(--ls-coral) 40%, transparent)",
  color: "var(--ls-coral)",
  whiteSpace: "nowrap",
};

const clientBadge: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  padding: "2px 8px",
  borderRadius: 999,
  background: "color-mix(in srgb, var(--ls-purple) 12%, transparent)",
  border: "0.5px solid color-mix(in srgb, var(--ls-purple) 40%, transparent)",
  color: "var(--ls-purple)",
  whiteSpace: "nowrap",
};

// Badge de stagnation ⏳ Nj (Phase 3, 2026-07-16) — neutre volontairement
// (pas rouge/urgent comme relanceBadge) : c'est une info, pas une alerte.
const stagnantBadge: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  padding: "2px 8px",
  borderRadius: 999,
  background: "color-mix(in srgb, var(--ls-text-muted) 10%, transparent)",
  border: "0.5px solid color-mix(in srgb, var(--ls-text-muted) 30%, transparent)",
  color: "var(--ls-text-muted)",
  whiteSpace: "nowrap",
};

const dupeBadge: React.CSSProperties = {
  ...clientBadge,
  background: "color-mix(in srgb, var(--ls-teal) 14%, transparent)",
  border: "0.5px solid color-mix(in srgb, var(--ls-teal) 45%, transparent)",
  color: "var(--ls-teal)",
};

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

const actionMenu: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  marginTop: 6,
  minWidth: 220,
  maxWidth: "min(260px, 90vw)",
  zIndex: 41,
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
  borderRadius: 12,
  boxShadow: "0 12px 32px rgba(0,0,0,0.28)",
  padding: 6,
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

// Libellés courts des objectifs bilan online (résumé inline carte CRM).
const BILAN_OBJECTIVE_LABELS: Record<string, string> = {
  weight_loss: "Perte de poids",
  mass_gain: "Prise de masse",
  energy: "Énergie",
  sleep: "Sommeil",
  wellbeing: "Bien-être",
  perf_pro: "Perf pro",
};

function MenuItem({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        borderRadius: 9,
        border: "none",
        background: "transparent",
        color: "var(--ls-text)",
        fontSize: 13,
        fontWeight: 500,
        fontFamily: "DM Sans, sans-serif",
        cursor: disabled ? "wait" : "pointer",
        opacity: disabled ? 0.6 : 1,
        minHeight: 40,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--ls-surface2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}

const aiPanel: React.CSSProperties = {
  marginTop: 4,
  padding: "10px 12px",
  borderRadius: 10,
  background: "color-mix(in srgb, var(--ls-purple) 7%, var(--ls-surface2))",
  border: "0.5px solid color-mix(in srgb, var(--ls-purple) 30%, var(--ls-border))",
};

const aiTextarea: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface)",
  color: "var(--ls-text)",
  fontSize: 12.5,
  lineHeight: 1.5,
  fontFamily: "DM Sans, sans-serif",
  resize: "vertical",
  outline: "none",
};

const statusSelect = (color: string): React.CSSProperties => ({
  padding: "6px 10px",
  fontSize: 12,
  borderRadius: 9,
  border: `1px solid color-mix(in srgb, ${color} 45%, var(--ls-border))`,
  background: `color-mix(in srgb, ${color} 8%, var(--ls-surface2))`,
  color: "var(--ls-text)",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
});

const hint: React.CSSProperties = {
  marginTop: 20,
  fontSize: 13,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
};

const emptyState: React.CSSProperties = {
  padding: "40px 20px",
  textAlign: "center",
  color: "var(--ls-text-muted)",
  background: "var(--ls-surface)",
  border: "0.5px dashed var(--ls-border)",
  borderRadius: 14,
  fontSize: 13.5,
  lineHeight: 1.6,
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

