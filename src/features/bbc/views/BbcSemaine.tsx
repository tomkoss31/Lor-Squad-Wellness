// =============================================================================
// BbcSemaine — « La semaine du club » (chantier BBC, 2026-07-28).
//
// L'agenda du club : même moteur de données que l'agenda classique, coquille
// visuelle séparée. Il agrège quatre natures d'événements qui n'avaient jamais
// été regardées ensemble :
//
//   ☕ PERMANENCE  le service du matin. Pas un rendez-vous : un POSTE à tenir.
//                  Un matin sans personne s'affiche en ambre pointillé — c'est
//                  le seul endroit de l'app qui dise « demain, personne
//                  n'ouvre », et c'est ce qui manquait pour confier un club.
//   📞 RITUEL      les appels du soir. Déjà en config (`clubs.settings.calls`)
//                  et déjà inscrits (`useBbcCalls`) : on AFFICHE, on ne
//                  réimplémente pas.
//   🎁 BILAN       les cartes pleines. L'app savait déjà qui a fini sa carte,
//                  mais ça ne devenait jamais une date — alors que c'est le
//                  moment précis où le membre rachète.
//   👥 RDV         les vrais rendez-vous de la semaine, membres OU non.
//
// ─── LA RÈGLE DE FILTRAGE ────────────────────────────────────────────────────
// On ne cache JAMAIS un rendez-vous avec une personne. Un coach BBC garde des
// clients classiques : si le bilan de Julien disparaissait parce qu'il n'a pas
// pris de carte de membre, le coach le raterait — et l'écran deviendrait un
// piège au lieu d'un agenda. Ce qu'on restreint au club, c'est le DÉCOR
// (permanences, rituels), qui n'a aucun sens ailleurs. Les chips, elles, sont
// une intention explicite de l'utilisateur : là, il a le droit de tout réduire.
// =============================================================================

import { useCallback, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useAppContext } from "../../../context/AppContext";
import { useBbcCalls } from "../useBbcCalls";
import { useBbcMembers } from "../useBbcMembers";
import { getCallsForWeek } from "../data/bbcCalls";
import { useClubShifts, equipeAffectable, cleJour, type Affectable } from "../useClubShifts";
import {
  useClubDiscoveryBookings,
  type ClubDiscoveryBooking,
} from "../../../hooks/useClubDiscoveryBookings";
import { setClubDayClosed } from "../../../services/sb/club-bookings";
import { startOfWeekMonday, weekDays, isSameDay } from "../../agenda/calendarEvents";
import { DEFAULT_CLUB_SETTINGS } from "../useClubSettings";
import type { Club } from "../../../types/domain";

/** Objectif de la séance découverte → libellé lisible (tunnel /reserver). */
const OBJECTIF_LABEL: Record<string, string> = {
  poids: "perte de poids",
  muscle: "prise de muscle",
  energie: "regain d'énergie",
};

interface BbcSemaineProps {
  userId?: string;
  club?: Club | null;
}

/** Les familles de la semaine — l'ordre est celui des chips. */
type Famille = "perm" | "rituel" | "membre" | "classique" | "bilan" | "decouverte";
type Filtre = "all" | "perm" | "rituel" | "rdv" | "decouverte" | "bilan";

interface Evenement {
  id: string;
  famille: Famille;
  /** « 7h », « 20h00 », ou « — » pour ce qui n'a pas d'heure. */
  heure: string;
  titre: string;
  sous: string;
  tag: string;
  /** Permanence non couverte : la ligne doit crier. */
  vide?: boolean;
  /** Le jour à affecter — présent uniquement sur les permanences. */
  jour?: Date;
  /** id rdv_bookings — présent uniquement sur les séances découverte, ouvre la
   *  feuille Confirmer/Annuler au lieu de la feuille permanence. */
  bookingId?: string;
}

const CHIPS: Array<{ k: Filtre; label: string }> = [
  { k: "all", label: "Tout" },
  { k: "perm", label: "☕ Permanences" },
  { k: "rituel", label: "📞 Rituels" },
  { k: "rdv", label: "👥 RDV" },
  { k: "decouverte", label: "🥤 Découverte" },
  { k: "bilan", label: "🎁 Bilans" },
];

/** Couleur de la pastille + du tag, par famille. */
const TEINTE: Record<Famille, string> = {
  perm: "var(--ls-bbc-lime)",
  rituel: "var(--ls-bbc-violet)",
  membre: "var(--ls-bbc-teal)",
  classique: "var(--ls-bbc-muted)",
  bilan: "var(--ls-bbc-coral)",
  // Séances découverte du tunnel /reserver : coral, en écho à l'orange de la
  // marque Breakfast Club. Ne côtoie jamais les bilans (bloc « à caler » séparé).
  decouverte: "var(--ls-bbc-coral)",
};

