// =============================================================================
// EcranDuJourBranche — l'écran du jour, relié aux vraies données.
//
// Sépare volontairement la peinture (EcranDuJour, sans état) du branchement
// (ici). Le moteur de décision, lui, est ailleurs et pur : `ceQuiCompte()`.
//
// ── CE QUI A ÉTÉ ÉVITÉ, ET POURQUOI ────────────────────────────────────────
//
// 1. AUCUNE requête nouvelle au démarrage. Les paiements ont été glissés dans
//    le Promise.all déjà existant de `useFileDuJour` — un aller-retour, pas
//    deux. On ne re-remplit pas le seau qu'on a vidé ce matin.
//
// 2. `useSalleOps` n'est PAS remonté ici : chaque instance déclenche un fetch
//    `distributor_starter_progress` non caché, et deux tournent déjà. La vue
//    arrive en prop depuis la page, qui la monte déjà.
//
// 3. `clientMessages` est un piège à trois détentes :
//      · il contient aussi les `coach_reply` (103 en base, tous non lus) ;
//      · pour un ADMIN il contient les messages de TOUTE l'équipe ;
//      · `unreadMessageCount` ignore `resolved_at`, pas `InboxWidget`.
//    D'où le triple filtre ci-dessous. Relâcher `sender === "client"` ferait
//    passer le compteur de 0 à 103 d'un coup.
//
// 4. `visibleFollowUps` est un droit de LECTURE, pas une liste de tâches :
//    pour un admin il renvoie toute l'équipe. On repasse par le propriétaire
//    réel du client — sinon les clientes de Mélanie s'affichent chez Thomas
//    sous « un point que TU avais calé » (vu à l'écran le 12/08).
// =============================================================================

import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../../../context/AppContext";
import { useDormantClients } from "../../../../hooks/useDormantClients";
import { useRentabilitySummary } from "../../../../hooks/useRentabilitySummary";
import {
  useFileDuJour,
  suivisEnRetardVersAttentes,
  ordonner,
  RANG,
  type Attente,
} from "../../../../hooks/useFileDuJour";
import type { CopiloteData } from "../../../../hooks/useCopiloteData";
import type { SalleOpsView } from "../../salle-ops/useSalleOps";
import { ceQuiCompte, type MessageRecu, type RdvEnVue } from "../../ceQuiCompte";
import { EcranDuJour, type EvenementJournee, type LigneEquipe } from "./EcranDuJour";

const JOUR_MS = 86_400_000;

/** Ce qui est traité aujourd'hui, et les paiements déjà salués. Remis à zéro
 *  chaque matin par la clé datée — comme l'ancien Plan du jour. */
function cleDuJourLocale(base: string): string {
  return `${base}-${new Date().toISOString().slice(0, 10)}`;
}

function lireSet(cle: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const brut = window.localStorage.getItem(cle);
    return new Set(brut ? (JSON.parse(brut) as string[]) : []);
  } catch {
    return new Set();
  }
}

function ecrireSet(cle: string, v: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(cle, JSON.stringify([...v]));
  } catch {
    /* quota / navigation privée : non bloquant */
  }
}

const premier = (nom: string) => (nom ?? "").trim().split(/\s+/)[0] || nom || "";

