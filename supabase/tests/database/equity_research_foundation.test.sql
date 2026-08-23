begin;

select plan(16);

select ok(
  to_regclass('public.equity_securities') is not null,
  'equity security master exists'
);

select ok(
  to_regclass('public.equity_data_coverage') is not null,
  'equity coverage registry exists'
);

select ok(
  to_regclass('public.equity_fundamental_snapshots') is not null,
  'equity fundamentals table exists'
);

select ok(
  to_regclass('public.equity_research_scores') is not null,
  'equity research score table exists'
);

select ok(
  to_regclass('public.equity_research_dashboard') is not null,
  'equity research dashboard view exists'
);

select ok(
  to_regclass('public.billing_currencies') is not null,
  'global billing currency catalog exists'
);

select is(
  (select count(*) from public.billing_currencies where enabled),
  2::bigint,
  'USD and GBP are enabled for billing'
);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'preferred_billing_currency'
  ),
  'profiles store a preferred billing currency'
);

select ok(
  exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'equity_research_scores'
  ),
  'equity research scores publish realtime changes'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.equity_securities'::regclass),
  'security master has row-level security enabled'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.equity_fundamental_snapshots'::regclass),
  'fundamentals have row-level security enabled'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'idx_equity_research_latest'
  ),
  'only one latest research score can exist per security'
);

select is(
  (select count(*) from public.equity_securities),
  0::bigint,
  'no unverified stock rows are seeded as live coverage'
);

select is(
  (
    select enabled
    from public.data_sources
    where name = 'Alpaca Market Data'
  ),
  false,
  'the equity provider remains disabled until credentials and display rights are approved'
);

select is(
  (
    select count(*)
    from public.investment_instruments
    where live_execution_enabled
  ),
  0::bigint,
  'the equity research phase does not enable live execution'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'equity_research_scores'
      and policyname = 'Public can read published equity research'
  ),
  'public research access is restricted to published rows'
);

select * from finish();

rollback;
