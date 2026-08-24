begin;

select plan(42);

select ok(to_regclass('public.forecast_governance_policies') is not null, 'forecast governance policy table exists');
select ok(to_regclass('public.forecast_reliability_snapshots') is not null, 'forecast reliability snapshot table exists');
select ok(to_regclass('public.forecast_reliability_latest') is not null, 'latest reliability view exists');
select ok(to_regclass('public.display_qualified_market_forecasts') is not null, 'display-qualified forecast view exists');
select ok(
  to_regprocedure('public.evaluate_forecast_governance(timestamptz)') is not null,
  'service-only governance evaluator exists'
);
select ok((select relrowsecurity from pg_class where oid = 'public.forecast_governance_policies'::regclass), 'governance policies have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.forecast_reliability_snapshots'::regclass), 'reliability snapshots have RLS');
select ok(has_table_privilege('anon', 'public.forecast_governance_policies', 'SELECT'), 'guests can inspect the active policy');
select ok(has_table_privilege('authenticated', 'public.forecast_reliability_snapshots', 'SELECT'), 'signed-in users can inspect reliability evidence');
select ok(not has_table_privilege('authenticated', 'public.forecast_evaluations', 'INSERT'), 'browser clients cannot forge forecast outcomes');
select ok(not has_table_privilege('service_role', 'public.forecast_evaluations', 'INSERT'), 'service role cannot bypass the evaluator');
select ok(not has_table_privilege('authenticated', 'public.forecast_reliability_snapshots', 'INSERT'), 'browser clients cannot forge reliability snapshots');
select ok(not has_table_privilege('service_role', 'public.forecast_reliability_snapshots', 'INSERT'), 'service role cannot bypass reliability classification');
select ok(not has_table_privilege('authenticated', 'public.model_drift_events', 'INSERT'), 'browser clients cannot forge drift events');
select ok(
  not has_function_privilege('authenticated', 'public.evaluate_forecast_governance(timestamptz)', 'EXECUTE'),
  'browser clients cannot invoke governance evaluation'
);
select ok(
  has_function_privilege('service_role', 'public.evaluate_forecast_governance(timestamptz)', 'EXECUTE'),
  'forecasting service can invoke governance evaluation'
);
select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.forecast_reliability_snapshots'::regclass
      and tgname = 'forecast_reliability_snapshots_append_only'
      and not tgisinternal
  ),
  'reliability snapshots are append-only'
);
select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.forecast_evaluations'::regclass
      and tgname = 'forecast_evaluations_append_only'
      and not tgisinternal
  ),
  'forecast evaluations are append-only'
);
select ok(
  coalesce((select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.forecast_reliability_latest'::regclass), false),
  'latest reliability view preserves caller permissions'
);
select ok(
  coalesce((select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.display_qualified_market_forecasts'::regclass), false),
  'display-qualified view preserves caller permissions'
);
select is((select count(*) from public.forecast_governance_policies where active), 1::bigint, 'exactly one governance policy is active');
select is((select policy_version from public.forecast_governance_policies where active), 'forecast-governance-v1', 'the versioned production policy is active');
select ok(
  pg_get_functiondef('public.evaluate_forecast_governance(timestamptz)'::regprocedure) !~* 'alpaca|broker-api|submit.*order|http',
  'governance evaluation has no broker, order-submission or HTTP route'
);
select is((select count(*) from public.investment_instruments where live_execution_enabled), 0::bigint, 'live instrument execution remains disabled');

update public.forecast_governance_policies
set minimum_evaluations = 5
where active;

with generated as (
  select
    series,
    case when group_code = 'q' then 'phase4g-qualified' else 'phase4g-suspended' end as model_name
  from generate_series(1, 5) series
  cross join (values ('q'), ('s')) groups(group_code)
)
insert into public.forecast_runs (
  model_name,
  model_version,
  status,
  training_window,
  started_at,
  completed_at,
  metrics
)
select
  model_name,
  '1.0.0',
  'completed',
  260,
  date_trunc('hour', now()) - make_interval(days => series, hours => 25),
  date_trunc('hour', now()) - make_interval(days => series, hours => 24),
  '{}'::jsonb
from generated;

with ranked_runs as (
  select
    run.id,
    run.model_name,
    row_number() over (
      partition by run.model_name order by run.started_at desc
    ) as sequence
  from public.forecast_runs run
  where run.model_name in ('phase4g-qualified', 'phase4g-suspended')
)
insert into public.market_forecasts (
  forecast_run_id,
  asset_id,
  model_name,
  model_version,
  horizon_hours,
  generated_at,
  target_at,
  reference_price,
  predicted_price,
  lower_bound,
  upper_bound,
  confidence_score,
  direction,
  validation_status,
  baseline_mae,
  model_mae,
  directional_accuracy,
  validation_interval_coverage,
  cost_adjusted_return,
  cost_adjusted_max_drawdown,
  estimated_turnover,
  is_latest,
  feature_snapshot
)
select
  run.id,
  asset.id,
  run.model_name,
  '1.0.0',
  24,
  date_trunc('hour', now()) - make_interval(days => run.sequence::integer, hours => 24),
  date_trunc('hour', now()) - make_interval(days => run.sequence::integer),
  100,
  case
    when run.model_name = 'phase4g-qualified' and run.sequence = 5 then 105
    else 110
  end,
  case
    when run.model_name = 'phase4g-qualified' and run.sequence = 5 then 100
    else 105
  end,
  case
    when run.model_name = 'phase4g-qualified' and run.sequence = 5 then 105
    else 115
  end,
  0.75,
  'up',
  'passed',
  0.02,
  0.01,
  0.60,
  0.80,
  0.05,
  0.04,
  8,
  run.sequence = 1,
  jsonb_build_object('reference_price', 100)
from ranked_runs run
join public.market_assets asset on asset.symbol = case
  when run.model_name = 'phase4g-qualified' then 'XAUUSD'
  else 'WTI'
end;

insert into public.market_observations (
  asset_id,
  observed_at,
  price,
  change_percent,
  source
)
select
  asset.id,
  date_trunc('hour', now()) - make_interval(days => series),
  case when asset.symbol = 'XAUUSD' then 110 else 90 end,
  case when asset.symbol = 'XAUUSD' then 10 else -10 end,
  'phase4g-governance-test'
from generate_series(1, 5) series
cross join public.market_assets asset
where asset.symbol in ('XAUUSD', 'WTI');

select set_config('request.jwt.claim.role', 'service_role', true);

select is(
  public.evaluate_forecast_governance(date_trunc('hour', now())) ->> 'evaluatedForecasts',
  '10',
  'all due forecasts receive point-in-time production outcomes'
);
select is((select count(*) from public.forecast_evaluations evaluation join public.market_forecasts forecast on forecast.id = evaluation.forecast_id where forecast.model_name like 'phase4g-%'), 10::bigint, 'ten immutable production evaluations are stored');
select is((select count(*) from public.forecast_reliability_snapshots where model_name like 'phase4g-%'), 2::bigint, 'one reliability snapshot is published per model and asset');
select is((select reliability_status from public.forecast_reliability_latest where model_name = 'phase4g-qualified'), 'qualified', 'strong production outcomes qualify the model');
select is((select evaluation_count from public.forecast_reliability_latest where model_name = 'phase4g-qualified'), 5, 'qualification retains its evidence count');
select is((select directional_accuracy from public.forecast_reliability_latest where model_name = 'phase4g-qualified'), 1.0000::numeric, 'production directional accuracy is measured');
select is((select interval_coverage from public.forecast_reliability_latest where model_name = 'phase4g-qualified'), 0.8000::numeric, 'production interval calibration is measured');
select ok((select mae_improvement_pct > 80 from public.forecast_reliability_latest where model_name = 'phase4g-qualified'), 'production MAE beats the no-change baseline');
select is((select reliability_status from public.forecast_reliability_latest where model_name = 'phase4g-suspended'), 'suspended', 'material live underperformance suspends a model');
select ok(not (select display_eligible from public.forecast_reliability_latest where model_name = 'phase4g-suspended'), 'suspended reliability is not display eligible');
select is((select count(*) from public.display_qualified_market_forecasts where model_name = 'phase4g-qualified'), 1::bigint, 'qualified latest forecast remains visible');
select is((select count(*) from public.display_qualified_market_forecasts where model_name = 'phase4g-suspended'), 0::bigint, 'suspended latest forecast is automatically hidden');
select is((select count(*) from public.model_drift_events where model_name = 'phase4g-suspended' and severity = 'critical' and status = 'open'), 1::bigint, 'suspension opens one sanitized critical drift event');
select ok((select details::text !~* 'api_key|secret|account_number|customer_name' from public.model_drift_events where model_name = 'phase4g-suspended'), 'drift evidence contains no credentials or customer identifiers');
select is(
  public.evaluate_forecast_governance(date_trunc('hour', now())) ->> 'evaluatedForecasts',
  '0',
  'repeated governance evaluation is idempotent'
);
select is((select count(*) from public.forecast_reliability_snapshots where model_name like 'phase4g-%'), 2::bigint, 'idempotent evaluation cannot duplicate reliability evidence');
select throws_ok(
  $$update public.forecast_reliability_snapshots set reliability_status = 'watch'$$,
  'P0001',
  'Forecast reliability evidence is append-only',
  'reliability evidence cannot be rewritten'
);
select throws_ok(
  $$delete from public.forecast_evaluations$$,
  'P0001',
  'Forecast reliability evidence is append-only',
  'forecast outcomes cannot be deleted'
);

select * from finish();

rollback;
