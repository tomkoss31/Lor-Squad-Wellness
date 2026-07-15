// =============================================================================
// LeadDetailBilanSections — sections de lecture d'un bilan online (Objectifs,
// Profil, Vécu, Habitudes, Budget & activité, + sections V2 Assiette/Sommeil/
// Job/Activité).
//
// Extrait de LeadDetailModal.tsx (chantier refonte CRM Liste/Pipeline/Fiche
// détail, Phase 2, 2026-07) pour être réutilisé à la fois par la modal
// existante (le temps qu'elle soit retirée) et par la nouvelle fiche détail
// plein écran CrmLeadDetailPage. Comportement/rendu identiques — pur
// refactor mécanique, aucune règle métier changée.
// =============================================================================

import type { OnlineBilanRow } from "../../hooks/useOnlineBilans";

const OBJECTIVE_LABELS: Record<string, string> = {
  weight_loss: "Perte de poids",
  mass_gain: "Prise de masse",
  energy: "Plus d'énergie",
  sleep: "Mieux dormir / récupérer",
  wellbeing: "Bien-être général",
  perf_pro: "Performance au travail",
};
// Legacy V1 — bilan online avant 2026-05-27. Conservé pour compat affichage.
const ATTEMPT_LABELS: Record<string, string> = {
  diet: "Régimes",
  coach: "Coach / accompagnement",
  sport: "Sport",
  supplements: "Suppléments",
  nothing: "Rien encore",
};
const MEAL_LABELS: Record<string, string> = {
  sweet: "Sucré",
  salty: "Salé",
  smoothie: "Smoothie / healthy",
  coffee_only: "Café seulement / rien",
  other: "Autre",
  home: "Maison",
  canteen: "Cantine / resto",
  sandwich: "Sandwich / wrap",
  fastfood: "Fast-food",
  skip: "Je saute",
  delivery: "Livraison",
  light: "Léger / snack",
};
// V2 — bilan online refondu 2026-05-27.
const CURRENT_ACTION_LABELS: Record<string, string> = {
  sport: "🏃 Sport régulier",
  good_food: "🥗 Alimentation soignée",
  supplements: "💊 Suppléments / vitamines",
  coach: "👤 Suivi coach / pro",
  nothing: "🤷 Rien encore",
};
const MEALS_BALANCED_LABELS: Record<string, string> = {
  yes: "✅ Oui, plutôt",
  no: "❌ Non, pas vraiment",
  unsure: "🤔 Ne sait pas",
};
const WATER_LABELS: Record<string, string> = {
  "1-3": "1-3 verres",
  "4-6": "4-6 verres",
  "7-10": "7-10 verres",
  "10+": "10+ verres",
};
const COFFEE_LABELS: Record<string, string> = {
  "0": "Aucun", "1-2": "1-2", "3-4": "3-4", "5+": "5+",
};
const SODA_LABELS: Record<string, string> = {
  "0": "Aucun", "1": "1", "2-3": "2-3", "4+": "4+",
};
const ALCOHOL_LABELS: Record<string, string> = {
  "0": "Aucun", "1-3": "1-3 verres/sem", "4-7": "4-7 verres/sem", "8+": "8+ verres/sem",
};
const SLEEP_QUALITY_LABELS: Record<string, string> = {
  bad: "😫 Mauvais", meh: "😕 Moyen", ok: "🙂 Correct", great: "😊 Top",
};
const SLEEP_HOURS_LABELS: Record<string, string> = {
  "<6": "Moins de 6 h", "6-7": "6 à 7 h", "7-8": "7 à 8 h", "8+": "Plus de 8 h",
};
const MENTAL_LOAD_LABELS: Record<string, string> = {
  light: "🌿 Légère", ok: "😐 Ça va", heavy: "😰 Lourde", crushed: "🌪️ Écrasante",
};
const JOB_LABELS: Record<string, string> = {
  great: "🌟 Super, j'adore",
  valued: "✨ Plutôt valorisé(e)",
  routine: "🔁 Dans la routine",
  demotivated: "😞 Démotivé(e)",
  lost: "🌧️ Perdu(e) / en transition",
};
const CIRCLE_LABELS: Record<string, string> = {
  family: "👨‍👩‍👧 Famille soutien",
  couple: "💑 En couple",
  friends: "👥 Entouré(e) d'amis",
  alone: "🌿 Plutôt seul(e)",
};
const SPORT_FREQ_LABELS: Record<string, string> = {
  never: "Jamais",
  "1x": "1× / semaine",
  "2-3x": "2-3× / semaine",
  "4+x": "4× et + / semaine",
};
const CONTACT_PREF_LABELS: Record<string, string> = {
  phone: "📞 Téléphone",
  email: "📧 Email",
  whatsapp: "💬 WhatsApp",
};

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="ldbs-section">
      <h3 className="ldbs-section-title">{title}</h3>
      <div className="ldbs-section-body">{children}</div>
    </section>
  );
}

