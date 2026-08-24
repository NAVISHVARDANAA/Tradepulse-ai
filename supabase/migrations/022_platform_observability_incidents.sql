-- TradePulse AI
-- Migration 022: privacy-safe platform observability, SLO evidence and incident lifecycle

create table public.platform_service_policies (
  service_code text primary key check (
    length(service_code) between 1 and 64
    and service_code ~ '^[a-z0-9][a-z0-9-]*$'
  ),
  display_name text not null check (length(trim(display_name)) between 1 and 80),
  service_category text not null check (
    service_category in ('platform', 'data', 'intelligence', 'simulation', 'integration')
  ),
  customer_visible boolean not null default true,
  monitoring_enabled boolean not null default true,
  freshness_warning_minutes integer not null check (freshness_warning_minutes between 5 and 10080),
  freshness_critical_minutes integer not null check (
    freshness_critical_minutes > freshness_warning_minutes
    and freshness_critical_minutes <= 20160
  ),
  target_availability_bps integer not null check (target_availability_bps between 9000 and 10000),
  target_p95_latency_ms integer check (target_p95_latency_ms between 50 and 60000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.platform_service_policies (
  service_code,
  display_name,
  service_category,
  customer_visible,
  monitoring_enabled,
  freshness_warning_minutes,
  freshness_critical_minutes,
  target_availability_bps,
  target_p95_latency_ms
) values
  ('platform-api', 'TradePulse platform', 'platform', true, true, 15, 45, 9950, 3000),
  ('market-data', 'Market data', 'data', true, true, 180, 720, 9900, 8000),
  ('forecasting', 'Forecast intelligence', 'intelligence', true, true, 1440, 2880, 9900, 12000),
  ('broker-sandbox', 'Broker sandbox readiness', 'integration', false, true, 1560, 4320, 9900, 12000),
  ('paper-simulation', 'Paper investing simulation', 'simulation', false, false, 60, 240, 9900, 5000),
  ('payment-sandbox', 'Payment quote sandbox', 'simulation', false, false, 60, 240, 9900, 5000);

create table public.platform_health_evidence (
  id bigint generated always as identity primary key,
  service_code text not null references public.platform_service_policies(service_code),
  status text not null check (status in ('operational', 'degraded', 'outage', 'not_run')),
  evidence_code text not null check (
    length(evidence_code) between 1 and 64
    and evidence_code ~ '^[a-z0-9][a-z0-9_]*$'
  ),
  latency_ms integer check (latency_ms between 0 and 120000),
  freshness_seconds integer check (freshness_seconds between 0 and 1209600),
  evidence_count integer not null default 0 check (evidence_count between 0 and 100000000),
  observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (observed_at <= created_at + interval '5 minutes')
);

create index platform_health_evidence_service_observed
  on public.platform_health_evidence(service_code, observed_at desc);
create index platform_health_evidence_retention
  on public.platform_health_evidence(created_at);

create table public.platform_incidents (
  id bigint generated always as identity primary key,
  service_code text not null references public.platform_service_policies(service_code),
  incident_code text not null check (
    length(incident_code) between 1 and 64
    and incident_code ~ '^[a-z0-9][a-z0-9_]*$'
  ),
  severity text not null check (severity in ('minor', 'major', 'critical')),
  status text not null check (status in ('investigating', 'monitoring', 'resolved')),
  public_title text not null check (length(trim(public_title)) between 1 and 120),
  public_message text not null check (length(trim(public_message)) between 1 and 500),
  occurrence_count integer not null default 1 check (occurrence_count > 0),
  started_at timestamptz not null,
  last_detected_at timestamptz not null,
  next_update_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'resolved' and resolved_at is not null)
    or (status <> 'resolved' and resolved_at is null)
  )
);

create unique index platform_incidents_one_open_per_service
  on public.platform_incidents(service_code)
  where status <> 'resolved';
create index platform_incidents_service_started
  on public.platform_incidents(service_code, started_at desc);

create table public.platform_incident_events (
  id bigint generated always as identity primary key,
  incident_id bigint not null references public.platform_incidents(id),
  event_type text not null check (event_type in ('opened', 'severity_changed', 'resolved')),
  severity text not null check (severity in ('minor', 'major', 'critical')),
  incident_status text not null check (incident_status in ('investigating', 'monitoring', 'resolved')),
  occurred_at timestamptz not null default now()
);

create index platform_incident_events_incident_time
  on public.platform_incident_events(incident_id, occurred_at desc);

