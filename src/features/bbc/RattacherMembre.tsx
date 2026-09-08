// =============================================================================
// « Suivi par » — donner une fiche à un autre coach du club.
//
// POURQUOI. Le 07/09, jour de l'ouverture, Thomas crée les fiches d'Audrey et
// d'Anaïs. Ce sont les personnes de Romane, mais c'est lui qui tape : les deux
// fiches naissent donc à son nom. Romane, qui n'est pas admin, ne voit que ses
// propres fiches — elle ne les aurait jamais vues.
//
// Et RIEN dans l'application ne permettait de le corriger : aucun écran
// n'écrivait `clients.distributor_id` après la création. L'onglet « Transferts »
// des Paramètres déplace un DISTRIBUTEUR vers un nouveau PARRAIN (la lignée
// Herbalife) — autre chose, qui ne touche pas les fiches.
//
// CE QUI SUIT LA FICHE : elle-même et ses cœurs (sinon le nouveau coach ne
// verrait pas les recommandations de sa propre personne).
// CE QUI RESTE : les visites et les messages. Qui a pointé qui un matin donné
// est un fait ; le réécrire falsifierait l'historique.
//
// Le contrôle d'accès est EN BASE (`bbc_rattacher_membre` → `bbc_agir_pour`) :
// masquer le bouton ici n'est qu'un confort de lecture, jamais une sécurité.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { perimetreDuCoach } from "./perimetre";
import type { BbcMember } from "./useBbcMembers";

interface CoachDuClub {
  id: string;
  nom: string;
}

export function RattacherMembre({
  membre,
  userId,
  onFait,
}: {
  membre: BbcMember;
  userId?: string;
  /** Rappelé après un rattachement réussi — la liste doit se recharger. */
  onFait: () => void;
}) {
  const [coachs, setCoachs] = useState<CoachDuClub[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!ouvert || !userId || coachs.length) return;
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const p = await perimetreDuCoach(sb, userId);
        if (!p.monClub) return;
        // Tous ceux qui TRAVAILLENT dans ce club — `users.club_id`, et non les
        // réglages du club : ceux-ci ne listent que les deux propriétaires, ce
        // qui exclurait Romane, précisément la personne qu'on veut choisir.
        const { data } = await sb
          .from("users")
          .select("id, name")
          .eq("club_id", p.monClub)
          .order("name");
        setCoachs(
          (data ?? []).map((u: Record<string, unknown>) => ({
            id: String(u.id),
            nom: String(u.name ?? "—"),
          })),
        );
      } catch {
        // silent-fail : le sélecteur reste vide, rien ne casse.
      }
    })();
  }, [ouvert, userId, coachs.length]);

  const rattacher = useCallback(
    async (nouveauCoach: string) => {
      if (!nouveauCoach || nouveauCoach === membre.ownerId) return;
      setEnCours(true);
      setMessage(null);
      try {
        const sb = await getSupabaseClient();
        if (!sb) throw new Error("Service indisponible.");
        const { data, error } = await sb.rpc("bbc_rattacher_membre", {
          p_client_id: membre.id,
          p_nouveau_coach: nouveauCoach,
        });
        if (error) throw new Error(error.message);
        const ligne = Array.isArray(data) ? data[0] : data;
        const nom = (ligne as { coach_nom?: string } | null)?.coach_nom ?? "ce coach";
        const coeurs = Number((ligne as { coeurs_deplaces?: number } | null)?.coeurs_deplaces ?? 0);
        setMessage(
          `${membre.name.split(" ")[0]} est maintenant suivie par ${nom}` +
            (coeurs > 0 ? ` · ${coeurs} cœur${coeurs > 1 ? "s" : ""} déplacé${coeurs > 1 ? "s" : ""}` : ""),
        );
        setOuvert(false);
        onFait();
      } catch (err) {
        // On montre le message de la base tel quel : il est écrit pour être lu
        // (« Ce coach ne travaille pas dans le club de cette fiche. »).
        setMessage(err instanceof Error ? err.message : "Le rattachement a échoué.");
      } finally {
        setEnCours(false);
      }
    },
    [membre.id, membre.name, membre.ownerId, onFait],
  );

  if (!ouvert) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button
          type="button"
          onClick={() => setOuvert(true)}
          style={{
            padding: "10px 16px",
            minHeight: 44,
            borderRadius: 12,
            background: "var(--ls-bbc-s2)",
            border: "1px solid var(--ls-bbc-line)",
            color: "var(--ls-bbc-text)",
            fontWeight: 600,
            fontSize: 12.5,
            cursor: "pointer",
          }}
        >
          👤 Suivi par {membre.ownerName?.split(" ")[0] ?? "—"}
        </button>
        {message ? (
          <span style={{ fontSize: 11.5, color: "var(--ls-bbc-teal)" }}>{message}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 12,
        borderRadius: 12,
        background: "var(--ls-bbc-s2)",
        border: "1px solid var(--ls-bbc-line)",
        minWidth: 220,
      }}
    >
      <label
        htmlFor={`rattacher-${membre.id}`}
        style={{ fontSize: 11.5, color: "var(--ls-bbc-muted)" }}
      >
        Qui suit {membre.name.split(" ")[0]} ?
      </label>
      <select
        id={`rattacher-${membre.id}`}
        defaultValue={membre.ownerId ?? ""}
        disabled={enCours}
        onChange={(e) => void rattacher(e.target.value)}
        style={{
          minHeight: 44,
          borderRadius: 10,
          border: "1px solid var(--ls-bbc-line)",
          background: "var(--ls-bbc-s1)",
          color: "var(--ls-bbc-text)",
          fontSize: 13,
          padding: "0 10px",
        }}
      >
        {coachs.length === 0 ? <option value="">Chargement…</option> : null}
        {coachs.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nom}
          </option>
        ))}
      </select>
      <span style={{ fontSize: 11, color: "var(--ls-bbc-muted)", lineHeight: 1.45 }}>
        Sa fiche et ses cœurs changent de main. Les visites déjà pointées ne
        bougent pas.
      </span>
      {message ? (
        <span style={{ fontSize: 11.5, color: "var(--ls-bbc-coral)" }}>{message}</span>
      ) : null}
      <button
        type="button"
        onClick={() => setOuvert(false)}
        style={{
          minHeight: 44,
          borderRadius: 10,
          background: "transparent",
          border: "1px solid var(--ls-bbc-line)",
          color: "var(--ls-bbc-muted)",
          fontSize: 12.5,
          cursor: "pointer",
        }}
      >
        Annuler
      </button>
    </div>
  );
}
