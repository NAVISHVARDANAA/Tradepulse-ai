begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(52);

select has_table('public', 'global_provider_certification_controls', 'provider certification controls exist');
select has_table('public', 'global_provider_certification_profiles', 'provider certification profiles exist');
select has_table('public', 'global_provider_certification_gate_templates', 'certification gates exist');
select has_table('public', 'global_isolated_intake_profiles', 'isolated intake profiles exist');
select has_table('public', 'global_provider_failure_drill_templates', 'provider failure drills exist');
select has_view('public', 'global_provider_certification_status', 'sanitized provider certification status exists');
select has_view('public', 'global_provider_certification_catalog', 'sanitized provider catalog exists');
select has_view('public', 'global_provider_certification_gate_catalog', 'sanitized gate catalog exists');
select has_view('public', 'global_isolated_intake_catalog', 'sanitized isolation catalog exists');
select has_view('public', 'global_provider_failure_drill_catalog', 'sanitized drill catalog exists');

select is((select count(*) from public.global_provider_certification_controls), 1::bigint, 'one provider certification policy is active');
select is((select source_family_target from public.global_provider_certification_controls), 8, 'eight source families are targeted');
select is((select certification_gate_target from public.global_provider_certification_controls), 10, 'ten certification gates are targeted');
select is((select isolation_profile_target from public.global_provider_certification_controls), 8, 'eight isolation profiles are targeted');
select is((select failure_drill_target from public.global_provider_certification_controls), 6, 'six failure drills are targeted');
select ok((select named_legal_owner_required from public.global_provider_certification_controls), 'named legal ownership is required');
select ok((select source_rights_review_required from public.global_provider_certification_controls), 'source rights review is required');
select ok((select privacy_security_review_required from public.global_provider_certification_controls), 'privacy and security review is required');
select ok((select versioned_schema_contract_required from public.global_provider_certification_controls), 'a versioned schema is required');
select ok((select bounded_isolation_required from public.global_provider_certification_controls), 'bounded isolation is required');
select ok((select accountable_human_activation_required from public.global_provider_certification_controls), 'human activation review is required');
select ok(not exists(
  select 1 from public.global_provider_certification_controls
  where provider_selection_enabled or endpoint_testing_enabled or credential_storage_enabled
    or candidate_intake_enabled or production_ingestion_enabled or automatic_certification_enabled
    or observation_release_enabled or model_training_enabled or autonomous_publication_enabled
    or autonomous_trade_execution_enabled
), 'selection, testing, credentials, intake, automation, release, training, publication and execution remain locked');

select is((select count(*) from public.global_provider_certification_profiles), 8::bigint, 'eight provider-family profiles exist');
select is((select count(distinct source_family_key) from public.global_provider_certification_profiles), 8::bigint, 'every source family has one certification profile');
select ok((select bool_and(certification_status = 'provider_unselected') from public.global_provider_certification_profiles), 'every provider remains unselected');
select ok(not exists(
  select 1 from public.global_provider_certification_profiles
  where provider_legal_name is not null or endpoint_domain is not null
    or contract_reference is not null or credential_reference is not null
), 'no provider, endpoint, contract or credential is recorded');
select ok(not exists(
  select 1 from public.global_provider_certification_profiles
  where rights_review_status <> 'not_started' or privacy_security_review_status <> 'not_started'
    or schema_review_status <> 'not_started' or provenance_review_status <> 'not_started'
    or resilience_review_status <> 'not_started'
), 'provider reviews have not started');
select ok(not exists(
  select 1 from public.global_provider_certification_profiles
  where accountable_owner_assigned or certification_approved or isolated_intake_approved or production_effect
), 'no profile has an owner, approval, intake permission or production effect');

select is((select count(*) from public.global_provider_certification_gate_templates), 10::bigint, 'ten certification gates exist');
select ok((select bool_and(blocks_endpoint_test and blocks_candidate_intake and blocks_release)
  from public.global_provider_certification_gate_templates), 'every gate blocks testing, candidate intake and release');
select ok(not exists(select 1 from public.global_provider_certification_gate_templates where automatic_approval_enabled), 'certification cannot be automatic');

