// =============================================================================
// RdvClubPage — « RDV du club » (chantier 2026-08-09, maquette validée Thomas).
//
// Les réservations « séance découverte » du tunnel public /reserver n'étaient
// visibles NULLE PART dans l'app : le coach recevait un push + un mail, puis
// plus rien. Cet écran les affiche enfin, et permet de fermer une journée aux
// réservations en un geste (le fameux « demain matin je fais du vélo »).
//
// Source : services/sb/club-bookings (RLS admin déjà en place, aucune migration).
// Les créneaux sont reconstruits à partir de clubs.settings.discovery — la MÊME
// config que lit la RPC get_club_discovery_availability côté public, donc ce que
// le coach voit ici est exactement ce que le prospect peut réserver.
//
// Tokens var(--ls-*) uniquement → suit le thème clair/sombre de l'app.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import {
  fetchClub,
  fetchClubBookings,
  setClubDayClosed,
  setClubBookingStatus,
  type ClubBooking,
  type ClubInfo,
} from "../services/sb/club-bookings";

const PARIS = "Europe/Paris";
const CLUB_SLUG = "verdun";
const DAYS_AHEAD = 14;

/** YYYY-MM-DD dans le fuseau de Paris (fr-CA donne directement ce format). */
function parisDayKey(date: Date): string {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: PARIS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** HH:MM dans le fuseau de Paris. */
function parisTime(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Jour ISO (1 = lundi … 7 = dimanche) tel que l'attend la config `hours`. */
function isoDow(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => Number(n));
  return (h || 0) * 60 + (m || 0);
}

function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface DaySlot {
  time: string;
  bookings: ClubBooking[];
  remaining: number;
}

/** Reconstruit les créneaux d'une journée à partir des plages configurées. */
function buildSlots(club: ClubInfo, day: Date, bookings: ClubBooking[]): DaySlot[] {
  const ranges = club.discovery.hours[String(isoDow(day))] ?? [];
  const step = club.discovery.slotStepMin;
  const times: string[] = [];

  for (const [start, end] of ranges) {
    for (let t = toMinutes(start); t <= toMinutes(end); t += step) {
      const label = fromMinutes(t);
      if (!times.includes(label)) times.push(label);
    }
  }
  times.sort();

  const byTime = new Map<string, ClubBooking[]>();
  for (const b of bookings) {
    const key = parisTime(new Date(b.slotStart));
    if (!byTime.has(key)) byTime.set(key, []);
    byTime.get(key)!.push(b);
  }

  return times.map((time) => {
    const slotBookings = byTime.get(time) ?? [];
    const taken = slotBookings.length;
    return { time, bookings: slotBookings, remaining: Math.max(0, club.discovery.capacity - taken) };
  });
}

const OBJECTIF_LABEL: Record<string, string> = {
  poids: "Perte de poids",
  muscle: "Prise de muscle",
  energie: "Retrouver de l'énergie",
};

export function RdvClubPage() {
  const { currentUser } = useAppContext();
  const { push } = useToast();

  const [club, setClub] = useState<ClubInfo | null>(null);
  const [bookings, setBookings] = useState<ClubBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState(() => parisDayKey(new Date()));
  const [openBooking, setOpenBooking] = useState<string | null>(null);
  const [savingDay, setSavingDay] = useState(false);

  // Les 14 prochains jours, pour la bande de sélection.
  const days = useMemo(() => {
    const out: { key: string; date: Date; dow: string; num: string }[] = [];
    const base = new Date();
    for (let i = 0; i < DAYS_AHEAD; i += 1) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      out.push({
        key: parisDayKey(d),
        date: d,
        dow: d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "").toUpperCase(),
        num: String(d.getDate()),
      });
    }
    return out;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const c = await fetchClub(CLUB_SLUG);
      if (!c) {
        setError("Aucun club trouvé pour ce compte.");
        setClub(null);
        return;
      }
      setClub(c);
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + DAYS_AHEAD, 23, 59, 59);
      setBookings(await fetchClubBookings(c.id, from.toISOString(), to.toISOString()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedDay = days.find((d) => d.key === selectedKey) ?? days[0];
  const isClosed = club ? club.discovery.holidays.includes(selectedKey) : false;

  const dayBookings = useMemo(
    () => bookings.filter((b) => parisDayKey(new Date(b.slotStart)) === selectedKey),
    [bookings, selectedKey],
  );

  const slots = useMemo(
    () => (club && selectedDay ? buildSlots(club, selectedDay.date, dayBookings) : []),
    [club, selectedDay, dayBookings],
  );

  const bookedCountByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookings) {
      const key = parisDayKey(new Date(b.slotStart));
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [bookings]);

  async function toggleDay() {
    if (!club || savingDay) return;
    setSavingDay(true);
    const nextClosed = !isClosed;
    try {
      const holidays = await setClubDayClosed(club.id, selectedKey, nextClosed);
      setClub({ ...club, discovery: { ...club.discovery, holidays } });
      push({
        tone: "success",
        title: nextClosed ? "Journée fermée" : "Journée rouverte",
        message: nextClosed
          ? "Plus aucun créneau proposé sur le site ce jour-là."
          : "Les créneaux sont de nouveau réservables.",
      });
    } catch (e) {
      push({
        tone: "error",
        title: "Mise à jour impossible",
        message: e instanceof Error ? e.message : "Réessaie.",
      });
    } finally {
      setSavingDay(false);
    }
  }

  async function confirmBooking(b: ClubBooking) {
    try {
      await setClubBookingStatus(b.id, "confirmed");
      setBookings((prev) => prev.map((x) => (x.id === b.id ? { ...x, status: "confirmed" } : x)));
      push({ tone: "success", title: `RDV de ${b.firstName} confirmé` });
    } catch (e) {
      push({
        tone: "error",
        title: "Confirmation impossible",
        message: e instanceof Error ? e.message : "Réessaie.",
      });
    }
  }

  async function cancelBooking(b: ClubBooking) {
    try {
      await setClubBookingStatus(b.id, "canceled");
      setBookings((prev) => prev.filter((x) => x.id !== b.id));
      push({
        tone: "success",
        title: `RDV de ${b.firstName} annulé`,
        message: "La place est rouverte à la réservation.",
      });
    } catch (e) {
      push({
        tone: "error",
        title: "Annulation impossible",
        message: e instanceof Error ? e.message : "Réessaie.",
      });
    }
  }

  const isAdmin = currentUser?.role === "admin";

  if (!isAdmin) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "4px 4px 90px" }}>
        <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: 26, color: "var(--ls-text)", margin: "6px 0 10px" }}>
          RDV du club
        </h1>
        <div style={cardStyle}>
          <p style={{ margin: 0, color: "var(--ls-text-muted)", fontSize: 15 }}>
            Les réservations du club sont gérées par les responsables du club.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "4px 4px 90px" }}>
      <header style={{ margin: "6px 0 16px" }}>
        <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: 26, color: "var(--ls-text)", margin: 0 }}>
          RDV du club
        </h1>
        <p style={{ margin: "6px 0 0", color: "var(--ls-text-muted)", fontSize: 14.5 }}>
          Les séances découverte réservées depuis le site public
          {club ? ` · ${club.name}` : ""}.
        </p>
      </header>

      {error ? (
        <div
          style={{
            ...cardStyle,
            borderColor: "var(--ls-coral)",
            marginBottom: 14,
            color: "var(--ls-text)",
          }}
        >
          {error}
        </div>
      ) : null}

      {/* Bande des jours */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 4,
          marginBottom: 14,
          scrollbarWidth: "none",
        }}
      >
        {days.map((d) => {
          const on = d.key === selectedKey;
          const closed = club?.discovery.holidays.includes(d.key) ?? false;
          const count = bookedCountByDay.get(d.key) ?? 0;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => {
                setSelectedKey(d.key);
                setOpenBooking(null);
              }}
              style={{
                flex: "none",
                width: 54,
                padding: "9px 0 7px",
                borderRadius: 13,
                cursor: "pointer",
                textAlign: "center",
                background: on ? "var(--ls-text)" : "var(--ls-surface)",
                border: `1px solid ${on ? "var(--ls-text)" : "var(--ls-border)"}`,
                color: on ? "var(--ls-bg)" : "var(--ls-text)",
                opacity: closed ? 0.55 : 1,
              }}
              aria-pressed={on}
            >
              <span style={{ display: "block", fontSize: 10.5, letterSpacing: ".06em", opacity: 0.75 }}>
                {d.dow}
              </span>
              <span
                style={{
                  display: "block",
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 800,
                  fontSize: 16,
                  marginTop: 2,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {d.num}
              </span>
              <span
                aria-hidden="true"
                style={{
                  display: "block",
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  margin: "4px auto 0",
                  background: closed
                    ? "var(--ls-text-hint)"
                    : count > 0
                      ? "var(--ls-coral)"
                      : "transparent",
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Disponibilité de la journée */}
      <div style={{ ...cardStyle, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 17, color: "var(--ls-text)" }}>
              {selectedDay
                ? selectedDay.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
                : ""}
            </div>
            <span
              style={{
                display: "inline-block",
                marginTop: 5,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".04em",
                textTransform: "uppercase",
                padding: "3px 9px",
                borderRadius: 999,
                background: isClosed ? "var(--ls-coral-bg)" : "var(--ls-sage-bg)",
                color: isClosed ? "var(--ls-coral)" : "var(--ls-sage)",
              }}
            >
              {isClosed ? "Fermé · aucun RDV" : `Ouvert · ${slots.length} créneaux`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void toggleDay()}
            disabled={savingDay || !club}
            aria-pressed={!isClosed}
            aria-label={isClosed ? "Rouvrir la journée aux réservations" : "Fermer la journée aux réservations"}
            style={{
              marginLeft: "auto",
              flex: "none",
              width: 54,
              height: 32,
              borderRadius: 999,
              border: "none",
              cursor: savingDay ? "wait" : "pointer",
              position: "relative",
              padding: 0,
              background: isClosed ? "var(--ls-text-hint)" : "var(--ls-sage)",
              transition: "background .18s",
              opacity: savingDay ? 0.6 : 1,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 3,
                left: 3,
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,.3)",
                transform: isClosed ? "translateX(22px)" : "none",
                transition: "transform .18s",
              }}
            />
          </button>
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 12.5, color: "var(--ls-text-muted)", lineHeight: 1.5 }}>
          {isClosed
            ? "Personne ne peut réserver ce jour-là. Les RDV déjà pris restent affichés — préviens-les si besoin."
            : "Tu n'es pas là ce jour-là ? Coupe la journée : plus aucun créneau proposé sur le site, sans toucher à ta configuration."}
        </p>
      </div>

      {/* Créneaux */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: ".13em",
          textTransform: "uppercase",
          color: "var(--ls-text-muted)",
          margin: "0 2px 8px",
        }}
      >
        Créneaux du jour
      </div>

      {loading ? (
        <div style={{ ...cardStyle, color: "var(--ls-text-muted)" }}>Chargement…</div>
      ) : slots.length === 0 ? (
        <div style={{ ...cardStyle, color: "var(--ls-text-muted)" }}>
          Le club n'ouvre pas ce jour-là (aucune plage horaire configurée).
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 9, opacity: isClosed ? 0.45 : 1 }}>
          {slots.map((slot) => {
            const hasBooking = slot.bookings.length > 0;
            return (
              <div
                key={slot.time}
                style={{
                  display: "flex",
                  background: "var(--ls-surface)",
                  border: "1px solid var(--ls-border)",
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    flex: "none",
                    width: 66,
                    padding: "13px 0",
                    textAlign: "center",
                    background: "var(--ls-surface2)",
                    borderRight: "1px solid var(--ls-border)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "Syne, sans-serif",
                      fontWeight: 800,
                      fontSize: 15,
                      color: "var(--ls-text)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {slot.time}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ls-text-hint)", marginTop: 1 }}>
                    {club?.discovery.durationMin ?? 45} min
                  </div>
                </div>
                <span
                  aria-hidden="true"
                  style={{
                    width: 4,
                    flex: "none",
                    background: hasBooking ? "var(--ls-coral)" : "var(--ls-sage)",
                  }}
                />
                <div style={{ flex: 1, minWidth: 0, padding: "10px 13px" }}>
                  {hasBooking ? (
                    slot.bookings.map((b) => {
                      const open = openBooking === b.id;
                      return (
                        <div key={b.id} style={{ padding: "3px 0" }}>
                          <button
                            type="button"
                            onClick={() => setOpenBooking(open ? null : b.id)}
                            aria-expanded={open}
                            style={{
                              width: "100%",
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                              textAlign: "left",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span style={{ minWidth: 0, flex: 1 }}>
                              <span
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 7,
                                  flexWrap: "wrap",
                                  fontWeight: 700,
                                  fontSize: 14.5,
                                  color: "var(--ls-text)",
                                }}
                              >
                                {b.firstName}
                                {b.partnerFirstName ? ` & ${b.partnerFirstName}` : ""}
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    letterSpacing: ".03em",
                                    textTransform: "uppercase",
                                    padding: "2px 7px",
                                    borderRadius: 7,
                                    background:
                                      b.status === "confirmed" ? "var(--ls-sage-bg)" : "var(--ls-coral-bg)",
                                    color: b.status === "confirmed" ? "var(--ls-sage)" : "var(--ls-coral)",
                                  }}
                                >
                                  {b.status === "confirmed" ? "Confirmé" : "À confirmer"}
                                </span>
                              </span>
                              <span
                                style={{
                                  display: "block",
                                  fontSize: 12.5,
                                  color: "var(--ls-text-muted)",
                                  marginTop: 2,
                                }}
                              >
                                {b.objectif ? `${OBJECTIF_LABEL[b.objectif] ?? b.objectif} · ` : ""}
                                {b.peopleCount === 2 ? "à deux" : "seul·e"} · {slot.remaining} place
                                {slot.remaining > 1 ? "s" : ""} restante{slot.remaining > 1 ? "s" : ""}
                              </span>
                            </span>
                            <span aria-hidden="true" style={{ color: "var(--ls-text-hint)", fontSize: 13 }}>
                              {open ? "▲" : "▼"}
                            </span>
                          </button>

                          {open ? (
                            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 9 }}>
                              {b.contact ? (
                                <div style={{ fontSize: 12.5, color: "var(--ls-text-muted)" }}>
                                  <a href={`mailto:${b.contact}`} style={{ color: "var(--ls-teal)", fontWeight: 600 }}>
                                    {b.contact}
                                  </a>
                                </div>
                              ) : (
                                <div style={{ fontSize: 12.5, color: "var(--ls-text-hint)" }}>
                                  Pas de contact renseigné.
                                </div>
                              )}
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {b.status !== "confirmed" ? (
                                  <button type="button" onClick={() => void confirmBooking(b)} style={btnPrimary}>
                                    Confirmer
                                  </button>
                                ) : null}
                                {b.contact ? (
                                  <a href={`mailto:${b.contact}`} style={btnGhost}>
                                    Contacter
                                  </a>
                                ) : null}
                                <button type="button" onClick={() => void cancelBooking(b)} style={btnGhost}>
                                  Annuler
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ flex: 1 }}>
                        <span style={{ display: "block", fontWeight: 700, fontSize: 14.5, color: "var(--ls-sage)" }}>
                          Libre
                        </span>
                        <span style={{ display: "block", fontSize: 12.5, color: "var(--ls-text-muted)", marginTop: 2 }}>
                          {slot.remaining} place{slot.remaining > 1 ? "s" : ""} ouverte
                          {slot.remaining > 1 ? "s" : ""}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Légende */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 14, padding: "0 2px" }}>
        {[
          { c: "var(--ls-sage)", l: "Libre" },
          { c: "var(--ls-coral)", l: "Réservé" },
          { c: "var(--ls-text-hint)", l: "Jour fermé" },
        ].map((x) => (
          <span key={x.l} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--ls-text-muted)" }}>
            <span aria-hidden="true" style={{ width: 11, height: 11, borderRadius: 4, background: x.c }} />
            {x.l}
          </span>
        ))}
      </div>
    </div>
  );
}

const cardStyle = {
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
  borderRadius: 14,
  padding: "15px 16px",
} as const;

const btnPrimary = {
  fontSize: 12.5,
  fontWeight: 700,
  padding: "9px 14px",
  borderRadius: 10,
  border: "none",
  background: "var(--ls-sage)",
  color: "#fff",
  cursor: "pointer",
  minHeight: 38,
} as const;

const btnGhost = {
  fontSize: 12.5,
  fontWeight: 700,
  padding: "9px 14px",
  borderRadius: 10,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  cursor: "pointer",
  minHeight: 38,
  display: "inline-flex",
  alignItems: "center",
  textDecoration: "none",
} as const;

export default RdvClubPage;
