begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(42);

select has_table('public', 'global_provider_activation_rehearsal_controls', 'provider activation rehearsal controls exist');
select has_table('public', 'global_provider_activation_rehearsal_state_templates', 'provider activation rehearsal states exist');
select has_table('public', 'global_provider_activation_rehearsal_gate_templates', 'provider activation rehearsal gates exist');
select has_table('public', 'global_provider_activation_rehearsal_matrix', 'provider activation rehearsal matrix exists');
select has_view('public', 'global_provider_activation_rehearsal_status', 'sanitized activation rehearsal status exists');
select has_view('public', 'global_provider_activation_rehearsal_state_catalog', 'sanitized activation rehearsal states exist');
select has_view('public', 'global_provider_activation_rehearsal_gate_catalog', 'sanitized activation rehearsal gates exist');
select has_view('public', 'global_provider_activation_rehearsal_catalog', 'sanitized activation rehearsal matrix exists');

select is((select count(*) from public.global_provider_activation_rehearsal_controls), 1::bigint, 'one activation-rehearsal policy is active');
select is((select source_family_target from public.global_provider_activation_rehearsal_controls), 8, 'eight source families are targeted');
select is((select rehearsal_gate_target from public.global_provider_activation_rehearsal_controls), 8, 'eight rehearsal gates are targeted');
select is((select rehearsal_cell_target from public.global_provider_activation_rehearsal_controls), 64, 'sixty-four rehearsal cells are targeted');
select is((select rehearsal_state_target from public.global_provider_activation_rehearsal_controls), 7, 'seven rehearsal states are targeted');
select ok((select isolated_nonproduction_environment_required and synthetic_only_inputs_required
  and outbound_egress_allowlist_required and ephemeral_secret_custody_required
  and pre_rehearsal_snapshot_required and tested_abort_and_restoration_required
  and post_rehearsal_verification_required and independent_closeout_required
  and immutable_rehearsal_audit_required and expiry_and_revocation_enforced
  from public.global_provider_activation_rehearsal_controls), 'isolation, synthetic inputs, egress, secrets, snapshot, recovery, verification, closeout, audit and expiry are required');
select ok(not exists(
  select 1 from public.global_provider_activation_rehearsal_controls
  where rehearsal_request_recording_enabled or rehearsal_window_scheduling_enabled
    or isolated_egress_test_enabled or synthetic_credential_binding_enabled
    or synthetic_payload_execution_enabled or abort_drill_execution_enabled
    or restoration_drill_execution_enabled or reconciliation_execution_enabled
    or provider_candidate_selection_enabled or endpoint_connectivity_enabled
    or credential_storage_enabled or external_payload_intake_enabled
    or fixture_execution_enabled or conformance_approval_enabled
    or provider_activation_enabled or candidate_write_enabled
    or observation_release_enabled or model_training_enabled
    or autonomous_publication_enabled or autonomous_trade_execution_enabled
), 'rehearsal, provider, endpoint and downstream effects remain locked');
select is((select source_family_count from public.global_provider_activation_rehearsal_status), 8, 'status reports eight source families');
select is((select rehearsal_gate_count from public.global_provider_activation_rehearsal_status), 8, 'status reports eight rehearsal gates');
select is((select rehearsal_state_count from public.global_provider_activation_rehearsal_status), 7, 'status reports seven rehearsal states');
select is((select rehearsal_cell_count from public.global_provider_activation_rehearsal_status), 64, 'status reports sixty-four rehearsal cells');
select is((select blocked_rehearsal_cell_count from public.global_provider_activation_rehearsal_status), 64, 'status reports sixty-four blocked rehearsal cells');
select is((select authorized_rehearsal_cell_count from public.global_provider_activation_rehearsal_status), 0, 'status reports zero authorized rehearsal cells');

select is((select count(*) from public.global_provider_activation_rehearsal_state_templates), 7::bigint, 'seven rehearsal state templates exist');
select ok((select bool_and(not real_rehearsal_present and not automatic_transition_enabled
  and human_rehearsal_authorization_required and not egress_access_effect
  and not credential_access_effect and not activation_effect and not production_effect)
  from public.global_provider_activation_rehearsal_state_templates), 'rehearsal states are empty, manual and non-production');

