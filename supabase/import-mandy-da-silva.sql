with distributor_profile as (
  select id, name
  from public.users
  where id = 'f5285ea5-9521-4e0d-8e09-523e310c494f'
  limit 1
),
existing_client as (
  select id
  from public.clients
  where first_name = 'Mandy'
    and last_name = 'Da Silva'
  limit 1
),
inserted_client as (
  insert into public.clients (
    first_name,
    last_name,
    sex,
    phone,
    email,
    age,
    height,
    job,
    city,
    distributor_id,
    distributor_name,
    status,
    objective,
    current_program,
    started,
    start_date,
    next_follow_up,
    notes
  )
  select
    'Mandy',
    'Da Silva',
    'female',
    '0769409822',
    '',
    28,
    159,
    '',
    'Forges-sur-Meuse',
    distributor_profile.id,
    distributor_profile.name,
    'follow-up',
    'weight-loss',
    'Programme Premium',
    true,
    date '2026-02-13',
    timestamptz '2026-04-16 10:00:00+02',
    'Cliente importee depuis l''historique manuel. Objectif perte de poids, cible 58 kg pour juillet.'
  from distributor_profile
  where not exists (select 1 from existing_client)
  returning id
),
client_ref as (
  select id from existing_client
  union all
  select id from inserted_client
)
update public.clients
set
  city = 'Forges-sur-Meuse',
  age = 28,
  height = 159,
  status = 'follow-up',
  objective = 'weight-loss',
  distributor_id = 'f5285ea5-9521-4e0d-8e09-523e310c494f',
  distributor_name = (
    select name from public.users where id = 'f5285ea5-9521-4e0d-8e09-523e310c494f'
  ),
  current_program = 'Programme Premium',
  started = true,
  start_date = date '2026-02-13',
  next_follow_up = timestamptz '2026-04-16 10:00:00+02',
  notes = 'Cliente importee depuis l''historique manuel. Objectif perte de poids, cible 58 kg pour juillet.'
where id in (select id from client_ref);

with client_ref as (
  select id
  from public.clients
  where first_name = 'Mandy'
    and last_name = 'Da Silva'
  limit 1
)
insert into public.assessments (
  id,
  client_id,
  date,
  type,
  objective,
  program_id,
  program_title,
  summary,
  notes,
  next_follow_up,
  body_scan,
  questionnaire,
  pedagogical_focus
)
select
  assessment_id,
  client_ref.id,
  assessment_date,
  assessment_type,
  'weight-loss',
  'p-premium',
  'Programme Premium',
  assessment_summary,
  assessment_notes,
  assessment_next_follow_up,
  body_scan,
  questionnaire,
  '["Hydratation","Routine matin","Assiette perte de poids"]'::jsonb
