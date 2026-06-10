// =============================================================================
// useCrmLeads — pipeline CRM unifié (VIP-4 2026-06-10, décision Thomas :
// « un pipeline pour tous, juste avoir l'info d'où ça vient »).
//
// Agrège les 3 tables de capture qui portent un CONTACT actionnable :
//   - online_bilans            (funnel bilan online → kanban Leads existant)
//   - prospect_leads           (welcome / opportunité / simulateur / business /
//                               page publique Club VIP / recos PWA routées)
//   - client_referrals         (recos clients PWA historiques — legacy)
//
// Les `client_referral_intentions` (prénoms sans contact, saisis dans le
// sandbox VIP) restent volontairement hors CRM : pas de moyen de contact,
// elles vivent sur la fiche client (ClientVipCoachPanel).
//
// Statut normalisé : new → contacted → qualified → converted / lost.
// Le write-back traduit vers les valeurs natives de chaque table. RLS fait
// le filtrage par coach (admin voit tout sur prospect_leads/online_bilans,
// chaque coach voit ses client_referrals).
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";

export type CrmStatus = "new" | "contacted" | "qualified" | "converted" | "lost";
export type CrmTable = "online_bilans" | "prospect_leads" | "client_referrals";
export type CrmSource =
  | "bilan-online"
  | "vip"
  | "reco-client"
  | "opportunite"
  | "simulateur"
  | "business"
  | "welcome";

export interface CrmLead {
  key: string;
  table: CrmTable;
  id: string;
  firstName: string;
  /** Téléphone, email ou handle — tel que saisi. */
  contact: string | null;
  contactIsPhone: boolean;
  city: string | null;
  source: CrmSource;
  status: CrmStatus;
  /** « via Marie D. » pour les recos clients. */
  viaName: string | null;
  /** Relance J+3 due (online_bilans uniquement). */
  relanceDue: boolean;
  createdAt: string;
  notes: string | null;
}

export const CRM_STATUS_META: Record<CrmStatus, { label: string; emoji: string; color: string }> = {
  new: { label: "Nouveaux", emoji: "🆕", color: "var(--ls-teal)" },
  contacted: { label: "Contactés", emoji: "💬", color: "var(--ls-gold)" },
  qualified: { label: "Qualifiés / RDV", emoji: "📅", color: "var(--ls-purple)" },
  converted: { label: "Convertis", emoji: "✅", color: "var(--ls-teal)" },
  lost: { label: "Perdus", emoji: "🌙", color: "var(--ls-text-muted)" },
};

export const CRM_SOURCE_META: Record<CrmSource, { label: string; emoji: string }> = {
  "bilan-online": { label: "Bilan online", emoji: "🌱" },
  vip: { label: "Club VIP", emoji: "👑" },
  "reco-client": { label: "Reco client", emoji: "🤝" },
  opportunite: { label: "Opportunité", emoji: "🚪" },
  simulateur: { label: "Simulateur", emoji: "✨" },
  business: { label: "Business", emoji: "💼" },
  welcome: { label: "Page d'accueil", emoji: "🌿" },
};

function looksLikePhone(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.replace(/\D/g, "").length >= 6 && !value.includes("@");
}

function mapProspectSource(source: string | null | undefined): CrmSource {
  const s = (source ?? "").toLowerCase();
  if (s === "vip") return "vip";
  if (s === "reco-client") return "reco-client";
  if (s.startsWith("opportunite") || s === "rejoindre") return "opportunite";
  if (s === "simulateur") return "simulateur";
  if (s.startsWith("business")) return "business";
  return "welcome";
}

/** online_bilans.lead_status (6 valeurs) → statut CRM normalisé. */
function mapBilanStatus(leadStatus: string | null, convertedClientId: string | null): CrmStatus {
  if (convertedClientId) return "converted";
  switch (leadStatus) {
    case "contact":
    case "to_recontact":
    case "relance":
      return "contacted";
    case "qualified":
      return "qualified";
    case "lost":
      return "lost";
    default:
      return "new";
  }
}

function mapSimpleStatus(status: string | null): CrmStatus {
  switch (status) {
    case "contacted":
      return "contacted";
    case "qualified":
      return "qualified";
    case "converted":
      return "converted";
    case "lost":
      return "lost";
    case "pending":
    case "new":
    default:
      return "new";
  }
}

/** Statuts proposables par table (le write-back doit rester natif-compatible). */
export function statusOptionsFor(table: CrmTable): CrmStatus[] {
  if (table === "online_bilans") {
    // 'converted' passe par le flow de conversion du kanban Leads détaillé.
    return ["new", "contacted", "qualified", "lost"];
  }
  return ["new", "contacted", "converted", "lost"];
}

