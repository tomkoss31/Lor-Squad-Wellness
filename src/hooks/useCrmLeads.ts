// =============================================================================
// useCrmLeads — pipeline CRM unifié (VIP-4 2026-06-10, décision Thomas :
// « un pipeline pour tous, juste avoir l'info d'où ça vient »).
//
// Agrège les 4 tables de capture :
//   - online_bilans              (funnel bilan online → kanban Leads existant)
//   - prospect_leads             (welcome / opportunité / simulateur / business /
//                                 page publique Club VIP / recos PWA routées)
//   - client_referrals           (recos clients PWA historiques — legacy)
//   - client_referral_intentions (prénoms saisis dans le sandbox VIP — pas de
//     contact direct, MAIS le parrain est un client connu : l'action CRM est
//     « demander le contact au parrain » via son téléphone. Upgrade V1.1
//     2026-06-10, demande Thomas.)
//
// Statut normalisé : new → contacted → qualified → converted / lost.
// Le write-back traduit vers les valeurs natives de chaque table. RLS fait
// le filtrage par coach (admin voit tout sur prospect_leads/online_bilans/
// intentions, chaque coach voit ses client_referrals et les intentions de
// SES clients).
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";

export type CrmStatus = "new" | "contacted" | "qualified" | "converted" | "lost";
export type CrmTable =
  | "online_bilans"
  | "prospect_leads"
  | "client_referrals"
  | "client_referral_intentions";
export type CrmSource =
  | "bilan-online"
  | "vip"
  | "reco-client"
  | "intention"
  | "opportunite"
  | "simulateur"
  | "business"
  | "welcome"
  | "colis";

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
  /** Téléphone du client parrain (intentions : action « demander le contact »). */
  parrainPhone: string | null;
  /** Id client du parrain (recos + intentions) — pour la push de gratification
      à la conversion (wagon 2 chantier 5). */
  parrainClientId: string | null;
  /** Info complémentaire courte (ex. relation famille/travail pour intentions). */
  extra: string | null;
  /** Propriétaire du lead (distributeur/coach) — pour le filtre par ligne.
      online_bilans.coach_user_id · prospect_leads.referrer_user_id ·
      referrals/intentions → distributeur du client parrain. Null = non attribué. */
  ownerUserId: string | null;
  /** Relance J+3 due (online_bilans uniquement). */
  relanceDue: boolean;
  /** Lead « endormi » (archivé) — sorti du flux actif, zéro relance. */
  dormant?: boolean;
  /** Token de la page premium « Résultat Bilan » (online_bilans uniquement). */
  resultToken: string | null;
  createdAt: string;
  notes: string | null;
  /** Réponses du questionnaire funnel Opportunité (prospect_leads.metadata.answers)
   *  → affichées dans la carte CRM. Null si le lead n'a pas de funnel. */
  funnelAnswers?: Record<string, string> | null;
  funnelScore?: number | null;
  funnelTemperature?: string | null;
  funnelProfile?: string | null;
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
  intention: { label: "Intention", emoji: "💭" },
  opportunite: { label: "Opportunité", emoji: "🚪" },
  simulateur: { label: "Simulateur", emoji: "✨" },
  business: { label: "Business", emoji: "💼" },
  welcome: { label: "Site web", emoji: "🌐" },
  colis: { label: "Colis", emoji: "🎁" },
};

// Re-catégorisation manuelle (A, 2026-06-16) : sources éditables pour un lead
// prospect + mapping vers la valeur stockée en base (prospect_leads.source).
export const CRM_EDITABLE_SOURCES: CrmSource[] = ["welcome", "opportunite", "business", "vip", "simulateur", "reco-client"];
const CRM_SOURCE_TO_DB: Partial<Record<CrmSource, string>> = {
  welcome: "welcome_page",
  opportunite: "opportunite",
  business: "business",
  vip: "vip",
  simulateur: "simulateur",
  "reco-client": "reco-client",
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  family: "famille",
  work: "travail",
  sport: "sport",
  friend: "ami·e",
  other: "connaissance",
};

function looksLikePhone(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.replace(/\D/g, "").length >= 6 && !value.includes("@");
}

