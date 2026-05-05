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
import { useGlobalView } from "../hooks/useGlobalView";
import { LegalFooter } from "../components/ui/LegalFooter";
// GlobalViewToggle retire 2026-04-29 — toggle inutile sur /co-pilote
import { ClockHeader } from "../components/copilote/ClockHeader";
import { HeroActionCard } from "../components/copilote/HeroActionCard";
import { TodayAgendaCard } from "../components/copilote/TodayAgendaCard";
import { PendingFollowupsCard } from "../components/copilote/PendingFollowupsCard";
import { PvGaugeBand } from "../components/copilote/PvGaugeBand";
import { PvActionPlanAlert } from "../components/copilote/PvActionPlanAlert";
import { InboxWidget } from "../components/copilote/InboxWidget";
import { BirthdayBlock } from "../components/copilote/BirthdayBlock";
import { BusinessOpportunitiesCard } from "../components/copilote/BusinessOpportunitiesCard";
import { DistriOnboardingChecklist } from "../components/formation/DistriOnboardingChecklist";
import { FlexTodayWidget } from "../components/copilote/FlexTodayWidget";
import { RentabilityWidget } from "../components/rentability/RentabilityWidget";
import { StreakBadge } from "../features/gamification/components/StreakBadge";
import { WeeklyQuestsCard } from "../features/gamification/components/WeeklyQuestsCard";

function useLiveClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function CoPilotePage() {
  const { currentUser, clients } = useAppContext();
  const { push: pushToast } = useToast();
  const now = useLiveClock();

  // Hotfix filtre Co-pilote (2026-04-24, refonte 5 bugs) : toggle
  // partagé cross-pages via useGlobalView (Co-pilote, Messagerie,
  // Clients, Suivi PV utilisent tous le même state).
  const isAdmin = currentUser?.role === "admin";
  const [globalView] = useGlobalView();

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
      {/* Toggle GlobalView retire de /co-pilote (2026-04-29) — l'admin voit
          desormais ses propres data par defaut, sans toggle inutile en haut. */}

      {/* Zone 1 — Horloge + salutation */}
      <ClockHeader
        now={now}
        userFirstName={firstName}
        appointmentsToday={data.todayAppointmentsCount}
        followupsToday={data.todayFollowupsCount}
      />

      {/* Gamification 1 (2026-04-29) : streak de connexion juste sous l horloge. */}
      <div style={{ display: "flex", justifyContent: "flex-start", marginTop: -6 }}>
        <StreakBadge />
      </div>

      {/* Feature #10 (2026-11-04) : checklist onboarding J0-J7 pour les
          nouveaux distri. Auto-cache si > 14j ou si toutes les etapes
          cochees. Visible avant le Hero pour ne pas etre louee. */}
      <DistriOnboardingChecklist />

      {/* Rentabilité Phase A (2026-05-05) — jauge €/mois en haut, premier
          écran du matin = combien tu as gagné ce mois. Click = breakdown
          complet. ROI émotionnel max. */}
      <RentabilityWidget />

      {/* FLEX Lor'Squad (2026-11-05) — moteur de pilotage quotidien :
          cibles + check-in du jour visibles direct sur Co-pilote. Cliquer
          la card mène à /flex pour le détail complet. */}
      <FlexTodayWidget />

      {/* Zone 2 — Hero action */}
      <HeroActionCard nextAction={data.nextAction} now={now} />

      {/* Chantier birthday (2026-04-25) : bloc anniversaires des clients
          (aujourd'hui + 7 prochains jours). Scope sur les clients du distri
          en mode normal, sur tous en mode global admin (alignement avec
          la logique useCopiloteData). */}
      <BirthdayBlock
        clients={
          isAdmin && globalView
            ? clients
            : clients.filter((c) => c.distributorId === currentUser.id)
        }
        coachFirstName={firstName || "ton coach"}
      />

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

      {/* Strategie PV (2026-04-28) : Plan du jour PV avec status + 3 categories
          de suggestions client (top dormants / restock / silencieux) +
          gain attendu si toutes les relances aboutissent. */}
      {currentUser?.id ? <PvActionPlanAlert userId={currentUser.id} /> : null}

      {/* Pop-up business bilan (2026-11-03) : clients qui ont coche un montant
          a l etape business-ambition. Masquee si aucun candidat. Scope
          identique a BirthdayBlock (ses clients en mode normal, tous en
          mode global admin). */}
      <BusinessOpportunitiesCard
        clients={
          isAdmin && globalView
            ? clients
            : clients.filter((c) => c.distributorId === currentUser.id)
        }
      />

      {/* Gamification 3 (2026-04-29) : quetes hebdo automatiques. */}
      <WeeklyQuestsCard />

      {/* Footer legal in-page (V2 RGPD — 2026-04-30) */}
      <LegalFooter />
    </div>
  );
}
