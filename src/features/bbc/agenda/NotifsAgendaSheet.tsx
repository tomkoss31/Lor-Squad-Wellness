// =============================================================================
// « Me prévenir » — les notifications de l'agenda, au choix de chaque coach
// (22/09/2026, Thomas : « le choix si on veut recevoir la notif… le client lead,
// lui, reçoit, mais le choix est au coach »). Trois réponses, rangées dans
// `users.notif_agenda` ; la base décide qui prévenir (`agenda_a_prevenir`, et la
// réservation du site dans `book-club-discovery`). Le défaut, « Mes rendez-vous »,
// est exactement ce qui se passait avant : on propose, on n'impose rien.
// =============================================================================

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../../services/supabaseClient";
import { Feuille } from "../ui";

export type ChoixNotifAgenda = "miens" | "club" | "aucun";

const CHOIX: { cle: ChoixNotifAgenda; titre: string; sous: string }[] = [
  {
    cle: "miens",
    titre: "Mes rendez-vous",
    sous: "Quand une autre coach cale, déplace ou note un « pas dispo » dans ton agenda. Les admins reçoivent aussi les réservations du site.",
  },
  { cle: "club", titre: "Tout le club", sous: "Chaque rendez-vous calé dans le club, par n'importe qui, et chaque réservation du site." },
  { cle: "aucun", titre: "Aucune", sous: "Pas de notification de l'agenda : tu vois tout en l'ouvrant." },
];

export function NotifsAgendaSheet({ userId, onClose }: { userId?: string | null; onClose: () => void }) {
  const [choix, setChoix] = useState<ChoixNotifAgenda | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let fini = false;
    (async () => {
      if (!userId) return;
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { data } = await sb.from("users").select("notif_agenda").eq("id", userId).maybeSingle<{ notif_agenda: ChoixNotifAgenda | null }>();
      if (!fini) setChoix(data?.notif_agenda ?? "miens");
    })();
    return () => { fini = true; };
  }, [userId]);

  async function choisir(c: ChoixNotifAgenda) {
    if (!userId || envoi || c === choix) return;
    const avant = choix;
    setChoix(c); // tout de suite à l'écran, la base suit
    setEnvoi(true);
    setMessage(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("hors ligne");
      const { error } = await sb.from("users").update({ notif_agenda: c }).eq("id", userId);
      if (error) throw error;
      setMessage("Enregistré ✓");
    } catch {
      setChoix(avant);
      setMessage("Pas enregistré. Réessaie dans un instant.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Feuille titre="Me prévenir" sous="Les notifications de l'agenda, à ton choix." onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {CHOIX.map((c) => {
          const on = choix === c.cle;
          return (
            <button
              key={c.cle}
              type="button"
              className="bbc-pression"
              onClick={() => void choisir(c.cle)}
              disabled={choix === null}
              aria-pressed={on}
              style={{
                display: "flex", alignItems: "flex-start", gap: 12, width: "100%", minHeight: 64, padding: "12px 14px", borderRadius: 14,
                textAlign: "left", cursor: "pointer", fontFamily: "var(--ls-bbc-font-body)", color: "var(--ls-bbc-text)",
                border: `1.5px solid ${on ? "var(--ls-bbc-orange)" : "var(--ls-bbc-line2)"}`,
                background: on ? "color-mix(in srgb, var(--ls-bbc-orange) 12%, var(--ls-bbc-s2))" : "var(--ls-bbc-s2)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 20, height: 20, borderRadius: 999, flex: "none", marginTop: 1,
                  border: `2px solid ${on ? "var(--ls-bbc-orange)" : "var(--ls-bbc-line2)"}`,
                  background: on ? "radial-gradient(circle, var(--ls-bbc-orange) 45%, transparent 50%)" : "transparent",
                }}
              />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{c.titre}</span>
                <span style={{ display: "block", fontSize: 12.5, color: "var(--ls-bbc-muted)", marginTop: 3, lineHeight: 1.45 }}>{c.sous}</span>
              </span>
            </button>
          );
        })}
      </div>
      {message ? (
        <div role="status" style={{ fontSize: 12.5, fontWeight: 600, color: message.startsWith("Pas") ? "var(--ls-bbc-coral)" : "var(--ls-bbc-orange-text)", marginTop: 10 }}>
          {message}
        </div>
      ) : null}
      <div style={{ fontSize: 12, color: "var(--ls-bbc-hint)", lineHeight: 1.5, marginTop: 10 }}>
        La personne qui a rendez-vous reçoit toujours sa confirmation et ses rappels : ce réglage ne change que tes notifications à toi.
      </div>
    </Feuille>
  );
}
