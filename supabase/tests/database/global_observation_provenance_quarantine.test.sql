begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(46);

select has_table('public', 'global_observation_intake_controls', 'observation intake controls exist');
select has_table('public', 'global_observation_source_connectors', 'source connector contracts exist');
select has_table('public', 'global_observation_normalization_contracts', 'normalization contracts exist');
select has_table('public', 'global_observation_quarantine_lanes', 'quarantine lanes exist');
select has_table('public', 'global_observation_release_gate_templates', 'release gate templates exist');
select has_view('public', 'global_observation_intake_status', 'sanitized observation intake status exists');
select has_view('public', 'global_observation_source_catalog', 'sanitized source catalog exists');
select has_view('public', 'global_observation_normalization_catalog', 'sanitized normalization catalog exists');
select has_view('public', 'global_observation_release_gate_catalog', 'sanitized release gate catalog exists');

select is((select count(*) from public.global_observation_intake_controls), 1::bigint, 'one intake policy is active');
select is((select source_family_target from public.global_observation_intake_controls), 8, 'source-family target is explicit');
select is((select normalization_contract_target from public.global_observation_intake_controls), 9, 'normalization target is explicit');
select is((select quarantine_lane_target from public.global_observation_intake_controls), 8, 'quarantine-lane target is explicit');
select ok((select immutable_provenance_required from public.global_observation_intake_controls), 'immutable provenance is mandatory');
select ok((select source_rights_required from public.global_observation_intake_controls), 'source rights are mandatory');
select ok((select schema_validation_required from public.global_observation_intake_controls), 'schema validation is mandatory');
select ok((select unit_normalization_required from public.global_observation_intake_controls), 'unit normalization is mandatory');
select ok((select temporal_lineage_required from public.global_observation_intake_controls), 'temporal lineage is mandatory');
select ok((select independent_corroboration_required from public.global_observation_intake_controls), 'independent corroboration is mandatory');
select ok((select conflict_quarantine_required from public.global_observation_intake_controls), 'conflict quarantine is mandatory');
select ok((select human_release_review_required from public.global_observation_intake_controls), 'human release is mandatory');
select ok(not exists(
  select 1 from public.global_observation_intake_controls
  where live_provider_connectivity_enabled or production_ingestion_enabled
    or automatic_normalization_approval_enabled or automatic_conflict_resolution_enabled
    or automatic_release_enabled or model_training_enabled
    or autonomous_publication_enabled or autonomous_trade_execution_enabled
), 'connectivity, ingestion, automation, training, publication and execution remain locked');

select is((select count(*) from public.global_observation_source_connectors), 8::bigint, 'eight source families are defined');
select ok((select bool_and(connector_status = 'not_connected') from public.global_observation_source_connectors), 'every source family is disconnected');
select ok(not exists(
  select 1 from public.global_observation_source_connectors
  where endpoint_approved or credentials_configured or retention_approved
    or display_rights_approved or derivation_rights_approved
    or model_use_rights_approved or production_ingestion_enabled
), 'no connector, credential, right or ingestion path is approved');

select is((select count(*) from public.global_observation_normalization_contracts), 9::bigint, 'nine normalization contracts are defined');
select ok((select bool_and(required_for_quarantine_entry and required_for_release and null_fabrication_forbidden)
  from public.global_observation_normalization_contracts), 'every normalization contract is mandatory and forbids fabricated nulls');
select ok(not exists(select 1 from public.global_observation_normalization_contracts where automatic_approval_enabled), 'normalization cannot be auto-approved');

select is((select count(*) from public.global_observation_quarantine_lanes), 8::bigint, 'one quarantine lane exists per source family');
select ok((select bool_and(lane_status = 'provider_not_connected') from public.global_observation_quarantine_lanes), 'every quarantine lane is blocked on provider approval');
select ok(not exists(
  select 1 from public.global_observation_quarantine_lanes
  where candidate_observation_count <> 0 or schema_valid_count <> 0
    or corroborated_count <> 0 or conflict_count <> 0 or released_observation_count <> 0
), 'quarantine lanes contain no candidate, validated, corroborated, conflicting or released observations');
select ok(not exists(
  select 1 from public.global_observation_quarantine_lanes
  where latest_received_at is not null or latest_released_at is not null or provenance_digest is not null
), 'quarantine lanes contain no invented timestamps or provenance');
select ok(not exists(
  select 1 from public.global_observation_quarantine_lanes
  where publication_eligible or model_eligible or production_effect
), 'quarantine lanes have no publication, model or production effect');

select is((select count(*) from public.global_observation_release_gate_templates), 8::bigint, 'eight observation release gates exist');
select ok((select bool_and(blocks_publication and blocks_model_use and blocks_downstream_analysis)
  from public.global_observation_release_gate_templates), 'every gate blocks publication, model use and downstream analysis');
select ok(not exists(select 1 from public.global_observation_release_gate_templates where automatic_approval_enabled), 'no release gate permits automatic approval');

select ok(has_table_privilege('anon', 'public.global_observation_intake_status', 'SELECT'), 'guests can read sanitized intake status');
select ok(has_table_privilege('anon', 'public.global_observation_source_catalog', 'SELECT'), 'guests can read the sanitized source catalog');
select ok(not has_table_privilege('anon', 'public.global_observation_quarantine_lanes', 'INSERT'), 'browser roles cannot forge quarantine evidence');
select ok(not has_table_privilege('authenticated', 'public.global_observation_source_connectors', 'UPDATE'), 'browser roles cannot alter connector policy');
select ok(coalesce((
  select bool_and(reloptions @> array['security_invoker=true'])
  from pg_class where oid in (
    'public.global_observation_intake_status'::regclass,
    'public.global_observation_source_catalog'::regclass,
    'public.global_observation_normalization_catalog'::regclass,
    'public.global_observation_release_gate_catalog'::regclass
  )
), false), 'observation provenance views preserve caller permissions');
select ok(to_regprocedure('public.connect_global_observation_provider(text)') is null, 'no provider connection RPC exists');
select ok(to_regprocedure('public.release_global_observation(text)') is null, 'no observation release RPC exists');
select ok(not exists(
  select 1 from public.global_dependency_transmission_controls
  where live_provider_connectivity_enabled or automatic_relationship_inference_enabled
    or generated_dependency_fill_enabled or automatic_impact_scoring_enabled
    or production_scenario_promotion_enabled or model_training_enabled
    or autonomous_publication_enabled or autonomous_trade_execution_enabled
), 'earlier dependency and execution locks remain closed');

select set_config('request.jwt.claim.role', 'service_role', true);
select throws_ok(
  $$update public.global_observation_source_connectors set display_name = display_name || ' changed' where id = 1$$,
  'P0001', 'Global observation provenance reference records are append-only',
  'source connector contracts are append-only'
);
select throws_ok(
  $$delete from public.global_observation_quarantine_lanes where id = 1$$,
  'P0001', 'Global observation provenance reference records are append-only',
  'quarantine readiness gaps are append-only'
);

select * from finish();
rollback;
