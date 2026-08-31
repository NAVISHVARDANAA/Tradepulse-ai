-- TradePulse AI
-- Migration 035: bounded approved-tester pilot and staffed escalation intake

create table public.controlled_beta_pilot_cohorts (
  cohort_code text primary key check (cohort_code ~ '^[a-z0-9][a-z0-9-]{2,31}$'),
  display_name text not null check (length(trim(display_name)) between 3 and 80),
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'active', 'paused', 'completed', 'cancelled')),
  max_testers integer not null check (max_testers between 1 and 100),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  terms_version text not null check (terms_version ~ '^pilot-v[0-9]+\.[0-9]+$'),
  feedback_response_target_hours integer not null default 2
    check (feedback_response_target_hours between 1 and 72),
  incident_response_target_minutes integer not null default 30
    check (incident_response_target_minutes between 5 and 1440),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.controlled_beta_pilot_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cohort_code text not null references public.controlled_beta_pilot_cohorts(cohort_code),
  status text not null default 'approved'
    check (status in ('approved', 'active', 'paused', 'completed', 'revoked')),
  approved_at timestamptz not null default now(),
  consented_at timestamptz,
  terms_version_accepted text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'active' or (consented_at is not null and terms_version_accepted is not null))
);

create table public.controlled_beta_pilot_mission_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_code text not null check (mission_code in (
    'trust-review', 'forecast-review', 'paper-simulation', 'support-recovery'
  )),
  completed_at timestamptz not null default now(),
  primary key (user_id, mission_code)
);

create index controlled_beta_pilot_memberships_cohort
  on public.controlled_beta_pilot_memberships(cohort_code, status);

alter table public.controlled_beta_pilot_cohorts enable row level security;
alter table public.controlled_beta_pilot_memberships enable row level security;
alter table public.controlled_beta_pilot_mission_progress enable row level security;

revoke all on public.controlled_beta_pilot_cohorts from anon, authenticated;
revoke all on public.controlled_beta_pilot_memberships from anon, authenticated;
revoke all on public.controlled_beta_pilot_mission_progress from anon, authenticated;

create or replace function public.enforce_controlled_beta_pilot_cohort_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_max_testers integer;
  v_cohort_status text;
  v_current_count integer;
begin
  if new.status not in ('approved', 'active', 'paused') then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.cohort_code, 0));

  select max_testers, status
    into v_max_testers, v_cohort_status
  from public.controlled_beta_pilot_cohorts
  where cohort_code = new.cohort_code
  for update;

  if v_max_testers is null then
    raise exception 'Pilot cohort does not exist';
  end if;
  if v_cohort_status not in ('approved', 'active', 'paused') then
    raise exception 'Pilot cohort is not approved';
  end if;

  if tg_op = 'INSERT' then
    select count(*) into v_current_count
    from public.controlled_beta_pilot_memberships
    where cohort_code = new.cohort_code
      and status in ('approved', 'active', 'paused');
  else
    select count(*) into v_current_count
    from public.controlled_beta_pilot_memberships
    where cohort_code = new.cohort_code
      and status in ('approved', 'active', 'paused')
      and user_id <> old.user_id;
  end if;

  if v_current_count >= v_max_testers then
    raise exception 'Pilot cohort capacity reached';
  end if;

  new.updated_at := clock_timestamp();
  return new;
end;
$$;

create trigger controlled_beta_pilot_cohort_limit
before insert or update of cohort_code, status
on public.controlled_beta_pilot_memberships
for each row execute function public.enforce_controlled_beta_pilot_cohort_limit();

create or replace function public.get_controlled_beta_pilot_status()
returns jsonb
language plpgsql
security definer
stable
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_status jsonb;
begin
  if v_user is null or auth.role() <> 'authenticated' then
    raise exception 'Authentication required';
  end if;

  select jsonb_build_object(
    'eligible', true,
    'cohortCode', cohort.cohort_code,
    'cohortName', cohort.display_name,
    'cohortStatus', cohort.status,
    'membershipStatus', membership.status,
    'startsAt', cohort.starts_at,
    'endsAt', cohort.ends_at,
    'termsVersion', cohort.terms_version,
    'termsAcceptedAt', membership.consented_at,
    'termsVersionAccepted', membership.terms_version_accepted,
    'maxTesters', cohort.max_testers,
    'feedbackResponseTargetHours', cohort.feedback_response_target_hours,
    'incidentResponseTargetMinutes', cohort.incident_response_target_minutes,
    'completedMissions', coalesce((
      select jsonb_agg(progress.mission_code order by progress.mission_code)
      from public.controlled_beta_pilot_mission_progress progress
      where progress.user_id = membership.user_id
    ), '[]'::jsonb)
  ) into v_status
  from public.controlled_beta_pilot_memberships membership
  join public.controlled_beta_pilot_cohorts cohort
    on cohort.cohort_code = membership.cohort_code
  where membership.user_id = v_user;

  return coalesce(v_status, jsonb_build_object('eligible', false));
end;
$$;

