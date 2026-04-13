import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { BodyScan } from "../lib/types";

export function useBodyScans(clientId?: string) {
  const [scans, setScans] = useState<BodyScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from("body_scans").select("*").order("date", { ascending: false });
      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      setScans((data ?? []) as BodyScan[]);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void fetchScans();
  }, [fetchScans]);

  async function createScan(data: Partial<BodyScan>) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Non authentifié");
    }

    const optimisticScan: BodyScan = {
      id: crypto.randomUUID(),
      client_id: data.client_id ?? clientId ?? "",
      coach_id: user.id,
      bilan_id: data.bilan_id,
      date: data.date ?? new Date().toISOString().slice(0, 10),
      weight_kg: data.weight_kg,
      fat_mass_percent: data.fat_mass_percent,
      fat_mass_kg: data.fat_mass_kg,
      muscle_mass_kg: data.muscle_mass_kg,
      bone_mass_kg: data.bone_mass_kg,
      water_percent: data.water_percent,
      visceral_fat_level: data.visceral_fat_level,
      bmr: data.bmr,
      metabolic_age: data.metabolic_age,
      bmi: data.bmi,
      waist_cm: data.waist_cm,
      hip_cm: data.hip_cm,
      chest_cm: data.chest_cm,
      notes: data.notes,
      created_at: new Date().toISOString()
    };

    setScans((previous) => [optimisticScan, ...previous]);

    const { data: created, error } = await supabase
      .from("body_scans")
      .insert({
        ...data,
        coach_id: user.id
      })
      .select("*")
      .single();

    if (error) {
      setScans((previous) => previous.filter((scan) => scan.id !== optimisticScan.id));
      throw error;
    }

    setScans((previous) =>
      previous.map((scan) => (scan.id === optimisticScan.id ? ((created ?? optimisticScan) as BodyScan) : scan))
    );

    return created as BodyScan;
  }

  return { scans, loading, error, createScan, refetch: fetchScans };
}