function fmtHeure(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

function fmtJour(d: Date): string {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" });
}

export function BbcSemaine({ userId, club }: BbcSemaineProps) {
  const { clients, prospects, followUps, users, currentUser } = useAppContext();
  const [filtre, setFiltre] = useState<Filtre>("all");
  /** Le matin dont on est en train de décider — null = feuille fermée. */
  const [feuille, setFeuille] = useState<Date | null>(null);
  /** Dernier échec d'écriture, affiché DANS la feuille. Les deux seuls gestes
   *  d'écriture de l'écran passent par un RPC qui peut refuser (club qui n'est
   *  pas le sien, session expirée, réseau coupé) : sans ce message, le refus
   *  laissait la feuille strictement dans le même état, donc indiscernable d'un
   *  appui qui n'a pas pris. */
  const [erreurFeuille, setErreurFeuille] = useState<string | null>(null);

  const ouvrirFeuille = (jour: Date) => {
    setErreurFeuille(null);
    setFeuille(jour);
  };
  const fermerFeuille = () => {
    setFeuille(null);
    setErreurFeuille(null);
  };

  // Semaine courante uniquement (lundi → dimanche), conformément à la maquette
  // validée. `startOfWeekMonday` / `weekDays` viennent du moteur de l'agenda
  // classique : la semaine française y est déjà définie une seule fois.
  const lundi = useMemo(() => startOfWeekMonday(new Date()), []);
  const jours = useMemo(() => weekDays(lundi), [lundi]);

  const settings = club?.settings ?? null;
  // `open_hours` est optionnel jusqu'au bout de la chaîne de types : on ne
  // laisse pas un « undefined » atteindre l'écran, où il s'afficherait tel quel
  // à côté de la date. Le littéral n'est qu'un dernier filet — la vraie valeur
  // vient des Réglages du club.
  const openHours = settings?.open_hours || DEFAULT_CLUB_SETTINGS.open_hours || "7h-11h";
  const clubId = club?.id ?? null;
  const shifts = useClubShifts(clubId, openHours, lundi);
  const calls = useBbcCalls(userId, settings);
  const { members } = useBbcMembers(userId);
  // Séances découverte réservées via le tunnel public (/reserver) : résas "club"
  // (coach = null), lisibles par les admins (RLS 2026-07-31). Contrairement aux
  // RDV ci-dessous, elles ne sont rattachées à aucun coach → on les affiche pour
  // le club, pas pour une personne.
  const { bookings: decouvertesResa, setStatus: setStatutDecouverte } = useClubDiscoveryBookings(clubId);

  // Séance découverte dont la feuille est ouverte — le booking, pas juste son
  // id : dérivé de `decouvertesResa` pour rester réactif (ex. la feuille se
  // referme d'elle-même quand une annulation retire la résa de la liste).
  const [decouverteId, setDecouverteId] = useState<string | null>(null);
  const decouverteOuverte = decouverteId
    ? (decouvertesResa.find((b) => b.id === decouverteId) ?? null)
    : null;
  const [erreurDecouverte, setErreurDecouverte] = useState<string | null>(null);
  const ouvrirDecouverte = (id: string) => {
    setErreurDecouverte(null);
    setDecouverteId(id);
  };
  const fermerDecouverte = () => {
    setDecouverteId(null);
    setErreurDecouverte(null);
  };

  // Journées fermées aux réservations du site (discovery.holidays). Servait
  // jusqu'ici uniquement aux fériés ; c'est aussi le « demain je ne suis pas
  // là » du coach (chantier RDV du club, 2026-08-09). On part de la valeur
  // portée par le club et on la garde à jour localement après chaque bascule.
  const [joursFermes, setJoursFermes] = useState<string[]>(
    () => (((club?.settings as { discovery?: { holidays?: string[] } } | null)?.discovery?.holidays) ?? []),
  );
  const basculerJour = useCallback(
    async (jour: Date) => {
      if (!clubId) return;
      const cle = cleJour(jour);
      const ferme = joursFermes.includes(cle);
      // Optimiste : l'interrupteur répond tout de suite, on recale au retour.
      setJoursFermes((prev) => (ferme ? prev.filter((d) => d !== cle) : [...prev, cle]));
      try {
        const next = await setClubDayClosed(clubId, cle, !ferme);
        setJoursFermes(next);
      } catch {
        setJoursFermes((prev) => (ferme ? [...prev, cle] : prev.filter((d) => d !== cle)));
      }
    },
    [clubId, joursFermes],
  );

  const nomsUsers = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users]);
  const equipe = useMemo(() => equipeAffectable(users, currentUser?.id), [users, currentUser?.id]);

  // Un membre BBC est un client comme un autre côté RDV : c'est cet ensemble
  // qui permet de dire « membre » plutôt que « hors club » — sans jamais
  // servir à EXCLURE qui que ce soit (cf. la règle de filtrage en tête).
  const idsMembres = useMemo(() => new Set(members.map((m) => m.id)), [members]);

  // ── Bilans à caler : cartes pleines, sans date ──────────────────────────
  const aCaler = useMemo(
    () => members.filter((m) => m.card && m.card.used >= m.card.type),
    [members],
  );

  // ── Les rituels de CETTE semaine (pas « les prochains ») ────────────────
  const rituels = useMemo(() => getCallsForWeek(settings, lundi), [settings, lundi]);

  // ── Les vrais rendez-vous de la semaine ─────────────────────────────────
  // Sources identiques à l'agenda classique : prospects (bilans) + follow-ups
  // clients. Portée strictement personnelle — un coach BBC pilote son club.
  const rdv = useMemo(() => {
    const finSemaine = new Date(lundi);
    finSemaine.setDate(finSemaine.getDate() + 7);
    const dansLaSemaine = (iso: string): Date | null => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return null;
      return d >= lundi && d < finSemaine ? d : null;
    };
    const out: Array<Evenement & { at: Date }> = [];

    for (const p of prospects) {
      if (p.distributorId !== currentUser?.id) continue;
      // Un RDV annulé, perdu ou refroidi encombrerait la semaine sans rien
      // apprendre — et ferait croire à une matinée pleine. On garde en
      // revanche `done` et `converted` : ces RDV-là ont bien eu lieu.
      if (p.status === "lost" || p.status === "no_show" || p.status === "cancelled" || p.status === "cold") continue;
      const at = dansLaSemaine(p.rdvDate);
      if (!at) continue;
      const nom = [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || "Prospect";
      // Le parcours BBC nominal, c'est « bilan puis carte dans la foulée » : le
      // prospect passe `converted` et une fiche membre est créée le jour même.
      // Coder « hors club » en dur sur toute la branche prospects étiquetait
      // donc le membre le PLUS récent du club comme un étranger — à l'envers du
      // seul repère de l'écran. On résout l'appartenance par la fiche créée,
      // exactement comme la branche suivis juste en dessous.
      const membre = !!p.convertedClientId && idsMembres.has(p.convertedClientId);
      out.push({
        id: `prospect-${p.id}`,
        famille: membre ? "membre" : "classique",
        at,
        heure: fmtHeure(at),
        titre: nom,
        sous: membre ? "bilan · membre du club" : "bilan · prospect",
        tag: membre ? "membre" : "hors club",
      });
    }

    const clientsParId = new Map(clients.map((c) => [c.id, c]));
    for (const fu of followUps) {
      if (fu.status !== "scheduled" && fu.status !== "pending") continue;
      const c = clientsParId.get(fu.clientId);
      if (!c || c.distributorId !== currentUser?.id) continue;
      if (c.lifecycleStatus === "stopped" || c.lifecycleStatus === "lost") continue;
      const at = dansLaSemaine(fu.dueDate);
      if (!at) continue;
      const membre = idsMembres.has(c.id);
      const nom = [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || "Client";
      out.push({
        id: `followup-${fu.id}`,
        famille: membre ? "membre" : "classique",
        at,
        heure: fmtHeure(at),
        titre: nom,
        sous: membre ? `suivi · ${fu.type || "membre du club"}` : `suivi · client classique`,
        tag: membre ? "membre" : "hors club",
      });
    }

    return out;
  }, [prospects, followUps, clients, currentUser?.id, idsMembres, lundi]);

  // ── Les séances découverte de la semaine (tunnel /reserver) ─────────────
  // Même fenêtre que les RDV. Portée = le CLUB (pas un coach) : ces résas n'ont
  // pas de distributeur assigné, on les cale sur le planning commun.
  const decouvertes = useMemo(() => {
    const finSemaine = new Date(lundi);
    finSemaine.setDate(finSemaine.getDate() + 7);
    const out: Array<Evenement & { at: Date }> = [];
    for (const b of decouvertesResa) {
      const at = new Date(b.slot_start);
      if (Number.isNaN(at.getTime()) || at < lundi || at >= finSemaine) continue;
      const prenom = (b.first_name ?? "").trim() || "Prospect";
      const aDeux = b.people_count === 2;
      const obj = b.objectif ? OBJECTIF_LABEL[b.objectif] ?? null : null;
      out.push({
        id: `decouverte-${b.id}`,
        famille: "decouverte",
        at,
        heure: fmtHeure(at),
        titre: aDeux ? `${prenom} + 1` : prenom,
        sous: ["séance découverte", obj, aDeux ? "à deux" : null, b.status === "confirmed" ? "confirmée" : null]
          .filter(Boolean)
          .join(" · "),
        tag: "découverte",
        bookingId: b.id,
      });
    }
    return out;
  }, [decouvertesResa, lundi]);

  // ── Assemblage jour par jour ────────────────────────────────────────────
  const semaine = useMemo(() => {
    return jours.map((jour) => {
      const evs: Evenement[] = [];

      // Permanence : dimanche exclu — le club ouvre 6 jours sur 7. Le jour de
      // fermeture n'est pas (encore) réglable ; il n'existe nulle part en base.
      // Sans club connu (le temps que `useBbcMode` le charge, ou faute de club
      // créé), il n'y a AUCUNE permanence à afficher : on ne sait pas qui tient
      // le bar, et la feuille s'ouvrirait sur un geste voué à échouer — `assign`
      // rend false d'entrée sans `club_id`. Le reste de la semaine (RDV, rituels,
      // bilans) reste lisible.
      if (jour.getDay() !== 0 && clubId) {
        const shift = shifts.parJour.get(cleJour(jour));
        const qui = shift ? nomsUsers.get(shift.userId) : null;
        const debutTexte = shift ? fmtHeure(shift.startsAt) : `${shifts.creneau.startH}h`;
        // Tant que la semaine n'est pas revenue de la base, `parJour` est vide —
        // strictement indiscernable d'un matin réellement sans personne. Sans ce
        // test, un coach dont les 6 matins sont pourtant affectés voyait les 6
        // lignes crier « personne n'ouvre » à chaque ouverture de l'onglet (le
        // temps d'un aller-retour en 4G au comptoir), puis basculer sur les noms.
        // Une alarme qui se déclenche à faux à chaque visite s'apprend à
        // s'ignorer : l'ambre est donc réservé à un matin vide CONFIRMÉ par le
        // serveur. Le repli après ÉCHEC de fetch reste, lui, volontairement
        // « personne n'ouvre » (cf. useClubShifts) — alerter à tort est le sens
        // sûr, rassurer à tort ne l'est pas.
        const enAttente = shifts.loading && !shift;
        evs.push({
          id: `perm-${cleJour(jour)}`,
          famille: "perm",
          heure: debutTexte,
          titre: shift || enAttente ? "Permanence du matin" : "Personne n'ouvre",
          sous: enAttente ? "chargement…" : shift ? (qui ?? "affecté") : "touche pour affecter quelqu'un",
          tag: enAttente ? "…" : shift ? "club" : "à couvrir",
          vide: !shift && !enAttente,
          // Pas d'affectation à l'aveugle : tant qu'on ignore si le matin est
          // déjà tenu, ouvrir la feuille reviendrait à écraser quelqu'un sans
          // jamais avoir vu son nom (la RPC remplace ce qui chevauche).
          jour: enAttente ? undefined : jour,
        });
      }

      for (const c of rituels) {
        if (!isSameDay(c.at, jour)) continue;
        const inscrits = calls.forOccurrence(c.key, c.at).length;
        evs.push({
          id: `rituel-${c.key}-${cleJour(c.at)}`,
          famille: "rituel",
          heure: fmtHeure(c.at),
          titre: c.label,
          sous: inscrits ? `${inscrits} inscrit${inscrits > 1 ? "s" : ""}` : "personne d'inscrit",
          tag: "rituel",
        });
      }

      for (const r of rdv) {
        if (!isSameDay(r.at, jour)) continue;
        evs.push(r);
      }

      for (const d of decouvertes) {
        if (!isSameDay(d.at, jour)) continue;
        evs.push(d);
      }

      // Tri par heure ; la permanence garde sa place de première ligne du jour
      // même si un RDV est posé avant l'ouverture (cas rare mais vécu). Un rang
      // explicite plutôt que des retours -1/1 en cascade : un comparateur
      // incohérent avec lui-même donne un ordre indéfini le jour où deux
      // permanences coexistent.
      const rang = (e: Evenement) => (e.famille === "perm" ? 0 : 1);
      evs.sort(
        (a, b) => rang(a) - rang(b) || a.heure.localeCompare(b.heure, "fr", { numeric: true }),
      );

      return { jour, evs };
    });
  }, [jours, clubId, shifts.parJour, shifts.creneau, shifts.loading, nomsUsers, rituels, calls, rdv, decouvertes]);

  const garde = (f: Famille): boolean => {
    if (filtre === "all") return true;
    // « RDV » couvre membres ET clients classiques : la chip parle de gens, pas
    // d'appartenance au club. Les séances découverte ont leur propre chip.
    if (filtre === "rdv") return f === "membre" || f === "classique";
    return filtre === f;
  };

  const bilansVisibles = garde("bilan") ? aCaler : [];
  const joursVisibles = semaine
    .map((d) => ({ ...d, evs: d.evs.filter((e) => garde(e.famille)) }))
    .filter((d) => d.evs.length > 0);
  const rienAAfficher = joursVisibles.length === 0 && bilansVisibles.length === 0;

  const shiftDuJourChoisi = feuille ? shifts.parJour.get(cleJour(feuille)) : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", maxWidth: 720 }}>
      {/* Sous-titre : la plage RÉELLEMENT couverte + le créneau d'ouverture du
          club. La liste rend les 7 jours (un suivi peut être calé un dimanche,
          et `DAY_INDEX` accepte un rituel dominical) ; s'arrêter à samedi ici
          faisait mentir l'en-tête sur ce que l'écran couvre, au risque qu'on
          rate ce qui s'y trouve. Seule la PERMANENCE saute le dimanche — d'où
          la précision « du lundi au samedi » accolée aux horaires. */}
      <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11.5, lineHeight: 1.5, color: "var(--ls-bbc-hint)", marginTop: -14, marginBottom: 16 }}>
        {fmtJour(jours[0])} → {fmtJour(jours[6])} · ouverture {openHours} du lundi au samedi
      </div>

      {/* ── Chips de filtre ─────────────────────────────────────────────── */}
      <div role="group" aria-label="Filtrer la semaine" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12, marginBottom: 4, borderBottom: "1px solid var(--ls-bbc-line)" }}>
        {CHIPS.map((c) => {
          const on = c.k === filtre;
          return (
            <button
              key={c.k}
              type="button"
              aria-pressed={on}
              onClick={() => setFiltre(c.k)}
              style={{
                flex: "none",
                padding: "7px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: "var(--ls-bbc-font-body)",
                border: `1px solid ${on ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line2)"}`,
                background: on ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s1)",
                color: on ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-muted)",
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* ── Bandeau bilans à caler ──────────────────────────────────────── */}
      {aCaler.length > 0 ? (
        <button
          type="button"
          onClick={() => setFiltre("bilan")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            textAlign: "left",
            marginTop: 12,
            padding: "11px 13px",
            borderRadius: 13,
            fontSize: 12.5,
            cursor: "pointer",
            fontFamily: "var(--ls-bbc-font-body)",
            color: "var(--ls-bbc-text)",
            background: "color-mix(in srgb, var(--ls-bbc-coral) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--ls-bbc-coral) 30%, transparent)",
          }}
        >
          <span aria-hidden="true">🎁</span>
          <span>
            <b style={{ color: "var(--ls-bbc-coral)" }}>
              {aCaler.length} bilan{aCaler.length > 1 ? "s" : ""} à caler
            </b>{" "}
            — {aCaler.slice(0, 3).map((m) => m.name.split(" ")[0]).join(", ")}
            {aCaler.length > 3 ? "…" : ""} {aCaler.length > 1 ? "ont" : "a"} fini {aCaler.length > 1 ? "leur" : "sa"} carte.
          </span>
        </button>
      ) : null}

      {/* ── La semaine ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 16 }}>
        {/* Les bilans n'ont PAS de date : les planter un jour au hasard serait
            inventer une information. Ils vivent donc dans leur propre bloc, en
            tête — c'est ce qui reste à décider avant de lire la semaine. */}
        {bilansVisibles.length > 0 ? (
          <div>
            <EnTeteJour libelle="à caler · sans date" />
            {bilansVisibles.map((m) => (
              <LigneEvenement
                key={`bilan-${m.id}`}
                ev={{
                  id: `bilan-${m.id}`,
                  famille: "bilan",
                  heure: "—",
                  titre: `${m.name} · bilan à caler`,
                  sous: m.card ? `carte finie · ${m.card.used}/${m.card.type} visites` : "carte finie",
                  tag: "à caler",
                }}
              />
            ))}
          </div>
        ) : null}

        {joursVisibles.map(({ jour, evs }) => (
          <div key={cleJour(jour)}>
            <EnTeteJour
              libelle={fmtJour(jour)}
              aujourdhui={isSameDay(jour, new Date())}
              ferme={joursFermes.includes(cleJour(jour))}
              onBasculer={clubId ? () => void basculerJour(jour) : undefined}
            />
            {evs.map((ev) => (
              <LigneEvenement
                key={ev.id}
                ev={ev}
                onClick={
                  ev.jour
                    ? () => ouvrirFeuille(ev.jour!)
                    : ev.bookingId
                      ? () => ouvrirDecouverte(ev.bookingId!)
                      : undefined
                }
              />
            ))}
          </div>
        ))}

        {rienAAfficher ? (
          <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)", padding: "24px 0", textAlign: "center" }}>
            Rien de ce type cette semaine.
          </div>
        ) : null}
      </div>

      {/* ── Feuille « Qui tient le bar ? » ──────────────────────────────── */}
      {feuille ? (
        <FeuilleAffectation
          jour={feuille}
          creneauTexte={openHours}
          equipe={equipe}
          actuelId={shiftDuJourChoisi?.userId ?? null}
          erreur={erreurFeuille}
          onFermer={fermerFeuille}
          onAffecter={async (id) => {
            setErreurFeuille(null);
            const ok = await shifts.assign(feuille, id);
            // On ne ferme la feuille QUE si la base a dit oui : refermer sur un
            // échec ferait passer un refus pour une réussite, d'autant que la
            // peinture optimiste a affiché le nom une seconde avant de le retirer.
            if (ok) setFeuille(null);
            else setErreurFeuille("Impossible d'affecter — vérifie ta connexion, puis réessaie.");
          }}
          onLiberer={async () => {
            setErreurFeuille(null);
            const ok = await shifts.clear(feuille);
            if (ok) setFeuille(null);
            else setErreurFeuille("Impossible de libérer ce matin — réessaie.");
          }}
        />
      ) : null}

      {/* ── Feuille séance découverte — confirmer / annuler ─────────────── */}
      {decouverteOuverte ? (
        <FeuilleDecouverte
          booking={decouverteOuverte}
          erreur={erreurDecouverte}
          onFermer={fermerDecouverte}
          onConfirmer={async () => {
            setErreurDecouverte(null);
            const ok = await setStatutDecouverte(decouverteOuverte.id, "confirmed");
            if (!ok) setErreurDecouverte("Impossible de confirmer — vérifie ta connexion, puis réessaie.");
          }}
          onAnnuler={async () => {
            setErreurDecouverte(null);
            const ok = await setStatutDecouverte(decouverteOuverte.id, "canceled");
            // Succès : la résa sort de `decouvertesResa`, la feuille se referme
            // d'elle-même (decouverteOuverte redevient null au prochain render).
            if (!ok) setErreurDecouverte("Impossible d'annuler — réessaie.");
          }}
        />
      ) : null}
    </div>
  );
}

