begin;

select plan(48);

select ok(to_regclass('public.paper_decision_contexts') is not null, 'paper decision context table exists');
select ok(to_regclass('public.paper_decision_outcomes') is not null, 'paper decision outcome table exists');
select ok(to_regclass('public.paper_decision_journal') is not null, 'private paper decision journal exists');
select ok(to_regclass('public.paper_decision_scorecard') is not null, 'private paper decision scorecard exists');
select ok(
  to_regprocedure('public.execute_paper_market_order_with_context(uuid,uuid,bigint,text,text,numeric,text,integer,integer)') is not null,
  'journaled paper-order service function exists'
);
select ok(
  to_regprocedure('public.evaluate_paper_decision_outcomes(uuid,uuid)') is not null,
  'paper decision evaluator exists'
);
select ok((select relrowsecurity from pg_class where oid = 'public.paper_decision_contexts'::regclass), 'decision contexts have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.paper_decision_outcomes'::regclass), 'decision outcomes have RLS');
select ok(has_table_privilege('authenticated', 'public.paper_decision_contexts', 'SELECT'), 'authenticated users can read their decision evidence');
select ok(has_table_privilege('authenticated', 'public.paper_decision_outcomes', 'SELECT'), 'authenticated users can read their decision outcomes');
select ok(not has_table_privilege('authenticated', 'public.paper_decision_contexts', 'INSERT'), 'browser clients cannot forge decision evidence');
select ok(not has_table_privilege('authenticated', 'public.paper_decision_outcomes', 'INSERT'), 'browser clients cannot forge decision outcomes');
select ok(not has_table_privilege('service_role', 'public.paper_decision_contexts', 'INSERT'), 'service role cannot bypass the decision-context RPC');
select ok(not has_table_privilege('service_role', 'public.paper_decision_outcomes', 'INSERT'), 'service role cannot bypass the outcome evaluator');
select ok(
  not has_function_privilege('authenticated', 'public.execute_paper_market_order_with_context(uuid,uuid,bigint,text,text,numeric,text,integer,integer)', 'EXECUTE'),
  'browser clients cannot invoke the journaled execution service'
);
select ok(
  has_function_privilege('service_role', 'public.execute_paper_market_order_with_context(uuid,uuid,bigint,text,text,numeric,text,integer,integer)', 'EXECUTE'),
  'paper-order service can invoke journaled simulation execution'
);
select ok(
  not has_function_privilege('authenticated', 'public.evaluate_paper_decision_outcomes(uuid,uuid)', 'EXECUTE'),
  'browser clients cannot invoke the outcome evaluator'
);
select ok(
  has_function_privilege('service_role', 'public.evaluate_paper_decision_outcomes(uuid,uuid)', 'EXECUTE'),
  'paper-risk service can invoke the outcome evaluator'
);
select ok(
  exists (select 1 from pg_trigger where tgrelid = 'public.paper_decision_contexts'::regclass and tgname = 'paper_decision_contexts_append_only' and not tgisinternal),
  'decision contexts are append-only'
);
select ok(
  exists (select 1 from pg_trigger where tgrelid = 'public.paper_decision_outcomes'::regclass and tgname = 'paper_decision_outcomes_append_only' and not tgisinternal),
  'decision outcomes are append-only'
);
select ok(
  coalesce((select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.paper_decision_journal'::regclass), false),
  'journal view preserves caller permissions'
);
select ok(
  coalesce((select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.paper_decision_scorecard'::regclass), false),
  'scorecard view preserves caller permissions'
);
select is((select count(*) from public.investment_instruments where live_execution_enabled), 0::bigint, 'live instrument execution remains disabled');
select ok(
  pg_get_functiondef('public.evaluate_paper_decision_outcomes(uuid,uuid)'::regprocedure) !~* 'alpaca|broker-api|http',
  'decision evaluation has no provider or HTTP route'
);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) values (
  '00000000-0000-4000-8000-00000000004f',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'phase4f@example.test',
  '',
  now(),
  now(),
  now(),
  '{}'::jsonb,
  '{"display_name":"Phase 4F Test"}'::jsonb
);

insert into public.market_observations (asset_id, observed_at, price, change_percent, source)
select id, now() - interval '5 minutes', 100, 0, 'phase4f-test'
from public.market_assets
where symbol = 'XAUUSD';

insert into public.forecast_runs (
  model_name,
  model_version,
  status,
  training_window,
  started_at,
  completed_at,
  metrics
) values (
  'phase4f-test-model',
  '1.0.0',
  'completed',
  30,
  now() - interval '10 minutes',
  now() - interval '6 minutes',
  '{}'::jsonb
);

insert into public.market_forecasts (
  forecast_run_id,
  asset_id,
  model_name,
  model_version,
  horizon_hours,
  generated_at,
  target_at,
  predicted_price,
  lower_bound,
  upper_bound,
  confidence_score,
  direction,
  validation_status,
  is_latest
)
select
  currval(pg_get_serial_sequence('public.forecast_runs', 'id')),
  id,
  'phase4f-test-model',
  '1.0.0',
  24,
  now() - interval '5 minutes',
  now() + interval '24 hours',
  108,
  95,
  112,
  0.72,
  'up',
  'passed',
  true
from public.market_assets
where symbol = 'XAUUSD';

select set_config('request.jwt.claim.role', 'service_role', true);

select is(
  public.create_paper_portfolio(
    '00000000-0000-4000-8000-00000000004f',
    'Decision Intelligence Lab',
    'USD',
    100000
  ) ->> 'portfolio_type',
  'paper',
  'test user receives a simulation-only portfolio'
);

select is(
  public.execute_paper_market_order_with_context(
    '00000000-0000-4000-8000-00000000004f',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000004f'),
    (select id from public.investment_instruments where display_symbol = 'XAUUSD'),
    'phase4f-order-0001',
    'buy',
    1,
    'Gold may strengthen while this validated forecast remains useful.',
    3,
    24
  ) ->> 'status',
  'filled',
  'journaled paper order fills only in the simulator'
);
select is(
  (
    select count(*)
    from public.paper_decision_contexts
    where user_id = '00000000-0000-4000-8000-00000000004f'
  ),
  1::bigint,
  'one private decision context is captured'
);
select is(
  (
    select thesis
    from public.paper_decision_contexts
    where user_id = '00000000-0000-4000-8000-00000000004f'
  ),
  'Gold may strengthen while this validated forecast remains useful.',
  'the private thesis is retained verbatim'
);
select ok(
  (
    select forecast_id is not null
    from public.paper_decision_contexts
    where user_id = '00000000-0000-4000-8000-00000000004f'
  ),
  'validated forecast evidence is captured at decision time'
);
select is(
  (
    public.execute_paper_market_order_with_context(
      '00000000-0000-4000-8000-00000000004f',
      (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000004f'),
      (select id from public.investment_instruments where display_symbol = 'XAUUSD'),
      'phase4f-order-0001',
      'buy',
      1,
      'A changed retry must not overwrite the original private thesis.',
      5,
      720
    ) #>> '{decisionContext,idempotentReplay}'
  ),
  'true',
  'duplicate submission returns the original decision context'
);
select is(
  (
    select count(*)
    from public.paper_decision_contexts
    where user_id = '00000000-0000-4000-8000-00000000004f'
  ),
  1::bigint,
  'idempotent replay cannot duplicate decision evidence'
);
select is(
  (
    select thesis
    from public.paper_decision_contexts
    where user_id = '00000000-0000-4000-8000-00000000004f'
  ),
  'Gold may strengthen while this validated forecast remains useful.',
  'idempotent replay cannot rewrite the original thesis'
);

insert into public.paper_orders (
  id,
  user_id,
  portfolio_id,
  instrument_id,
  client_order_id,
  side,
  order_type,
  quantity,
  status,
  execution_mode,
  reference_price,
  average_fill_price,
  submitted_at
) values (
  '00000000-0000-4000-8000-000000000041',
  '00000000-0000-4000-8000-00000000004f',
  (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000004f'),
  (select id from public.investment_instruments where display_symbol = 'XAUUSD'),
  'phase4f-historic-0001',
  'buy',
  'market',
  1,
  'filled',
  'paper',
  100,
  100,
  now() - interval '2 hours'
);

insert into public.paper_decision_contexts (
  id,
  order_id,
  portfolio_id,
  user_id,
  instrument_id,
  thesis,
  conviction,
  planned_horizon_hours,
  entry_price,
  reference_observed_at,
  forecast_direction,
  forecast_predicted_price,
  forecast_confidence,
  forecast_model_name,
  forecast_model_version,
  created_at
) values (
  '00000000-0000-4000-8000-000000000042',
  '00000000-0000-4000-8000-000000000041',
  (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000004f'),
  '00000000-0000-4000-8000-00000000004f',
  (select id from public.investment_instruments where display_symbol = 'XAUUSD'),
  'Historic paper thesis used to verify deterministic outcome scoring.',
  4,
  1,
  100,
  now() - interval '2 hours',
  'up',
  108,
  0.8,
  'phase4f-test-model',
  '1.0.0',
  now() - interval '2 hours'
);

insert into public.market_observations (asset_id, observed_at, price, change_percent, source)
select id, now() - interval '30 minutes', 110, 10, 'phase4f-outcome'
from public.market_assets
where symbol = 'XAUUSD';

select is(
  public.evaluate_paper_decision_outcomes(
    '00000000-0000-4000-8000-00000000004f',
    (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000004f')
  ) ->> 'evaluated',
  '1',
  'one due paper decision is evaluated'
);
select is((select evaluation_status from public.paper_decision_outcomes), 'evaluated', 'outcome is marked evaluated');
select is((select asset_return_percent from public.paper_decision_outcomes), 10.00000000::numeric, 'asset return is calculated deterministically');
select is((select decision_return_percent from public.paper_decision_outcomes), 10.00000000::numeric, 'buy decision return follows the asset return');
select is((select forecast_direction_correct from public.paper_decision_outcomes), true, 'forecast direction is scored correctly');
select is((select total_decisions from public.paper_decision_scorecard), 2, 'scorecard includes all journaled decisions');
select is((select completed_decisions from public.paper_decision_scorecard), 1, 'scorecard separates completed decisions');
select is((select forecast_directional_accuracy_percent from public.paper_decision_scorecard), 100.00::numeric, 'scorecard calculates forecast directional accuracy');
select is((select profitable_decision_rate_percent from public.paper_decision_scorecard), 100.00::numeric, 'scorecard calculates profitable paper decisions');
select ok(not (select orders_write_enabled from public.paper_decision_journal limit 1), 'journal declares order writes disabled');
select ok(not (select live_order_routing_enabled from public.paper_decision_journal limit 1), 'journal declares live routing disabled');
select is(
  (select count(*) from public.financial_audit_events where event_type = 'paper_decision_context_captured'),
  1::bigint,
  'decision capture writes a financial audit event'
);
select is(
  (select count(*) from public.financial_audit_events where event_type = 'paper_decision_outcome_evaluated'),
  1::bigint,
  'outcome evaluation writes a financial audit event'
);
select throws_ok(
  $$update public.paper_decision_contexts set conviction = 1$$,
  'P0001',
  'Paper decision evidence is append-only',
  'captured decision evidence cannot be rewritten'
);
select throws_ok(
  $$delete from public.paper_decision_outcomes$$,
  'P0001',
  'Paper decision evidence is append-only',
  'evaluated decision outcomes cannot be deleted'
);
select public.evaluate_paper_decision_outcomes(
  '00000000-0000-4000-8000-00000000004f',
  (select id from public.investment_portfolios where user_id = '00000000-0000-4000-8000-00000000004f')
);
select is((select count(*) from public.paper_decision_outcomes), 1::bigint, 'repeated evaluation remains idempotent');

select * from finish();

rollback;
