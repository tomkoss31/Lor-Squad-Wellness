// =============================================================================
// useClubShifts — les permanences du club dans l'agenda (LOT 6.6, 2026-07-27).
//
// « Qui tient le club, et quand ». Ce n'est pas un rendez-vous : c'est une
// plage de présence au bar, stockée dans `club_shifts` (table dédiée — un
// créneau de permanence n'a ni client, ni statut de conversion, ni rappel).
//
// Le hook ne charge que la semaine affichée : l'agenda peut remonter des mois
// en arrière, inutile de tout tirer.
//
// ⚠ Une feature qu'on ne peut pas alimenter meurt. On a déjà eu le cas dans
// cette app (`exposures` : 2 lignes en tout). Le hook expose donc `create` et
// `remove` dès le premier jour, et l'agenda pose une permanence en un clic.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

export interface ClubShift {
  id: string;
  clubId: string;
  userId: string;
  startsAt: Date;
  endsAt: Date;
  note?: string | null;
}

interface ShiftRow {
  id: string;
  club_id: string;
  user_id: string;
  starts_at: string;
  ends_at: string;
  note: string | null;
}

export interface UseClubShiftsResult {
  shifts: ClubShift[];
  /** Le club auquel rattacher une nouvelle permanence (null = aucun club). */
  clubId: string | null;
  loading: boolean;
  create: (userId: string, startsAt: Date, endsAt: Date) => Promise<void>;
  remove: (shiftId: string) => Promise<void>;
}

export function useClubShifts(rangeStart: Date, rangeEnd: Date): UseClubShiftsResult {
  const [shifts, setShifts] = useState<ClubShift[]>([]);
  const [clubId, setClubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Bornes en millisecondes : deux objets Date différents pour la même
  // instante relanceraient l'effet à chaque render.
  const startMs = rangeStart.getTime();
  const endMs = rangeEnd.getTime();

  const load = useCallback(async () => {
    const sb = await getSupabaseClient();
    if (!sb) return;
    setLoading(true);
    try {
      const [{ data: clubs }, { data: rows }] = await Promise.all([
        sb.from("clubs").select("id").eq("active", true).limit(1),
        sb
          .from("club_shifts")
          .select("id, club_id, user_id, starts_at, ends_at, note")
          .gte("starts_at", new Date(startMs).toISOString())
          .lte("starts_at", new Date(endMs).toISOString())
          .order("starts_at", { ascending: true }),
      ]);
      setClubId(clubs?.[0]?.id ?? null);
      setShifts(
        ((rows ?? []) as ShiftRow[]).map((r) => ({
          id: r.id,
          clubId: r.club_id,
          userId: r.user_id,
          startsAt: new Date(r.starts_at),
          endsAt: new Date(r.ends_at),
          note: r.note,
        })),
      );
    } catch {
      // Table absente ou réseau coupé : l'agenda doit rester utilisable.
      // Les permanences sont un calque, pas le cœur de la page.
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, [startMs, endMs]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(
    async (userId: string, startsAt: Date, endsAt: Date) => {
      if (!clubId) return;
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { error } = await sb.from("club_shifts").insert({
        club_id: clubId,
        user_id: userId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      });
      if (error) throw new Error(error.message);
      await load();
    },
    [clubId, load],
  );

  const remove = useCallback(
    async (shiftId: string) => {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { error } = await sb.from("club_shifts").delete().eq("id", shiftId);
      if (error) throw new Error(error.message);
      await load();
    },
    [load],
  );

  return { shifts, clubId, loading, create, remove };
}
