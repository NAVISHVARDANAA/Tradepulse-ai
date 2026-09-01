do $$
begin
  if to_regclass('public.broker_sandbox_order_controls') is null
    or to_regclass('public.broker_sandbox_order_receipts') is null
    or to_regclass('public.broker_sandbox_reconciliation_runs') is null
    or to_regclass('public.broker_sandbox_order_lifecycle') is null then
    raise exception 'Sandbox order lifecycle schema is incomplete';
  end if;

  if (select count(*) from public.broker_sandbox_order_controls) <> 1 or exists (
    select 1 from public.broker_sandbox_order_controls control
    join public.broker_provider_registry provider on provider.id = control.provider_id
    where control.control_key <> 'alpaca-sandbox-orders'
      or control.environment <> 'sandbox'
      or control.api_origin <> 'https://broker-api.sandbox.alpaca.markets'
      or not control.internal_submission_enabled
      or control.browser_submission_enabled
      or control.live_order_routing_enabled
      or not control.protective_orders_required
      or provider.code <> 'alpaca-broker-sandbox'
      or provider.live_order_routing_enabled
  ) then
    raise exception 'Sandbox order controls violate the Phase 6B boundary';
  end if;

  if exists (select 1 from public.brokerage_execution_controls where execution_enabled)
    or exists (select 1 from public.broker_sandbox_order_receipts where environment <> 'sandbox' or live_order_routing_enabled or browser_originated or side <> 'buy' or order_type <> 'limit' or order_class <> 'bracket') then
    raise exception 'A sandbox order receipt violates fail-closed invariants';
  end if;

  if has_table_privilege('authenticated', 'public.broker_sandbox_order_receipts', 'INSERT')
    or has_table_privilege('service_role', 'public.broker_sandbox_order_receipts', 'INSERT')
    or has_table_privilege('authenticated', 'public.broker_sandbox_order_receipts', 'UPDATE')
    or has_table_privilege('anon', 'public.broker_sandbox_order_receipts', 'SELECT')
    or has_function_privilege('authenticated', 'public.persist_broker_sandbox_order_receipt(uuid,jsonb)', 'EXECUTE') then
    raise exception 'A browser role can forge or expose sandbox order receipts';
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'broker_sandbox_receipts_append_only' and not tgisinternal)
    or not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'broker_sandbox_order_receipts') then
    raise exception 'Sandbox order append-only or realtime controls are incomplete';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name in ('broker_sandbox_order_receipts', 'broker_sandbox_reconciliation_runs')
      and column_name in ('api_key', 'api_secret', 'password', 'access_token', 'refresh_token', 'account_id', 'account_number', 'provider_account_id', 'provider_order_id')
  ) then
    raise exception 'Raw provider secrets or identifiers are present';
  end if;
end;
$$;
