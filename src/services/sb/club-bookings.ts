// =============================================================================
// RDV du club — lecture des réservations « RDV découverte » (tunnel /reserver)
// et pilotage des jours d'ouverture. Chantier « RDV du club » (2026-08-09).
// =============================================================================
//
// Jusqu'ici ces réservations n'étaient visibles NULLE PART dans l'app : le coach
// était prévenu par push + email, sans jamais pouvoir les consulter. Ce service
// alimente l'écran /rdv-club.
//
// RLS (déjà en place, aucune migration nécessaire) :
//   • rdv_bookings_club_admin_read/update — un admin lit et met à jour les
//     réservations club (club_id not null).
//   • clubs_owner_manage — le propriétaire du club ou un admin lit et met à
//     jour la ligne club (donc settings.discovery, dont les jours fermés).
// =============================================================================

import { requireSupabase } from "./_shared";
import { setRdvBookingStatus } from "./rdvBookingStatus";

/** Créneaux d'ouverture du club, par jour ISO (1 = lundi … 7 = dimanche). */
export interface ClubDiscoverySettings {
  /** { "1": [["09:00","14:00"]], … } — plages horaires locales (Europe/Paris). */
  hours: Record<string, Array<[string, string]>>;
  /** Nombre de places par créneau. */
  capacity: number;
  /** Pas entre deux créneaux, en minutes. */
  slotStepMin: number;
  /** Durée réelle d'un RDV, en minutes. */
  durationMin: number;
  /** Jours fermés, au format YYYY-MM-DD. */
  holidays: string[];
}

export interface ClubInfo {
  id: string;
  slug: string;
  name: string;
  discovery: ClubDiscoverySettings;
}

export interface ClubBooking {
  id: string;
  firstName: string;
  contact: string | null;
  slotStart: string;
  slotEnd: string;
  status: string;
  peopleCount: number;
  partnerFirstName: string | null;
  objectif: string | null;
  createdAt: string;
}

type ClubRow = {
  id: string;
  slug: string;
  name: string;
  settings: Record<string, unknown> | null;
};

const DEFAULTS = { capacity: 3, slotStepMin: 60, durationMin: 45 };

function parseDiscovery(settings: Record<string, unknown> | null): ClubDiscoverySettings {
  const raw = (settings?.discovery ?? {}) as Record<string, unknown>;
  const hours = (raw.hours ?? {}) as ClubDiscoverySettings["hours"];
  const holidays = Array.isArray(raw.holidays) ? (raw.holidays as string[]) : [];
  return {
    hours,
    holidays,
    capacity: Number(raw.capacity) || DEFAULTS.capacity,
    slotStepMin: Number(raw.slot_step_min) || DEFAULTS.slotStepMin,
    durationMin: Number(raw.duration_min) || DEFAULTS.durationMin,
  };
}

/** Le club (horaires + jours fermés). Retourne null si le slug n'existe pas. */
export async function fetchClub(slug: string): Promise<ClubInfo | null> {
  const supabase = await requireSupabase();
  const { data, error } = await supabase
    .from("clubs")
    .select("id, slug, name, settings")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as ClubRow;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    discovery: parseDiscovery(row.settings),
  };
}

/** Les réservations du club sur une fenêtre donnée (bornes ISO incluses). */
export async function fetchClubBookings(
  clubId: string,
  fromIso: string,
  toIso: string,
): Promise<ClubBooking[]> {
  const supabase = await requireSupabase();
  const { data, error } = await supabase
    .from("rdv_bookings")
    .select(
      "id, first_name, contact, slot_start, slot_end, status, people_count, partner_first_name, objectif, created_at",
    )
    .eq("club_id", clubId)
    .neq("status", "canceled")
    .gte("slot_start", fromIso)
    .lte("slot_start", toIso)
    .order("slot_start", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      firstName: String(r.first_name ?? ""),
      contact: (r.contact as string | null) ?? null,
      slotStart: String(r.slot_start),
      slotEnd: String(r.slot_end ?? r.slot_start),
      status: String(r.status ?? "requested"),
      peopleCount: Number(r.people_count) || 1,
      partnerFirstName: (r.partner_first_name as string | null) ?? null,
      objectif: (r.objectif as string | null) ?? null,
      createdAt: String(r.created_at),
    };
  });
}

/**
 * Ouvre ou ferme une journée entière aux réservations (jour au format
 * YYYY-MM-DD). Écrit dans clubs.settings.discovery.holidays — la même liste que
 * lit la RPC get_club_discovery_availability, donc l'effet est immédiat côté
 * tunnel public.
 *
 * Relit les settings juste avant d'écrire pour ne pas écraser une modification
 * faite ailleurs entre-temps.
 */
export async function setClubDayClosed(
  clubId: string,
  dayKey: string,
  closed: boolean,
): Promise<string[]> {
  const supabase = await requireSupabase();

  const { data: current, error: readErr } = await supabase
    .from("clubs")
    .select("settings")
    .eq("id", clubId)
    .single();
  if (readErr) throw readErr;

  const settings = ((current as { settings: Record<string, unknown> | null })?.settings ??
    {}) as Record<string, unknown>;
  const discovery = { ...((settings.discovery ?? {}) as Record<string, unknown>) };
  const holidays = Array.isArray(discovery.holidays) ? [...(discovery.holidays as string[])] : [];

  const next = closed
    ? holidays.includes(dayKey)
      ? holidays
      : [...holidays, dayKey].sort()
    : holidays.filter((d) => d !== dayKey);

  discovery.holidays = next;

  const { error: writeErr } = await supabase
    .from("clubs")
    .update({ settings: { ...settings, discovery } })
    .eq("id", clubId);
  if (writeErr) throw writeErr;

  return next;
}

/** Confirme ou annule une réservation club. */
export async function setClubBookingStatus(
  bookingId: string,
  status: "confirmed" | "canceled",
): Promise<void> {
  // Chemin unique — il porte l'email d'acceptation.
  const { error } = await setRdvBookingStatus(bookingId, status);
  if (error) throw error;
}
