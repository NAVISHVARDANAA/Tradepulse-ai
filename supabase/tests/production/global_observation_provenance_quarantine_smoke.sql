do $$
begin
  if to_regclass('public.global_observation_intake_controls') is null
    or to_regclass('public.global_observation_source_connectors') is null
    or to_regclass('public.global_observation_normalization_contracts') is null
    or to_regclass('public.global_observation_quarantine_lanes') is null
    or to_regclass('public.global_observation_release_gate_templates') is null
    or to_regclass('public.global_observation_intake_status') is null
    or to_regclass('public.global_observation_source_catalog') is null then
    raise exception 'Phase 8K observation provenance quarantine schema is incomplete';
  end if;

  if (select count(*) from public.global_observation_source_connectors) <> 8
    or (select count(*) from public.global_observation_normalization_contracts) <> 9
    or (select count(*) from public.global_observation_quarantine_lanes) <> 8
    or (select count(*) from public.global_observation_release_gate_templates) <> 8 then
    raise exception 'Phase 8K deterministic observation contract counts changed';
  end if;

  if exists (
    select 1 from public.global_observation_intake_controls
    where source_family_target <> 8 or normalization_contract_target <> 9
      or quarantine_lane_target <> 8 or not immutable_provenance_required
      or not source_rights_required or not schema_validation_required
      or not unit_normalization_required or not temporal_lineage_required
      or not independent_corroboration_required or not conflict_quarantine_required
      or not human_release_review_required or live_provider_connectivity_enabled
      or production_ingestion_enabled or automatic_normalization_approval_enabled
      or automatic_conflict_resolution_enabled or automatic_release_enabled
      or model_training_enabled or autonomous_publication_enabled
      or autonomous_trade_execution_enabled
  ) or exists (
    select 1 from public.global_observation_source_connectors
    where connector_status <> 'not_connected' or endpoint_approved
      or credentials_configured or retention_approved or display_rights_approved
      or derivation_rights_approved or model_use_rights_approved
      or production_ingestion_enabled
  ) or exists (
    select 1 from public.global_observation_quarantine_lanes
    where lane_status <> 'provider_not_connected' or candidate_observation_count <> 0
      or schema_valid_count <> 0 or corroborated_count <> 0 or conflict_count <> 0
      or released_observation_count <> 0 or latest_received_at is not null
      or latest_released_at is not null or provenance_digest is not null
      or publication_eligible or model_eligible or production_effect
  ) then
    raise exception 'Phase 8K observation intake is not empty and fail-closed';
  end if;

  if to_regprocedure('public.connect_global_observation_provider(text)') is not null
    or to_regprocedure('public.ingest_global_observation(jsonb)') is not null
    or to_regprocedure('public.release_global_observation(text)') is not null then
    raise exception 'A production provider, ingestion or release surface exists';
  end if;

  if exists (
    select 1 from public.global_dependency_transmission_controls
    where live_provider_connectivity_enabled or automatic_relationship_inference_enabled
      or generated_dependency_fill_enabled or automatic_impact_scoring_enabled
      or production_scenario_promotion_enabled or model_training_enabled
      or autonomous_publication_enabled or autonomous_trade_execution_enabled
  ) or exists (
    select 1 from public.controlled_live_rollout_controls
    where live_order_routing_enabled or customer_funding_enabled
      or custody_enabled or settlement_enabled or automatic_activation_enabled
  ) then
    raise exception 'An earlier dependency or execution lock changed';
  end if;
end;
$$;
