do $$
begin
  if to_regclass('public.global_country_coverage_controls') is null
    or to_regclass('public.global_sovereign_country_reference') is null
    or to_regclass('public.global_country_intelligence_domains') is null
    or to_regclass('public.global_country_intelligence_coverage_matrix') is null
    or to_regclass('public.global_country_coverage_gate_templates') is null
    or to_regclass('public.global_country_coverage_status') is null
    or to_regclass('public.global_sovereign_country_catalog') is null then
    raise exception 'Phase 8I global country coverage schema is incomplete';
  end if;

  if (select count(*) from public.global_sovereign_country_reference) <> 195
    or (select count(*) from public.global_country_intelligence_domains) <> 8
    or (select count(*) from public.global_country_intelligence_coverage_matrix) <> 1560
    or (select count(*) from public.global_country_coverage_gate_templates) <> 7 then
    raise exception 'Phase 8I deterministic country coverage counts changed';
  end if;

  if exists (
    select 1 from public.global_country_coverage_controls
    where sovereign_country_target <> 195 or intelligence_domain_target <> 8
      or not explicit_evidence_gaps_required or not independent_corroboration_required
      or not temporal_freshness_required or not human_release_review_required
      or live_provider_connectivity_enabled or generated_fact_fill_enabled
      or automatic_country_scoring_enabled or production_ingestion_enabled
      or model_training_enabled or autonomous_publication_enabled
      or autonomous_trade_execution_enabled
  ) or exists (
    select 1 from public.global_country_intelligence_coverage_matrix
    where coverage_status <> 'evidence_missing' or approved_source_count <> 0
      or approved_observation_count <> 0 or latest_verified_at is not null
      or provenance_digest is not null or publication_eligible
      or model_eligible or production_effect
  ) then
    raise exception 'Phase 8I country coverage is not fail-closed';
  end if;

  if to_regprocedure('public.generate_country_intelligence(text)') is not null
    or to_regprocedure('public.publish_country_intelligence(text)') is not null
    or to_regclass('public.global_country_live_intelligence') is not null then
    raise exception 'An automatic country generation or publication surface exists';
  end if;

  if exists (
    select 1 from public.global_evidence_operations_controls
    where connected_source_count <> 0 or raw_web_scraping_enabled
      or automatic_verification_enabled or autonomous_publication_enabled
      or production_ingestion_enabled or model_training_enabled
      or autonomous_trade_execution_enabled
  ) or exists (
    select 1 from public.controlled_live_rollout_controls
    where live_order_routing_enabled or customer_funding_enabled
      or custody_enabled or settlement_enabled or automatic_activation_enabled
  ) then
    raise exception 'An earlier evidence or execution lock changed';
  end if;
end;
$$;
