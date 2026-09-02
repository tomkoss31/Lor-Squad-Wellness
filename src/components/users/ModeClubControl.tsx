// =============================================================================
// « Mode club » — passer un coach en BBC, le rattacher, poser sa marche.
//
// ── POURQUOI CE BLOC EXISTE MAINTENANT ──────────────────────────────────────
// Le 19/08, j'avais proposé un interrupteur de mode club dans /users. Thomas
// avait dit non, et il avait raison : « personne n'est coach junior donc ». La
// condition posée ce jour-là était explicite — le reproposer quand une
// TROISIÈME personne rejoint le club. C'est arrivé le 02/09 avec Romane.
//
// Jusqu'ici, RIEN dans l'app n'écrivait `club_model` ailleurs qu'à la création
// d'un club, et RIEN n'appelait `set_bbc_role_override` : la RPC existait sans
// appelant. Les deux gestes se faisaient donc en SQL, c'est-à-dire par moi.
//
// ── LES TROIS RÉGLAGES NE SONT PAS INDÉPENDANTS ─────────────────────────────
// Un coach passé en BBC sans club rattaché ouvre une coquille qui affiche
// « Mon club · Verdun · 7h-11h » — les valeurs par défaut du CODE, pas celles
// du club — et une semaine vide. C'est pour ça que le club est choisi DANS le
// même geste, et pré-rempli quand il n'y a qu'un club actif : le trou se
// creusait précisément là où personne ne pensait à regarder.
//
// ── LA MARCHE : LE SENS EST INVERSE DE CE QU'ON CROIT ───────────────────────
// « Promouvoir stagiaire » sonne comme une ouverture. C'est un VERROU.
// `useBbcRole` ouvre tout quand la marche est inconnue (`fullAccess` inclut
// `role === null` — « un module lu trop tôt ne casse rien ; un module fermé à
// tort humilie »). Poser une marche fait donc TOMBER ce privilège :
//     — vide        → 10 modules sur 10
//     — Membre      → 0 sur 10   (aucun module n'est en `minRole: membre`)
//     — Stagiaire   → 7 sur 10
//     — Junior      → 10 sur 10
// Le compte est affiché à côté de chaque choix, sinon on pose « Membre » en
// croyant bien faire et on ferme toute la Formation.
//
// ── ÉCRITURES ──────────────────────────────────────────────────────────────
// `set_club_model` (admin ou soi-même) · `set_bbc_role_override` (admin ou
// propriétaire du club sur son aval) · `users.club_id` via la policy
// `users update admin`. Le `.select()` sur l'UPDATE n'est pas décoratif : sans
// lui, un refus RLS ne rend NI erreur NI ligne, et l'écran afficherait
// « enregistré » sur une écriture qui n'a pas eu lieu.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import type { User } from "../../types/domain";
import { BBC_ROLE_ORDER, type BbcRole } from "../../features/bbc/useBbcRole";

type Mode = "classic" | "bbc";
interface ClubRow { id: string; name: string }

/** Combien de modules de Formation cette marche laisse ouverts, sur 10. */
const MODULES_OUVERTS: Record<BbcRole, number> = {
  membre: 0,
  stagiaire: 7,
  junior: 10,
  proprietaire: 10,
  rollout: 10,
};

const LIBELLE: Record<BbcRole, string> = {
  membre: "Membre",
  stagiaire: "Coach stagiaire",
  junior: "Junior partner",
  proprietaire: "Propriétaire",
  rollout: "Roll out",
};

const eyebrow: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: "2px",
  textTransform: "uppercase",
  color: "var(--ls-text-muted)",
  fontWeight: 500,
  marginBottom: 6,
  fontFamily: "DM Sans, sans-serif",
};

const champ: React.CSSProperties = {
  width: "100%",
  maxWidth: 320,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface)",
  color: "var(--ls-text)",
  fontSize: 13,
  fontFamily: "DM Sans, sans-serif",
};

