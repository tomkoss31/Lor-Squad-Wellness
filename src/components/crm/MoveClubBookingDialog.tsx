// =============================================================================
// MoveClubBookingDialog — déplacer un RDV découverte depuis l'app.
//
// Demandé par Mélanie (2026-08-09) : le coach ne pouvait que confirmer ou
// annuler. Pour changer une heure il fallait annuler puis rappeler, alors que
// le conflit apparaît souvent APRÈS la réservation (quelqu'un réserve mardi 9h,
// deux jours plus tard on pose un suivi à 9h).
//
// LA CASE « prévenir la personne » est le cœur de la demande. Cochée par
// défaut — déplacer quelqu'un sans le lui dire, c'est le faire venir à la
// mauvaise heure. Mais décochable : si Mélanie vient de l'avoir au téléphone,
// un mail de plus n'apporte rien. UN SEUL mail par déplacement, jamais de pluie.
//
// Les créneaux proposés viennent de la MÊME RPC que le site public : on ne peut
// pas déplacer vers un créneau complet ou vers un moment où le coach est occupé.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import type { ClubDiscoveryBooking } from "../../hooks/useClubDiscoveryBookings";

interface Slot {
  iso: string;
  remaining: number;
}

const DAY_FMT = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris",
});
const HOUR_FMT = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
});
const dayKey = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(iso));

