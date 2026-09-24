do $$
begin
  if to_regclass('public.global_provider_candidate_review_controls') is null
    or to_regclass('public.global_provider_candidate_review_profiles') is null
    or to_regclass('public.global_provider_candidate_evidence_requirements') is null
    or to_regclass('public.global_provider_candidate_review_matrix') is null
    or to_regclass('public.global_provider_candidate_review_status') is null
    or to_regclass('public.global_provider_candidate_review_catalog') is null
    or to_regclass('public.global_provider_candidate_evidence_catalog') is null
    or to_regclass('public.global_provider_candidate_review_matrix_catalog') is null then
    raise exception 'Phase 8N provider candidate-review schema is incomplete';
  end if;

  if (select count(*) from public.global_provider_candidate_review_profiles) <> 8
    or (select count(*) from public.global_provider_candidate_evidence_requirements) <> 12
    or (select count(*) from public.global_provider_candidate_review_matrix) <> 96 then
    raise exception 'Phase 8N deterministic provider candidate-review counts changed';
  end if;

  if exists (
    select 1 from public.global_provider_candidate_review_controls
    where source_family_target <> 8 or review_packet_target <> 8
      or evidence_requirement_target <> 12 or review_matrix_target <> 96
      or not manual_review_required or not signed_evidence_reference_required
      or not versioned_field_mapping_required or not observed_failure_drill_required
      or provider_candidate_selection_enabled or review_packet_open_enabled
      or evidence_submission_enabled or evidence_document_storage_enabled
      or endpoint_connectivity_enabled or credential_storage_enabled
      or external_payload_intake_enabled or fixture_execution_enabled
      or conformance_approval_enabled or candidate_write_enabled
      or observation_release_enabled or model_training_enabled
      or autonomous_publication_enabled or autonomous_trade_execution_enabled
  ) or exists (
    select 1 from public.global_provider_candidate_review_profiles
    where review_status <> 'not_opened' or conformance_state <> 'blocked'
      or provider_candidate_name is not null or provider_legal_entity is not null
      or endpoint_domain is not null or credential_reference is not null
      or evidence_document_reference is not null or external_payload_reference is not null
      or review_packet_opened_at is not null or submitted_requirement_count <> 0
      or approved_requirement_count <> 0 or executed_fixture_count <> 0
      or passed_fixture_count <> 0 or accountable_activation_approved
      or candidate_write_enabled or release_enabled or production_effect
  ) or exists (
    select 1 from public.global_provider_candidate_review_matrix
    where evidence_status <> 'not_submitted' or evidence_reference is not null
      or reviewer_identity is not null or reviewed_at is not null or expires_at is not null
      or human_approved or endpoint_execution_effect or candidate_write_effect
      or release_effect or production_effect
  ) then
    raise exception 'Phase 8N provider candidate-review boundary is not empty and fail-closed';
  end if;

  if to_regprocedure('public.open_global_provider_candidate_review(text)') is not null
    or to_regprocedure('public.submit_global_provider_candidate_evidence(jsonb)') is not null then
    raise exception 'A candidate-review opening or evidence-submission surface exists';
  end if;

  if exists (
    select 1 from public.global_provider_contract_test_controls
    where provider_selection_enabled or endpoint_execution_enabled
      or credential_access_enabled or external_payload_intake_enabled
      or synthetic_fixture_execution_enabled or candidate_write_enabled
      or automatic_conformance_approval_enabled or observation_release_enabled
      or model_training_enabled or autonomous_publication_enabled
      or autonomous_trade_execution_enabled
  ) or exists (
    select 1 from public.controlled_live_rollout_controls
    where live_order_routing_enabled or customer_funding_enabled
      or custody_enabled or settlement_enabled or automatic_activation_enabled
  ) then
    raise exception 'An earlier provider or execution lock changed';
  end if;
end;
$$;
