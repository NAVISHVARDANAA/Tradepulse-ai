begin;

select plan(84);

select ok(to_regclass('public.international_paper_trading_controls') is not null, 'international paper controls exist');
select ok(to_regclass('public.international_paper_venue_rules') is not null, 'venue simulation rules exist');
select ok(to_regclass('public.international_paper_quotes') is not null, 'scenario quotes exist');
select ok(to_regclass('public.international_paper_fx_rates') is not null, 'scenario FX rates exist');
select ok(to_regclass('public.international_paper_cost_rules') is not null, 'modeled cost rules exist');
select ok(to_regclass('public.international_paper_accounts') is not null, 'private international paper accounts exist');
select ok(to_regclass('public.international_paper_cash_balances') is not null, 'multi-currency virtual cash exists');
select ok(to_regclass('public.international_paper_orders') is not null, 'international paper orders exist');
select ok(to_regclass('public.international_paper_fills') is not null, 'international paper fills exist');
select ok(to_regclass('public.international_paper_positions') is not null, 'international paper positions exist');
select ok(to_regclass('public.international_paper_tax_lots') is not null, 'FIFO paper tax lots exist');
select ok(to_regclass('public.international_paper_journal_entries') is not null, 'paper journal entries exist');
select ok(to_regclass('public.international_paper_journal_lines') is not null, 'balanced paper journal lines exist');
select ok(to_regclass('public.international_paper_fx_conversions') is not null, 'paper FX conversions exist');
select ok(to_regclass('public.international_paper_route_evidence') is not null, 'simulated route evidence exists');
select ok(to_regclass('public.international_paper_reconciliations') is not null, 'deterministic reconciliation exists');
select ok(to_regclass('public.international_paper_corporate_action_scenarios') is not null, 'corporate-action drills exist');
select ok(to_regclass('public.international_paper_market_catalog') is not null, 'public paper market catalog exists');
select ok(to_regclass('public.international_paper_order_history') is not null, 'private paper order history exists');
select ok(to_regclass('public.international_paper_position_summary') is not null, 'private paper position summary exists');

select is((select count(*) from public.international_paper_trading_controls), 1::bigint, 'one simulation control is seeded');
select ok((select simulation_enabled and user_initiated_simulation_enabled from public.international_paper_trading_controls), 'international paper simulation is enabled');
select ok(not exists(select 1 from public.international_paper_trading_controls where live_market_data_enabled or live_order_routing_enabled or broker_connectivity_enabled or real_customer_funds_enabled or custody_enabled or real_settlement_enabled or margin_enabled or short_selling_enabled), 'every operational capability remains disabled');
select is((select count(*) from public.international_paper_venue_rules), 6::bigint, 'six simulated venues are modeled');
select is((select count(*) from public.international_paper_quotes), 12::bigint, 'twelve deterministic listing quotes are modeled');
select is((select count(*) from public.international_paper_fx_rates), 5::bigint, 'five virtual currencies are modeled');
select is((select count(*) from public.international_paper_cost_rules), 12::bigint, 'each venue and listed class has a cost rule');
select is((select count(*) from public.international_paper_corporate_action_scenarios), 2::bigint, 'two corporate-action drills are explicit');
select is((select count(*) from public.international_paper_market_catalog), 12::bigint, 'catalog preserves twelve venue-qualified listings');
select ok(not exists(select 1 from public.international_paper_market_catalog where not simulation_only or live_market_data_enabled or live_order_routing_enabled or broker_connectivity_enabled or real_customer_funds_enabled or custody_enabled or real_settlement_enabled), 'catalog cannot imply a live capability');
select ok(not exists(select 1 from public.international_paper_quotes where source_type <> 'deterministic_fixture'), 'quotes are deterministic fixtures only');
select ok(not exists(select 1 from public.international_paper_fx_rates where rate_status <> 'modeled_scenario'), 'FX rates are modeled scenarios only');
select ok(not exists(select 1 from public.international_paper_cost_rules where cost_status <> 'modeled_scenario'), 'unknown costs never appear as zero');
select ok(not exists(select 1 from public.international_paper_venue_rules where fractional_simulation_enabled), 'fractional trading fails closed without partner evidence');
select ok(not exists(select 1 from public.international_paper_corporate_action_scenarios where not simulation_only or applied_to_real_account), 'corporate actions cannot touch real accounts');

