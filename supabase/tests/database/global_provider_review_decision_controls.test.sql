begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(42);

select has_table('public', 'global_provider_review_decision_controls', 'provider review decision controls exist');
select has_table('public', 'global_provider_review_decision_state_templates', 'provider review decision states exist');
select has_table('public', 'global_provider_review_decision_gate_templates', 'provider review decision gates exist');
select has_table('public', 'global_provider_review_decision_readiness_matrix', 'provider review decision readiness exists');
select has_view('public', 'global_provider_review_decision_status', 'sanitized provider review decision status exists');
select has_view('public', 'global_provider_review_decision_state_catalog', 'sanitized provider review decision states exist');
select has_view('public', 'global_provider_review_decision_gate_catalog', 'sanitized provider review decision gates exist');
select has_view('public', 'global_provider_review_decision_readiness_catalog', 'sanitized provider review decision readiness exists');

select is((select count(*) from public.global_provider_review_decision_controls), 1::bigint, 'one decision-control policy is active');
select is((select source_family_target from public.global_provider_review_decision_controls), 8, 'eight source families are targeted');
select is((select decision_gate_target from public.global_provider_review_decision_controls), 8, 'eight decision gates are targeted');
select is((select readiness_cell_target from public.global_provider_review_decision_controls), 64, 'sixty-four readiness cells are targeted');
select is((select decision_state_target from public.global_provider_review_decision_controls), 7, 'seven decision states are targeted');
select ok((select independent_decision_required and dual_control_quorum_required
  and immutable_audit_required and explicit_reason_code_required
  and expiry_and_revocation_required and conflict_of_interest_review_required
  from public.global_provider_review_decision_controls), 'independent decisions, dual control, audit, reason codes, expiry and conflict review are required');
select ok(not exists(
  select 1 from public.global_provider_review_decision_controls
  where decision_recording_enabled or reviewer_signature_storage_enabled
    or evidence_linkage_enabled or automated_quorum_evaluation_enabled
    or provider_candidate_selection_enabled or review_packet_open_enabled
    or endpoint_connectivity_enabled or credential_storage_enabled
    or external_payload_intake_enabled or fixture_execution_enabled
    or conformance_approval_enabled or candidate_write_enabled
    or observation_release_enabled or model_training_enabled
    or autonomous_publication_enabled or autonomous_trade_execution_enabled
), 'decisions, signatures, evidence links, candidates, endpoints and downstream effects remain locked');
select is((select source_family_count from public.global_provider_review_decision_status), 8, 'status reports eight source families');
select is((select decision_gate_count from public.global_provider_review_decision_status), 8, 'status reports eight decision gates');
select is((select decision_state_count from public.global_provider_review_decision_status), 7, 'status reports seven decision states');
select is((select readiness_cell_count from public.global_provider_review_decision_status), 64, 'status reports sixty-four readiness cells');
select is((select unmet_readiness_cell_count from public.global_provider_review_decision_status), 64, 'status reports sixty-four unmet readiness cells');
select is((select authorized_readiness_cell_count from public.global_provider_review_decision_status), 0, 'status reports zero authorized readiness cells');

select is((select count(*) from public.global_provider_review_decision_state_templates), 7::bigint, 'seven decision state templates exist');
select ok((select bool_and(not real_decision_present and not automatic_transition_enabled
  and human_decision_required and not endpoint_access_effect
  and not release_effect and not production_effect)
  from public.global_provider_review_decision_state_templates), 'decision states are empty, manual and non-production');

select is((select count(*) from public.global_provider_review_decision_gate_templates), 8::bigint, 'eight decision gate templates exist');
select is((select count(distinct gate_key) from public.global_provider_review_decision_gate_templates), 8::bigint, 'decision gate keys are unique');
select is((select count(distinct review_domain) from public.global_provider_review_decision_gate_templates), 7::bigint, 'seven decision domains are represented');
select ok((select bool_and(gate_status = 'unmet' and not evidence_present
  and not reviewer_assigned and not human_authorized)
  from public.global_provider_review_decision_gate_templates), 'every decision gate is unmet, empty and unauthorized');

select is((select count(*) from public.global_provider_review_decision_readiness_matrix), 64::bigint, 'sixty-four readiness cells exist');
select ok(not exists(
  select review_profile_id from public.global_provider_review_decision_readiness_matrix
  group by review_profile_id having count(*) <> 8
), 'each source family has eight decision gates');
select ok((select bool_and(readiness_status = 'unmet' and not human_authorized)
  from public.global_provider_review_decision_readiness_matrix), 'every readiness cell is unmet and unauthorized');
select ok(not exists(
  select 1 from public.global_provider_review_decision_readiness_matrix
  where evidence_reference is not null or reviewer_identity is not null
    or decision_reason_code is not null or reviewer_signature is not null
    or assessed_at is not null or authorized_at is not null or expires_at is not null
), 'no evidence, reviewer, reason, signature or decision time is stored');
select ok(not exists(
  select 1 from public.global_provider_review_decision_readiness_matrix
  where packet_open_effect or endpoint_access_effect or candidate_write_effect
    or release_effect or production_effect
), 'readiness placeholders have no packet, endpoint, candidate, release or production effect');

select ok(has_table_privilege('anon', 'public.global_provider_review_decision_status', 'SELECT'), 'guests can read sanitized decision status');
select ok(has_table_privilege('anon', 'public.global_provider_review_decision_readiness_catalog', 'SELECT'), 'guests can read unmet readiness');
select ok(not has_table_privilege('anon', 'public.global_provider_review_decision_gate_templates', 'INSERT'), 'browser roles cannot create decision gates');
select ok(not has_table_privilege('authenticated', 'public.global_provider_review_decision_readiness_matrix', 'UPDATE'), 'browser roles cannot authorize readiness');
select ok(coalesce((
  select bool_and(reloptions @> array['security_invoker=true'])
  from pg_class where oid in (
    'public.global_provider_review_decision_status'::regclass,
    'public.global_provider_review_decision_state_catalog'::regclass,
    'public.global_provider_review_decision_gate_catalog'::regclass,
    'public.global_provider_review_decision_readiness_catalog'::regclass
  )
), false), 'decision-control views preserve caller permissions');
select ok(to_regprocedure('public.record_global_provider_review_decision(jsonb)') is null, 'no decision-recording RPC exists');
select ok(to_regprocedure('public.authorize_global_provider_candidate(text)') is null, 'no provider-authorization RPC exists');
select ok(not exists(
  select 1 from public.global_provider_review_governance_controls
  where role_assignment_enabled or evidence_receipt_enabled
    or provider_candidate_selection_enabled or review_packet_open_enabled
    or endpoint_connectivity_enabled or credential_storage_enabled
    or external_payload_intake_enabled or fixture_execution_enabled
    or conformance_approval_enabled or candidate_write_enabled
    or observation_release_enabled or model_training_enabled
    or autonomous_publication_enabled or autonomous_trade_execution_enabled
), 'Phase 8P governance locks remain closed');

select set_config('request.jwt.claim.role', 'service_role', true);
select throws_ok(
  $$update public.global_provider_review_decision_gate_templates set gate_status = 'met' where id = 1$$,
  'P0001', 'Global provider review decision-control reference records are append-only',
  'decision gate templates are append-only'
);
select throws_ok(
  $$delete from public.global_provider_review_decision_readiness_matrix where id = 1$$,
  'P0001', 'Global provider review decision-control reference records are append-only',
  'decision readiness matrix is append-only'
);

select * from finish();
rollback;
