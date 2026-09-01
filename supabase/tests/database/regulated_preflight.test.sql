begin;

select plan(40);

select ok(to_regclass('public.brokerage_preflight_controls') is not null, 'preflight controls exist');
select ok(to_regclass('public.brokerage_preflight_reviews') is not null, 'private preflight reviews exist');
select ok(
  to_regprocedure('public.persist_regulated_preflight_review(uuid,uuid,bigint,text,text,numeric,numeric,numeric,timestamptz,numeric,text,text,text,text,text,jsonb,jsonb,jsonb,text,timestamptz)') is not null,
  'service-only preflight persistence exists'
);

select is((select count(*) from public.brokerage_preflight_controls), 1::bigint, 'one preflight control is seeded');
select is((select preflight_enabled from public.brokerage_preflight_controls), true, 'preflight review is enabled');
select is((select order_submission_enabled from public.brokerage_preflight_controls), false, 'order submission is disabled');
select is((select market_session_verification_enabled from public.brokerage_preflight_controls), false, 'market session inference is disabled');
select is((select fee_schedule_enabled from public.brokerage_preflight_controls), false, 'unapproved fee schedules are disabled');
select is((select risk_capacity_approval_enabled from public.brokerage_preflight_controls), false, 'automated risk approval is disabled');

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.brokerage_preflight_controls'::regclass and pg_get_constraintdef(oid) ilike '%not order_submission_enabled%'),
  'database constrains order submission to false'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.brokerage_preflight_controls'::regclass and pg_get_constraintdef(oid) ilike '%not market_session_verification_enabled%'),
  'database prevents quote-to-session inference'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.brokerage_preflight_controls'::regclass and pg_get_constraintdef(oid) ilike '%not fee_schedule_enabled%'),
  'database keeps fee schedule disabled'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.brokerage_preflight_controls'::regclass and pg_get_constraintdef(oid) ilike '%not risk_capacity_approval_enabled%'),
  'database keeps automated risk approval disabled'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.brokerage_preflight_reviews'::regclass and pg_get_constraintdef(oid) ilike '%not executable%'),
  'every preflight review is non-executable'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.brokerage_preflight_reviews'::regclass and pg_get_constraintdef(oid) ilike '%review_status%blocked%'),
  'every preflight review is blocked'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.brokerage_preflight_reviews'::regclass and pg_get_constraintdef(oid) ilike '%market_session_status%not_verified%'),
  'market session remains not verified'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.brokerage_preflight_reviews'::regclass and pg_get_constraintdef(oid) ilike '%cost_status%unavailable%'),
  'unknown total cost cannot be represented as complete'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.brokerage_preflight_reviews'::regclass and pg_get_constraintdef(oid) ilike '%risk_status%review_required%'),
  'risk evidence cannot approve capacity'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.brokerage_preflight_reviews'::regclass and pg_get_constraintdef(oid) ilike '%jsonb_array_length(block_reasons) > 0%'),
  'every review keeps at least one blocking reason'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.brokerage_preflight_reviews'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%user_id, client_request_id%'
  ),
  'preflight requests are idempotent per user'
);

select ok((select relrowsecurity from pg_class where oid = 'public.brokerage_preflight_controls'::regclass), 'preflight controls have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.brokerage_preflight_reviews'::regclass), 'preflight reviews have RLS');
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'brokerage_preflight_controls' and policyname = 'Public reads regulated preflight controls'),
  'control state is publicly inspectable'
);
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'brokerage_preflight_reviews' and policyname = 'Users read their regulated preflight reviews'),
  'users read only their preflight evidence'
);

select ok(not has_table_privilege('authenticated', 'public.brokerage_preflight_controls', 'INSERT'), 'browser clients cannot create preflight controls');
select ok(not has_table_privilege('authenticated', 'public.brokerage_preflight_controls', 'UPDATE'), 'browser clients cannot enable preflight controls');
select ok(not has_table_privilege('authenticated', 'public.brokerage_preflight_reviews', 'INSERT'), 'browser clients cannot forge preflight evidence');
select ok(not has_table_privilege('authenticated', 'public.brokerage_preflight_reviews', 'UPDATE'), 'browser clients cannot alter preflight evidence');
select ok(not has_table_privilege('anon', 'public.brokerage_preflight_reviews', 'SELECT'), 'anonymous clients cannot read private preflight evidence');
select ok(has_table_privilege('authenticated', 'public.brokerage_preflight_reviews', 'SELECT'), 'authenticated users can query their preflight evidence');

select ok(
  has_function_privilege('service_role', 'public.persist_regulated_preflight_review(uuid,uuid,bigint,text,text,numeric,numeric,numeric,timestamptz,numeric,text,text,text,text,text,jsonb,jsonb,jsonb,text,timestamptz)', 'EXECUTE'),
  'service role can persist evaluated evidence'
);
select ok(
  not has_function_privilege('authenticated', 'public.persist_regulated_preflight_review(uuid,uuid,bigint,text,text,numeric,numeric,numeric,timestamptz,numeric,text,text,text,text,text,jsonb,jsonb,jsonb,text,timestamptz)', 'EXECUTE'),
  'authenticated clients cannot call the evidence writer'
);
select ok(
  not has_function_privilege('anon', 'public.persist_regulated_preflight_review(uuid,uuid,bigint,text,text,numeric,numeric,numeric,timestamptz,numeric,text,text,text,text,text,jsonb,jsonb,jsonb,text,timestamptz)', 'EXECUTE'),
  'anonymous clients cannot call the evidence writer'
);

select is(
  (select count(*) from public.brokerage_disclosures where code in ('preflight-cost-boundary', 'preflight-market-state-boundary') and published),
  2::bigint,
  'cost and market-state boundaries are disclosed'
);
select ok(to_regclass('public.brokerage_orders') is null, 'no live brokerage order table exists');
select ok(
  not exists (
    select 1 from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public' and procedure.proname like '%submit%broker%order%'
  ),
  'no broker order-submission function exists'
);
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name in ('brokerage_preflight_controls', 'brokerage_preflight_reviews')
      and column_name ~ '(api_key|secret|password|access_token|refresh_token|account_number)'
  ),
  'preflight stores no credentials or raw account number'
);
select ok(
  exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'brokerage_preflight_reviews'
  ),
  'private preflight evidence is available through realtime'
);
select is(
  obj_description('public.brokerage_preflight_reviews'::regclass),
  'Private, identity-bound regulated preflight evidence. Every row is blocked and non-executable.',
  'the review table documents its non-executable boundary'
);
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'brokerage_preflight_reviews'
      and column_name in ('submitted_at', 'routed_at', 'settled_at', 'funded_at')
  ),
  'preflight evidence contains no execution lifecycle fields'
);

select * from finish();

rollback;