function mapProspectSource(source: string | null | undefined): CrmSource {
  const s = (source ?? "").toLowerCase();
  if (s === "vip") return "vip";
  if (s === "reco-client") return "reco-client";
  // « rejoindre-funnel », « rejoindre », « opportunite-gated »… → Opportunité.
  // (bug : « rejoindre-funnel » ne matchait ni startsWith("opportunite") ni
  // === "rejoindre" → tombait sur le défaut « Site web ». Corrigé 2026-07-11.)
  if (s.startsWith("opportunite") || s.startsWith("rejoindre")) return "opportunite";
  if (s === "simulateur") return "simulateur";
  if (s.startsWith("business")) return "business";
  if (s === "colis") return "colis";
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

interface IntentionRow {
  id: string;
  referrer_client_id: string | null;
  prospect_first_name: string | null;
  relationship: string | null;
  status: string | null;
  created_at: string;
  notes: string | null;
}

export interface CrmSourceStat {
  source: CrmSource;
  total: number;
  active: number; // ni converti ni perdu
  converted: number;
  lost: number;
  conversionRate: number; // converted / total (0-1)
}

/** Stats par source pour le panneau #6 (taux de conversion par canal). */
export function computeCrmStats(leads: CrmLead[]): {
  bySource: CrmSourceStat[];
  overall: { total: number; converted: number; conversionRate: number };
} {
  const map = new Map<CrmSource, CrmSourceStat>();
  for (const l of leads) {
    const s =
      map.get(l.source) ??
      { source: l.source, total: 0, active: 0, converted: 0, lost: 0, conversionRate: 0 };
    s.total += 1;
    if (l.status === "converted") s.converted += 1;
    else if (l.status === "lost") s.lost += 1;
    else s.active += 1;
    map.set(l.source, s);
  }
  const bySource = [...map.values()]
    .map((s) => ({ ...s, conversionRate: s.total > 0 ? s.converted / s.total : 0 }))
    .sort((a, b) => b.total - a.total);
  const total = leads.length;
  const converted = leads.filter((l) => l.status === "converted").length;
  return {
    bySource,
    overall: { total, converted, conversionRate: total > 0 ? converted / total : 0 },
  };
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

      const [bilansRes, prospectsRes, referralsRes, intentionsRes] = await Promise.all([
        sb
          .from("online_bilans")
          // ONLINE-B : on EXCLUT les drafts « Curieux » (completed_at NULL) du
          // pipeline qualifié — ils ont leur section dédiée (useCuriousLeads).
          .select(
            "id, first_name, phone, email, city, lead_status, converted_to_client_id, relance_due_at, relance_done_at, result_token, created_at, notes, coach_user_id",
          )
          .not("completed_at", "is", null)
          .order("created_at", { ascending: false })
          .limit(500),
        sb
          .from("prospect_leads")
          .select("id, first_name, phone, email, city, source, status, metadata, created_at, notes, referrer_user_id")
          .order("created_at", { ascending: false })
          .limit(500),
        sb
          .from("client_referrals")
          .select("id, from_client_id, from_client_name, referred_name, referred_contact, status, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
        sb
          .from("client_referral_intentions")
          .select("id, referrer_client_id, prospect_first_name, relationship, status, created_at, notes")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

      // Garde-fou : on remonte la 1ère erreur au lieu d'un échec silencieux
      // (leçon RLS 2026-04-25). Les autres sources restent affichées.
      const firstError =
        bilansRes.error ?? prospectsRes.error ?? referralsRes.error ?? intentionsRes.error;
      if (firstError) setError(firstError.message);

      // Résolution des parrains (nom + téléphone) pour les intentions —
      // 1 seule requête clients sur les ids référents.
      const intentionRows = (intentionsRes.data ?? []) as IntentionRow[];
      // Ids des clients parrains (intentions ET recos) → résolution nom/tel +
      // distributeur (= propriétaire du lead, pour le filtre par ligne).
      const parrainIds = [
        ...new Set(
          [
            ...intentionRows.map((r) => r.referrer_client_id),
            ...(referralsRes.data ?? []).map((r) => r.from_client_id as string | null),
          ].filter(Boolean) as string[],
        ),
      ];
      const parrains = new Map<string, { name: string; phone: string | null }>();
      const clientDistributor = new Map<string, string | null>();
      if (parrainIds.length > 0) {
        const { data: parrainData } = await sb
          .from("clients")
          .select("id, first_name, last_name, phone, distributor_id")
          .in("id", parrainIds);
        for (const c of parrainData ?? []) {
          parrains.set(c.id as string, {
            name: `${(c.first_name as string) ?? ""} ${(c.last_name as string) ?? ""}`.trim(),
            phone: (c.phone as string | null) ?? null,
          });
          clientDistributor.set(c.id as string, (c.distributor_id as string | null) ?? null);
        }
      }

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
          parrainPhone: null,
          parrainClientId: null,
          extra: null,
          ownerUserId: (row.coach_user_id as string | null) ?? null,
          relanceDue: Boolean(
            row.relance_due_at &&
              !row.relance_done_at &&
              new Date(row.relance_due_at as string).getTime() <= now,
          ),
          resultToken: (row.result_token as string | null) ?? null,
          createdAt: row.created_at as string,
          notes: (row.notes as string | null) ?? null,
        });
      }

      for (const row of prospectsRes.data ?? []) {
        const meta = (row.metadata ?? {}) as Record<string, unknown>;
        const viaName =
          typeof meta.from_client_name === "string" ? (meta.from_client_name as string) : null;
        const source = mapProspectSource(row.source as string | null);
        // Réponses du funnel Opportunité (metadata.answers) — pour les afficher
        // dans la carte CRM (bug : elles n'étaient jamais exposées).
        const funnelAnswers =
          meta.answers && typeof meta.answers === "object" && !Array.isArray(meta.answers)
            ? (meta.answers as Record<string, string>)
            : null;
        // Signal de priorité colis (remplace "disponibilité", décision Thomas
        // 2026-07-08) : ce que la personne a choisi en fin de tunnel — une
        // action réelle est un bien meilleur indicateur qu'une réponse déclarée.
        const colisNextAction =
          source === "colis" ? (meta.colis_next_action as string | undefined) : undefined;
        const colisExtra =
          colisNextAction === "rdv"
            ? "🔴 Voulait un RDV direct"
            : colisNextAction === "bilan"
              ? "🟠 Bilan en ligne complet"
              : colisNextAction === "email_only"
                ? "⚪ A laissé son email"
                : null;
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
          parrainPhone: null,
          parrainClientId:
            typeof meta.from_client_id === "string" ? (meta.from_client_id as string) : null,
          extra: colisExtra,
          ownerUserId: (row.referrer_user_id as string | null) ?? null,
          relanceDue: false,
          resultToken: null,
          createdAt: row.created_at as string,
          notes: (row.notes as string | null) ?? null,
          funnelAnswers,
          funnelScore: typeof meta.score === "number" ? (meta.score as number) : null,
          funnelTemperature: typeof meta.temperature === "string" ? (meta.temperature as string) : null,
          funnelProfile: typeof meta.profile === "string" ? (meta.profile as string) : null,
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
          parrainPhone: null,
          parrainClientId: (row.from_client_id as string | null) ?? null,
          extra: null,
          ownerUserId: row.from_client_id
            ? clientDistributor.get(row.from_client_id as string) ?? null
            : null,
          relanceDue: false,
          resultToken: null,
          createdAt: row.created_at as string,
          notes: null,
        });
      }

      // Intentions VIP (upgrade V1.1) : pas de contact direct — l'action est
      // « demander le contact au parrain » (client connu, téléphone résolu).
      for (const row of intentionRows) {
        const parrain = row.referrer_client_id ? parrains.get(row.referrer_client_id) : undefined;
        all.push({
          key: `client_referral_intentions:${row.id}`,
          table: "client_referral_intentions",
          id: row.id,
          firstName: row.prospect_first_name || "—",
          contact: null,
          contactIsPhone: false,
          city: null,
          source: "intention",
          status: mapSimpleStatus(row.status),
          viaName: parrain?.name ?? null,
          parrainPhone: parrain?.phone ?? null,
          parrainClientId: row.referrer_client_id,
          extra: row.relationship ? RELATIONSHIP_LABELS[row.relationship] ?? row.relationship : null,
          ownerUserId: row.referrer_client_id
            ? clientDistributor.get(row.referrer_client_id) ?? null
            : null,
          relanceDue: false,
          resultToken: null,
          createdAt: row.created_at,
          notes: row.notes ?? null,
        });
      }

      // Archive « endormi » (flag orthogonal, table crm_archived_leads).
      const { data: arch } = await sb.from("crm_archived_leads").select("lead_table, lead_id");
      const archSet = new Set(
        ((arch ?? []) as Array<{ lead_table: string; lead_id: string }>).map(
          (a) => `${a.lead_table}:${a.lead_id}`,
        ),
      );
      for (const l of all) {
        if (archSet.has(`${l.table}:${l.id}`)) {
          l.dormant = true;
          l.relanceDue = false; // un endormi ne déclenche aucune relance
        }
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
      } else if (lead.table === "client_referral_intentions") {
        // Natif : pending / contacted / converted / lost.
        const native = next === "new" ? "pending" : next === "qualified" ? "contacted" : next;
        const patch: Record<string, unknown> = { status: native };
        if (next === "contacted") patch.contacted_at = new Date().toISOString();
        if (next === "converted") patch.converted_at = new Date().toISOString();
        const { error: e } = await sb
          .from("client_referral_intentions")
          .update(patch)
          .eq("id", lead.id);
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
        // Wagon 2 chantier 5 : conversion d'une reco/intention → push de
        // gratification au client parrain (« 🎉 Ta reco a porté ses fruits »).
        // Fire-and-forget : un échec ne bloque jamais le changement de statut.
        if (next === "converted" && lead.parrainClientId) {
          void sb.functions
            .invoke("notify-referral-converted", {
              body: {
                parrain_client_id: lead.parrainClientId,
                prospect_first_name: lead.firstName,
              },
            })
            .catch(() => {
              /* best-effort */
            });
        }
      }
      return err;
    },
    [],
  );

  // Re-catégoriser la source d'un lead prospect (A, 2026-06-16). Les autres
  // tables ont une source intrinsèque (bilan online, reco client, intention).
  const updateSource = useCallback(async (lead: CrmLead, next: CrmSource): Promise<string | null> => {
    if (lead.table !== "prospect_leads") {
      return "La source n'est modifiable que pour les leads prospect.";
    }
    const dbVal = CRM_SOURCE_TO_DB[next];
    if (!dbVal) return "Source invalide.";
    const sb = await getSupabaseClient();
    if (!sb) return "Service indisponible.";
    const { error: e } = await sb.from("prospect_leads").update({ source: dbVal }).eq("id", lead.id);
    if (e) return e.message;
    setLeads((prev) => prev.map((l) => (l.key === lead.key ? { ...l, source: next } : l)));
    return null;
  }, []);

  // Endormir / réveiller un lead (archive orthogonale).
  const setDormant = useCallback(async (lead: CrmLead, value: boolean): Promise<string | null> => {
    const sb = await getSupabaseClient();
    if (!sb) return "Service indisponible.";
    if (value) {
      const { error: e } = await sb
        .from("crm_archived_leads")
        .upsert({ lead_table: lead.table, lead_id: lead.id }, { onConflict: "lead_table,lead_id" });
      if (e) return e.message;
    } else {
      const { error: e } = await sb
        .from("crm_archived_leads")
        .delete()
        .eq("lead_table", lead.table)
        .eq("lead_id", lead.id);
      if (e) return e.message;
    }
    setLeads((prev) =>
      prev.map((l) =>
        l.key === lead.key ? { ...l, dormant: value, relanceDue: value ? false : l.relanceDue } : l,
      ),
    );
    return null;
  }, []);

  // Suppression définitive (admin) depuis la table source + nettoyage archive.
  const deleteLead = useCallback(async (lead: CrmLead): Promise<string | null> => {
    const sb = await getSupabaseClient();
    if (!sb) return "Service indisponible.";
    const { error: e } = await sb.from(lead.table).delete().eq("id", lead.id);
    if (e) return e.message;
    await sb
      .from("crm_archived_leads")
      .delete()
      .eq("lead_table", lead.table)
      .eq("lead_id", lead.id);
    setLeads((prev) => prev.filter((l) => l.key !== lead.key));
    return null;
  }, []);

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

  return { leads, loading, error, counts, refetch: fetchAll, updateStatus, updateSource, setDormant, deleteLead };
}
