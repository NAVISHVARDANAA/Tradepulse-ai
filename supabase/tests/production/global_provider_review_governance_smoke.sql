do $$
begin
  if to_regclass('public.global_provider_review_governance_controls') is null
    or to_regclass('public.global_provider_review_role_templates') is null
    or to_regclass('public.global_provider_evidence_lifecycle_templates') is null
    or to_regclass('public.global_provider_review_responsibility_matrix') is null
    or to_regclass('public.global_provider_review_governance_status') is null
    or to_regclass('public.global_provider_review_role_catalog') is null
    or to_regclass('public.global_provider_evidence_lifecycle_catalog') is null
    or to_regclass('public.global_provider_review_responsibility_catalog') is null then
    raise exception 'Phase 8P provider review-governance schema is incomplete';
  end if;

  if (select count(*) from public.global_provider_review_role_templates) <> 8
    or (select count(*) from public.global_provider_evidence_lifecycle_templates) <> 7
    or (select count(*) from public.global_provider_review_responsibility_matrix) <> 64 then
    raise exception 'Phase 8P deterministic provider review-governance counts changed';
  end if;

  if exists (
    select 1 from public.global_provider_review_governance_controls
    where source_family_target <> 8 or role_template_target <> 8
      or responsibility_target <> 64 or lifecycle_stage_target <> 7
      or not independent_review_required or not separation_of_duties_required
      or not least_privilege_custody_required or not dual_control_activation_required
      or not expiry_and_revocation_required or role_assignment_enabled
      or reviewer_identity_storage_enabled or evidence_receipt_enabled
      or evidence_document_storage_enabled or custody_location_provisioning_enabled
      or provider_candidate_selection_enabled or review_packet_open_enabled
      or evidence_submission_enabled or endpoint_connectivity_enabled
      or credential_storage_enabled or external_payload_intake_enabled
      or fixture_execution_enabled or conformance_approval_enabled
      or candidate_write_enabled or observation_release_enabled
      or model_training_enabled or autonomous_publication_enabled
      or autonomous_trade_execution_enabled
  ) or exists (
    select 1 from public.global_provider_review_role_templates
    where assignment_status <> 'unassigned' or assigned_identity is not null
      or not blocks_packet_opening or not blocks_endpoint_access or not blocks_release
      or human_authorized
  ) or exists (
    select 1 from public.global_provider_evidence_lifecycle_templates
    where real_evidence_present or storage_location is not null
      or automatic_transition_enabled or not human_action_required or production_effect
  ) or exists (
    select 1 from public.global_provider_review_responsibility_matrix
    where responsibility_status <> 'unassigned' or reviewer_identity is not null
      or custody_location is not null or assigned_at is not null
      or authorized_at is not null or expires_at is not null
      or human_authorized or packet_open_effect or endpoint_access_effect
      or candidate_write_effect or release_effect or production_effect
  ) then
    raise exception 'Phase 8P provider review-governance boundary is not empty and fail-closed';
  end if;

  if to_regprocedure('public.assign_global_provider_reviewer(text,text)') is not null
    or to_regprocedure('public.receive_global_provider_evidence(jsonb)') is not null then
    raise exception 'A reviewer-assignment or evidence-receipt surface exists';
  end if;

  if exists (
    select 1 from public.global_provider_candidate_review_controls
    where provider_candidate_selection_enabled or review_packet_open_enabled
      or evidence_submission_enabled or evidence_document_storage_enabled
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
