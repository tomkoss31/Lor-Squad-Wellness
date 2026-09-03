// =============================================================================
// useBbcVisits — pointage + cartes de membre (chantier BBC).
// Membres = clients ebe_bbc du coach. Toute écriture d'une visite passe par la
// RPC `bbc_add_visit` (chemin UNIQUE, partagé avec le scan QR) : elle rattache
// la visite à la carte active et ferme la carte quand son quota est atteint.
// Alerte : 7-9 = orange (bientôt bilan), 10+ = rouge (bilan des 10 à faire).
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

export type VisitLevel = "ok" | "warn" | "bilan";

/**
 * Niveau d'alerte basé sur la CARTE EN COURS, pas sur le cumul à vie.
 * Sans carte active, aucune alerte : un membre à 23 visites cumulées et une
 * carte de 30 en cours n'est pas « en retard de bilan ».
 *  - carte consommée (used >= type) → bilan à faire
 *  - dernières 3 visites de la carte  → bientôt le bilan
 */
export function visitLevel(used: number, cardType?: number | null): VisitLevel {
  if (!cardType) return "ok";
  if (used >= cardType) return "bilan";
  if (used >= cardType - 3) return "warn";
  return "ok";
}

export interface MemberCard {
  cardId: string;
  type: number;
  used: number;
  remaining: number;
  expiresAt: string | null;
  /** Carte périmée : elle reste visible pour être renouvelée. */
  expired: boolean;
}

export interface VisitMember {
  id: string;
  name: string;
  visits: number;
  card: MemberCard | null;
  /** A été pointé aujourd'hui — seul cas où l'on propose d'annuler. */
  visitedToday: boolean;
}

export interface UseBbcVisitsResult {
  members: VisitMember[];
  loading: boolean;
  addVisit: (clientId: string) => Promise<void>;
  removeVisit: (clientId: string) => Promise<void>;
  /** `days` vient de `clubs.settings.cards.<type>.days` : sans lui, la RPC
   *  retombe sur ses défauts et la date d'expiration contredit ce que l'écran
   *  annonce au coach. */
  assignCard: (
    clientId: string,
    type: 10 | 30,
    priceEur?: number | null,
    days?: number | null,
    /** ISO du premier jour de validité. null = aujourd'hui. */
    debutIso?: string | null,
  ) => Promise<boolean>;
  refetch: () => Promise<void>;
}

/**
 * @param clubId  Le club où l'on tient le comptoir. Quand il est connu, cet
 *   écran liste les membres DU CLUB et plus seulement « mes fiches ».
 *
 *   ⚠️ 03/09 — Thomas : « pour les cartes je fais comment ? j'ai cliqué sur
 *   leur profil mais rien ne se passe ». Le bouton « carte » vit ICI, et
 *   Gaëlle n'y était pas : sa fiche est chez Mélanie, la requête filtrait
 *   sur `distributor_id = moi`. La base autorisait déjà le geste (les RPC
 *   `bbc_active_cards` / `bbc_visit_counts` prévoient l'admin du club) —
 *   c'est l'écran qui ne montrait pas la personne.
 *
 *   La RLS de `clients` reste seule juge : un coach non-admin ne verra
 *   toujours que ses propres fiches, club renseigné ou non.
 */