create or replace function public.set_controlled_beta_pilot_mission(
  p_mission_code text, p_completed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_active boolean;
begin
  if v_user is null or auth.role() <> 'authenticated' then
    raise exception 'Authentication required';
  end if;
  if p_mission_code not in (
    'trust-review', 'forecast-review', 'paper-simulation', 'support-recovery'
  ) then
    raise exception 'Unsupported pilot mission';
  end if;

  select exists(
    select 1
    from public.controlled_beta_pilot_memberships membership
    join public.controlled_beta_pilot_cohorts cohort
      on cohort.cohort_code = membership.cohort_code
    where membership.user_id = v_user
      and membership.status = 'active'
      and cohort.status = 'active'
      and now() >= cohort.starts_at
      and now() < cohort.ends_at
  ) into v_active;

  if not v_active then
    raise exception 'Active pilot membership required';
  end if;

  if coalesce(p_completed, false) then
    insert into public.controlled_beta_pilot_mission_progress(user_id, mission_code)
    values (v_user, p_mission_code)
    on conflict (user_id, mission_code)
    do update set completed_at = clock_timestamp();
  else
    delete from public.controlled_beta_pilot_mission_progress
    where user_id = v_user and mission_code = p_mission_code;
  end if;

  return public.get_controlled_beta_pilot_status();
end;
$$;

create or replace function public.accept_controlled_beta_pilot_terms(p_terms_version text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_membership public.controlled_beta_pilot_memberships%rowtype;
  v_cohort public.controlled_beta_pilot_cohorts%rowtype;
begin
  if v_user is null or auth.role() <> 'authenticated' then
    raise exception 'Authentication required';
  end if;

  select * into v_membership
  from public.controlled_beta_pilot_memberships
  where user_id = v_user
  for update;

  if v_membership.user_id is null or v_membership.status not in ('approved', 'active') then
    raise exception 'Approved pilot membership required';
  end if;

  select * into v_cohort
  from public.controlled_beta_pilot_cohorts
  where cohort_code = v_membership.cohort_code;

  if v_cohort.status <> 'active' or now() < v_cohort.starts_at or now() >= v_cohort.ends_at then
    raise exception 'Pilot cohort is not active';
  end if;
  if p_terms_version is distinct from v_cohort.terms_version then
    raise exception 'Pilot agreement version is not current';
  end if;

  update public.controlled_beta_pilot_memberships
  set status = 'active',
      consented_at = coalesce(consented_at, clock_timestamp()),
      terms_version_accepted = v_cohort.terms_version,
      updated_at = clock_timestamp()
  where user_id = v_user;

  return public.get_controlled_beta_pilot_status();
end;
$$;

revoke all on function public.get_controlled_beta_pilot_status() from public;
revoke all on function public.accept_controlled_beta_pilot_terms(text) from public;
revoke all on function public.set_controlled_beta_pilot_mission(text, boolean) from public;
grant execute on function public.get_controlled_beta_pilot_status() to authenticated;
grant execute on function public.accept_controlled_beta_pilot_terms(text) to authenticated;
grant execute on function public.set_controlled_beta_pilot_mission(text, boolean) to authenticated;

alter table public.customer_support_requests
  drop constraint if exists customer_support_requests_request_type_check;
alter table public.customer_support_requests
  add constraint customer_support_requests_request_type_check
  check (request_type in (
    'bug', 'product_feedback', 'data_question', 'account_help',
    'pilot_feedback', 'pilot_incident'
  ));

create or replace function public.submit_customer_support_request(
  p_request_type text, p_subject text, p_message text,
  p_customer_rating smallint default null
) returns public.customer_support_requests
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_request public.customer_support_requests;
  v_reference text;
begin
  if v_user is null or auth.role() <> 'authenticated' then
    raise exception 'Authentication required';
  end if;
  if p_request_type not in (
    'bug', 'product_feedback', 'data_question', 'account_help',
    'pilot_feedback', 'pilot_incident'
  ) then
    raise exception 'Unsupported support request type';
  end if;
  if length(trim(p_subject)) not between 3 and 120
    or length(trim(p_message)) not between 10 and 2000 then
    raise exception 'Support request content is outside allowed limits';
  end if;
  if p_customer_rating is not null and p_customer_rating not between 1 and 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;
  if (
    select count(*)
    from public.customer_support_requests
    where user_id = v_user and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Support request limit reached';
  end if;

  v_reference := 'TP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  insert into public.customer_support_requests(
    user_id, request_type, subject, message, customer_rating, support_reference
  ) values (
    v_user, p_request_type, trim(p_subject), trim(p_message),
    p_customer_rating, v_reference
  ) returning * into v_request;
  return v_request;
end;
$$;

revoke all on function public.submit_customer_support_request(text, text, text, smallint) from public;
grant execute on function public.submit_customer_support_request(text, text, text, smallint) to authenticated;

comment on table public.controlled_beta_pilot_cohorts is
  'Administratively approved, capacity-bounded pilot cohorts. No public signup or browser approval.';
comment on table public.controlled_beta_pilot_memberships is
  'Private tester-to-cohort assignments provisioned outside the browser. Customers may only accept the current agreement through the guarded RPC.';
comment on table public.controlled_beta_pilot_mission_progress is
  'Private completion evidence for the four approved pilot missions. It contains no portfolio, order, quote, payment or identity payload.';
