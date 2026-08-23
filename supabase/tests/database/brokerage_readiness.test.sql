begin;

select plan(55);

select ok(to_regclass('public.broker_provider_registry') is not null, 'broker provider registry exists');
select ok(to_regclass('public.brokerage_execution_controls') is not null, 'global brokerage execution controls exist');
select ok(to_regclass('public.brokerage_accounts') is not null, 'private brokerage account metadata exists');
select ok(to_regclass('public.brokerage_readiness_checks') is not null, 'private regulated-readiness checks exist');
select ok(to_regclass('public.brokerage_disclosures') is not null, 'versioned brokerage disclosures exist');
select ok(to_regclass('public.brokerage_consents') is not null, 'private disclosure consents exist');
select ok(to_regclass('public.brokerage_order_previews') is not null, 'blocked order previews exist');
select ok(to_regclass('public.brokerage_readiness_dashboard') is not null, 'private readiness dashboard exists');

select ok(
  to_regprocedure('public.record_brokerage_consent(uuid)') is not null,
  'authenticated consent recorder exists'
);

select ok(
  exists (
    select 1 from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'persist_brokerage_order_preview'
  ),
  'atomic service-only preview persistence exists'
);

select ok(
  not exists (
    select 1 from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'persist_brokerage_order_preview'
      and has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
  ),
  'browser clients cannot call the atomic preview writer'
);

select is(
  (select count(*) from public.broker_provider_registry),
  1::bigint,
  'one broker-neutral certification contract is seeded'
);

select is(
  (select count(*) from public.broker_provider_registry where live_order_routing_enabled),
  0::bigint,
  'every broker route remains disabled'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.broker_provider_registry'::regclass
      and pg_get_constraintdef(oid) ilike '%not live_order_routing_enabled%'
  ),
  'broker route lock is enforced by a database constraint'
);

select is(
  (select count(*) from public.brokerage_execution_controls),
  1::bigint,
  'one global execution control is configured'
);

select is(
  (select execution_enabled from public.brokerage_execution_controls where control_key = 'global-live-orders'),
  false,
  'global live execution is disabled'
);

select is(
  (
    select jsonb_array_length(required_approvals)
    from public.brokerage_execution_controls
    where control_key = 'global-live-orders'
  ),
  6,
  'six independent launch approvals are required'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.brokerage_execution_controls'::regclass
      and pg_get_constraintdef(oid) ilike '%not execution_enabled%'
  ),
  'the global execution lock is enforced by a database constraint'
);

select is(
  (select count(*) from public.investment_instruments where live_execution_enabled),
  0::bigint,
  'no instrument is enabled for live execution'
);

select ok(
  to_regclass('public.brokerage_orders') is null,
  'no live brokerage order table exists'
);

select ok(
  not exists (
    select 1
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname like '%submit%broker%order%'
  ),
  'no live broker-order submission function exists'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.brokerage_order_previews'::regclass
      and pg_get_constraintdef(oid) ilike '%not executable%'
  ),
  'every preview is constrained to non-executable'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.brokerage_order_previews'::regclass
      and pg_get_constraintdef(oid) ilike '%preview_status%blocked%'
  ),
  'every preview is constrained to blocked status'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.brokerage_accounts'::regclass
      and pg_get_constraintdef(oid) ilike '%environment%sandbox%'
  ),
  'account metadata is constrained to the sandbox environment'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'brokerage_order_previews'
      and indexdef like '%user_id, client_request_id%'
      and indexdef like '%UNIQUE%'
  ),
  'order previews are idempotent per user request'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.brokerage_order_previews'::regclass
      and contype = 'f'
      and pg_get_constraintdef(oid) ilike '%brokerage_account_id, user_id%'
  ),
  'a preview cannot reference another user brokerage account'
);

select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name like 'broker%'
      and column_name ~ '(api_key|secret|password|access_token|refresh_token|account_number)'
  ),
  'brokerage tables contain no provider credentials or raw account numbers'
);

