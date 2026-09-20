begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(43);

select has_table('public', 'global_provider_contract_test_controls', 'provider contract-test controls exist');
select has_table('public', 'global_provider_contract_test_suites', 'provider contract suites exist');
select has_table('public', 'global_provider_contract_assertion_templates', 'contract assertions exist');
select has_table('public', 'global_provider_synthetic_fixture_templates', 'synthetic fixture specifications exist');
select has_view('public', 'global_provider_contract_test_status', 'sanitized contract-test status exists');
select has_view('public', 'global_provider_contract_suite_catalog', 'sanitized suite catalog exists');
select has_view('public', 'global_provider_contract_assertion_catalog', 'sanitized assertion catalog exists');
select has_view('public', 'global_provider_synthetic_fixture_catalog', 'sanitized fixture catalog exists');

select is((select count(*) from public.global_provider_contract_test_controls), 1::bigint, 'one contract-test policy is active');
select is((select source_family_target from public.global_provider_contract_test_controls), 8, 'eight source families are targeted');
select is((select contract_suite_target from public.global_provider_contract_test_controls), 8, 'eight suites are targeted');
select is((select assertion_target from public.global_provider_contract_test_controls), 10, 'ten assertions are targeted');
select is((select synthetic_fixture_target from public.global_provider_contract_test_controls), 24, 'twenty-four fixture specifications are targeted');
select ok((select deterministic_fixture_required and explicit_missingness_required
  and schema_version_required and fail_closed_disposition_required
  from public.global_provider_contract_test_controls), 'deterministic, versioned and fail-closed fixture rules are required');
select ok(not exists(
  select 1 from public.global_provider_contract_test_controls
  where provider_selection_enabled or endpoint_execution_enabled
    or credential_access_enabled or external_payload_intake_enabled
    or synthetic_fixture_execution_enabled or candidate_write_enabled
    or automatic_conformance_approval_enabled or observation_release_enabled
    or model_training_enabled or autonomous_publication_enabled
    or autonomous_trade_execution_enabled
), 'selection, endpoints, credentials, payloads, execution, writes, automation, release, training, publication and trading remain locked');
select is((select contract_suite_count from public.global_provider_contract_test_status), 8, 'status reports eight suites');
select is((select synthetic_fixture_count from public.global_provider_contract_test_status), 24, 'status reports twenty-four fixture specifications');

select is((select count(*) from public.global_provider_contract_test_suites), 8::bigint, 'one suite exists per source family');
select is((select count(distinct source_family_key) from public.global_provider_contract_test_suites), 8::bigint, 'suite source families are unique');
select ok((select bool_and(suite_status = 'specification_only') from public.global_provider_contract_test_suites), 'every suite is specification-only');
select ok(not exists(
  select 1 from public.global_provider_contract_test_suites
  where provider_legal_name is not null or endpoint_domain is not null
    or credential_reference is not null or external_payload_reference is not null
), 'no provider, endpoint, credential or external payload is recorded');
select ok(not exists(
  select 1 from public.global_provider_contract_test_suites
  where executed_test_count <> 0 or passed_test_count <> 0 or conformance_approved
), 'no contract test is represented as run, passed or approved');
select ok(not exists(
  select 1 from public.global_provider_contract_test_suites
  where candidate_write_enabled or release_enabled or production_effect
), 'contract suites have no candidate, release or production effect');

select is((select count(*) from public.global_provider_contract_assertion_templates), 10::bigint, 'ten canonical assertions exist');
select ok((select bool_and(blocks_external_execution and blocks_candidate_write and blocks_release)
  from public.global_provider_contract_assertion_templates), 'every assertion blocks external execution, candidate writes and release');
select ok(not exists(select 1 from public.global_provider_contract_assertion_templates where automatic_pass_enabled), 'no assertion can pass automatically');
select is((select count(*) from public.global_provider_contract_assertion_templates where failure_disposition = 'reject'), 7::bigint, 'seven assertions reject invalid shapes');

select is((select count(*) from public.global_provider_synthetic_fixture_templates), 24::bigint, 'twenty-four fixture specifications exist');
select is((select count(*) from public.global_provider_synthetic_fixture_templates where fixture_class = 'valid_minimal'), 8::bigint, 'eight minimal-valid specifications exist');
select is((select count(*) from public.global_provider_synthetic_fixture_templates where fixture_class = 'missing_required'), 8::bigint, 'eight missing-field specifications exist');
select is((select count(*) from public.global_provider_synthetic_fixture_templates where fixture_class = 'schema_drift'), 8::bigint, 'eight schema-drift specifications exist');
select ok((select bool_and(provider_neutral and not contains_external_data and not contains_real_world_observation)
  from public.global_provider_synthetic_fixture_templates), 'every fixture specification is provider-neutral and contains no external observation');
select ok(not exists(
  select 1 from public.global_provider_synthetic_fixture_templates
  where execution_count <> 0 or latest_executed_at is not null
    or candidate_write_enabled or release_enabled or production_effect
), 'fixtures are unexecuted and have no downstream effect');

select ok(has_table_privilege('anon', 'public.global_provider_contract_test_status', 'SELECT'), 'guests can read sanitized contract-test status');
select ok(has_table_privilege('anon', 'public.global_provider_synthetic_fixture_catalog', 'SELECT'), 'guests can read sanitized fixture specifications');
select ok(not has_table_privilege('anon', 'public.global_provider_contract_test_suites', 'INSERT'), 'browser roles cannot create contract suites');
select ok(not has_table_privilege('authenticated', 'public.global_provider_synthetic_fixture_templates', 'UPDATE'), 'browser roles cannot change fixtures');
select ok(coalesce((
  select bool_and(reloptions @> array['security_invoker=true'])
  from pg_class where oid in (
    'public.global_provider_contract_test_status'::regclass,
    'public.global_provider_contract_suite_catalog'::regclass,
    'public.global_provider_contract_assertion_catalog'::regclass,
    'public.global_provider_synthetic_fixture_catalog'::regclass
  )
), false), 'provider contract-test views preserve caller permissions');
select ok(to_regprocedure('public.execute_global_provider_contract_test(text)') is null, 'no contract-test execution RPC exists');
select ok(to_regprocedure('public.ingest_global_provider_payload(jsonb)') is null, 'no provider-payload ingestion RPC exists');
select ok(not exists(
  select 1 from public.global_provider_certification_controls
  where provider_selection_enabled or endpoint_testing_enabled
    or credential_storage_enabled or candidate_intake_enabled
    or production_ingestion_enabled or automatic_certification_enabled
    or observation_release_enabled or model_training_enabled
    or autonomous_publication_enabled or autonomous_trade_execution_enabled
), 'Phase 8L provider and execution locks remain closed');

select set_config('request.jwt.claim.role', 'service_role', true);
select throws_ok(
  $$update public.global_provider_contract_test_suites set schema_contract_version = 'changed' where id = 1$$,
  'P0001', 'Global provider contract-test reference records are append-only',
  'contract suites are append-only'
);
select throws_ok(
  $$delete from public.global_provider_synthetic_fixture_templates where id = 1$$,
  'P0001', 'Global provider contract-test reference records are append-only',
  'fixture specifications are append-only'
);

select * from finish();
rollback;