// ─── Briques d'affichage ─────────────────────────────────────────────────────

function EnTeteJour({
  libelle,
  aujourdhui,
  ferme,
  onBasculer,
}: {
  libelle: string;
  aujourdhui?: boolean;
  /** Journée fermée aux réservations du site (discovery.holidays). */
  ferme?: boolean;
  /** Absent = journée non pilotable (pas de club, ou pas d'ouverture ce jour). */
  onBasculer?: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 7 }}>
      <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ls-bbc-muted)" }}>
        {libelle}
      </span>
      {aujourdhui ? (
        <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: "var(--ls-bbc-lime)", color: "var(--ls-bbc-lime-ink)" }}>
          aujourd'hui
        </span>
      ) : null}
      <span style={{ flex: 1, height: 1, background: "var(--ls-bbc-line)" }} />
      {/* Fermer une journée aux réservations — le « demain matin je fais du
          vélo ». Écrit dans discovery.holidays : effet immédiat sur le site. */}
      {onBasculer ? (
        <button
          type="button"
          onClick={onBasculer}
          aria-pressed={Boolean(ferme)}
          title={ferme ? "Rouvrir cette journée aux réservations" : "Fermer cette journée aux réservations"}
          style={{
            flex: "none",
            fontFamily: "var(--ls-bbc-font-mono)",
            fontSize: 9.5,
            fontWeight: 700,
            padding: "3px 9px",
            borderRadius: 999,
            cursor: "pointer",
            border: `1px solid ${ferme ? "var(--ls-bbc-amber)" : "var(--ls-bbc-line)"}`,
            background: ferme ? "color-mix(in srgb, var(--ls-bbc-amber) 18%, transparent)" : "transparent",
            color: ferme ? "var(--ls-bbc-amber)" : "var(--ls-bbc-muted)",
          }}
        >
          {ferme ? "réservations fermées" : "réservations ouvertes"}
        </button>
      ) : null}
    </div>
  );
}

