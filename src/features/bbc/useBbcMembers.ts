// =============================================================================
// useBbcMembers — les membres BBC + leur récap (chantier BBC).
// Agrège : infos fiche + visites (RPC) + cœurs (client_referrals).
//
// ── QUI VOIT QUOI (corrigé le 17/08) ────────────────────────────────────────
// La liste filtrait sur `distributor_id = moi`. Conséquence vécue : Mélanie
// inscrit Gwendoline, et Thomas — qui dirige le club — ne la voit nulle part.
// Or un membre appartient au CLUB, pas à l'un des deux coachs du comptoir.
//
// Un ADMIN voit donc tous les membres de son club ; un coach non-admin garde
// les siens. Ce n'est pas un changement de sécurité : la RLS autorisait DÉJÀ
// la lecture (`clients select own or admin`), c'est l'écran qui restreignait.
//
// Corollaire, moins évident : les visites du jour et les jetons d'application
// étaient eux aussi filtrés par coach. Un membre scanné par Mélanie n'aurait
// pas été « vu aujourd'hui » chez Thomas, et son QR aurait été introuvable.
// Les deux se filtrent désormais sur les membres affichés.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { isHeart } from "./useBbcHearts";

export interface BbcMember {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  objective?: string;
  program?: string;
  lifecycleStatus?: string;
  started: boolean;
  startDate?: string | null;
  nextFollowUp?: string | null;
  /** Cumul de visites à vie (historique). */
  visits: number;
  hearts: number;
  pendingHearts: number;
  /** A pointé (ou été scanné) aujourd'hui. */
  visitedToday: boolean;
  /** Carte active : c'est ELLE qui pilote le solde et l'alerte bilan. */
  card: { type: number; used: number; remaining: number; expired: boolean } | null;
  /** Token d'accès à son app membre — permet au coach d'ouvrir la PWA telle qu'il la voit. */
  appToken?: string;
  /** Qui a inscrit cette personne. Sert au filtre « mes membres » et à l'afficher. */
  ownerId?: string;
  ownerName?: string;
}

export interface UseBbcMembersResult {
  members: BbcMember[];
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useBbcMembers(userId?: string | null): UseBbcMembersResult {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [hearts, setHearts] = useState<Record<string, { done: number; pending: number }>>({});
  const [today, setToday] = useState<Set<string>>(new Set());
  const [cards, setCards] = useState<Record<string, { type: number; used: number; remaining: number; expired: boolean }>>({});
  const [tokens, setTokens] = useState<Record<string, string>>({});
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
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      // Le périmètre : le club pour un admin, sinon ses propres clients.
      // `users.club_id` (migration du 17/08) dit où le coach travaille — un
      // admin qui ne POSSÈDE pas le club en fait partie quand même.
      const { data: moi } = await sb
        .from("users")
        .select("role, club_id")
        .eq("id", userId)
        .maybeSingle();
      const monRole = String((moi as { role?: string } | null)?.role ?? "");
      const monClub = (moi as { club_id?: string | null } | null)?.club_id ?? null;
      const vueClub = monRole === "admin" && !!monClub;

      let requeteClients = sb
        .from("clients")
        .select("id, first_name, last_name, phone, email, objective, current_program, lifecycle_status, started, start_date, next_follow_up, distributor_id, distributor_name")
        .eq("ebe_bbc", true);
      requeteClients = vueClub
        ? requeteClients.eq("club_id", monClub)
        : requeteClients.eq("distributor_id", userId);

      const [clientsRes, countsRes, refsRes, cardsRes] = await Promise.all([
        requeteClients.order("first_name"),
        sb.rpc("bbc_visit_counts"),
        sb.from("client_referrals").select("from_client_id, status"),
        sb.rpc("bbc_active_cards"),
      ]);

      // Visites du jour et jetons : filtrés sur les membres AFFICHÉS, plus sur
      // le coach connecté. Sinon un membre inscrit par l'autre admin n'aurait
      // ni pastille « vu aujourd'hui » ni QR. La RLS reste la vraie barrière.
      const idsAffiches = Array.isArray(clientsRes.data)
        ? (clientsRes.data as Array<Record<string, unknown>>).map((r) => String(r.id))
        : [];
      const [todayRes, tokensRes] = idsAffiches.length
        ? await Promise.all([
            sb.from("club_visits").select("client_id").in("client_id", idsAffiches).gte("visited_at", startOfDay.toISOString()),
            sb.from("client_app_accounts").select("client_id, token").in("client_id", idsAffiches),
          ])
        : [{ data: [] }, { data: [] }];
      if (Array.isArray(tokensRes.data)) {
        const tk: Record<string, string> = {};
        for (const r of tokensRes.data as Array<Record<string, unknown>>) tk[String(r.client_id)] = String(r.token);
        setTokens(tk);
      }
      if (Array.isArray(cardsRes.data)) {
        const cm: Record<string, { type: number; used: number; remaining: number; expired: boolean }> = {};
        for (const row of cardsRes.data as Array<Record<string, unknown>>) {
          const type = Number(row.card_type) || 0;
          const used = Number(row.used) || 0;
          cm[String(row.client_id)] = { type, used, remaining: Math.max(type - used, 0), expired: Boolean(row.expired) };
        }
        setCards(cm);
      }
      if (Array.isArray(todayRes.data)) {
        setToday(new Set((todayRes.data as Array<Record<string, unknown>>).map((r) => String(r.client_id))));
      }
      if (Array.isArray(clientsRes.data)) setRows(clientsRes.data as Record<string, unknown>[]);
      if (Array.isArray(countsRes.data)) {
        const m: Record<string, number> = {};
        for (const r of countsRes.data as Array<Record<string, unknown>>) m[String(r.client_id)] = Number(r.cnt) || 0;
        setCounts(m);
      }
      if (Array.isArray(refsRes.data)) {
        const h: Record<string, { done: number; pending: number }> = {};
        for (const r of refsRes.data as Array<Record<string, unknown>>) {
          const k = String(r.from_client_id);
          const s = String(r.status);
          h[k] = h[k] ?? { done: 0, pending: 0 };
          // Même vocabulaire que useBbcHearts (BBC 'started' + CRM 'converted').
          if (isHeart(s)) h[k].done += 1;
          else if (s !== "lost") h[k].pending += 1;
        }
        setHearts(h);
      }
    } catch {
      // silent-fail
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const members = useMemo(
    () =>
      rows.map((r) => {
        const id = String(r.id);
        const h = hearts[id] ?? { done: 0, pending: 0 };
        return {
          id,
          name: `${String(r.first_name ?? "").trim()} ${String(r.last_name ?? "").trim()}`.trim() || "—",
          phone: (r.phone as string) || undefined,
          email: (r.email as string) || undefined,
          objective: (r.objective as string) || undefined,
          program: (r.current_program as string) || undefined,
          lifecycleStatus: (r.lifecycle_status as string) || undefined,
          started: Boolean(r.started),
          startDate: (r.start_date as string | null) ?? null,
          nextFollowUp: (r.next_follow_up as string | null) ?? null,
          visits: counts[id] ?? 0,
          hearts: h.done,
          pendingHearts: h.pending,
          visitedToday: today.has(id),
          card: cards[id] ?? null,
          appToken: tokens[id],
          ownerId: (r.distributor_id as string) || undefined,
          ownerName: (r.distributor_name as string) || undefined,
        } as BbcMember;
      }),
    [rows, counts, hearts, today, cards, tokens],
  );

  return { members, loading, refetch };
}
