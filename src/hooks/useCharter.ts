// =============================================================================
// useCharter — hook load/save de distributor_charters (2026-05-03)
//
// Gère :
//   - fetch de la charte du user (ou cosigner via userId param)
//   - persist debounce des champs (pourquoi, objectif12mois)
//   - signature distri (set signature_data_url + signed_at)
//   - co-signature (set cosigner_*)
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";
import type { DistributorCharter } from "../types/charter";

interface UseCharterResult {
  charter: DistributorCharter | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  /** Update pourquoi/objectif (debounced 600ms via auto-save). */
  updateField: (field: "pourquoi_text" | "objectif_12_mois", value: string) => void;
  /** Sauvegarde immédiate de la signature distri. */
  signAsDistri: (signatureDataUrl: string) => Promise<void>;
  /** Sauvegarde immédiate de la co-signature (sponsor ou admin). */
  cosign: (params: {
    signatureDataUrl: string;
    cosignerName: string;
    cosignerRole: string;
  }) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useCharter(targetUserId: string | null): UseCharterResult {
  const [charter, setCharter] = useState<DistributorCharter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<number | null>(null);

  // Local optimistic state for inputs (avoid input lag)
  const [localPourquoi, setLocalPourquoi] = useState<string | null>(null);
  const [localObjectif, setLocalObjectif] = useState<string | null>(null);

  const fetchCharter = useCallback(async () => {
    if (!targetUserId) return;
    setLoading(true);
    setError(null);
    const sb = await getSupabaseClient();
    if (!sb) {
      setError("Connexion Supabase indisponible");
      setLoading(false);
      return;
    }
    const { data, error: e } = await sb
      .from("distributor_charters")
      .select("*")
      .eq("user_id", targetUserId)
      .maybeSingle();
    if (e) {
      setError(e.message);
      setLoading(false);
      return;
    }
    if (data) {
      const c = data as DistributorCharter;
      setCharter(c);
      setLocalPourquoi(c.pourquoi_text);
      setLocalObjectif(c.objectif_12_mois);
    } else {
      // Pas encore de charte : on en crée une vide à la 1ère sauvegarde.
      setCharter(null);
      setLocalPourquoi("");
      setLocalObjectif("");
    }
    setLoading(false);
  }, [targetUserId]);

  useEffect(() => {
    void fetchCharter();
  }, [fetchCharter]);

  /** Persist field après un debounce 600ms. */
  const updateField = useCallback(
    (field: "pourquoi_text" | "objectif_12_mois", value: string) => {
      if (field === "pourquoi_text") setLocalPourquoi(value);
      else setLocalObjectif(value);

      if (!targetUserId) return;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(async () => {
        setSaving(true);
        const sb = await getSupabaseClient();
        if (!sb) {
          setSaving(false);
          return;
        }
        const payload = {
          user_id: targetUserId,
          [field]: value,
        };
        const { data, error: e } = await sb
          .from("distributor_charters")
          .upsert(payload, { onConflict: "user_id" })
          .select()
          .single();
        setSaving(false);
        if (e) {
          setError(e.message);
          return;
        }
        if (data) setCharter(data as DistributorCharter);
      }, 600);
    },
    [targetUserId],
  );

  const signAsDistri = useCallback(
    async (signatureDataUrl: string) => {
      if (!targetUserId) return;
      setSaving(true);
      setError(null);
      const sb = await getSupabaseClient();
      if (!sb) {
        setSaving(false);
        return;
      }
      const nowIso = new Date().toISOString();
      const payload = {
        user_id: targetUserId,
        pourquoi_text: localPourquoi,
        objectif_12_mois: localObjectif,
        signature_data_url: signatureDataUrl,
        signed_at: nowIso,
      };
      const { data, error: e } = await sb
        .from("distributor_charters")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .single();
      setSaving(false);
      if (e) {
        setError(e.message);
        return;
      }
      if (data) setCharter(data as DistributorCharter);
    },
    [targetUserId, localPourquoi, localObjectif],
  );

  const cosign = useCallback(
    async ({
      signatureDataUrl,
      cosignerName,
      cosignerRole,
    }: {
      signatureDataUrl: string;
      cosignerName: string;
      cosignerRole: string;
    }) => {
      if (!targetUserId) return;
      setSaving(true);
      setError(null);
      const sb = await getSupabaseClient();
      if (!sb) {
        setSaving(false);
        return;
      }
      const { data: authData } = await sb.auth.getUser();
      const cosignerId = authData.user?.id;
      const nowIso = new Date().toISOString();
      const payload = {
        user_id: targetUserId,
        cosigner_id: cosignerId,
        cosigner_name: cosignerName,
        cosigner_role: cosignerRole,
        cosigner_signature_data_url: signatureDataUrl,
        cosigned_at: nowIso,
      };
      const { data, error: e } = await sb
        .from("distributor_charters")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .single();
      setSaving(false);
      if (e) {
        setError(e.message);
        return;
      }
      if (data) setCharter(data as DistributorCharter);
    },
    [targetUserId],
  );

  return {
    charter: charter
      ? { ...charter, pourquoi_text: localPourquoi, objectif_12_mois: localObjectif }
      : charter,
    loading,
    error,
    saving,
    updateField,
    signAsDistri,
    cosign,
    refetch: fetchCharter,
  };
}
