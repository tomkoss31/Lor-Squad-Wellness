import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Bilan } from "../lib/types";

export function useBilans(clientId?: string) {
  const [bilans, setBilans] = useState<Bilan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBilans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from("bilans").select("*").order("date", { ascending: false });
      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      setBilans((data ?? []) as Bilan[]);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void fetchBilans();
  }, [fetchBilans]);

  async function createBilan(data: Partial<Bilan>) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Non authentifié");
    }

    const optimisticBilan: Bilan = {
      id: crypto.randomUUID(),
      client_id: data.client_id ?? clientId ?? "",
      coach_id: user.id,
      date: data.date ?? new Date().toISOString().slice(0, 10),
      wake_time: data.wake_time,
      sleep_time: data.sleep_time,
      sleep_quality: data.sleep_quality,
      energy_level: data.energy_level,
      stress_level: data.stress_level,
      breakfast: data.breakfast,
      breakfast_time: data.breakfast_time,
      lunch: data.lunch,
      dinner: data.dinner,
      snacking: data.snacking,
      snacking_frequency: data.snacking_frequency,
      water_liters: data.water_liters,
      other_drinks: data.other_drinks,
      sport_type: data.sport_type,
      sport_frequency: data.sport_frequency,
      sport_duration: data.sport_duration,
      health_issues: data.health_issues,
      medications: data.medications,
      digestion_quality: data.digestion_quality,
      transit: data.transit,
      main_objective: data.main_objective,
      secondary_objective: data.secondary_objective,
      blockers: data.blockers,
      motivation_level: data.motivation_level,
      recommendations: data.recommendations ?? [],
      notes: data.notes,
      created_at: new Date().toISOString()
    };

    setBilans((previous) => [optimisticBilan, ...previous]);

    const { data: created, error } = await supabase
      .from("bilans")
      .insert({
        ...data,
        coach_id: user.id
      })
      .select("*")
      .single();

    if (error) {
      setBilans((previous) => previous.filter((bilan) => bilan.id !== optimisticBilan.id));
      throw error;
    }

    setBilans((previous) =>
      previous.map((bilan) => (bilan.id === optimisticBilan.id ? ((created ?? optimisticBilan) as Bilan) : bilan))
    );

    return created as Bilan;
  }

  return { bilans, loading, error, createBilan, refetch: fetchBilans };
}
