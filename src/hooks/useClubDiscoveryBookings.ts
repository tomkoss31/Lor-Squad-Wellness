// =============================================================================
// useClubDiscoveryBookings — RDV découverte réservés via le tunnel public
// du Breakfast Club (/reserver). Table rdv_bookings, lignes "club" :
// coach_user_id = null, club_id = <club>. Lisibles par les admins (RLS
// rdv_bookings_club_admin_read, 2026-07-31).
//
// Jumeau de useCoachRdvBookings, mais scopé au club et avec les champs propres
// au RDV découverte (nb de personnes, binôme, objectif).
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";
import { setRdvBookingStatus } from "../services/sb/rdvBookingStatus";

export interface ClubDiscoveryBooking {
  id: string;
  first_name: string | null;
  contact: string | null;
  slot_start: string;
  slot_end: string;
  status: "requested" | "confirmed" | "canceled";
  people_count: number;
  partner_first_name: string | null;
  objectif: string | null;
  confirm_email_sent_at: string | null;
  reminder_email_sent_at: string | null;
}

interface Result {
  bookings: ClubDiscoveryBooking[];
  loading: boolean;
  reload: () => Promise<void>;
  /** Retourne false sur échec (réseau, RLS…) — l'appelant décide quoi en dire. */
  setStatus: (id: string, status: ClubDiscoveryBooking["status"]) => Promise<boolean>;
}

export function useClubDiscoveryBookings(clubId: string | null | undefined): Result {
  const [bookings, setBookings] = useState<ClubDiscoveryBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!clubId) {
      setBookings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const sb = await getSupabaseClient();
    if (!sb) {
      setBookings([]);
      setLoading(false);
      return;
    }
    const { data, error } = await sb
      .from("rdv_bookings")
      .select(
        "id, first_name, contact, slot_start, slot_end, status, people_count, partner_first_name, objectif, confirm_email_sent_at, reminder_email_sent_at",
      )
      .eq("club_id", clubId)
      .is("coach_user_id", null)
      .neq("status", "canceled")
      .gte("slot_start", new Date().toISOString())
      .order("slot_start", { ascending: true })
      .limit(100);
    if (error) {
      setBookings([]);
    } else {
      setBookings((data ?? []) as ClubDiscoveryBooking[]);
    }
    setLoading(false);
  }, [clubId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setStatus = useCallback(
    async (id: string, status: ClubDiscoveryBooking["status"]): Promise<boolean> => {
      // Chemin unique — il porte l'email d'acceptation.
      const { error } = await setRdvBookingStatus(id, status);
      if (error) return false;
      setBookings((prev) =>
        status === "canceled"
          ? prev.filter((b) => b.id !== id)
          : prev.map((b) => (b.id === id ? { ...b, status } : b)),
      );
      return true;
    },
    [],
  );

  return { bookings, loading, reload, setStatus };
}