function LigneEvenement({ ev, onClick }: { ev: Evenement; onClick?: () => void }) {
  const teinte = ev.vide ? "var(--ls-bbc-amber)" : TEINTE[ev.famille];
  const contenu = (
    <>
      <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11.5, color: "var(--ls-bbc-muted)", flex: "none", width: 42 }}>
        {ev.heure}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 600 }}>{ev.titre}</span>
        <span style={{ display: "block", fontSize: 11.5, marginTop: 1, color: ev.vide ? "var(--ls-bbc-amber)" : "var(--ls-bbc-hint)" }}>
          {ev.sous}
        </span>
      </span>
      <span
        style={{
          fontFamily: "var(--ls-bbc-font-mono)",
          fontSize: 9.5,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          padding: "3px 7px",
          borderRadius: 7,
          flex: "none",
          color: ev.famille === "classique" && !ev.vide ? "var(--ls-bbc-muted)" : teinte,
          background:
            ev.famille === "classique" && !ev.vide
              ? "var(--ls-bbc-s3)"
              : `color-mix(in srgb, ${teinte} 15%, transparent)`,
        }}
      >
        {ev.tag}
      </span>
    </>
  );

  const style: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    textAlign: "left",
    padding: "11px 12px",
    borderRadius: 12,
    marginBottom: 6,
    color: "var(--ls-bbc-text)",
    fontFamily: "var(--ls-bbc-font-body)",
    // Le créneau non couvert sort du lot : ambre, pointillé, fond teinté. C'est
    // volontairement la seule ligne « bruyante » de l'écran.
    background: ev.vide ? "color-mix(in srgb, var(--ls-bbc-amber) 7%, transparent)" : "var(--ls-bbc-s1)",
    border: `1px ${ev.vide ? "dashed" : "solid"} ${ev.vide ? "color-mix(in srgb, var(--ls-bbc-amber) 40%, transparent)" : "var(--ls-bbc-line)"}`,
    borderLeft: `3px solid ${teinte}`,
    cursor: onClick ? "pointer" : "default",
  };

  // Une ligne actionnable est un <button> : au clavier comme au lecteur d'écran,
  // un <div onClick> n'existe pas.
  return onClick ? (
    <button type="button" onClick={onClick} style={style}>
      {contenu}
    </button>
  ) : (
    <div style={style}>{contenu}</div>
  );
}

