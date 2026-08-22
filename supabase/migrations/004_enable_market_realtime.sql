-- TradePulse AI
-- Migration 004: Enable realtime delivery for market observations.

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'market_observations'
  ) then
    execute 'alter publication supabase_realtime add table public.market_observations';
  end if;
end
$$;