create table public.platform_public_status_snapshots (
  service_code text primary key references public.platform_service_policies(service_code),
  display_name text not null,
  service_category text not null,
  current_status text not null check (
    current_status in ('operational', 'degraded', 'outage', 'initializing')
  ),
  public_title text,
  public_message text,
  last_checked_at timestamptz,
  next_update_at timestamptz,
  freshness_warning_minutes integer not null,
  freshness_critical_minutes integer not null,
  target_availability_bps integer not null,
  observed_availability_bps integer check (observed_availability_bps between 0 and 10000),
  error_budget_remaining_bps integer,
  evidence_count_30d integer not null default 0 check (evidence_count_30d >= 0),
  updated_at timestamptz not null default now()
);

alter table public.platform_service_policies enable row level security;
alter table public.platform_health_evidence enable row level security;
alter table public.platform_incidents enable row level security;
alter table public.platform_incident_events enable row level security;
alter table public.platform_public_status_snapshots enable row level security;

create policy "Public reads customer-safe platform status"
  on public.platform_public_status_snapshots
  for select to anon, authenticated
  using (true);

revoke all on public.platform_service_policies from anon, authenticated;
revoke all on public.platform_health_evidence from anon, authenticated;
revoke all on public.platform_incidents from anon, authenticated;
revoke all on public.platform_incident_events from anon, authenticated;
revoke insert, update, delete on public.platform_public_status_snapshots
  from anon, authenticated, service_role;
revoke insert, update, delete on public.platform_health_evidence
  from anon, authenticated, service_role;
revoke insert, update, delete on public.platform_incidents
  from anon, authenticated, service_role;
revoke insert, update, delete on public.platform_incident_events
  from anon, authenticated, service_role;
grant select on public.platform_public_status_snapshots to anon, authenticated;

create or replace view public.platform_public_status
with (security_invoker = true, security_barrier = true)
as
select
  snapshot.service_code,
  snapshot.display_name,
  snapshot.service_category,
  case
    when snapshot.last_checked_at is null then 'initializing'
    when snapshot.last_checked_at < now() - make_interval(mins => snapshot.freshness_critical_minutes)
      then 'outage'
    when snapshot.last_checked_at < now() - make_interval(mins => snapshot.freshness_warning_minutes)
      and snapshot.current_status = 'operational' then 'degraded'
    else snapshot.current_status
  end as current_status,
  case
    when snapshot.last_checked_at is null then 'Status monitoring is initializing'
    when snapshot.last_checked_at < now() - make_interval(mins => snapshot.freshness_critical_minutes)
      then 'Status evidence is delayed'
    when snapshot.last_checked_at < now() - make_interval(mins => snapshot.freshness_warning_minutes)
      and snapshot.current_status = 'operational' then 'Status evidence is delayed'
    else snapshot.public_title
  end as public_title,
  case
    when snapshot.last_checked_at is null then 'No customer action is required.'
    when snapshot.last_checked_at < now() - make_interval(mins => snapshot.freshness_warning_minutes)
      and snapshot.current_status = 'operational'
      then 'We are refreshing service health evidence. Product safeguards remain active.'
    else snapshot.public_message
  end as public_message,
  snapshot.last_checked_at,
  snapshot.next_update_at,
  snapshot.target_availability_bps,
  snapshot.observed_availability_bps,
  snapshot.error_budget_remaining_bps,
  snapshot.evidence_count_30d,
  snapshot.updated_at
from public.platform_public_status_snapshots snapshot;

grant select on public.platform_public_status to anon, authenticated;

insert into public.platform_public_status_snapshots (
  service_code,
  display_name,
  service_category,
  current_status,
  public_title,
  public_message,
  freshness_warning_minutes,
  freshness_critical_minutes,
  target_availability_bps
)
select
  policy.service_code,
  policy.display_name,
  policy.service_category,
  'initializing',
  'Status monitoring is initializing',
  'No customer action is required.',
  policy.freshness_warning_minutes,
  policy.freshness_critical_minutes,
  policy.target_availability_bps
from public.platform_service_policies policy
where policy.customer_visible;

