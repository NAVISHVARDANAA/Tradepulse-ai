begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(51);

select has_table('public', 'global_evidence_operations_controls', 'evidence operation controls exist');
select has_table('public', 'global_evidence_source_lanes', 'source review lanes exist');
select has_table('public', 'global_evidence_corroboration_policies', 'claim corroboration policies exist');
select has_table('public', 'global_evidence_review_cases', 'review case queue exists');
select has_table('public', 'global_evidence_review_stages', 'review stages exist');
select has_table('public', 'global_evidence_decision_ledger', 'restricted decision ledger exists');
select has_view('public', 'global_evidence_operations_status', 'sanitized evidence status exists');
select has_view('public', 'global_evidence_source_lane_catalog', 'sanitized source lane catalog exists');
select has_view('public', 'global_evidence_corroboration_catalog', 'corroboration catalog exists');
select has_view('public', 'global_evidence_review_queue_catalog', 'sanitized review queue exists');
select has_view('public', 'global_evidence_review_stage_catalog', 'review stage catalog exists');

select is((select count(*) from public.global_evidence_operations_controls), 1::bigint, 'one evidence policy is active');
select is((select country_coverage_target from public.global_evidence_operations_controls), 195, 'country coverage target is explicit');
select is((select connected_source_count from public.global_evidence_operations_controls), 0, 'no source is connected');
select ok((select immutable_provenance_required from public.global_evidence_operations_controls), 'immutable provenance is mandatory');
select ok((select source_rights_review_required from public.global_evidence_operations_controls), 'source rights review is mandatory');
select ok((select independent_corroboration_required from public.global_evidence_operations_controls), 'independent corroboration is mandatory');
select ok((select human_publication_review_required from public.global_evidence_operations_controls), 'human publication review is mandatory');
select ok(not exists(
  select 1 from public.global_evidence_operations_controls
  where raw_web_scraping_enabled or private_source_access_enabled
    or credential_bypass_enabled or unlicensed_content_storage_enabled
    or automatic_verification_enabled or rumor_promotion_enabled
    or autonomous_publication_enabled or production_ingestion_enabled
    or model_training_enabled or autonomous_trade_execution_enabled
), 'unsafe acquisition, publication, training and execution paths are locked');

select is((select count(*) from public.global_evidence_source_lanes), 5::bigint, 'five governed source lanes are catalogued');
select ok((select bool_and(connectivity_status = 'disconnected') from public.global_evidence_source_lanes), 'every source lane is disconnected');
select ok(not exists(select 1 from public.global_evidence_source_lanes where ingestion_enabled), 'no source lane can ingest');
select ok(not exists(select 1 from public.global_evidence_source_lanes where publication_enabled or model_training_enabled), 'source lanes cannot publish or train');
select ok(not exists(select 1 from public.global_evidence_source_lanes where raw_content_storage_enabled), 'raw content storage is disabled');

select is((select count(*) from public.global_evidence_corroboration_policies), 6::bigint, 'six claim-specific policies are defined');
select ok((select bool_and(minimum_independent_sources >= 2) from public.global_evidence_corroboration_policies), 'every claim requires multiple independent sources');
select ok((select bool_and(minimum_primary_sources >= 1) from public.global_evidence_corroboration_policies), 'every claim requires a primary source');
select ok((select bool_and(human_review_required and not publication_enabled and not model_training_enabled) from public.global_evidence_corroboration_policies), 'policies require people and grant no production effect');

select is((select count(*) from public.global_evidence_review_cases), 5::bigint, 'five synthetic workflow rehearsals are seeded');
select ok((select bool_and(synthetic) from public.global_evidence_review_cases), 'every seeded review is synthetic');
select ok((select bool_and(review_status = 'blocked') from public.global_evidence_review_cases), 'every review is blocked');
select ok((select bool_and(independent_source_count = 0 and primary_source_count = 0) from public.global_evidence_review_cases), 'no real source evidence is fabricated');
select ok(not exists(select 1 from public.global_evidence_review_cases where display_eligible or publication_eligible), 'rehearsals cannot become customer claims');
select ok(not exists(select 1 from public.global_evidence_review_cases where model_eligible or execution_effect), 'rehearsals cannot train or execute');
select ok((select bool_and(char_length(evidence_digest) = 64) from public.global_evidence_review_cases), 'rehearsal inputs use one-way digests');

select is((select count(*) from public.global_evidence_review_stages), 40::bigint, 'eight review stages exist for every rehearsal');
select is((select count(distinct stage_key) from public.global_evidence_review_stages), 8::bigint, 'eight independent gate types are defined');
select ok((select bool_and(stage_status = 'evidence_missing') from public.global_evidence_review_stages), 'every external-evidence gate remains open');
select ok((select bool_and(human_review_required) from public.global_evidence_review_stages), 'every gate requires human review');
select ok(not exists(select 1 from public.global_evidence_review_stages where production_effect), 'review stages have no production effect');

select is((select count(*) from public.global_evidence_decision_ledger), 5::bigint, 'each rehearsal has a blocked decision');
select ok((select bool_and(decision_status = 'blocked') from public.global_evidence_decision_ledger), 'decision ledger honestly records blocked state');
select ok(not exists(select 1 from public.global_evidence_decision_ledger where publication_effect or model_effect or execution_effect), 'decisions grant no production effect');

select ok(has_table_privilege('anon', 'public.global_evidence_operations_status', 'SELECT'), 'guests can read sanitized evidence status');
select ok(not has_column_privilege('anon', 'public.global_evidence_review_cases', 'evidence_digest', 'SELECT'), 'rehearsal digests remain private');
select ok(not has_table_privilege('authenticated', 'public.global_evidence_decision_ledger', 'INSERT'), 'browser users cannot forge decisions');
select ok(coalesce((
  select bool_and(reloptions @> array['security_invoker=true'])
  from pg_class where oid in (
    'public.global_evidence_operations_status'::regclass,
    'public.global_evidence_source_lane_catalog'::regclass,
    'public.global_evidence_corroboration_catalog'::regclass,
    'public.global_evidence_review_queue_catalog'::regclass,
    'public.global_evidence_review_stage_catalog'::regclass
  )
), false), 'evidence views preserve caller permissions');
select ok(to_regprocedure('public.auto_verify_global_evidence(jsonb)') is null, 'no automatic verification RPC exists');
select ok(to_regprocedure('public.publish_global_evidence(jsonb)') is null, 'no publication RPC exists');

select set_config('request.jwt.claim.role', 'service_role', true);
select throws_ok(
  $$update public.global_evidence_review_cases set rehearsal_summary = rehearsal_summary || ' changed' where id = 1$$,
  'P0001', 'Global evidence review records are append-only',
  'review cases are append-only'
);
select throws_ok(
  $$delete from public.global_evidence_decision_ledger where id = 1$$,
  'P0001', 'Global evidence review records are append-only',
  'decision evidence is append-only'
);

select * from finish();
rollback;
