// =============================================================================
// useClubShifts (BBC) — qui tient le bar, matin par matin.
// Chantier « La semaine du club », 2026-07-28.
//
// La permanence du matin n'est pas un rendez-vous : c'est un POSTE. Un matin
// sans personne n'est donc pas « une case vide », c'est un club qui n'ouvre
// pas — et c'est la seule information de l'app qui le dit.
//
// ⚠ La table `club_shifts` n'appartient PAS à ce chantier : elle vient de
// l'Agenda V2 (LOT 6.6), qui y stocke des plages libres de présence au bar.
// On écrit dans la MÊME table — une feature, un seul endroit (règle B9). D'où
// le passage par les RPC `bbc_assign_shift` / `bbc_clear_shift` : elles portent
// l'invariant propre au mode BBC (un seul bloc de permanence par matin) que la
// table ne peut pas porter elle-même sans casser l'agenda classique, où poser
// deux plages le même jour est parfaitement légitime.
//
// Le hook ne charge QUE la semaine affichée : `club_shifts` est une table
// d'agenda, elle grossit sans fin.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import type { User } from "../../types/domain";

/** Créneau d'ouverture décomposé, prêt à composer un timestamp. */
export interface Creneau {
  startH: number;
  startM: number;
  endH: number;
  endM: number;
}

/** Repli quand `clubs.settings.open_hours` est vide ou illisible. */
export const CRENEAU_DEFAUT: Creneau = { startH: 7, startM: 0, endH: 11, endM: 0 };

/**
 * Lit « 7h-11h », « 7h30 - 11h », « 07:00-11:00 »… depuis la config du club.
 * Le champ est un texte libre saisi par le coach dans les Réglages : on ne
 * peut donc pas lui faire confiance, mais on ne peut pas non plus l'ignorer —
 * sans lui, une permanence serait posée à une heure que l'écran n'affiche pas.
 * Toute valeur incohérente (fin avant début) retombe sur le créneau standard.
 */
export function parseOpenHours(raw?: string | null): Creneau {
  if (!raw) return CRENEAU_DEFAUT;
  const m = raw.match(/(\d{1,2})\s*[h:]\s*(\d{2})?\D+?(\d{1,2})\s*[h:]\s*(\d{2})?/);
  if (!m) return CRENEAU_DEFAUT;
  const startH = Number(m[1]);
  const startM = Number(m[2] ?? 0);
  const endH = Number(m[3]);
  const endM = Number(m[4] ?? 0);
  const ok =
    [startH, endH].every((v) => Number.isFinite(v) && v >= 0 && v <= 23) &&
    [startM, endM].every((v) => Number.isFinite(v) && v >= 0 && v <= 59) &&
    endH * 60 + endM > startH * 60 + startM;
  return ok ? { startH, startM, endH, endM } : CRENEAU_DEFAUT;
}

/** Clé de jour locale (YYYY-MM-DD). `toISOString()` est interdit ici : il
 *  bascule en UTC et un matin de 7h en été retomberait sur la veille. */
