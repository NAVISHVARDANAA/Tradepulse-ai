do $$
begin
  if to_regclass('public.global_provider_review_decision_controls') is null
    or to_regclass('public.global_provider_review_decision_state_templates') is null
    or to_regclass('public.global_provider_review_decision_gate_templates') is null
    or to_regclass('public.global_provider_review_decision_readiness_matrix') is null
    or to_regclass('public.global_provider_review_decision_status') is null
    or to_regclass('public.global_provider_review_decision_state_catalog') is null
    or to_regclass('public.global_provider_review_decision_gate_catalog') is null
    or to_regclass('public.global_provider_review_decision_readiness_catalog') is null then
    raise exception 'Phase 8Q provider review decision-control schema is incomplete';
  end if;

  if (select count(*) from public.global_provider_review_decision_state_templates) <> 7
    or (select count(*) from public.global_provider_review_decision_gate_templates) <> 8
    or (select count(*) from public.global_provider_review_decision_readiness_matrix) <> 64 then
    raise exception 'Phase 8Q deterministic provider review decision-control counts changed';
  end if;

  if exists (
    select 1 from public.global_provider_review_decision_controls
    where source_family_target <> 8 or decision_gate_target <> 8
      or readiness_cell_target <> 64 or decision_state_target <> 7
      or not independent_decision_required or not dual_control_quorum_required
      or not immutable_audit_required or not explicit_reason_code_required
      or not expiry_and_revocation_required or not conflict_of_interest_review_required
      or decision_recording_enabled or reviewer_signature_storage_enabled
      or evidence_linkage_enabled or automated_quorum_evaluation_enabled
      or provider_candidate_selection_enabled or review_packet_open_enabled
      or endpoint_connectivity_enabled or credential_storage_enabled
      or external_payload_intake_enabled or fixture_execution_enabled
      or conformance_approval_enabled or candidate_write_enabled
      or observation_release_enabled or model_training_enabled
      or autonomous_publication_enabled or autonomous_trade_execution_enabled
  ) or exists (
    select 1 from public.global_provider_review_decision_state_templates
    where real_decision_present or automatic_transition_enabled or not human_decision_required
      or endpoint_access_effect or release_effect or production_effect
  ) or exists (
    select 1 from public.global_provider_review_decision_gate_templates
    where gate_status <> 'unmet' or evidence_present or reviewer_assigned or human_authorized
  ) or exists (
    select 1 from public.global_provider_review_decision_readiness_matrix
    where readiness_status <> 'unmet' or evidence_reference is not null
      or reviewer_identity is not null or decision_reason_code is not null
      or reviewer_signature is not null or assessed_at is not null
      or authorized_at is not null or expires_at is not null
      or human_authorized or packet_open_effect or endpoint_access_effect
      or candidate_write_effect or release_effect or production_effect
  ) then
    raise exception 'Phase 8Q provider review decision boundary is not empty and fail-closed';
  end if;

  if to_regprocedure('public.record_global_provider_review_decision(jsonb)') is not null
    or to_regprocedure('public.authorize_global_provider_candidate(text)') is not null then
    raise exception 'A provider decision or authorization surface exists';
  end if;

  if exists (
    select 1 from public.global_provider_review_governance_controls
    where role_assignment_enabled or evidence_receipt_enabled
      or provider_candidate_selection_enabled or review_packet_open_enabled
      or endpoint_connectivity_enabled or credential_storage_enabled
      or external_payload_intake_enabled or fixture_execution_enabled
      or conformance_approval_enabled or candidate_write_enabled
      or observation_release_enabled or model_training_enabled
      or autonomous_publication_enabled or autonomous_trade_execution_enabled
  ) or exists (
    select 1 from public.controlled_live_rollout_controls
    where live_order_routing_enabled or customer_funding_enabled
      or custody_enabled or settlement_enabled or automatic_activation_enabled
  ) then
    raise exception 'An earlier provider or execution lock changed';
  end if;
end;
$$;
