begin;

select plan(45);

select ok(to_regclass('public.broker_certification_test_catalog') is not null, 'certification test catalog exists');
select ok(to_regclass('public.broker_certification_runs') is not null, 'certification run ledger exists');
select ok(to_regclass('public.broker_certification_results') is not null, 'certification result ledger exists');
select ok(to_regclass('public.broker_certification_readiness') is not null, 'certification readiness view exists');
select ok(to_regclass('public.broker_certification_latest_results') is not null, 'latest certification matrix exists');

select ok(
  to_regprocedure('public.persist_broker_certification_report(text,text,text,timestamp with time zone,timestamp with time zone,jsonb,text)') is not null,
  'atomic service certification writer exists'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.persist_broker_certification_report(text,text,text,timestamp with time zone,timestamp with time zone,jsonb,text)',
    'EXECUTE'
  ),
  'browser clients cannot persist certification evidence'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.persist_broker_certification_report(text,text,text,timestamp with time zone,timestamp with time zone,jsonb,text)',
    'EXECUTE'
  ),
  'the certification service can persist evidence'
);

select is(
  (select count(*) from public.broker_certification_test_catalog where active),
  10::bigint,
  'the v1 adapter contract has ten active certification controls'
);

select is(
  (select count(*) from public.broker_certification_test_catalog where active and required),
  10::bigint,
  'all initial certification controls are required'
);

select is(
  (select count(*) from public.broker_certification_test_catalog where code = 'production-route-lock' and required),
  1::bigint,
  'production route lock is a required certification control'
);

select ok((select relrowsecurity from pg_class where oid = 'public.broker_certification_test_catalog'::regclass), 'certification catalog has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.broker_certification_runs'::regclass), 'certification runs have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.broker_certification_results'::regclass), 'certification results have RLS');

select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'broker_certification_test_catalog' and policyname = 'Public reads broker certification catalog'),
  'the active certification catalog is publicly inspectable'
);

select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'broker_certification_runs' and policyname = 'Public reads sanitized broker certification runs'),
  'sanitized certification runs are publicly inspectable'
);

select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'broker_certification_results' and policyname = 'Public reads sanitized broker certification results'),
  'sanitized certification results are publicly inspectable'
);

select ok(not has_table_privilege('authenticated', 'public.broker_certification_test_catalog', 'INSERT'), 'browser clients cannot add controls');
select ok(not has_table_privilege('authenticated', 'public.broker_certification_runs', 'INSERT'), 'browser clients cannot add certification runs');
select ok(not has_table_privilege('authenticated', 'public.broker_certification_results', 'INSERT'), 'browser clients cannot add certification results');

select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name like 'broker_certification%'
      and column_name ~ '(api_key|secret|password|access_token|refresh_token|account_number|provider_payload)'
  ),
  'certification tables contain no credentials, account numbers or provider payloads'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.broker_certification_runs'::regclass
      and pg_get_constraintdef(oid) ilike '%environment%=%sandbox%'
  ),
  'certification runs are constrained to sandbox'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.broker_certification_runs'::regclass
      and pg_get_constraintdef(oid) ilike '%not live_order_routing_tested%'
  ),
  'certification cannot test live routing'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.broker_certification_runs'::regclass
      and pg_get_constraintdef(oid) ilike '%status%passed%failed%'
  ),
  'completed certification status is constrained'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.broker_certification_results'::regclass
      and pg_get_constraintdef(oid) ilike '%status%passed%failed%'
  ),
  'per-control certification status is constrained'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'broker_certification_results'
      and indexdef like '%run_id, test_code%'
      and indexdef like '%UNIQUE%'
  ),
  'one run can record each certification control only once'
);

