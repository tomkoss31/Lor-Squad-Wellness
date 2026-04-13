import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Suivi } from "../lib/types";

export function useSuivis(clientId?: string) {
  const [suivis, setSuivis] = useState<Suivi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuivis = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from("suivis").select("*").order("date", { ascending: false });
      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      setSuivis((data ?? []) as Suivi[]);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void fetchSuivis();
  }, [fetchSuivis]);

  async function createSuivi(data: Partial<Suivi>) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Non authentifié");
    }

    const optimisticSuivi: Suivi = {
      id: crypto.randomUUID(),
      client_id: data.client_id ?? clientId ?? "",
      coach_id: user.id,
      date: data.date ?? new Date().toISOString().slice(0, 10),
      week_number: data.week_number,
      energy_level: data.energy_level,
      hunger_level: data.hunger_level,
      digestion_quality: data.digestion_quality,
      bloating: data.bloating,
      water_liters: data.water_liters,
      sleep_quality: data.sleep_quality,
      meals_respected: data.meals_respected,
      prep_difficulty: data.prep_difficulty,
      small_victories: data.small_victories,
      remaining_blockers: data.remaining_blockers,
      notes: data.notes,
      created_at: new Date().toISOString()
    };

    setSuivis((previous) => [optimisticSuivi, ...previous]);

    const { data: created, error } = await supabase
      .from("suivis")
      .insert({
        ...data,
        coach_id: user.id
      })
      .select("*")
      .single();

    if (error) {
      setSuivis((previous) => previous.filter((suivi) => suivi.id !== optimisticSuivi.id));
      throw error;
    }

    setSuivis((previous) =>
      previous.map((suivi) => (suivi.id === optimisticSuivi.id ? ((created ?? optimisticSuivi) as Suivi) : suivi))
    );

    return created as Suivi;
  }

  return { suivis, loading, error, createSuivi, refetch: fetchSuivis };
}
