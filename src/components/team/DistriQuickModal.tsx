// DistriQuickModal (2026-04-29) — popup sandbox au click sur un distri
// dans l'arborescence team. Affiche en 1 coup d'œil :
//  - Avatar + nom + role + statut connexion
//  - 🔥 Streak + lifetime + flammes
//  - 📊 XP total + niveau
//  - 👥 Stats clients (count + bilans + RDV + PV mois)
//  - 📈 Mini graph 7 jours
//  - CTA "Voir fiche complète" pour aller plus loin

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getSupabaseClient } from "../../services/supabaseClient";
import type { Client, FollowUp, User } from "../../types/domain";
import { useAppContext } from "../../context/AppContext";
import { useUserActivityStats } from "../../features/gamification/hooks/useUserActivityStats";

interface Props {
  user: User;
  clients: Client[];
  followUps: FollowUp[];
  onClose: () => void;
  /**
   * Mode couple (Thomas + Melanie virtual node) : si fournie, affiche un
   * switch pour basculer entre les membres. Toutes les data se rafraichissent
   * pour le membre selectionne. Si non fournie ou 1 seul, mode classique.
   */
  coupleMembers?: User[];
}

interface XpData {
  totalXp: number;
  level: number;
  dailyXp: number;
}

function getInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return remM > 0 ? `${h}h${String(remM).padStart(2, "0")}` : `${h}h`;
}

function relativeTime(date: Date | null): string {
  if (!date) return "Jamais";
  const diffMs = Date.now() - date.getTime();
  const diffM = Math.floor(diffMs / 60000);
  if (diffM < 1) return "À l'instant";
  if (diffM < 60) return `il y a ${diffM} min`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `il y a ${diffD} j`;
  if (diffD < 30) return `il y a ${Math.floor(diffD / 7)} sem.`;
  return `il y a ${Math.floor(diffD / 30)} mois`;
}

function statusInfo(lastActiveAt: Date | null): {
  label: string;
  color: string;
  emoji: string;
} {
  if (!lastActiveAt) return { label: "Jamais connecté", color: "var(--ls-text-hint)", emoji: "💤" };
  const diffH = (Date.now() - lastActiveAt.getTime()) / 3600000;
  if (diffH < 24) return { label: "Aujourd'hui", color: "var(--ls-teal)", emoji: "🟢" };
  if (diffH < 48) return { label: "Hier", color: "var(--ls-gold)", emoji: "🟡" };
  if (diffH < 168) return { label: "Cette semaine", color: "var(--ls-coral)", emoji: "🟠" };
  return { label: "Inactif >1 sem", color: "#DC2626", emoji: "🔴" };
}

