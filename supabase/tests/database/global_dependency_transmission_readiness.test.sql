begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(51);

select has_table('public', 'global_dependency_transmission_controls', 'dependency controls exist');
select has_table('public', 'global_dependency_intelligence_domains', 'dependency domains exist');
select has_table('public', 'global_country_dependency_readiness', 'country dependency readiness exists');
select has_table('public', 'global_transmission_mechanism_templates', 'transmission templates exist');
select has_table('public', 'global_dependency_release_gate_templates', 'dependency release gates exist');
select has_view('public', 'global_dependency_transmission_status', 'sanitized dependency status exists');
select has_view('public', 'global_dependency_domain_catalog', 'sanitized dependency domain catalog exists');
select has_view('public', 'global_country_dependency_readiness_catalog', 'sanitized country readiness catalog exists');
select has_view('public', 'global_transmission_mechanism_catalog', 'sanitized transmission catalog exists');
select has_view('public', 'global_dependency_release_gate_catalog', 'sanitized dependency gate catalog exists');

select is((select count(*) from public.global_dependency_transmission_controls), 1::bigint, 'one dependency policy is active');
select is((select sovereign_country_target from public.global_dependency_transmission_controls), 195, 'sovereign target is explicit');
select is((select dependency_domain_target from public.global_dependency_transmission_controls), 8, 'dependency domain target is explicit');
select ok((select explicit_relationship_gaps_required from public.global_dependency_transmission_controls), 'relationship gaps are mandatory');
select ok((select directed_relationship_evidence_required from public.global_dependency_transmission_controls), 'directed relationship evidence is mandatory');
select ok((select temporal_alignment_required from public.global_dependency_transmission_controls), 'temporal alignment is mandatory');
select ok((select exposure_magnitude_required from public.global_dependency_transmission_controls), 'exposure magnitude is mandatory');
select ok((select substitute_path_review_required from public.global_dependency_transmission_controls), 'substitution review is mandatory');
select ok((select human_release_review_required from public.global_dependency_transmission_controls), 'human release review is mandatory');
select ok(not exists(
  select 1 from public.global_dependency_transmission_controls
  where live_provider_connectivity_enabled or automatic_relationship_inference_enabled
    or generated_dependency_fill_enabled or automatic_impact_scoring_enabled
    or production_scenario_promotion_enabled or model_training_enabled
    or autonomous_publication_enabled or autonomous_trade_execution_enabled
), 'provider, inference, scoring, scenario, training, publication and execution remain locked');

select is((select count(*) from public.global_dependency_intelligence_domains), 8::bigint, 'eight dependency domains exist');
select is((select min(sequence_number) from public.global_dependency_intelligence_domains), 1::smallint, 'domain order starts at one');
select ok((select bool_and(minimum_independent_sources >= 2) from public.global_dependency_intelligence_domains), 'every domain requires multiple sources');
select ok((select bool_and(directional_evidence_required and magnitude_evidence_required and substitution_review_required) from public.global_dependency_intelligence_domains), 'direction, magnitude and substitutes are required');
select ok(not exists(
  select 1 from public.global_dependency_intelligence_domains
  where provider_connected or automatic_inference_enabled or publication_enabled or model_training_enabled
), 'domain connectivity, inference, publication and training are off');

select is((select count(*) from public.global_country_dependency_readiness), 1560::bigint, '195 countries by eight domains create 1560 readiness cells');
select ok((select bool_and(readiness_status = 'relationship_evidence_missing') from public.global_country_dependency_readiness), 'every readiness cell is an explicit relationship gap');
select ok(not exists(
  select 1 from public.global_country_dependency_readiness
  where approved_source_count <> 0 or verified_relationship_count <> 0
    or upstream_link_count <> 0 or downstream_link_count <> 0
), 'readiness cells contain no invented sources or relationships');
select ok(not exists(
  select 1 from public.global_country_dependency_readiness
  where latest_verified_at is not null or provenance_digest is not null
), 'readiness cells contain no fabricated evidence timestamps or digests');
select ok(not exists(
  select 1 from public.global_country_dependency_readiness
  where scenario_eligible or model_eligible or publication_eligible or production_effect
), 'readiness cells have no scenario, model, publication or production effect');
select is((select count(distinct country_reference_id) from public.global_country_dependency_readiness), 195::bigint, 'all sovereign references have dependency readiness');
select is((select count(distinct dependency_domain_id) from public.global_country_dependency_readiness), 8::bigint, 'all dependency domains have country readiness');

