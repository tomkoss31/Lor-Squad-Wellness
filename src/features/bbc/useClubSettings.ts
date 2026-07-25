// =============================================================================
// useClubSettings — lecture/écriture de la config d'un club (chantier BBC).
//
// `clubs.settings` (jsonb) porte TOUTES les valeurs métier réglables : horaires
// des rituels, barème des cœurs, cartes (prix + durée), créneau d'ouverture.
// Rien de tout ça n'est en dur dans le code : un club change ses réglages ici,
// l'app suit. RLS : seul le propriétaire (ou un admin) écrit.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import type { ClubSettings } from "../../types/domain";

/** Repli utilisé tant qu'un club n'a pas personnalisé ses réglages. */
export const DEFAULT_CLUB_SETTINGS: ClubSettings = {
  open_hours: "7h-11h",
  calls: {
    appel_ambassadeur: { days: ["lundi", "jeudi"], time: "20:00" },
    atelier_coeurs: { days: ["mardi", "samedi"], time: "20:00" },
    coach_academy: { days: ["mercredi"], time: "19:00" },
  },
  hearts_bareme: {
    "2": "25 % de remise à vie",
    "3": "10 visites offertes",
    "5": "30 visites offertes",
  },
  cards: {
    "10": { price: null, days: 30 },
    "30": { price: null, days: 90 },
  },
  links: {},
};

export interface UseClubSettingsResult {
  settings: ClubSettings;
  loading: boolean;
  saving: boolean;
  save: (next: ClubSettings) => Promise<boolean>;
}

export function useClubSettings(clubId?: string | null, initial?: ClubSettings | null): UseClubSettingsResult {
  const [settings, setSettings] = useState<ClubSettings>({ ...DEFAULT_CLUB_SETTINGS, ...(initial ?? {}) });
  const [loading, setLoading] = useState(Boolean(clubId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!clubId) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data } = await sb.from("clubs").select("settings").eq("id", clubId).maybeSingle();
        const s = (data as { settings?: ClubSettings } | null)?.settings;
        if (!cancelled && s) setSettings({ ...DEFAULT_CLUB_SETTINGS, ...s });
      } catch {
        // silent-fail → on garde les défauts
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  const save = useCallback(
    async (next: ClubSettings): Promise<boolean> => {
      setSettings(next);
      if (!clubId) return false;
      setSaving(true);
      try {
        const sb = await getSupabaseClient();
        if (!sb) return false;
        const { error } = await sb.from("clubs").update({ settings: next }).eq("id", clubId);
        return !error;
      } catch {
        return false;
      } finally {
        setSaving(false);
      }
    },
    [clubId],
  );

  return { settings, loading, saving, save };
}