function FeuilleAffectation({
  jour,
  creneauTexte,
  equipe,
  actuelId,
  erreur,
  onFermer,
  onAffecter,
  onLiberer,
}: {
  jour: Date;
  creneauTexte: string;
  equipe: Affectable[];
  actuelId: string | null;
  /** Message d'échec du dernier geste — null quand tout va bien. */
  erreur: string | null;
  onFermer: () => void;
  onAffecter: (userId: string) => Promise<void>;
  onLiberer: () => Promise<void>;
}) {
  const [choisi, setChoisi] = useState<string | null>(actuelId);
  // L'écriture passe par un aller-retour réseau : sans cet état, un appui pendant
  // le vol relançait un second RPC (qui efface puis réinsère) pour rien.
  const [envoi, setEnvoi] = useState(false);

  const lancer = async (geste: () => Promise<void>) => {
    if (envoi) return;
    setEnvoi(true);
    try {
      await geste();
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div
      onClick={onFermer}
      style={{ position: "fixed", inset: 0, zIndex: 1300, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bbc-mode"
        role="dialog"
        aria-modal="true"
        aria-label={actuelId ? "Changer la permanence" : "Qui tient le bar ?"}
        style={{
          width: "100%",
          maxWidth: 460,
          maxHeight: "84vh",
          overflowY: "auto",
          background: "var(--ls-bbc-s1)",
          border: "1px solid var(--ls-bbc-line2)",
          borderRadius: "22px 22px 0 0",
          padding: "18px 18px calc(26px + env(safe-area-inset-bottom))",
          color: "var(--ls-bbc-text)",
          fontFamily: "var(--ls-bbc-font-body)",
        }}
      >
        <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 20 }}>
          {actuelId ? "Changer la permanence" : "Qui tient le bar ?"}
        </div>
        <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-hint)", marginBottom: 15 }}>
          {fmtJour(jour)} · {creneauTexte}
        </div>

        {equipe.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)", padding: "10px 0" }}>
            Personne à afficher — ton équipe est vide pour l'instant.
          </div>
        ) : (
          equipe.map((p) => {
            const on = choisi === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() => setChoisi(p.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 13px",
                  borderRadius: 12,
                  marginBottom: 7,
                  cursor: "pointer",
                  fontFamily: "var(--ls-bbc-font-body)",
                  fontSize: 14,
                  color: "var(--ls-bbc-text)",
                  background: on ? "color-mix(in srgb, var(--ls-bbc-lime) 10%, transparent)" : "var(--ls-bbc-s2)",
                  border: `1px solid ${on ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line)"}`,
                }}
              >
                <Avatar nom={p.name} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 600 }}>{p.name}</span>
                  <span style={{ display: "block", fontSize: 11, color: "var(--ls-bbc-hint)" }}>{p.role}</span>
                </span>
              </button>
            );
          })
        )}

        {/* L'échec s'affiche juste au-dessus du bouton qui vient de refuser —
            c'est là que le regard revient, et c'est là que le geste se retente. */}
        {erreur ? (
          <div
            role="alert"
            style={{
              marginTop: 12,
              padding: "10px 12px",
              borderRadius: 11,
              fontSize: 12.5,
              lineHeight: 1.45,
              color: "var(--ls-bbc-coral)",
              background: "color-mix(in srgb, var(--ls-bbc-coral) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--ls-bbc-coral) 35%, transparent)",
            }}
          >
            {erreur}
          </div>
        ) : null}

        <button
          type="button"
          disabled={!choisi || envoi}
          onClick={() => choisi && void lancer(() => onAffecter(choisi))}
          style={{
            width: "100%",
            minHeight: 50,
            border: 0,
            borderRadius: 13,
            marginTop: 10,
            cursor: choisi && !envoi ? "pointer" : "default",
            opacity: choisi && !envoi ? 1 : 0.5,
            background: "var(--ls-bbc-lime)",
            color: "var(--ls-bbc-lime-ink)",
            fontFamily: "var(--ls-bbc-font-body)",
            fontSize: 15,
            fontWeight: 800,
          }}
        >
          {envoi ? "…" : "Affecter"}
        </button>
        <button
          type="button"
          onClick={onFermer}
          style={{
            width: "100%",
            minHeight: 44,
            marginTop: 8,
            borderRadius: 12,
            border: "1px solid var(--ls-bbc-line2)",
            background: "transparent",
            color: "var(--ls-bbc-muted)",
            fontFamily: "var(--ls-bbc-font-body)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Annuler
        </button>
        {/* Ajout assumé à la maquette : sans ce geste, une permanence posée par
            erreur ne pouvait plus JAMAIS être retirée — il n'existe aucun autre
            chemin vers `clear()`. Discret, et réservé au cas occupé. */}
        {actuelId ? (
          <button
            type="button"
            disabled={envoi}
            onClick={() => void lancer(onLiberer)}
            style={{
              width: "100%",
              minHeight: 40,
              marginTop: 6,
              border: 0,
              background: "transparent",
              color: "var(--ls-bbc-coral)",
              fontFamily: "var(--ls-bbc-font-body)",
              fontSize: 12.5,
              opacity: envoi ? 0.5 : 1,
              cursor: envoi ? "default" : "pointer",
            }}
          >
            libérer ce matin
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─── Feuille séance découverte — confirmer / annuler ──────────────────────
// Contrepartie BBC de ClubDiscoveryWidget (CRM, mode Classic) : mêmes deux
// gestes (confirmer, annuler), même hook. Volontairement plus sobre — pas de
// lien Google Agenda ici, ce n'est pas le rôle de cette feuille.
function FeuilleDecouverte({
  booking,
  erreur,
  onFermer,
  onConfirmer,
  onAnnuler,
}: {
  booking: ClubDiscoveryBooking;
  erreur: string | null;
  onFermer: () => void;
  onConfirmer: () => Promise<void>;
  onAnnuler: () => Promise<void>;
}) {
  // L'écriture passe par un aller-retour réseau : sans cet état, un appui
  // pendant le vol relançait un second update pour rien (même pattern que
  // FeuilleAffectation ci-dessus).
  const [envoi, setEnvoi] = useState<"confirmer" | "annuler" | null>(null);

  const lancer = async (geste: "confirmer" | "annuler", action: () => Promise<void>) => {
    if (envoi) return;
    setEnvoi(geste);
    try {
      await action();
    } finally {
      setEnvoi(null);
    }
  };

  const aDeux = booking.people_count === 2;
  const prenom = (booking.first_name ?? "").trim() || "Prospect";
  const obj = booking.objectif ? OBJECTIF_LABEL[booking.objectif] ?? null : null;
  const quand = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(booking.slot_start));

  return (
    <div
      onClick={onFermer}
      style={{ position: "fixed", inset: 0, zIndex: 1300, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bbc-mode"
        role="dialog"
        aria-modal="true"
        aria-label="Séance découverte"
        style={{
          width: "100%",
          maxWidth: 460,
          maxHeight: "84vh",
          overflowY: "auto",
          background: "var(--ls-bbc-s1)",
          border: "1px solid var(--ls-bbc-line2)",
          borderRadius: "22px 22px 0 0",
          padding: "18px 18px calc(26px + env(safe-area-inset-bottom))",
          color: "var(--ls-bbc-text)",
          fontFamily: "var(--ls-bbc-font-body)",
        }}
      >
        <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 20 }}>
          {aDeux ? `${prenom} + 1` : prenom}
        </div>
        <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-hint)", marginTop: 4, marginBottom: 15 }}>
          {quand}
          {obj ? ` · ${obj}` : ""}
          {aDeux ? " · à deux" : ""}
        </div>

        <div
          style={{
            padding: "12px 13px",
            borderRadius: 12,
            background: "var(--ls-bbc-s2)",
            border: "1px solid var(--ls-bbc-line)",
            fontSize: 13,
            marginBottom: 6,
          }}
        >
          <div style={{ color: "var(--ls-bbc-hint)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
            Statut
          </div>
          {booking.status === "confirmed" ? "✓ Confirmée" : "À confirmer"}
          {booking.contact ? (
            <div style={{ marginTop: 8, color: "var(--ls-bbc-text)" }}>{booking.contact}</div>
          ) : null}
        </div>

        {erreur ? (
          <div
            role="alert"
            style={{
              marginTop: 12,
              padding: "10px 12px",
              borderRadius: 11,
              fontSize: 12.5,
              lineHeight: 1.45,
              color: "var(--ls-bbc-coral)",
              background: "color-mix(in srgb, var(--ls-bbc-coral) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--ls-bbc-coral) 35%, transparent)",
            }}
          >
            {erreur}
          </div>
        ) : null}

        {booking.status !== "confirmed" ? (
          <button
            type="button"
            disabled={envoi !== null}
            onClick={() => void lancer("confirmer", onConfirmer)}
            style={{
              width: "100%",
              minHeight: 50,
              border: 0,
              borderRadius: 13,
              marginTop: 14,
              cursor: envoi ? "default" : "pointer",
              opacity: envoi && envoi !== "confirmer" ? 0.5 : 1,
              background: "var(--ls-bbc-lime)",
              color: "var(--ls-bbc-lime-ink)",
              fontFamily: "var(--ls-bbc-font-body)",
              fontSize: 15,
              fontWeight: 800,
            }}
          >
            {envoi === "confirmer" ? "…" : "Confirmer"}
          </button>
        ) : null}
        <button
          type="button"
          disabled={envoi !== null}
          onClick={() => void lancer("annuler", onAnnuler)}
          style={{
            width: "100%",
            minHeight: 44,
            marginTop: 8,
            borderRadius: 12,
            border: "1px solid var(--ls-bbc-line2)",
            background: "transparent",
            color: envoi === "annuler" ? "var(--ls-bbc-muted)" : "var(--ls-bbc-coral)",
            fontFamily: "var(--ls-bbc-font-body)",
            fontSize: 13,
            fontWeight: 600,
            cursor: envoi ? "default" : "pointer",
            opacity: envoi && envoi !== "annuler" ? 0.5 : 1,
          }}
        >
          {envoi === "annuler" ? "…" : "Annuler la séance"}
        </button>
        <button
          type="button"
          onClick={onFermer}
          style={{
            width: "100%",
            minHeight: 40,
            marginTop: 8,
            borderRadius: 12,
            border: "none",
            background: "transparent",
            color: "var(--ls-bbc-hint)",
            fontFamily: "var(--ls-bbc-font-body)",
            fontSize: 12.5,
            cursor: "pointer",
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

function Avatar({ nom }: { nom: string }): ReactNode {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 34,
        height: 34,
        borderRadius: 999,
        flex: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--ls-bbc-s3)",
        color: "var(--ls-bbc-teal)",
        fontFamily: "var(--ls-bbc-font-mono)",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {(nom.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}