select is((select count(*) from public.global_provider_activation_rehearsal_gate_templates), 8::bigint, 'eight rehearsal gate templates exist');
select is((select count(distinct gate_key) from public.global_provider_activation_rehearsal_gate_templates), 8::bigint, 'rehearsal gate keys are unique');
select is((select count(distinct rehearsal_domain) from public.global_provider_activation_rehearsal_gate_templates), 7::bigint, 'seven rehearsal domains are represented');
select ok((select bool_and(gate_status = 'unmet' and not real_evidence_present
  and not reviewer_assigned and not human_authorized)
  from public.global_provider_activation_rehearsal_gate_templates), 'every rehearsal gate is unmet, empty and unauthorized');

select is((select count(*) from public.global_provider_activation_rehearsal_matrix), 64::bigint, 'sixty-four activation rehearsal cells exist');
select ok(not exists(
  select review_profile_id from public.global_provider_activation_rehearsal_matrix
  group by review_profile_id having count(*) <> 8
), 'each source family has eight rehearsal gates');
select ok((select bool_and(rehearsal_status = 'blocked' and not human_authorized)
  from public.global_provider_activation_rehearsal_matrix), 'every activation rehearsal cell is blocked and unauthorized');
select ok(not exists(
  select 1 from public.global_provider_activation_rehearsal_matrix
  where rehearsal_plan_reference is not null or activation_readiness_reference is not null
    or environment_reference is not null or synthetic_secret_reference is not null
    or snapshot_reference is not null or abort_report_reference is not null
    or restoration_report_reference is not null or verification_report_reference is not null
    or closeout_authorizer_identity is not null or rehearsal_window_start is not null
    or rehearsal_window_end is not null or rehearsed_at is not null or closed_at is not null
), 'no plan, environment, secret, snapshot, drill, verification, closeout or rehearsal time is stored');
select ok(not exists(
  select 1 from public.global_provider_activation_rehearsal_matrix
  where egress_access_effect or credential_access_effect or fixture_execution_effect
    or abort_execution_effect or restoration_execution_effect or activation_effect
    or candidate_write_effect or release_effect or production_effect
), 'rehearsal placeholders have no egress, credential, fixture, recovery, activation, write, release or production effect');

select ok(has_table_privilege('anon', 'public.global_provider_activation_rehearsal_status', 'SELECT'), 'guests can read sanitized rehearsal status');
select ok(has_table_privilege('anon', 'public.global_provider_activation_rehearsal_catalog', 'SELECT'), 'guests can read blocked activation rehearsal matrix');
select ok(not has_table_privilege('anon', 'public.global_provider_activation_rehearsal_gate_templates', 'INSERT'), 'browser roles cannot create rehearsal gates');
select ok(not has_table_privilege('authenticated', 'public.global_provider_activation_rehearsal_matrix', 'UPDATE'), 'browser roles cannot authorize rehearsal');
select ok(coalesce((
  select bool_and(reloptions @> array['security_invoker=true'])
  from pg_class where oid in (
    'public.global_provider_activation_rehearsal_status'::regclass,
    'public.global_provider_activation_rehearsal_state_catalog'::regclass,
    'public.global_provider_activation_rehearsal_gate_catalog'::regclass,
    'public.global_provider_activation_rehearsal_catalog'::regclass
  )
), false), 'activation-rehearsal views preserve caller permissions');
select ok(to_regprocedure('public.record_global_provider_activation_rehearsal(jsonb)') is null, 'no rehearsal-recording RPC exists');
select ok(to_regprocedure('public.execute_global_provider_activation_rehearsal(text)') is null, 'no rehearsal-execution RPC exists');
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
), 'Phase 8S activation locks remain closed');

select set_config('request.jwt.claim.role', 'service_role', true);
select throws_ok(
  $$update public.global_provider_activation_rehearsal_gate_templates set gate_status = 'met' where id = 1$$,
  'P0001', 'Global provider activation-rehearsal reference records are append-only',
  'activation rehearsal gate templates are append-only'
);
select throws_ok(
  $$delete from public.global_provider_activation_rehearsal_matrix where id = 1$$,
  'P0001', 'Global provider activation-rehearsal reference records are append-only',
  'activation rehearsal matrix is append-only'
);

select * from finish();
rollback;
