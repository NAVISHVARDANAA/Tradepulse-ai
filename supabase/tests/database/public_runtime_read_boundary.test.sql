begin;

select plan(13);

select ok(
  (
    select bool_and(has_table_privilege('anon', relation_name, 'SELECT'))
    from unnest(array[
      'public.countries',
      'public.market_assets',
      'public.trade_observations',
      'public.market_observations'
    ]) relation_name
  ),
  'guests can read public market and trade foundations'
);

select ok(
  (
    select bool_and(has_table_privilege('anon', relation_name, 'SELECT'))
    from unnest(array[
      'public.forecast_runs',
      'public.market_forecasts',
      'public.forecast_reliability_latest',
      'public.display_qualified_market_forecasts'
    ]) relation_name
  ),
  'guests can resolve the display-qualified forecast view'
);

select ok(
  (
    select bool_and(has_table_privilege('anon', relation_name, 'SELECT'))
    from unnest(array[
      'public.equity_securities',
      'public.equity_data_coverage',
      'public.equity_fundamental_snapshots',
      'public.equity_research_scores',
      'public.equity_research_dashboard'
    ]) relation_name
  ),
  'guests can resolve the licensed equity-research view'
);

select ok(
  (
    select bool_and(has_table_privilege('anon', relation_name, 'SELECT'))
    from unnest(array[
      'public.academy_courses',
      'public.academy_lessons',
      'public.academy_catalog',
      'public.academy_quiz_questions_public'
    ]) relation_name
  ),
  'guests can read published Academy content through safe surfaces'
);

select ok(
  has_table_privilege('anon', 'public.investment_instruments', 'SELECT'),
  'guests can discover research-enabled paper instruments'
);

select ok(
  has_table_privilege('anon', 'public.payment_corridors', 'SELECT'),
  'guests can read enabled indicative payment corridors'
);

select ok(
  (
    select bool_and(has_table_privilege('authenticated', relation_name, 'SELECT'))
    from unnest(array[
      'public.trade_observations',
      'public.display_qualified_market_forecasts',
      'public.equity_research_dashboard',
      'public.academy_catalog',
      'public.investment_instruments',
      'public.payment_corridors'
    ]) relation_name
  ),
  'signed-in customers retain every public runtime read'
);

select ok(
  (
    select bool_and((select relrowsecurity from pg_class where oid = relation_name::regclass))
    from unnest(array[
      'public.countries',
      'public.market_assets',
      'public.trade_observations',
      'public.market_observations',
      'public.forecast_runs',
      'public.market_forecasts',
      'public.payment_corridors',
      'public.investment_instruments',
      'public.equity_securities',
      'public.equity_data_coverage',
      'public.equity_fundamental_snapshots',
      'public.equity_research_scores',
      'public.academy_courses',
      'public.academy_lessons'
    ]) relation_name
  ),
  'every public base relation remains protected by RLS'
);

select ok(
  not has_table_privilege('anon', 'public.academy_quiz_questions', 'SELECT'),
  'quiz answers remain inaccessible to guests'
);

select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'investment_portfolios'
      and cmd in ('SELECT', 'ALL')
      and ('anon' = any(roles) or 'public' = any(roles))
  ),
  'private portfolios have no guest read policy'
);

select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payment_quotes'
      and cmd in ('SELECT', 'ALL')
      and ('anon' = any(roles) or 'public' = any(roles))
  ),
  'private payment quotes have no guest read policy'
);

select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'research_briefs'
      and cmd in ('SELECT', 'ALL')
      and ('anon' = any(roles) or 'public' = any(roles))
  ),
  'private research briefs have no guest read policy'
);

select ok(
  (
    select bool_and(
      not has_table_privilege('anon', relation_name, 'INSERT')
      and not has_table_privilege('anon', relation_name, 'UPDATE')
      and not has_table_privilege('anon', relation_name, 'DELETE')
    )
    from unnest(array[
      'public.countries',
      'public.market_assets',
      'public.trade_observations',
      'public.market_observations',
      'public.forecast_runs',
      'public.market_forecasts',
      'public.payment_corridors',
      'public.investment_instruments',
      'public.equity_securities',
      'public.equity_data_coverage',
      'public.equity_fundamental_snapshots',
      'public.equity_research_scores',
      'public.academy_courses',
      'public.academy_lessons'
    ]) relation_name
  ),
  'guest runtime access is read-only'
);

select * from finish();

rollback;
