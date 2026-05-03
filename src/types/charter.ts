// =============================================================================
// Charte du Distributeur — types (2026-05-03)
//
// Mappe la table public.distributor_charters côté front. Persistance DB
// remplace localStorage de l'ancienne FormationCharterPage.
// =============================================================================

export interface DistributorCharter {
  id: string;
  user_id: string;

  // Remplissages distri
  pourquoi_text: string | null;
  objectif_12_mois: string | null;

  // Signature distri
  signature_data_url: string | null;
  signed_at: string | null;

  // Co-signature (sponsor direct N+1 ou admin)
  cosigner_id: string | null;
  cosigner_name: string | null;
  cosigner_role: string | null;
  cosigner_signature_data_url: string | null;
  cosigned_at: string | null;

  /** Template visuel choisi par le distri. Default 'officielle'. */
  preferred_template: CharterTemplate;

  created_at: string;
  updated_at: string;
}

export type CharterDraft = Pick<
  DistributorCharter,
  "pourquoi_text" | "objectif_12_mois"
>;

/**
 * Mode d'affichage du composant CharteDistributeur.
 *  - preview  : lecture seule (admin voit la charte d'un distri)
 *  - fillable : édition active (le distri remplit/signe)
 *  - print    : version optimisée pour PDF (sans inputs, sans modale)
 */
export type CharterDisplayMode = "preview" | "fillable" | "print";

/**
 * Template visuel choisi pour le rendu de la charte.
 *  - officielle : A4 paper crème classique (5 cards engagements)
 *  - manifeste  : A4 paper, serment poétique 100% Lor'Squad
 *  - story      : 9:16 dark luxury, partage Instagram
 */
export type CharterTemplate = "officielle" | "manifeste" | "story";

export interface CharterPersonInfo {
  firstName: string;
  lastName: string;
  role?: string;
  signedAt?: string | null;
  signatureDataUrl?: string | null;
}
