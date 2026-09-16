// =============================================================================
// useBbcHearts — le système de cœurs, données réelles (chantier BBC).
// S'appuie sur client_referrals (RLS : coach_id = auth.uid()). Chaîne :
//   le membre saisit une reco (client_referrals.status='new')
//   → le coach VALIDE : 'started' (= 1 cœur, la personne a démarré) ou 'lost'
//   → paliers 2 / 3 / 5 calculés depuis le nombre de cœurs par membre.
// Aucune migration : on réutilise la table + son statut texte.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

// ⚠️ Vocabulaire PARTAGÉ avec le CRM : `client_referrals.status` est écrit par
// deux chemins. Le CRM pose 'converted' quand une reco devient cliente
// (useCrmLeads → notify-referral-converted). BBC posait 'started' de son côté,
// si bien qu'une reco convertie via le CRM ne donnait AUCUN cœur.
// → On LIT les deux comme un cœur, et on ÉCRIT 'converted' (le vocabulaire
//   déjà dominant dans le projet) pour que les deux mondes restent alignés.
const STARTED_STATUSES = ["started", "converted"];
const STARTED_WRITE = "converted";
const LOST = "lost";
export const HEART_PALIERS = [2, 3, 5];

export function isHeart(status: string): boolean {
  return STARTED_STATUSES.includes(status);
}

export interface HeartReferral {
  id: string;
  fromClientId: string;
  fromClientName: string;
  referredName: string;
  referredContact: string;
  status: string;
}
export interface HeartMember {
  key: string;
  name: string;
  hearts: number;
  pending: number;
}
export interface UseBbcHeartsResult {
  members: HeartMember[];
  pending: HeartReferral[];
  loading: boolean;
  validate: (id: string, started: boolean) => Promise<void>;
  refetch: () => Promise<void>;
}

export function nextPalier(hearts: number): number | null {
  return HEART_PALIERS.find((p) => p > hearts) ?? null;
}

export function useBbcHearts(userId?: string | null): UseBbcHeartsResult {
  const [rows, setRows] = useState<HeartReferral[]>([]);
  // Les cœurs gagnés par une boîte de contact (16/09). Ils ne sont pas des
  // recos : rien à valider, ils sont déjà acquis quand le coupon est `demarre`.
  const [coeursBoites, setCoeursBoites] = useState<Array<{ clientId: string; nom: string }>>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const sb = await getSupabaseClient();
      if (!sb) {
        setLoading(false);
        return;
      }
      const [{ data }, boitesRes] = await Promise.all([
        sb
          .from("client_referrals")
          .select("id, from_client_id, from_client_name, referred_name, referred_contact, status")
          .order("created_at", { ascending: false }),
        sb
          .from("contact_box_coupons")
          .select("contact_boxes!inner(placed_by_client_id, placed_by_name)")
          .eq("outcome", "demarre")
          .not("contact_boxes.placed_by_client_id", "is", null),
      ]);
      if (Array.isArray(boitesRes.data)) {
        const l: Array<{ clientId: string; nom: string }> = [];
        for (const r of boitesRes.data as Array<Record<string, unknown>>) {
          const lien = r.contact_boxes as unknown;
          const b = (Array.isArray(lien) ? lien[0] : lien) as Record<string, unknown> | null | undefined;
          if (typeof b?.placed_by_client_id === "string") {
            l.push({ clientId: b.placed_by_client_id, nom: String(b.placed_by_name ?? "—") });
          }
        }
        setCoeursBoites(l);
      }
      if (Array.isArray(data)) {
        setRows(
          data.map((r: Record<string, unknown>) => ({
            id: String(r.id),
            fromClientId: String(r.from_client_id ?? ""),
            fromClientName: String(r.from_client_name ?? "—"),
            referredName: String(r.referred_name ?? ""),
            referredContact: String(r.referred_contact ?? ""),
            status: String(r.status ?? "new"),
          })),
        );
      }
    } catch {
      // silent-fail
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const validate = useCallback(
    async (id: string, started: boolean) => {
      const nextStatus = started ? STARTED_WRITE : LOST;
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: nextStatus } : r)));
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { error } = await sb.from("client_referrals").update({ status: nextStatus }).eq("id", id);
        if (error) void refetch();
      } catch {
        void refetch();
      }
    },
    [refetch],
  );

  const { members, pending } = useMemo(() => {
    const byMember = new Map<string, HeartMember>();
    for (const r of rows) {
      const key = r.fromClientId || r.fromClientName;
      const m = byMember.get(key) ?? { key, name: r.fromClientName, hearts: 0, pending: 0 };
      if (isHeart(r.status)) m.hearts += 1;
      else if (r.status !== LOST) m.pending += 1;
      byMember.set(key, m);
    }
    // Même clé que les recos (`from_client_id`) : une membre qui a à la fois
    // recommandé et posé une boîte n'a qu'une ligne, avec la somme des deux.
    for (const c of coeursBoites) {
      const m = byMember.get(c.clientId) ?? { key: c.clientId, name: c.nom, hearts: 0, pending: 0 };
      m.hearts += 1;
      byMember.set(c.clientId, m);
    }
    return {
      members: Array.from(byMember.values()).sort((a, b) => b.hearts - a.hearts),
      pending: rows.filter((r) => !isHeart(r.status) && r.status !== LOST),
    };
  }, [rows, coeursBoites]);

  return { members, pending, loading, validate, refetch };
}
