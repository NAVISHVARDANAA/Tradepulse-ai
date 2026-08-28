-- TradePulse AI
-- Migration 034: explicit least-privilege reads for the public web runtime

-- Older foundations defined RLS SELECT policies but relied on environment
-- default grants. Production does not provide those implicit privileges for
-- every relation, so security-invoker views and direct guest reads returned
-- HTTP 401. Make the intended public boundary explicit and portable.
revoke insert, update, delete, truncate, references, trigger on table
  public.countries,
  public.market_assets,
  public.trade_observations,
  public.market_observations,
  public.forecast_runs,
  public.market_forecasts,
  public.payment_corridors,
  public.investment_instruments,
  public.equity_securities,
  public.equity_data_coverage,
  public.equity_fundamental_snapshots,
  public.equity_research_scores,
  public.academy_courses,
  public.academy_lessons
from anon, authenticated;

grant select on table
  public.countries,
  public.market_assets,
  public.trade_observations,
  public.market_observations,
  public.forecast_runs,
  public.market_forecasts,
  public.payment_corridors,
  public.investment_instruments,
  public.equity_securities,
  public.equity_data_coverage,
  public.equity_fundamental_snapshots,
  public.equity_research_scores,
  public.academy_courses,
  public.academy_lessons
to anon, authenticated;

grant select on table
  public.forecast_reliability_latest,
  public.display_qualified_market_forecasts,
  public.equity_research_dashboard,
  public.academy_catalog,
  public.academy_quiz_questions_public
to anon, authenticated;

-- Protected answer, customer, execution and payment records are deliberately
-- excluded. Their existing RLS and explicit role grants remain unchanged.