export function LeadDetailBilanSections({ bilan }: { bilan: OnlineBilanRow }) {
  const payload = bilan.payload ?? {};
  // V1 legacy (avant 2026-05-27)
  const habits = (payload.habits as Record<string, unknown>) ?? {};
  const previousAttempts = Array.isArray(payload.previous_attempts)
    ? (payload.previous_attempts as string[])
    : [];
  const previousAttemptsResult = (payload.previous_attempts_result as string | null) ?? null;
  const budget = payload.budget as string | undefined;
  const activeDaily = payload.active_daily as boolean | undefined;
  const activeDailyDetail = payload.active_daily_detail as string | null | undefined;
  // V2 (chantier "bilan online V2")
  const currentActions = Array.isArray(payload.current_actions)
    ? (payload.current_actions as string[])
    : [];
  const currentActionsDetail = (payload.current_actions_detail as string | null) ?? null;
  const meals = (payload.meals as Record<string, unknown>) ?? {};
  const sleepMind = (payload.sleep_mind as Record<string, unknown>) ?? {};
  const life = (payload.life as Record<string, unknown>) ?? {};
  const finalize = (payload.finalize as Record<string, unknown>) ?? {};
  const hasV2Meals = !!meals.balanced || !!meals.water_per_day;
  const hasV2SleepMind = !!sleepMind.quality || !!sleepMind.hours;
  const hasV2Life = !!life.job_feeling || !!life.social_circle;
  const hasV2Finalize = !!finalize.sport_frequency || !!finalize.contact_pref;

  return (
    <>
      <style>{STYLES}</style>

      <Section title="Objectifs">
        <div className="ldbs-tags">
          {bilan.objectives.map((o) => (
            <span key={o} className="ldbs-tag">{OBJECTIVE_LABELS[o] ?? o}</span>
          ))}
        </div>
        {bilan.weight_loss_target_kg != null && (
          <p className="ldbs-line">
            <strong>Cible :</strong> –{bilan.weight_loss_target_kg} kg
          </p>
        )}
        {bilan.motivation_score != null && (
          <p className="ldbs-line">
            <strong>Motivation :</strong> {bilan.motivation_score}/10
          </p>
        )}
      </Section>

      {(bilan.height_cm != null || bilan.current_weight_kg != null) && (
        <Section title="Profil">
          {bilan.height_cm != null && <p className="ldbs-line">Taille : {bilan.height_cm} cm</p>}
          {bilan.current_weight_kg != null && (
            <p className="ldbs-line">Poids actuel : {bilan.current_weight_kg} kg</p>
          )}
        </Section>
      )}

      {previousAttempts.length > 0 && (
        <Section title="Vécu">
          <div className="ldbs-tags">
            {previousAttempts.map((a) => (
              <span key={a} className="ldbs-tag ldbs-tag-muted">
                {ATTEMPT_LABELS[a] ?? a}
              </span>
            ))}
          </div>
          {previousAttemptsResult && (
            <p className="ldbs-quote">« {previousAttemptsResult} »</p>
          )}
        </Section>
      )}

      {(habits.breakfast || habits.lunch || habits.dinner) ? (
        <Section title="Habitudes">
          {habits.breakfast ? (
            <p className="ldbs-line">
              <strong>Petit-déj :</strong>{" "}
              {MEAL_LABELS[String(habits.breakfast)] ?? String(habits.breakfast)}
              {habits.breakfast_other ? ` (${String(habits.breakfast_other)})` : ""}
            </p>
          ) : null}
          {habits.lunch ? (
            <p className="ldbs-line">
              <strong>Midi :</strong> {MEAL_LABELS[String(habits.lunch)] ?? String(habits.lunch)}
            </p>
          ) : null}
          {habits.dinner ? (
            <p className="ldbs-line">
              <strong>Soir :</strong> {MEAL_LABELS[String(habits.dinner)] ?? String(habits.dinner)}
            </p>
          ) : null}
          {typeof habits.fastfood_per_week === "number" && (
            <p className="ldbs-line">
              <strong>Fast-food / semaine :</strong> {String(habits.fastfood_per_week)}
            </p>
          )}
        </Section>
      ) : null}

      {(budget || activeDaily != null) && (
        <Section title="Budget & activité">
          {budget && (
            <p className="ldbs-line"><strong>Budget alim. / jour :</strong> {budget} €</p>
          )}
          {activeDaily != null && (
            <p className="ldbs-line">
              <strong>Actif au quotidien :</strong> {activeDaily ? "Oui" : "Non"}
              {activeDailyDetail ? ` — ${activeDailyDetail}` : ""}
            </p>
          )}
        </Section>
      )}

      {/* === V2 sections (chantier "bilan online V2", 2026-05-27) === */}
      {currentActions.length > 0 && (
        <Section title="Ce qu'iel fait déjà">
          <div className="ldbs-tags">
            {currentActions.map((a) => (
              <span key={a} className="ldbs-tag">
                {CURRENT_ACTION_LABELS[a] ?? a}
              </span>
            ))}
          </div>
          {currentActionsDetail && (
            <p className="ldbs-quote">« {currentActionsDetail} »</p>
          )}
        </Section>
      )}

      {hasV2Meals && (
        <Section title="Assiette & hydratation">
          {meals.balanced != null && (
            <p className="ldbs-line">
              <strong>Repas équilibrés :</strong>{" "}
              {MEALS_BALANCED_LABELS[String(meals.balanced)] ?? String(meals.balanced)}
            </p>
          )}
          {meals.water_per_day != null && (
            <p className="ldbs-line">
              <strong>💧 Eau / jour :</strong>{" "}
              {WATER_LABELS[String(meals.water_per_day)] ?? String(meals.water_per_day)}
            </p>
          )}
          {meals.coffee_per_day != null && (
            <p className="ldbs-line">
              <strong>☕ Café / jour :</strong>{" "}
              {COFFEE_LABELS[String(meals.coffee_per_day)] ?? String(meals.coffee_per_day)}
            </p>
          )}
          {meals.soda_per_day != null && (
            <p className="ldbs-line">
              <strong>🥤 Sodas/jus / jour :</strong>{" "}
              {SODA_LABELS[String(meals.soda_per_day)] ?? String(meals.soda_per_day)}
            </p>
          )}
          {meals.alcohol_per_week != null && (
            <p className="ldbs-line">
              <strong>🍷 Alcool / semaine :</strong>{" "}
              {ALCOHOL_LABELS[String(meals.alcohol_per_week)] ?? String(meals.alcohol_per_week)}
            </p>
          )}
        </Section>
      )}

      {hasV2SleepMind && (
        <Section title="Sommeil & tête">
          {sleepMind.quality != null && (
            <p className="ldbs-line">
              <strong>Qualité sommeil :</strong>{" "}
              {SLEEP_QUALITY_LABELS[String(sleepMind.quality)] ?? String(sleepMind.quality)}
            </p>
          )}
          {sleepMind.hours != null && (
            <p className="ldbs-line">
              <strong>Heures / nuit :</strong>{" "}
              {SLEEP_HOURS_LABELS[String(sleepMind.hours)] ?? String(sleepMind.hours)}
            </p>
          )}
          {typeof sleepMind.stress_level === "number" && (
            <p className="ldbs-line">
              <strong>Stress :</strong> {String(sleepMind.stress_level)}/10
            </p>
          )}
          {sleepMind.mental_load != null && (
            <p className="ldbs-line">
              <strong>Charge mentale :</strong>{" "}
              {MENTAL_LOAD_LABELS[String(sleepMind.mental_load)] ?? String(sleepMind.mental_load)}
            </p>
          )}
        </Section>
      )}

      {hasV2Life && (
        <Section title="Job & cercle de vie">
          {life.job_feeling != null && (
            <p className="ldbs-line">
              <strong>Au boulot :</strong>{" "}
              {JOB_LABELS[String(life.job_feeling)] ?? String(life.job_feeling)}
            </p>
          )}
          {life.social_circle != null && (
            <p className="ldbs-line">
              <strong>Entourage :</strong>{" "}
              {CIRCLE_LABELS[String(life.social_circle)] ?? String(life.social_circle)}
            </p>
          )}
        </Section>
      )}

      {hasV2Finalize && (
        <Section title="Activité & préférence contact">
          {finalize.sport_frequency != null && (
            <p className="ldbs-line">
              <strong>🏋️ Sport :</strong>{" "}
              {SPORT_FREQ_LABELS[String(finalize.sport_frequency)] ?? String(finalize.sport_frequency)}
            </p>
          )}
          {finalize.contact_pref != null && (
            <p className="ldbs-line">
              <strong>Préférence contact :</strong>{" "}
              {CONTACT_PREF_LABELS[String(finalize.contact_pref)] ?? String(finalize.contact_pref)}
            </p>
          )}
        </Section>
      )}
    </>
  );
}

const STYLES = `
  .ldbs-section { margin-bottom: 16px; }
  .ldbs-section-title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ls-gold, #C9A84C);
    margin: 0 0 8px 0;
  }
  .ldbs-section-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .ldbs-line { margin: 0; font-size: 14px; line-height: 1.45; }
  .ldbs-line strong { color: var(--ls-text, #0F172A); font-weight: 600; }
  .ldbs-quote {
    margin: 6px 0 0 0;
    font-style: italic;
    color: var(--ls-text-muted, #4B5563);
    padding-left: 10px;
    border-left: 2px solid var(--ls-gold, #C9A84C);
    font-size: 13.5px;
  }
  .ldbs-tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .ldbs-tag {
    background: rgba(45, 212, 191, 0.10);
    color: #0D9488;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12.5px;
    font-weight: 500;
  }
  .ldbs-tag-muted {
    background: rgba(107, 114, 128, 0.10);
    color: #4B5563;
  }
`;
