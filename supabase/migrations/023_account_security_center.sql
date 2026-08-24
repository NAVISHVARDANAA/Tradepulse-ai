-- TradePulse AI
-- Migration 023: customer account security posture, MFA evidence and session controls

create table public.account_security_posture (
  user_id uuid primary key references auth.users(id) on delete cascade,
  verified_factor_count smallint not null default 0 check (
    verified_factor_count between 0 and 10
  ),
  verified_factor_types text[] not null default '{}'::text[] check (
    verified_factor_types <@ array['totp', 'phone']::text[]
  ),
  current_assurance_level text not null default 'aal1' check (
    current_assurance_level in ('aal1', 'aal2')
  ),
  next_assurance_level text not null default 'aal1' check (
    next_assurance_level in ('aal1', 'aal2')
  ),
  security_state text not null default 'standard' check (
    security_state in ('standard', 'step_up_required', 'verified')
  ),
  posture_revision bigint not null default 1 check (posture_revision > 0),
  last_step_up_at timestamptz,
  last_synced_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.account_security_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'posture_initialized',
      'mfa_enrolled',
      'mfa_removed',
      'step_up_required',
      'step_up_verified',
      'other_sessions_revoked'
    )
  ),
  summary text not null check (length(summary) between 1 and 160),
  posture_revision bigint not null check (posture_revision > 0),
  evidence jsonb not null default '{}'::jsonb check (
    jsonb_typeof(evidence) = 'object'
    and pg_column_size(evidence) <= 2048
  ),
  occurred_at timestamptz not null default now()
);

create index account_security_events_user_time
  on public.account_security_events(user_id, occurred_at desc);

alter table public.account_security_posture enable row level security;
alter table public.account_security_events enable row level security;

create policy "Users read their account security posture"
  on public.account_security_posture for select to authenticated
  using (user_id = auth.uid());

create policy "Users read their account security history"
  on public.account_security_events for select to authenticated
  using (user_id = auth.uid());

revoke all on table public.account_security_posture from anon, authenticated;
revoke all on table public.account_security_events from anon, authenticated;
grant select on table public.account_security_posture to authenticated;
grant select on table public.account_security_events to authenticated;

create or replace function public.prevent_account_security_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  -- Preserve privacy deletion: the auth-user cascade is the only allowed delete.
  if tg_op = 'DELETE' and not exists (
    select 1 from auth.users where id = old.user_id
  ) then
    return old;
  end if;

  raise exception 'Account security evidence is append-only';
end;
$$;

create trigger account_security_events_append_only
  before update or delete on public.account_security_events
  for each row execute function public.prevent_account_security_event_mutation();

