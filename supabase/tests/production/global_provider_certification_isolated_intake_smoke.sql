do $$
begin
  if to_regclass('public.global_provider_certification_controls') is null
    or to_regclass('public.global_provider_certification_profiles') is null
    or to_regclass('public.global_provider_certification_gate_templates') is null
    or to_regclass('public.global_isolated_intake_profiles') is null
    or to_regclass('public.global_provider_failure_drill_templates') is null
    or to_regclass('public.global_provider_certification_status') is null
    or to_regclass('public.global_provider_certification_catalog') is null then
    raise exception 'Phase 8L provider certification schema is incomplete';
  end if;

  if (select count(*) from public.global_provider_certification_profiles) <> 8
    or (select count(*) from public.global_provider_certification_gate_templates) <> 10
    or (select count(*) from public.global_isolated_intake_profiles) <> 8
    or (select count(*) from public.global_provider_failure_drill_templates) <> 6 then
    raise exception 'Phase 8L deterministic provider certification counts changed';
  end if;

  if exists (
    select 1 from public.global_provider_certification_controls
    where source_family_target <> 8 or certification_gate_target <> 10
      or isolation_profile_target <> 8 or failure_drill_target <> 6
      or not named_legal_owner_required or not source_rights_review_required
      or not privacy_security_review_required or not versioned_schema_contract_required
      or not bounded_isolation_required or not accountable_human_activation_required
      or provider_selection_enabled or endpoint_testing_enabled
      or credential_storage_enabled or candidate_intake_enabled
      or production_ingestion_enabled or automatic_certification_enabled
      or observation_release_enabled or model_training_enabled
      or autonomous_publication_enabled or autonomous_trade_execution_enabled
  ) or exists (
    select 1 from public.global_provider_certification_profiles
    where certification_status <> 'provider_unselected' or provider_legal_name is not null
      or endpoint_domain is not null or contract_reference is not null
      or credential_reference is not null or rights_review_status <> 'not_started'
      or privacy_security_review_status <> 'not_started'
      or schema_review_status <> 'not_started' or provenance_review_status <> 'not_started'
      or resilience_review_status <> 'not_started' or accountable_owner_assigned
      or certification_approved or isolated_intake_approved or production_effect
  ) or exists (
    select 1 from public.global_isolated_intake_profiles
    where environment_status <> 'not_provisioned' or environment_reference is not null
      or network_egress_enabled or credential_access_enabled or payload_storage_enabled
      or candidate_write_enabled or maximum_candidate_rows <> 0
      or quarantine_release_enabled or downstream_read_enabled
      or publication_eligible or model_eligible or production_effect
      or latest_tested_at is not null
  ) or exists (
    select 1 from public.global_provider_failure_drill_templates
    where observed_drill_count <> 0 or automatic_pass_enabled
      or not manual_evidence_required or not blocks_certification
  ) then
    raise exception 'Phase 8L provider certification boundary is not empty and fail-closed';
  end if;

  if to_regprocedure('public.select_global_observation_provider(text)') is not null
    or to_regprocedure('public.provision_isolated_global_intake(text)') is not null
    or to_regprocedure('public.ingest_global_provider_candidate(jsonb)') is not null then
    raise exception 'A provider selection, isolation provisioning or candidate ingestion surface exists';
  end if;

  if exists (
    select 1 from public.global_observation_intake_controls
    where live_provider_connectivity_enabled or production_ingestion_enabled
      or automatic_release_enabled or model_training_enabled
      or autonomous_publication_enabled or autonomous_trade_execution_enabled
  ) or exists (
    select 1 from public.controlled_live_rollout_controls
    where live_order_routing_enabled or customer_funding_enabled
      or custody_enabled or settlement_enabled or automatic_activation_enabled
  ) then
    raise exception 'An earlier observation or execution lock changed';
  end if;
end;
$$;