select ok(
  coalesce(
    (select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.broker_certification_readiness'::regclass),
    false
  ),
  'the readiness summary preserves caller permissions'
);

select ok(
  coalesce(
    (select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.broker_certification_latest_results'::regclass),
    false
  ),
  'the latest-results matrix preserves caller permissions'
);

select ok(has_table_privilege('authenticated', 'public.broker_certification_readiness', 'SELECT'), 'authenticated clients can read certification readiness');
select ok(has_table_privilege('authenticated', 'public.broker_certification_latest_results', 'SELECT'), 'authenticated clients can read the certification matrix');

select ok(to_regclass('public.brokerage_orders') is null, 'certification still creates no live brokerage order table');

select ok(
  not exists (
    select 1
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname like '%submit%broker%order%'
  ),
  'certification still creates no live broker submission function'
);

select is((select count(*) from public.broker_provider_registry where live_order_routing_enabled), 0::bigint, 'all broker routes remain disabled');
select is((select execution_enabled from public.brokerage_execution_controls where control_key = 'global-live-orders'), false, 'the global execution lock remains disabled');
select is((select count(*) from public.investment_instruments where live_execution_enabled), 0::bigint, 'all instrument live-execution flags remain disabled');

select set_config('request.jwt.claim.role', 'anon', true);

select throws_ok(
  $$
    select public.persist_broker_certification_report(
      'broker-neutral-sandbox',
      'sandbox-suite-v1',
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      '2026-08-23T00:00:00Z',
      '2026-08-23T00:01:00Z',
      '[]'::jsonb
    )
  $$,
  'P0001',
  'This operation requires the broker-certification service',
  'anonymous callers cannot persist a certification report'
);

select set_config('request.jwt.claim.role', 'service_role', true);

select is(
  (
    public.persist_broker_certification_report(
      'broker-neutral-sandbox',
      'sandbox-suite-v1',
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      '2026-08-23T00:00:00Z',
      '2026-08-23T00:01:00Z',
      '[
        {"code":"sandbox-environment-attestation","status":"passed","latencyMs":2},
        {"code":"secret-isolation-redaction","status":"passed","latencyMs":3},
        {"code":"account-snapshot-contract","status":"passed","latencyMs":4},
        {"code":"sandbox-order-idempotency","status":"passed","latencyMs":5},
        {"code":"sandbox-order-lifecycle","status":"passed","latencyMs":6},
        {"code":"webhook-signature-replay","status":"passed","latencyMs":7},
        {"code":"rate-limit-backoff","status":"passed","latencyMs":8},
        {"code":"timeout-outage-recovery","status":"passed","latencyMs":9},
        {"code":"cash-position-reconciliation","status":"passed","latencyMs":10},
        {"code":"production-route-lock","status":"passed","latencyMs":1}
      ]'::jsonb,
      repeat('b', 64)
    ) ->> 'status'
  ),
  'passed',
  'the service can atomically persist a complete passing sandbox report'
);

select is((select count(*) from public.broker_certification_runs), 1::bigint, 'one immutable certification run is recorded');
select is((select count(*) from public.broker_certification_results), 10::bigint, 'all ten certification outcomes are recorded');
select is((select live_order_routing_tested from public.broker_certification_runs limit 1), false, 'the recorded run attests that live routing was not tested');
select is((select latest_status from public.broker_certification_readiness where provider_code = 'broker-neutral-sandbox'), 'passed', 'the readiness view exposes the latest sanitized status');
select is((select count(*) from public.broker_certification_latest_results where status = 'passed'), 10::bigint, 'the latest matrix exposes all passing controls');
select is((select count(*) from public.financial_audit_events where event_type = 'broker_sandbox_certification_recorded'), 1::bigint, 'certification persistence writes an operational audit event');

select throws_ok(
  $$update public.broker_certification_runs set suite_version = 'tampered'$$,
  'P0001',
  'Broker certification evidence is append-only',
  'completed certification runs cannot be changed'
);

select throws_ok(
  $$delete from public.broker_certification_results$$,
  'P0001',
  'Broker certification evidence is append-only',
  'per-control certification evidence cannot be deleted'
);

select * from finish();

rollback;
