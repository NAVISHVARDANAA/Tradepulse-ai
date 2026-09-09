begin;

select plan(82);

select ok(to_regclass('public.options_paper_controls') is not null, 'options simulation controls exist');
select ok(to_regclass('public.options_chain_entitlements') is not null, 'option-chain display entitlements exist');
select ok(to_regclass('public.options_chain_scenarios') is not null, 'deterministic option chains exist');
select ok(to_regclass('public.options_paper_accounts') is not null, 'private options paper accounts exist');
select ok(to_regclass('public.options_paper_appropriateness_profiles') is not null, 'private options education assessments exist');
select ok(to_regclass('public.options_paper_strategies') is not null, 'defined-risk paper strategies exist');
select ok(to_regclass('public.options_paper_legs') is not null, 'strategy legs exist');
select ok(to_regclass('public.options_paper_events') is not null, 'options lifecycle events exist');
select ok(to_regclass('public.options_paper_journal_entries') is not null, 'options paper journals exist');
select ok(to_regclass('public.options_paper_journal_lines') is not null, 'balanced options journal lines exist');
select ok(to_regclass('public.options_paper_reconciliations') is not null, 'options reconciliation evidence exists');
select ok(to_regclass('public.options_paper_chain_catalog') is not null, 'public educational chain catalog exists');
select ok(to_regclass('public.options_paper_strategy_history') is not null, 'private strategy history exists');

select is((select count(*) from public.options_paper_controls), 1::bigint, 'one options simulation control is seeded');
select ok((select education_workspace_enabled and single_leg_simulation_enabled and defined_risk_spread_simulation_enabled and payoff_simulation_enabled and assignment_simulation_enabled from public.options_paper_controls), 'education and simulation capabilities are enabled');
select ok(not exists(select 1 from public.options_paper_controls where live_market_data_enabled or live_options_routing_enabled or broker_connectivity_enabled or real_customer_funds_enabled or real_positions_enabled or custody_enabled or real_settlement_enabled or margin_enabled or uncovered_short_options_enabled or automatic_options_permission_enabled), 'every live options capability remains disabled');
select is((select count(*) from public.options_chain_entitlements), 1::bigint, 'one deterministic education entitlement is modeled');
select is((select count(*) from public.options_chain_scenarios), 8::bigint, 'eight deterministic option contracts are modeled');
select is((select count(distinct underlying_listing_id) from public.options_chain_scenarios), 2::bigint, 'two option underlyings are modeled');
select is((select count(*) from public.options_paper_chain_catalog), 8::bigint, 'only entitled deterministic contracts reach the catalog');
select ok(not exists(select 1 from public.options_chain_scenarios where source_type <> 'deterministic_fixture' or not simulation_only or live_contract_id is not null), 'chains contain no live contract or feed identity');

