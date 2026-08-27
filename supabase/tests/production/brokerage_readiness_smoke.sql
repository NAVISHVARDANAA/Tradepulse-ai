do $production_smoke$
begin
  if to_regclass('public.broker_provider_registry') is null
    or to_regclass('public.brokerage_execution_controls') is null
    or to_regclass('public.brokerage_order_previews') is null
    or to_regclass('public.broker_certification_test_catalog') is null
    or to_regclass('public.broker_certification_runs') is null
    or to_regclass('public.broker_certification_results') is null
    or to_regclass('public.broker_adapter_probes') is null
    or to_regclass('public.broker_adapter_health') is null
    or to_regclass('public.broker_account_inventory_runs') is null
    or to_regclass('public.broker_account_inventory_health') is null
    or to_regclass('public.broker_operations_policies') is null
    or to_regclass('public.broker_operations_alerts') is null
    or to_regclass('public.broker_operations_health') is null
    or to_regclass('public.broker_operations_alert_feed') is null
    or to_regclass('public.paper_decision_contexts') is null
    or to_regclass('public.paper_decision_outcomes') is null
    or to_regclass('public.paper_decision_journal') is null
    or to_regclass('public.paper_decision_scorecard') is null
    or to_regclass('public.forecast_governance_policies') is null
    or to_regclass('public.forecast_reliability_snapshots') is null
    or to_regclass('public.forecast_reliability_latest') is null
    or to_regclass('public.display_qualified_market_forecasts') is null
    or to_regclass('public.platform_service_policies') is null
    or to_regclass('public.platform_health_evidence') is null
    or to_regclass('public.platform_incidents') is null
    or to_regclass('public.platform_incident_events') is null
    or to_regclass('public.platform_public_status') is null
    or to_regclass('public.account_security_posture') is null
    or to_regclass('public.account_security_events') is null
    or to_regclass('public.customer_privacy_preferences') is null
    or to_regclass('public.customer_privacy_requests') is null
    or to_regclass('public.data_quality_policies') is null
    or to_regclass('public.data_quality_evaluations') is null
    or to_regclass('public.notification_preferences') is null
    or to_regclass('public.notification_consent_events') is null
    or to_regclass('public.commercial_plans') is null
    or to_regclass('public.customer_subscriptions') is null
    or to_regclass('public.subscription_events') is null
    or to_regclass('public.usage_events') is null
    or to_regclass('public.customer_experience_events') is null
    or to_regclass('public.customer_support_requests') is null
    or to_regclass('public.business_workspaces') is null
    or to_regclass('public.business_workspace_memberships') is null
    or to_regclass('public.business_workspace_invitations') is null
    or to_regclass('public.business_research_collections') is null
    or to_regclass('public.business_research_items') is null then
    raise exception 'Phase 4S trust, security and shared-research objects are incomplete';
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
      and metadata ->> 'account_inventory_path' = '/v1/accounts'
      and metadata ->> 'account_inventory_query' = 'entities=trading_configurations'
      and metadata ->> 'account_inventory_mode' = 'sanitized_aggregate_read_only'
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

  if exists (
    select 1
    from public.broker_account_inventory_runs
    where environment <> 'sandbox'
      or api_origin <> 'https://broker-api.sandbox.alpaca.markets'
      or inventory_kind <> 'account_status_summary'
      or total_accounts <> active_accounts + pending_accounts +
        action_required_accounts + rejected_accounts + closed_accounts
      or live_order_routing_tested
  ) then
    raise exception 'A broker account inventory violated the aggregate read-only sandbox lock';
  end if;

  if exists (
    select 1
    from public.broker_operations_alerts
    where environment <> 'sandbox'
      or severity not in ('warning', 'critical')
      or status not in ('open', 'resolved')
      or evidence::text ~* 'account_id|account_number|customer_name|email|phone|address|api_key|secret|access_token|provider_payload'
  ) then
    raise exception 'A broker operations alert violated the sanitized sandbox contract';
  end if;

  if exists (
    select 1
    from public.broker_operations_health
    where orders_read_enabled
      or orders_write_enabled
      or account_connection_enabled
      or live_order_routing_enabled
  ) then
    raise exception 'Broker operations monitoring unexpectedly enabled an execution route';
  end if;

  if exists (
    select 1
    from public.paper_decision_contexts
    where not simulation
      or conviction not between 1 and 5
      or planned_horizon_hours not in (1, 24, 72, 168, 720)
      or length(trim(thesis)) not between 8 and 500
  ) then
    raise exception 'Paper decision evidence violated its private simulation contract';
  end if;

  if exists (
    select 1
    from public.paper_decision_outcomes
    where not simulation
      or evaluation_status not in ('evaluated', 'insufficient_data')
  ) then
    raise exception 'A paper decision outcome violated its simulation contract';
  end if;

  if exists (
    select 1
    from public.paper_decision_journal
    where orders_write_enabled or live_order_routing_enabled or not simulation
  ) then
    raise exception 'The paper decision journal unexpectedly enabled execution';
  end if;

  if (select count(*) from public.forecast_governance_policies where active) <> 1 then
    raise exception 'Forecast governance must have exactly one active policy';
  end if;

  if exists (
    select 1
    from public.forecast_reliability_snapshots
    where reliability_status not in (
      'insufficient_evidence', 'qualified', 'watch', 'suspended'
    )
      or display_eligible <> (reliability_status <> 'suspended')
      or reason_codes::text ~* 'api_key|secret|account_number|customer_name|email|phone|address|access_token|provider_payload'
  ) then
    raise exception 'Forecast reliability evidence violated its sanitized display contract';
  end if;

  if exists (
    select 1
    from public.display_qualified_market_forecasts displayed
    join public.forecast_reliability_latest reliability
      on reliability.asset_id = displayed.asset_id
      and reliability.model_name = displayed.model_name
      and reliability.model_version = displayed.model_version
      and reliability.horizon_hours = displayed.horizon_hours
    where reliability.reliability_status = 'suspended'
  ) then
    raise exception 'A suspended forecast model remains visible';
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

  if not (
    select relrowsecurity
    from pg_class
    where oid = 'public.forecast_reliability_snapshots'::regclass
  ) then
    raise exception 'Row-level security is disabled for forecast reliability evidence';
  end if;

  if not (
    select relrowsecurity
    from pg_class
    where oid = 'public.platform_health_evidence'::regclass
  ) or not (
    select relrowsecurity
    from pg_class
    where oid = 'public.platform_incidents'::regclass
  ) or not (
    select relrowsecurity
    from pg_class
    where oid = 'public.platform_incident_events'::regclass
  ) then
    raise exception 'Row-level security is disabled for reliability evidence';
  end if;

  if not (
    select relrowsecurity
    from pg_class
    where oid = 'public.account_security_posture'::regclass
  ) or not (
    select relrowsecurity
    from pg_class
    where oid = 'public.account_security_events'::regclass
  ) then
    raise exception 'Row-level security is disabled for account security evidence';
  end if;

  if has_table_privilege('anon', 'public.account_security_posture', 'SELECT')
    or has_table_privilege('anon', 'public.account_security_events', 'SELECT')
    or has_table_privilege('authenticated', 'public.account_security_posture', 'INSERT')
    or has_table_privilege('authenticated', 'public.account_security_posture', 'UPDATE')
    or has_table_privilege('authenticated', 'public.account_security_events', 'INSERT')
    or has_table_privilege('authenticated', 'public.account_security_events', 'UPDATE')
    or has_table_privilege('authenticated', 'public.account_security_events', 'DELETE') then
    raise exception 'Account security evidence grants are unsafe';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'platform_health_evidence',
        'platform_incidents',
        'platform_incident_events',
        'platform_public_status'
      )
      and column_name ~ '(^|_)(user_id|account_id|account_number|customer_name|email|phone|address|api_key|secret|password|access_token|provider_payload|request_body|response_body)($|_)'
  ) then
    raise exception 'Platform observability contains a prohibited sensitive field';
  end if;

  if has_table_privilege('authenticated', 'public.brokerage_accounts', 'INSERT')
    or has_table_privilege('authenticated', 'public.brokerage_readiness_checks', 'INSERT')
    or has_table_privilege('authenticated', 'public.brokerage_order_previews', 'INSERT')
    or has_table_privilege('authenticated', 'public.broker_certification_runs', 'INSERT')
    or has_table_privilege('authenticated', 'public.broker_certification_results', 'INSERT')
    or has_table_privilege('authenticated', 'public.broker_adapter_probes', 'INSERT')
    or has_table_privilege('authenticated', 'public.broker_account_inventory_runs', 'INSERT')
    or has_table_privilege('authenticated', 'public.broker_operations_alerts', 'INSERT')
    or has_table_privilege('authenticated', 'public.broker_operations_alerts', 'UPDATE')
    or has_table_privilege('authenticated', 'public.paper_decision_contexts', 'INSERT')
    or has_table_privilege('authenticated', 'public.paper_decision_contexts', 'UPDATE')
    or has_table_privilege('authenticated', 'public.paper_decision_outcomes', 'INSERT')
    or has_table_privilege('service_role', 'public.paper_decision_outcomes', 'INSERT')
    or has_table_privilege('authenticated', 'public.forecast_evaluations', 'INSERT')
    or has_table_privilege('service_role', 'public.forecast_evaluations', 'INSERT')
    or has_table_privilege('authenticated', 'public.forecast_reliability_snapshots', 'INSERT')
    or has_table_privilege('service_role', 'public.forecast_reliability_snapshots', 'INSERT')
    or has_table_privilege('authenticated', 'public.model_drift_events', 'INSERT')
    or has_table_privilege('authenticated', 'public.platform_health_evidence', 'INSERT')
    or has_table_privilege('service_role', 'public.platform_health_evidence', 'INSERT')
    or has_table_privilege('authenticated', 'public.platform_incidents', 'UPDATE')
    or has_table_privilege('service_role', 'public.platform_incidents', 'UPDATE')
    or has_table_privilege('authenticated', 'public.platform_incident_events', 'DELETE') then
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

  if has_function_privilege(
    'authenticated',
    'public.persist_broker_account_inventory(text,text,text,text,integer,integer,integer,integer,integer,integer,integer,integer,integer,integer,text[],text,boolean,text)',
    'EXECUTE'
  ) then
    raise exception 'The browser role can execute the service-only account inventory writer';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.evaluate_broker_operations_health(text)',
    'EXECUTE'
  ) then
    raise exception 'The browser role can execute the service-only broker operations evaluator';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.execute_paper_market_order_with_context(uuid,uuid,bigint,text,text,numeric,text,integer,integer)',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.evaluate_paper_decision_outcomes(uuid,uuid)',
    'EXECUTE'
  ) then
    raise exception 'The browser role can execute a service-only paper decision function';
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

  if has_function_privilege(
    'authenticated',
    'public.evaluate_forecast_governance(timestamptz)',
    'EXECUTE'
  ) or not has_function_privilege(
    'service_role',
    'public.evaluate_forecast_governance(timestamptz)',
    'EXECUTE'
  ) then
    raise exception 'Forecast governance evaluator grants are unsafe';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.evaluate_platform_reliability()',
    'EXECUTE'
  ) or not has_function_privilege(
    'service_role',
    'public.evaluate_platform_reliability()',
    'EXECUTE'
  ) or has_function_privilege(
    'service_role',
    'public.run_platform_reliability_cron()',
    'EXECUTE'
  ) then
    raise exception 'Platform reliability evaluator grants are unsafe';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.sync_account_security_posture(uuid,integer,text[],text,text)',
    'EXECUTE'
  ) or not has_function_privilege(
    'service_role',
    'public.sync_account_security_posture(uuid,integer,text[],text,text)',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.record_account_session_action(uuid,text)',
    'EXECUTE'
  ) or not has_function_privilege(
    'service_role',
    'public.record_account_session_action(uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'Account security service grants are unsafe';
  end if;

  if exists (
    select 1 from public.billing_provider_registry
    where checkout_enabled or charge_collection_enabled or customer_portal_enabled
  ) then
    raise exception 'A production billing execution path is unexpectedly enabled';
  end if;

  if exists (select 1 from public.usage_meter_definitions where billable) then
    raise exception 'A usage meter is unexpectedly billable';
  end if;

  if has_table_privilege('authenticated','public.customer_subscriptions','UPDATE')
    or has_table_privilege('authenticated','public.usage_events','INSERT') then
    raise exception 'A browser role can forge commercial access or usage evidence';
  end if;

  raise notice 'Phase 4S execution locks and shared-research boundaries verified';
end
$production_smoke$;