export function useBbcVisits(userId?: string | null, clubId?: string | null): UseBbcVisitsResult {
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [cards, setCards] = useState<Record<string, MemberCard>>({});
  const [today, setToday] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const sb = await getSupabaseClient();
      if (!sb) {
        setLoading(false);
        return;
      }
      const [clientsRes, countsRes, cardsRes, todayRes] = await Promise.all([
        // Seuls les MEMBRES BBC entrent dans l'environnement BBC.
        (clubId
          ? sb.from("clients").select("id, first_name, last_name").eq("club_id", clubId)
          : sb.from("clients").select("id, first_name, last_name").eq("distributor_id", userId)
        ).eq("ebe_bbc", true).order("first_name"),
        sb.rpc("bbc_visit_counts"),
        sb.rpc("bbc_active_cards"),
        // Passe par la RPC : la policy de `club_visits` ne rend que MES
        // pointages, donc un membre pointé par l'autre coach reviendrait
        // « pas encore pointé » et serait compté deux fois.
        sb.rpc("bbc_visits_today"),
      ]);
      if (Array.isArray(todayRes.data)) {
        setToday(new Set((todayRes.data as Array<Record<string, unknown>>).map((r) => String(r.client_id))));
      }
      if (Array.isArray(clientsRes.data)) {
        setClients(
          clientsRes.data.map((c: Record<string, unknown>) => ({
            id: String(c.id),
            name: `${String(c.first_name ?? "").trim()} ${String(c.last_name ?? "").trim()}`.trim() || "—",
          })),
        );
      }
      if (Array.isArray(countsRes.data)) {
        const map: Record<string, number> = {};
        for (const row of countsRes.data as Array<Record<string, unknown>>) {
          map[String(row.client_id)] = Number(row.cnt) || 0;
        }
        setCounts(map);
      }
      if (Array.isArray(cardsRes.data)) {
        const map: Record<string, MemberCard> = {};
        for (const row of cardsRes.data as Array<Record<string, unknown>>) {
          const type = Number(row.card_type) || 0;
          const used = Number(row.used) || 0;
          map[String(row.client_id)] = {
            cardId: String(row.card_id),
            type,
            used,
            remaining: Math.max(type - used, 0),
            expiresAt: (row.expires_at as string | null) ?? null,
            expired: Boolean(row.expired),
          };
        }
        setCards(map);
      }
    } catch {
      // silent-fail
    } finally {
      setLoading(false);
    }
  }, [userId, clubId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  /** Annule le dernier pointage. Au comptoir, à 7h30, on se trompe de membre —
   *  et sans retour arrière la visite d'une carte payée était perdue à vie. */
  const removeVisit = useCallback(
    async (clientId: string) => {
      setCounts((prev) => ({ ...prev, [clientId]: Math.max(0, (prev[clientId] ?? 1) - 1) }));
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { error } = await sb.rpc("bbc_remove_visit", { p_client_id: clientId });
        if (error) setCounts((prev) => ({ ...prev, [clientId]: (prev[clientId] ?? 0) + 1 }));
        // La carte a pu se rouvrir : on relit tout.
        void refetch();
      } catch {
        setCounts((prev) => ({ ...prev, [clientId]: (prev[clientId] ?? 0) + 1 }));
      }
    },
    [refetch],
  );

  const addVisit = useCallback(
    async (clientId: string) => {
      // optimiste
      setCounts((prev) => ({ ...prev, [clientId]: (prev[clientId] ?? 0) + 1 }));
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { error } = await sb.rpc("bbc_add_visit", { p_client_id: clientId });
        if (error) setCounts((prev) => ({ ...prev, [clientId]: Math.max(0, (prev[clientId] ?? 1) - 1) }));
        // relit compteurs + carte (la carte a pu se fermer)
        void refetch();
      } catch {
        setCounts((prev) => ({ ...prev, [clientId]: Math.max(0, (prev[clientId] ?? 1) - 1) }));
      }
    },
    [refetch],
  );

  const assignCard = useCallback(
    async (
      clientId: string,
      type: 10 | 30,
      priceEur?: number | null,
      days?: number | null,
      // Le club ouvre le 7 septembre et les cartes se vendent AVANT : sans
      // cette date, une carte 10 visites achetee le 18 aout aurait consomme
      // vingt de ses trente jours le jour du premier petit-dejeuner.
      debutIso?: string | null,
    ): Promise<boolean> => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return false;
        const { error } = await sb.rpc("bbc_assign_card", {
          p_client_id: clientId,
          p_type: type,
          p_price: priceEur ?? null,
          p_days: days ?? null,
          p_started_at: debutIso ?? null,
        });
        if (error) return false;
        await refetch();
        return true;
      } catch {
        return false;
      }
    },
    [refetch],
  );

  const members = useMemo(
    () =>
      clients
        .map((c) => ({ ...c, visits: counts[c.id] ?? 0, card: cards[c.id] ?? null, visitedToday: today.has(c.id) }))
        .sort((a, b) => b.visits - a.visits),
    [clients, counts, cards, today],
  );

  return { members, loading, addVisit, removeVisit, assignCard, refetch };
}
