-- TradePulse AI
-- Migration 025: production data trust, reconciliation, and notification consent

create table public.data_quality_policies (
  dataset text primary key check (dataset in ('market_data', 'trade_data', 'sync_operations')),
  freshness_minutes integer not null check (freshness_minutes between 5 and 525600),
  warning_null_percent numeric(5,2) not null check (warning_null_percent between 0 and 100),
  critical_null_percent numeric(5,2) not null check (critical_null_percent between warning_null_percent and 100),
  policy_version text not null check (policy_version ~ '^data-trust-v[0-9]+$'),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.data_quality_policies(dataset, freshness_minutes, warning_null_percent, critical_null_percent, policy_version)
values
  ('market_data', 180, 1, 5, 'data-trust-v1'),
  ('trade_data', 129600, 2, 10, 'data-trust-v1'),
  ('sync_operations', 1440, 0, 1, 'data-trust-v1');

create table public.data_quality_evaluations (
  id bigint generated always as identity primary key,
  dataset text not null references public.data_quality_policies(dataset),
  status text not null check (status in ('healthy', 'warning', 'critical', 'not_run')),
  freshness_minutes integer,
  records_checked integer not null default 0 check (records_checked >= 0),
  null_records integer not null default 0 check (null_records >= 0 and null_records <= records_checked),
  duplicate_groups integer not null default 0 check (duplicate_groups >= 0),
  reconciliation_difference numeric(20,4),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object' and pg_column_size(evidence) <= 4096),
  policy_version text not null,
  evaluated_at timestamptz not null default now()
);

create index data_quality_evaluations_dataset_time on public.data_quality_evaluations(dataset, evaluated_at desc);
alter table public.data_quality_policies enable row level security;
alter table public.data_quality_evaluations enable row level security;
create policy "Customers read data quality policies" on public.data_quality_policies for select to anon, authenticated using (enabled);
create policy "Customers read sanitized data quality evidence" on public.data_quality_evaluations for select to anon, authenticated using (true);
revoke all on public.data_quality_policies from anon, authenticated;
revoke all on public.data_quality_evaluations from anon, authenticated;
grant select on public.data_quality_policies to anon, authenticated;
grant select on public.data_quality_evaluations to anon, authenticated;

create or replace function public.prevent_data_quality_mutation()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin raise exception 'Data-quality evidence is append-only'; end;
$$;
create trigger data_quality_evaluations_append_only before update or delete on public.data_quality_evaluations
for each row execute function public.prevent_data_quality_mutation();

create or replace function public.evaluate_data_quality()
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_policy public.data_quality_policies%rowtype;
  v_records integer;
  v_nulls integer;
  v_duplicates integer;
  v_freshness integer;
  v_status text;
  v_latest timestamptz;
  v_result jsonb := '[]'::jsonb;
begin
  if auth.role() <> 'service_role' then raise exception 'This operation requires the data-trust service'; end if;

  for v_policy in select * from public.data_quality_policies where enabled order by dataset loop
    v_records := 0; v_nulls := 0; v_duplicates := 0; v_freshness := null; v_latest := null;
    if v_policy.dataset = 'market_data' then
      select count(*)::integer, count(*) filter (where price is null)::integer, max(observed_at)
        into v_records, v_nulls, v_latest from public.market_observations where observed_at >= now() - interval '7 days';
      select count(*)::integer into v_duplicates from (
        select asset_id, observed_at, coalesce(source, ''), count(*) from public.market_observations
        where observed_at >= now() - interval '7 days' group by 1,2,3 having count(*) > 1
      ) duplicate_set;
    elsif v_policy.dataset = 'trade_data' then
      select count(*)::integer,
        count(*) filter (where exports_usd is null or imports_usd is null or trade_balance_usd is null)::integer,
        max(period_date)::timestamptz into v_records, v_nulls, v_latest from public.trade_observations;
      select count(*)::integer into v_duplicates from (
        select country_id, period_date, count(*) from public.trade_observations group by 1,2 having count(*) > 1
      ) duplicate_set;
    else
      select count(*)::integer, count(*) filter (where status in ('failed', 'partial'))::integer, max(completed_at)
        into v_records, v_nulls, v_latest from public.data_sync_runs where started_at >= now() - interval '7 days';
    end if;

    if v_latest is not null then v_freshness := greatest(0, floor(extract(epoch from (now() - v_latest)) / 60))::integer; end if;
    v_status := case
      when v_records = 0 or v_latest is null or v_freshness > v_policy.freshness_minutes * 2 or v_duplicates > 0
        or (v_records > 0 and v_nulls * 100.0 / v_records >= v_policy.critical_null_percent) then 'critical'
      when v_freshness > v_policy.freshness_minutes
        or (v_records > 0 and v_nulls * 100.0 / v_records >= v_policy.warning_null_percent) then 'warning'
      else 'healthy' end;

    insert into public.data_quality_evaluations(dataset, status, freshness_minutes, records_checked, null_records, duplicate_groups, evidence, policy_version)
    values (v_policy.dataset, v_status, v_freshness, v_records, v_nulls, v_duplicates,
      jsonb_build_object('window', case when v_policy.dataset = 'trade_data' then 'all_available' else 'seven_days' end,
        'sourceTimestampPresent', v_latest is not null, 'externalDeliveryEnabled', false), v_policy.policy_version);
    v_result := v_result || jsonb_build_array(jsonb_build_object('dataset', v_policy.dataset, 'status', v_status));
  end loop;
  return jsonb_build_object('evaluatedAt', clock_timestamp(), 'datasets', v_result, 'liveExecutionEnabled', false);
end;
$$;
revoke all on function public.evaluate_data_quality() from public;
grant execute on function public.evaluate_data_quality() to service_role;

create or replace function public.run_data_quality_cron()
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if session_user <> 'postgres' then raise exception 'This operation is restricted to the database scheduler'; end if;
  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform public.evaluate_data_quality();
end;
$$;
revoke all on function public.run_data_quality_cron() from public, anon, authenticated, service_role;
select cron.schedule('tradepulse-data-quality', '17 * * * *', 'select public.run_data_quality_cron();');

create view public.data_trust_current with (security_invoker = true) as
select distinct on (evaluation.dataset)
  evaluation.dataset, evaluation.status, evaluation.freshness_minutes, evaluation.records_checked,
  evaluation.null_records, evaluation.duplicate_groups, evaluation.policy_version, evaluation.evaluated_at
from public.data_quality_evaluations evaluation order by evaluation.dataset, evaluation.evaluated_at desc;
grant select on public.data_trust_current to anon, authenticated;

create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  push_enabled boolean not null default false,
  research_alerts boolean not null default true,
  platform_incidents boolean not null default true,
  product_updates boolean not null default false,
  consent_version text not null default 'notifications-v1' check (consent_version ~ '^notifications-v[0-9]+$'),
  external_delivery_enabled boolean not null default false check (not external_delivery_enabled),
  updated_at timestamptz not null default now()
);

