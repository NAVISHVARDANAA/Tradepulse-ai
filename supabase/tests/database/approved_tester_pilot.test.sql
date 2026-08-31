begin;

select plan(29);

select ok(to_regclass('public.controlled_beta_pilot_cohorts') is not null, 'pilot cohorts exist');
select ok(to_regclass('public.controlled_beta_pilot_memberships') is not null, 'pilot memberships exist');
select ok(to_regclass('public.controlled_beta_pilot_mission_progress') is not null, 'pilot mission progress exists');
select ok(
  (select bool_and(relrowsecurity) from pg_class where oid in (
    'public.controlled_beta_pilot_cohorts'::regclass,
    'public.controlled_beta_pilot_memberships'::regclass,
    'public.controlled_beta_pilot_mission_progress'::regclass
  )),
  'pilot relations use RLS'
);
select ok(
  not has_table_privilege('anon', 'public.controlled_beta_pilot_cohorts', 'SELECT')
  and not has_table_privilege('anon', 'public.controlled_beta_pilot_memberships', 'SELECT')
  and not has_table_privilege('anon', 'public.controlled_beta_pilot_mission_progress', 'SELECT'),
  'anonymous users cannot inspect cohorts or memberships'
);
select ok(
  not has_table_privilege('authenticated', 'public.controlled_beta_pilot_cohorts', 'INSERT')
  and not has_table_privilege('authenticated', 'public.controlled_beta_pilot_memberships', 'INSERT')
  and not has_table_privilege('authenticated', 'public.controlled_beta_pilot_mission_progress', 'INSERT'),
  'the browser cannot approve a cohort or tester'
);
select ok(has_function_privilege('authenticated', 'public.get_controlled_beta_pilot_status()', 'EXECUTE'), 'tester may read their sanitized pilot status');
select ok(has_function_privilege('authenticated', 'public.accept_controlled_beta_pilot_terms(text)', 'EXECUTE'), 'approved tester may accept the current agreement');
select ok(has_function_privilege('authenticated', 'public.set_controlled_beta_pilot_mission(text,boolean)', 'EXECUTE'), 'active tester may record bounded mission progress');
select ok(not has_function_privilege('anon', 'public.get_controlled_beta_pilot_status()', 'EXECUTE'), 'anonymous pilot status is blocked');
select ok(not has_function_privilege('anon', 'public.accept_controlled_beta_pilot_terms(text)', 'EXECUTE'), 'anonymous pilot acceptance is blocked');
select ok(not has_function_privilege('anon', 'public.set_controlled_beta_pilot_mission(text,boolean)', 'EXECUTE'), 'anonymous mission progress is blocked');
select ok(exists(
  select 1 from pg_trigger
  where tgname = 'controlled_beta_pilot_cohort_limit' and not tgisinternal
), 'cohort capacity has a database trigger');

insert into public.controlled_beta_pilot_cohorts(
  cohort_code, display_name, status, max_testers, starts_at, ends_at,
  terms_version, feedback_response_target_hours, incident_response_target_minutes
) values (
  'phase-5h-test', 'Phase 5H test cohort', 'active', 1,
  now() - interval '1 hour', now() + interval '7 days',
  'pilot-v1.0', 2, 30
);

insert into auth.users(
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
  ('00000000-0000-4000-8000-000000000061', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'phase5h-one@example.test', '', now(), now(), now(), '{}', '{}'),
  ('00000000-0000-4000-8000-000000000062', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'phase5h-two@example.test', '', now(), now(), now(), '{}', '{}');

insert into public.controlled_beta_pilot_memberships(user_id, cohort_code)
values ('00000000-0000-4000-8000-000000000061', 'phase-5h-test');

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000061', true);

select is((public.get_controlled_beta_pilot_status() ->> 'eligible')::boolean, true, 'approved tester is eligible');
select is(public.get_controlled_beta_pilot_status() ->> 'cohortName', 'Phase 5H test cohort', 'tester sees the assigned cohort');
select is(public.get_controlled_beta_pilot_status() ->> 'membershipStatus', 'approved', 'membership begins approved but inactive');
select throws_ok(
  $$select public.accept_controlled_beta_pilot_terms('pilot-v0.9')$$,
  'P0001', 'Pilot agreement version is not current',
  'stale pilot agreement is rejected'
);
select is(
  public.accept_controlled_beta_pilot_terms('pilot-v1.0') ->> 'membershipStatus',
  'active', 'current agreement activates the approved membership'
);
select ok((select consented_at is not null from public.controlled_beta_pilot_memberships where user_id = auth.uid()), 'agreement acceptance is timestamped');
select is((select terms_version_accepted from public.controlled_beta_pilot_memberships where user_id = auth.uid()), 'pilot-v1.0', 'accepted agreement version is retained');
select is(
  public.set_controlled_beta_pilot_mission('trust-review', true) -> 'completedMissions',
  '["trust-review"]'::jsonb, 'active tester can complete a bounded mission'
);
select throws_ok(
  $$select public.set_controlled_beta_pilot_mission('live-order', true)$$,
  'P0001', 'Unsupported pilot mission',
  'unapproved pilot mission is rejected'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000062', true);
select is((public.get_controlled_beta_pilot_status() ->> 'eligible')::boolean, false, 'another user cannot see the tester assignment');
select throws_ok(
  $$insert into public.controlled_beta_pilot_memberships(user_id, cohort_code) values ('00000000-0000-4000-8000-000000000062', 'phase-5h-test')$$,
  'P0001', 'Pilot cohort capacity reached',
  'cohort capacity cannot be exceeded'
);

select is(
  (public.submit_customer_support_request('pilot_feedback', 'Pilot clarity feedback', 'The trust receipt was clear and useful.', 5::smallint)).request_type,
  'pilot_feedback', 'tester can submit dedicated pilot feedback'
);
select is(
  (public.submit_customer_support_request('pilot_incident', 'Pilot workflow blocked', 'The pilot mission could not be completed safely.', null::smallint)).request_type,
  'pilot_incident', 'tester can escalate a pilot incident'
);
select ok(to_regclass('public.payment_transactions') is null, 'payment execution remains absent');
select is((select count(*) from public.broker_provider_registry where live_order_routing_enabled), 0::bigint, 'live broker routes remain disabled');
select is((select execution_enabled from public.brokerage_execution_controls where control_key = 'global-live-orders'), false, 'global execution remains disabled');

select * from finish();
rollback;
