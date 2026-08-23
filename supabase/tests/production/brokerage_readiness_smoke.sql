do $production_smoke$
begin
  if to_regclass('public.broker_provider_registry') is null
    or to_regclass('public.brokerage_execution_controls') is null
    or to_regclass('public.brokerage_order_previews') is null
    or to_regclass('public.broker_certification_test_catalog') is null
    or to_regclass('public.broker_certification_runs') is null
    or to_regclass('public.broker_certification_results') is null
    or to_regclass('public.broker_adapter_probes') is null
    or to_regclass('public.broker_adapter_health') is null then
    raise exception 'Phase 4C brokerage tables are incomplete';
  end if;

  if not exists (
    select 1
    from public.brokerage_execution_controls
    where control_key = 'global-live-orders'
      and execution_enabled = false
      and preview_enabled = true
  ) then
    raise exception 'Global live execution is not safely locked';
  end if;

  if exists (
    select 1
    from public.broker_provider_registry
    where live_order_routing_enabled
  ) then
    raise exception 'A broker provider route is unexpectedly enabled';
  end if;

  if not exists (
    select 1
    from public.broker_provider_registry
    where code = 'alpaca-broker-sandbox'
      and integration_status = 'sandbox'
      and account_connection_enabled = false
      and live_order_routing_enabled = false
      and metadata ->> 'api_origin' = 'https://broker-api.sandbox.alpaca.markets'
  ) then
    raise exception 'The Alpaca read-only sandbox provider contract is missing or unsafe';
  end if;

  if exists (
    select 1
    from public.investment_instruments
    where live_execution_enabled
  ) then
    raise exception 'An investment instrument is unexpectedly enabled for live execution';
  end if;

  if exists (
    select 1
    from public.brokerage_order_previews
    where executable or preview_status <> 'blocked'
  ) then
    raise exception 'A brokerage preview violates the non-executable blocked-state invariant';
  end if;

  if (
    select count(*)
    from public.broker_certification_test_catalog
    where adapter_contract_version = 'broker-adapter-v1'
      and active
      and required
  ) <> 10 then
    raise exception 'The broker-adapter-v1 certification catalog is incomplete';
  end if;

  if exists (
    select 1
    from public.broker_certification_runs
    where environment <> 'sandbox'
      or live_order_routing_tested
  ) then
    raise exception 'A certification run violated the sandbox-only routing lock';
  end if;

  if exists (
    select 1
    from public.broker_adapter_probes
    where environment <> 'sandbox'
      or api_origin <> 'https://broker-api.sandbox.alpaca.markets'
      or probe_kind <> 'asset_read'
      or live_order_routing_tested
  ) then
    raise exception 'A broker adapter probe violated the read-only sandbox lock';
  end if;

  if to_regclass('public.brokerage_orders') is not null then
    raise exception 'A live brokerage order table unexpectedly exists';
  end if;

  if exists (
    select 1
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname like '%submit%broker%order%'
  ) then
    raise exception 'A live broker-order submission function unexpectedly exists';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.brokerage_execution_controls'::regclass
      and pg_get_constraintdef(oid) ilike '%not execution_enabled%'
  ) then
    raise exception 'The database-enforced global execution constraint is missing';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.brokerage_order_previews'::regclass
      and pg_get_constraintdef(oid) ilike '%not executable%'
  ) then
    raise exception 'The database-enforced preview execution constraint is missing';
  end if;

  if not (
    select relrowsecurity
    from pg_class
    where oid = 'public.brokerage_order_previews'::regclass
  ) then
    raise exception 'Row-level security is disabled for brokerage previews';
  end if;

  if has_table_privilege('authenticated', 'public.brokerage_accounts', 'INSERT')
    or has_table_privilege('authenticated', 'public.brokerage_readiness_checks', 'INSERT')
    or has_table_privilege('authenticated', 'public.brokerage_order_previews', 'INSERT')
    or has_table_privilege('authenticated', 'public.broker_certification_runs', 'INSERT')
    or has_table_privilege('authenticated', 'public.broker_certification_results', 'INSERT')
    or has_table_privilege('authenticated', 'public.broker_adapter_probes', 'INSERT') then
    raise exception 'A browser role can forge regulated brokerage state';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.persist_brokerage_order_preview(uuid,uuid,uuid,bigint,text,text,numeric,numeric,numeric,numeric,text,jsonb,text,timestamptz,timestamptz)',
    'EXECUTE'
  ) then
    raise exception 'The browser role can execute the service-only preview writer';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.persist_broker_certification_report(text,text,text,timestamptz,timestamptz,jsonb,text)',
    'EXECUTE'
  ) then
    raise exception 'The browser role can execute the service-only certification writer';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.persist_broker_adapter_probe(text,text,text,text,integer,integer,integer,text)',
    'EXECUTE'
  ) then
    raise exception 'The browser role can execute the service-only adapter probe writer';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.record_brokerage_consent(uuid)',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.record_brokerage_consent(uuid)',
    'EXECUTE'
  ) then
    raise exception 'Brokerage consent authorization grants are unsafe';
  end if;

  raise notice 'Phase 4C production brokerage, certification and adapter locks verified';
end
$production_smoke$;
