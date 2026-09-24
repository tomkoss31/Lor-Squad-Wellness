// =============================================================================
// XpBarLigne — « Tes XP au bar » (24/09/2026, maquette v2, bloc 5).
//
// Chez la membre (sous les défis du journal) et chez la coach (la fiche) : ses
// XP sur son compte du Shake Bar, le prochain cadeau du catalogue, ce qui a été
// versé. Tout vient de l'edge `xp-vers-le-bar` (mode `solde`) : la membre par
// son jeton, la coach par son JWT. Sans compte au bar, l'app lui propose d'en
// créer un — les versements l'attendent (ligne « sans_compte »).
// =============================================================================

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import "../journal/journal.css";

const BAR_URL = "https://commande.labase-nutrition.com";
// La roue publique du bar : le compte s'y crée après le tirage (Thomas, 24/09).
const ROUE_URL = "https://commande.labase-nutrition.com/jeu";

interface Solde {
  bar: { compte: boolean; xp: number; prochain: { id: string; cout: number; titre: string } | null; configure?: boolean };
  resume: { dernier?: { xp_bar: number; le: string; motif: string } | null; ce_mois?: number; plafond?: number; en_attente?: number; sans_compte?: boolean; versements?: Array<{ motif: string; xp_bar: number; statut: string; verse_le: string | null }> } | null;
  taux: number;
  plafond: number;
}

export function useSoldeBar(args: { token?: string | null; clientId?: string | null }) {
  const [solde, setSolde] = useState<Solde | null | undefined>(undefined);
  const { token, clientId } = args;
  useEffect(() => {
    let vivant = true;
    (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb || (!token && !clientId)) { if (vivant) setSolde(null); return; }
        const { data, error } = await sb.functions.invoke("xp-vers-le-bar", { body: token ? { mode: "solde", token } : { mode: "solde", client_id: clientId } });
        if (vivant) setSolde(error || !data?.ok ? null : (data as Solde));
      } catch {
        if (vivant) setSolde(null);
      }
    })();
    return () => { vivant = false; };
  }, [token, clientId]);
  return solde;
}

function dateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

/** Chez la membre : une ligne sous ses défis, jamais plus. */
export function XpBarMembre({ token, format }: { token: string; format: "bbc" | "std" }) {
  const solde = useSoldeBar({ token });
  // Tant que les secrets du bar ne sont pas posés, la ligne n'existe pas : rien de faux à l'écran.
  if (!solde || (!solde.bar.compte && solde.bar.configure === false)) return null;
  const { bar, resume } = solde;
  const prochain = bar.prochain;
  const part = prochain ? Math.min(1, bar.xp / prochain.cout) : 1;
  const dernier = resume?.dernier;
  return (
    <div className="jr" data-format={format}>
      <section className="jr-card" aria-label="Tes XP au bar">
        <div className="jr-row">
          <div className="jr-eye jr-grow">Tes XP au bar</div>
          <span className="jr-eye" style={{ color: "var(--jr-acc-tx)" }}>
            {bar.compte ? `${bar.xp} XP` : resume?.en_attente ? `${resume.en_attente} XP t'attendent` : "pas encore de compte"}
          </span>
        </div>
        {bar.compte ? (
          <>
            <div className="jr-bar-jauge" aria-hidden="true"><i style={{ width: `${Math.round(part * 100)}%` }} /></div>
            <div className="jr-tiny">
              {prochain ? <>Encore <b>{prochain.cout - bar.xp}</b> avant <b>{prochain.titre.toLowerCase()}</b></> : <>Tous les cadeaux sont à portée</>}
              {dernier ? <> · versé {dateCourte(dernier.le)} : <b>+{dernier.xp_bar}</b> (ta régularité)</> : null}
            </div>
          </>
        ) : (
          <div className="jr-tiny">
            Chaque lundi, ta régularité ici devient des XP au Shake Bar (× {solde.taux}, jusqu'à {solde.plafond} par mois).
            Tourne la roue avec <b>ton adresse e-mail habituelle</b> : ton compte se crée, un cadeau t'attend, et tes XP y arrivent.
          </div>
        )}
        {bar.compte ? (
          <a className="jr-lien" href={BAR_URL} target="_blank" rel="noreferrer">Voir mes cadeaux au bar ›</a>
        ) : (
          <a className="jr-roue" href={ROUE_URL} target="_blank" rel="noreferrer">🎰 Tourner la roue au bar</a>
        )}
      </section>
    </div>
  );
}

/** Chez la coach : une ligne dans la fiche. */
export function XpBarCoach({ clientId, format }: { clientId: string; format: "bbc" | "coach" }) {
  const solde = useSoldeBar({ clientId });
  if (!solde || (!solde.bar.compte && solde.bar.configure === false)) return null;
  const { bar, resume } = solde;
  const dernierVerse = resume?.versements?.find((v) => v.statut === "verse");
  return (
    <div className="jr" data-format={format}>
      <div className="jr-xp-ligne">
        <span>
          <b>Au bar</b>
          <small>
            {bar.compte
              ? `${bar.xp} XP${bar.prochain ? ` · prochain cadeau : ${bar.prochain.titre.toLowerCase()} (${bar.prochain.cout})` : " · tous les cadeaux à portée"}`
              : "pas de compte au bar avec cet e-mail — lui proposer d'en créer un"}
          </small>
        </span>
        <span className="jr-tiny" style={{ marginTop: 0, whiteSpace: "nowrap" }}>
          {dernierVerse?.verse_le ? `versé ${dateCourte(dernierVerse.verse_le)} +${dernierVerse.xp_bar}` : "rien de versé encore"}
        </span>
      </div>
    </div>
  );
}
