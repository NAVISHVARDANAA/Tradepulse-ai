do $$
begin
  if to_regclass('public.global_provider_activation_rehearsal_controls') is null
    or to_regclass('public.global_provider_activation_rehearsal_state_templates') is null
    or to_regclass('public.global_provider_activation_rehearsal_gate_templates') is null
    or to_regclass('public.global_provider_activation_rehearsal_matrix') is null
    or to_regclass('public.global_provider_activation_rehearsal_status') is null
    or to_regclass('public.global_provider_activation_rehearsal_catalog') is null then
    raise exception 'Phase 8T provider activation-rehearsal schema is incomplete';
  end if;
  if (select count(*) from public.global_provider_activation_rehearsal_state_templates) <> 7
    or (select count(*) from public.global_provider_activation_rehearsal_gate_templates) <> 8
    or (select count(*) from public.global_provider_activation_rehearsal_matrix) <> 64 then
    raise exception 'Phase 8T deterministic provider activation-rehearsal counts changed';
  end if;
  if exists (
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
  ) or exists (
    select 1 from public.global_provider_activation_rehearsal_state_templates
    where real_rehearsal_present or automatic_transition_enabled
      or not human_rehearsal_authorization_required or egress_access_effect
      or credential_access_effect or activation_effect or production_effect
  ) or exists (
    select 1 from public.global_provider_activation_rehearsal_gate_templates
    where gate_status <> 'unmet' or real_evidence_present
      or reviewer_assigned or human_authorized
  ) or exists (
    select 1 from public.global_provider_activation_rehearsal_matrix
    where rehearsal_status <> 'blocked' or rehearsal_plan_reference is not null
      or activation_readiness_reference is not null or environment_reference is not null
      or synthetic_secret_reference is not null or snapshot_reference is not null
      or abort_report_reference is not null or restoration_report_reference is not null
      or verification_report_reference is not null or closeout_authorizer_identity is not null
      or rehearsal_window_start is not null or rehearsal_window_end is not null
      or rehearsed_at is not null or closed_at is not null or human_authorized
      or egress_access_effect or credential_access_effect or fixture_execution_effect
      or abort_execution_effect or restoration_execution_effect or activation_effect
      or candidate_write_effect or release_effect or production_effect
  ) then
    raise exception 'Phase 8T provider activation rehearsal boundary is not empty and fail-closed';
  end if;
end;
$$;
