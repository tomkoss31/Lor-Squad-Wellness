// =============================================================================
// useBbcBoites — les boîtes de contact et leurs coupons.
//
// Ce que le hook fait, et surtout ce qu'il ne fait pas :
//   · il LIT les boîtes du club et tous leurs coupons (les volumes sont petits :
//     une douzaine de boîtes, quelques dizaines de coupons par mois) ;
//   · il ÉCRIT le coupon d'abord, le lead du CRM ensuite. Jamais l'inverse : le
//     papier est déjà dans la main du coach, on ne le perd pas parce qu'une
//     écriture secondaire a échoué ;
//   · il ne touche PAS aux cœurs. `client_referrals` n'accepte d'insertion que
//     par un jeton d'app membre — le classement compte donc les coupons
//     `demarre`, ce qui donne le même chiffre sans ouvrir une table sensible.
//
// La RLS reste la vraie barrière : on ne filtre ici que pour demander le bon
// périmètre (cf. perimetre.ts).
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import type { Boite, Coupon, IssueCoupon } from "./boites";

/** Le téléphone réduit à ses chiffres — la seule forme comparable. */
export function chiffresDuTelephone(tel: string): string {
  return (tel || "").replace(/\D/g, "");
}

export interface NouvelleBoite {
  numero: number;
  commerce: string;
  ou?: string | null;
  contactCommercant?: string | null;
  ville?: string | null;
  poseurUserId?: string | null;
  poseurClientId?: string | null;
  poseurNom: string;
}

export interface NouveauCoupon {
  boiteId: string;
  prenom: string;
  nom?: string | null;
  ville?: string | null;
  telephone: string;
}

export interface UseBbcBoitesResult {
  boites: Boite[];
  coupons: Coupon[];
  loading: boolean;
  refetch: () => Promise<void>;
  poserBoite: (b: NouvelleBoite) => Promise<boolean>;
  saisirCoupon: (c: NouveauCoupon) => Promise<boolean>;
  marquerRelevee: (boiteId: string) => Promise<void>;
  retirerBoite: (boiteId: string) => Promise<void>;
  changerPoseur: (boiteId: string, p: { userId?: string | null; clientId?: string | null; nom: string }) => Promise<void>;
  trancherCoupon: (couponId: string, issue: IssueCoupon) => Promise<void>;
  /** Le lead déjà connu qui porte ce téléphone, ou null. */
  chercherDoublon: (telephone: string) => Promise<{ nom: string; depuis: string } | null>;
}

function versBoite(r: Record<string, unknown>): Boite {
  return {
    id: String(r.id),
    numero: Number(r.number) || 0,
    commerce: String(r.merchant_name ?? ""),
    ou: (r.place_detail as string | null) ?? null,
    contactCommercant: (r.merchant_contact as string | null) ?? null,
    ville: (r.city as string | null) ?? null,
    poseurUserId: (r.placed_by_user_id as string | null) ?? null,
    poseurClientId: (r.placed_by_client_id as string | null) ?? null,
    poseurNom: String(r.placed_by_name ?? "—"),
    poseeLe: String(r.placed_at ?? ""),
    releveeLe: (r.last_collected_at as string | null) ?? null,
    retireeLe: (r.removed_at as string | null) ?? null,
  };
}

function versCoupon(r: Record<string, unknown>): Coupon {
  return {
    id: String(r.id),
    boiteId: String(r.box_id),
    prenom: String(r.first_name ?? ""),
    nom: (r.last_name as string | null) ?? null,
    ville: (r.city as string | null) ?? null,
    telephone: String(r.phone ?? ""),
    leadId: (r.lead_id as string | null) ?? null,
    appeleLe: (r.called_at as string | null) ?? null,
    issue: (r.outcome as IssueCoupon | null) ?? null,
    saisiLe: String(r.created_at ?? ""),
  };
}

