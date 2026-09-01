begin;

select plan(52);

select ok(to_regclass('public.broker_sandbox_order_controls') is not null, 'sandbox order controls exist');
select ok(to_regclass('public.broker_sandbox_order_receipts') is not null, 'sandbox order receipts exist');
select ok(to_regclass('public.broker_sandbox_reconciliation_runs') is not null, 'sandbox reconciliation evidence exists');
select ok(to_regclass('public.broker_sandbox_order_lifecycle') is not null, 'sanitized lifecycle view exists');
select ok(to_regprocedure('public.persist_broker_sandbox_order_receipt(uuid,jsonb)') is not null, 'receipt writer exists');
select ok(to_regprocedure('public.persist_broker_sandbox_reconciliation(uuid,integer,integer,integer,integer,text,text)') is not null, 'reconciliation writer exists');

select is((select count(*) from public.broker_sandbox_order_controls), 1::bigint, 'one sandbox order control is seeded');
select is((select environment from public.broker_sandbox_order_controls), 'sandbox', 'control is sandbox only');
select is((select api_origin from public.broker_sandbox_order_controls), 'https://broker-api.sandbox.alpaca.markets', 'origin is fixed to Alpaca sandbox');
select is((select internal_submission_enabled from public.broker_sandbox_order_controls), true, 'internal sandbox submission is enabled');
select is((select browser_submission_enabled from public.broker_sandbox_order_controls), false, 'browser submission is disabled');
select is((select live_order_routing_enabled from public.broker_sandbox_order_controls), false, 'live routing is disabled');
select is((select protective_orders_required from public.broker_sandbox_order_controls), true, 'protective orders are required');
select is((select max_order_notional_usd from public.broker_sandbox_order_controls), 1000.00::numeric, 'notional is bounded');
select is((select count(*) from public.broker_provider_registry where live_order_routing_enabled), 0::bigint, 'provider live routing stays disabled');
select is((select execution_enabled from public.brokerage_execution_controls where control_key = 'global-live-orders'), false, 'global execution stays disabled');

select ok(exists(select 1 from pg_constraint where conrelid = 'public.broker_sandbox_order_controls'::regclass and pg_get_constraintdef(oid) ilike '%not browser_submission_enabled%'), 'database locks browser submission false');
select ok(exists(select 1 from pg_constraint where conrelid = 'public.broker_sandbox_order_controls'::regclass and pg_get_constraintdef(oid) ilike '%not live_order_routing_enabled%'), 'database locks live routing false');
select ok(exists(select 1 from pg_constraint where conrelid = 'public.broker_sandbox_order_receipts'::regclass and pg_get_constraintdef(oid) ilike '%not live_order_routing_enabled%'), 'receipt live routing is always false');
select ok(exists(select 1 from pg_constraint where conrelid = 'public.broker_sandbox_order_receipts'::regclass and pg_get_constraintdef(oid) ilike '%not browser_originated%'), 'receipts cannot be browser originated');
select ok(exists(select 1 from pg_constraint where conrelid = 'public.broker_sandbox_order_receipts'::regclass and pg_get_constraintdef(oid) ilike '%side = ''buy''%') and exists(select 1 from pg_constraint where conrelid = 'public.broker_sandbox_order_receipts'::regclass and pg_get_constraintdef(oid) ilike '%order_type = ''limit''%'), 'Phase 6B is long-only and limit-only');
select ok(exists(select 1 from pg_constraint where conrelid = 'public.broker_sandbox_order_receipts'::regclass and contype = 'u' and pg_get_constraintdef(oid) ilike '%user_id, command_id%'), 'commands are idempotent per user');
select ok((select bool_and(relrowsecurity) from pg_class where oid in ('public.broker_sandbox_order_controls'::regclass, 'public.broker_sandbox_order_receipts'::regclass, 'public.broker_sandbox_reconciliation_runs'::regclass)), 'sandbox lifecycle relations use RLS');
select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'broker_sandbox_order_receipts' and policyname = 'Users read their sandbox order receipts'), 'users read only their receipts');
select ok(not has_table_privilege('authenticated', 'public.broker_sandbox_order_receipts', 'INSERT') and not has_table_privilege('service_role', 'public.broker_sandbox_order_receipts', 'INSERT'), 'clients cannot bypass the receipt writer');
select ok(not has_table_privilege('authenticated', 'public.broker_sandbox_order_receipts', 'UPDATE'), 'browser cannot alter receipts');
select ok(not has_table_privilege('anon', 'public.broker_sandbox_order_receipts', 'SELECT'), 'anonymous users cannot read receipts');
select ok(has_table_privilege('authenticated', 'public.broker_sandbox_order_receipts', 'SELECT'), 'authenticated users can read scoped receipts');
select ok(has_function_privilege('service_role', 'public.persist_broker_sandbox_order_receipt(uuid,jsonb)', 'EXECUTE'), 'service can persist receipts');
select ok(not has_function_privilege('authenticated', 'public.persist_broker_sandbox_order_receipt(uuid,jsonb)', 'EXECUTE'), 'authenticated clients cannot call receipt writer');
select ok(not has_function_privilege('anon', 'public.persist_broker_sandbox_order_receipt(uuid,jsonb)', 'EXECUTE'), 'anonymous clients cannot call receipt writer');
select ok(has_function_privilege('service_role', 'public.persist_broker_sandbox_reconciliation(uuid,integer,integer,integer,integer,text,text)', 'EXECUTE'), 'service can persist reconciliation');
select ok(not has_function_privilege('authenticated', 'public.persist_broker_sandbox_reconciliation(uuid,integer,integer,integer,integer,text,text)', 'EXECUTE') and not has_table_privilege('service_role', 'public.broker_sandbox_reconciliation_runs', 'INSERT'), 'clients cannot bypass the reconciliation writer');
select ok(exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'broker_sandbox_order_receipts'), 'private receipts are realtime enabled');
select ok(not exists(select 1 from information_schema.columns where table_schema = 'public' and table_name in ('broker_sandbox_order_receipts', 'broker_sandbox_reconciliation_runs') and column_name in ('api_key', 'api_secret', 'password', 'access_token', 'refresh_token', 'account_id', 'account_number', 'provider_account_id', 'provider_order_id')), 'no raw provider credentials or identifiers are stored');
select ok(exists(select 1 from pg_trigger where tgname = 'broker_sandbox_receipts_append_only' and not tgisinternal), 'receipt append-only trigger exists');
select ok(exists(select 1 from pg_trigger where tgname = 'broker_sandbox_reconciliation_append_only' and not tgisinternal), 'reconciliation append-only trigger exists');

