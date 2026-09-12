do $$
begin
  if to_regclass('public.global_event_intelligence_controls') is null
    or to_regclass('public.global_event_source_registry') is null
    or to_regclass('public.global_country_intelligence_profiles') is null
    or to_regclass('public.global_event_records') is null
    or to_regclass('public.global_event_entities') is null
    or to_regclass('public.global_event_entity_links') is null
    or to_regclass('public.global_event_impact_edges') is null
    or to_regclass('public.global_event_analysis_runs') is null
    or to_regclass('public.user_global_event_alert_policies') is null
    or to_regclass('public.global_event_intelligence_status') is null
    or to_regclass('public.global_event_signal_catalog') is null
    or to_regclass('public.global_event_impact_graph') is null
    or to_regclass('public.global_country_intelligence_coverage') is null then
    raise exception 'Phase 8F global event intelligence schema is incomplete';
  end if;

  if (select count(*) from public.global_event_intelligence_controls) <> 1
    or (select count(*) from public.global_event_source_registry) <> 5
    or (select count(*) from public.global_event_records) <> 5
    or (select count(*) from public.global_event_entities) <> 12
    or (select count(*) from public.global_event_entity_links) <> 15
    or (select count(*) from public.global_event_impact_edges) <> 9
    or (select count(*) from public.global_event_impact_edges where terminal_edge) <> 6
    or (select count(*) from public.global_event_analysis_runs) <> 5 then
    raise exception 'Phase 8F deterministic reference counts changed';
  end if;

  if (select count(*) from public.global_country_intelligence_profiles)
      <> (select count(*) from public.countries) then
    raise exception 'A catalogued country is missing an explicit intelligence coverage row';
  end if;

  if exists (
    select 1 from public.global_event_intelligence_controls
    where not workspace_enabled or not source_authenticity_required
      or not multi_source_corroboration_required or not causal_impact_graph_enabled
      or not scenario_forecasting_enabled or not personalized_alerts_enabled
      or country_coverage_target <> 195
      or raw_web_scraping_enabled or credentialed_source_bypass_enabled
      or unlicensed_content_storage_enabled
      or automatic_verification_without_evidence_enabled or rumor_promotion_enabled
      or autonomous_publication_enabled or production_provider_connectivity_enabled
      or autonomous_trade_execution_enabled or customer_funding_enabled
      or custody_enabled or settlement_enabled
  ) then
    raise exception 'Global event intelligence controls are not fail-closed';
  end if;

  if exists (
    select 1 from public.global_event_source_registry
    where provider_connectivity_enabled or raw_content_storage_enabled
  ) or exists (
    select 1 from public.global_event_records
    where (synthetic and model_eligible)
      or (verification_status = 'verified' and (corroboration_count < 2 or authenticity_score < 0.7))
  ) then
    raise exception 'Source rights, authenticity or synthetic-training boundary changed';
  end if;

  if exists (
    select 1 from public.global_event_impact_edges
    where production_effect or not human_review_required
      or (synthetic and model_eligible)
  ) or exists (
    select 1 from public.global_event_analysis_runs
    where automatically_published or production_effect
  ) then
    raise exception 'Scenario analysis is executable or automatically published';
  end if;

  if to_regprocedure('public.save_global_event_alert_policy(text,text,text[],text[],text[],numeric,numeric,text)') is null
    or to_regclass('public.global_event_live_actions') is not null
    or to_regprocedure('public.ingest_unlicensed_web_event(jsonb)') is not null
    or to_regprocedure('public.auto_publish_global_event(jsonb)') is not null then
    raise exception 'Private alert or unsafe ingestion/publication contract changed';
  end if;

  if exists (
    select 1 from public.live_trading_activation_controls
    where live_order_routing_enabled or customer_funding_enabled
      or custody_enabled or settlement_enabled
  ) or exists (
    select 1 from public.payment_money_movement_controls
    where production_partner_connectivity_enabled or customer_funding_enabled
      or payment_execution_enabled or money_movement_enabled
  ) then
    raise exception 'An existing execution or money-movement lock changed';
  end if;
end;
$$;