select ok((select relrowsecurity from pg_class where oid = 'public.broker_provider_registry'::regclass), 'provider registry has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.brokerage_execution_controls'::regclass), 'execution controls have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.brokerage_accounts'::regclass), 'brokerage accounts have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.brokerage_readiness_checks'::regclass), 'readiness checks have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.brokerage_disclosures'::regclass), 'brokerage disclosures have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.brokerage_consents'::regclass), 'brokerage consents have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.brokerage_order_previews'::regclass), 'brokerage previews have RLS');

select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'broker_provider_registry' and policyname = 'Public reads broker integration readiness'),
  'provider readiness is publicly inspectable'
);

select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'brokerage_execution_controls' and policyname = 'Public reads global brokerage controls'),
  'the global execution lock is publicly inspectable'
);

select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'brokerage_accounts' and policyname = 'Users read their brokerage accounts'),
  'users read only their brokerage accounts'
);

select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'brokerage_readiness_checks' and policyname = 'Users read their brokerage readiness checks'),
  'users read only their regulated-readiness checks'
);

select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'brokerage_disclosures' and policyname = 'Public reads published brokerage disclosures'),
  'only current published disclosures are publicly readable'
);

select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'brokerage_consents' and policyname = 'Users read their brokerage consents'),
  'users read only their disclosure consents'
);

select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'brokerage_order_previews' and policyname = 'Users read their brokerage order previews'),
  'users read only their blocked order previews'
);

select ok(
  not has_table_privilege('authenticated', 'public.brokerage_accounts', 'INSERT'),
  'browser clients cannot create broker connections'
);

select ok(
  not has_table_privilege('authenticated', 'public.brokerage_readiness_checks', 'INSERT'),
  'browser clients cannot forge compliance outcomes'
);

select ok(
  not has_table_privilege('authenticated', 'public.brokerage_order_previews', 'INSERT'),
  'browser clients cannot forge order previews'
);

select ok(
  not has_table_privilege('authenticated', 'public.brokerage_consents', 'INSERT'),
  'browser clients cannot bypass the consent recorder'
);

select ok(
  has_function_privilege('authenticated', 'public.record_brokerage_consent(uuid)', 'EXECUTE'),
  'authenticated users can record a current disclosure acknowledgement'
);

select ok(
  not has_function_privilege('anon', 'public.record_brokerage_consent(uuid)', 'EXECUTE'),
  'anonymous sessions cannot record disclosure acknowledgement'
);

select ok(
  has_table_privilege('authenticated', 'public.brokerage_readiness_dashboard', 'SELECT'),
  'authenticated users can query their readiness dashboard'
);

select ok(
  coalesce(
    (select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.brokerage_readiness_dashboard'::regclass),
    false
  ),
  'the readiness dashboard preserves caller permissions'
);

select is(
  (
    select count(*)
    from public.profiles profile
    left join public.user_investor_profiles investor on investor.user_id = profile.id
    where investor.user_id is null
  ),
  0::bigint,
  'every existing user receives a compliance-managed investor profile'
);

select ok(
  exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'brokerage_order_previews'
  ),
  'private preview updates are available through realtime'
);

select is(
  (select count(*) from public.academy_courses where slug = 'brokerage-readiness' and published and access_tier = 'free'),
  1::bigint,
  'the brokerage-readiness Academy course is free and published'
);

select is(
  (select count(*) from public.academy_lessons where course_slug = 'brokerage-readiness' and published),
  3::bigint,
  'the brokerage-readiness course has three lessons'
);

select is(
  (
    select count(*)
    from public.academy_quiz_questions question
    join public.academy_lessons lesson on lesson.slug = question.lesson_slug
    where lesson.course_slug = 'brokerage-readiness'
  ),
  3::bigint,
  'every brokerage-readiness lesson has a knowledge check'
);

select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'academy_quiz_questions_public'
      and column_name in ('correct_option', 'explanation')
  ),
  'the expanded Academy still keeps answer keys private'
);

select * from finish();

rollback;
