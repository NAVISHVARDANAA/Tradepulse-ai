do $$
begin
  if to_regclass('public.licensed_provider_commercial_readiness_controls') is null
    or to_regclass('public.licensed_provider_commercial_readiness_state_templates') is null
    or to_regclass('public.licensed_provider_commercial_domain_templates') is null
    or to_regclass('public.licensed_provider_commercial_gate_templates') is null
    or to_regclass('public.licensed_provider_commercial_readiness_matrix') is null
    or to_regclass('public.licensed_provider_commercial_readiness_status') is null
    or to_regclass('public.licensed_provider_commercial_readiness_catalog') is null then
    raise exception 'Phase 8W licensed provider commercial-readiness schema is incomplete';
  end if;
  if (select count(*) from public.licensed_provider_commercial_readiness_state_templates) <> 7
    or (select count(*) from public.licensed_provider_commercial_domain_templates) <> 8
    or (select count(*) from public.licensed_provider_commercial_gate_templates) <> 8
    or (select count(*) from public.licensed_provider_commercial_readiness_matrix) <> 64 then
    raise exception 'Phase 8W deterministic licensed provider commercial-readiness counts changed';
  end if;
  if exists (
    select 1 from public.licensed_provider_commercial_readiness_controls
    where provider_shortlisted or pricing_quote_accepted or contract_signed
      or purchase_order_issued or provider_selected or live_provider_connectivity_enabled
      or production_credential_storage_enabled or production_payload_intake_enabled
      or live_data_display_enabled or derived_data_publication_enabled or model_training_enabled
      or external_audience_activation_enabled or public_signup_enabled or live_order_routing_enabled
      or payment_execution_enabled or money_movement_enabled or custody_enabled or settlement_enabled
  ) or exists (
    select 1 from public.licensed_provider_commercial_readiness_state_templates
    where provider_present or real_evidence_present or automatic_transition_enabled
      or not human_commercial_authorization_required or provider_selection_effect
      or commercial_commitment_effect or contract_signature_effect or credential_access_effect
      or payload_intake_effect or live_display_effect or production_effect
  ) or exists (
    select 1 from public.licensed_provider_commercial_domain_templates
    where availability_status <> 'unavailable' or provider_shortlisted or real_evidence_present
      or quote_present or contract_present or commercial_commitment_enabled or production_effect
  ) or exists (
    select 1 from public.licensed_provider_commercial_gate_templates
    where gate_status <> 'unmet' or real_evidence_present or reviewer_assigned or human_authorized
  ) or exists (
    select 1 from public.licensed_provider_commercial_readiness_matrix
    where readiness_status <> 'blocked' or provider_reference is not null
      or evidence_reference is not null or quote_reference is not null
      or contract_reference is not null or pricing_reference is not null
      or security_review_reference is not null
      or reviewer_identity is not null or authorization_reference is not null
      or exit_plan_reference is not null or verified_at is not null or expires_at is not null
      or human_authorized or provider_selection_effect or commercial_commitment_effect
      or contract_signature_effect or credential_access_effect or provider_egress_effect
      or payload_intake_effect or live_display_effect or audience_effect
      or publication_effect or financial_execution_effect or release_effect or production_effect
  ) then
    raise exception 'Phase 8W licensed provider commercial-readiness boundary is not empty and fail-closed';
  end if;
end;
$$;