export function EcranDuJourBranche({ data, ops }: { data: CopiloteData; ops: SalleOpsView }) {
  const { currentUser, clientMessages, visibleFollowUps, users, clients } = useAppContext();
  const navigate = useNavigate();
  const moi = currentUser?.id ?? null;
  const estAdmin = currentUser?.role === "admin";

  const { clients: dormants } = useDormantClients(moi);
  const { totalMargin } = useRentabilitySummary(moi);

  const nomParId = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, premier(u.name)])),
    [users],
  );
  const { mesAttentes, attentesEquipe, paiements } = useFileDuJour(moi, { estAdmin, nomParId });

  // ─── Ce qui a été traité aujourd'hui ─────────────────────────────────────
  const CLE_TRAITEES = cleDuJourLocale("ecran-jour-traitees");
  const CLE_SALUES = cleDuJourLocale("ecran-jour-salues");
  const [traitees, setTraitees] = useState<Set<string>>(() => lireSet(CLE_TRAITEES));
  const [salues, setSalues] = useState<Set<string>>(() => lireSet(CLE_SALUES));

  // ─── La file : mes attentes + mes suivis en retard + mes dormants ────────
  const proprietaireDuClient = useMemo(
    () => Object.fromEntries(clients.map((c) => [c.id, c.distributorId])),
    [clients],
  );

  const attentes: Attente[] = useMemo(() => {
    const maintenant = Date.now();
    const miens = visibleFollowUps.filter(
      (f) =>
        f.status === "pending" &&
        new Date(f.dueDate).getTime() < maintenant &&
        proprietaireDuClient[f.clientId] === moi,
    );
    const suivis = suivisEnRetardVersAttentes(
      miens.map((f) => ({ id: f.id, clientId: f.clientId, clientName: f.clientName, dueDate: f.dueDate })),
    );
    // Les dormants ferment la marche : ils n'attendent rien, ils se sont
    // éteints. C'est tout l'inverse de quelqu'un qui a levé la main.
    const endormis: Attente[] = dormants.map((c) => ({
      cle: `dormant:${c.client_id}`,
      qui: c.client_name,
      motifCourt: c.last_order_date == null ? "Jamais commandé" : "Plus de commande",
      pourquoi:
        c.last_order_date == null
          ? `Jamais commandé · ~${c.pv_potential} PV potentiels`
          : `${c.days_since_last_order} j sans commande${c.last_program_name ? ` · ${c.last_program_name}` : ""}`,
      jours: c.days_since_last_order ?? 0,
      motif: "suivi-en-retard",
      rang: RANG.dormant,
      telephone: c.client_phone,
      chemin: `/clients/${c.client_id}?tab=actions`,
    }));
    return ordonner([...mesAttentes, ...suivis, ...endormis]);
  }, [mesAttentes, visibleFollowUps, proprietaireDuClient, moi, dormants]);

  const restantes = useMemo(() => attentes.filter((a) => !traitees.has(a.cle)), [attentes, traitees]);

  // ─── Les RDV à venir aujourd'hui ─────────────────────────────────────────
  const rdvs: RdvEnVue[] = useMemo(
    () =>
      data.todayAgenda.map((r) => ({
        id: r.id, clientId: r.clientId, nom: r.name, type: r.type, heure: r.time,
      })),
    [data.todayAgenda],
  );

  // ─── Le dernier message VRAIMENT en attente ──────────────────────────────
  const messages: MessageRecu[] = useMemo(
    () =>
      clientMessages
        .filter(
          (m) =>
            m.sender === "client" &&
            !m.read &&
            !m.resolved_at &&
            !m.archived_at &&
            // Un admin voit les messages de toute l'équipe : la zone 1 ne doit
            // montrer QUE les siens, sinon on lui met le travail des autres.
            (m.distributor_id === moi || m.distributor_id === currentUser?.name),
        )
        .map((m) => ({
          id: m.id,
          clientId: m.client_id,
          nom: m.client_name,
          texte: m.message ?? m.product_name ?? "",
          recuLe: m.created_at,
          enAttente: true,
        })),
    [clientMessages, moi, currentUser?.name],
  );

  // ─── Le démarrage — `activated` fait foi, PAS un every(done) ─────────────
  // `opsDone = steps.every(s => s.state === "done")` ne se déclenche JAMAIS :
  // `stepDone` exige `gates.length > 0` et les étapes 6 et 7 n'ont aucune
  // porte. `activated` vient de `users.activated_at`, décidé serveur.
  const demarrage = useMemo(
    () =>
      ops.loading
        ? undefined
        : {
            etape: ops.activeStepNumber,
            total: ops.totalSteps,
            titre: ops.currentLesson?.title ?? "Ton 1er bilan",
            fini: ops.activated,
          },
    [ops.loading, ops.activeStepNumber, ops.totalSteps, ops.currentLesson, ops.activated],
  );

  const quoi = useMemo(
    () =>
      ceQuiCompte({
        maintenant: new Date(),
        rdvs,
        messages,
        paiements,
        attentes: restantes,
        demarrage,
        paiementsSalues: [...salues],
        resteEquipe: attentesEquipe.length,
      }),
    [rdvs, messages, paiements, restantes, demarrage, salues, attentesEquipe.length],
  );

  // ─── Ta journée ──────────────────────────────────────────────────────────
  const journee: EvenementJournee[] = useMemo(() => {
    const out: EvenementJournee[] = [];
    const prochain = [...rdvs].filter((r) => r.heure.getTime() >= Date.now() - 15 * 60_000)
      .sort((a, b) => a.heure.getTime() - b.heure.getTime())[0];

    out.push({
      cle: "maintenant",
      quand: `Maintenant · ${new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date())}`,
      titre: prochain
        ? `${rdvs.length} rendez-vous aujourd'hui`
        : restantes.length > 0
          ? `${restantes.length} personne${restantes.length > 1 ? "s" : ""} en attente`
          : "Rien de calé aujourd'hui",
      detail: prochain
        ? "Le prochain t'attend ci-dessous."
        : restantes.length > 0
          ? "Aucun rendez-vous — la journée est à toi."
          : "Ta liste est vide, tout le monde a eu sa réponse.",
      ton: "now",
    });

    if (prochain) {
      out.push({
        cle: `rdv:${prochain.id}`,
        quand: new Intl.DateTimeFormat("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" }).format(prochain.heure),
        titre: prochain.nom,
        detail: prochain.type,
        ton: "next",
        chemin: `/clients/${prochain.clientId}`,
      });
    }

    const endormis = restantes.filter((a) => a.rang === RANG.dormant);
    if (endormis.length > 0) {
      out.push({
        cle: "dormants",
        quand: "Quand tu veux",
        titre: endormis.slice(0, 2).map((a) => premier(a.qui)).join(" · "),
        detail: `Plus de commande depuis ${endormis.map((a) => a.jours).join(" et ")} jours. Ils n'attendent rien — c'est toi qui décides.`,
        ton: "plus-tard",
      });
    }
    return out;
  }, [rdvs, restantes]);

  // ─── Ton équipe ──────────────────────────────────────────────────────────
  const equipe: LigneEquipe[] = useMemo(() => {
    if (!estAdmin) return [];
    const maintenant = Date.now();
    const dernierBilanPar = new Map<string, number>();
    for (const c of clients) {
      const dates = (c.assessments ?? []).map((a) => new Date(a.date).getTime()).filter((t) => !Number.isNaN(t));
      if (dates.length === 0) continue;
      const max = Math.max(...dates);
      const actuel = dernierBilanPar.get(c.distributorId) ?? 0;
      if (max > actuel) dernierBilanPar.set(c.distributorId, max);
    }
    const clientsPar = new Map<string, number>();
    for (const c of clients) clientsPar.set(c.distributorId, (clientsPar.get(c.distributorId) ?? 0) + 1);

    const attendPar = new Map<string, number>();
    for (const a of attentesEquipe) {
      const r = a.responsable ?? "";
      attendPar.set(r, (attendPar.get(r) ?? 0) + 1);
    }

    const lignes: LigneEquipe[] = [];
    for (const u of users) {
      if (u.id === moi || !u.active) continue;
      const nb = clientsPar.get(u.id) ?? 0;
      const dernier = dernierBilanPar.get(u.id);
      const jours = dernier ? Math.floor((maintenant - dernier) / JOUR_MS) : null;
      const enAttente = attendPar.get(premier(u.name)) ?? 0;

      // Un seul signal par personne, le plus grave d'abord. Une ligne qui dit
      // trois choses ne fait agir sur aucune.
      if (nb === 0 || dernier == null) {
        lignes.push({
          id: u.id, prenom: u.name, initiale: (u.name[0] ?? "?").toUpperCase(),
          signal: "Inscrit·e, aucun bilan. Il/elle n'a jamais commencé.",
          teinte: "var(--ls-coral)", outil: "🚀 L'aider à faire son 1er bilan",
          chemin: `/distributors/${u.id}`,
        });
      } else if (jours != null && jours >= 30) {
        lignes.push({
          id: u.id, prenom: u.name, initiale: (u.name[0] ?? "?").toUpperCase(),
          signal: `${nb} client${nb > 1 ? "s" : ""}, mais plus aucun bilan depuis ${jours} jours.`,
          teinte: "var(--ls-amber)", outil: "💬 Prendre de ses nouvelles",
          chemin: `/distributors/${u.id}`,
        });
      } else if (enAttente > 0) {
        lignes.push({
          id: u.id, prenom: u.name, initiale: (u.name[0] ?? "?").toUpperCase(),
          signal: `${enAttente} personne${enAttente > 1 ? "s" : ""} en attente, aucune rappelée.`,
          teinte: "var(--ls-amber)", outil: "📞 Lui envoyer sa liste",
          chemin: "/crm",
        });
      }
    }
    // Les bloqués d'abord, puis ceux qui s'essoufflent.
    return lignes.sort((a, b) => (a.teinte === b.teinte ? 0 : a.teinte === "var(--ls-coral)" ? -1 : 1)).slice(0, 4);
  }, [estAdmin, users, clients, attentesEquipe, moi]);

  // ─── Gestes ──────────────────────────────────────────────────────────────
  const marquer = useCallback(
    (cle: string, salue?: string) => {
      if (salue) {
        setSalues((s) => { const n = new Set(s).add(salue); ecrireSet(CLE_SALUES, n); return n; });
        return;
      }
      setTraitees((s) => { const n = new Set(s).add(cle); ecrireSet(CLE_TRAITEES, n); return n; });
    },
    [CLE_SALUES, CLE_TRAITEES],
  );

  const onFait = useCallback(() => {
    if (quoi.quoi === "personne") marquer(quoi.attente.cle);
    else if (quoi.quoi === "paiement") marquer("", quoi.commandeId);
    else if (quoi.quoi === "message") marquer(`message:${quoi.messageId}`);
  }, [quoi, marquer]);

  // « Plus tard » ne ment pas : ça sort de la zone 1 pour aujourd'hui, mais la
  // personne reste dans la liste en dessous, non barrée.
  const [reportees, setReportees] = useState<Set<string>>(new Set());
  const onPasser = useCallback(() => {
    if (quoi.quoi === "personne") setReportees((s) => new Set(s).add(quoi.attente.cle));
  }, [quoi]);

  const attentesVisibles = useMemo(
    () => restantes.filter((a) => !reportees.has(a.cle)),
    [restantes, reportees],
  );

  const quoiFinal = useMemo(
    () =>
      reportees.size === 0
        ? quoi
        : ceQuiCompte({
            maintenant: new Date(),
            rdvs, messages, paiements,
            attentes: attentesVisibles,
            demarrage,
            paiementsSalues: [...salues],
            resteEquipe: attentesEquipe.length,
          }),
    [quoi, reportees.size, rdvs, messages, paiements, attentesVisibles, demarrage, salues, attentesEquipe.length],
  );

  const ligneDuMois = useMemo(() => {
    const marge = `${Math.round(totalMargin).toLocaleString("fr-FR")} €`;
    return `${marge} · ${data.activeClientsCount} actif${data.activeClientsCount > 1 ? "s" : ""}`;
  }, [totalMargin, data.activeClientsCount]);

  return (
    <EcranDuJour
      quoi={quoiFinal}
      monPrenom={premier(currentUser?.name ?? "")}
      journee={journee}
      attentes={attentes}
      traitees={traitees}
      equipe={equipe}
      equipeTotal={users.filter((u) => u.active).length}
      ligneDuMois={ligneDuMois}
      onOuvrir={(c) => navigate(c)}
      onFait={onFait}
      onPasser={onPasser}
      onRouvrir={(cle) =>
        setTraitees((s) => { const n = new Set(s); n.delete(cle); ecrireSet(CLE_TRAITEES, n); return n; })
      }
    />
  );
}