export function ModeClubControl({ user }: { user: User }) {
  const [mode, setMode] = useState<Mode>("classic");
  const [clubId, setClubId] = useState<string>("");
  const [marche, setMarche] = useState<BbcRole | "">("");
  const [clubs, setClubs] = useState<ClubRow[]>([]);
  const [pret, setPret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [retour, setRetour] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const dire = useCallback((type: "ok" | "err", msg: string) => {
    setRetour({ type, msg });
    if (type === "ok") setTimeout(() => setRetour(null), 3000);
  }, []);

  // Le type `User` ne porte aucun champ club : on lit l'état réel plutôt que
  // de deviner. Une seule ligne, au dépliage d'un membre à la fois.
  useEffect(() => {
    let mort = false;
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const [{ data: u }, { data: cs }] = await Promise.all([
          sb.from("users").select("club_model, club_id, bbc_role_override").eq("id", user.id).maybeSingle(),
          sb.from("clubs").select("id, name").eq("active", true).order("created_at"),
        ]);
        if (mort) return;
        const row = (u ?? {}) as { club_model?: string; club_id?: string | null; bbc_role_override?: string | null };
        setMode(row.club_model === "bbc" ? "bbc" : "classic");
        setClubId(row.club_id ?? "");
        setMarche((BBC_ROLE_ORDER as string[]).includes(String(row.bbc_role_override)) ? (row.bbc_role_override as BbcRole) : "");
        setClubs(Array.isArray(cs) ? (cs as ClubRow[]).map((c) => ({ id: String(c.id), name: String(c.name) })) : []);
      } catch {
        /* silent-fail : le bloc reste sur ses valeurs par défaut, rien ne casse */
      } finally {
        if (!mort) setPret(true);
      }
    })();
    return () => { mort = true; };
  }, [user.id]);

  async function changerMode(suivant: Mode) {
    if (suivant === mode || saving) return;
    setSaving(true);
    setRetour(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible");

      // Passer en BBC sans club = la coquille aux horaires inventés. Avec un
      // seul club actif il n'y a rien à demander : on rattache dans la foulée.
      let clubVise = clubId;
      if (suivant === "bbc" && !clubVise && clubs.length === 1) clubVise = clubs[0].id;
      if (suivant === "bbc" && !clubVise) {
        throw new Error("Choisis d'abord le club de rattachement.");
      }

      const { error } = await sb.rpc("set_club_model", { p_user_id: user.id, p_model: suivant });
      if (error) throw new Error(error.message);

      if (suivant === "bbc" && clubVise !== clubId) {
        const ok = await ecrireClub(sb, clubVise);
        if (!ok) throw new Error("Mode changé, mais le rattachement au club a échoué.");
        setClubId(clubVise);
      }
      setMode(suivant);
      dire("ok", suivant === "bbc" ? "Passée en mode club (BBC)" : "Retour à l'app classique");
    } catch (e) {
      dire("err", e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  /** `.select()` obligatoire : un refus RLS ne lève pas d'erreur, il rend 0 ligne. */
  async function ecrireClub(sb: NonNullable<Awaited<ReturnType<typeof getSupabaseClient>>>, id: string) {
    const { data, error } = await sb
      .from("users")
      .update({ club_id: id || null })
      .eq("id", user.id)
      .select("id");
    if (error) return false;
    return Array.isArray(data) && data.length > 0;
  }

  async function changerClub(id: string) {
    if (saving) return;
    setSaving(true);
    setRetour(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible");
      const ok = await ecrireClub(sb, id);
      if (!ok) throw new Error("Rattachement refusé.");
      setClubId(id);
      dire("ok", id ? "Rattachée au club" : "Détachée du club");
    } catch (e) {
      dire("err", e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function changerMarche(v: BbcRole | "") {
    if (saving) return;
    setSaving(true);
    setRetour(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible");
      const { error } = await sb.rpc("set_bbc_role_override", { p_user_id: user.id, p_role: v || null });
      if (error) throw new Error(error.message);
      setMarche(v);
      dire("ok", v ? `${LIBELLE[v]} · ${MODULES_OUVERTS[v]} modules sur 10` : "Marche retirée · tout ouvert");
    } catch (e) {
      dire("err", e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  if (!pret) {
    return <div style={{ fontSize: 12, color: "var(--ls-text-muted)", fontFamily: "DM Sans, sans-serif" }}>chargement…</div>;
  }

  const clubConnu = clubs.find((c) => c.id === clubId)?.name;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div role="group" aria-label="Mode club" style={{ display: "inline-flex", padding: 3, gap: 3, borderRadius: 999, background: "var(--ls-surface)", border: "1px solid var(--ls-border)", alignSelf: "flex-start" }}>
        {([["classic", "Classique"], ["bbc", "Club BBC"]] as Array<[Mode, string]>).map(([v, label]) => {
          const actif = mode === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => void changerMode(v)}
              disabled={saving}
              aria-pressed={actif}
              style={{
                padding: "6px 14px",
                border: "none",
                borderRadius: 999,
                background: actif ? "var(--ls-teal)" : "transparent",
                color: actif ? "#fff" : "var(--ls-text-muted)",
                fontSize: 12,
                fontWeight: actif ? 700 : 500,
                cursor: saving ? "wait" : "pointer",
                fontFamily: "DM Sans, sans-serif",
                transition: "background 0.18s, color 0.18s",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {mode === "bbc" ? (
        <>
          <div>
            <div style={eyebrow}>Club de rattachement</div>
            <select style={champ} value={clubId} disabled={saving} onChange={(e) => void changerClub(e.target.value)} aria-label="Club de rattachement">
              <option value="">— aucun (horaires par défaut) —</option>
              {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {!clubId ? (
              <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "var(--ls-coral, #F2775F)", fontFamily: "DM Sans, sans-serif" }}>
                Sans club, son app affiche des horaires inventés et une semaine vide.
              </p>
            ) : null}
          </div>

          <div>
            <div style={eyebrow}>Marche BBC · ce qu'elle OUVRE</div>
            <select style={champ} value={marche} disabled={saving} onChange={(e) => void changerMarche(e.target.value as BbcRole | "")} aria-label="Marche BBC">
              <option value="">— non posée · les 10 modules ouverts —</option>
              {BBC_ROLE_ORDER.map((r) => (
                <option key={r} value={r}>{LIBELLE[r]} · {MODULES_OUVERTS[r]} modules sur 10</option>
              ))}
            </select>
            <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "var(--ls-text-muted)", lineHeight: 1.5, fontFamily: "DM Sans, sans-serif" }}>
              Poser une marche <b>ferme</b> des modules — tant qu'elle est vide, la Formation est
              entièrement ouverte. « Membre » ne laisse rien passer.
            </p>
          </div>

          <p style={{ margin: 0, fontSize: 11.5, color: "var(--ls-text-muted)", lineHeight: 1.5, fontFamily: "DM Sans, sans-serif" }}>
            En mode club, {user.name?.split(" ")[0] || "cette personne"} n'a plus l'interface
            classique et <b>ne peut pas revenir seule</b> — la bascule est réservée aux admins.
            {clubConnu ? ` Elle travaille à ${clubConnu}.` : ""}
          </p>
        </>
      ) : null}

      {retour ? (
        <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "DM Sans, sans-serif", color: retour.type === "ok" ? "var(--ls-teal)" : "#EF4444" }}>
          {retour.msg}
        </span>
      ) : null}
    </div>
  );
}
