begin;

select plan(35);

select ok(to_regclass('public.broker_adapter_probes') is not null, 'adapter probe ledger exists');
select ok(to_regclass('public.broker_adapter_health') is not null, 'adapter health view exists');
select ok(
  to_regprocedure('public.persist_broker_adapter_probe(text,text,text,text,integer,integer,integer,text)') is not null,
  'service-only adapter probe writer exists'
);

select is((select count(*) from public.broker_provider_registry where code = 'alpaca-broker-sandbox'), 1::bigint, 'the provider contract is bound to Alpaca sandbox');
select is((select metadata ->> 'api_origin' from public.broker_provider_registry where code = 'alpaca-broker-sandbox'), 'https://broker-api.sandbox.alpaca.markets', 'the registry declares the fixed sandbox origin');
select is((select account_connection_enabled from public.broker_provider_registry where code = 'alpaca-broker-sandbox'), false, 'account connection remains disabled');
select is((select live_order_routing_enabled from public.broker_provider_registry where code = 'alpaca-broker-sandbox'), false, 'provider live routing remains disabled');

select ok((select relrowsecurity from pg_class where oid = 'public.broker_adapter_probes'::regclass), 'adapter probes have RLS');
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'broker_adapter_probes' and policyname = 'Authenticated users read sanitized broker adapter probes'),
  'only authenticated product users receive the sanitized read policy'
);
select ok(not has_table_privilege('authenticated', 'public.broker_adapter_probes', 'INSERT'), 'browser clients cannot forge adapter probes');
select ok(not has_table_privilege('anon', 'public.broker_adapter_probes', 'SELECT'), 'anonymous clients cannot read adapter operations');
select ok(has_table_privilege('authenticated', 'public.broker_adapter_probes', 'SELECT'), 'authenticated clients can read sanitized probes');
select ok(
  not has_function_privilege('authenticated', 'public.persist_broker_adapter_probe(text,text,text,text,integer,integer,integer,text)', 'EXECUTE'),
  'browser clients cannot invoke the probe writer'
);
select ok(
  has_function_privilege('service_role', 'public.persist_broker_adapter_probe(text,text,text,text,integer,integer,integer,text)', 'EXECUTE'),
  'the broker-adapter service can invoke the probe writer'
);

select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name in ('broker_adapter_probes', 'broker_adapter_health')
      and column_name ~ '(api_key|secret|password|access_token|account_number|provider_payload)'
  ),
  'adapter health storage contains no credentials, account numbers or provider payloads'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.broker_adapter_probes'::regclass and pg_get_constraintdef(oid) ilike '%environment%=%sandbox%'),
  'probe evidence is constrained to sandbox'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.broker_adapter_probes'::regclass and pg_get_constraintdef(oid) ilike '%broker-api.sandbox.alpaca.markets%'),
  'probe evidence accepts only the exact Alpaca sandbox origin'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.broker_adapter_probes'::regclass and pg_get_constraintdef(oid) ilike '%not live_order_routing_tested%'),
  'probe evidence cannot claim live-order routing was tested'
);
select ok(
  exists (select 1 from pg_trigger where tgrelid = 'public.broker_adapter_probes'::regclass and tgname = 'broker_adapter_probes_append_only' and not tgisinternal),
  'adapter probe ledger has an append-only trigger'
);
select ok(
  coalesce((select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.broker_adapter_health'::regclass), false),
  'adapter health view preserves caller permissions'
);
select ok(has_table_privilege('authenticated', 'public.broker_adapter_health', 'SELECT'), 'authenticated clients can read adapter health');

select ok(to_regclass('public.brokerage_orders') is null, 'the adapter creates no live brokerage order table');
select ok(
  not exists (
    select 1 from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public' and procedure.proname like '%submit%broker%order%'
  ),
  'the adapter creates no live broker submission function'
);
select is((select execution_enabled from public.brokerage_execution_controls where control_key = 'global-live-orders'), false, 'the global execution lock remains disabled');
select is((select count(*) from public.investment_instruments where live_execution_enabled), 0::bigint, 'instrument execution remains disabled');

select set_config('request.jwt.claim.role', 'anon', true);
select throws_ok(
  $$select public.persist_broker_adapter_probe('alpaca-broker-sandbox', 'alpaca-broker-sandbox-v1', 'https://broker-api.sandbox.alpaca.markets', 'passed', 200, 12, 1, null)$$,
  'P0001',
  'This operation requires the broker-adapter service',
  'anonymous callers cannot persist adapter health'
);

select set_config('request.jwt.claim.role', 'service_role', true);
select is(
  public.persist_broker_adapter_probe(
    'alpaca-broker-sandbox',
    'alpaca-broker-sandbox-v1',
    'https://broker-api.sandbox.alpaca.markets',
    'passed',
    200,
    12,
    1,
    null
  ) ->> 'status',
  'passed',
  'the service can persist a sanitized passing probe'
);
select is((select count(*) from public.broker_adapter_probes), 1::bigint, 'one immutable probe is recorded');
select is((select latest_status from public.broker_adapter_health), 'passed', 'the health view exposes the latest status');
select is((select api_origin from public.broker_adapter_health), 'https://broker-api.sandbox.alpaca.markets', 'the health view exposes the sandbox origin');
select is((select live_order_routing_tested from public.broker_adapter_probes limit 1), false, 'the persisted probe never tests live routing');
select is((select count(*) from public.financial_audit_events where event_type = 'broker_adapter_probe_recorded'), 1::bigint, 'probe persistence records an operational audit event');

select throws_ok(
  $$update public.broker_adapter_probes set latency_ms = 99$$,
  'P0001',
  'Broker adapter probes are append-only',
  'completed adapter probes cannot be changed'
);
select throws_ok(
  $$delete from public.broker_adapter_probes$$,
  'P0001',
  'Broker adapter probes are append-only',
  'adapter probes cannot be deleted'
);
select throws_ok(
  $$select public.persist_broker_adapter_probe('alpaca-broker-sandbox', 'alpaca-broker-sandbox-v1', 'https://broker-api.alpaca.markets', 'passed', 200, 12, 1, null)$$,
  'P0001',
  'The adapter implementation or sandbox origin is invalid',
  'the writer rejects a production Alpaca origin'
);

select * from finish();

rollback;
