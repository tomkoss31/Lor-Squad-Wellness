// =============================================================================
// GererRdvClubPage — « Modifier / annuler mon rendez-vous » (page publique).
// Chantier « RDV du club », brique 5 (2026-08-09).
//
// Cible du lien envoyé dans l'email de confirmation : /rdv/gerer/<manage_token>.
// Le prospect déplace ou annule tout seul ; l'équipe est prévenue par email et
// le créneau se libère immédiatement côté tunnel public.
//
// Tout passe par l'edge manage-club-booking (service_role) : aucune requête
// directe sur rdv_bookings, et la réponse ne contient ni email ni téléphone.
// Identité crème du club (page publique — pas les tokens de l'app coach).
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";
import { useClubHead } from "./club/useClubHead";

const PARIS = "Europe/Paris";

interface Booking {
  firstName: string;
  slotStart: string;
  status: string;
  peopleCount: number;
  partnerFirstName: string | null;
  location: string;
  isPast: boolean;
}
interface Slot {
  slotStart: string;
  remaining: number;
}

const INK = "#1C302B";
const CREAM = "#F7F1E6";
const CARD = "#FFFFFF";
const ORANGE = "#E0532A";
const SAGE = "#5F7154";
const MUTED = "#67746B";
const LINE = "rgba(28,48,43,.14)";

const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS, weekday: "long", day: "numeric", month: "long",
  }).format(new Date(iso));
const hourLabel = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: PARIS, hour: "2-digit", minute: "2-digit" })
    .format(new Date(iso));
