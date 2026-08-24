begin;

select plan(35);

select ok(to_regclass('public.broker_account_inventory_runs') is not null, 'account inventory evidence table exists');
select ok(to_regclass('public.broker_account_inventory_health') is not null, 'account inventory health view exists');
select ok(
  to_regprocedure('public.persist_broker_account_inventory(text,text,text,text,integer,integer,integer,integer,integer,integer,integer,integer,integer,integer,text[],text,boolean,text)') is not null,
  'service-only account inventory writer exists'
);

select is((select metadata ->> 'account_inventory_path' from public.broker_provider_registry where code = 'alpaca-broker-sandbox'), '/v1/accounts', 'provider contract declares the exact account inventory path');
select is((select metadata ->> 'account_inventory_query' from public.broker_provider_registry where code = 'alpaca-broker-sandbox'), 'entities=trading_configurations', 'provider contract minimizes the account inventory response');
select is((select metadata ->> 'account_inventory_mode' from public.broker_provider_registry where code = 'alpaca-broker-sandbox'), 'sanitized_aggregate_read_only', 'provider contract declares aggregate read-only mode');
select is((select metadata ->> 'provider_account_identifiers_stored' from public.broker_provider_registry where code = 'alpaca-broker-sandbox'), 'false', 'provider contract declares that account identifiers are not stored');
select is((select account_connection_enabled from public.broker_provider_registry where code = 'alpaca-broker-sandbox'), false, 'account connection remains disabled');
select is((select live_order_routing_enabled from public.broker_provider_registry where code = 'alpaca-broker-sandbox'), false, 'live provider routing remains disabled');

select ok((select relrowsecurity from pg_class where oid = 'public.broker_account_inventory_runs'::regclass), 'account inventory evidence has RLS');
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'broker_account_inventory_runs' and policyname = 'Authenticated users read sanitized broker account inventory'),
  'authenticated users receive only the sanitized inventory read policy'
);
select ok(not has_table_privilege('anon', 'public.broker_account_inventory_runs', 'SELECT'), 'anonymous clients cannot read account inventory operations');
select ok(has_table_privilege('authenticated', 'public.broker_account_inventory_runs', 'SELECT'), 'authenticated clients can read sanitized aggregate inventory');
select ok(not has_table_privilege('authenticated', 'public.broker_account_inventory_runs', 'INSERT'), 'browser clients cannot forge inventory runs');
select ok(
  not has_function_privilege('authenticated', 'public.persist_broker_account_inventory(text,text,text,text,integer,integer,integer,integer,integer,integer,integer,integer,integer,integer,text[],text,boolean,text)', 'EXECUTE'),
  'browser clients cannot invoke the inventory writer'
);
select ok(
  has_function_privilege('service_role', 'public.persist_broker_account_inventory(text,text,text,text,integer,integer,integer,integer,integer,integer,integer,integer,integer,integer,text[],text,boolean,text)', 'EXECUTE'),
  'the broker-account inventory service can invoke its writer'
);

select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name in ('broker_account_inventory_runs', 'broker_account_inventory_health')
      and column_name ~ '(account_id|account_number|email|phone|name|address|contact|identity|api_key|secret|password|access_token|provider_payload)'
  ),
  'inventory storage exposes no account identifiers, PII, credentials or provider payloads'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.broker_account_inventory_runs'::regclass and pg_get_constraintdef(oid) ilike '%broker-api.sandbox.alpaca.markets%'),
  'inventory evidence accepts only the Alpaca sandbox origin'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.broker_account_inventory_runs'::regclass and pg_get_constraintdef(oid) ilike '%not live_order_routing_tested%'),
  'inventory evidence cannot claim live routing was tested'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.broker_account_inventory_runs'::regclass and pg_get_constraintdef(oid) ilike '%total_accounts%active_accounts%'),
  'inventory status buckets must reconcile to the total count'
);
select ok(
  exists (select 1 from pg_trigger where tgrelid = 'public.broker_account_inventory_runs'::regclass and tgname = 'broker_account_inventory_append_only' and not tgisinternal),
  'inventory evidence is protected by an append-only trigger'
);
select ok(
  coalesce((select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.broker_account_inventory_health'::regclass), false),
  'inventory health view preserves caller permissions'
);

select set_config('request.jwt.claim.role', 'anon', true);
select throws_ok(
  $$select public.persist_broker_account_inventory('alpaca-broker-sandbox', 'alpaca-broker-account-inventory-v1', 'https://broker-api.sandbox.alpaca.markets', 'passed', 200, 10, 1, 0, 0, 0, 0, 0, 0, 0, array[]::text[], repeat('a', 64), false, null)$$,
  'P0001',
  'This operation requires the broker-account inventory service',
  'anonymous callers cannot persist inventory evidence'
);

select set_config('request.jwt.claim.role', 'service_role', true);
select is(
  public.persist_broker_account_inventory(
    'alpaca-broker-sandbox',
    'alpaca-broker-account-inventory-v1',
    'https://broker-api.sandbox.alpaca.markets',
    'passed', 200, 12, 1,
    0, 0, 0, 0, 0, 0, 0,
    array[]::text[], repeat('a', 64), false, null
  ) ->> 'status',
  'passed',
  'the service can persist a sanitized empty inventory'
);
select is((select changed_since_previous from public.broker_account_inventory_runs order by id desc limit 1), false, 'the first inventory is not marked changed');

select is(
  public.persist_broker_account_inventory(
    'alpaca-broker-sandbox',
    'alpaca-broker-account-inventory-v1',
    'https://broker-api.sandbox.alpaca.markets',
    'passed', 200, 15, 1,
    1, 1, 0, 0, 0, 0, 0,
    array['USD'], repeat('b', 64), false, null
  ) ->> 'changedSincePrevious',
  'true',
  'a changed digest is detected without storing provider account identifiers'
);
select is((select total_accounts from public.broker_account_inventory_health), 1, 'health view exposes the latest total');
select is((select active_accounts from public.broker_account_inventory_health), 1, 'health view exposes the latest active count');
select is((select accounts_read_enabled from public.broker_account_inventory_health), true, 'health view declares read-only account inventory capability');
select is((select orders_write_enabled from public.broker_account_inventory_health), false, 'health view keeps broker orders disabled');
select is((select live_order_routing_enabled from public.broker_account_inventory_health), false, 'health view keeps live routing disabled');
select is((select count(*) from public.financial_audit_events where event_type = 'broker_account_inventory_recorded'), 2::bigint, 'each inventory run records an operational audit event');

select throws_ok(
  $$update public.broker_account_inventory_runs set latency_ms = 99$$,
  'P0001',
  'Broker account inventory evidence is append-only',
  'inventory evidence cannot be changed'
);
select throws_ok(
  $$delete from public.broker_account_inventory_runs$$,
  'P0001',
  'Broker account inventory evidence is append-only',
  'inventory evidence cannot be deleted'
);
select throws_ok(
  $$select public.persist_broker_account_inventory('alpaca-broker-sandbox', 'alpaca-broker-account-inventory-v1', 'https://broker-api.alpaca.markets', 'passed', 200, 10, 1, 0, 0, 0, 0, 0, 0, 0, array[]::text[], repeat('c', 64), false, null)$$,
  'P0001',
  'The account inventory implementation or sandbox origin is invalid',
  'the inventory writer rejects a production Alpaca origin'
);

select * from finish();

rollback;
