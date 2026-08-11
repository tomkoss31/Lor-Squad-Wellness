// =============================================================================
// PrelaunchCounter — « il reste X places » sous l'offre de pré-lancement.
//
// L'annonce « réservée aux 20 premiers membres » était une affirmation ; le
// compteur en fait un fait vérifiable, et c'est LUI qui crée l'urgence
// (décision Thomas 2026-08-10 : « ça donne de l'urgence avec un compteur de
// carte dispo pour les 20 premiers »).
//
// Le chiffre vient de la RPC `club_prelaunch_cards_left`, qui compte les
// cartes 30 réellement attribuées. Le seuil est en base
// (`clubs.settings.prelaunch.slots`) : Thomas peut le lever sans redéploiement.
//
// TANT QU'ON NE SAIT PAS, ON N'ÉCRIT RIEN. Pas de squelette, pas de « … » :
// un compteur de rareté qui affiche une valeur d'attente puis se corrige fait
// exactement le contraire de ce qu'on lui demande — il rend le chiffre suspect.
// =============================================================================

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

export function PrelaunchCounter({ slug = "verdun" }: { slug?: string }) {
  const [restant, setRestant] = useState<number | null>(null);

  useEffect(() => {
    let vivant = true;
    (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data, error } = await sb.rpc("club_prelaunch_cards_left", { p_slug: slug });
        if (!vivant || error) return;
        const n = Number(data);
        if (Number.isFinite(n)) setRestant(n);
      } catch {
        // Silencieux : une page vitrine ne montre pas ses pannes. Sans chiffre,
        // la carte reste parfaitement lisible — l'offre est déjà décrite
        // au-dessus, le compteur ne fait que la dater.
      }
    })();
    return () => {
      vivant = false;
    };
  }, [slug]);

  if (restant === null) return null;

  const epuise = restant === 0;
  return (
    <p
      // aria-live : quelqu'un qui navigue au lecteur d'écran entend le chiffre
      // quand il arrive, sans avoir à revenir en arrière sur la carte.
      aria-live="polite"
      style={{
        margin: "10px 0 0",
        fontSize: 13.5,
        fontWeight: 700,
        color: epuise ? "var(--on-dark-3, #8FA09B)" : "var(--yellow, #F1E27E)",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          flex: "none",
          background: epuise ? "var(--on-dark-3, #8FA09B)" : "var(--orange, #FF6A2B)",
        }}
      />
      {epuise ? (
        <>Les 20 places de pré-lancement sont prises.</>
      ) : (
        <>
          Il reste <b style={{ fontSize: 15 }}>{restant}</b> {restant > 1 ? "places" : "place"} à ce tarif
        </>
      )}
    </p>
  );
}