select is((select count(*) from public.global_transmission_mechanism_templates), 6::bigint, 'six mechanism templates exist');
select ok((select bool_and(template_status = 'template_only') from public.global_transmission_mechanism_templates), 'all mechanisms are template only');
select ok(not exists(
  select 1 from public.global_transmission_mechanism_templates
  where probability is not null or confidence_score is not null
    or estimated_effect_low_pct is not null or estimated_effect_high_pct is not null
), 'mechanism templates contain no fabricated probability, confidence or effect');
select ok((select bool_and(evidence_required and human_review_required) from public.global_transmission_mechanism_templates), 'every mechanism requires evidence and human review');
select ok(not exists(
  select 1 from public.global_transmission_mechanism_templates
  where automatic_scenario_generation_enabled or model_eligible
    or publication_eligible or production_effect
), 'mechanisms cannot generate, train, publish or affect production');

select is((select count(*) from public.global_dependency_release_gate_templates), 8::bigint, 'eight dependency release gates exist');
select ok((select bool_and(blocks_scenario_use and blocks_model_use and blocks_publication) from public.global_dependency_release_gate_templates), 'every gate blocks scenarios, models and publication');
select ok(not exists(select 1 from public.global_dependency_release_gate_templates where automatic_approval_enabled), 'no gate permits automatic approval');

select ok(has_table_privilege('anon', 'public.global_dependency_transmission_status', 'SELECT'), 'guests can read sanitized dependency status');
select ok(has_table_privilege('anon', 'public.global_country_dependency_readiness_catalog', 'SELECT'), 'guests can read sanitized country readiness');
select ok(not has_table_privilege('anon', 'public.global_country_dependency_readiness', 'INSERT'), 'browser roles cannot forge dependency readiness');
select ok(not has_table_privilege('authenticated', 'public.global_dependency_intelligence_domains', 'UPDATE'), 'browser roles cannot alter dependency domains');
select ok(coalesce((
  select bool_and(reloptions @> array['security_invoker=true'])
  from pg_class where oid in (
    'public.global_dependency_transmission_status'::regclass,
    'public.global_dependency_domain_catalog'::regclass,
    'public.global_country_dependency_readiness_catalog'::regclass,
    'public.global_transmission_mechanism_catalog'::regclass,
    'public.global_dependency_release_gate_catalog'::regclass
  )
), false), 'dependency views preserve caller permissions');
select ok(to_regprocedure('public.infer_global_dependency(text,text)') is null, 'no dependency inference RPC exists');
select ok(to_regprocedure('public.publish_global_transmission(text)') is null, 'no transmission publication RPC exists');
select ok(not exists(
  select 1 from public.global_country_coverage_controls
  where live_provider_connectivity_enabled or generated_fact_fill_enabled
    or automatic_country_scoring_enabled or production_ingestion_enabled
    or model_training_enabled or autonomous_publication_enabled
    or autonomous_trade_execution_enabled
), 'Phase 8I country coverage locks remain closed');
select ok(not exists(
  select 1 from public.global_event_intelligence_controls
  where raw_web_scraping_enabled or automatic_verification_without_evidence_enabled
    or rumor_promotion_enabled or production_provider_connectivity_enabled
    or autonomous_publication_enabled or autonomous_trade_execution_enabled
), 'Phase 8F event and execution locks remain closed');

select set_config('request.jwt.claim.role', 'service_role', true);
select throws_ok(
  $$update public.global_dependency_intelligence_domains set display_name = display_name || ' changed' where id = 1$$,
  'P0001', 'Global dependency transmission reference records are append-only',
  'dependency domains are append-only'
);
select throws_ok(
  $$delete from public.global_country_dependency_readiness where id = 1$$,
  'P0001', 'Global dependency transmission reference records are append-only',
  'dependency readiness gaps are append-only'
);

select * from finish();
rollback;
