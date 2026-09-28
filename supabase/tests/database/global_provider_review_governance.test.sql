begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(40);

select has_table('public', 'global_provider_review_governance_controls', 'provider review-governance controls exist');
select has_table('public', 'global_provider_review_role_templates', 'provider review role templates exist');
select has_table('public', 'global_provider_evidence_lifecycle_templates', 'evidence lifecycle templates exist');
select has_table('public', 'global_provider_review_responsibility_matrix', 'provider review responsibility matrix exists');
select has_view('public', 'global_provider_review_governance_status', 'sanitized review-governance status exists');
select has_view('public', 'global_provider_review_role_catalog', 'sanitized review-role catalog exists');
select has_view('public', 'global_provider_evidence_lifecycle_catalog', 'sanitized evidence-lifecycle catalog exists');
select has_view('public', 'global_provider_review_responsibility_catalog', 'sanitized responsibility catalog exists');

select is((select count(*) from public.global_provider_review_governance_controls), 1::bigint, 'one review-governance policy is active');
select is((select source_family_target from public.global_provider_review_governance_controls), 8, 'eight source families are targeted');
select is((select role_template_target from public.global_provider_review_governance_controls), 8, 'eight role templates are targeted');
select is((select responsibility_target from public.global_provider_review_governance_controls), 64, 'sixty-four responsibility cells are targeted');
select is((select lifecycle_stage_target from public.global_provider_review_governance_controls), 7, 'seven evidence lifecycle stages are targeted');
select ok((select independent_review_required and separation_of_duties_required
  and least_privilege_custody_required and dual_control_activation_required
  and expiry_and_revocation_required
  from public.global_provider_review_governance_controls), 'independent review, separated duties, controlled custody, dual control and expiry are required');
select ok(not exists(
  select 1 from public.global_provider_review_governance_controls
  where role_assignment_enabled or reviewer_identity_storage_enabled
    or evidence_receipt_enabled or evidence_document_storage_enabled
    or custody_location_provisioning_enabled or provider_candidate_selection_enabled
    or review_packet_open_enabled or evidence_submission_enabled
    or endpoint_connectivity_enabled or credential_storage_enabled
    or external_payload_intake_enabled or fixture_execution_enabled
    or conformance_approval_enabled or candidate_write_enabled
    or observation_release_enabled or model_training_enabled
    or autonomous_publication_enabled or autonomous_trade_execution_enabled
), 'assignments, identities, evidence, custody, candidates, endpoints and downstream effects remain locked');
select is((select source_family_count from public.global_provider_review_governance_status), 8, 'status reports eight source families');
select is((select role_template_count from public.global_provider_review_governance_status), 8, 'status reports eight role templates');
select is((select responsibility_count from public.global_provider_review_governance_status), 64, 'status reports sixty-four responsibility cells');

select is((select count(*) from public.global_provider_review_role_templates), 8::bigint, 'eight review role templates exist');
select is((select count(distinct review_domain) from public.global_provider_review_role_templates), 7::bigint, 'seven review domains are represented');
select ok((select bool_and(assignment_status = 'unassigned' and blocks_packet_opening
  and blocks_endpoint_access and blocks_release and not human_authorized)
  from public.global_provider_review_role_templates), 'every role is unassigned and blocks packet opening, endpoints and release');
select ok(not exists(
  select 1 from public.global_provider_review_role_templates where assigned_identity is not null
), 'no reviewer identity is stored');

select is((select count(*) from public.global_provider_evidence_lifecycle_templates), 7::bigint, 'seven evidence lifecycle templates exist');
select ok((select bool_and(not real_evidence_present and not automatic_transition_enabled
  and human_action_required and not production_effect)
  from public.global_provider_evidence_lifecycle_templates), 'lifecycle stages are empty, manual and non-production');
select ok(not exists(
  select 1 from public.global_provider_evidence_lifecycle_templates where storage_location is not null
), 'no evidence custody location is stored');

select is((select count(*) from public.global_provider_review_responsibility_matrix), 64::bigint, 'sixty-four responsibility cells exist');
select ok(not exists(
  select review_profile_id from public.global_provider_review_responsibility_matrix
  group by review_profile_id having count(*) <> 8
), 'each source family has eight role responsibilities');
select ok((select bool_and(responsibility_status = 'unassigned' and not human_authorized)
  from public.global_provider_review_responsibility_matrix), 'every responsibility is unassigned and unauthorized');
select ok(not exists(
  select 1 from public.global_provider_review_responsibility_matrix
  where reviewer_identity is not null or custody_location is not null
    or assigned_at is not null or authorized_at is not null or expires_at is not null
), 'no reviewer, custody location or assignment time is stored');
select ok(not exists(
  select 1 from public.global_provider_review_responsibility_matrix
  where packet_open_effect or endpoint_access_effect or candidate_write_effect
    or release_effect or production_effect
), 'responsibility placeholders have no packet, endpoint, candidate, release or production effect');

select ok(has_table_privilege('anon', 'public.global_provider_review_governance_status', 'SELECT'), 'guests can read sanitized review-governance status');
select ok(has_table_privilege('anon', 'public.global_provider_review_responsibility_catalog', 'SELECT'), 'guests can read the unassigned responsibility catalog');
select ok(not has_table_privilege('anon', 'public.global_provider_review_role_templates', 'INSERT'), 'browser roles cannot assign review roles');
select ok(not has_table_privilege('authenticated', 'public.global_provider_review_responsibility_matrix', 'UPDATE'), 'browser roles cannot authorize responsibilities');
select ok(coalesce((
  select bool_and(reloptions @> array['security_invoker=true'])
  from pg_class where oid in (
    'public.global_provider_review_governance_status'::regclass,
    'public.global_provider_review_role_catalog'::regclass,
    'public.global_provider_evidence_lifecycle_catalog'::regclass,
    'public.global_provider_review_responsibility_catalog'::regclass
  )
), false), 'review-governance views preserve caller permissions');
select ok(to_regprocedure('public.assign_global_provider_reviewer(text,text)') is null, 'no reviewer-assignment RPC exists');
select ok(to_regprocedure('public.receive_global_provider_evidence(jsonb)') is null, 'no evidence-receipt RPC exists');
select ok(not exists(
  select 1 from public.global_provider_candidate_review_controls
  where provider_candidate_selection_enabled or review_packet_open_enabled
    or evidence_submission_enabled or evidence_document_storage_enabled
    or endpoint_connectivity_enabled or credential_storage_enabled
    or external_payload_intake_enabled or fixture_execution_enabled
    or conformance_approval_enabled or candidate_write_enabled
    or observation_release_enabled or model_training_enabled
    or autonomous_publication_enabled or autonomous_trade_execution_enabled
), 'Phase 8N candidate-review locks remain closed');

select set_config('request.jwt.claim.role', 'service_role', true);
select throws_ok(
  $$update public.global_provider_review_role_templates set assignment_status = 'assigned' where id = 1$$,
  'P0001', 'Global provider review-governance reference records are append-only',
  'review role templates are append-only'
);
select throws_ok(
  $$delete from public.global_provider_review_responsibility_matrix where id = 1$$,
  'P0001', 'Global provider review-governance reference records are append-only',
  'review responsibility matrix is append-only'
);

select * from finish();
rollback;
