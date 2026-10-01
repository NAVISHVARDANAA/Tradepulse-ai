do $$
begin
  if to_regclass('public.external_audience_launch_controls') is null
    or to_regclass('public.external_audience_launch_state_templates') is null
    or to_regclass('public.external_audience_launch_surface_templates') is null
    or to_regclass('public.external_audience_launch_gate_templates') is null
    or to_regclass('public.external_audience_launch_readiness_matrix') is null
    or to_regclass('public.external_audience_launch_status') is null
    or to_regclass('public.external_audience_launch_readiness_catalog') is null then
    raise exception 'Phase 8U external audience launch-readiness schema is incomplete';
  end if;
  if (select count(*) from public.external_audience_launch_state_templates) <> 7
    or (select count(*) from public.external_audience_launch_surface_templates) <> 8
    or (select count(*) from public.external_audience_launch_gate_templates) <> 8
    or (select count(*) from public.external_audience_launch_readiness_matrix) <> 64 then
    raise exception 'Phase 8U deterministic external audience launch-readiness counts changed';
  end if;
  if exists (
    select 1 from public.external_audience_launch_controls
    where public_signup_enabled or unrestricted_discovery_enabled
      or automated_tester_provisioning_enabled or external_audience_activation_enabled
      or live_provider_connectivity_enabled or production_credential_storage_enabled
      or production_payload_intake_enabled or unrestricted_customer_data_collection_enabled
      or autonomous_publication_enabled or model_training_enabled or live_order_routing_enabled
      or payment_execution_enabled or money_movement_enabled or custody_enabled or settlement_enabled
  ) or exists (
    select 1 from public.external_audience_launch_state_templates
    where real_audience_present or automatic_transition_enabled
      or not human_launch_authorization_required or public_access_effect
      or customer_data_effect or financial_execution_effect or production_effect
  ) or exists (
    select 1 from public.external_audience_launch_surface_templates
    where audience_access_status <> 'unavailable' or real_audience_present
      or customer_data_enabled or financial_execution_enabled or production_effect
  ) or exists (
    select 1 from public.external_audience_launch_gate_templates
    where gate_status <> 'unmet' or real_evidence_present or reviewer_assigned or human_authorized
  ) or exists (
    select 1 from public.external_audience_launch_readiness_matrix
    where readiness_status <> 'blocked' or evidence_reference is not null
      or reviewer_identity is not null or authorization_reference is not null
      or cohort_reference is not null or rollback_reference is not null
      or verified_at is not null or expires_at is not null or human_authorized
      or public_access_effect or account_provisioning_effect or customer_data_effect
      or live_provider_effect or publication_effect or financial_execution_effect
      or release_effect or production_effect
  ) then
    raise exception 'Phase 8U external audience launch boundary is not empty and fail-closed';
  end if;
end;
$$;
