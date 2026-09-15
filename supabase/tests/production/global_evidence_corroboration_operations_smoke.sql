do $$
begin
  if to_regclass('public.global_evidence_operations_controls') is null
    or to_regclass('public.global_evidence_source_lanes') is null
    or to_regclass('public.global_evidence_corroboration_policies') is null
    or to_regclass('public.global_evidence_review_cases') is null
    or to_regclass('public.global_evidence_review_stages') is null
    or to_regclass('public.global_evidence_operations_status') is null
    or to_regclass('public.global_evidence_review_queue_catalog') is null then
    raise exception 'Phase 8H global evidence operations schema is incomplete';
  end if;

  if (select count(*) from public.global_evidence_source_lanes) <> 5
    or (select count(*) from public.global_evidence_corroboration_policies) <> 6
    or (select count(*) from public.global_evidence_review_cases) <> 5
    or (select count(*) from public.global_evidence_review_stages) <> 40 then
    raise exception 'Phase 8H deterministic reference counts changed';
  end if;

  if exists (
    select 1 from public.global_evidence_operations_controls
    where country_coverage_target <> 195 or connected_source_count <> 0
      or not immutable_provenance_required or not source_rights_review_required
      or not independent_corroboration_required or not conflict_review_required
      or not human_publication_review_required or raw_web_scraping_enabled
      or private_source_access_enabled or credential_bypass_enabled
      or unlicensed_content_storage_enabled or automatic_verification_enabled
      or rumor_promotion_enabled or autonomous_publication_enabled
      or production_ingestion_enabled or model_training_enabled
      or autonomous_trade_execution_enabled
  ) then
    raise exception 'Phase 8H evidence operations are not fail-closed';
  end if;

  if exists (
    select 1 from public.global_evidence_source_lanes
    where connectivity_status <> 'disconnected' or ingestion_enabled
      or publication_enabled or model_training_enabled or raw_content_storage_enabled
  ) or exists (
    select 1 from public.global_evidence_review_cases
    where not synthetic or review_status <> 'blocked' or display_eligible
      or publication_eligible or model_eligible or execution_effect
  ) or exists (
    select 1 from public.global_evidence_decision_ledger
    where decision_status <> 'blocked' or publication_effect
      or model_effect or execution_effect
  ) then
    raise exception 'A Phase 8H source, claim or decision exceeded the rehearsal boundary';
  end if;

  if to_regprocedure('public.auto_verify_global_evidence(jsonb)') is not null
    or to_regprocedure('public.publish_global_evidence(jsonb)') is not null
    or to_regclass('public.global_evidence_live_publications') is not null then
    raise exception 'An automatic evidence verification or publication surface exists';
  end if;

  if exists (
    select 1 from public.global_event_intelligence_controls
    where raw_web_scraping_enabled or rumor_promotion_enabled
      or autonomous_publication_enabled or production_provider_connectivity_enabled
      or autonomous_trade_execution_enabled
  ) or exists (
    select 1 from public.controlled_live_rollout_controls
    where live_order_routing_enabled or customer_funding_enabled
      or custody_enabled or settlement_enabled or automatic_activation_enabled
  ) then
    raise exception 'An earlier intelligence or execution lock changed';
  end if;
end;
$$;
