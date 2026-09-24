// =============================================================================
// DonnerXpSheet — le geste d'une coach : +XP (24/09/2026, maquette v2).
//
// Trois raisons fixes, pas de montant libre, un geste par membre et par jour
// (le plafond vit en base : xp_donner_coach → _record_client_xp_interne).
// Elle reçoit une notification signée du prénom de la coach (xp-don-notifier).
// Les montants sont dans `actions.ts` ET en SQL — les deux doivent se suivre.
// =============================================================================

import { useState } from "react";
import { Feuille } from "../journal/JournalFeuilles";
import { getSupabaseClient } from "../../services/supabaseClient";
import { invaliderXpApercu } from "./useXpApercu";
import "../journal/journal.css";

export type RaisonDon = "bravo" | "defi" | "club";
export const RAISONS_DON: Array<{ cle: RaisonDon; xp: number; titre: string; sous: string }> = [
  { cle: "bravo", xp: 10, titre: "Bravo", sous: "un encouragement" },
  { cle: "defi", xp: 20, titre: "Défi tenu", sous: "une semaine de journal, un objectif atteint" },
  { cle: "club", xp: 10, titre: "Geste du club", sous: "a amené une amie, a aidé au comptoir" },
];

export function DonnerXpSheet({ clientId, prenom, total, format, onFermer, onDonne }: {
  clientId: string;
  prenom: string;
  total: number | null;
  format: "bbc" | "coach";
  onFermer: () => void;
  /** Après un don réussi : le nouveau total, pour rafraîchir l'écran qui l'a ouvert. */
  onDonne?: (total: number, xp: number) => void;
}) {
  const [raison, setRaison] = useState<RaisonDon>("bravo");
  const [mot, setMot] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const choix = RAISONS_DON.find((r) => r.cle === raison)!;

  async function envoyer() {
    setOccupe(true);
    setErreur(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Supabase indisponible");
      const { data, error } = await sb.rpc("xp_donner_coach", { p_client: clientId, p_raison: raison, p_mot: mot.trim() || null });
      if (error) throw new Error(error.message);
      const r = (data ?? {}) as { error?: string; total_xp?: number; gained_xp?: number };
      if (r.error === "deja_aujourdhui") {
        setErreur(`Tu as déjà donné des XP à ${prenom} aujourd'hui — un geste par jour, pour qu'il compte.`);
        return;
      }
      invaliderXpApercu();
      onDonne?.(Number(r.total_xp ?? 0), Number(r.gained_xp ?? choix.xp));
      onFermer();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setOccupe(false);
    }
  }

  return (
    <div className="jr" data-format={format}>
      <Feuille titre="Donner des XP" surTitre={total != null ? `${prenom} · ${total} XP` : prenom} onFermer={onFermer}>
        <div className="jr-raisons" role="group" aria-label="Pourquoi ?">
          {RAISONS_DON.map((r) => (
            <button key={r.cle} type="button" className={`jr-raison${r.cle === raison ? " on" : ""}`} aria-pressed={r.cle === raison} disabled={occupe} onClick={() => setRaison(r.cle)}>
              <b>+{r.xp}</b>
              <small>{r.titre}</small>
            </button>
          ))}
        </div>
        <div className="jr-tiny">{choix.sous}.</div>
        <textarea
          className="jr-texte"
          value={mot}
          maxLength={280}
          placeholder={`Un mot avec ? (facultatif) — ex. « 7 jours de journal d'affilée, chapeau »`}
          onChange={(e) => setMot(e.target.value)}
          aria-label="Un mot pour elle"
        />
        {erreur ? <div className="jr-vide">{erreur}</div> : null}
        <button type="button" className="jr-cta" disabled={occupe} onClick={() => void envoyer()}>
          {occupe ? "Envoi…" : `Envoyer +${choix.xp} XP à ${prenom}`}
        </button>
        <div className="jr-tiny" style={{ textAlign: "center" }}>Un geste par jour et par membre. Elle le voit tout de suite, avec ton prénom.</div>
      </Feuille>
    </div>
  );
}
