// =============================================================================
// useFormationProgress — progression Formation cote user (2026-04-30)
//
// Phase 2 : stockage localStorage uniquement.
// Phase F-polish (2026-05-03) : source primaire = DB (formation_user_progress
// via useMyFormationProgress). LocalStorage devient cache secondaire pour
// les sessions hors-ligne / pre-login. Verrouillage N2 strict si N1
// pas 100 % valide DB.
//
// Expose :
//   - stats : pour chaque niveau, modules valides + pct + isLocked
//   - isLevelLocked(id) : true si prerequis pas atteint
//   - markModuleDone(levelId, moduleId) : marque local (sera ecrase par DB
//     a la prochaine reload)
//   - resetLevel(levelId) : remise a zero d un niveau (local only)
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FORMATION_LEVELS,
  getFormationLevelById,
  type FormationLevelId,
  type FormationLevelProgress,
  type FormationProgressState,
} from "../data/formation";
import { useMyFormationProgress } from "../features/formation";
import { useAppContext } from "../context/AppContext";

const STORAGE_KEY = "ls_formation_progress";

const DEFAULT_LEVEL_PROGRESS: FormationLevelProgress = {
  completedModules: [],
  lastSeenAt: null,
};

const DEFAULT_STATE: FormationProgressState = {
  levels: {
    demarrer: { ...DEFAULT_LEVEL_PROGRESS },
    construire: { ...DEFAULT_LEVEL_PROGRESS },
    dupliquer: { ...DEFAULT_LEVEL_PROGRESS },
  },
};

