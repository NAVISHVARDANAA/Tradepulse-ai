begin;

select plan(96);

select ok(to_regclass('public.global_brokerage_custody_controls') is not null, 'global brokerage controls exist');
select ok(to_regclass('public.global_brokerage_partner_roles') is not null, 'independent partner roles exist');
select ok(to_regclass('public.global_brokerage_launch_matrix') is not null, 'exact launch matrices exist');
select ok(to_regclass('public.global_brokerage_onboarding_requirements') is not null, 'onboarding requirements exist');
select ok(to_regclass('public.global_brokerage_onboarding_cases') is not null, 'private onboarding cases exist');
select ok(to_regclass('public.global_brokerage_evidence_rehearsals') is not null, 'identity-bound evidence rehearsals exist');
select ok(to_regclass('public.global_brokerage_order_previews') is not null, 'global cost previews exist');
select ok(to_regclass('public.global_brokerage_reconciliation_runs') is not null, 'reconciliation runs exist');
select ok(to_regclass('public.global_brokerage_reconciliation_items') is not null, 'reconciliation items exist');
select ok(to_regclass('public.global_brokerage_launch_matrix_catalog') is not null, 'public launch matrix catalog exists');
select ok(to_regclass('public.global_brokerage_orchestration_summary') is not null, 'public orchestration summary exists');
select ok(to_regclass('public.global_brokerage_onboarding_progress') is not null, 'private onboarding progress view exists');
select ok(to_regclass('public.global_brokerage_preview_history') is not null, 'private preview history exists');
select ok(to_regclass('public.global_brokerage_reconciliation_history') is not null, 'private reconciliation history exists');

select is((select count(*) from public.global_brokerage_custody_controls), 1::bigint, 'one Phase 8D control is seeded');
select is((select count(*) from public.global_brokerage_partner_roles), 5::bigint, 'five independent partner roles are modeled');
select is((select count(*) from public.global_brokerage_partner_roles where assignment_status = 'unassigned'), 5::bigint, 'every partner role remains unassigned');
select ok(not exists(select 1 from public.global_brokerage_partner_roles where production_enabled or partner_identifier is not null or credential_status <> 'absent'), 'no production partner or credential is configured');
select is((select count(*) from public.global_brokerage_launch_matrix), 4::bigint, 'four exact launch scenarios are modeled');
select is((select count(*) from public.global_brokerage_launch_matrix_catalog), 4::bigint, 'all launch scenarios reach the sanitized catalog');
select is((select count(distinct residency_country) from public.global_brokerage_launch_matrix), 4::bigint, 'launch scenarios remain residency-specific');
select is((select count(distinct venue_id) from public.global_brokerage_launch_matrix), 4::bigint, 'launch scenarios remain venue-specific');
select is((select count(*) from public.global_brokerage_onboarding_requirements), 10::bigint, 'ten onboarding evidence gates are modeled');
select ok((select bool_and(identity_bound and evidence_expires and activation_blocking and not raw_evidence_storage_enabled) from public.global_brokerage_onboarding_requirements), 'all onboarding evidence is identity-bound, expiring, blocking and raw-storage disabled');
select ok(not exists(select 1 from public.global_brokerage_launch_matrix where matrix_status <> 'blocked' or legal_approval_status <> 'missing' or compliance_approval_status <> 'missing' or tax_approval_status <> 'missing' or market_data_approval_status <> 'missing' or broker_approval_status <> 'missing' or custody_approval_status <> 'missing' or security_approval_status <> 'missing' or operations_approval_status <> 'missing'), 'all matrix approvals remain missing');
select ok(not exists(select 1 from public.global_brokerage_launch_matrix where broker_assigned or exchange_access_assigned or clearing_partner_assigned or custody_partner_assigned or market_data_partner_assigned or onboarding_supported or live_execution_enabled), 'all partner assignments and activation paths remain false');