export function useCrmLeads() {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");

      const [bilansRes, prospectsRes, referralsRes] = await Promise.all([
        sb
          .from("online_bilans")
          .select(
            "id, first_name, phone, email, city, lead_status, converted_to_client_id, relance_due_at, relance_done_at, created_at, notes",
          )
          .order("created_at", { ascending: false })
          .limit(500),
        sb
          .from("prospect_leads")
          .select("id, first_name, phone, email, city, source, status, metadata, created_at, notes")
          .order("created_at", { ascending: false })
          .limit(500),
        sb
          .from("client_referrals")
          .select("id, from_client_name, referred_name, referred_contact, status, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

      // Garde-fou : on remonte la 1ère erreur au lieu d'un échec silencieux
      // (leçon RLS 2026-04-25). Les 2 autres sources restent affichées.
      const firstError = bilansRes.error ?? prospectsRes.error ?? referralsRes.error;
      if (firstError) setError(firstError.message);

      const now = Date.now();
      const all: CrmLead[] = [];

      for (const row of bilansRes.data ?? []) {
        const contact = (row.phone as string | null) || (row.email as string | null) || null;
        all.push({
          key: `online_bilans:${row.id}`,
          table: "online_bilans",
          id: row.id as string,
          firstName: (row.first_name as string) || "—",
          contact,
          contactIsPhone: looksLikePhone(row.phone as string | null),
          city: (row.city as string | null) ?? null,
          source: "bilan-online",
          status: mapBilanStatus(
            row.lead_status as string | null,
            row.converted_to_client_id as string | null,
          ),
          viaName: null,
          relanceDue: Boolean(
            row.relance_due_at &&
              !row.relance_done_at &&
              new Date(row.relance_due_at as string).getTime() <= now,
          ),
          createdAt: row.created_at as string,
          notes: (row.notes as string | null) ?? null,
        });
      }

      for (const row of prospectsRes.data ?? []) {
        const meta = (row.metadata ?? {}) as Record<string, unknown>;
        const viaName =
          typeof meta.from_client_name === "string" ? (meta.from_client_name as string) : null;
        const source = mapProspectSource(row.source as string | null);
        all.push({
          key: `prospect_leads:${row.id}`,
          table: "prospect_leads",
          id: row.id as string,
          firstName: (row.first_name as string) || "—",
          contact: (row.phone as string | null) || (row.email as string | null) || null,
          contactIsPhone: looksLikePhone(row.phone as string | null),
          city: (row.city as string | null) ?? null,
          source,
          status: mapSimpleStatus(row.status as string | null),
          viaName,
          relanceDue: false,
          createdAt: row.created_at as string,
          notes: (row.notes as string | null) ?? null,
        });
      }

      for (const row of referralsRes.data ?? []) {
        all.push({
          key: `client_referrals:${row.id}`,
          table: "client_referrals",
          id: row.id as string,
          firstName: (row.referred_name as string) || "—",
          contact: (row.referred_contact as string | null) ?? null,
          contactIsPhone: looksLikePhone(row.referred_contact as string | null),
          city: null,
          source: "reco-client",
          status: mapSimpleStatus(row.status as string | null),
          viaName: (row.from_client_name as string | null) ?? null,
          relanceDue: false,
          createdAt: row.created_at as string,
          notes: null,
        });
      }

      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLeads(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement CRM impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const updateStatus = useCallback(
    async (lead: CrmLead, next: CrmStatus): Promise<string | null> => {
      const sb = await getSupabaseClient();
      if (!sb) return "Service indisponible.";

      let err: string | null = null;
      if (lead.table === "online_bilans") {
        // Traduction vers les valeurs natives du kanban Leads.
        const native =
          next === "contacted" ? "contact" : next === "qualified" ? "qualified" : next;
        const patch: Record<string, unknown> = { lead_status: native };
        if (next === "contacted") patch.contacted_at = new Date().toISOString();
        const { error: e } = await sb.from("online_bilans").update(patch).eq("id", lead.id);
        err = e?.message ?? null;
      } else if (lead.table === "prospect_leads") {
        const patch: Record<string, unknown> = { status: next === "qualified" ? "contacted" : next };
        if (next === "contacted") patch.contacted_at = new Date().toISOString();
        const { error: e } = await sb.from("prospect_leads").update(patch).eq("id", lead.id);
        err = e?.message ?? null;
      } else {
        const { error: e } = await sb
          .from("client_referrals")
          .update({ status: next })
          .eq("id", lead.id);
        err = e?.message ?? null;
      }

      if (!err) {
        setLeads((prev) =>
          prev.map((l) => (l.key === lead.key ? { ...l, status: next, relanceDue: false } : l)),
        );
      }
      return err;
    },
    [],
  );

  const counts = useMemo(() => {
    const byStatus: Record<CrmStatus, number> = {
      new: 0,
      contacted: 0,
      qualified: 0,
      converted: 0,
      lost: 0,
    };
    for (const l of leads) byStatus[l.status] += 1;
    return byStatus;
  }, [leads]);

  return { leads, loading, error, counts, refetch: fetchAll, updateStatus };
}
