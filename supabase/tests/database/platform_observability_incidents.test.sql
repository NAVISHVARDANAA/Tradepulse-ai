begin;

select plan(49);

select ok(to_regclass('public.platform_service_policies') is not null, 'service SLO policy table exists');
select ok(to_regclass('public.platform_health_evidence') is not null, 'append-only health evidence table exists');
select ok(to_regclass('public.platform_incidents') is not null, 'incident lifecycle table exists');
select ok(to_regclass('public.platform_incident_events') is not null, 'append-only incident events table exists');
select ok(to_regclass('public.platform_public_status_snapshots') is not null, 'customer-safe status snapshot exists');
select ok(to_regclass('public.platform_public_status') is not null, 'customer-safe status view exists');
select ok(
  to_regprocedure('public.record_platform_service_health(text,text,text,integer,integer,integer,timestamptz)') is not null,
  'service-only health recorder exists'
);
select ok(
  to_regprocedure('public.evaluate_platform_reliability()') is not null,
  'platform reliability evaluator exists'
);
select ok(
  to_regprocedure('public.run_platform_reliability_cron()') is not null,
  'database scheduler entry point exists'
);

select is((select count(*) from public.platform_service_policies), 6::bigint, 'six bounded service policies are installed');
select is((select count(*) from public.platform_public_status_snapshots), 3::bigint, 'only three customer-visible services are published');
select ok(
  (select bool_and(target_availability_bps between 9900 and 9950) from public.platform_service_policies),
  'service availability objectives are explicit and bounded'
);
select ok(
  (select bool_and(freshness_critical_minutes > freshness_warning_minutes) from public.platform_service_policies),
  'critical freshness thresholds exceed warning thresholds'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.platform_health_evidence'::regclass),
  'health evidence has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.platform_incidents'::regclass),
  'incidents have RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.platform_incident_events'::regclass),
  'incident events have RLS enabled'
);
select ok(
  coalesce((select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.platform_public_status'::regclass), false),
  'public status view preserves caller permissions'
);

select ok(has_table_privilege('anon', 'public.platform_public_status_snapshots', 'SELECT'), 'anonymous customers can read safe status');
select ok(not has_table_privilege('anon', 'public.platform_health_evidence', 'SELECT'), 'anonymous customers cannot inspect internal health evidence');
select ok(not has_table_privilege('authenticated', 'public.platform_incidents', 'SELECT'), 'customers cannot inspect internal incidents');
select ok(not has_table_privilege('authenticated', 'public.platform_incident_events', 'SELECT'), 'customers cannot inspect incident audit events');
select ok(not has_table_privilege('authenticated', 'public.platform_public_status_snapshots', 'UPDATE'), 'customers cannot forge public status');
select ok(not has_table_privilege('service_role', 'public.platform_health_evidence', 'INSERT'), 'service role cannot bypass the recorder');
select ok(not has_table_privilege('service_role', 'public.platform_incidents', 'UPDATE'), 'service role cannot bypass incident lifecycle logic');
select ok(not has_table_privilege('service_role', 'public.platform_incident_events', 'DELETE'), 'incident events cannot be deleted directly');
select ok(
  has_function_privilege('service_role', 'public.evaluate_platform_reliability()', 'EXECUTE'),
  'trusted reliability service can evaluate platform health'
);
select ok(
  not has_function_privilege('authenticated', 'public.evaluate_platform_reliability()', 'EXECUTE'),
  'browser clients cannot invoke platform evaluation'
);
select ok(
  not has_function_privilege('service_role', 'public.run_platform_reliability_cron()', 'EXECUTE'),
  'scheduler wrapper is unavailable to API roles'
);
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'platform_health_evidence',
        'platform_incidents',
        'platform_incident_events',
        'platform_public_status_snapshots',
        'platform_public_status'
      )
      and column_name ~ '(^|_)(user_id|account_id|account_number|customer_name|email|phone|address|api_key|secret|password|access_token|provider_payload|request_body|response_body)($|_)'
  ),
  'observability schema contains no identity, credential, payload or financial fields'
);
select is(
  (select execution_enabled from public.brokerage_execution_controls where control_key = 'global-live-orders'),
  false,
  'global live execution remains disabled'
);
select ok(
  not exists (select 1 from public.broker_provider_registry where live_order_routing_enabled),
  'broker provider routing remains disabled'
);

select set_config('request.jwt.claim.role', 'anon', true);
select throws_ok(
  $$select public.evaluate_platform_reliability()$$,
  'P0001',
  'This operation requires the platform reliability service',
  'anonymous callers cannot evaluate platform reliability'
);

select set_config('request.jwt.claim.role', 'service_role', true);
select is(
  public.record_platform_service_health(
    'platform-api', 'degraded', 'synthetic_latency', 4100, 0, 1, now()
  ) ->> 'status',
  'degraded',
  'trusted degraded evidence is recorded'
);
select is((select count(*) from public.platform_incidents where status <> 'resolved'), 1::bigint, 'degraded evidence opens one incident');
select is((select count(*) from public.platform_incident_events where event_type = 'opened'), 1::bigint, 'incident opening is append-only evidence');
select is((select current_status from public.platform_public_status where service_code = 'platform-api'), 'degraded', 'customer status reflects degradation');

select is(
  public.record_platform_service_health(
    'platform-api', 'outage', 'synthetic_unavailable', 8000, 0, 1, now()
  ) ->> 'status',
  'outage',
  'trusted outage evidence is recorded'
);
select is((select count(*) from public.platform_incidents), 1::bigint, 'repeat evidence does not duplicate incidents');
select is((select severity from public.platform_incidents where status <> 'resolved'), 'critical', 'outage escalates incident severity');
select is((select count(*) from public.platform_incident_events where event_type = 'severity_changed'), 1::bigint, 'severity escalation is audited');

select is(
  public.record_platform_service_health(
    'platform-api', 'operational', 'synthetic_recovered', 700, 0, 1, now()
  ) ->> 'status',
  'operational',
  'trusted recovery evidence is recorded'
);
select is((select count(*) from public.platform_incidents where status <> 'resolved'), 0::bigint, 'recovery resolves the incident');
select is((select count(*) from public.platform_incident_events where event_type = 'resolved'), 1::bigint, 'incident recovery is audited');
select is((select current_status from public.platform_public_status where service_code = 'platform-api'), 'operational', 'customer status reflects recovery');
select ok((select error_budget_remaining_bps < 0 from public.platform_public_status where service_code = 'platform-api'), 'SLO error-budget consumption is calculated');

select is(
  jsonb_array_length(public.evaluate_platform_reliability() -> 'services'),
  4,
  'platform evaluator consolidates four trusted service domains'
);
select is((select current_status from public.platform_public_status where service_code = 'market-data'), 'initializing', 'missing market evidence is explicit, not falsely healthy');
select is((select current_status from public.platform_public_status where service_code = 'forecasting'), 'initializing', 'missing forecast evidence is explicit, not falsely healthy');
select is((select count(*) from cron.job where jobname = 'tradepulse-platform-reliability'), 1::bigint, 'five-minute reliability evaluation is scheduled once');

select * from finish();

rollback;
