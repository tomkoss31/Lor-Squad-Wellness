alter table public.clients
alter column next_follow_up type timestamptz
using
  case
    when next_follow_up::text ~ '^\d{4}-\d{2}-\d{2}$' then (next_follow_up::text || ' 10:00:00+02')::timestamptz
    else next_follow_up::timestamptz
  end;

alter table public.assessments
alter column next_follow_up type timestamptz
using
  case
    when next_follow_up is null then null
    when next_follow_up::text ~ '^\d{4}-\d{2}-\d{2}$' then (next_follow_up::text || ' 10:00:00+02')::timestamptz
    else next_follow_up::timestamptz
  end;

alter table public.follow_ups
alter column due_date type timestamptz
using
  case
    when due_date::text ~ '^\d{4}-\d{2}-\d{2}$' then (due_date::text || ' 10:00:00+02')::timestamptz
    else due_date::timestamptz
  end;
