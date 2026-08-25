// =============================================================================
// useClubDiscoveryBookings — RDV découverte réservés via le tunnel public
// du Breakfast Club (/reserver). Table rdv_bookings, lignes "club" :
// club_id = <club>. C'est LUI le discriminant, et lui seul : un RDV pris sur
// /rdv/<prénom> a `club_id` à NULL.
//
// ⚠️ Ne PAS ajouter « coach_user_id = null » à cette définition. C'était vrai
// jusqu'au 19/08 et ça ne l'est plus : les réservations du club ont désormais
// une coache (sinon personne ne les voyait dans son agenda). Un filtre là-dessus
// les ferait toutes disparaître, du CRM comme de l'agenda.
//
// Lisibles par les admins (RLS rdv_bookings_club_admin_read : `club_id is not
// null and is_admin()` — elle ne regarde pas le coach), et par la coache à qui
// le rendez-vous appartient (rdv_bookings_coach_read).
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
  last_name: string | null;
  /** À qui ce rendez-vous appartient. NULL avant le 19/08 pour tout ce qui
   *  venait du club — c'est ce qui le rendait invisible dans l'agenda de la
   *  coache qui s'en occupait. */
  coach_user_id: string | null;
  contact: string | null;
  slot_start: string;
  slot_end: string;
  /** « honored » = la personne est venue (ajouté le 19/08). Il manquait ici. */
  status: "requested" | "confirmed" | "canceled" | "honored";
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
        "id, first_name, last_name, coach_user_id, contact, slot_start, slot_end, status, people_count, partner_first_name, objectif, confirm_email_sent_at, reminder_email_sent_at",
      )
      .eq("club_id", clubId)
      // ⚠️ Il y avait ici un `.is("coach_user_id", null)`. Il servait à isoler
      // les réservations du club de celles du tunnel /rdv/<prénom> — mais
      // `club_id` fait déjà exactement ça, et lui ne ment pas : les RDV d'un
      // coach ont `club_id` à NULL. Depuis le 19/08 les réservations du club
      // ONT un coach (c'est tout l'objet du chantier), donc ce filtre les
      // aurait TOUTES fait disparaître — de l'agenda et du CRM d'un coup.
      // ⚠️ 25/08 — ON GARDE LES CRÉNEAUX PASSÉS TANT QU'ILS NE SONT PAS SOLDÉS.
      //
      // Il y avait ici `.gte("slot_start", maintenant)` : dès qu'un rendez-vous
      // était passé, sa carte disparaissait — et avec elle le SEUL endroit où
      // dire « elle est venue » (`QualifierRdvSheet` ne s'ouvre que depuis ces
      // cartes). Le coach recevait la personne le matin et n'avait plus rien à
      // taper le soir.
      //
      // Preuve par les chiffres, mesurée en base le 25/08 : ZÉRO ligne
      // `honored` depuis la création de cet état le 19/08, et SIX rendez-vous
      // passés jamais soldés — dont claire (4 j), Mylène (7 j), Fatiha (11 j).
      //
      // On remonte donc aussi les créneaux des 14 derniers jours qui attendent
      // encore une réponse. Borné à 14 jours pour ne pas transformer la liste
      // en cimetière : au-delà, le rendez-vous ne se solde plus, il s'oublie.
      .in("status", ["requested", "confirmed"])
      .gte("slot_start", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
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