export function useBbcBoites(userId?: string | null, clubId?: string | null): UseBbcBoitesResult {
  const [boites, setBoites] = useState<Boite[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
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
      const [boitesRes, couponsRes] = await Promise.all([
        sb
          .from("contact_boxes")
          .select(
            "id, number, merchant_name, place_detail, merchant_contact, city, placed_by_user_id, placed_by_client_id, placed_by_name, placed_at, last_collected_at, removed_at",
          )
          .order("number"),
        sb
          .from("contact_box_coupons")
          .select("id, box_id, first_name, last_name, city, phone, lead_id, called_at, outcome, created_at")
          .order("created_at", { ascending: false }),
      ]);
      if (Array.isArray(boitesRes.data)) setBoites((boitesRes.data as Record<string, unknown>[]).map(versBoite));
      if (Array.isArray(couponsRes.data)) setCoupons((couponsRes.data as Record<string, unknown>[]).map(versCoupon));
    } catch {
      // silent-fail : le bandeau rouge d'AppContext couvre les pannes globales.
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const poserBoite = useCallback(
    async (b: NouvelleBoite) => {
      if (!userId || !clubId) return false;
      try {
        const sb = await getSupabaseClient();
        if (!sb) return false;
        const { error } = await sb.from("contact_boxes").insert({
          club_id: clubId,
          number: b.numero,
          merchant_name: b.commerce.trim(),
          place_detail: b.ou?.trim() || null,
          merchant_contact: b.contactCommercant?.trim() || null,
          city: b.ville?.trim() || null,
          placed_by_user_id: b.poseurClientId ? null : (b.poseurUserId ?? userId),
          placed_by_client_id: b.poseurClientId ?? null,
          placed_by_name: b.poseurNom.trim() || "—",
          created_by: userId,
        });
        if (error) return false;
        await refetch();
        return true;
      } catch {
        return false;
      }
    },
    [userId, clubId, refetch],
  );

  /**
   * Le coupon, puis le lead, puis la relève.
   *
   * L'ordre n'est pas négociable : si le lead échoue, le coupon reste — avec son
   * téléphone, donc rien n'est perdu et on peut le rejouer. Si on faisait
   * l'inverse, un lead orphelin traînerait dans le CRM sans que personne sache
   * d'où il vient.
   */
  const saisirCoupon = useCallback(
    async (c: NouveauCoupon) => {
      if (!userId) return false;
      try {
        const sb = await getSupabaseClient();
        if (!sb) return false;
        const boite = boites.find((b) => b.id === c.boiteId) ?? null;
        const tel = chiffresDuTelephone(c.telephone);

        const { data: insere, error } = await sb
          .from("contact_box_coupons")
          .insert({
            box_id: c.boiteId,
            first_name: c.prenom.trim(),
            last_name: c.nom?.trim() || null,
            city: c.ville?.trim() || null,
            phone: tel,
            created_by: userId,
          })
          .select("id")
          .maybeSingle();
        if (error) return false;

        // Le lead du CRM. « Rapporté par », jamais « attribué à » : on laisse
        // `assigned_to_user_id` et `referrer_user_id` vides pour que le lead
        // reste dans la vue par défaut des admins et dans le dédoublonnage.
        const provenance = boite ? `Boîte n° ${boite.numero} · ${boite.commerce}` : "Boîte de contact";
        const { data: lead } = await sb
          .from("prospect_leads")
          .insert({
            first_name: c.prenom.trim(),
            last_name: c.nom?.trim() || null,
            phone: c.telephone.trim(),
            city: c.ville?.trim() || null,
            source: "boite_contact",
            status: "new",
            // Le bon papier porte la mention de recontact : le déposer, c'est
            // consentir. C'est la seule raison pour laquelle ce champ est vrai.
            consent_recontact: true,
            provenance_canal: "boite",
            provenance_user_id: boite?.poseurUserId ?? null,
            provenance_libre: boite ? `${provenance} · posée par ${boite.poseurNom}` : provenance,
            provenance_at: new Date().toISOString(),
            metadata: {
              boite_id: c.boiteId,
              boite_numero: boite?.numero ?? null,
              poseur_nom: boite?.poseurNom ?? null,
              poseur_client_id: boite?.poseurClientId ?? null,
            },
          })
          .select("id")
          .maybeSingle();

        if (insere?.id && lead?.id) {
          await sb.from("contact_box_coupons").update({ lead_id: lead.id }).eq("id", String(insere.id));
        }

        // Saisir un coupon, c'est avoir la boîte en main : elle est relevée.
        await sb.from("contact_boxes").update({ last_collected_at: new Date().toISOString() }).eq("id", c.boiteId);

        await refetch();
        return true;
      } catch {
        return false;
      }
    },
    [userId, boites, refetch],
  );

  const marquerRelevee = useCallback(
    async (boiteId: string) => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        await sb.from("contact_boxes").update({ last_collected_at: new Date().toISOString() }).eq("id", boiteId);
        await refetch();
      } catch {
        /* silent-fail */
      }
    },
    [refetch],
  );

  const retirerBoite = useCallback(
    async (boiteId: string) => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        await sb.from("contact_boxes").update({ removed_at: new Date().toISOString() }).eq("id", boiteId);
        await refetch();
      } catch {
        /* silent-fail */
      }
    },
    [refetch],
  );

  const changerPoseur = useCallback(
    async (boiteId: string, p: { userId?: string | null; clientId?: string | null; nom: string }) => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        await sb
          .from("contact_boxes")
          .update({
            placed_by_user_id: p.clientId ? null : (p.userId ?? null),
            placed_by_client_id: p.clientId ?? null,
            placed_by_name: p.nom,
          })
          .eq("id", boiteId);
        await refetch();
      } catch {
        /* silent-fail */
      }
    },
    [refetch],
  );

  /**
   * Trancher un coupon marque aussi qu'on a JOINT la personne — sauf « sans
   * réponse », qui dit précisément le contraire. Sans ça, l'entonnoir compterait
   * des RDV pris avec des gens jamais appelés.
   */
  const trancherCoupon = useCallback(
    async (couponId: string, issue: IssueCoupon) => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const maj: Record<string, unknown> = { outcome: issue };
        if (issue !== "sans_reponse") maj.called_at = new Date().toISOString();
        await sb.from("contact_box_coupons").update(maj).eq("id", couponId);
        await refetch();
      } catch {
        /* silent-fail */
      }
    },
    [refetch],
  );

  const chercherDoublon = useCallback(async (telephone: string) => {
    const tel = chiffresDuTelephone(telephone);
    if (tel.length < 9) return null;
    // Les 9 derniers chiffres : ils survivent au +33, aux espaces et aux points.
    const fin = tel.slice(-9);
    try {
      const sb = await getSupabaseClient();
      if (!sb) return null;
      const { data } = await sb
        .from("prospect_leads")
        .select("first_name, last_name, created_at, phone")
        .ilike("phone", `%${fin}%`)
        .limit(1);
      const l = Array.isArray(data) && data.length ? (data[0] as Record<string, unknown>) : null;
      if (!l) return null;
      return {
        nom: `${String(l.first_name ?? "")} ${String(l.last_name ?? "")}`.trim() || "Cette personne",
        depuis: String(l.created_at ?? ""),
      };
    } catch {
      return null;
    }
  }, []);

  return {
    boites,
    coupons,
    loading,
    refetch,
    poserBoite,
    saisirCoupon,
    marquerRelevee,
    retirerBoite,
    changerPoseur,
    trancherCoupon,
    chercherDoublon,
  };
}
