-- TradePulse AI
-- Migration 007: Realtime updates for dynamic Phase 1 and 2 dashboard data

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'trade_observations'
    ) then
      execute 'alter publication supabase_realtime add table public.trade_observations';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'market_forecasts'
    ) then
      execute 'alter publication supabase_realtime add table public.market_forecasts';
    end if;
  end if;
end;
$$;
