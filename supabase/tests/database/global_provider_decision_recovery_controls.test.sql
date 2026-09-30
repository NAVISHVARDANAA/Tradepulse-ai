begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(42);

select has_table('public', 'global_provider_decision_recovery_controls', 'provider decision recovery controls exist');
select has_table('public', 'global_provider_decision_recovery_state_templates', 'provider decision recovery states exist');
select has_table('public', 'global_provider_decision_recovery_trigger_templates', 'provider decision recovery triggers exist');
select has_table('public', 'global_provider_decision_recovery_matrix', 'provider decision recovery matrix exists');
select has_view('public', 'global_provider_decision_recovery_status', 'sanitized provider decision recovery status exists');
select has_view('public', 'global_provider_decision_recovery_state_catalog', 'sanitized provider decision recovery states exist');
select has_view('public', 'global_provider_decision_recovery_trigger_catalog', 'sanitized provider decision recovery triggers exist');
select has_view('public', 'global_provider_decision_recovery_catalog', 'sanitized provider decision recovery matrix exists');

select is((select count(*) from public.global_provider_decision_recovery_controls), 1::bigint, 'one recovery-control policy is active');
select is((select source_family_target from public.global_provider_decision_recovery_controls), 8, 'eight source families are targeted');
select is((select recovery_trigger_target from public.global_provider_decision_recovery_controls), 8, 'eight recovery triggers are targeted');
select is((select recovery_cell_target from public.global_provider_decision_recovery_controls), 64, 'sixty-four recovery cells are targeted');
select is((select recovery_state_target from public.global_provider_decision_recovery_controls), 7, 'seven recovery states are targeted');
select ok((select immediate_fail_closed_freeze_required and independent_recovery_review_required
  and rollback_rehearsal_required and immutable_recovery_audit_required
  and explicit_recovery_reason_required and expiry_and_revocation_enforced
  from public.global_provider_decision_recovery_controls), 'freeze, independent review, rehearsal, audit, reasons, expiry and revocation are required');
select ok(not exists(
  select 1 from public.global_provider_decision_recovery_controls
  where exception_recording_enabled or decision_challenge_recording_enabled
    or investigator_identity_storage_enabled or recovery_evidence_linkage_enabled
    or automated_freeze_enabled or rollback_execution_enabled or decision_revocation_enabled
    or provider_candidate_selection_enabled or review_packet_open_enabled
    or endpoint_connectivity_enabled or credential_storage_enabled
    or external_payload_intake_enabled or fixture_execution_enabled
    or conformance_approval_enabled or candidate_write_enabled
    or observation_release_enabled or model_training_enabled
    or autonomous_publication_enabled or autonomous_trade_execution_enabled
), 'exception, recovery, provider, endpoint and downstream effects remain locked');
select is((select source_family_count from public.global_provider_decision_recovery_status), 8, 'status reports eight source families');
select is((select recovery_trigger_count from public.global_provider_decision_recovery_status), 8, 'status reports eight recovery triggers');
select is((select recovery_state_count from public.global_provider_decision_recovery_status), 7, 'status reports seven recovery states');
select is((select recovery_cell_count from public.global_provider_decision_recovery_status), 64, 'status reports sixty-four recovery cells');
select is((select blocked_recovery_cell_count from public.global_provider_decision_recovery_status), 64, 'status reports sixty-four blocked recovery cells');
select is((select authorized_recovery_cell_count from public.global_provider_decision_recovery_status), 0, 'status reports zero authorized recovery cells');

select is((select count(*) from public.global_provider_decision_recovery_state_templates), 7::bigint, 'seven recovery state templates exist');
select ok((select bool_and(not real_recovery_event_present and not automatic_transition_enabled
  and human_recovery_review_required and not freeze_effect and not rollback_effect
  and not revocation_effect and not production_effect)
  from public.global_provider_decision_recovery_state_templates), 'recovery states are empty, manual and non-production');