create table public.notification_consent_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('preferences_saved', 'external_channels_unsubscribed')),
  preferences jsonb not null check (jsonb_typeof(preferences) = 'object' and pg_column_size(preferences) <= 2048),
  consent_version text not null,
  occurred_at timestamptz not null default now()
);
create index notification_consent_events_user_time on public.notification_consent_events(user_id, occurred_at desc);
alter table public.notification_preferences enable row level security;
alter table public.notification_consent_events enable row level security;
create policy "Users read notification preferences" on public.notification_preferences for select to authenticated using (user_id = auth.uid());
create policy "Users read notification consent history" on public.notification_consent_events for select to authenticated using (user_id = auth.uid());
revoke all on public.notification_preferences from anon, authenticated;
revoke all on public.notification_consent_events from anon, authenticated;
grant select on public.notification_preferences to authenticated;
grant select on public.notification_consent_events to authenticated;

create or replace function public.set_notification_preferences(
  p_in_app boolean, p_email boolean, p_push boolean,
  p_research_alerts boolean, p_platform_incidents boolean, p_product_updates boolean
) returns public.notification_preferences language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_record public.notification_preferences;
begin
  if auth.uid() is null or auth.role() <> 'authenticated' then raise exception 'Authentication required'; end if;
  -- Email and push record intent only. Delivery remains technically disabled until provider/privacy approval.
  insert into public.notification_preferences(user_id, in_app_enabled, email_enabled, push_enabled, research_alerts, platform_incidents, product_updates)
  values (auth.uid(), coalesce(p_in_app, true), coalesce(p_email, false), coalesce(p_push, false),
    coalesce(p_research_alerts, true), coalesce(p_platform_incidents, true), coalesce(p_product_updates, false))
  on conflict (user_id) do update set
    in_app_enabled = excluded.in_app_enabled, email_enabled = excluded.email_enabled,
    push_enabled = excluded.push_enabled, research_alerts = excluded.research_alerts,
    platform_incidents = excluded.platform_incidents, product_updates = excluded.product_updates,
    consent_version = 'notifications-v1', external_delivery_enabled = false, updated_at = clock_timestamp()
  returning * into v_record;
  insert into public.notification_consent_events(user_id, event_type, preferences, consent_version)
  values (auth.uid(), case when not v_record.email_enabled and not v_record.push_enabled then 'external_channels_unsubscribed' else 'preferences_saved' end,
    jsonb_build_object('inApp', v_record.in_app_enabled, 'emailIntent', v_record.email_enabled, 'pushIntent', v_record.push_enabled,
      'researchAlerts', v_record.research_alerts, 'platformIncidents', v_record.platform_incidents,
      'productUpdates', v_record.product_updates, 'externalDeliveryEnabled', false), v_record.consent_version);
  return v_record;
end;
$$;
revoke all on function public.set_notification_preferences(boolean,boolean,boolean,boolean,boolean,boolean) from public;
grant execute on function public.set_notification_preferences(boolean,boolean,boolean,boolean,boolean,boolean) to authenticated;

create or replace function public.prevent_notification_consent_mutation()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, auth as $$
begin
  if tg_op = 'DELETE' and not exists (select 1 from auth.users where id = old.user_id) then return old; end if;
  raise exception 'Notification consent evidence is append-only';
end;
$$;
create trigger notification_consent_events_append_only before update or delete on public.notification_consent_events
for each row execute function public.prevent_notification_consent_mutation();

comment on view public.data_trust_current is 'Sanitized latest data-quality state without provider payloads or credentials.';
comment on table public.notification_preferences is 'Private notification intent; external delivery is hard-disabled pending provider and regional approval.';
