begin;

select plan(57);

select ok(to_regclass('public.broker_operations_policies') is not null, 'broker operations policy table exists');
select ok(to_regclass('public.broker_operations_alerts') is not null, 'broker operations alert table exists');
select ok(to_regclass('public.broker_operations_health') is not null, 'broker operations health view exists');
select ok(to_regclass('public.broker_operations_alert_feed') is not null, 'broker operations alert feed exists');
select ok(
  to_regprocedure('public.evaluate_broker_operations_health(text)') is not null,
  'service-only broker operations evaluator exists'
);

select is((select count(*) from public.broker_operations_policies), 1::bigint, 'one sandbox monitoring policy is installed');
select is((select inventory_warning_minutes from public.broker_operations_policies), 1560, 'inventory warning threshold is explicit');
select ok(
  (select inventory_critical_minutes > inventory_warning_minutes from public.broker_operations_policies),
  'inventory critical threshold is greater than warning threshold'
);
select ok((select relrowsecurity from pg_class where oid = 'public.broker_operations_policies'::regclass), 'monitoring policy has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.broker_operations_alerts'::regclass), 'operations alerts have RLS');
select ok(not has_table_privilege('anon', 'public.broker_operations_alerts', 'SELECT'), 'anonymous clients cannot read operations alerts');
select ok(has_table_privilege('authenticated', 'public.broker_operations_alerts', 'SELECT'), 'authenticated clients can read sanitized operations alerts');
select ok(not has_table_privilege('authenticated', 'public.broker_operations_alerts', 'INSERT'), 'browser clients cannot forge operations alerts');
select ok(not has_table_privilege('authenticated', 'public.broker_operations_alerts', 'UPDATE'), 'browser clients cannot mutate operations alerts');
select ok(
  not has_function_privilege('authenticated', 'public.evaluate_broker_operations_health(text)', 'EXECUTE'),
  'browser clients cannot invoke the operations evaluator'
);
select ok(
  has_function_privilege('service_role', 'public.evaluate_broker_operations_health(text)', 'EXECUTE'),
  'the monitoring service can invoke the operations evaluator'
);
select ok(
  coalesce((select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.broker_operations_health'::regclass), false),
  'operations health view preserves caller permissions'
);
select ok(
  coalesce((select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.broker_operations_alert_feed'::regclass), false),
  'operations alert feed preserves caller permissions'
);
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name in ('broker_operations_alerts', 'broker_operations_health', 'broker_operations_alert_feed')
      and column_name ~ '(^|_)(account_id|account_number|customer_name|legal_name|first_name|last_name|email|phone|address|contact|identity|api_key|secret|password|access_token|provider_payload)($|_)'
  ),
  'operations monitoring exposes no account identifiers, PII, credentials or provider payloads'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.broker_operations_alerts'::regclass
      and pg_get_constraintdef(oid) ilike '%inventory_sync_failed%'
      and pg_get_constraintdef(oid) ilike '%restricted_accounts%'
  ),
  'operations alerts accept only the reviewed signal catalog'
);
select is((select account_connection_enabled from public.broker_provider_registry where code = 'alpaca-broker-sandbox'), false, 'account connection remains disabled');
select is((select live_order_routing_enabled from public.broker_provider_registry where code = 'alpaca-broker-sandbox'), false, 'live provider routing remains disabled');

select set_config('request.jwt.claim.role', 'anon', true);
select throws_ok(
  $$select public.evaluate_broker_operations_health('alpaca-broker-sandbox')$$,
  'P0001',
  'This operation requires the broker-operations monitoring service',
  'anonymous callers cannot evaluate broker operations'
);

select set_config('request.jwt.claim.role', 'service_role', true);
select is(
  public.evaluate_broker_operations_health('alpaca-broker-sandbox') ->> 'operationalStatus',
  'not_run',
  'missing evidence produces an explicit not-run state'
);
select ok((select 'inventory_not_run' = any(alert_codes) from public.broker_operations_health), 'missing inventory is a health signal');
select ok((select 'adapter_probe_not_run' = any(alert_codes) from public.broker_operations_health), 'missing adapter probe is a health signal');
select is((select open_alert_count from public.broker_operations_health), 2, 'not-run evaluation opens two operational alerts');
select is((select count(*) from public.broker_operations_alerts where status = 'open'), 2::bigint, 'two not-run alerts are open');
select is((select count(*) from public.broker_operations_alerts where status = 'open' and severity = 'warning'), 2::bigint, 'not-run alerts are warnings');
select is((select count(*) from public.financial_audit_events where event_type = 'broker_operations_alert_opened'), 2::bigint, 'new operational alerts create audit events');
select is(
  public.evaluate_broker_operations_health('alpaca-broker-sandbox') ->> 'openAlerts',
  '2',
  're-evaluation preserves the open alert set'
);
select is((select count(*) from public.broker_operations_alerts), 2::bigint, 're-evaluation does not duplicate open alerts');
select is((select min(occurrence_count) from public.broker_operations_alerts), 2, 're-evaluation increments occurrence evidence');

insert into public.broker_adapter_probes (
  provider_id, environment, adapter_version, api_origin, probe_kind,
  status, http_status, latency_ms, attempt_count, error_code,
  live_order_routing_tested, created_at
) values (
  (select id from public.broker_provider_registry where code = 'alpaca-broker-sandbox'),
  'sandbox', 'alpaca-broker-sandbox-v1',
  'https://broker-api.sandbox.alpaca.markets', 'asset_read',
  'passed', 200, 10, 1, null, false, now() - interval '4 days'
);

insert into public.broker_account_inventory_runs (
  provider_id, environment, adapter_version, api_origin, inventory_kind,
  status, http_status, latency_ms, attempt_count, total_accounts,
  active_accounts, pending_accounts, action_required_accounts, rejected_accounts,
  closed_accounts, restricted_accounts, currencies, snapshot_digest,
  changed_since_previous, page_limit_reached, error_code,
  live_order_routing_tested, created_at
) values (
  (select id from public.broker_provider_registry where code = 'alpaca-broker-sandbox'),
  'sandbox', 'alpaca-broker-account-inventory-v1',
  'https://broker-api.sandbox.alpaca.markets', 'account_status_summary',
  'passed', 200, 12, 1, 0, 0, 0, 0, 0, 0, 0,
  '[]'::jsonb, repeat('a', 64), false, false, null, false,
  now() - interval '4 days'
);

select is((select operational_status from public.broker_operations_health), 'critical', 'four-day-old evidence is critical');
select ok((select 'inventory_stale' = any(alert_codes) from public.broker_operations_health), 'stale inventory is detected');
select ok((select 'adapter_probe_stale' = any(alert_codes) from public.broker_operations_health), 'stale adapter evidence is detected');
select is(
  public.evaluate_broker_operations_health('alpaca-broker-sandbox') ->> 'operationalStatus',
  'critical',
  'stale evidence evaluates as critical'
);
select is((select count(*) from public.broker_operations_alerts where status = 'open'), 2::bigint, 'stale evaluation replaces not-run alerts with two stale alerts');
select is((select count(*) from public.broker_operations_alerts where status = 'resolved' and alert_code in ('inventory_not_run', 'adapter_probe_not_run')), 2::bigint, 'not-run alerts resolve when evidence exists');
select is((select count(*) from public.broker_operations_alerts where status = 'open' and severity = 'critical'), 2::bigint, 'critically stale evidence opens critical alerts');
select is((select count(*) from public.financial_audit_events where event_type = 'broker_operations_alert_resolved'), 2::bigint, 'alert resolution creates audit events');

select is(
  public.persist_broker_adapter_probe(
    'alpaca-broker-sandbox', 'alpaca-broker-sandbox-v1',
    'https://broker-api.sandbox.alpaca.markets', 'passed', 200, 8, 1, null
  ) ->> 'status',
  'passed',
  'a fresh adapter probe can be recorded'
);
select is(
  public.persist_broker_account_inventory(
    'alpaca-broker-sandbox', 'alpaca-broker-account-inventory-v1',
    'https://broker-api.sandbox.alpaca.markets', 'passed', 200, 9, 1,
    0, 0, 0, 0, 0, 0, 0, array[]::text[], repeat('a', 64), false, null
  ) ->> 'status',
  'passed',
  'a fresh aggregate inventory can be recorded'
);
select is((select operational_status from public.broker_operations_health), 'healthy', 'fresh unchanged evidence is healthy');
select is(
  public.evaluate_broker_operations_health('alpaca-broker-sandbox') ->> 'openAlerts',
  '0',
  'healthy evidence resolves all alerts'
);
select is((select count(*) from public.broker_operations_alerts where status = 'resolved' and alert_code in ('inventory_stale', 'adapter_probe_stale')), 2::bigint, 'stale alerts resolve after fresh evidence');
select is((select count(*) from public.broker_operations_alerts where status = 'open'), 0::bigint, 'no operational alerts remain open');
select is((select count(*) from public.financial_audit_events where event_type = 'broker_operations_alert_resolved'), 4::bigint, 'all four recovered signals are audited');

select is(
  public.persist_broker_account_inventory(
    'alpaca-broker-sandbox', 'alpaca-broker-account-inventory-v1',
    'https://broker-api.sandbox.alpaca.markets', 'failed', 401, 6, 1,
    0, 0, 0, 0, 0, 0, 0, array[]::text[], null, false, 'AUTHENTICATION_FAILED'
  ) ->> 'status',
  'failed',
  'a sanitized failed inventory can be recorded'
);
select is((select operational_status from public.broker_operations_health), 'critical', 'failed inventory makes operations critical');
select is(
  public.evaluate_broker_operations_health('alpaca-broker-sandbox') ->> 'operationalStatus',
  'critical',
  'failed inventory opens a critical incident'
);
select is((select count(*) from public.broker_operations_alerts where status = 'open' and alert_code = 'inventory_sync_failed'), 1::bigint, 'one inventory failure alert is open');
select is((select severity from public.broker_operations_alerts where status = 'open' and alert_code = 'inventory_sync_failed'), 'critical', 'inventory failure severity is critical');
select ok(
  not exists (
    select 1 from public.broker_operations_alerts
    where evidence::text ~* 'account_id|account_number|email|phone|address|api_key|secret|provider_payload'
  ),
  'alert evidence contains no identifiers, PII, credentials or provider payloads'
);
select is((select count(*) from public.broker_operations_alert_feed where status = 'open'), 1::bigint, 'authenticated alert feed exposes the current incident');
select is((select orders_write_enabled from public.broker_operations_health), false, 'operations monitoring keeps broker order writes disabled');
select is((select live_order_routing_enabled from public.broker_operations_health), false, 'operations monitoring keeps live routing disabled');

select * from finish();

rollback;
