-- =============================================================================
-- Chantier Boutique HL SKIN — Étape 3 : codes promo par distri (2026-07-10)
-- =============================================================================
--
-- Chaque distributrice crée SES propres codes promo (nom + %, ex WELCOME5 −5 %)
-- depuis son cockpit boutique (page config, Étape 6). Validation SERVEUR via
-- RPC publique `validate_promo_code` (le front ne décide jamais du prix / de la
-- remise). L'incrément de `used_count` se fera au paiement confirmé (Étape 4).
--
-- Idempotent.
-- =============================================================================

begin;

create table if not exists public.promo_codes (
  id            uuid primary key default gen_random_uuid(),
  coach_user_id uuid not null references public.users(id) on delete cascade,
  code          text not null,
  kind          text not null default 'percent',   -- 'percent' | 'amount'
  value         numeric(10,2) not null,             -- percent 0-100 OU euros
  active        boolean not null default true,
  max_uses      integer,                            -- null = illimité
  used_count    integer not null default 0,
  starts_at     timestamptz,
  expires_at    timestamptz,
  created_at    timestamptz not null default now()
);

comment on table public.promo_codes is
  'Boutique HL SKIN — codes promo créés par chaque distri. Validation serveur via validate_promo_code. used_count incrémenté au paiement confirmé.';

-- Un code unique par distri (insensible à la casse).
create unique index if not exists promo_codes_owner_code_uidx
  on public.promo_codes (coach_user_id, upper(code));

alter table public.promo_codes enable row level security;

-- La distri gère SES codes. Admin voit tout. Aucun accès anon (validation = RPC).
drop policy if exists promo_codes_owner_all on public.promo_codes;
create policy promo_codes_owner_all
  on public.promo_codes for all to authenticated
  using (coach_user_id = auth.uid()
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
  with check (coach_user_id = auth.uid()
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

-- ─── RPC publique de validation (lecture seule, n'incrémente rien) ──────────
create or replace function public.validate_promo_code(p_coach_user_id uuid, p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v record;
  v_code text;
begin
  if p_coach_user_id is null or coalesce(trim(p_code), '') = '' then
    return jsonb_build_object('valid', false, 'reason', 'missing');
  end if;
  v_code := upper(regexp_replace(p_code, '\s', '', 'g'));

  select * into v
    from public.promo_codes
    where coach_user_id = p_coach_user_id
      and upper(code) = v_code
      and active = true
    limit 1;

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'unknown');
  end if;
  if v.starts_at is not null and now() < v.starts_at then
    return jsonb_build_object('valid', false, 'reason', 'not_started');
  end if;
  if v.expires_at is not null and now() > v.expires_at then
    return jsonb_build_object('valid', false, 'reason', 'expired');
  end if;
  if v.max_uses is not null and v.used_count >= v.max_uses then
    return jsonb_build_object('valid', false, 'reason', 'used_up');
  end if;

  return jsonb_build_object(
    'valid', true,
    'code',  v.code,
    'kind',  v.kind,
    'value', v.value
  );
end;
$$;

comment on function public.validate_promo_code(uuid, text) is
  'Boutique HL SKIN — valide un code promo d''une distri (lecture seule). Renvoie {valid, kind, value} ou {valid:false, reason}. SECURITY DEFINER pour visiteur anonyme.';

grant execute on function public.validate_promo_code(uuid, text) to anon, authenticated;

commit;