select ok((select bool_and(relrowsecurity) from pg_class where oid in (
  'public.global_brokerage_custody_controls'::regclass,
  'public.global_brokerage_partner_roles'::regclass,
  'public.global_brokerage_launch_matrix'::regclass,
  'public.global_brokerage_onboarding_requirements'::regclass,
  'public.global_brokerage_onboarding_cases'::regclass,
  'public.global_brokerage_evidence_rehearsals'::regclass,
  'public.global_brokerage_order_previews'::regclass,
  'public.global_brokerage_reconciliation_runs'::regclass,
  'public.global_brokerage_reconciliation_items'::regclass
)), 'every Phase 8D table uses RLS');
select ok(has_table_privilege('anon', 'public.global_brokerage_launch_matrix_catalog', 'SELECT'), 'guests can inspect the blocked matrix catalog');
select ok(has_table_privilege('anon', 'public.global_brokerage_orchestration_summary', 'SELECT'), 'guests can inspect the fail-closed summary');
select ok(not has_table_privilege('anon', 'public.global_brokerage_onboarding_cases', 'SELECT'), 'guests cannot read private onboarding cases');
select ok(has_table_privilege('authenticated', 'public.global_brokerage_onboarding_cases', 'SELECT'), 'authenticated users can read their own cases');
select ok(not has_table_privilege('authenticated', 'public.global_brokerage_onboarding_cases', 'INSERT'), 'browser users cannot forge onboarding cases');
select ok(not has_table_privilege('authenticated', 'public.global_brokerage_evidence_rehearsals', 'UPDATE'), 'browser users cannot mutate evidence rehearsals');
select ok(not has_table_privilege('service_role', 'public.global_brokerage_order_previews', 'INSERT'), 'service role must use the protected preview RPC');
select ok(coalesce((select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.global_brokerage_launch_matrix_catalog'::regclass), false), 'launch matrix catalog preserves caller permissions');
select ok(coalesce((select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.global_brokerage_onboarding_progress'::regclass), false), 'onboarding progress preserves caller permissions');

select ok(to_regprocedure('public.initialize_global_brokerage_case(uuid,text,bigint,text)') is not null, 'case initialization RPC exists');
select ok(to_regprocedure('public.record_global_brokerage_evidence_rehearsal(uuid,uuid,text,text,text,timestamptz,timestamptz)') is not null, 'evidence rehearsal RPC exists');
select ok(to_regprocedure('public.create_global_brokerage_order_preview(uuid,uuid,text,bigint,text,text,numeric,numeric)') is not null, 'global preview RPC exists');
select ok(to_regprocedure('public.reconcile_global_brokerage_case(uuid,uuid,text)') is not null, 'global reconciliation RPC exists');
select ok(not has_function_privilege('authenticated', 'public.create_global_brokerage_order_preview(uuid,uuid,text,bigint,text,text,numeric,numeric)', 'EXECUTE'), 'browser cannot call the preview RPC directly');
select ok(has_function_privilege('service_role', 'public.create_global_brokerage_order_preview(uuid,uuid,text,bigint,text,text,numeric,numeric)', 'EXECUTE'), 'protected service can call the preview RPC');
select ok(pg_get_functiondef('public.create_global_brokerage_order_preview(uuid,uuid,text,bigint,text,text,numeric,numeric)'::regprocedure) !~* 'https?://|fetch\(|alpaca|broker_api', 'preview engine has no provider or HTTP path');
select ok(pg_get_functiondef('public.record_global_brokerage_evidence_rehearsal(uuid,uuid,text,text,text,timestamptz,timestamptz)'::regprocedure) ~* 'approvalGranted.*false', 'evidence rehearsal cannot grant approval');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-4000-8000-00000000008d',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'phase8d@example.test', '', now(), now(), now(),
  '{}'::jsonb, '{"display_name":"Phase 8D Test"}'::jsonb
);

select set_config('request.jwt.claim.role', 'service_role', true);

select is(
  public.initialize_global_brokerage_case(
    '00000000-0000-4000-8000-00000000008d', 'phase8d-case-001',
    (select id from public.global_brokerage_launch_matrix where matrix_code = 'US:XNAS:CASH:EQUITY'), 'USD'
  ) ->> 'status',
  'review_only', 'a private review-only case initializes'
);
select is((select activation_status from public.global_brokerage_onboarding_cases), 'blocked', 'case activation remains blocked');
select ok(not (select live_brokerage_account_created from public.global_brokerage_onboarding_cases), 'case creates no live brokerage account');
select ok(not (select custody_account_created from public.global_brokerage_onboarding_cases), 'case creates no custody account');
select ok(not (select funding_account_linked from public.global_brokerage_onboarding_cases), 'case links no funding account');
select is(
  public.initialize_global_brokerage_case(
    '00000000-0000-4000-8000-00000000008d', 'phase8d-case-001',
    (select id from public.global_brokerage_launch_matrix where matrix_code = 'US:XNAS:CASH:EQUITY'), 'USD'
  ) ->> 'idempotentReplay',
  'true', 'duplicate case initialization is idempotent'
);
select is((select count(*) from public.global_brokerage_onboarding_cases), 1::bigint, 'idempotent case remains singular');

select is(
  public.record_global_brokerage_evidence_rehearsal(
    '00000000-0000-4000-8000-00000000008d',
    (select id from public.global_brokerage_onboarding_cases),
    'phase8d-evidence-001', 'identity_kyc_kyb', repeat('a', 64),
    now(), now() + interval '7 days'
  ) ->> 'status',
  'rehearsal_recorded', 'identity evidence rehearsal is recorded'
);
select ok((select identity_bound and simulation_only and not raw_evidence_stored and not approval_effect from public.global_brokerage_evidence_rehearsals), 'evidence rehearsal is identity-bound, simulated, redacted and non-approving');
select ok((select expires_at > observed_at from public.global_brokerage_evidence_rehearsals), 'evidence rehearsal expires');
select is(
  public.record_global_brokerage_evidence_rehearsal(
    '00000000-0000-4000-8000-00000000008d',
    (select id from public.global_brokerage_onboarding_cases),
    'phase8d-evidence-001', 'identity_kyc_kyb', repeat('a', 64),
    now(), now() + interval '7 days'
  ) ->> 'idempotentReplay',
  'true', 'duplicate evidence rehearsal is idempotent'
);
select is((select rehearsed_requirement_count from public.global_brokerage_onboarding_progress), 1, 'private progress counts current rehearsal evidence');
select is((select blocking_requirement_count from public.global_brokerage_onboarding_progress), 10, 'rehearsal does not clear any activation blocker');

select is(
  public.create_global_brokerage_order_preview(
    '00000000-0000-4000-8000-00000000008d',
    (select id from public.global_brokerage_onboarding_cases),
    'phase8d-preview-001',
    (select id from public.global_instrument_listings where listing_key = 'XNAS:AAPL'),
    'buy', 'market', 2, null
  ) ->> 'status',
  'blocked', 'global brokerage cost preview remains blocked'
);
select is((select scenario_price from public.global_brokerage_order_previews), 250.00000000::numeric, 'preview uses deterministic scenario price');
select is((select gross_notional from public.global_brokerage_order_previews), 500.00000000::numeric, 'preview notional is deterministic');
select is((select commission_amount from public.global_brokerage_order_previews), 0.25000000::numeric, 'commission is explicit');
select is((select venue_fee_amount from public.global_brokerage_order_previews), 0.05000000::numeric, 'venue fee is explicit');
select is((select estimated_tax_amount from public.global_brokerage_order_previews), 0.10000000::numeric, 'estimated tax is explicit');
select is((select estimated_total_base from public.global_brokerage_order_previews), 500.40000000::numeric, 'complete deterministic total is calculated in base currency');
select is((select settlement_currency from public.global_brokerage_order_previews), 'USD', 'settlement currency is explicit');
select is((select buying_power_status from public.global_brokerage_order_previews), 'unavailable', 'real buying power remains unavailable');
select is((select route_option_count from public.global_brokerage_order_previews), 0, 'no route option exists');
select ok(not (select executable or partner_instruction_created or cross_border_payment_linked from public.global_brokerage_order_previews), 'preview creates no execution, partner instruction or payment link');
select is((select jsonb_array_length(route_evidence) from public.global_brokerage_order_previews), 5, 'preview shows every unassigned partner role');
select is((select jsonb_array_length(block_reasons) from public.global_brokerage_order_previews), 5, 'preview retains complete fail-closed reasons');
select is(
  public.create_global_brokerage_order_preview(
    '00000000-0000-4000-8000-00000000008d',
    (select id from public.global_brokerage_onboarding_cases),
    'phase8d-preview-001',
    (select id from public.global_instrument_listings where listing_key = 'XNAS:AAPL'),
    'buy', 'market', 2, null
  ) ->> 'idempotentReplay',
  'true', 'duplicate preview is idempotent'
);
select is((select count(*) from public.global_brokerage_preview_history), 1::bigint, 'private preview history remains singular');
select throws_ok(
  $$select public.create_global_brokerage_order_preview(
    '00000000-0000-4000-8000-00000000008d',
    (select id from public.global_brokerage_onboarding_cases),
    'phase8d-preview-001',
    (select id from public.global_instrument_listings where listing_key = 'XNAS:AAPL'),
    'buy', 'market', 3, null
  )$$,
  'P0001', 'Global brokerage preview id was reused with different input',
  'preview request identifiers cannot be replayed with changed inputs'
);
select throws_ok(
  $$select public.create_global_brokerage_order_preview(
    '00000000-0000-4000-8000-00000000008d',
    (select id from public.global_brokerage_onboarding_cases),
    'phase8d-preview-wrong',
    (select id from public.global_instrument_listings where listing_key = 'XNAS:QQQ'),
    'buy', 'market', 1, null
  )$$,
  'P0001', 'Listing is outside the blocked launch matrix',
  'listing outside the exact asset-class matrix fails closed'
);
select is(
  public.create_global_brokerage_order_preview(
    '00000000-0000-4000-8000-00000000008d',
    (select id from public.global_brokerage_onboarding_cases),
    'phase8d-preview-sell',
    (select id from public.global_instrument_listings where listing_key = 'XNAS:AAPL'),
    'sell', 'market', 2, null
  ) ->> 'status',
  'blocked', 'sell cost preview remains non-executable'
);
select is(
  (select estimated_total_base from public.global_brokerage_order_previews
    where client_preview_id = 'phase8d-preview-sell'),
  499.60000000::numeric,
  'sell preview exposes net estimated proceeds after explicit costs'
);

select is(
  public.reconcile_global_brokerage_case(
    '00000000-0000-4000-8000-00000000008d',
    (select id from public.global_brokerage_onboarding_cases),
    'phase8d-reconcile-001'
  ) ->> 'status',
  'not_ready', 'reconciliation remains not ready without production sources'
);
select is((select count(*) from public.global_brokerage_reconciliation_items), 5::bigint, 'five independent reconciliation domains are retained');
select is((select blocking_domain_count from public.global_brokerage_reconciliation_runs), 5, 'every reconciliation domain blocks');
select is((select partner_statement_count from public.global_brokerage_reconciliation_runs), 0, 'no partner statement is fabricated');
select is((select signed_event_count from public.global_brokerage_reconciliation_runs), 0, 'no signed partner event is fabricated');
select ok(not (select production_effect from public.global_brokerage_reconciliation_runs), 'reconciliation has no production effect');
select is((select jsonb_array_length(items) from public.global_brokerage_reconciliation_history), 5, 'reconciliation history exposes five sanitized gaps');
select is(
  (select string_agg(domain, ',' order by domain) from public.global_brokerage_reconciliation_items),
  'allocation,cash,custody,order,settlement',
  'order, allocation, cash, custody and settlement reconcile independently'
);
select is(
  public.reconcile_global_brokerage_case(
    '00000000-0000-4000-8000-00000000008d',
    (select id from public.global_brokerage_onboarding_cases),
    'phase8d-reconcile-001'
  ) ->> 'idempotentReplay',
  'true', 'duplicate reconciliation request is idempotent'
);
select throws_ok(
  $$select public.reconcile_global_brokerage_case(
    '00000000-0000-4000-8000-00000000008d',
    gen_random_uuid(),
    'phase8d-reconcile-001'
  )$$,
  'P0001', 'Global brokerage reconciliation id was reused with different input',
  'reconciliation request identifiers cannot be replayed across cases'
);

select throws_ok(
  $$update public.global_brokerage_evidence_rehearsals set expires_at = now() + interval '8 days'$$,
  'P0001', 'Global brokerage orchestration evidence is append-only',
  'evidence rehearsal is append-only'
);
select throws_ok(
  $$delete from public.global_brokerage_order_previews$$,
  'P0001', 'Global brokerage orchestration evidence is append-only',
  'preview evidence is append-only'
);

select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok(
  $$select public.reconcile_global_brokerage_case(
    '00000000-0000-4000-8000-00000000008d',
    (select id from public.global_brokerage_onboarding_cases),
    'phase8d-reconcile-client'
  )$$,
  'P0001', 'Global brokerage reconciliation requires the orchestration service',
  'authenticated clients cannot bypass the protected service'
);

select ok(not exists(select 1 from public.global_brokerage_custody_controls where activation_status <> 'blocked' or live_broker_connectivity_enabled or exchange_connectivity_enabled or clearing_connectivity_enabled or custody_accounts_enabled or customer_asset_safeguarding_enabled or real_cash_ledger_enabled or real_position_ledger_enabled or settlement_instructions_enabled or market_data_credentials_enabled or cross_border_funding_link_enabled or live_order_routing_enabled or automatic_activation_enabled), 'every Phase 8D production capability remains disabled');
select ok(to_regclass('public.global_live_brokerage_orders') is null and to_regclass('public.production_custody_accounts') is null, 'no live global order or custody table exists');
select ok(to_regprocedure('public.route_global_brokerage_order(jsonb)') is null, 'no global live-order routing RPC exists');
select ok(to_regprocedure('public.link_payment_quote_to_brokerage_cash(jsonb)') is null, 'no payment-to-brokerage funding RPC exists');
select ok(not exists(select 1 from public.live_trading_activation_controls where live_order_routing_enabled or customer_funding_enabled or custody_enabled or settlement_enabled), 'existing live-trading locks remain closed');
select ok(not exists(select 1 from public.payment_money_movement_controls where production_partner_connectivity_enabled or customer_funding_enabled or transfer_creation_enabled or financial_ledger_posting_enabled or safeguarding_account_activation_enabled or payment_execution_enabled or money_movement_enabled), 'existing money-movement locks remain closed');
select ok(not exists(select 1 from public.options_paper_controls where live_options_routing_enabled or broker_connectivity_enabled or real_customer_funds_enabled or custody_enabled or real_settlement_enabled), 'existing options locks remain closed');

select * from finish();
rollback;