from client_ref
cross join (
  values
    (
      'ass-mandy-2026-02-13',
      date '2026-02-13',
      'initial',
      'Point de depart du programme premium avec objectif perte de poids.',
      'Bilan de depart importe depuis le tableau historique.',
      timestamptz '2026-02-28 10:00:00+01',
      jsonb_build_object(
        'weight', 74.2,
        'bodyFat', 38.9,
        'muscleMass', 43.1,
        'hydration', 43.4,
        'boneMass', 2.3,
        'visceralFat', 6.0,
        'bmr', 0,
        'metabolicAge', 43
      ),
      jsonb_build_object(
        'healthStatus', '',
        'healthNotes', '',
        'allergies', '',
        'transitStatus', '',
        'pathologyContext', '',
        'wakeUpTime', '',
        'bedTime', '',
        'sleepHours', 0,
        'sleepQuality', '',
        'napFrequency', '',
        'breakfastFrequency', '',
        'breakfastTime', '',
        'breakfastContent', '',
        'breakfastSatiety', '',
        'firstMealTime', '',
        'mealsPerDay', 0,
        'regularMealTimes', '',
        'lunchLocation', '',
        'dinnerTiming', '',
        'vegetablesDaily', '',
        'proteinEachMeal', '',
        'sugaryProducts', '',
        'snackingFrequency', '',
        'snackingMoment', '',
        'cravingsPreference', '',
        'snackingTrigger', '',
        'waterIntake', 0,
        'drinksCoffee', '',
        'coffeePerDay', 0,
        'sweetDrinks', '',
        'alcohol', '',
        'lunchExample', '',
        'dinnerExample', '',
        'physicalActivity', '',
        'activityType', '',
        'sessionsPerWeek', 0,
        'energyLevel', '',
        'pastAttempts', '',
        'hardestPart', '',
        'mainBlocker', '',
        'objectiveFocus', 'Perte de poids',
        'targetWeight', 58,
        'motivation', 0,
        'desiredTimeline', 'Juillet',
        'recommendations', '[]'::jsonb
      )
    ),
    (
      'ass-mandy-2026-02-28',
      date '2026-02-28',
      'follow-up',
      'Premier suivi de progression apres le demarrage.',
      'Suivi importe depuis l''historique manuel.',
      timestamptz '2026-03-12 10:00:00+01',
      jsonb_build_object(
        'weight', 73.0,
        'bodyFat', 37.9,
        'muscleMass', 43.0,
        'hydration', 44.1,
        'boneMass', 2.3,
        'visceralFat', 5.5,
        'bmr', 0,
        'metabolicAge', 43
      ),
      jsonb_build_object(
        'healthStatus', '',
        'healthNotes', '',
        'allergies', '',
        'transitStatus', '',
        'pathologyContext', '',
        'wakeUpTime', '',
        'bedTime', '',
        'sleepHours', 0,
        'sleepQuality', '',
        'napFrequency', '',
        'breakfastFrequency', '',
        'breakfastTime', '',
        'breakfastContent', '',
        'breakfastSatiety', '',
        'firstMealTime', '',
        'mealsPerDay', 0,
        'regularMealTimes', '',
        'lunchLocation', '',
        'dinnerTiming', '',
        'vegetablesDaily', '',
        'proteinEachMeal', '',
        'sugaryProducts', '',
        'snackingFrequency', '',
        'snackingMoment', '',
        'cravingsPreference', '',
        'snackingTrigger', '',
        'waterIntake', 0,
        'drinksCoffee', '',
        'coffeePerDay', 0,
        'sweetDrinks', '',
        'alcohol', '',
        'lunchExample', '',
        'dinnerExample', '',
        'physicalActivity', '',
        'activityType', '',
        'sessionsPerWeek', 0,
        'energyLevel', '',
        'pastAttempts', '',
        'hardestPart', '',
        'mainBlocker', '',
        'objectiveFocus', 'Perte de poids',
        'targetWeight', 58,
        'motivation', 0,
        'desiredTimeline', 'Juillet',
        'recommendations', '[]'::jsonb
      )
    ),
    (
      'ass-mandy-2026-03-12',
      date '2026-03-12',
      'follow-up',
      'Suivi intermediaire de la progression.',
      'Suivi importe depuis l''historique manuel.',
      timestamptz '2026-03-19 10:00:00+01',
      jsonb_build_object(
        'weight', 72.2,
        'bodyFat', 37.4,
        'muscleMass', 42.9,
        'hydration', 44.4,
        'boneMass', 2.3,
        'visceralFat', 5.5,
        'bmr', 0,
        'metabolicAge', 42
      ),
      jsonb_build_object(
        'healthStatus', '',
        'healthNotes', '',
        'allergies', '',
        'transitStatus', '',
        'pathologyContext', '',
        'wakeUpTime', '',
        'bedTime', '',
        'sleepHours', 0,
        'sleepQuality', '',
        'napFrequency', '',
        'breakfastFrequency', '',
        'breakfastTime', '',
        'breakfastContent', '',
        'breakfastSatiety', '',
        'firstMealTime', '',
        'mealsPerDay', 0,
        'regularMealTimes', '',
        'lunchLocation', '',
        'dinnerTiming', '',
        'vegetablesDaily', '',
        'proteinEachMeal', '',
        'sugaryProducts', '',
        'snackingFrequency', '',
        'snackingMoment', '',
        'cravingsPreference', '',
        'snackingTrigger', '',
        'waterIntake', 0,
        'drinksCoffee', '',
        'coffeePerDay', 0,
        'sweetDrinks', '',
        'alcohol', '',
        'lunchExample', '',
        'dinnerExample', '',
        'physicalActivity', '',
        'activityType', '',
        'sessionsPerWeek', 0,
        'energyLevel', '',
        'pastAttempts', '',
        'hardestPart', '',
        'mainBlocker', '',
        'objectiveFocus', 'Perte de poids',
        'targetWeight', 58,
        'motivation', 0,
        'desiredTimeline', 'Juillet',
        'recommendations', '[]'::jsonb
      )
    ),
    (
      'ass-mandy-2026-03-19',
      date '2026-03-19',
      'follow-up',
      'Suivi de progression avec poursuite du programme.',
      'Suivi importe depuis l''historique manuel.',
      timestamptz '2026-04-02 10:00:00+01',
      jsonb_build_object(
        'weight', 73.4,
        'bodyFat', 37.1,
        'muscleMass', 43.8,
        'hydration', 44.7,
        'boneMass', 2.3,
        'visceralFat', 5.5,
        'bmr', 0,
        'metabolicAge', 43
      ),
      jsonb_build_object(
        'healthStatus', '',
        'healthNotes', '',
        'allergies', '',
        'transitStatus', '',
        'pathologyContext', '',
        'wakeUpTime', '',
        'bedTime', '',
        'sleepHours', 0,
        'sleepQuality', '',
        'napFrequency', '',
        'breakfastFrequency', '',
        'breakfastTime', '',
        'breakfastContent', '',
        'breakfastSatiety', '',
        'firstMealTime', '',
        'mealsPerDay', 0,
        'regularMealTimes', '',
        'lunchLocation', '',
        'dinnerTiming', '',
        'vegetablesDaily', '',
        'proteinEachMeal', '',
        'sugaryProducts', '',
        'snackingFrequency', '',
        'snackingMoment', '',
        'cravingsPreference', '',
        'snackingTrigger', '',
        'waterIntake', 0,
        'drinksCoffee', '',
        'coffeePerDay', 0,
        'sweetDrinks', '',
        'alcohol', '',
        'lunchExample', '',
        'dinnerExample', '',
        'physicalActivity', '',
        'activityType', '',
        'sessionsPerWeek', 0,
        'energyLevel', '',
        'pastAttempts', '',
        'hardestPart', '',
        'mainBlocker', '',
        'objectiveFocus', 'Perte de poids',
        'targetWeight', 58,
        'motivation', 0,
        'desiredTimeline', 'Juillet',
        'recommendations', '[]'::jsonb
      )
    ),
    (
      'ass-mandy-2026-04-02',
      date '2026-04-02',
      'follow-up',
      'Dernier releve importe comme point actuel.',
      'Point actuel importe depuis l''historique manuel.',
      timestamptz '2026-04-16 10:00:00+02',
      jsonb_build_object(
        'weight', 71.9,
        'bodyFat', 36.1,
        'muscleMass', 43.4,
        'hydration', 45.1,
        'boneMass', 2.3,
        'visceralFat', 5.5,
        'bmr', 0,
        'metabolicAge', 43
      ),
      jsonb_build_object(
        'healthStatus', '',
        'healthNotes', '',
        'allergies', '',
        'transitStatus', '',
        'pathologyContext', '',
        'wakeUpTime', '',
        'bedTime', '',
        'sleepHours', 0,
        'sleepQuality', '',
        'napFrequency', '',
        'breakfastFrequency', '',
        'breakfastTime', '',
        'breakfastContent', '',
        'breakfastSatiety', '',
        'firstMealTime', '',
        'mealsPerDay', 0,
        'regularMealTimes', '',
        'lunchLocation', '',
        'dinnerTiming', '',
        'vegetablesDaily', '',
        'proteinEachMeal', '',
        'sugaryProducts', '',
        'snackingFrequency', '',
        'snackingMoment', '',
        'cravingsPreference', '',
        'snackingTrigger', '',
        'waterIntake', 0,
        'drinksCoffee', '',
        'coffeePerDay', 0,
        'sweetDrinks', '',
        'alcohol', '',
        'lunchExample', '',
        'dinnerExample', '',
        'physicalActivity', '',
        'activityType', '',
        'sessionsPerWeek', 0,
        'energyLevel', '',
        'pastAttempts', '',
        'hardestPart', '',
        'mainBlocker', '',
        'objectiveFocus', 'Perte de poids',
        'targetWeight', 58,
        'motivation', 0,
        'desiredTimeline', 'Juillet',
        'recommendations', '[]'::jsonb
      )
    )
) as assessment_data (
  assessment_id,
  assessment_date,
  assessment_type,
  assessment_summary,
  assessment_notes,
  assessment_next_follow_up,
  body_scan,
  questionnaire
)
on conflict (id) do update
set
  client_id = excluded.client_id,
  date = excluded.date,
  type = excluded.type,
  objective = excluded.objective,
  program_id = excluded.program_id,
  program_title = excluded.program_title,
  summary = excluded.summary,
  notes = excluded.notes,
  next_follow_up = excluded.next_follow_up,
  body_scan = excluded.body_scan,
  questionnaire = excluded.questionnaire,
  pedagogical_focus = excluded.pedagogical_focus;

with client_ref as (
  select id
  from public.clients
  where first_name = 'Mandy'
    and last_name = 'Da Silva'
  limit 1
)
insert into public.follow_ups (
  client_id,
  client_name,
  due_date,
  type,
  status,
  program_title,
  last_assessment_date
)
select
  client_ref.id,
  'Mandy Da Silva',
  timestamptz '2026-04-16 10:00:00+02',
  'Suivi 15 jours',
  'scheduled',
  'Programme Premium',
  date '2026-04-02'
from client_ref
on conflict (client_id) do update
set
  client_name = excluded.client_name,
  due_date = excluded.due_date,
  type = excluded.type,
  status = excluded.status,
  program_title = excluded.program_title,
  last_assessment_date = excluded.last_assessment_date;
