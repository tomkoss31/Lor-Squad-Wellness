// Chantier Prise de masse (2026-04-24) — popup d'alerte style Apple Health
// pour les incohérences/points de vigilance détectés sur un bilan sport.
import "./SportAlertsDialog.css";
import type {
  CurrentIntake,
  SportFrequency,
  SportProfile,
  SportSubObjective,
  SportType,
} from "../../types/domain";
import {
  computeProteinTargetSport,
  computeWaterTargetSport,
  estimateCurrentProteinIntake,
} from "../../lib/calculations";

export interface SportAlert {
  id:
    | "hydration-low"
    | "protein-low"
    | "sleep-low"
    | "muscle-low"
    | "no-snack"
    | "frequency-mismatch";
  title: string;
  message: string;
}

export interface DetectSportAlertsArgs {
  profile: SportProfile | null;
  intake: CurrentIntake | null;
  weightKg: number;
  muscleMassPercent: number | null;
  sleepHours: number | null;
  waterIntakeLiters: number | null;
  snackingFrequency: string | null;
  /** Types déjà normalisés en SportType (pour mismatch). */
  reportedTypes?: SportType[];
}

export function detectSportAlerts(a: DetectSportAlertsArgs): SportAlert[] {
  const alerts: SportAlert[] = [];
  const sub: SportSubObjective = a.profile?.subObjective ?? "mass-gain";
  const freq: SportFrequency = a.profile?.frequency ?? "regular";

  // 1. Hydratation basse vs cible sport
  if (a.weightKg > 0 && a.waterIntakeLiters != null) {
    const targetML = computeWaterTargetSport(a.weightKg, freq);
    const actualML = a.waterIntakeLiters * 1000;
    if (actualML < targetML * 0.7) {
      alerts.push({
        id: "hydration-low",
        title: "Hydratation insuffisante",
        message: `Tu bois ~${Math.round(actualML / 100) / 10} L/j, cible ${Math.round(targetML / 100) / 10} L/j pour ton volume d'entraînement.`,
      });
    }
  }

  // 2. Protéines actuelles vs cible sport
  if (a.weightKg > 0 && a.intake) {
    const current = estimateCurrentProteinIntake(a.intake);
    const target = computeProteinTargetSport(a.weightKg, sub);
    if (current < target.min) {
      alerts.push({
        id: "protein-low",
        title: "Apport protéique sous la cible",
        message: `Apport estimé ${current} g/j, cible min ${target.min} g/j pour « ${sub} ».`,
      });
    }
  }

  // 3. Sommeil faible (<7h)
  if (a.sleepHours != null && a.sleepHours > 0 && a.sleepHours < 7) {
    alerts.push({
      id: "sleep-low",
      title: "Sommeil insuffisant",
      message: `${a.sleepHours} h/nuit : la récupération musculaire démarre pendant la nuit, vise au moins 7h.`,
    });
  }

  // 4. Masse musculaire faible pour un objectif mass-gain / strength
  if (
    a.muscleMassPercent != null &&
    (sub === "mass-gain" || sub === "strength") &&
    a.muscleMassPercent < 35
  ) {
    alerts.push({
      id: "muscle-low",
      title: "Masse musculaire basse",
      message: `Masse musculaire à ${a.muscleMassPercent.toFixed(1)}% — un plan structuré accélérera la progression.`,
    });
  }

  // 5. Pas de collation alors que l'objectif est mass-gain
  if (
    sub === "mass-gain" &&
    a.snackingFrequency &&
    /jamais|rare|aucune/i.test(a.snackingFrequency)
  ) {
    alerts.push({
      id: "no-snack",
      title: "Pas de collation",
      message: "Pour gagner en masse, les collations sont un levier simple : 2 x 20-30 g de protéines entre les repas.",
    });
  }

  // 6. Frequency mismatch : intensive annoncé mais types peu explosifs
  if (
    freq === "intensive" &&
    a.reportedTypes &&
    a.reportedTypes.length &&
    !a.reportedTypes.some((t) =>
      ["musculation", "crossfit-hiit", "combat-sport"].includes(t)
    )
  ) {
    alerts.push({
      id: "frequency-mismatch",
      title: "Fréquence à préciser",
      message: "Tu annonces 5+ séances/semaine mais sans type haute intensité — on ajuste la plan si besoin.",
    });
  }

  return alerts;
}

interface DialogProps {
  alerts: SportAlert[];
  open: boolean;
  onClose: () => void;
}

export function SportAlertsDialog({ alerts, open, onClose }: DialogProps) {
  if (!open || !alerts.length) return null;
  return (
    <div className="sport-alerts-overlay" role="dialog" aria-modal="true">
      <div className="sport-alerts-dialog">
        <div className="sport-alerts-header">
          <div className="sport-alerts-header__icon">⚠️</div>
          <div className="sport-alerts-header__title">
            {alerts.length} point{alerts.length > 1 ? "s" : ""} de vigilance
          </div>
        </div>
        <div className="sport-alerts-body">
          {alerts.map((a) => (
            <div key={a.id} className="sport-alert-item">
              <div className="sport-alert-item__title">{a.title}</div>
              <div className="sport-alert-item__message">{a.message}</div>
            </div>
          ))}
        </div>
        <div className="sport-alerts-footer">
          <button type="button" className="sport-alerts-cta" onClick={onClose}>
            J'ai compris, on continue
          </button>
        </div>
      </div>
    </div>
  );
}
