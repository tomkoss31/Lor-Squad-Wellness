// =============================================================================
// La caisse du comptoir — les appels à la base (lot 1, 26/09/2026).
// Tout passe par les fonctions de 20261215830000_comptoir_caisse_du_club.sql :
// la carte et les ventes ne s'écrivent jamais en direct.
// =============================================================================

import { getSupabaseClient } from "../../../services/supabaseClient";
import { lignesPanier, lireAchats, lireCaisse, type Achat, type DonneesCaisse, type Panier, type Rubrique, type Sorte } from "./caisse";

/** La carte, ses habituels et les plus vendus. null si l'appel a échoué. */
export async function chargerCaisse(clientId: string | null): Promise<DonneesCaisse | null> {
  try {
    const sb = await getSupabaseClient();
    if (!sb) return null;
    const { data, error } = await sb.rpc("club_caisse", { p_client: clientId });
    if (error) return null;
    return lireCaisse(data);
  } catch {
    return null;
  }
}

/** Enregistre la vente. Les prix sont relus en base : on n'envoie que le panier. */
export async function vendre(clientId: string, panier: Panier): Promise<{ ok: true; total: number } | { ok: false }> {
  try {
    const sb = await getSupabaseClient();
    if (!sb) return { ok: false };
    const { data, error } = await sb.rpc("club_vendre", { p_client: clientId, p_lignes: lignesPanier(panier) });
    if (error) return { ok: false };
    const total = Number((data as Record<string, unknown> | null)?.total);
    return { ok: true, total: Number.isFinite(total) ? total : 0 };
  } catch {
    return { ok: false };
  }
}

/** Ses achats au comptoir, du plus récent au plus ancien. null si l'appel a échoué. */
export async function chargerAchats(clientId: string): Promise<Achat[] | null> {
  try {
    const sb = await getSupabaseClient();
    if (!sb) return null;
    const { data, error } = await sb.rpc("club_achats", { p_client: clientId });
    if (error) return null;
    return lireAchats(data);
  } catch {
    return null;
  }
}

/** Annule une vente du jour. */
export async function annulerVente(venteId: string): Promise<boolean> {
  try {
    const sb = await getSupabaseClient();
    if (!sb) return false;
    const { error } = await sb.rpc("club_vente_annuler", { p_vente: venteId });
    return !error;
  } catch {
    return false;
  }
}

export interface ProduitAEnregistrer {
  /** null = un nouveau produit. */
  id: string | null;
  rubrique?: Rubrique;
  nom?: string;
  detail?: string | null;
  prix?: number;
  sorte?: Sorte;
  actif?: boolean;
}

/** Le propriétaire change sa carte (prix, retrait, ajout). */
export async function enregistrerProduit(p: ProduitAEnregistrer): Promise<boolean> {
  try {
    const sb = await getSupabaseClient();
    if (!sb) return false;
    const { error } = await sb.rpc("club_carte_enregistrer", {
      p_id: p.id,
      p_rubrique: p.rubrique ?? null,
      p_nom: p.nom ?? null,
      p_detail: p.detail === undefined ? null : p.detail ?? "",
      p_prix: p.prix ?? null,
      p_sorte: p.sorte ?? null,
      p_actif: p.actif ?? null,
    });
    return !error;
  } catch {
    return false;
  }
}
