// =============================================================================
// « Et ensuite ? » — juste après la fiche papier (livraison C, maquette v7).
//
// Avant, la fiche se créait et l'écran se refermait : la coach devait aller
// chercher la personne dans « Les visites » pour pointer sa première visite.
// Or elle est LÀ, au comptoir, son shake à la main. Cette feuille enchaîne :
// la carte est déjà réglée par la fiche (étape « carte »), il reste le premier
// pointage — un tap. Elle s'ouvre après TOUTE création : depuis un rendez-vous
// (« elle prend sa carte de membre »), depuis le ＋, depuis Membres.
// =============================================================================

import { useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { BoutonDoux, BoutonFort, Feuille, Vide } from "./ui";

interface Props {
  clientId: string;
  /** Son prénom, quand on le connaît déjà (la liste se relit juste après). */
  prenom?: string;
  onClose: () => void;
  /** Ouvre sa fiche dans « Membres ». */
  onFiche: () => void;
}

export function ApresCreation({ clientId, prenom, onClose, onFiche }: Props) {
  const [etat, setEtat] = useState<"question" | "envoi" | "pointe" | "deja" | "erreur">("question");
  const elle = prenom?.trim() || "Elle";

  async function pointer() {
    setEtat("envoi");
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error();
      const { data, error } = await sb.rpc("bbc_add_visit", { p_client_id: clientId });
      if (error) throw error;
      const r = (data ?? {}) as Record<string, unknown>;
      setEtat(r.already_counted === true ? "deja" : "pointe");
    } catch {
      setEtat("erreur");
    }
  }

  return (
    <Feuille titre="Fiche créée ✓" sous={`${elle} est dans le club.`} onClose={onClose}>
      {etat === "pointe" || etat === "deja" ? (
        <>
          <Vide>{etat === "deja" ? "Sa visite d'aujourd'hui était déjà comptée." : "Première visite pointée : sa carte démarre, son bilan se prépare."}</Vide>
          <BoutonFort large onClick={onFiche}>Voir sa fiche</BoutonFort>
          <BoutonDoux large onClick={onClose}>Fermer</BoutonDoux>
        </>
      ) : (
        <>
          <Vide>{etat === "erreur" ? "Le pointage n'est pas passé — vérifie ta connexion et réessaie, ou pointe-la depuis « Les visites »." : `${elle} est là ce matin ? Sa première visite se pointe tout de suite.`}</Vide>
          <BoutonFort large onClick={() => void pointer()}>{etat === "envoi" ? "Pointage…" : "🔍 Pointer sa première visite"}</BoutonFort>
          <BoutonDoux large onClick={onFiche}>Voir sa fiche</BoutonDoux>
          <BoutonDoux large onClick={onClose}>Plus tard</BoutonDoux>
        </>
      )}
    </Feuille>
  );
}
