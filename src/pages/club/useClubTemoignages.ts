// =============================================================================
// useClubTemoignages — les témoignages approuvés, pour le site public du club.
//
// POURQUOI PAS <TestimonialsCarousel>, qui existe déjà et tourne sur quatre
// pages publiques : il est habillé avec les tokens des pages V2 (`--glass`,
// `--teal-text`, `--hair`). Le club a son propre système, crème et orange, et
// la charte dit que les trois univers visuels ne se mélangent JAMAIS. On reprend
// donc sa LECTURE (même table, même filtre, même parsing) et on laisse la page
// du club l'habiller avec ses propres cartes.
//
// Lecture directe en PostgREST : la policy `testimonials_public_select_approved`
// couvre l'anonyme — c'est déjà ce que font les quatre autres pages.
// =============================================================================

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { CLUB_TEMOIGNAGES_PUBLIES } from "../../data/clubResultats";

/**
 * Les témoignages recueillis par lien générique n'ont pas de fiche client : le
 * prénom (et parfois la ville) est encodé en tête du texte, « [FROM:Judith|] ».
 * Même expression que TestimonialsCarousel — si le format change un jour, les
 * deux doivent bouger ensemble.
 */
const MARQUEUR_AUTEUR = /^\[FROM:([^|\]]+)(?:\|([^\]]*))?\]\s*/;

/** Au-delà, une carte devient un pavé. On coupe à la PHRASE, jamais au mot. */
const LONGUEUR_MAX = 300;

export interface ClubTemoignage {
  id: string;
  texte: string;
  auteur: string;
  ville?: string;
  /** Vrai si on a dû raccourcir : la page peut alors renvoyer vers l'intégral. */
  raccourci: boolean;
}

/**
 * Coupe proprement : on garde les phrases entières qui tiennent, et on ne
 * tronque au mot que si la première phrase dépasse déjà à elle seule. Couper
 * au caractère près donnerait « je me sens beaucoup mieux qu'av… », ce qui
 * fait douter du témoignage plutôt que de le servir.
 */
function raccourcir(texte: string): { texte: string; raccourci: boolean } {
  if (texte.length <= LONGUEUR_MAX) return { texte, raccourci: false };
  const phrases = texte.split(/(?<=[.!?])\s+/);
  let sortie = "";
  for (const p of phrases) {
    if (sortie && (sortie + " " + p).length > LONGUEUR_MAX) break;
    sortie = sortie ? `${sortie} ${p}` : p;
  }
  if (!sortie) sortie = `${texte.slice(0, LONGUEUR_MAX).trimEnd()}…`;
  return { texte: sortie, raccourci: true };
}

/**
 * Ne remonte QUE les témoignages nommément autorisés pour le site du club
 * (`CLUB_TEMOIGNAGES_PUBLIES`). Le filtre `status = 'approved'` reste, mais il
 * ne suffit pas : la modération de l'app dit qu'un texte est authentique, pas
 * qu'il est publiable sur une vitrine de nutrition. Un tirage automatique
 * mettrait en ligne, sans que personne ne le relise, le prochain témoignage
 * approuvé — qu'il cite une marque, un produit ou un symptôme.
 */
export function useClubTemoignages(limite = 6) {
  const [temoignages, setTemoignages] = useState<ClubTemoignage[] | null>(null);

  useEffect(() => {
    let vivant = true;
    if (CLUB_TEMOIGNAGES_PUBLIES.length === 0) return;
    (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data, error } = await sb
          .from("client_testimonials")
          .select("id, content, public_excerpt, created_at")
          .eq("status", "approved")
          .in("id", CLUB_TEMOIGNAGES_PUBLIES)
          .order("created_at", { ascending: false })
          .limit(limite);
        if (!vivant || error || !Array.isArray(data)) return;

        setTemoignages(
          data.map((row) => {
            const brut = String(row.public_excerpt ?? row.content ?? "");
            const m = brut.match(MARQUEUR_AUTEUR);
            const sansMarqueur = brut.replace(MARQUEUR_AUTEUR, "").trim();
            const { texte, raccourci } = raccourcir(sansMarqueur);
            return {
              id: String(row.id),
              texte,
              auteur: (m?.[1] ?? "").trim() || "Un membre",
              ville: (m?.[2] ?? "").trim() || undefined,
              raccourci,
            };
          }).filter((t) => t.texte.length > 0),
        );
      } catch {
        // Silencieux : sans témoignage, la page garde son texte d'attente.
      }
    })();
    return () => {
      vivant = false;
    };
  }, [limite]);

  return temoignages;
}