export function DistriQuickModal({ user, clients, followUps, onClose, coupleMembers }: Props) {
  const { currentUser } = useAppContext();
  const isAdmin = currentUser?.role === "admin";

  // Mode couple : switch entre les membres si fournis (≥ 2)
  const hasCoupleSwitch = !!coupleMembers && coupleMembers.length >= 2;
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    hasCoupleSwitch ? coupleMembers![0].id : user.id,
  );
  // Le user "actif" pour les data — soit le membre selectionne, soit le user de base
  const activeUser = useMemo(() => {
    if (hasCoupleSwitch) {
      return coupleMembers!.find((m) => m.id === selectedMemberId) ?? coupleMembers![0];
    }
    return user;
  }, [hasCoupleSwitch, coupleMembers, selectedMemberId, user]);

  const stats = useUserActivityStats(isAdmin ? activeUser.id : null);
  const [xp, setXp] = useState<XpData | null>(null);

  // Fetch XP via RPC (refetch au switch couple)
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setXp(null); // reset au switch
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data, error } = await sb.rpc("get_user_xp", { p_user_id: activeUser.id });
        if (cancelled || error) return;
        const row = Array.isArray(data) && data[0] ? data[0] : null;
        if (!row) return;
        setXp({
          totalXp: (row as { total_xp?: number }).total_xp ?? 0,
          level: (row as { level?: number }).level ?? 1,
          dailyXp: (row as { daily_xp?: number }).daily_xp ?? 0,
        });
      } catch (err) {
        console.warn("[DistriQuickModal] XP fetch failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeUser.id, isAdmin]);

  // Stats clients/bilans (depend du activeUser)
  const distri = useMemo(() => {
    const myClients = clients.filter((c) => c.distributorId === activeUser.id);
    const activeClients = myClients.filter((c) => c.status === "active").length;
    const bilansCount = myClients.reduce((sum, c) => sum + (c.assessments?.length ?? 0), 0);
    const upcomingFollowUps = followUps.filter(
      (f) => myClients.some((c) => c.id === f.clientId) && f.status === "pending",
    ).length;
    return {
      total: myClients.length,
      active: activeClients,
      bilansCount,
      upcomingFollowUps,
    };
  }, [activeUser.id, clients, followUps]);

  // ESC + body scroll lock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const status = statusInfo(stats.lastActiveAt);
  const maxSeconds = Math.max(...stats.dailyBreakdown.map((d) => d.seconds), 1);

  return (
    <>
      <style>{`
        @keyframes ls-distri-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ls-distri-slide-up {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ls-distri-shine {
          0%, 100% { transform: translateX(-30%); opacity: 0; }
          50%      { transform: translateX(180%); opacity: 0.40; }
        }
        .ls-distri-overlay { animation: ls-distri-fade-in 0.18s ease-out; }
        .ls-distri-panel   { animation: ls-distri-slide-up 0.32s cubic-bezier(0.22,1,0.36,1); }
      `}</style>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- Backdrop, ESC at dialog level */}
      <div
        className="ls-distri-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ls-distri-title"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 5000,
          background: "color-mix(in srgb, var(--ls-bg) 75%, transparent)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        <div
          className="ls-distri-panel"
          style={{
            background: "var(--ls-surface)",
            border: "0.5px solid color-mix(in srgb, var(--ls-teal) 30%, var(--ls-border))",
            borderRadius: 22,
            width: "100%",
            maxWidth: 480,
            maxHeight: "calc(100vh - 32px)",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            boxShadow: "0 24px 64px -16px rgba(0,0,0,0.40)",
          }}
        >
          {/* HEADER GRADIENT TEAL */}
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              padding: "18px 20px",
              background: "linear-gradient(135deg, var(--ls-teal) 0%, color-mix(in srgb, var(--ls-teal) 70%, #000) 100%)",
              color: "#FFFFFF",
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute", top: 0, left: 0, height: "100%", width: "30%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.40), transparent)",
                animation: "ls-distri-shine 6s ease-in-out infinite",
                pointerEvents: "none",
              }}
            />
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 56, height: 56, flexShrink: 0,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.22)",
                  border: "1px solid rgba(255,255,255,0.40)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20,
                  fontFamily: "Syne, serif",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  backdropFilter: "blur(6px)",
                }}
              >
                {getInitials(activeUser.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase", fontWeight: 800, color: "rgba(255,255,255,0.90)" }}>
                  {activeUser.role === "admin" ? "Admin" : activeUser.role === "referent" ? "Coach référent" : "Distributeur"}
                </div>
                <h2
                  id="ls-distri-title"
                  style={{
                    fontFamily: "Syne, serif", fontWeight: 800, fontSize: 22,
                    letterSpacing: "-0.02em", margin: "2px 0 0",
                    textShadow: "0 1px 2px rgba(0,0,0,0.18)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                >
                  {activeUser.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                style={{
                  width: 32, height: 32, flexShrink: 0,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.30)",
                  background: "rgba(255,255,255,0.18)",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  fontSize: 16,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "transform 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "rotate(90deg)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* COUPLE SWITCH (Thomas/Mélanie) — V3 2026-04-29 */}
          {hasCoupleSwitch && (
            <div
              style={{
                padding: "10px 18px",
                background: "color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface))",
                borderBottom: "0.5px solid var(--ls-border)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                  fontWeight: 700,
                  color: "var(--ls-text-muted)",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                Voir
              </span>
              <div
                style={{
                  display: "inline-flex",
                  gap: 4,
                  padding: 3,
                  borderRadius: 999,
                  background: "var(--ls-surface2)",
                  border: "0.5px solid var(--ls-border)",
                }}
              >
                {coupleMembers!.map((member) => {
                  const isActive = selectedMemberId === member.id;
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setSelectedMemberId(member.id)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 999,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        fontFamily: "DM Sans, sans-serif",
                        fontWeight: isActive ? 700 : 500,
                        background: isActive
                          ? "linear-gradient(135deg, var(--ls-teal) 0%, color-mix(in srgb, var(--ls-teal) 70%, #000) 100%)"
                          : "transparent",
                        color: isActive ? "#FFFFFF" : "var(--ls-text-muted)",
                        boxShadow: isActive ? "0 2px 6px -2px rgba(45,212,191,0.40)" : "none",
                        transition: "all 0.15s ease",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <span style={{ fontSize: 13 }}>{getInitials(member.name)}</span>
                      <span>{member.name.split(/\s+/)[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* BODY */}
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            {!isAdmin ? (
              <div
                style={{
                  padding: 14,
                  background: "var(--ls-surface2)",
                  borderRadius: 12,
                  border: "0.5px solid var(--ls-border)",
                  fontSize: 13,
                  color: "var(--ls-text-muted)",
                  textAlign: "center",
                }}
              >
                Seuls les admins voient les détails d'activité.
              </div>
            ) : (
              <>
                {/* Status pill */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: 12,
                      padding: "5px 12px",
                      borderRadius: 999,
                      background: `color-mix(in srgb, ${status.color} 12%, transparent)`,
                      color: status.color,
                      fontWeight: 700,
                      border: `0.5px solid color-mix(in srgb, ${status.color} 35%, transparent)`,
                    }}
                  >
                    <span>{status.emoji}</span> {status.label}
                  </span>
                  <span style={{ fontSize: 11.5, color: "var(--ls-text-muted)" }}>
                    {relativeTime(stats.lastActiveAt)}
                  </span>
                </div>

                {/* Stats principales — grid 2x2 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <QuickStat
                    emoji="🔥"
                    label="Streak"
                    value={stats.streakCount > 0 ? `${stats.streakCount}j` : "—"}
                    color="var(--ls-gold)"
                    extra={`${stats.lifetimeLoginCount}j cumulés`}
                  />
                  <QuickStat
                    emoji="⭐"
                    label="Niveau XP"
                    value={xp ? `Niv. ${xp.level}` : "…"}
                    color="var(--ls-purple)"
                    extra={xp ? `${xp.totalXp} XP total` : ""}
                  />
                  <QuickStat
                    emoji="📊"
                    label="Aujourd'hui"
                    value={formatDuration(stats.todaySeconds)}
                    color="var(--ls-teal)"
                    extra={`${formatDuration(stats.last7dSeconds)} cette sem.`}
                  />
                  <QuickStat
                    emoji="👥"
                    label="Clients"
                    value={`${distri.total}`}
                    color="var(--ls-coral)"
                    extra={`${distri.active} actifs · ${distri.upcomingFollowUps} relances`}
                  />
                </div>

                {/* Mini graph 7 jours */}
                {stats.loaded && stats.dailyBreakdown.length > 0 && (
                  <div
                    style={{
                      padding: "12px 14px",
                      background: "var(--ls-surface2)",
                      borderRadius: 12,
                      border: "0.5px solid var(--ls-border)",
                    }}
                  >
                    <div style={{ fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 700, color: "var(--ls-text-muted)", marginBottom: 8 }}>
                      Activité 7 jours
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 56 }}>
                      {stats.dailyBreakdown.map((day) => {
                        const heightPct = maxSeconds > 0 ? (day.seconds / maxSeconds) * 100 : 0;
                        const isToday = day.date === new Date().toISOString().slice(0, 10);
                        const dateLabel = new Date(day.date).toLocaleDateString("fr-FR", { weekday: "narrow" });
                        return (
                          <div
                            key={day.date}
                            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
                            title={`${day.date}: ${formatDuration(day.seconds)}`}
                          >
                            <div style={{ width: "100%", height: 40, display: "flex", alignItems: "flex-end", borderRadius: 4, background: "var(--ls-surface)", overflow: "hidden" }}>
                              <div
                                style={{
                                  width: "100%",
                                  height: `${Math.max(heightPct, day.seconds > 0 ? 8 : 0)}%`,
                                  background: isToday
                                    ? "linear-gradient(180deg, var(--ls-teal) 0%, color-mix(in srgb, var(--ls-teal) 70%, #000) 100%)"
                                    : "color-mix(in srgb, var(--ls-teal) 40%, transparent)",
                                  transition: "height 0.5s ease",
                                  borderRadius: 4,
                                }}
                              />
                            </div>
                            <div style={{ fontSize: 9.5, color: isToday ? "var(--ls-teal)" : "var(--ls-text-hint)", fontWeight: isToday ? 700 : 500, textTransform: "uppercase" }}>
                              {dateLabel}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Loading state */}
                {!stats.loaded && (
                  <div style={{ textAlign: "center", padding: 20, fontSize: 12, color: "var(--ls-text-muted)" }}>
                    Chargement de l'activité…
                  </div>
                )}
              </>
            )}

            {/* Footer CTAs */}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "11px 16px",
                  borderRadius: 999,
                  border: "0.5px solid var(--ls-border)",
                  background: "var(--ls-surface)",
                  color: "var(--ls-text-muted)",
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "transform 0.15s ease, border-color 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
              >
                Fermer
              </button>
              <Link
                to={`/distributors/${activeUser.id}`}
                onClick={onClose}
                style={{
                  flex: 1.4,
                  padding: "11px 18px",
                  borderRadius: 999,
                  border: "none",
                  background: "linear-gradient(135deg, var(--ls-teal) 0%, color-mix(in srgb, var(--ls-teal) 70%, #000) 100%)",
                  color: "#FFFFFF",
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  boxShadow: "0 4px 12px -3px rgba(45,212,191,0.40), inset 0 1px 0 rgba(255,255,255,0.20)",
                  letterSpacing: "-0.005em",
                }}
              >
                Fiche complète
                <span aria-hidden style={{ fontSize: 14 }}>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function QuickStat({
  emoji, label, value, color, extra,
}: {
  emoji: string; label: string; value: string; color: string; extra?: string;
}) {
  return (
    <div
      style={{
        padding: "10px 12px",
        background: "var(--ls-surface2)",
        borderRadius: 12,
        border: "0.5px solid var(--ls-border)",
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div
        style={{
          fontSize: 9.5,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: "var(--ls-text-muted)",
          fontWeight: 600,
          fontFamily: "DM Sans, sans-serif",
          marginBottom: 3,
          display: "flex", alignItems: "center", gap: 5,
        }}
      >
        <span>{emoji}</span> {label}
      </div>
      <div
        style={{
          fontFamily: "Syne, serif",
          fontSize: 16,
          fontWeight: 800,
          color: "var(--ls-text)",
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {extra && (
        <div style={{ fontSize: 10, color: "var(--ls-text-hint)", marginTop: 2 }}>
          {extra}
        </div>
      )}
    </div>
  );
}
