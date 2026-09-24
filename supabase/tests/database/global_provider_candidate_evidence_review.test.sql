begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(42);

select has_table('public', 'global_provider_candidate_review_controls', 'provider candidate-review controls exist');
select has_table('public', 'global_provider_candidate_review_profiles', 'candidate review profiles exist');
select has_table('public', 'global_provider_candidate_evidence_requirements', 'candidate evidence requirements exist');
select has_table('public', 'global_provider_candidate_review_matrix', 'candidate review matrix exists');
select has_view('public', 'global_provider_candidate_review_status', 'sanitized candidate-review status exists');
select has_view('public', 'global_provider_candidate_review_catalog', 'sanitized review catalog exists');
select has_view('public', 'global_provider_candidate_evidence_catalog', 'sanitized evidence catalog exists');
select has_view('public', 'global_provider_candidate_review_matrix_catalog', 'sanitized review matrix exists');

select is((select count(*) from public.global_provider_candidate_review_controls), 1::bigint, 'one candidate-review policy is active');
select is((select source_family_target from public.global_provider_candidate_review_controls), 8, 'eight source families are targeted');
select is((select review_packet_target from public.global_provider_candidate_review_controls), 8, 'eight review packets are targeted');
select is((select evidence_requirement_target from public.global_provider_candidate_review_controls), 12, 'twelve evidence requirements are targeted');
select is((select review_matrix_target from public.global_provider_candidate_review_controls), 96, 'ninety-six evidence cells are targeted');
select ok((select manual_review_required and signed_evidence_reference_required
  and versioned_field_mapping_required and observed_failure_drill_required
  from public.global_provider_candidate_review_controls), 'manual, signed, mapped and observed evidence is required');
select ok(not exists(
  select 1 from public.global_provider_candidate_review_controls
  where provider_candidate_selection_enabled or review_packet_open_enabled
    or evidence_submission_enabled or evidence_document_storage_enabled
    or endpoint_connectivity_enabled or credential_storage_enabled
    or external_payload_intake_enabled or fixture_execution_enabled
    or conformance_approval_enabled or candidate_write_enabled
    or observation_release_enabled or model_training_enabled
    or autonomous_publication_enabled or autonomous_trade_execution_enabled
), 'selection, review opening, evidence writes, endpoints, credentials, payloads, testing and downstream effects remain locked');
select is((select review_packet_count from public.global_provider_candidate_review_status), 8, 'status reports eight packets');
select is((select review_matrix_count from public.global_provider_candidate_review_status), 96, 'status reports ninety-six evidence cells');

select is((select count(*) from public.global_provider_candidate_review_profiles), 8::bigint, 'one review profile exists per source family');
select is((select count(distinct source_family_key) from public.global_provider_candidate_review_profiles), 8::bigint, 'review source families are unique');
select ok((select bool_and(review_status = 'not_opened' and conformance_state = 'blocked')
  from public.global_provider_candidate_review_profiles), 'every review packet is unopened and blocked');
select ok(not exists(
  select 1 from public.global_provider_candidate_review_profiles
  where provider_candidate_name is not null or provider_legal_entity is not null
    or endpoint_domain is not null or credential_reference is not null
    or evidence_document_reference is not null or external_payload_reference is not null
), 'no provider, endpoint, credential, evidence document or payload is recorded');
select ok(not exists(
  select 1 from public.global_provider_candidate_review_profiles
  where review_packet_opened_at is not null or submitted_requirement_count <> 0
    or approved_requirement_count <> 0 or executed_fixture_count <> 0
    or passed_fixture_count <> 0 or accountable_activation_approved
), 'no packet, evidence, fixture execution or activation is represented');
select ok(not exists(
  select 1 from public.global_provider_candidate_review_profiles
  where candidate_write_enabled or release_enabled or production_effect
), 'review profiles have no candidate, release or production effect');