insert into public.controlled_beta_pilot_cohorts(
  cohort_code, display_name, status, max_testers, starts_at, ends_at, terms_version
) values (
  'phase-6b-test', 'Phase 6B test cohort', 'active', 2,
  now() - interval '1 hour', now() + interval '1 day', 'pilot-v1.0'
);
insert into auth.users(
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-4000-8000-000000000063', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'phase6b@example.test', '', now(), now(), now(), '{}', '{}'
);
insert into public.controlled_beta_pilot_memberships(
  user_id, cohort_code, status, consented_at, terms_version_accepted
) values (
  '00000000-0000-4000-8000-000000000063', 'phase-6b-test', 'active', now(), 'pilot-v1.0'
);

select set_config('request.jwt.claim.role', 'service_role', true);

select is(
  (public.persist_broker_sandbox_order_receipt(
    '00000000-0000-4000-8000-000000000063',
    '{"commandId":"00000000-0000-4000-8000-000000000064","action":"submit","rootClientOrderId":"tp-sbx-00000000-0000-4000-8000-000000000064","clientOrderId":"tp-sbx-00000000-0000-4000-8000-000000000064","priorClientOrderId":null,"accountFingerprint":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","providerOrderFingerprint":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","requestDigest":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc","payloadDigest":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd","symbol":"AAPL","side":"buy","orderType":"limit","orderClass":"bracket","quantity":1,"limitPrice":190,"takeProfitLimitPrice":200,"stopLossStopPrice":180,"estimatedNotionalUsd":200,"providerStatus":"new","httpStatus":200,"latencyMs":40,"recoveredAfterAmbiguous":false,"providerRecordedAt":null}'::jsonb
  ) ->> 'idempotent')::boolean,
  false,
  'first command persists a new receipt'
);
select is((select count(*) from public.broker_sandbox_order_receipts), 1::bigint, 'one receipt is stored');
select is(
  (public.persist_broker_sandbox_order_receipt(
    '00000000-0000-4000-8000-000000000063',
    '{"commandId":"00000000-0000-4000-8000-000000000064","action":"submit","rootClientOrderId":"tp-sbx-00000000-0000-4000-8000-000000000064","clientOrderId":"tp-sbx-00000000-0000-4000-8000-000000000064","accountFingerprint":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","providerOrderFingerprint":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","requestDigest":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc","payloadDigest":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd","symbol":"AAPL","side":"buy","orderType":"limit","orderClass":"bracket","quantity":1,"limitPrice":190,"takeProfitLimitPrice":200,"stopLossStopPrice":180,"estimatedNotionalUsd":200,"providerStatus":"new","httpStatus":200,"latencyMs":40}'::jsonb
  ) ->> 'idempotent')::boolean,
  true,
  'repeated command is idempotent'
);
select is((select count(*) from public.broker_sandbox_order_receipts), 1::bigint, 'idempotency prevents duplicate receipts');
select throws_ok(
  $$select public.persist_broker_sandbox_order_receipt('00000000-0000-4000-8000-000000000063', '{"commandId":"00000000-0000-4000-8000-000000000064","action":"submit","requestDigest":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee","estimatedNotionalUsd":200,"quantity":1}'::jsonb)$$,
  'P0001', 'Sandbox order idempotency key was reused with different input',
  'idempotency key reuse with different input is rejected'
);
select is(
  (public.persist_broker_sandbox_order_receipt(
    '00000000-0000-4000-8000-000000000063',
    '{"commandId":"00000000-0000-4000-8000-000000000066","action":"reconcile","rootClientOrderId":"tp-sbx-00000000-0000-4000-8000-000000000064","clientOrderId":"tp-sbx-00000000-0000-4000-8000-000000000064","priorClientOrderId":"tp-sbx-00000000-0000-4000-8000-000000000064","accountFingerprint":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","providerOrderFingerprint":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","requestDigest":"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff","payloadDigest":"9999999999999999999999999999999999999999999999999999999999999999","symbol":"AAPL","side":"buy","orderType":"limit","orderClass":"bracket","quantity":1,"limitPrice":190,"takeProfitLimitPrice":200,"stopLossStopPrice":180,"estimatedNotionalUsd":200,"providerStatus":"filled","httpStatus":200,"latencyMs":35,"recoveredAfterAmbiguous":false,"providerRecordedAt":null}'::jsonb
  ) ->> 'idempotent')::boolean,
  false,
  'reconciliation appends the confirmed provider state'
);
select is((select count(*) from public.broker_sandbox_order_receipts), 2::bigint, 'reconciliation retains both trust receipts');
select throws_ok(
  $$select public.persist_broker_sandbox_order_receipt('00000000-0000-4000-8000-000000000063', '{"commandId":"00000000-0000-4000-8000-000000000067","action":"cancel","rootClientOrderId":"tp-sbx-00000000-0000-4000-8000-000000000064","clientOrderId":"tp-sbx-00000000-0000-4000-8000-000000000064","priorClientOrderId":"tp-sbx-00000000-0000-4000-8000-000000000064","accountFingerprint":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","providerOrderFingerprint":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","requestDigest":"7777777777777777777777777777777777777777777777777777777777777777","payloadDigest":"8888888888888888888888888888888888888888888888888888888888888888","symbol":"AAPL","side":"buy","orderType":"limit","orderClass":"bracket","quantity":2,"limitPrice":190,"takeProfitLimitPrice":200,"stopLossStopPrice":180,"estimatedNotionalUsd":200,"providerStatus":"pending_cancel","httpStatus":204,"latencyMs":35}'::jsonb)$$,
  'P0001', 'Sandbox cancel or reconciliation state changed unexpectedly',
  'cancel cannot rewrite the prior order state'
);
select throws_ok(
  $$select public.persist_broker_sandbox_order_receipt('00000000-0000-4000-8000-000000000063', '{"commandId":"00000000-0000-4000-8000-000000000068","action":"replace","rootClientOrderId":"tp-sbx-00000000-0000-4000-8000-000000000064","clientOrderId":"tp-sbx-00000000-0000-4000-8000-000000000068","priorClientOrderId":"tp-sbx-00000000-0000-4000-8000-000000000064","accountFingerprint":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","providerOrderFingerprint":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","requestDigest":"5555555555555555555555555555555555555555555555555555555555555555","payloadDigest":"6666666666666666666666666666666666666666666666666666666666666666","symbol":"AAPL","side":"buy","orderType":"limit","orderClass":"bracket","quantity":2,"limitPrice":195,"takeProfitLimitPrice":210,"stopLossStopPrice":180,"estimatedNotionalUsd":420,"providerStatus":"pending_replace","httpStatus":200,"latencyMs":35}'::jsonb)$$,
  'P0001', 'Sandbox order lifecycle identity or protective legs changed',
  'replacement cannot rewrite protective legs'
);
select throws_ok(
  $$update public.broker_sandbox_order_receipts set provider_status = 'filled' where command_id = '00000000-0000-4000-8000-000000000064'$$,
  'P0001', 'Sandbox order evidence is append-only',
  'receipt mutation is rejected'
);
select is((select provider_status from public.broker_sandbox_order_lifecycle), 'filled', 'lifecycle view exposes the latest reconciled state');
select is(
  (public.persist_broker_sandbox_reconciliation(
    '00000000-0000-4000-8000-000000000065', 1, 1, 0, 0,
    'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 'passed'
  )).status,
  'passed',
  'aggregate reconciliation evidence persists'
);
select is(
  (select count(*) from public.broker_sandbox_reconciliation_runs where run_key = '00000000-0000-4000-8000-000000000065'),
  1::bigint,
  'reconciliation run keys are idempotent'
);
select is((select count(*) from public.broker_sandbox_order_receipts where live_order_routing_enabled or browser_originated), 0::bigint, 'persisted receipts retain execution locks');
select ok(to_regclass('public.payment_transactions') is null, 'money movement remains absent');

select * from finish();
rollback;
