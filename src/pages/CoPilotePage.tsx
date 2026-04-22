// Chantier Co-pilote V4 (2026-04-24) — refonte premium action-focused.
//
// 4 zones :
//   1. ClockHeader : horloge 38px live + date + salutation + mood
//   2. HeroActionCard : prochaine action (RDV ou suivi ou calme)
//   3. Duo TodayAgendaCard + PendingFollowupsCard
//   4. PvGaugeBand : jauge PV circulaire + 3 mini-stats
//
// Le widget "À traiter" (InboxWidget du chantier 5) est conservé entre
// Hero et Duo — il est complémentaire (messages inbox) plutôt que
// redondant avec Agenda/Suivis.

import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { useCopiloteData } from "../hooks/useCopiloteData";
import { ClockHeader } from "../components/copilote/ClockHeader";
import { HeroActionCard } from "../components/copilote/HeroActionCard";
import { TodayAgendaCard } from "../components/copilote/TodayAgendaCard";
import { PendingFollowupsCard } from "../components/copilote/PendingFollowupsCard";
import { PvGaugeBand } from "../components/copilote/PvGaugeBand";
import { InboxWidget } from "../components/copilote/InboxWidget";

function useLiveClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

const LS_GLOBAL_VIEW_KEY = "lorsquad-copilote-global-view";

export function CoPilotePage() {
  const { currentUser } = useAppContext();
  const { push: pushToast } = useToast();
  const now = useLiveClock();

  // Hotfix filtre Co-pilote (2026-04-24) : toggle admin "Vue globale".
  // Par defaut OFF → chaque utilisateur (admin compris) voit uniquement
  // ses propres RDV/suivis/prospects. Persisté en localStorage.
  const isAdmin = currentUser?.role === "admin";
  const [globalView, setGlobalView] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(LS_GLOBAL_VIEW_KEY) === "true";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LS_GLOBAL_VIEW_KEY, globalView ? "true" : "false");
    } catch {
      // quota
    }
  }, [globalView]);

  const data = useCopiloteData(now, isAdmin && globalView);

  // Chantier Onboarding distributeur complet (2026-04-24) : toast "Bienvenue
  // dans Lor'Squad" quand l'utilisateur arrive depuis /bienvenue-distri.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const welcome = new URLSearchParams(window.location.search).get("welcome");
    if (welcome !== "distri" || !currentUser) return;
    const firstName = currentUser.name?.split(/\s+/)[0] ?? "";
    pushToast({
      tone: "success",
      title: `Bienvenue dans Lor'Squad${firstName ? ", " + firstName : ""} ! 🎉`,
      message: "Ton compte distributeur est prêt. Explore ton co-pilote.",
    });
    const url = new URL(window.location.href);
    url.searchParams.delete("welcome");
    window.history.replaceState({}, "", url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  if (!currentUser) return null;

  const firstName = currentUser.name?.split(/\s+/)[0] ?? "";

  return (
    <div className="space-y-5">
      {/* Toggle admin Vue globale (hotfix 2026-04-24) */}
      {isAdmin ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 14px",
            borderRadius: 12,
            background: "var(--ls-surface)",
            border: "1px solid var(--ls-border)",
            fontFamily: "DM Sans, sans-serif",
            justifyContent: "flex-end",
          }}
        >
          <span style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
            {globalView ? "Vue équipe (toute l'équipe)" : "Vue personnelle (mes RDV uniquement)"}
          </span>
          <button
            type="button"
            onClick={() => setGlobalView((v) => !v)}
            aria-pressed={globalView}
            aria-label={globalView ? "Désactiver vue globale" : "Activer vue globale"}
            style={{
              width: 38,
              height: 22,
              borderRadius: 999,
              background: globalView ? "#BA7517" : "var(--ls-border)",
              position: "relative",
              transition: "background 0.2s",
              flexShrink: 0,
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 2,
                left: globalView ? 18 : 2,
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "#FFFFFF",
                transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                display: "block",
              }}
            />
          </button>
        </div>
      ) : null}

      {/* Zone 1 — Horloge + salutation */}
      <ClockHeader
        now={now}
        userFirstName={firstName}
        appointmentsToday={data.todayAppointmentsCount}
        followupsToday={data.todayFollowupsCount}
      />

      {/* Zone 2 — Hero action */}
      <HeroActionCard nextAction={data.nextAction} now={now} />

      {/* Widget messages (chantier 5) — conservé car complémentaire : Hero
          et Duo montrent RDV/suivis, l'Inbox montre les demandes clients. */}
      <InboxWidget />

      {/* Zone 3 — Duo Agenda / Suivis */}
      <div
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        }}
      >
        <TodayAgendaCard
          items={data.todayAgenda}
          moreCount={data.todayAgendaMoreCount}
        />
        <PendingFollowupsCard
          items={data.pendingFollowups}
          moreCount={data.pendingFollowupsMoreCount}
        />
      </div>

      {/* Zone 4 — Bande stats PV + 3 mini */}
      <PvGaugeBand
        monthlyPV={data.monthlyPV}
        monthlyPVTarget={data.monthlyPVTarget}
        daysLeftInMonth={data.daysLeftInMonth}
        activeClientsCount={data.activeClientsCount}
        activeClientsDelta={data.activeClientsDelta}
        weekAppointmentsCount={data.weekAppointmentsCount}
        todayAppointmentsCount={data.todayAppointmentsCount}
        conversionRate={data.conversionRate}
      />
    </div>
  );
}