select is((select count(*) from public.global_provider_candidate_evidence_requirements), 12::bigint, 'twelve evidence requirements exist');
select ok((select bool_and(blocks_endpoint_execution and blocks_candidate_write and blocks_release)
  from public.global_provider_candidate_evidence_requirements), 'every requirement blocks endpoints, candidate writes and release');
select ok(not exists(select 1 from public.global_provider_candidate_evidence_requirements where automatic_pass_enabled), 'no evidence requirement can pass automatically');
select is((select count(distinct review_domain) from public.global_provider_candidate_evidence_requirements), 8::bigint, 'all eight review domains are represented');

select is((select count(*) from public.global_provider_candidate_review_matrix), 96::bigint, 'ninety-six evidence matrix cells exist');
select ok(not exists(
  select review_profile_id from public.global_provider_candidate_review_matrix
  group by review_profile_id having count(*) <> 12
), 'each review packet contains twelve evidence cells');
select ok((select bool_and(evidence_status = 'not_submitted' and not human_approved)
  from public.global_provider_candidate_review_matrix), 'every evidence cell is missing and unapproved');
select ok(not exists(
  select 1 from public.global_provider_candidate_review_matrix
  where evidence_reference is not null or reviewer_identity is not null
    or reviewed_at is not null or expires_at is not null
), 'no evidence reference, reviewer or review time is stored');
select ok(not exists(
  select 1 from public.global_provider_candidate_review_matrix
  where endpoint_execution_effect or candidate_write_effect or release_effect or production_effect
), 'evidence placeholders have no endpoint, candidate, release or production effect');

select ok(has_table_privilege('anon', 'public.global_provider_candidate_review_status', 'SELECT'), 'guests can read sanitized candidate-review status');
select ok(has_table_privilege('anon', 'public.global_provider_candidate_review_matrix_catalog', 'SELECT'), 'guests can read the empty review matrix');
select ok(not has_table_privilege('anon', 'public.global_provider_candidate_review_profiles', 'INSERT'), 'browser roles cannot open review packets');
select ok(not has_table_privilege('authenticated', 'public.global_provider_candidate_review_matrix', 'UPDATE'), 'browser roles cannot submit or approve evidence');
select ok(coalesce((
  select bool_and(reloptions @> array['security_invoker=true'])
  from pg_class where oid in (
    'public.global_provider_candidate_review_status'::regclass,
    'public.global_provider_candidate_review_catalog'::regclass,
    'public.global_provider_candidate_evidence_catalog'::regclass,
    'public.global_provider_candidate_review_matrix_catalog'::regclass
  )
), false), 'candidate-review views preserve caller permissions');
select ok(to_regprocedure('public.open_global_provider_candidate_review(text)') is null, 'no candidate-review opening RPC exists');
select ok(to_regprocedure('public.submit_global_provider_candidate_evidence(jsonb)') is null, 'no candidate-evidence submission RPC exists');
select ok(not exists(
  select 1 from public.global_provider_contract_test_controls
  where provider_selection_enabled or endpoint_execution_enabled
    or credential_access_enabled or external_payload_intake_enabled
    or synthetic_fixture_execution_enabled or candidate_write_enabled
    or automatic_conformance_approval_enabled or observation_release_enabled
    or model_training_enabled or autonomous_publication_enabled
    or autonomous_trade_execution_enabled
), 'Phase 8M provider and execution locks remain closed');

select set_config('request.jwt.claim.role', 'service_role', true);
select throws_ok(
  $$update public.global_provider_candidate_review_profiles set conformance_state = 'approved' where id = 1$$,
  'P0001', 'Global provider candidate-review reference records are append-only',
  'candidate review profiles are append-only'
);
select throws_ok(
  $$delete from public.global_provider_candidate_review_matrix where id = 1$$,
  'P0001', 'Global provider candidate-review reference records are append-only',
  'candidate evidence matrix is append-only'
);

select * from finish();
rollback;