create or replace function public.record_platform_service_health(
  p_service_code text,
  p_status text,
  p_evidence_code text,
  p_latency_ms integer default null,
  p_freshness_seconds integer default null,
  p_evidence_count integer default 0,
  p_observed_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_policy public.platform_service_policies%rowtype;
  v_incident public.platform_incidents%rowtype;
  v_previous_severity text;
  v_severity text;
  v_title text;
  v_message text;
  v_availability_bps integer;
  v_observation_count integer;
  v_error_budget_remaining_bps integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'This operation requires the platform reliability service';
  end if;

  select * into v_policy
  from public.platform_service_policies
  where service_code = p_service_code
    and monitoring_enabled;

  if v_policy.service_code is null then
    raise exception 'Unknown or disabled platform service policy';
  end if;

  if p_status not in ('operational', 'degraded', 'outage', 'not_run')
    or p_evidence_code is null
    or length(p_evidence_code) not between 1 and 64
    or p_evidence_code !~ '^[a-z0-9][a-z0-9_]*$'
    or p_observed_at > now() + interval '5 minutes'
    or p_latency_ms is not null and p_latency_ms not between 0 and 120000
    or p_freshness_seconds is not null and p_freshness_seconds not between 0 and 1209600
    or p_evidence_count not between 0 and 100000000 then
    raise exception 'Invalid platform health evidence';
  end if;

  insert into public.platform_health_evidence (
    service_code,
    status,
    evidence_code,
    latency_ms,
    freshness_seconds,
    evidence_count,
    observed_at
  ) values (
    p_service_code,
    p_status,
    p_evidence_code,
    p_latency_ms,
    p_freshness_seconds,
    p_evidence_count,
    p_observed_at
  );

  if p_status = 'operational' then
    for v_incident in
      with resolved as (
        update public.platform_incidents
        set
          status = 'resolved',
          resolved_at = p_observed_at,
          last_detected_at = p_observed_at,
          updated_at = now()
        where service_code = p_service_code
          and status <> 'resolved'
        returning *
      )
      select * from resolved
    loop
      insert into public.platform_incident_events (
        incident_id,
        event_type,
        severity,
        incident_status,
        occurred_at
      ) values (
        v_incident.id,
        'resolved',
        v_incident.severity,
        'resolved',
        p_observed_at
      );
    end loop;
  elsif p_status in ('degraded', 'outage') then
    v_severity := case when p_status = 'outage' then 'critical' else 'major' end;
    v_title := case
      when p_status = 'outage' then v_policy.display_name || ' disruption'
      else v_policy.display_name || ' delays'
    end;
    v_message := case
      when p_status = 'outage'
        then 'This service is temporarily unavailable. Safeguards remain active while we investigate.'
      else 'Some customers may experience delays. We are investigating and safeguards remain active.'
    end;

    select * into v_incident
    from public.platform_incidents
    where service_code = p_service_code
      and status <> 'resolved'
    for update;

    if v_incident.id is null then
      insert into public.platform_incidents (
        service_code,
        incident_code,
        severity,
        status,
        public_title,
        public_message,
        started_at,
        last_detected_at,
        next_update_at
      ) values (
        p_service_code,
        'service_health',
        v_severity,
        'investigating',
        v_title,
        v_message,
        p_observed_at,
        p_observed_at,
        p_observed_at + interval '30 minutes'
      ) returning * into v_incident;

      insert into public.platform_incident_events (
        incident_id,
        event_type,
        severity,
        incident_status,
        occurred_at
      ) values (
        v_incident.id,
        'opened',
        v_incident.severity,
        v_incident.status,
        p_observed_at
      );
    else
      v_previous_severity := v_incident.severity;

      update public.platform_incidents
      set
        severity = v_severity,
        public_title = v_title,
        public_message = v_message,
        occurrence_count = occurrence_count + 1,
        last_detected_at = p_observed_at,
        next_update_at = p_observed_at + interval '30 minutes',
        updated_at = now()
      where id = v_incident.id
      returning * into v_incident;

      if v_previous_severity <> v_incident.severity then
        insert into public.platform_incident_events (
          incident_id,
          event_type,
          severity,
          incident_status,
          occurred_at
        ) values (
          v_incident.id,
          'severity_changed',
          v_incident.severity,
          v_incident.status,
          p_observed_at
        );
      end if;
    end if;
  end if;

  select
    count(*)::integer,
    case
      when count(*) = 0 then null
      else round(10000.0 * count(*) filter (where status = 'operational') / count(*))::integer
    end
  into v_observation_count, v_availability_bps
  from public.platform_health_evidence
  where service_code = p_service_code
    and status <> 'not_run'
    and observed_at >= p_observed_at - interval '30 days';

  v_error_budget_remaining_bps := case
    when v_availability_bps is null then null
    else (10000 - v_policy.target_availability_bps) - (10000 - v_availability_bps)
  end;

  if v_policy.customer_visible then
    select * into v_incident
    from public.platform_incidents
    where service_code = p_service_code
      and status <> 'resolved'
    order by started_at desc
    limit 1;

    insert into public.platform_public_status_snapshots (
      service_code,
      display_name,
      service_category,
      current_status,
      public_title,
      public_message,
      last_checked_at,
      next_update_at,
      freshness_warning_minutes,
      freshness_critical_minutes,
      target_availability_bps,
      observed_availability_bps,
      error_budget_remaining_bps,
      evidence_count_30d,
      updated_at
    ) values (
      v_policy.service_code,
      v_policy.display_name,
      v_policy.service_category,
      case
        when v_incident.id is not null and v_incident.severity = 'critical' then 'outage'
        when v_incident.id is not null then 'degraded'
        when p_status = 'not_run' then 'initializing'
        else p_status
      end,
      coalesce(v_incident.public_title, case
        when p_status = 'operational' then 'Operating normally'
        when p_status = 'not_run' then 'Status monitoring is initializing'
        else v_policy.display_name || ' is under review'
      end),
      coalesce(v_incident.public_message, case
        when p_status = 'operational' then 'No customer action is required.'
        when p_status = 'not_run' then 'No customer action is required.'
        else 'We are investigating and safeguards remain active.'
      end),
      p_observed_at,
      v_incident.next_update_at,
      v_policy.freshness_warning_minutes,
      v_policy.freshness_critical_minutes,
      v_policy.target_availability_bps,
      v_availability_bps,
      v_error_budget_remaining_bps,
      v_observation_count,
      now()
    )
    on conflict (service_code) do update set
      display_name = excluded.display_name,
      service_category = excluded.service_category,
      current_status = excluded.current_status,
      public_title = excluded.public_title,
      public_message = excluded.public_message,
      last_checked_at = excluded.last_checked_at,
      next_update_at = excluded.next_update_at,
      freshness_warning_minutes = excluded.freshness_warning_minutes,
      freshness_critical_minutes = excluded.freshness_critical_minutes,
      target_availability_bps = excluded.target_availability_bps,
      observed_availability_bps = excluded.observed_availability_bps,
      error_budget_remaining_bps = excluded.error_budget_remaining_bps,
      evidence_count_30d = excluded.evidence_count_30d,
      updated_at = excluded.updated_at;
  end if;

  return jsonb_build_object(
    'serviceCode', p_service_code,
    'status', p_status,
    'evidenceCode', p_evidence_code,
    'observedAt', p_observed_at,
    'availabilityBps30d', v_availability_bps,
    'errorBudgetRemainingBps', v_error_budget_remaining_bps
  );
end;
$$;

revoke all on function public.record_platform_service_health(
  text, text, text, integer, integer, integer, timestamptz
) from public, anon, authenticated;
grant execute on function public.record_platform_service_health(
  text, text, text, integer, integer, integer, timestamptz
) to service_role;

create or replace function public.evaluate_platform_reliability()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_started_at timestamptz := clock_timestamp();
  v_policy public.platform_service_policies%rowtype;
  v_latest_status text;
  v_latest_at timestamptz;
  v_freshness_seconds integer;
  v_health_status text;
  v_evidence_code text;
  v_evidence_count integer;
  v_broker_status text;
  v_results jsonb := '[]'::jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'This operation requires the platform reliability service';
  end if;

  if exists (
    select 1 from public.broker_provider_registry
    where account_connection_enabled or live_order_routing_enabled
  ) or exists (
    select 1 from public.brokerage_execution_controls
    where execution_enabled
  ) or exists (
    select 1 from public.investment_instruments
    where live_execution_enabled
  ) then
    raise exception 'Platform reliability evaluation requires all live execution routes disabled';
  end if;

  v_results := v_results || jsonb_build_array(public.record_platform_service_health(
    'platform-api',
    'operational',
    'reliability_evaluator_reached',
    greatest(0, floor(extract(epoch from clock_timestamp() - v_started_at) * 1000)::integer),
    0,
    1,
    v_now
  ));

  select * into v_policy
  from public.platform_service_policies
  where service_code = 'market-data';

  select status, coalesce(completed_at, started_at)
  into v_latest_status, v_latest_at
  from public.data_sync_runs
  order by started_at desc
  limit 1;

  if v_latest_at is null then
    v_health_status := 'not_run';
    v_evidence_code := 'sync_not_run';
    v_freshness_seconds := null;
  else
    v_freshness_seconds := greatest(0, floor(extract(epoch from v_now - v_latest_at))::integer);
    v_health_status := case
      when v_latest_status = 'failed' then 'outage'
      when v_latest_status in ('partial', 'running') then 'degraded'
      when v_freshness_seconds >= v_policy.freshness_critical_minutes * 60 then 'outage'
      when v_freshness_seconds >= v_policy.freshness_warning_minutes * 60 then 'degraded'
      else 'operational'
    end;
    v_evidence_code := case
      when v_latest_status = 'failed' then 'sync_failed'
      when v_latest_status = 'partial' then 'sync_partial'
      when v_latest_status = 'running' then 'sync_running'
      when v_health_status = 'outage' then 'sync_critically_stale'
      when v_health_status = 'degraded' then 'sync_stale'
      else 'sync_fresh'
    end;
  end if;

  select count(*)::integer into v_evidence_count from public.data_sync_runs;
  v_results := v_results || jsonb_build_array(public.record_platform_service_health(
    'market-data', v_health_status, v_evidence_code, null,
    v_freshness_seconds, v_evidence_count, v_now
  ));

  select * into v_policy
  from public.platform_service_policies
  where service_code = 'forecasting';

  select max(generated_at), count(*)::integer
  into v_latest_at, v_evidence_count
  from public.market_forecasts;

  if v_latest_at is null then
    v_health_status := 'not_run';
    v_evidence_code := 'forecast_not_run';
    v_freshness_seconds := null;
  else
    v_freshness_seconds := greatest(0, floor(extract(epoch from v_now - v_latest_at))::integer);
    v_health_status := case
      when v_freshness_seconds >= v_policy.freshness_critical_minutes * 60 then 'outage'
      when v_freshness_seconds >= v_policy.freshness_warning_minutes * 60 then 'degraded'
      else 'operational'
    end;
    v_evidence_code := case
      when v_health_status = 'outage' then 'forecast_critically_stale'
      when v_health_status = 'degraded' then 'forecast_stale'
      else 'forecast_fresh'
    end;
  end if;

  v_results := v_results || jsonb_build_array(public.record_platform_service_health(
    'forecasting', v_health_status, v_evidence_code, null,
    v_freshness_seconds, coalesce(v_evidence_count, 0), v_now
  ));

  select operational_status
  into v_broker_status
  from public.broker_operations_health
  where provider_code = 'alpaca-broker-sandbox'
  limit 1;

  v_health_status := case v_broker_status
    when 'healthy' then 'operational'
    when 'warning' then 'degraded'
    when 'critical' then 'outage'
    else 'not_run'
  end;
  v_evidence_code := case v_broker_status
    when 'healthy' then 'broker_healthy'
    when 'warning' then 'broker_warning'
    when 'critical' then 'broker_critical'
    else 'broker_not_run'
  end;

  v_results := v_results || jsonb_build_array(public.record_platform_service_health(
    'broker-sandbox', v_health_status, v_evidence_code, null, null,
    case when v_broker_status is null or v_broker_status = 'not_run' then 0 else 1 end,
    v_now
  ));

  return jsonb_build_object(
    'evaluatedAt', v_now,
    'services', v_results,
    'liveOrderRoutingEnabled', false,
    'fundMovementEnabled', false
  );
end;
$$;

revoke all on function public.evaluate_platform_reliability()
  from public, anon, authenticated;
grant execute on function public.evaluate_platform_reliability()
  to service_role;

create extension if not exists pg_cron;

create or replace function public.run_platform_reliability_cron()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if session_user <> 'postgres' then
    raise exception 'This operation is restricted to the database scheduler';
  end if;

  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform public.evaluate_platform_reliability();
end;
$$;

revoke all on function public.run_platform_reliability_cron()
  from public, anon, authenticated, service_role;

select cron.schedule(
  'tradepulse-platform-reliability',
  '*/5 * * * *',
  'select public.run_platform_reliability_cron();'
);

create or replace function public.purge_platform_health_evidence(
  p_before timestamptz default now() - interval '90 days'
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_deleted integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'This operation requires the platform reliability service';
  end if;

  if p_before > now() - interval '30 days' then
    raise exception 'At least 30 days of health evidence must be retained';
  end if;

  delete from public.platform_health_evidence
  where created_at < p_before;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.purge_platform_health_evidence(timestamptz)
  from public, anon, authenticated;
grant execute on function public.purge_platform_health_evidence(timestamptz)
  to service_role;

comment on table public.platform_health_evidence is
  'Append-only sanitized service observations. No requests, identities, credentials, provider payloads or financial data.';
comment on table public.platform_incident_events is
  'Append-only incident transition evidence for response and recovery review.';
comment on view public.platform_public_status is
  'Customer-safe current status with dynamic freshness degradation and rolling SLO evidence.';
comment on function public.evaluate_platform_reliability() is
  'Consolidates trusted internal evidence while preserving all execution and fund-movement locks.';
