do $$
begin
  if to_regclass('public.global_provider_decision_recovery_controls') is null
    or to_regclass('public.global_provider_decision_recovery_state_templates') is null
    or to_regclass('public.global_provider_decision_recovery_trigger_templates') is null
    or to_regclass('public.global_provider_decision_recovery_matrix') is null
    or to_regclass('public.global_provider_decision_recovery_status') is null
    or to_regclass('public.global_provider_decision_recovery_catalog') is null then
    raise exception 'Phase 8R provider decision recovery-control schema is incomplete';
  end if;
  if (select count(*) from public.global_provider_decision_recovery_state_templates) <> 7
    or (select count(*) from public.global_provider_decision_recovery_trigger_templates) <> 8
    or (select count(*) from public.global_provider_decision_recovery_matrix) <> 64 then
    raise exception 'Phase 8R deterministic provider decision recovery-control counts changed';
  end if;
  if exists (
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
  ) or exists (
    select 1 from public.global_provider_decision_recovery_state_templates
    where real_recovery_event_present or automatic_transition_enabled
      or not human_recovery_review_required or freeze_effect or rollback_effect
      or revocation_effect or production_effect
  ) or exists (
    select 1 from public.global_provider_decision_recovery_trigger_templates
    where trigger_status <> 'unobserved' or real_event_present
      or investigator_assigned or human_authorized
  ) or exists (
    select 1 from public.global_provider_decision_recovery_matrix
    where recovery_status <> 'blocked' or exception_reference is not null
      or challenge_reference is not null or recovery_evidence_reference is not null
      or investigator_identity is not null or recovery_reason_code is not null
      or recovery_signature is not null or detected_at is not null
      or frozen_at is not null or revoked_at is not null or resolved_at is not null
      or human_authorized or automated_freeze_effect or rollback_effect
      or revocation_effect or endpoint_access_effect or candidate_write_effect
      or release_effect or production_effect
  ) then
    raise exception 'Phase 8R provider decision recovery boundary is not empty and fail-closed';
  end if;
end;
$$;