select ok((select bool_and(relrowsecurity) from pg_class where oid in (
  'public.international_paper_trading_controls'::regclass,
  'public.international_paper_venue_rules'::regclass,
  'public.international_paper_quotes'::regclass,
  'public.international_paper_fx_rates'::regclass,
  'public.international_paper_cost_rules'::regclass,
  'public.international_paper_accounts'::regclass,
  'public.international_paper_cash_balances'::regclass,
  'public.international_paper_orders'::regclass,
  'public.international_paper_fills'::regclass,
  'public.international_paper_positions'::regclass,
  'public.international_paper_tax_lots'::regclass,
  'public.international_paper_journal_entries'::regclass,
  'public.international_paper_journal_lines'::regclass,
  'public.international_paper_fx_conversions'::regclass,
  'public.international_paper_route_evidence'::regclass,
  'public.international_paper_reconciliations'::regclass,
  'public.international_paper_corporate_action_scenarios'::regclass
)), 'every Phase 8B table uses RLS');
select ok(not has_table_privilege('authenticated', 'public.international_paper_orders', 'INSERT'), 'browser users cannot forge paper orders');
select ok(not has_table_privilege('authenticated', 'public.international_paper_cash_balances', 'UPDATE'), 'browser users cannot alter virtual cash');
select ok(not has_table_privilege('service_role', 'public.international_paper_orders', 'INSERT'), 'service role must use the simulation RPC');
select ok(has_table_privilege('authenticated', 'public.international_paper_orders', 'SELECT'), 'users can read their own paper orders');
select ok(coalesce((select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.international_paper_market_catalog'::regclass), false), 'catalog preserves caller permissions');
select ok(coalesce((select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.international_paper_order_history'::regclass), false), 'order history preserves caller permissions');

select ok(to_regprocedure('public.initialize_international_paper_account(uuid,uuid,numeric)') is not null, 'account initialization RPC exists');
select ok(to_regprocedure('public.convert_international_paper_cash(uuid,uuid,text,text,numeric,text)') is not null, 'paper FX RPC exists');
select ok(to_regprocedure('public.execute_international_paper_order(uuid,uuid,bigint,text,text,text,text,numeric,numeric,numeric)') is not null, 'international paper order RPC exists');
select ok(to_regprocedure('public.reconcile_international_paper_portfolio(uuid,uuid)') is not null, 'international reconciliation RPC exists');
select ok(not has_function_privilege('authenticated', 'public.execute_international_paper_order(uuid,uuid,bigint,text,text,text,text,numeric,numeric,numeric)', 'EXECUTE'), 'browser cannot call execution RPC directly');
select ok(has_function_privilege('service_role', 'public.execute_international_paper_order(uuid,uuid,bigint,text,text,text,text,numeric,numeric,numeric)', 'EXECUTE'), 'protected service can call simulation RPC');
select ok(pg_get_functiondef('public.execute_international_paper_order(uuid,uuid,bigint,text,text,text,text,numeric,numeric,numeric)'::regprocedure) !~* 'alpaca|https?://|broker_api', 'simulation engine has no provider or HTTP path');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-4000-8000-00000000008b',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'phase8b@example.test', '', now(), now(), now(),
  '{}'::jsonb, '{"display_name":"Phase 8B Test"}'::jsonb
);

select set_config('request.jwt.claim.role', 'service_role', true);

select is(
  public.create_paper_portfolio('00000000-0000-4000-8000-00000000008b', 'International Lab', 'USD', 100000) ->> 'portfolio_type',
  'paper', 'existing private portfolio foundation is reused'
);
select is(
  public.initialize_international_paper_account(
    '00000000-0000-4000-8000-00000000008b',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008b'),
    100000
  ) ->> 'status',
  'created', 'multi-currency simulation account initializes'
);
select is((select count(*) from public.international_paper_cash_balances), 1::bigint, 'base virtual cash wallet is created');
select is((select balance from public.international_paper_cash_balances where currency = 'USD'), 100000.00000000::numeric, 'initial virtual cash is exact');
select is(
  public.convert_international_paper_cash(
    '00000000-0000-4000-8000-00000000008b',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008b'),
    'USD', 'INR', 10000, 'phase8b-fx-0001'
  ) ->> 'status',
  'converted', 'virtual USD converts to virtual INR'
);
select is((select count(*) from public.international_paper_cash_balances), 2::bigint, 'conversion creates a second currency wallet');
select ok((select balance > 800000 from public.international_paper_cash_balances where currency = 'INR'), 'deterministic INR proceeds are credited');
select is(
  public.convert_international_paper_cash(
    '00000000-0000-4000-8000-00000000008b',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008b'),
    'USD', 'INR', 10000, 'phase8b-fx-0001'
  ) ->> 'idempotent_replay',
  'true', 'duplicate FX requests cannot double-convert cash'
);

select is(
  public.execute_international_paper_order(
    '00000000-0000-4000-8000-00000000008b',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008b'),
    (select id from public.global_instrument_listings where listing_key = 'XNSE:RELIANCE'),
    'phase8b-order-0001', 'buy', 'market', 'day', 10, null, null
  ) ->> 'status',
  'filled', 'venue-qualified international buy fills in simulation'
);
select is((select quantity from public.international_paper_positions), 10.00000000::numeric, 'paper position reflects the simulated buy');
select is((select remaining_quantity from public.international_paper_tax_lots), 10.00000000::numeric, 'buy creates a FIFO tax lot');
select is((select count(*) from public.international_paper_fills), 1::bigint, 'one simulated fill is recorded');
select ok(not (select best_execution_claim from public.international_paper_route_evidence), 'route evidence makes no best-execution claim');
select is(
  public.execute_international_paper_order(
    '00000000-0000-4000-8000-00000000008b',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008b'),
    (select id from public.global_instrument_listings where listing_key = 'XNSE:RELIANCE'),
    'phase8b-order-0002', 'buy', 'limit', 'day', 2, 1300, null
  ) ->> 'status',
  'accepted', 'unmet limit remains an accepted simulation order'
);
select is(
  public.execute_international_paper_order(
    '00000000-0000-4000-8000-00000000008b',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008b'),
    (select id from public.global_instrument_listings where listing_key = 'XNSE:RELIANCE'),
    'phase8b-order-ioc', 'buy', 'limit', 'ioc', 2, 1300, null
  ) ->> 'status',
  'expired', 'unmet IOC limit expires without a simulated fill'
);
select is(
  public.execute_international_paper_order(
    '00000000-0000-4000-8000-00000000008b',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008b'),
    (select id from public.global_instrument_listings where listing_key = 'XNSE:RELIANCE'),
    'phase8b-order-stop', 'buy', 'stop', 'day', 2, null, 1500
  ) ->> 'status',
  'accepted', 'unmet stop remains queued in the deterministic scenario'
);
select is(
  public.execute_international_paper_order(
    '00000000-0000-4000-8000-00000000008b',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008b'),
    (select id from public.global_instrument_listings where listing_key = 'XNSE:RELIANCE'),
    'phase8b-order-stoplimit', 'sell', 'stop_limit', 'day', 2, 1300, 1300
  ) ->> 'status',
  'accepted', 'unmet stop-limit remains queued in the deterministic scenario'
);
update public.international_paper_quotes set available_quantity = 3
where listing_id = (select id from public.global_instrument_listings where listing_key = 'XNSE:RELIANCE');
select is(
  public.execute_international_paper_order(
    '00000000-0000-4000-8000-00000000008b',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008b'),
    (select id from public.global_instrument_listings where listing_key = 'XNSE:RELIANCE'),
    'phase8b-order-partial', 'buy', 'limit', 'day', 5, 1400.50, null
  ) ->> 'status',
  'partially_filled', 'available scenario quantity produces a deterministic partial fill'
);
select ok(
  (select average_fill_price <= limit_price and filled_quantity = 3 from public.international_paper_orders where client_order_id = 'phase8b-order-partial'),
  'limit simulation never fills above the customer limit'
);
update public.international_paper_quotes set available_quantity = 1000
where listing_id = (select id from public.global_instrument_listings where listing_key = 'XNSE:RELIANCE');
select is(
  public.execute_international_paper_order(
    '00000000-0000-4000-8000-00000000008b',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008b'),
    (select id from public.global_instrument_listings where listing_key = 'XNSE:RELIANCE'),
    'phase8b-order-0003', 'sell', 'market', 'day', 4, null, null
  ) ->> 'status',
  'filled', 'venue-qualified sell fills in simulation'
);
select is((select quantity from public.international_paper_positions), 9.00000000::numeric, 'sell reduces the simulated position');
select is((select sum(remaining_quantity) from public.international_paper_tax_lots), 9.00000000::numeric, 'sell consumes the oldest paper lot first');
select ok((select realized_pnl is not null from public.international_paper_positions), 'realized paper PnL is recorded');
select ok((select settles_on > current_date from public.international_paper_fills order by filled_at desc limit 1), 'modeled settlement timing is explicit');
select ok(not exists(
  select 1 from public.international_paper_journal_lines
  group by journal_entry_id, currency having abs(sum(amount)) > 0.00000001
), 'every paper journal balances independently by currency');
select is(
  public.reconcile_international_paper_portfolio(
    '00000000-0000-4000-8000-00000000008b',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008b')
  ) ->> 'status',
  'passed', 'cash, positions, fills, lots and journals reconcile deterministically'
);
select is((select status from public.international_paper_reconciliations), 'passed', 'reconciliation evidence is retained');
select is((select count(*) from public.international_paper_order_history), 7::bigint, 'private order history exposes every venue simulation');
select is((select open_tax_lot_quantity from public.international_paper_position_summary), 9.00000000::numeric, 'position summary reconciles open lots');

update public.international_paper_venue_rules set session_state = 'halted_scenario'
where venue_id = (select id from public.global_market_venues where mic_code = 'XNSE');
select is(
  public.execute_international_paper_order(
    '00000000-0000-4000-8000-00000000008b',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008b'),
    (select id from public.global_instrument_listings where listing_key = 'XNSE:RELIANCE'),
    'phase8b-order-halt', 'buy', 'market', 'day', 1, null, null
  ) ->> 'status',
  'halted', 'modeled venue halt prevents a simulated fill'
);

select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok(
  $$select public.execute_international_paper_order(
    '00000000-0000-4000-8000-00000000008b',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000008b'),
    (select id from public.global_instrument_listings where listing_key = 'XNAS:AAPL'),
    'phase8b-direct-call', 'buy', 'market', 'day', 1, null, null
  )$$,
  'P0001', 'International paper orders require the simulation service',
  'authenticated clients cannot bypass the protected service'
);

select ok(to_regclass('public.live_international_orders') is null and to_regclass('public.international_custody_accounts') is null, 'no live order or custody table exists');
select ok(to_regprocedure('public.route_international_order(jsonb)') is null, 'no live routing RPC exists');
select ok(not exists(select 1 from public.live_trading_activation_controls where live_order_routing_enabled or customer_funding_enabled or custody_enabled or settlement_enabled), 'existing live-trading locks remain closed');
select ok(not exists(select 1 from public.payment_money_movement_controls where money_movement_enabled or customer_funding_enabled or custody_enabled or settlement_enabled), 'payment money-movement locks remain closed');

select * from finish();
rollback;
