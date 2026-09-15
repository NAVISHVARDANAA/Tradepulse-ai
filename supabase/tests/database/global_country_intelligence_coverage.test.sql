begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(50);

select has_table('public', 'global_country_coverage_controls', 'country coverage controls exist');
select has_table('public', 'global_sovereign_country_reference', 'sovereign country references exist');
select has_table('public', 'global_country_intelligence_domains', 'country intelligence domains exist');
select has_table('public', 'global_country_intelligence_coverage_matrix', 'country-domain coverage matrix exists');
select has_table('public', 'global_country_coverage_gate_templates', 'country coverage gate templates exist');
select has_view('public', 'global_country_coverage_status', 'sanitized country coverage status exists');
select has_view('public', 'global_sovereign_country_catalog', 'sanitized sovereign country catalog exists');
select has_view('public', 'global_country_intelligence_domain_catalog', 'sanitized domain catalog exists');
select has_view('public', 'global_country_coverage_gate_catalog', 'sanitized gate catalog exists');

select is((select count(*) from public.global_country_coverage_controls), 1::bigint, 'one country coverage policy is active');
select is((select sovereign_country_target from public.global_country_coverage_controls), 195, 'sovereign target is explicit');
select is((select intelligence_domain_target from public.global_country_coverage_controls), 8, 'domain target is explicit');
select ok((select sovereign_reference_catalog_enabled from public.global_country_coverage_controls), 'sovereign reference catalog is enabled');
select ok((select explicit_evidence_gaps_required from public.global_country_coverage_controls), 'explicit evidence gaps are mandatory');
select ok((select source_rights_review_required from public.global_country_coverage_controls), 'source rights review is mandatory');
select ok((select independent_corroboration_required from public.global_country_coverage_controls), 'independent corroboration is mandatory');
select ok((select temporal_freshness_required from public.global_country_coverage_controls), 'temporal freshness is mandatory');
select ok((select human_release_review_required from public.global_country_coverage_controls), 'human release review is mandatory');
select ok(not exists(
  select 1 from public.global_country_coverage_controls
  where live_provider_connectivity_enabled or generated_fact_fill_enabled
    or automatic_country_scoring_enabled or production_ingestion_enabled
    or model_training_enabled or autonomous_publication_enabled
    or autonomous_trade_execution_enabled
), 'provider, generation, scoring, ingestion, training, publication and execution remain locked');

select is((select count(*) from public.global_sovereign_country_reference), 195::bigint, 'all 195 sovereign references are catalogued');
select is((select count(distinct country_code) from public.global_sovereign_country_reference), 195::bigint, 'country codes are unique');
select is((select count(distinct country_name) from public.global_sovereign_country_reference), 195::bigint, 'country names are unique');
select ok((select bool_and(reference_status = 'reference_only') from public.global_sovereign_country_reference), 'countries are reference identities only');
select ok((select bool_and(completeness_status = 'evidence_missing') from public.global_sovereign_country_reference), 'country completeness remains missing');
select ok(not exists(
  select 1 from public.global_sovereign_country_reference
  where approved_source_count <> 0 or current_observation_count <> 0
    or synthetic_fact_count <> 0 or publication_eligible or model_eligible or execution_effect
), 'country references contain no approved or generated facts');
select is((select count(*) from public.global_sovereign_country_reference where region_group = 'Africa'), 54::bigint, 'Africa reference count is deterministic');
select is((select count(*) from public.global_sovereign_country_reference where region_group = 'Americas'), 35::bigint, 'Americas reference count is deterministic');
select is((select count(*) from public.global_sovereign_country_reference where region_group = 'Asia'), 48::bigint, 'Asia reference count is deterministic');
select is((select count(*) from public.global_sovereign_country_reference where region_group = 'Europe'), 44::bigint, 'Europe reference count is deterministic');
select is((select count(*) from public.global_sovereign_country_reference where region_group = 'Oceania'), 14::bigint, 'Oceania reference count is deterministic');

select is((select count(*) from public.global_country_intelligence_domains), 8::bigint, 'eight intelligence domains are defined');
select ok((select bool_and(minimum_independent_sources >= 2) from public.global_country_intelligence_domains), 'every domain requires multiple sources');
select ok((select bool_and(primary_source_required and human_review_required) from public.global_country_intelligence_domains), 'primary evidence and human review are required');
select ok(not exists(
  select 1 from public.global_country_intelligence_domains
  where provider_connected or automatic_fill_enabled or publication_enabled or model_training_enabled
), 'domain providers, automatic fill, publication and training are off');

select is((select count(*) from public.global_country_intelligence_coverage_matrix), 1560::bigint, '195 countries by eight domains create 1560 cells');
select ok((select bool_and(coverage_status = 'evidence_missing') from public.global_country_intelligence_coverage_matrix), 'every country-domain cell is an explicit gap');
select ok(not exists(
  select 1 from public.global_country_intelligence_coverage_matrix
  where approved_source_count <> 0 or approved_observation_count <> 0
    or latest_verified_at is not null or provenance_digest is not null
), 'matrix contains no fabricated evidence or timestamps');
select ok(not exists(
  select 1 from public.global_country_intelligence_coverage_matrix
  where publication_eligible or model_eligible or production_effect
), 'coverage cells have no publication, model or production effect');
select is((select count(*) from public.global_country_coverage_gate_templates), 7::bigint, 'seven coverage release gates exist');
select ok((select bool_and(blocks_publication and blocks_model_use) from public.global_country_coverage_gate_templates), 'every gate blocks publication and model use');
select ok(not exists(select 1 from public.global_country_coverage_gate_templates where automatic_approval_enabled), 'no gate permits automatic approval');

select ok(has_table_privilege('anon', 'public.global_country_coverage_status', 'SELECT'), 'guests can read sanitized country coverage status');
select ok(has_table_privilege('anon', 'public.global_sovereign_country_catalog', 'SELECT'), 'guests can read the sovereign reference catalog');
select ok(not has_table_privilege('anon', 'public.global_country_intelligence_coverage_matrix', 'INSERT'), 'browser roles cannot forge coverage');
select ok(not has_table_privilege('authenticated', 'public.global_country_intelligence_domains', 'UPDATE'), 'browser roles cannot alter domain policy');
select ok(coalesce((
  select bool_and(reloptions @> array['security_invoker=true'])
  from pg_class where oid in (
    'public.global_country_coverage_status'::regclass,
    'public.global_sovereign_country_catalog'::regclass,
    'public.global_country_intelligence_domain_catalog'::regclass,
    'public.global_country_coverage_gate_catalog'::regclass
  )
), false), 'country coverage views preserve caller permissions');
select ok(to_regprocedure('public.generate_country_intelligence(text)') is null, 'no country fact generation RPC exists');
select ok(to_regprocedure('public.publish_country_intelligence(text)') is null, 'no country publication RPC exists');

select set_config('request.jwt.claim.role', 'service_role', true);
select throws_ok(
  $$update public.global_sovereign_country_reference set country_name = country_name || ' changed' where id = 1$$,
  'P0001', 'Global country coverage reference records are append-only',
  'country references are append-only'
);
select throws_ok(
  $$delete from public.global_country_intelligence_coverage_matrix where id = 1$$,
  'P0001', 'Global country coverage reference records are append-only',
  'coverage gaps are append-only'
);

select * from finish();
rollback;
