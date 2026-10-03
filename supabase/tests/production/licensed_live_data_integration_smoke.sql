do $$
begin
  if to_regclass('public.licensed_live_data_integration_controls') is null
    or to_regclass('public.licensed_live_data_integration_state_templates') is null
    or to_regclass('public.licensed_live_data_feed_templates') is null
    or to_regclass('public.licensed_live_data_gate_templates') is null
    or to_regclass('public.licensed_live_data_readiness_matrix') is null
    or to_regclass('public.licensed_live_data_integration_status') is null
    or to_regclass('public.licensed_live_data_readiness_catalog') is null then
    raise exception 'Phase 8V licensed live-data integration schema is incomplete';
  end if;
  if (select count(*) from public.licensed_live_data_integration_state_templates) <> 7
    or (select count(*) from public.licensed_live_data_feed_templates) <> 8
    or (select count(*) from public.licensed_live_data_gate_templates) <> 8
    or (select count(*) from public.licensed_live_data_readiness_matrix) <> 64 then
    raise exception 'Phase 8V deterministic licensed live-data integration counts changed';
  end if;
  if exists (
    select 1 from public.licensed_live_data_integration_controls
    where provider_selected or live_provider_connectivity_enabled
      or production_credential_storage_enabled or production_payload_intake_enabled
      or live_data_display_enabled or derived_data_publication_enabled or model_training_enabled
      or external_audience_activation_enabled or public_signup_enabled or live_order_routing_enabled
      or payment_execution_enabled or money_movement_enabled or custody_enabled or settlement_enabled
  ) or exists (
    select 1 from public.licensed_live_data_integration_state_templates
    where provider_present or real_evidence_present or automatic_transition_enabled
      or not human_integration_authorization_required or credential_access_effect
      or payload_intake_effect or live_display_effect or production_effect
  ) or exists (
    select 1 from public.licensed_live_data_feed_templates
    where availability_status <> 'unavailable' or provider_selected or rights_evidence_present
      or credential_present or real_payload_present or live_display_enabled or production_effect
  ) or exists (
    select 1 from public.licensed_live_data_gate_templates
    where gate_status <> 'unmet' or real_evidence_present or reviewer_assigned or human_authorized
  ) or exists (
    select 1 from public.licensed_live_data_readiness_matrix
    where readiness_status <> 'blocked' or provider_reference is not null
      or evidence_reference is not null or entitlement_reference is not null
      or credential_reference is not null or adapter_reference is not null
      or reviewer_identity is not null or authorization_reference is not null
      or rollback_reference is not null or verified_at is not null or expires_at is not null
      or human_authorized or credential_access_effect or provider_egress_effect
      or payload_intake_effect or live_display_effect or audience_effect
      or publication_effect or financial_execution_effect or release_effect or production_effect
  ) then
    raise exception 'Phase 8V licensed live-data integration boundary is not empty and fail-closed';
  end if;
end;
$$;
