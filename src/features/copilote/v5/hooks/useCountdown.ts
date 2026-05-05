// =============================================================================
// useCountdown — Phase C Co-pilote V5 (2026-05-05)
//
// Décompte vers une date cible. Affiche en format hh:mm si > 1h, mm:ss si
// < 1h, "00:00" + isElapsed=true si dépassé.
//
// Update toutes les 1 seconde tant que le composant est monté. Cleanup
// propre via clearInterval.
// =============================================================================

import { useEffect, useState } from "react";

export interface CountdownState {
  /** Heures restantes (peut être > 24 si target éloignée). */
  hours: number;
  /** Minutes restantes 0-59. */
  minutes: number;
  /** Secondes restantes 0-59. */
  seconds: number;
  /** Format affichable : "HH:MM" si >= 1h, "MM:SS" sinon. */
  display: string;
  /** Format hh:mm:ss complet (debug). */
  displayFull: string;
  /** True si la cible est dépassée (countdown négatif clampé à 0). */
  isElapsed: boolean;
  /** Total secondes restantes (utile pour calculs externes). */
  totalSeconds: number;
}

function pad2(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

function compute(target: Date | null): CountdownState {
  if (!target) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      display: "—",
      displayFull: "—",
      isElapsed: false,
      totalSeconds: 0,
    };
  }
  const diffMs = target.getTime() - Date.now();
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Format compact selon échelle
  const display =
    hours >= 1 ? `${pad2(hours)}:${pad2(minutes)}` : `${pad2(minutes)}:${pad2(seconds)}`;
  const displayFull = `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;

  return {
    hours,
    minutes,
    seconds,
    display,
    displayFull,
    isElapsed: diffMs <= 0,
    totalSeconds,
  };
}

/**
 * Décompte live mis à jour chaque seconde.
 *
 * @param target Date cible (null = pas de countdown, retourne "—").
 */
export function useCountdown(target: Date | null): CountdownState {
  const [state, setState] = useState<CountdownState>(() => compute(target));

  useEffect(() => {
    // Update immédiat à la prop change
    setState(compute(target));

    if (!target) return;

    const interval = setInterval(() => {
      setState(compute(target));
    }, 1000);

    return () => clearInterval(interval);
  }, [target]);

  return state;
}
