// =============================================================================
// useCoachRdvBookings — RDV réservés via le funnel public, côté coach.
// Chantier RDV V2 brique 4 (2026-06-14). Table rdv_bookings (RLS own-row).
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";
import { setRdvBookingStatus } from "../services/sb/rdvBookingStatus";
import { rdvAConclure, FENETRE_A_CONCLURE_MS } from "../features/crm/aConclure";

export interface RdvBookingMetadata {
  last_name?: string | null;
  phone?: string | null;
  city?: string | null;
  looking?: string | null;
  timing?: string | null;
  note?: string | null;
}

export interface RdvBooking {
  id: string;
  first_name: string | null;
  last_name: string | null;
  contact: string | null;
  mode: "presentiel" | "visio";
  slot_start: string;
  slot_end: string;
  status: "requested" | "confirmed" | "canceled" | "honored" | "no_show";
  confirm_email_sent_at: string | null;
  reminder_email_sent_at: string | null;
  // Recrutement « ouvrir un club » (tunnel /club/rejoindre/rdv). 'bilan' = défaut
  // historique. metadata porte les réponses PRO du candidat.
  booking_type: "bilan" | "recrutement";
  metadata: RdvBookingMetadata | null;
}

interface Result {
  /** Les rendez-vous À VENIR — ce que montre « RDV demandés ». Inchangé. */
  bookings: RdvBooking[];
  /** Les rendez-vous PASSÉS et non soldés, du plus ancien au plus récent.
   *  Ils alimentent l'étape « À conclure » (28/08) : sans elle, ils restaient
   *  « confirmed » pour toujours — 5 étaient dans ce cas en prod. */
  aConclure: RdvBooking[];
  loading: boolean;
  reload: () => Promise<void>;
  setStatus: (id: string, status: RdvBooking["status"]) => Promise<void>;
}

export function useCoachRdvBookings(coachUserId: string | null): Result {
  const [toutes, setToutes] = useState<RdvBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!coachUserId) {
      setToutes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const sb = await getSupabaseClient();
    if (!sb) {
      setToutes([]);
      setLoading(false);
      return;
    }
    const { data, error } = await sb
      .from("rdv_bookings")
      .select("id, first_name, last_name, contact, mode, slot_start, slot_end, status, confirm_email_sent_at, reminder_email_sent_at, booking_type, metadata")
      .eq("coach_user_id", coachUserId)
      // ⚠️ 26/08 — LES RÉSERVATIONS DU CLUB ONT LEUR PROPRE BLOC.
      //
      // Depuis le 19/08, un rendez-vous du club porte un `coach_user_id` (sans
      // ça personne ne le voyait dans son agenda). Effet de bord invisible :
      // il remontait AUSSI ici, et la même personne s'affichait deux fois à
      // l'écran — une fois dans « RDV demandés », une fois dans
      // « RDV découverte du club », chacune avec ses propres boutons.
      //
      // Mesuré le 26/08 sur la capture de Thomas : 9 rendez-vous sur 10
      // s'affichaient en double. Ce bloc ne montre donc plus que ce qui vient
      // des pages du coach (`club_id` à NULL) ; le club a le sien, juste en
      // dessous, avec les gestes qui lui sont propres (déplacer, confirmer).
      .is("club_id", null)
      .neq("status", "canceled")
      // ⚠️ 28/08 — ON REMONTE AUSSI LE PASSÉ RÉCENT (étape « À conclure »).
      //
      // Il y avait ici `.gte("slot_start", maintenant)` : un rendez-vous passé
      // disparaissait de l'écran, et avec lui le seul endroit où dire « elle
      // est venue » ou « elle n'est pas venue ». Mesuré en base le 28/08 :
      // 5 rendez-vous encore « confirmed » alors qu'ils étaient passés, et
      // UN SEUL `honored` sur 31. Ils ne pouvaient plus être soldés.
      //
      // On ramène donc les 14 derniers jours. Le tri se fait ci-dessous :
      // `bookings` garde EXACTEMENT ce qu'il montrait (les rendez-vous à
      // venir), `aConclure` reçoit les passés non soldés.
      .gte("slot_start", new Date(Date.now() - FENETRE_A_CONCLURE_MS).toISOString())
      .order("slot_start", { ascending: true })
      .limit(100);
    if (error) {
      setToutes([]);
    } else {
      setToutes((data ?? []) as RdvBooking[]);
    }
    setLoading(false);
  }, [coachUserId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setStatus = useCallback(
    async (id: string, status: RdvBooking["status"]) => {
      // Passe par le chemin unique : c'est lui qui envoie le « c'est
      // confirmé » à la personne quand on accepte sa demande.
      const { error } = await setRdvBookingStatus(id, status);
      if (!error) {
        // Annulé → retiré de la liste ; confirmé → maj statut local.
        setToutes((prev) =>
          status === "canceled"
            ? prev.filter((b) => b.id !== id)
            : prev.map((b) => (b.id === id ? { ...b, status } : b)),
        );
      }
    },
    [],
  );

  // Le partage se fait ici, une seule fois, avec la règle de `aConclure.ts` —
  // pas de « slot_start < now » recopié à la main dans chaque écran.
  const maintenant = new Date();
  const bookings = toutes.filter(
    (b) => new Date(b.slot_start).getTime() >= maintenant.getTime(),
  );
  const aConclure = rdvAConclure(
    toutes.map((b) => ({ ...b, slotStart: b.slot_start })),
    maintenant,
  );

  return { bookings, aConclure, loading, reload, setStatus };
}
