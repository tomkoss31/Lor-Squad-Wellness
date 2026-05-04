// =============================================================================
// useCahierDeBord — fetch + mutations pour les 4 tables (2026-05-04)
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";
import type {
  CobayeTrackerEntry,
  Liste100Contact,
  EbeJournalEntry,
  Liste100Temperature,
  Liste100FrankCategory,
} from "../types/cahier";

interface UseCahierResult {
  // Cobaye tracker
  cobayeEntries: CobayeTrackerEntry[];
  upsertCobayeEntry: (params: {
    day_number: number;
    note?: string;
    energy_level?: number | null;
    sleep_quality?: number | null;
    weight_kg?: number | null;
  }) => Promise<void>;

  // Liste 100
  contacts: Liste100Contact[];
  addContact: (params: {
    full_name: string;
    frank_category?: Liste100FrankCategory | null;
    temperature?: Liste100Temperature;
    note?: string;
    contact_phone?: string;
    contact_email?: string;
  }) => Promise<void>;
  updateContact: (id: string, patch: Partial<Liste100Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;

  // EBE journal
  ebeEntries: EbeJournalEntry[];
  addEbeEntry: (params: Partial<EbeJournalEntry>) => Promise<void>;
  updateEbeEntry: (id: string, patch: Partial<EbeJournalEntry>) => Promise<void>;
  deleteEbeEntry: (id: string) => Promise<void>;

  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCahierDeBord(userId: string | null): UseCahierResult {
  const [cobayeEntries, setCobayeEntries] = useState<CobayeTrackerEntry[]>([]);
  const [contacts, setContacts] = useState<Liste100Contact[]>([]);
  const [ebeEntries, setEbeEntries] = useState<EbeJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    const sb = await getSupabaseClient();
    if (!sb) {
      setError("Connexion Supabase indisponible");
      setLoading(false);
      return;
    }
    const [cRes, lRes, eRes] = await Promise.all([
      sb
        .from("cobaye_tracker_entries")
        .select("*")
        .eq("user_id", userId)
        .order("day_number", { ascending: true }),
      sb
        .from("liste_100_contacts")
        .select("*")
        .eq("user_id", userId)
        .order("added_at", { ascending: false }),
      sb
        .from("ebe_journal_entries")
        .select("*")
        .eq("user_id", userId)
        .order("ebe_date", { ascending: false }),
    ]);
    if (cRes.error || lRes.error || eRes.error) {
      setError(cRes.error?.message ?? lRes.error?.message ?? eRes.error?.message ?? "Erreur");
      setLoading(false);
      return;
    }
    setCobayeEntries((cRes.data ?? []) as CobayeTrackerEntry[]);
    setContacts((lRes.data ?? []) as Liste100Contact[]);
    setEbeEntries((eRes.data ?? []) as EbeJournalEntry[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const upsertCobayeEntry: UseCahierResult["upsertCobayeEntry"] = useCallback(
    async (params) => {
      if (!userId) return;
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { data, error: e } = await sb
        .from("cobaye_tracker_entries")
        .upsert(
          {
            user_id: userId,
            day_number: params.day_number,
            note: params.note ?? null,
            energy_level: params.energy_level ?? null,
            sleep_quality: params.sleep_quality ?? null,
            weight_kg: params.weight_kg ?? null,
          },
          { onConflict: "user_id,day_number" },
        )
        .select()
        .single();
      if (e) {
        setError(e.message);
        return;
      }
      if (data) {
        const newEntry = data as CobayeTrackerEntry;
        setCobayeEntries((prev) => {
          const filtered = prev.filter((p) => p.day_number !== newEntry.day_number);
          return [...filtered, newEntry].sort((a, b) => a.day_number - b.day_number);
        });
      }
    },
    [userId],
  );

  const addContact: UseCahierResult["addContact"] = useCallback(
    async (params) => {
      if (!userId) return;
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { data, error: e } = await sb
        .from("liste_100_contacts")
        .insert({
          user_id: userId,
          full_name: params.full_name,
          frank_category: params.frank_category ?? null,
          temperature: params.temperature ?? "froid",
          note: params.note ?? null,
          contact_phone: params.contact_phone ?? null,
          contact_email: params.contact_email ?? null,
        })
        .select()
        .single();
      if (e) {
        setError(e.message);
        return;
      }
      if (data) setContacts((prev) => [data as Liste100Contact, ...prev]);
    },
    [userId],
  );

  const updateContact: UseCahierResult["updateContact"] = useCallback(async (id, patch) => {
    const sb = await getSupabaseClient();
    if (!sb) return;
    const { data, error: e } = await sb
      .from("liste_100_contacts")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (e) {
      setError(e.message);
      return;
    }
    if (data) {
      setContacts((prev) => prev.map((c) => (c.id === id ? (data as Liste100Contact) : c)));
    }
  }, []);

  const deleteContact: UseCahierResult["deleteContact"] = useCallback(async (id) => {
    const sb = await getSupabaseClient();
    if (!sb) return;
    const { error: e } = await sb.from("liste_100_contacts").delete().eq("id", id);
    if (e) {
      setError(e.message);
      return;
    }
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addEbeEntry: UseCahierResult["addEbeEntry"] = useCallback(
    async (params) => {
      if (!userId) return;
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { data, error: e } = await sb
        .from("ebe_journal_entries")
        .insert({
          user_id: userId,
          ebe_date: params.ebe_date ?? new Date().toISOString().slice(0, 10),
          prospect_name: params.prospect_name ?? null,
          self_score: params.self_score ?? null,
          what_went_well: params.what_went_well ?? null,
          what_to_improve: params.what_to_improve ?? null,
          outcome: params.outcome ?? null,
          recos_count: params.recos_count ?? 0,
        })
        .select()
        .single();
      if (e) {
        setError(e.message);
        return;
      }
      if (data) setEbeEntries((prev) => [data as EbeJournalEntry, ...prev]);
    },
    [userId],
  );

  const updateEbeEntry: UseCahierResult["updateEbeEntry"] = useCallback(async (id, patch) => {
    const sb = await getSupabaseClient();
    if (!sb) return;
    const { data, error: e } = await sb
      .from("ebe_journal_entries")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (e) {
      setError(e.message);
      return;
    }
    if (data) {
      setEbeEntries((prev) => prev.map((c) => (c.id === id ? (data as EbeJournalEntry) : c)));
    }
  }, []);

  const deleteEbeEntry: UseCahierResult["deleteEbeEntry"] = useCallback(async (id) => {
    const sb = await getSupabaseClient();
    if (!sb) return;
    const { error: e } = await sb.from("ebe_journal_entries").delete().eq("id", id);
    if (e) {
      setError(e.message);
      return;
    }
    setEbeEntries((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return {
    cobayeEntries,
    upsertCobayeEntry,
    contacts,
    addContact,
    updateContact,
    deleteContact,
    ebeEntries,
    addEbeEntry,
    updateEbeEntry,
    deleteEbeEntry,
    loading,
    error,
    refetch: fetchAll,
  };
}
