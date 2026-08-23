begin;

select plan(12);

select ok(
  to_regclass('public.portfolio_control_states') is not null,
  'portfolio control states table exists'
);

select ok(
  to_regclass('public.portfolio_risk_snapshots') is not null,
  'portfolio risk snapshots table exists'
);

select ok(
  to_regclass('public.paper_reconciliation_runs') is not null,
  'paper reconciliation runs table exists'
);

select ok(
  to_regclass('public.paper_reconciliation_issues') is not null,
  'paper reconciliation issues table exists'
);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'portfolio_risk_limits'
      and column_name = 'auto_kill_switch'
  ),
  'portfolio risk limits include the automatic kill switch'
);

select ok(
  to_regprocedure('public.monitor_paper_portfolio(uuid,uuid)') is not null,
  'paper portfolio monitor function exists'
);

select ok(
  to_regprocedure('public.set_paper_trading_control(uuid,uuid,boolean,text)') is not null,
  'paper trading control function exists'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.monitor_paper_portfolio(uuid,uuid)',
    'EXECUTE'
  ),
  'anonymous clients cannot execute the portfolio monitor'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.monitor_paper_portfolio(uuid,uuid)',
    'EXECUTE'
  ),
  'authenticated clients cannot execute the portfolio monitor directly'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.monitor_paper_portfolio(uuid,uuid)',
    'EXECUTE'
  ),
  'the server-side service can execute the portfolio monitor'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgname = 'enforce_paper_trading_control_trigger'
      and not tgisinternal
  ),
  'the database-level paper kill switch trigger exists'
);

select is(
  (
    select count(*)
    from public.investment_instruments
    where live_execution_enabled
  ),
  0::bigint,
  'no investment instrument has live execution enabled'
);

select * from finish();

rollback;