export function cleJour(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Les deux bornes du matin d'une date donnée, selon le créneau du club. */
export function bornesDuMatin(jour: Date, creneau: Creneau): { debut: Date; fin: Date } {
  const debut = new Date(jour);
  debut.setHours(creneau.startH, creneau.startM, 0, 0);
  const fin = new Date(jour);
  fin.setHours(creneau.endH, creneau.endM, 0, 0);
  return { debut, fin };
}

export interface ClubShift {
  id: string;
  userId: string;
  startsAt: Date;
  endsAt: Date;
}

/** Une personne à qui l'on peut confier un matin. */
export interface Affectable {
  id: string;
  name: string;
  /** Ligne de contexte affichée sous le nom (« superviseur · toi »). */
  role: string;
}

/**
 * L'équipe à qui l'on peut confier le bar : soi-même + sa downline directe.
 *
 * Même filtre que partout ailleurs dans l'app (`ProspectFormModal`,
 * `EquipeTab`) — délibérément, pour que « mon équipe » désigne les mêmes gens
 * d'un écran à l'autre. On lit `users` d'AppContext, déjà chargé : refaire une
 * requête pour reconstruire une arborescence complète coûterait un aller-retour
 * de plus à chaque ouverture de l'onglet, pour un club qui compte 3 personnes.
 */
export function equipeAffectable(users: User[], currentUserId?: string | null): Affectable[] {
  if (!currentUserId) return [];
  return users
    .filter((u) => u.active && (u.id === currentUserId || u.sponsorId === currentUserId))
    .map((u) => ({
      id: u.id,
      name: u.name,
      role: u.id === currentUserId ? `${u.title || "coach"} · toi` : u.title || "coach",
    }))
    // Soi-même d'abord : dans les faits, c'est le coach qui ouvre 5 matins sur 6.
    .sort((a, b) => (a.id === currentUserId ? -1 : b.id === currentUserId ? 1 : a.name.localeCompare(b.name)));
}

export interface UseClubShiftsResult {
  /** Permanences de la semaine, indexées par jour (clé locale YYYY-MM-DD). */
  parJour: Map<string, ClubShift>;
  creneau: Creneau;
  loading: boolean;
  /** Confie ce matin-là à quelqu'un. Remplace l'affectation existante. */
  assign: (jour: Date, userId: string) => Promise<boolean>;
  /** Libère ce matin-là : le créneau repasse « personne n'ouvre ». */
  clear: (jour: Date) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useClubShifts(
  clubId: string | null | undefined,
  openHours: string | null | undefined,
  /** Lundi 00:00 de la semaine affichée. */
  weekStart: Date,
): UseClubShiftsResult {
  const [rows, setRows] = useState<ClubShift[]>([]);
  const [loading, setLoading] = useState(true);

  const creneau = useMemo(() => parseOpenHours(openHours), [openHours]);
  // Une `Date` reconstruite à chaque render relancerait l'effet en boucle :
  // on ne dépend que de l'instant, pas de l'objet.
  const weekMs = weekStart.getTime();

  const refetch = useCallback(async () => {
    if (!clubId) {
      setRows([]);
      setLoading(false);
      return;
    }
    try {
      const sb = await getSupabaseClient();
      if (!sb) {
        setLoading(false);
        return;
      }
      const debut = new Date(weekMs);
      const fin = new Date(weekMs);
      fin.setDate(fin.getDate() + 7);
      const { data } = await sb
        .from("club_shifts")
        .select("id, user_id, starts_at, ends_at")
        .eq("club_id", clubId)
        .gte("starts_at", debut.toISOString())
        .lt("starts_at", fin.toISOString())
        .order("starts_at", { ascending: true });
      if (Array.isArray(data)) {
        setRows(
          (data as Array<Record<string, unknown>>).map((r) => ({
            id: String(r.id),
            userId: String(r.user_id),
            startsAt: new Date(String(r.starts_at)),
            endsAt: new Date(String(r.ends_at)),
          })),
        );
      }
    } catch {
      // silent-fail : la semaine reste lisible (rituels, RDV, bilans). Une
      // permanence introuvable s'affiche « personne n'ouvre », ce qui est le
      // repli le moins dangereux — il alerte au lieu de rassurer à tort.
    } finally {
      setLoading(false);
    }
  }, [clubId, weekMs]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const assign = useCallback(
    async (jour: Date, userId: string): Promise<boolean> => {
      if (!clubId) return false;
      const { debut, fin } = bornesDuMatin(jour, creneau);
      // Optimiste : au comptoir, le coach affecte et enchaîne. L'id temporaire
      // est écrasé par le refetch — il ne sert qu'à peindre la ligne tout de suite.
      const provisoire: ClubShift = { id: `optimiste-${cleJour(jour)}`, userId, startsAt: debut, endsAt: fin };
      setRows((prev) => [...prev.filter((r) => cleJour(r.startsAt) !== cleJour(jour)), provisoire]);
      try {
        const sb = await getSupabaseClient();
        if (!sb) return false;
        const { error } = await sb.rpc("bbc_assign_shift", {
          p_club_id: clubId,
          p_starts_at: debut.toISOString(),
          p_ends_at: fin.toISOString(),
          p_user_id: userId,
        });
        if (error) {
          await refetch();
          return false;
        }
        await refetch();
        return true;
      } catch {
        await refetch();
        return false;
      }
    },
    [clubId, creneau, refetch],
  );

  const clear = useCallback(
    async (jour: Date): Promise<boolean> => {
      if (!clubId) return false;
      const { debut, fin } = bornesDuMatin(jour, creneau);
      setRows((prev) => prev.filter((r) => cleJour(r.startsAt) !== cleJour(jour)));
      try {
        const sb = await getSupabaseClient();
        if (!sb) return false;
        const { error } = await sb.rpc("bbc_clear_shift", {
          p_club_id: clubId,
          p_starts_at: debut.toISOString(),
          p_ends_at: fin.toISOString(),
        });
        if (error) {
          await refetch();
          return false;
        }
        return true;
      } catch {
        await refetch();
        return false;
      }
    },
    [clubId, creneau, refetch],
  );

  const parJour = useMemo(() => {
    const m = new Map<string, ClubShift>();
    // Si l'agenda classique a posé plusieurs plages le même jour, on garde la
    // première du matin : l'écran BBC ne connaît qu'un poste par matin.
    for (const r of rows) {
      const k = cleJour(r.startsAt);
      if (!m.has(k)) m.set(k, r);
    }
    return m;
  }, [rows]);

  return { parJour, creneau, loading, assign, clear, refetch };
}
