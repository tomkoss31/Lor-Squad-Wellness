// =============================================================================
// AgendaJourPleinEcran — une journée, en grand, avec une croix pour revenir.
//
// LE CONSTAT (Thomas, 01/09) : « sur la vue du mois, quand je clique par
// exemple sur le 2, ça ouvre le RDV en bas, pas visible. Il faut que ce soit
// pleine page avec une croix pour fermer et revenir en arrière. »
//
// REPRODUIT DANS L'APP le même jour, sur un écran de 390 × 844 : taper un jour
// du mois faisait DEUX choses à la fois — basculer en vue Semaine, et poser le
// détail de la journée TOUT EN BAS, après la grille, la légende et les bandes
// de permanence. Page mesurée à 900 px pour une fenêtre de 844 : le détail
// tombait juste sous le pli. On changeait de vue sans l'avoir demandé, et la
// réponse à son geste était invisible.
//
// Ici : on ne change pas de vue, on ouvre la journée par-dessus. La croix
// referme et rend le mois exactement là où il était.
//
// Le contenu, lui, n'est PAS réécrit : c'est `AgendaDayList`, déjà partagé par
// la semaine et le mois. Une seule implémentation du rendu d'une journée —
// sinon les deux finissent par diverger, ce qui est la maladie de cette app.
// =============================================================================

import { useEffect, useRef } from "react";
import { AgendaDayList } from "./AgendaDayList";
import type { CalendarEvent } from "./calendarEvents";

export interface AgendaJourPleinEcranProps {
  day: Date;
  events: CalendarEvent[];
  colorOf: (ev: CalendarEvent) => string;
  ownerName: (ownerId: string) => string;
  showOwner?: boolean;
  onSelectEvent?: (ev: CalendarEvent) => void;
  onCreateAt?: (at: Date) => void;
  onFermer: () => void;
}

const TITRE = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

export function AgendaJourPleinEcran({
  day,
  events,
  colorOf,
  ownerName,
  showOwner,
  onSelectEvent,
  onCreateAt,
  onFermer,
}: AgendaJourPleinEcranProps) {
  const fermerRef = useRef<HTMLButtonElement | null>(null);

  // Échap referme, et le focus part sur la croix : sur un écran plein, il faut
  // pouvoir sortir sans chercher où cliquer.
  useEffect(() => {
    fermerRef.current?.focus();
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onFermer]);

  const timed = events.filter((e) => !e.allDay);
  const allDay = events.filter((e) => e.allDay);
  const titre = TITRE.format(day);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titre}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70,
        background: "var(--ls-bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px calc(12px)",
          borderBottom: "1px solid var(--ls-border)",
          background: "var(--ls-surface)",
          flex: "none",
          paddingTop: "calc(14px + env(safe-area-inset-top))",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
              fontSize: 10.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ls-text-hint)",
            }}
          >
            {timed.length + allDay.length === 0
              ? "rien de calé"
              : `${timed.length + allDay.length} ${timed.length + allDay.length > 1 ? "rendez-vous" : "rendez-vous"}`}
          </div>
          <h2
            style={{
              margin: "2px 0 0",
              fontFamily: "Syne, sans-serif",
              fontWeight: 700,
              fontSize: 21,
              lineHeight: 1.15,
              color: "var(--ls-text)",
              textTransform: "capitalize",
            }}
          >
            {titre}
          </h2>
        </div>
        {/* La croix — 44 px, atteignable au pouce, et annoncée aux lecteurs
            d'écran comme ce qu'elle fait vraiment : revenir. */}
        <button
          ref={fermerRef}
          type="button"
          onClick={onFermer}
          aria-label="Fermer et revenir au mois"
          style={{
            flex: "none",
            width: 44,
            height: 44,
            borderRadius: 12,
            border: "1px solid var(--ls-border2)",
            background: "var(--ls-surface2)",
            color: "var(--ls-text)",
            fontSize: 20,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </header>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          padding: "4px 16px calc(28px + env(safe-area-inset-bottom))",
          // Sur grand écran, la journée n'a pas besoin de 1 400 px de large :
          // une colonne lisible, centrée, comme le reste de l'app.
          maxWidth: 720,
          width: "100%",
          margin: "0 auto",
        }}
      >
        <AgendaDayList
          day={day}
          timed={timed}
          allDay={allDay}
          colorOf={colorOf}
          ownerName={ownerName}
          showOwner={showOwner}
          onSelectEvent={onSelectEvent}
          onCreateAt={onCreateAt}
        />
      </div>
    </div>
  );
}