function readState(): FormationProgressState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<FormationProgressState>;
    return {
      levels: {
        demarrer: parsed.levels?.demarrer ?? { ...DEFAULT_LEVEL_PROGRESS },
        construire: parsed.levels?.construire ?? { ...DEFAULT_LEVEL_PROGRESS },
        dupliquer: parsed.levels?.dupliquer ?? { ...DEFAULT_LEVEL_PROGRESS },
      },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeState(next: FormationProgressState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

export interface FormationLevelStats {
  levelId: FormationLevelId;
  /** Nombre de modules valides. */
  completedCount: number;
  /** Nombre total de modules dans le niveau (0 en Phase 2). */
  totalCount: number;
  /** Pourcentage 0-100 (0 si totalCount=0). */
  percent: number;
  /** Niveau termine a 100 %. */
  isComplete: boolean;
  /** Niveau commence (au moins 1 module ou lastSeenAt non-null). */
  hasStarted: boolean;
  /** Niveau verrouille (prerequis non atteint). */
  isLocked: boolean;
}

export interface UseFormationProgressResult {
  /** Stats agregees par niveau (3 entrees). */
  stats: Record<FormationLevelId, FormationLevelStats>;
  /** True si l ID du niveau est verrouille. */
  isLevelLocked: (levelId: FormationLevelId) => boolean;
  /** Marque un module comme complete dans son niveau. */
  markModuleDone: (levelId: FormationLevelId, moduleId: string) => void;
  /** Reset d un niveau (utile pour debug ou "refaire le parcours"). */
  resetLevel: (levelId: FormationLevelId) => void;
  /** Reset complet (debug). */
  resetAll: () => void;
}

export function useFormationProgress(): UseFormationProgressResult {
  const [state, setState] = useState<FormationProgressState>(() => readState());
  // Phase F-polish : source primaire = DB. Si DB indispo, fallback localStorage.
  const { rows: dbRows } = useMyFormationProgress();
  // Bypass admin (2026-11-04) : Thomas + Mel doivent pouvoir lire toutes les
  // sections meme N2/N3 verrouilles (relecture rapide en mode test).
  // L evolution sera reset avant le launch distri.
  const { currentUser } = useAppContext();
  const isAdminBypass = currentUser?.role === "admin";

  // Synchro inter-onglets via storage event
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setState(readState());
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // Helper : pour chaque niveau, retourne la liste des module IDs valides
  // dans la DB (status='validated'). Source primaire pour les stats.
  const dbCompletedByLevel = useMemo<Record<FormationLevelId, string[]>>(() => {
    const map: Record<FormationLevelId, string[]> = {
      demarrer: [],
      construire: [],
      dupliquer: [],
    };
    for (const row of dbRows) {
      if (row.status !== "validated") continue;
      // Trouve a quel niveau appartient ce module_id
      for (const level of FORMATION_LEVELS) {
        if (level.modules.some((m) => m.id === row.module_id)) {
          map[level.id].push(row.module_id);
          break;
        }
      }
    }
    return map;
  }, [dbRows]);

  const computeStats = useCallback(
    (levelId: FormationLevelId): FormationLevelStats => {
      const level = getFormationLevelById(levelId);
      const totalCount = level?.modules.length ?? 0;
      const levelProg = state.levels[levelId];

      // Source primaire = DB si dispo. Fallback localStorage.
      const dbCompleted = dbCompletedByLevel[levelId];
      const completedModules = dbCompleted.length > 0 ? dbCompleted : levelProg.completedModules;
      const completedCount = completedModules.length;

      const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      const isComplete = totalCount > 0 && completedCount >= totalCount;
      const hasStarted = completedCount > 0 || levelProg.lastSeenAt !== null;

      // Verrouillage : si unlockedBy defini, verifier le niveau prerequis
      // (source DB en priorite). Bypass admin pour relecture test.
      let isLocked = false;
      if (level?.unlockedBy && !isAdminBypass) {
        const prereqLevel = getFormationLevelById(level.unlockedBy);
        const prereqTotal = prereqLevel?.modules.length ?? 0;
        const prereqDbCompleted = dbCompletedByLevel[level.unlockedBy];
        const prereqLocalCompleted = state.levels[level.unlockedBy].completedModules;
        const prereqCompleted = prereqDbCompleted.length > 0 ? prereqDbCompleted : prereqLocalCompleted;
        // Phase F-polish : verrouillage strict (modules N1 doivent etre 100%
        // valides en DB pour debloquer N2, idem N2 -> N3).
        isLocked = prereqTotal > 0 && prereqCompleted.length < prereqTotal;
      }

      return {
        levelId,
        completedCount,
        totalCount,
        percent,
        isComplete,
        hasStarted,
        isLocked,
      };
    },
    [state, dbCompletedByLevel, isAdminBypass],
  );

  const stats = useMemo<Record<FormationLevelId, FormationLevelStats>>(
    () => ({
      demarrer: computeStats("demarrer"),
      construire: computeStats("construire"),
      dupliquer: computeStats("dupliquer"),
    }),
    [computeStats],
  );

  const isLevelLocked = useCallback(
    (levelId: FormationLevelId): boolean => stats[levelId].isLocked,
    [stats],
  );

  const markModuleDone = useCallback(
    (levelId: FormationLevelId, moduleId: string) => {
      setState((prev) => {
        const levelProg = prev.levels[levelId];
        if (levelProg.completedModules.includes(moduleId)) {
          return prev;
        }
        const next: FormationProgressState = {
          levels: {
            ...prev.levels,
            [levelId]: {
              ...levelProg,
              completedModules: [...levelProg.completedModules, moduleId],
              lastSeenAt: new Date().toISOString(),
            },
          },
        };
        writeState(next);
        return next;
      });
    },
    [],
  );

  const resetLevel = useCallback((levelId: FormationLevelId) => {
    setState((prev) => {
      const next: FormationProgressState = {
        levels: {
          ...prev.levels,
          [levelId]: { ...DEFAULT_LEVEL_PROGRESS },
        },
      };
      writeState(next);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    writeState(DEFAULT_STATE);
    setState(DEFAULT_STATE);
  }, []);

  // Avoid unused-var warning sur FORMATION_LEVELS (re-export pour autocomplete)
  void FORMATION_LEVELS;

  return {
    stats,
    isLevelLocked,
    markModuleDone,
    resetLevel,
    resetAll,
  };
}