create or replace function public.sync_account_security_posture(
  p_user_id uuid,
  p_verified_factor_count integer,
  p_verified_factor_types text[],
  p_current_assurance_level text,
  p_next_assurance_level text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_existing public.account_security_posture%rowtype;
  v_next_state text;
  v_factor_types text[];
  v_revision bigint;
  v_last_step_up_at timestamptz;
begin
  if auth.role() <> 'service_role' then
    raise exception 'This operation requires the trusted account security service';
  end if;

  v_factor_types := array(
    select distinct factor_type
    from unnest(coalesce(p_verified_factor_types, '{}'::text[])) factor_type
    where factor_type in ('totp', 'phone')
    order by factor_type
  );

  if
    p_user_id is null
    or p_verified_factor_count not between 0 and 10
    or cardinality(v_factor_types) > p_verified_factor_count
    or p_current_assurance_level not in ('aal1', 'aal2')
    or p_next_assurance_level not in ('aal1', 'aal2')
    or (p_verified_factor_count = 0 and cardinality(v_factor_types) <> 0)
    or (p_verified_factor_count > 0 and cardinality(v_factor_types) = 0)
  then
    raise exception 'Invalid account security posture';
  end if;

  v_next_state := case
    when p_verified_factor_count = 0 then 'standard'
    when p_current_assurance_level = 'aal2' then 'verified'
    else 'step_up_required'
  end;

  select * into v_existing
  from public.account_security_posture
  where user_id = p_user_id
  for update;

  if not found then
    v_revision := 1;
    v_last_step_up_at := case
      when v_next_state = 'verified' then v_now
      else null
    end;

    insert into public.account_security_posture (
      user_id,
      verified_factor_count,
      verified_factor_types,
      current_assurance_level,
      next_assurance_level,
      security_state,
      posture_revision,
      last_step_up_at,
      last_synced_at,
      updated_at
    ) values (
      p_user_id,
      p_verified_factor_count,
      v_factor_types,
      p_current_assurance_level,
      p_next_assurance_level,
      v_next_state,
      v_revision,
      v_last_step_up_at,
      v_now,
      v_now
    );

    insert into public.account_security_events (
      user_id,
      event_type,
      summary,
      posture_revision,
      evidence,
      occurred_at
    ) values (
      p_user_id,
      'posture_initialized',
      'Account security posture initialized',
      v_revision,
      jsonb_build_object(
        'verifiedFactorCount', p_verified_factor_count,
        'securityState', v_next_state
      ),
      v_now
    );
  else
    v_revision := v_existing.posture_revision + case
      when
        v_existing.verified_factor_count <> p_verified_factor_count
        or v_existing.verified_factor_types <> v_factor_types
        or v_existing.current_assurance_level <> p_current_assurance_level
        or v_existing.next_assurance_level <> p_next_assurance_level
        or v_existing.security_state <> v_next_state
      then 1
      else 0
    end;

    v_last_step_up_at := case
      when v_next_state = 'verified'
        and v_existing.security_state <> 'verified'
      then v_now
      else v_existing.last_step_up_at
    end;

    update public.account_security_posture set
      verified_factor_count = p_verified_factor_count,
      verified_factor_types = v_factor_types,
      current_assurance_level = p_current_assurance_level,
      next_assurance_level = p_next_assurance_level,
      security_state = v_next_state,
      posture_revision = v_revision,
      last_step_up_at = v_last_step_up_at,
      last_synced_at = v_now,
      updated_at = case
        when v_revision <> v_existing.posture_revision then v_now
        else updated_at
      end
    where user_id = p_user_id;

    if v_existing.verified_factor_count = 0 and p_verified_factor_count > 0 then
      insert into public.account_security_events (
        user_id, event_type, summary, posture_revision, evidence, occurred_at
      ) values (
        p_user_id,
        'mfa_enrolled',
        'Authenticator verification was enabled',
        v_revision,
        jsonb_build_object('verifiedFactorCount', p_verified_factor_count),
        v_now
      );
    elsif v_existing.verified_factor_count > 0 and p_verified_factor_count = 0 then
      insert into public.account_security_events (
        user_id, event_type, summary, posture_revision, evidence, occurred_at
      ) values (
        p_user_id,
        'mfa_removed',
        'Authenticator verification was removed',
        v_revision,
        jsonb_build_object('verifiedFactorCount', 0),
        v_now
      );
    end if;

    if
      v_existing.security_state <> 'step_up_required'
      and v_next_state = 'step_up_required'
    then
      insert into public.account_security_events (
        user_id, event_type, summary, posture_revision, evidence, occurred_at
      ) values (
        p_user_id,
        'step_up_required',
        'Additional verification is required for this session',
        v_revision,
        jsonb_build_object('nextAssuranceLevel', p_next_assurance_level),
        v_now
      );
    elsif
      v_existing.security_state <> 'verified'
      and v_next_state = 'verified'
    then
      insert into public.account_security_events (
        user_id, event_type, summary, posture_revision, evidence, occurred_at
      ) values (
        p_user_id,
        'step_up_verified',
        'Additional verification completed',
        v_revision,
        jsonb_build_object('currentAssuranceLevel', p_current_assurance_level),
        v_now
      );
    end if;
  end if;

  return (
    select jsonb_build_object(
      'verifiedFactorCount', posture.verified_factor_count,
      'verifiedFactorTypes', posture.verified_factor_types,
      'currentAssuranceLevel', posture.current_assurance_level,
      'nextAssuranceLevel', posture.next_assurance_level,
      'securityState', posture.security_state,
      'postureRevision', posture.posture_revision,
      'lastStepUpAt', posture.last_step_up_at,
      'lastSyncedAt', posture.last_synced_at
    )
    from public.account_security_posture posture
    where posture.user_id = p_user_id
  );
end;
$$;

create or replace function public.record_account_session_action(
  p_user_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_posture public.account_security_posture%rowtype;
  v_occurred_at timestamptz := clock_timestamp();
begin
  if auth.role() <> 'service_role' then
    raise exception 'This operation requires the trusted account security service';
  end if;

  if p_user_id is null or p_action <> 'other_sessions_revoked' then
    raise exception 'Invalid account session action';
  end if;

  select * into v_posture
  from public.account_security_posture
  where user_id = p_user_id;

  if not found then
    raise exception 'Account security posture must be synchronized first';
  end if;

  insert into public.account_security_events (
    user_id,
    event_type,
    summary,
    posture_revision,
    evidence,
    occurred_at
  ) values (
    p_user_id,
    'other_sessions_revoked',
    'Other signed-in sessions were revoked',
    v_posture.posture_revision,
    jsonb_build_object('currentSessionPreserved', true),
    v_occurred_at
  );

  return jsonb_build_object(
    'recorded', true,
    'occurredAt', v_occurred_at
  );
end;
$$;

revoke all on function public.sync_account_security_posture(uuid, integer, text[], text, text)
  from public, anon, authenticated;
grant execute on function public.sync_account_security_posture(uuid, integer, text[], text, text)
  to service_role;

revoke all on function public.record_account_session_action(uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_account_session_action(uuid, text)
  to service_role;

insert into public.account_security_posture (user_id)
select profile.id
from public.profiles profile
on conflict (user_id) do nothing;

insert into public.account_security_events (
  user_id,
  event_type,
  summary,
  posture_revision,
  evidence
)
select
  posture.user_id,
  'posture_initialized',
  'Account security posture initialized',
  posture.posture_revision,
  jsonb_build_object(
    'verifiedFactorCount', posture.verified_factor_count,
    'securityState', posture.security_state
  )
from public.account_security_posture posture
where not exists (
  select 1
  from public.account_security_events event
  where event.user_id = posture.user_id
    and event.event_type = 'posture_initialized'
);

create or replace function public.initialize_account_security_posture()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.account_security_posture (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  if found then
    insert into public.account_security_events (
      user_id,
      event_type,
      summary,
      posture_revision,
      evidence
    ) values (
      new.id,
      'posture_initialized',
      'Account security posture initialized',
      1,
      jsonb_build_object(
        'verifiedFactorCount', 0,
        'securityState', 'standard'
      )
    );
  end if;
  return new;
end;
$$;

create trigger on_profile_account_security_initialize
  after insert on public.profiles
  for each row execute function public.initialize_account_security_posture();

comment on table public.account_security_posture is
  'Private, service-synchronized MFA and assurance posture for the signed-in customer.';
comment on table public.account_security_events is
  'Private append-only security history containing no tokens, factor secrets, IP addresses or provider payloads.';
comment on function public.sync_account_security_posture(uuid, integer, text[], text, text) is
  'Service-only synchronization from verified Supabase Auth MFA state.';
comment on function public.record_account_session_action(uuid, text) is
  'Service-only audit recording after a verified session revocation succeeds.';
