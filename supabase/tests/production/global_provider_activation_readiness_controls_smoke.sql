do $$
begin
  if to_regclass('public.global_provider_activation_controls') is null
    or to_regclass('public.global_provider_activation_state_templates') is null
    or to_regclass('public.global_provider_activation_gate_templates') is null
    or to_regclass('public.global_provider_activation_readiness_matrix') is null
    or to_regclass('public.global_provider_activation_status') is null
    or to_regclass('public.global_provider_activation_readiness_catalog') is null then
    raise exception 'Phase 8S provider activation-readiness schema is incomplete';
  end if;
  if (select count(*) from public.global_provider_activation_state_templates) <> 7
    or (select count(*) from public.global_provider_activation_gate_templates) <> 8
    or (select count(*) from public.global_provider_activation_readiness_matrix) <> 64 then
    raise exception 'Phase 8S deterministic provider activation-readiness counts changed';
  end if;
  if exists (
    select 1 from public.global_provider_activation_controls
    where activation_request_recording_enabled or activation_authorization_recording_enabled
      or maintenance_window_scheduling_enabled or provider_candidate_selection_enabled
      or endpoint_connectivity_enabled or credential_storage_enabled
      or external_payload_intake_enabled or fixture_execution_enabled
      or conformance_approval_enabled or provider_activation_enabled
      or candidate_write_enabled or observation_release_enabled
      or model_training_enabled or autonomous_publication_enabled
      or autonomous_trade_execution_enabled
  ) or exists (
    select 1 from public.global_provider_activation_state_templates
    where real_activation_present or automatic_transition_enabled
      or not human_activation_authorization_required or endpoint_access_effect
      or credential_access_effect or activation_effect or production_effect
  ) or exists (
    select 1 from public.global_provider_activation_gate_templates
    where gate_status <> 'unmet' or real_evidence_present
      or reviewer_assigned or human_authorized
  ) or exists (
    select 1 from public.global_provider_activation_readiness_matrix
    where readiness_status <> 'blocked' or change_packet_reference is not null
      or decision_reference is not null or recovery_plan_reference is not null
      or authorizer_identity is not null or activation_reason_code is not null
      or activation_signature is not null or maintenance_window_start is not null
      or maintenance_window_end is not null or activated_at is not null
      or verified_at is not null or human_authorized or endpoint_access_effect
      or credential_access_effect or activation_effect or candidate_write_effect
      or release_effect or production_effect
  ) then
    raise exception 'Phase 8S provider activation boundary is not empty and fail-closed';
  end if;
end;
$$;