select is((select count(*) from public.global_isolated_intake_profiles), 8::bigint, 'one isolation profile exists per source family');
select ok((select bool_and(environment_status = 'not_provisioned') from public.global_isolated_intake_profiles), 'every isolation environment is unprovisioned');
select ok(not exists(
  select 1 from public.global_isolated_intake_profiles
  where network_egress_enabled or credential_access_enabled or payload_storage_enabled
    or candidate_write_enabled or maximum_candidate_rows <> 0
), 'isolation profiles allow no network, credential, payload or candidate writes');
select ok(not exists(
  select 1 from public.global_isolated_intake_profiles
  where environment_reference is not null or latest_tested_at is not null
), 'no environment or test timestamp is fabricated');
select ok(not exists(
  select 1 from public.global_isolated_intake_profiles
  where quarantine_release_enabled or downstream_read_enabled or publication_eligible
    or model_eligible or production_effect
), 'isolated intake has no release, downstream, publication, model or production effect');

select is((select count(*) from public.global_provider_failure_drill_templates), 6::bigint, 'six failure drills exist');
select ok(not exists(select 1 from public.global_provider_failure_drill_templates where observed_drill_count <> 0), 'no drill is represented as observed');
select ok((select bool_and(manual_evidence_required and blocks_certification)
  from public.global_provider_failure_drill_templates), 'every drill requires evidence and blocks certification');
select ok(not exists(select 1 from public.global_provider_failure_drill_templates where automatic_pass_enabled), 'no drill can pass automatically');

select ok(has_table_privilege('anon', 'public.global_provider_certification_status', 'SELECT'), 'guests can read sanitized certification status');
select ok(has_table_privilege('anon', 'public.global_provider_certification_catalog', 'SELECT'), 'guests can read the sanitized provider catalog');
select ok(not has_table_privilege('anon', 'public.global_provider_certification_profiles', 'INSERT'), 'browser roles cannot create provider certifications');
select ok(not has_table_privilege('authenticated', 'public.global_isolated_intake_profiles', 'UPDATE'), 'browser roles cannot provision isolation');
select ok(coalesce((
  select bool_and(reloptions @> array['security_invoker=true'])
  from pg_class where oid in (
    'public.global_provider_certification_status'::regclass,
    'public.global_provider_certification_catalog'::regclass,
    'public.global_provider_certification_gate_catalog'::regclass,
    'public.global_isolated_intake_catalog'::regclass,
    'public.global_provider_failure_drill_catalog'::regclass
  )
), false), 'provider certification views preserve caller permissions');
select ok(to_regprocedure('public.select_global_observation_provider(text)') is null, 'no provider-selection RPC exists');
select ok(to_regprocedure('public.provision_isolated_global_intake(text)') is null, 'no isolation-provisioning RPC exists');
select ok(to_regprocedure('public.ingest_global_provider_candidate(jsonb)') is null, 'no candidate-ingestion RPC exists');
select ok(not exists(
  select 1 from public.global_observation_intake_controls
  where live_provider_connectivity_enabled or production_ingestion_enabled
    or automatic_release_enabled or model_training_enabled
    or autonomous_publication_enabled or autonomous_trade_execution_enabled
), 'earlier observation and execution locks remain closed');
select ok(not exists(
  select 1 from public.global_dependency_transmission_controls
  where live_provider_connectivity_enabled or automatic_relationship_inference_enabled
    or generated_dependency_fill_enabled or automatic_impact_scoring_enabled
    or production_scenario_promotion_enabled or model_training_enabled
    or autonomous_publication_enabled or autonomous_trade_execution_enabled
), 'earlier dependency and execution locks remain closed');

select set_config('request.jwt.claim.role', 'service_role', true);
select throws_ok(
  $$update public.global_provider_certification_profiles set gap_reason = gap_reason || ' changed' where id = 1$$,
  'P0001', 'Global provider certification reference records are append-only',
  'provider certification gaps are append-only'
);
select throws_ok(
  $$delete from public.global_isolated_intake_profiles where id = 1$$,
  'P0001', 'Global provider certification reference records are append-only',
  'isolation profiles are append-only'
);

select * from finish();
rollback;
