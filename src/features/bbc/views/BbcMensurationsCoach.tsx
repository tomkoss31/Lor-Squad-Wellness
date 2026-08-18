// =============================================================================
// BbcMensurationsCoach — les mensurations du membre, sur la fiche du coach.
//
// LE TROU (Thomas, 18/08, capture à l'appui) : « je ne vois nulle part les
// mensurations, ni où les appliquer manuellement, c'est un trou dans le code ».
//
// Il avait raison, et l'audit du matin l'avait chiffré : PERSONNE ne pouvait
// renseigner un membre BBC. Ni elle — l'écran membre était en lecture seule,
// corrigé plus tôt aujourd'hui — ni lui, parce que la fiche du club n'a jamais
// eu de bloc mensurations. Une membre entrait au club et ses centimètres se
// figeaient.
//
// ── POURQUOI CE FICHIER PLUTÔT QU'UN SECOND ÉCRAN ──────────────────────────
// Toute l'interface (silhouette à dix points, pas de 0,5 cm, guides « comment
// mesurer » et « à éviter ») vit déjà dans `MemberMensurations`. On la réemploie
// telle quelle et on ne change que deux choses : le titre, et QUI ÉCRIT.
//
// ⚠️ LE COACH N'ÉCRIT PAS PAR LE MÊME CHEMIN QUE LA MEMBRE. Elle est en rôle
// `anon` et passe forcément par l'edge à jeton, qui estampille la ligne
// `measured_by_type = 'client'`. Lui est authentifié : il écrit en direct, et
// la ligne porte `'coach'` + son identifiant. Sans cette distinction, toutes
// les mesures prises au comptoir seraient attribuées au membre.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import type { MeasurementKey } from "../../../data/measurementGuides";
import { getSupabaseClient } from "../../../services/supabaseClient";
import { MemberMensurations } from "../member/MemberMensurations";
import type { Measurement } from "../member/MemberEvolution";

interface Props {
  clientId: string;
  prenom: string;
}

/** Les dix colonnes, telles qu'elles sont en base. */
const COLONNES = [
  "neck", "chest", "waist", "hips",
  "thigh_left", "thigh_right", "arm_left", "arm_right",
  "calf_left", "calf_right",
] as const;

type LigneBrute = { measured_at: string; measured_by_type?: string | null } & Partial<
  Record<(typeof COLONNES)[number], number | null>
>;

export function BbcMensurationsCoach({ clientId, prenom }: Props) {
  const [sessions, setSessions] = useState<Measurement[] | null>(null);
  const [rechargement, setRechargement] = useState(0);

  useEffect(() => {
    let vivant = true;
    (async () => {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { data, error } = await sb
        .from("client_measurements")
        .select(
          "measured_at, measured_by_type, neck, chest, waist, hips, thigh_left, thigh_right, arm_left, arm_right, calf_left, calf_right",
        )
        .eq("client_id", clientId)
        .order("measured_at", { ascending: true })
        .limit(200);
      // Un échec réseau n'efface JAMAIS ce qui est déjà affiché : on garde
      // l'état précédent plutôt que de faire disparaître ses centimètres.
      if (!vivant || error || !Array.isArray(data)) return;
      const lignes = data as unknown as LigneBrute[];
      const nombre = (v: unknown): number | undefined =>
        typeof v === "number" && Number.isFinite(v) ? v : undefined;
      setSessions(
        lignes.map((l) => {
          const cm: Partial<Record<MeasurementKey, number>> = {};
          for (const c of COLONNES) {
            const v = nombre(l[c]);
            if (v != null) cm[c as MeasurementKey] = v;
          }
          return {
            measured_at: l.measured_at,
            by: l.measured_by_type === "coach" ? "coach" : "client",
            cm,
          } as Measurement;
        }),
      );
    })();
    return () => { vivant = false; };
  }, [clientId, rechargement]);

  const ecrire = useCallback(
    async (measures: Partial<Record<MeasurementKey, number>>) => {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("hors ligne");
      const { data: session } = await sb.auth.getUser();
      const { error } = await sb.from("client_measurements").insert({
        client_id: clientId,
        measured_by_type: "coach",
        measured_by_user_id: session?.user?.id ?? null,
        ...measures,
      });
      if (error) throw error;
      // On relit : la ligne qu'on vient d'écrire devient le nouveau « dernier
      // relevé », et les écarts se recalculent depuis le serveur plutôt que
      // depuis ce qu'on croit avoir envoyé.
      setRechargement((n) => n + 1);
    },
    [clientId],
  );

  if (sessions === null) {
    return (
      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 18, padding: 18 }}>
        <div style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)" }}>chargement de ses mensurations…</div>
      </div>
    );
  }

  return (
    <MemberMensurations
      // Le jeton ne sert pas ici : le coach écrit par `ecrire`. On le passe
      // vide plutôt que d'aller chercher celui du membre pour rien.
      token=""
      measurements={sessions}
      titre={`les mensurations de ${prenom.trim().split(/\s+/)[0] || "ce membre"}`}
      ecrire={ecrire}
    />
  );
}
