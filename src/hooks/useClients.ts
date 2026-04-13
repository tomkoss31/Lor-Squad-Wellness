import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Client } from "../lib/types";

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setClients((data ?? []) as Client[]);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchClients();
  }, [fetchClients]);

  async function createClient(data: Partial<Client>) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Non authentifié");
    }

    const optimisticClient: Client = {
      id: crypto.randomUUID(),
      coach_id: user.id,
      first_name: data.first_name ?? "",
      last_name: data.last_name ?? "",
      email: data.email,
      phone: data.phone,
      birth_date: data.birth_date,
      gender: data.gender,
      height_cm: data.height_cm,
      objective: data.objective,
      notes: data.notes,
      status: data.status ?? "actif",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setClients((previous) => [optimisticClient, ...previous]);

    const { data: created, error } = await supabase
      .from("clients")
      .insert({
        ...data,
        coach_id: user.id
      })
      .select("*")
      .single();

    if (error) {
      setClients((previous) => previous.filter((client) => client.id !== optimisticClient.id));
      throw error;
    }

    setClients((previous) =>
      previous.map((client) => (client.id === optimisticClient.id ? ((created ?? optimisticClient) as Client) : client))
    );

    return created as Client;
  }

  async function updateClient(id: string, data: Partial<Client>) {
    const snapshot = clients.find((client) => client.id === id);
    setClients((previous) =>
      previous.map((client) =>
        client.id === id ? { ...client, ...data, updated_at: new Date().toISOString() } : client
      )
    );

    const { error } = await supabase
      .from("clients")
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      if (snapshot) {
        setClients((previous) => previous.map((client) => (client.id === id ? snapshot : client)));
      }

      throw error;
    }
  }

  return { clients, loading, error, createClient, updateClient, refetch: fetchClients };
}
