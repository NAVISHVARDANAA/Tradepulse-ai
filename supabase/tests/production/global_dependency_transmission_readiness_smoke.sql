do $$
begin
  if to_regclass('public.global_dependency_transmission_controls') is null
    or to_regclass('public.global_dependency_intelligence_domains') is null
    or to_regclass('public.global_country_dependency_readiness') is null
    or to_regclass('public.global_transmission_mechanism_templates') is null
    or to_regclass('public.global_dependency_release_gate_templates') is null
    or to_regclass('public.global_dependency_transmission_status') is null
    or to_regclass('public.global_country_dependency_readiness_catalog') is null then
    raise exception 'Phase 8J global dependency transmission schema is incomplete';
  end if;

  if (select count(*) from public.global_dependency_intelligence_domains) <> 8
    or (select count(*) from public.global_country_dependency_readiness) <> 1560
    or (select count(*) from public.global_transmission_mechanism_templates) <> 6
    or (select count(*) from public.global_dependency_release_gate_templates) <> 8 then
    raise exception 'Phase 8J deterministic dependency counts changed';
  end if;

  if exists (
    select 1 from public.global_dependency_transmission_controls
    where sovereign_country_target <> 195 or dependency_domain_target <> 8
      or not explicit_relationship_gaps_required
      or not directed_relationship_evidence_required
      or not temporal_alignment_required or not exposure_magnitude_required
      or not substitute_path_review_required or not human_release_review_required
      or live_provider_connectivity_enabled or automatic_relationship_inference_enabled
      or generated_dependency_fill_enabled or automatic_impact_scoring_enabled
      or production_scenario_promotion_enabled or model_training_enabled
      or autonomous_publication_enabled or autonomous_trade_execution_enabled
  ) or exists (
    select 1 from public.global_country_dependency_readiness
    where readiness_status <> 'relationship_evidence_missing'
      or approved_source_count <> 0 or verified_relationship_count <> 0
      or upstream_link_count <> 0 or downstream_link_count <> 0
      or latest_verified_at is not null or provenance_digest is not null
      or scenario_eligible or model_eligible or publication_eligible or production_effect
  ) then
    raise exception 'Phase 8J dependency readiness is not fail-closed';
  end if;

  if to_regprocedure('public.infer_global_dependency(text,text)') is not null
    or to_regprocedure('public.publish_global_transmission(text)') is not null
    or to_regclass('public.global_verified_dependency_relationships') is not null then
    raise exception 'An automatic dependency inference or publication surface exists';
  end if;

  if exists (
    select 1 from public.global_country_coverage_controls
    where live_provider_connectivity_enabled or generated_fact_fill_enabled
      or automatic_country_scoring_enabled or production_ingestion_enabled
      or model_training_enabled or autonomous_publication_enabled
      or autonomous_trade_execution_enabled
  ) or exists (
    select 1 from public.controlled_live_rollout_controls
    where live_order_routing_enabled or customer_funding_enabled
      or custody_enabled or settlement_enabled or automatic_activation_enabled
  ) then
    raise exception 'An earlier country or execution lock changed';
  end if;
end;
$$;