export function MoveClubBookingDialog({
  booking,
  clubSlug,
  onClose,
  onMoved,
}: {
  booking: ClubDiscoveryBooking;
  clubSlug: string;
  onClose: () => void;
  /** Appelé après un déplacement réussi — le parent recharge sa liste. */
  onMoved: () => void;
}) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<string | null>(null);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const sb = await getSupabaseClient();
    if (!sb) { setSlots([]); setLoading(false); return; }
    const { data } = await sb.rpc("get_club_discovery_availability", {
      p_slug: clubSlug, p_days: 30,
    });
    const rows = (data ?? []) as Array<{ slot_start: string; remaining: number }>;
    setSlots(
      rows
        // Le créneau actuel n'a pas à être proposé comme destination.
        .filter((r) => r.slot_start !== booking.slot_start)
        .map((r) => ({ iso: r.slot_start, remaining: r.remaining })),
    );
    setLoading(false);
  }, [clubSlug, booking.slot_start]);

  useEffect(() => { void load(); }, [load]);

  const byDay = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of slots) {
      const k = dayKey(s.iso);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [slots]);

  async function confirmMove() {
    if (!picked || busy) return;
    setBusy(true);
    setError(null);
    const sb = await getSupabaseClient();
    if (!sb) { setError("Connexion impossible."); setBusy(false); return; }

    const previousStart = booking.slot_start;
    // Durée conservée : on décale, on ne raccourcit pas.
    const durMs = new Date(booking.slot_end).getTime() - new Date(booking.slot_start).getTime();
    const end = new Date(new Date(picked).getTime() + durMs).toISOString();

    const { data, error: rpcErr } = await sb.rpc("coach_reschedule_club_booking", {
      p_booking_id: booking.id,
      p_slot_start: picked,
      p_slot_end: end,
    });
    if (rpcErr) { setError("Le déplacement a échoué. Réessaie."); setBusy(false); return; }
    const res = String(data ?? "");
    if (res !== "ok") {
      setError(
        res === "full" ? "Ce créneau vient d'être pris. Choisis-en un autre."
          : res === "past" ? "Ce créneau est déjà passé."
          : res === "forbidden" ? "Tu n'as pas les droits pour déplacer ce rendez-vous."
          : "Rendez-vous introuvable — il a peut-être été annulé.",
      );
      setBusy(false);
      await load();
      return;
    }

    // Le déplacement est FAIT. Le mail n'est qu'une information : s'il échoue,
    // on ne revient pas en arrière, on le dit simplement.
    let mailInfo = "Personne n'a été prévenu.";
    if (notify) {
      try {
        const { data: n } = await sb.functions.invoke("notify-club-booking-moved", {
          body: { bookingId: booking.id, previousStart },
        });
        const sent = (n as { sent?: boolean; reason?: string } | null);
        mailInfo = sent?.sent
          ? "Un email vient de partir."
          : sent?.reason === "pas_d_email"
            ? "Aucun email : cette personne n'a laissé qu'un téléphone — pense à l'appeler."
            : "L'email n'est pas parti — préviens la personne toi-même.";
      } catch {
        mailInfo = "L'email n'est pas parti — préviens la personne toi-même.";
      }
    }
    setDone(mailInfo);
    setBusy(false);
    onMoved();
  }

  const prenom = (booking.first_name ?? "").trim() || "ce prospect";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1300, background: "rgba(0,0,0,.55)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Déplacer le rendez-vous de ${prenom}`}
        style={{
          width: "100%", maxWidth: 460, maxHeight: "84vh", overflowY: "auto",
          background: "var(--ls-surface)", border: "1px solid var(--ls-border)",
          borderRadius: 18, padding: "20px 20px 24px", color: "var(--ls-text)",
        }}
      >
        <div style={{ fontFamily: "Syne, sans-serif", fontSize: 19, fontWeight: 700 }}>
          Déplacer le RDV de {prenom}
        </div>
        <div style={{ fontSize: 13, color: "var(--ls-text-muted)", marginTop: 4 }}>
          Actuellement {DAY_FMT.format(new Date(booking.slot_start))} · {HOUR_FMT.format(new Date(booking.slot_start))}
        </div>

        {done ? (
          <>
            <div
              role="status"
              style={{
                marginTop: 18, padding: "14px 16px", borderRadius: 12,
                background: "color-mix(in srgb, var(--ls-teal) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--ls-teal) 35%, transparent)",
                fontSize: 14, lineHeight: 1.5,
              }}
            >
              Rendez-vous déplacé. {done}
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: "100%", minHeight: 46, marginTop: 14, borderRadius: 12, border: 0,
                background: "var(--ls-teal)", color: "var(--ls-bg)", fontWeight: 700,
                fontSize: 15, cursor: "pointer",
              }}
            >
              Fermer
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, color: "var(--ls-text-hint)", margin: "16px 0 8px" }}>
              Choisis le nouveau créneau
            </div>

            {loading ? (
              <div style={{ fontSize: 13.5, color: "var(--ls-text-muted)", padding: "12px 0" }}>
                Chargement des créneaux…
              </div>
            ) : byDay.length === 0 ? (
              <div style={{ fontSize: 13.5, color: "var(--ls-text-muted)", padding: "12px 0" }}>
                Aucun autre créneau libre dans les 30 prochains jours.
              </div>
            ) : (
              byDay.map(([k, list]) => (
                <div key={k} style={{ marginBottom: 12 }}>
                  <div style={{
                    fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".08em",
                    color: "var(--ls-text-hint)", marginBottom: 6,
                  }}>
                    {DAY_FMT.format(new Date(list[0].iso))}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {list.map((s) => {
                      const on = picked === s.iso;
                      return (
                        <button
                          key={s.iso}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setPicked(s.iso)}
                          style={{
                            padding: "9px 13px", borderRadius: 10, cursor: "pointer",
                            fontSize: 13.5, fontWeight: 600,
                            border: `1px solid ${on ? "var(--ls-teal)" : "var(--ls-border)"}`,
                            background: on
                              ? "color-mix(in srgb, var(--ls-teal) 14%, transparent)"
                              : "var(--ls-surface2)",
                            color: "var(--ls-text)",
                          }}
                        >
                          {HOUR_FMT.format(new Date(s.iso))}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            <label style={{
              display: "flex", alignItems: "flex-start", gap: 10, marginTop: 16,
              padding: "12px 14px", borderRadius: 12, background: "var(--ls-surface2)",
              border: "1px solid var(--ls-border)", cursor: "pointer",
            }}>
              <input
                type="checkbox"
                checked={notify}
                onChange={(e) => setNotify(e.target.checked)}
                style={{ marginTop: 2, width: 17, height: 17, flex: "none", cursor: "pointer" }}
              />
              <span style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                Prévenir la personne par email
                <span style={{ display: "block", fontSize: 12.5, color: "var(--ls-text-muted)", marginTop: 2 }}>
                  Un seul email, avec son lien pour rechoisir une heure. Décoche si tu viens de l'avoir au téléphone.
                </span>
              </span>
            </label>

            {error ? (
              <div
                role="alert"
                style={{
                  marginTop: 12, padding: "10px 12px", borderRadius: 11, fontSize: 13,
                  color: "var(--ls-coral)",
                  background: "color-mix(in srgb, var(--ls-coral) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--ls-coral) 35%, transparent)",
                }}
              >
                {error}
              </div>
            ) : null}

            <button
              type="button"
              disabled={!picked || busy}
              onClick={() => void confirmMove()}
              style={{
                width: "100%", minHeight: 48, marginTop: 14, borderRadius: 12, border: 0,
                background: "var(--ls-teal)", color: "var(--ls-bg)",
                fontWeight: 700, fontSize: 15,
                cursor: picked && !busy ? "pointer" : "default",
                opacity: picked && !busy ? 1 : 0.5,
              }}
            >
              {busy ? "…" : "Déplacer le rendez-vous"}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: "100%", minHeight: 42, marginTop: 8, borderRadius: 11,
                border: "1px solid var(--ls-border)", background: "transparent",
                color: "var(--ls-text-muted)", fontSize: 13, cursor: "pointer",
              }}
            >
              Annuler
            </button>
          </>
        )}
      </div>
    </div>
  );
}
