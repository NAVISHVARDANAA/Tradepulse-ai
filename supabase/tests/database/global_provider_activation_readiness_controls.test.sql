begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(42);

select has_table('public', 'global_provider_activation_controls', 'provider activation controls exist');
select has_table('public', 'global_provider_activation_state_templates', 'provider activation states exist');
select has_table('public', 'global_provider_activation_gate_templates', 'provider activation gates exist');
select has_table('public', 'global_provider_activation_readiness_matrix', 'provider activation readiness matrix exists');
select has_view('public', 'global_provider_activation_status', 'sanitized provider activation status exists');
select has_view('public', 'global_provider_activation_state_catalog', 'sanitized provider activation states exist');
select has_view('public', 'global_provider_activation_gate_catalog', 'sanitized provider activation gates exist');
select has_view('public', 'global_provider_activation_readiness_catalog', 'sanitized provider activation readiness exists');

select is((select count(*) from public.global_provider_activation_controls), 1::bigint, 'one activation-readiness policy is active');
select is((select source_family_target from public.global_provider_activation_controls), 8, 'eight source families are targeted');
select is((select activation_gate_target from public.global_provider_activation_controls), 8, 'eight activation gates are targeted');
select is((select readiness_cell_target from public.global_provider_activation_controls), 64, 'sixty-four readiness cells are targeted');
select is((select activation_state_target from public.global_provider_activation_controls), 7, 'seven activation states are targeted');
select ok((select independent_activation_authorization_required and dual_control_activation_required
  and bounded_maintenance_window_required and pre_activation_snapshot_required
  and tested_abort_and_restoration_required and post_activation_verification_required
  and immutable_change_audit_required and expiry_and_revocation_enforced
  from public.global_provider_activation_controls), 'authorization, dual control, bounded window, snapshot, abort, verification, audit and expiry are required');
select ok(not exists(
  select 1 from public.global_provider_activation_controls
  where activation_request_recording_enabled or activation_authorization_recording_enabled
    or maintenance_window_scheduling_enabled or provider_candidate_selection_enabled
    or endpoint_connectivity_enabled or credential_storage_enabled
    or external_payload_intake_enabled or fixture_execution_enabled
    or conformance_approval_enabled or provider_activation_enabled
    or candidate_write_enabled or observation_release_enabled
    or model_training_enabled or autonomous_publication_enabled
    or autonomous_trade_execution_enabled
), 'activation, provider, endpoint and downstream effects remain locked');
select is((select source_family_count from public.global_provider_activation_status), 8, 'status reports eight source families');
select is((select activation_gate_count from public.global_provider_activation_status), 8, 'status reports eight activation gates');
select is((select activation_state_count from public.global_provider_activation_status), 7, 'status reports seven activation states');
select is((select readiness_cell_count from public.global_provider_activation_status), 64, 'status reports sixty-four readiness cells');
select is((select blocked_readiness_cell_count from public.global_provider_activation_status), 64, 'status reports sixty-four blocked readiness cells');
select is((select authorized_readiness_cell_count from public.global_provider_activation_status), 0, 'status reports zero authorized readiness cells');

select is((select count(*) from public.global_provider_activation_state_templates), 7::bigint, 'seven activation state templates exist');
select ok((select bool_and(not real_activation_present and not automatic_transition_enabled
  and human_activation_authorization_required and not endpoint_access_effect
  and not credential_access_effect and not activation_effect and not production_effect)
  from public.global_provider_activation_state_templates), 'activation states are empty, manual and non-production');

select is((select count(*) from public.global_provider_activation_gate_templates), 8::bigint, 'eight activation gate templates exist');
select is((select count(distinct gate_key) from public.global_provider_activation_gate_templates), 8::bigint, 'activation gate keys are unique');
select is((select count(distinct activation_domain) from public.global_provider_activation_gate_templates), 7::bigint, 'seven activation domains are represented');
select ok((select bool_and(gate_status = 'unmet' and not real_evidence_present
  and not reviewer_assigned and not human_authorized)
  from public.global_provider_activation_gate_templates), 'every activation gate is unmet, empty and unauthorized');

select is((select count(*) from public.global_provider_activation_readiness_matrix), 64::bigint, 'sixty-four activation readiness cells exist');
select ok(not exists(
  select review_profile_id from public.global_provider_activation_readiness_matrix
  group by review_profile_id having count(*) <> 8
), 'each source family has eight activation gates');
select ok((select bool_and(readiness_status = 'blocked' and not human_authorized)
  from public.global_provider_activation_readiness_matrix), 'every activation readiness cell is blocked and unauthorized');
select ok(not exists(
  select 1 from public.global_provider_activation_readiness_matrix
  where change_packet_reference is not null or decision_reference is not null
    or recovery_plan_reference is not null or authorizer_identity is not null
    or activation_reason_code is not null or activation_signature is not null
    or maintenance_window_start is not null or maintenance_window_end is not null
    or activated_at is not null or verified_at is not null
), 'no change packet, decision, recovery plan, authorizer, reason, signature or activation time is stored');
select ok(not exists(
  select 1 from public.global_provider_activation_readiness_matrix
  where endpoint_access_effect or credential_access_effect or activation_effect
    or candidate_write_effect or release_effect or production_effect
), 'activation placeholders have no endpoint, credential, activation, candidate, release or production effect');

select ok(has_table_privilege('anon', 'public.global_provider_activation_status', 'SELECT'), 'guests can read sanitized activation status');
select ok(has_table_privilege('anon', 'public.global_provider_activation_readiness_catalog', 'SELECT'), 'guests can read blocked activation readiness');
select ok(not has_table_privilege('anon', 'public.global_provider_activation_gate_templates', 'INSERT'), 'browser roles cannot create activation gates');
select ok(not has_table_privilege('authenticated', 'public.global_provider_activation_readiness_matrix', 'UPDATE'), 'browser roles cannot authorize activation');
select ok(coalesce((
  select bool_and(reloptions @> array['security_invoker=true'])
  from pg_class where oid in (
    'public.global_provider_activation_status'::regclass,
    'public.global_provider_activation_state_catalog'::regclass,
    'public.global_provider_activation_gate_catalog'::regclass,
    'public.global_provider_activation_readiness_catalog'::regclass
  )
), false), 'activation-readiness views preserve caller permissions');
select ok(to_regprocedure('public.record_global_provider_activation_request(jsonb)') is null, 'no activation-request RPC exists');
select ok(to_regprocedure('public.execute_global_provider_activation(text)') is null, 'no activation-execution RPC exists');
select ok(not exists(
  select 1 from public.global_provider_decision_recovery_controls
  where exception_recording_enabled or decision_challenge_recording_enabled
    or automated_freeze_enabled or rollback_execution_enabled or decision_revocation_enabled
    or endpoint_connectivity_enabled or candidate_write_enabled
    or observation_release_enabled or model_training_enabled
    or autonomous_publication_enabled or autonomous_trade_execution_enabled
), 'Phase 8R recovery locks remain closed');

select set_config('request.jwt.claim.role', 'service_role', true);
select throws_ok(
  $$update public.global_provider_activation_gate_templates set gate_status = 'met' where id = 1$$,
  'P0001', 'Global provider activation-readiness reference records are append-only',
  'activation gate templates are append-only'
);
select throws_ok(
  $$delete from public.global_provider_activation_readiness_matrix where id = 1$$,
  'P0001', 'Global provider activation-readiness reference records are append-only',
  'activation readiness matrix is append-only'
);

select * from finish();
rollback;