const dayKey = (iso: string) =>
  new Intl.DateTimeFormat("fr-CA", { timeZone: PARIS, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(iso));

const shell: CSSProperties = {
  minHeight: "100vh",
  background: CREAM,
  color: INK,
  fontFamily: "'Poppins', system-ui, -apple-system, sans-serif",
  padding: "clamp(20px,5vw,56px) 18px 60px",
};
const card: CSSProperties = {
  background: CARD,
  border: `1px solid ${LINE}`,
  borderRadius: 18,
  padding: "20px 22px",
  boxShadow: "0 10px 30px rgba(28,48,43,.07)",
};
const btnBase: CSSProperties = {
  minHeight: 48,
  padding: "13px 20px",
  borderRadius: 999,
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  border: "none",
  fontFamily: "inherit",
};

export function GererRdvClubPage() {
  const { token = "" } = useParams();
  useClubHead("Mon rendez-vous · The Breakfast Club");

  const [booking, setBooking] = useState<Booking | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"view" | "pick" | "confirmCancel">("view");
  const [done, setDone] = useState<"canceled" | "moved" | null>(null);

  const call = useCallback(
    async (action: string, slotStart?: string) => {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { data, error: err } = await sb.functions.invoke("manage-club-booking", {
        body: { token, action, slotStart },
      });
      if (err) throw new Error("Connexion impossible.");
      return data as { success?: boolean; error?: string; booking?: Booking; slots?: Slot[] };
    },
    [token],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await call("status");
        if (!alive) return;
        if (!res?.success || !res.booking) {
          setError(
            res?.error === "lien_invalide"
              ? "Ce lien n'est plus valide. Appelle-nous au 06 79 44 87 59, on retrouve ton rendez-vous."
              : "Impossible de charger ton rendez-vous.",
          );
        } else {
          setBooking(res.booking);
          setSlots(res.slots ?? []);
        }
      } catch {
        if (alive) setError("Impossible de charger ton rendez-vous.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [call]);

  // Créneaux groupés par jour, pour un choix lisible.
  const slotsByDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const k = dayKey(s.slotStart);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return [...map.entries()].slice(0, 10);
  }, [slots]);

  async function doCancel() {
    setBusy(true);
    try {
      const res = await call("cancel");
      if (res?.success) {
        setDone("canceled");
        setBooking((b) => (b ? { ...b, status: "canceled" } : b));
      } else {
        setError("L'annulation n'a pas pu être enregistrée. Appelle-nous au 06 79 44 87 59.");
      }
    } catch {
      setError("L'annulation n'a pas pu être enregistrée.");
    } finally {
      setBusy(false);
      setMode("view");
    }
  }

  async function doMove(slotStart: string) {
    setBusy(true);
    try {
      const res = await call("reschedule", slotStart);
      if (res?.success && res.booking) {
        setBooking(res.booking);
        setDone("moved");
        setMode("view");
      } else if (res?.error === "creneau_pris") {
        setError("Ce créneau vient d'être pris. Choisis-en un autre.");
        const fresh = await call("status");
        setSlots(fresh?.slots ?? []);
      } else {
        setError("Le déplacement n'a pas pu être enregistré.");
      }
    } catch {
      setError("Le déplacement n'a pas pu être enregistré.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div style={shell}>
        <p style={{ maxWidth: 520, margin: "0 auto", color: MUTED }}>Chargement de ton rendez-vous…</p>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div style={shell}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div style={card}>
            <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Lien introuvable</h1>
            <p style={{ margin: 0, color: MUTED, lineHeight: 1.6 }}>{error}</p>
            <a href="tel:+33679448759" style={{ ...btnBase, display: "inline-flex", alignItems: "center", marginTop: 18, background: INK, color: CREAM, textDecoration: "none" }}>
              Appeler le club
            </a>
          </div>
        </div>
      </div>
    );
  }

  const canceled = booking?.status === "canceled";

  return (
    <div style={shell}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div style={{ fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase", color: ORANGE, fontWeight: 700 }}>
          ☕ The Breakfast Club · Verdun
        </div>
        <h1 style={{ fontSize: "clamp(26px,6vw,34px)", margin: "10px 0 18px", lineHeight: 1.15 }}>
          {canceled
            ? "Ton rendez-vous est annulé"
            : done === "moved"
              ? "C'est déplacé ✅"
              : `Ton rendez-vous, ${booking?.firstName ?? ""}`}
        </h1>

        {done === "canceled" ? (
          <div style={{ ...card, marginBottom: 16 }}>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              C'est noté, on a prévenu l'équipe et ta place est libérée. Tu peux réserver un autre matin
              quand tu veux.
            </p>
            <a href="/reserver" style={{ ...btnBase, display: "inline-flex", alignItems: "center", marginTop: 16, background: ORANGE, color: "#fff", textDecoration: "none" }}>
              Réserver un autre matin
            </a>
          </div>
        ) : (
          <div style={{ ...card, marginBottom: 16, opacity: canceled ? 0.6 : 1 }}>
            <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: MUTED, fontWeight: 700 }}>
              Quand
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: ORANGE, margin: "4px 0 14px" }}>
              {booking ? `${dayLabel(booking.slotStart)} · ${hourLabel(booking.slotStart)}` : ""}
            </div>
            <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: MUTED, fontWeight: 700 }}>
              Où
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{booking?.location}</div>
            {booking?.peopleCount === 2 ? (
              <div style={{ marginTop: 12, fontSize: 14, color: SAGE }}>
                👫 À deux{booking.partnerFirstName ? ` — avec ${booking.partnerFirstName}` : ""}
              </div>
            ) : null}
          </div>
        )}

        {error ? (
          <div style={{ ...card, marginBottom: 16, borderColor: ORANGE, color: INK }}>{error}</div>
        ) : null}

        {!canceled && booking && !booking.isPast ? (
          mode === "pick" ? (
            <div style={card}>
              <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>Choisis ton nouveau créneau</h2>
              <p style={{ margin: "0 0 14px", fontSize: 14, color: MUTED }}>
                Ton ancienne place se libère automatiquement.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, maxHeight: 380, overflowY: "auto" }}>
                {slotsByDay.map(([k, list]) => (
                  <div key={k}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: SAGE, marginBottom: 7 }}>
                      {dayLabel(list[0].slotStart)}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {list.map((s) => (
                        <button
                          key={s.slotStart}
                          type="button"
                          disabled={busy}
                          onClick={() => void doMove(s.slotStart)}
                          style={{
                            ...btnBase,
                            minHeight: 44,
                            padding: "10px 16px",
                            fontSize: 14,
                            background: "#fff",
                            color: INK,
                            border: `1.5px solid ${LINE}`,
                            opacity: busy ? 0.6 : 1,
                          }}
                        >
                          {hourLabel(s.slotStart)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {slotsByDay.length === 0 ? (
                  <p style={{ margin: 0, color: MUTED }}>
                    Aucun créneau libre pour le moment. Appelle-nous au 06 79 44 87 59.
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setMode("view")}
                style={{ ...btnBase, marginTop: 16, background: "transparent", color: MUTED, padding: "10px 0" }}
              >
                ← Revenir
              </button>
            </div>
          ) : mode === "confirmCancel" ? (
            <div style={card}>
              <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>Annuler ce rendez-vous ?</h2>
              <p style={{ margin: "0 0 16px", fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
                Ta place sera libérée pour quelqu'un d'autre. Tu pourras réserver un autre matin quand tu veux.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" disabled={busy} onClick={() => void doCancel()} style={{ ...btnBase, background: ORANGE, color: "#fff", opacity: busy ? 0.6 : 1 }}>
                  {busy ? "Annulation…" : "Oui, annuler"}
                </button>
                <button type="button" onClick={() => setMode("view")} style={{ ...btnBase, background: "transparent", color: INK, border: `1.5px solid ${LINE}` }}>
                  Non, je garde
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button type="button" onClick={() => setMode("pick")} style={{ ...btnBase, background: INK, color: CREAM }}>
                Déplacer mon rendez-vous
              </button>
              <button type="button" onClick={() => setMode("confirmCancel")} style={{ ...btnBase, background: "transparent", color: MUTED, border: `1.5px solid ${LINE}` }}>
                Annuler mon rendez-vous
              </button>
              <p style={{ fontSize: 13, color: MUTED, textAlign: "center", margin: "8px 0 0", lineHeight: 1.6 }}>
                Une question ? Appelle-nous au{" "}
                <a href="tel:+33679448759" style={{ color: INK, fontWeight: 700 }}>06 79 44 87 59</a>.
              </p>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

export default GererRdvClubPage;