select ok((select bool_and(relrowsecurity) from pg_class where oid in (
  'public.options_paper_controls'::regclass,
  'public.options_chain_entitlements'::regclass,
  'public.options_chain_scenarios'::regclass,
  'public.options_paper_accounts'::regclass,
  'public.options_paper_appropriateness_profiles'::regclass,
  'public.options_paper_strategies'::regclass,
  'public.options_paper_legs'::regclass,
  'public.options_paper_events'::regclass,
  'public.options_paper_journal_entries'::regclass,
  'public.options_paper_journal_lines'::regclass,
  'public.options_paper_reconciliations'::regclass
)), 'every Phase 8C table uses RLS');
select ok(not has_table_privilege('authenticated', 'public.options_paper_strategies', 'INSERT'), 'browser users cannot forge option strategies');
select ok(not has_table_privilege('authenticated', 'public.options_paper_accounts', 'UPDATE'), 'browser users cannot alter options virtual cash');
select ok(not has_table_privilege('service_role', 'public.options_paper_strategies', 'INSERT'), 'service role must use the options simulation RPC');
select ok(has_table_privilege('authenticated', 'public.options_paper_strategies', 'SELECT'), 'users can read their own option strategies');
select ok(has_table_privilege('anon', 'public.options_paper_chain_catalog', 'SELECT'), 'guests can read the educational chain catalog');
select ok(coalesce((select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.options_paper_chain_catalog'::regclass), false), 'chain catalog preserves caller permissions');
select ok(coalesce((select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.options_paper_strategy_history'::regclass), false), 'strategy history preserves caller permissions');

select ok(to_regprocedure('public.initialize_options_paper_account(uuid,uuid,numeric,text,text,text,text)') is not null, 'options account initialization RPC exists');
select ok(to_regprocedure('public.create_options_paper_strategy(uuid,uuid,text,text,bigint,bigint,integer)') is not null, 'defined-risk strategy RPC exists');
select ok(to_regprocedure('public.simulate_options_paper_event(uuid,uuid,uuid,text,text,numeric)') is not null, 'options lifecycle RPC exists');
select ok(to_regprocedure('public.reconcile_options_paper_portfolio(uuid,uuid)') is not null, 'options reconciliation RPC exists');
select ok(not has_function_privilege('authenticated', 'public.create_options_paper_strategy(uuid,uuid,text,text,bigint,bigint,integer)', 'EXECUTE'), 'browser cannot call strategy RPC directly');
select ok(has_function_privilege('service_role', 'public.create_options_paper_strategy(uuid,uuid,text,text,bigint,bigint,integer)', 'EXECUTE'), 'protected service can call strategy RPC');
select ok(pg_get_functiondef('public.create_options_paper_strategy(uuid,uuid,text,text,bigint,bigint,integer)'::regprocedure) !~* 'alpaca|https?://|broker_api', 'options engine has no provider or HTTP path');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-4000-8000-00000000008c',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'phase8c@example.test', '', now(), now(), now(),
  '{}'::jsonb, '{"display_name":"Phase 8C Test"}'::jsonb
);

select set_config('request.jwt.claim.role', 'service_role', true);

select is(
  public.create_paper_portfolio('00000000-0000-4000-8000-00000000008c', 'Options Lab', 'USD', 100000) ->> 'portfolio_type',
  'paper', 'existing private paper portfolio foundation is reused'
);
select is(
  public.initialize_options_paper_account(
    '00000000-0000-4000-8000-00000000008c',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008c'),
    100000, 'beginner', 'education', 'low', 'IN'
  ) ->> 'status',
  'created', 'education-only options account initializes'
);
select is((select cash_balance from public.options_paper_accounts), 100000.00000000::numeric, 'initial options virtual cash is exact');
select is((select assessment_status from public.options_paper_appropriateness_profiles), 'education_only', 'assessment never becomes trading permission');
select ok(not (select live_options_permission_enabled from public.options_paper_appropriateness_profiles), 'live options permission remains false');
select ok(not exists(
  select 1 from public.options_paper_journal_lines
  group by journal_entry_id, currency having abs(sum(amount)) > 0.00000001
), 'initial virtual credit journal balances');

select is(
  public.create_options_paper_strategy(
    '00000000-0000-4000-8000-00000000008c',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008c'),
    'phase8c-bull-spread', 'bull_call_spread',
    (select id from public.options_chain_scenarios where contract_symbol = 'AAPL301220C00240000'),
    (select id from public.options_chain_scenarios where contract_symbol = 'AAPL301220C00260000'), 1
  ) ->> 'status',
  'open', 'bull call spread opens as a protected simulation'
);
select is((select max_loss from public.options_paper_strategies where client_strategy_id = 'phase8c-bull-spread'), 700.00000000::numeric, 'bull call maximum loss equals the debit');
select is((select max_profit from public.options_paper_strategies where client_strategy_id = 'phase8c-bull-spread'), 1300.00000000::numeric, 'bull call maximum profit is capped by spread width');
select is((select break_even_price from public.options_paper_strategies where client_strategy_id = 'phase8c-bull-spread'), 247.00000000::numeric, 'bull call break-even is deterministic');
select is((select count(*) from public.options_paper_legs where strategy_id = (select id from public.options_paper_strategies where client_strategy_id = 'phase8c-bull-spread')), 2::bigint, 'defined-risk spread has two legs');
select ok((select protective_long_leg_required from public.options_paper_legs where side = 'short' and strategy_id = (select id from public.options_paper_strategies where client_strategy_id = 'phase8c-bull-spread')), 'short spread leg requires its protective long leg');

select is(
  public.create_options_paper_strategy(
    '00000000-0000-4000-8000-00000000008c',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008c'),
    'phase8c-bear-spread', 'bear_put_spread',
    (select id from public.options_chain_scenarios where contract_symbol = 'AAPL301220P00260000'),
    (select id from public.options_chain_scenarios where contract_symbol = 'AAPL301220P00240000'), 1
  ) ->> 'status',
  'open', 'bear put spread opens as a protected simulation'
);
select is((select max_loss from public.options_paper_strategies where client_strategy_id = 'phase8c-bear-spread'), 700.00000000::numeric, 'bear put maximum loss equals the debit');
select is((select max_profit from public.options_paper_strategies where client_strategy_id = 'phase8c-bear-spread'), 1300.00000000::numeric, 'bear put maximum profit is bounded');
select is((select break_even_price from public.options_paper_strategies where client_strategy_id = 'phase8c-bear-spread'), 253.00000000::numeric, 'bear put break-even is deterministic');

select is(
  public.create_options_paper_strategy(
    '00000000-0000-4000-8000-00000000008c',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008c'),
    'phase8c-long-call', 'long_call',
    (select id from public.options_chain_scenarios where contract_symbol = 'AAPL301220C00240000'),
    null, 1
  ) ->> 'status',
  'open', 'long call opens with bounded loss'
);
select ok((select max_profit is null from public.options_paper_strategies where client_strategy_id = 'phase8c-long-call'), 'long call marks maximum profit as explicitly unbounded');
select is((select profit_potential from public.options_paper_strategies where client_strategy_id = 'phase8c-long-call'), 'unbounded', 'long call labels unbounded profit potential');
select is((select count(*) from public.options_paper_legs where strategy_id = (select id from public.options_paper_strategies where client_strategy_id = 'phase8c-long-call')), 1::bigint, 'long option remains single leg');

select is(
  public.create_options_paper_strategy(
    '00000000-0000-4000-8000-00000000008c',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008c'),
    'phase8c-long-call', 'long_call',
    (select id from public.options_chain_scenarios where contract_symbol = 'AAPL301220C00240000'),
    null, 1
  ) ->> 'idempotentReplay',
  'true', 'duplicate strategy request cannot double-reserve virtual cash'
);
select is((select count(*) from public.options_paper_strategies), 3::bigint, 'idempotent replay preserves three strategies');
select throws_ok(
  $$select public.create_options_paper_strategy(
    '00000000-0000-4000-8000-00000000008c',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008c'),
    'phase8c-wrong-spread', 'bull_call_spread',
    (select id from public.options_chain_scenarios where contract_symbol = 'AAPL301220C00260000'),
    (select id from public.options_chain_scenarios where contract_symbol = 'AAPL301220C00240000'), 1
  )$$,
  'P0001', 'Spread direction is not defined risk',
  'an unprotected spread direction fails closed'
);

select is(
  public.simulate_options_paper_event(
    '00000000-0000-4000-8000-00000000008c',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008c'),
    (select id from public.options_paper_strategies where client_strategy_id = 'phase8c-long-call'),
    'phase8c-corp-action', 'corporate_action', null
  ) ->> 'status',
  'adjusted', 'corporate-action adjustment is rehearsed without settlement'
);
select ok(not (select applied_to_real_position from public.options_paper_events where client_event_id = 'phase8c-corp-action'), 'corporate action never touches a real position');

select is(
  public.simulate_options_paper_event(
    '00000000-0000-4000-8000-00000000008c',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008c'),
    (select id from public.options_paper_strategies where client_strategy_id = 'phase8c-bull-spread'),
    'phase8c-early-assign', 'early_assignment', 270
  ) ->> 'status',
  'early_assigned', 'early-assignment risk settles the protected spread virtually'
);
select is((select cash_effect from public.options_paper_events where client_event_id = 'phase8c-early-assign'), 2000.00000000::numeric, 'protected bull spread payoff is capped at its width');
select is((select realized_pnl from public.options_paper_events where client_event_id = 'phase8c-early-assign'), 1300.00000000::numeric, 'protected bull spread realized result subtracts its debit');
select ok(not (select applied_to_real_position from public.options_paper_events where client_event_id = 'phase8c-early-assign'), 'assignment simulation creates no real position');
select is((select lifecycle_status from public.options_paper_strategies where client_strategy_id = 'phase8c-bull-spread'), 'early_assigned', 'strategy lifecycle records early assignment');
select is(
  public.simulate_options_paper_event(
    '00000000-0000-4000-8000-00000000008c',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008c'),
    (select id from public.options_paper_strategies where client_strategy_id = 'phase8c-bull-spread'),
    'phase8c-early-assign', 'early_assignment', 270
  ) ->> 'idempotentReplay',
  'true', 'duplicate lifecycle event cannot double-credit virtual cash'
);
select is((select count(*) from public.options_paper_events where client_event_id = 'phase8c-early-assign'), 1::bigint, 'idempotent event remains singular');

select is(
  public.simulate_options_paper_event(
    '00000000-0000-4000-8000-00000000008c',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008c'),
    (select id from public.options_paper_strategies where client_strategy_id = 'phase8c-bear-spread'),
    'phase8c-expiration', 'expiration', 230
  ) ->> 'status',
  'expired', 'bear put spread expiration is simulated'
);
select is((select cash_effect from public.options_paper_events where client_event_id = 'phase8c-expiration'), 2000.00000000::numeric, 'bear put spread payoff is capped at its width');
select throws_ok(
  $$select public.simulate_options_paper_event(
    '00000000-0000-4000-8000-00000000008c',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008c'),
    (select id from public.options_paper_strategies where client_strategy_id = 'phase8c-long-call'),
    'phase8c-bad-assign', 'assignment', 270
  )$$,
  'P0001', 'Assignment requires a protected short leg',
  'assignment cannot be fabricated for a long-only strategy'
);

select ok(not exists(
  select 1 from public.options_paper_journal_lines
  group by journal_entry_id, currency having abs(sum(amount)) > 0.00000001
), 'every options paper journal balances independently');
select is(
  public.reconcile_options_paper_portfolio(
    '00000000-0000-4000-8000-00000000008c',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008c')
  ) ->> 'status',
  'passed', 'virtual cash, protected legs, risk boundaries and journals reconcile'
);
select is((select status from public.options_paper_reconciliations), 'passed', 'options reconciliation evidence is retained');
select is((select cash_balance from public.options_paper_accounts), 101200.00000000::numeric, 'virtual cash reconciles opening debits and settlement payoffs');
select is((select count(*) from public.options_paper_strategy_history), 3::bigint, 'private history exposes all saved strategies');
select is((select sum(protected_short_leg_count) from public.options_paper_strategy_history), 2::bigint, 'private history exposes only protected short legs');

select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok(
  $$select public.reconcile_options_paper_portfolio(
    '00000000-0000-4000-8000-00000000008c',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008c')
  )$$,
  'P0001', 'Options reconciliation requires the simulation service',
  'authenticated clients cannot bypass the protected service'
);

select ok(to_regclass('public.live_options_orders') is null and to_regclass('public.options_margin_accounts') is null, 'no live options or margin table exists');
select ok(to_regprocedure('public.route_live_options_order(jsonb)') is null, 'no live options routing RPC exists');
select ok(not exists(select 1 from public.live_trading_activation_controls where live_order_routing_enabled or customer_funding_enabled or custody_enabled or settlement_enabled), 'existing live-trading locks remain closed');
select ok(not exists(select 1 from public.international_paper_trading_controls where live_order_routing_enabled or broker_connectivity_enabled or real_customer_funds_enabled or custody_enabled or real_settlement_enabled or margin_enabled or short_selling_enabled), 'international paper locks remain closed');

select * from finish();
rollback;
