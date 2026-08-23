begin;

select plan(22);

select ok(
  to_regclass('public.research_brief_preferences') is not null,
  'research brief preferences exist'
);

select ok(
  to_regclass('public.research_briefs') is not null,
  'private research briefs exist'
);

select ok(
  to_regclass('public.research_alert_events') is not null,
  'research alert evidence events exist'
);

select ok(
  to_regclass('public.user_equity_watchlist_dashboard') is not null,
  'private watchlist research view exists'
);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'market_alerts'
      and column_name = 'target_value'
      and is_nullable = 'YES'
  ),
  'event-based research alerts do not require a numeric target'
);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'market_alerts'
      and column_name = 'delivery_channels'
  ),
  'market alerts record controlled delivery channels'
);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'market_alerts'
      and column_name = 'last_evaluation_key'
  ),
  'market alerts retain an evaluation signature for deduplication'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'market_alerts_supported_condition'
      and pg_get_constraintdef(oid) like '%research_score_above%'
      and pg_get_constraintdef(oid) like '%risk_flags_changed%'
  ),
  'research and risk alert conditions are explicitly constrained'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.research_brief_preferences'::regclass),
  'research brief preferences have row-level security'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.research_briefs'::regclass),
  'research briefs have row-level security'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.research_alert_events'::regclass),
  'research alert events have row-level security'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'research_brief_preferences'
      and policyname = 'Users manage their research brief preferences'
  ),
  'users can manage only their research brief preferences'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'research_briefs'
      and policyname = 'Users read their research briefs'
  ),
  'users can read only their research briefs'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'research_alert_events'
      and policyname = 'Users read their research alert events'
  ),
  'users can read only their research alert evidence'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'research_briefs'
      and indexdef like '%user_id, brief_date, cadence%'
      and indexdef like '%UNIQUE%'
  ),
  'daily brief generation is idempotent per user and cadence'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'research_alert_events'
      and indexdef like '%deduplication_key%'
      and indexdef like '%UNIQUE%'
  ),
  'research alert events have a unique evidence key'
);

select ok(
  exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'research_briefs'
  ),
  'private brief updates are available through realtime'
);

select ok(
  exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'research_alert_events'
  ),
  'private alert events are available through realtime'
);

select ok(
  coalesce(
    (select reloptions @> array['security_invoker=true']
     from pg_class
     where oid = 'public.user_equity_watchlist_dashboard'::regclass),
    false
  ),
  'the watchlist research view executes with caller permissions'
);

select ok(
  not has_table_privilege('authenticated', 'public.research_briefs', 'INSERT'),
  'authenticated clients cannot forge generated research briefs'
);

select ok(
  has_table_privilege('authenticated', 'public.user_equity_watchlist_dashboard', 'SELECT'),
  'authenticated users can query their private watchlist research view'
);

select is(
  (
    select count(*)
    from public.profiles profile
    left join public.research_brief_preferences preference
      on preference.user_id = profile.id
    where preference.user_id is null
  ),
  0::bigint,
  'every existing user profile has a research brief preference'
);

select * from finish();

rollback;