select is((select count(*) from public.global_provider_decision_recovery_trigger_templates), 8::bigint, 'eight recovery trigger templates exist');
select is((select count(distinct trigger_key) from public.global_provider_decision_recovery_trigger_templates), 8::bigint, 'recovery trigger keys are unique');
select is((select count(distinct recovery_domain) from public.global_provider_decision_recovery_trigger_templates), 7::bigint, 'seven recovery domains are represented');
select ok((select bool_and(trigger_status = 'unobserved' and not real_event_present
  and not investigator_assigned and not human_authorized)
  from public.global_provider_decision_recovery_trigger_templates), 'every recovery trigger is unobserved, empty and unauthorized');

select is((select count(*) from public.global_provider_decision_recovery_matrix), 64::bigint, 'sixty-four recovery cells exist');
select ok(not exists(
  select review_profile_id from public.global_provider_decision_recovery_matrix
  group by review_profile_id having count(*) <> 8
), 'each source family has eight recovery triggers');
select ok((select bool_and(recovery_status = 'blocked' and not human_authorized)
  from public.global_provider_decision_recovery_matrix), 'every recovery cell is blocked and unauthorized');
select ok(not exists(
  select 1 from public.global_provider_decision_recovery_matrix
  where exception_reference is not null or challenge_reference is not null
    or recovery_evidence_reference is not null or investigator_identity is not null
    or recovery_reason_code is not null or recovery_signature is not null
    or detected_at is not null or frozen_at is not null
    or revoked_at is not null or resolved_at is not null
), 'no exception, challenge, evidence, investigator, reason, signature or recovery time is stored');
select ok(not exists(
  select 1 from public.global_provider_decision_recovery_matrix
  where automated_freeze_effect or rollback_effect or revocation_effect
    or endpoint_access_effect or candidate_write_effect or release_effect or production_effect
), 'recovery placeholders have no freeze, rollback, revocation, endpoint, candidate, release or production effect');

select ok(has_table_privilege('anon', 'public.global_provider_decision_recovery_status', 'SELECT'), 'guests can read sanitized recovery status');
select ok(has_table_privilege('anon', 'public.global_provider_decision_recovery_catalog', 'SELECT'), 'guests can read blocked recovery cells');
select ok(not has_table_privilege('anon', 'public.global_provider_decision_recovery_trigger_templates', 'INSERT'), 'browser roles cannot create recovery triggers');
select ok(not has_table_privilege('authenticated', 'public.global_provider_decision_recovery_matrix', 'UPDATE'), 'browser roles cannot authorize recovery');
select ok(coalesce((
  select bool_and(reloptions @> array['security_invoker=true'])
  from pg_class where oid in (
    'public.global_provider_decision_recovery_status'::regclass,
    'public.global_provider_decision_recovery_state_catalog'::regclass,
    'public.global_provider_decision_recovery_trigger_catalog'::regclass,
    'public.global_provider_decision_recovery_catalog'::regclass
  )
), false), 'recovery-control views preserve caller permissions');
select ok(to_regprocedure('public.record_global_provider_decision_exception(jsonb)') is null, 'no exception-recording RPC exists');
select ok(to_regprocedure('public.execute_global_provider_decision_rollback(text)') is null, 'no rollback-execution RPC exists');
select ok(not exists(
  select 1 from public.global_provider_review_decision_controls
  where decision_recording_enabled or automated_quorum_evaluation_enabled
    or provider_candidate_selection_enabled or review_packet_open_enabled
    or endpoint_connectivity_enabled or credential_storage_enabled
    or external_payload_intake_enabled or fixture_execution_enabled
    or conformance_approval_enabled or candidate_write_enabled
    or observation_release_enabled or model_training_enabled
    or autonomous_publication_enabled or autonomous_trade_execution_enabled
), 'Phase 8Q decision locks remain closed');

select set_config('request.jwt.claim.role', 'service_role', true);
select throws_ok(
  $$update public.global_provider_decision_recovery_trigger_templates set trigger_status = 'observed' where id = 1$$,
  'P0001', 'Global provider decision recovery-control reference records are append-only',
  'recovery trigger templates are append-only'
);
select throws_ok(
  $$delete from public.global_provider_decision_recovery_matrix where id = 1$$,
  'P0001', 'Global provider decision recovery-control reference records are append-only',
  'recovery matrix is append-only'
);

select * from finish();
rollback;
