begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(46);

select has_table('public', 'licensed_live_data_integration_controls', 'licensed live-data controls exist');
select has_table('public', 'licensed_live_data_integration_state_templates', 'licensed live-data states exist');
select has_table('public', 'licensed_live_data_feed_templates', 'licensed feed templates exist');
select has_table('public', 'licensed_live_data_gate_templates', 'licensed live-data gates exist');
select has_table('public', 'licensed_live_data_readiness_matrix', 'licensed live-data matrix exists');
select has_view('public', 'licensed_live_data_integration_status', 'sanitized integration status exists');
select has_view('public', 'licensed_live_data_state_catalog', 'sanitized integration states exist');
select has_view('public', 'licensed_live_data_feed_catalog', 'sanitized feed classes exist');
select has_view('public', 'licensed_live_data_gate_catalog', 'sanitized integration gates exist');
select has_view('public', 'licensed_live_data_readiness_catalog', 'sanitized readiness matrix exists');

select is((select count(*) from public.licensed_live_data_integration_controls), 1::bigint, 'one integration policy is active');
select is((select feed_class_target from public.licensed_live_data_integration_controls), 8, 'eight feed classes are targeted');
select is((select integration_gate_target from public.licensed_live_data_integration_controls), 8, 'eight integration gates are targeted');
select is((select readiness_cell_target from public.licensed_live_data_integration_controls), 64, 'sixty-four readiness cells are targeted');
select is((select integration_state_target from public.licensed_live_data_integration_controls), 7, 'seven integration states are targeted');
select ok((select executed_data_license_required and permitted_display_and_derived_use_required
  and jurisdiction_and_audience_entitlements_required
  and credential_vault_and_egress_controls_required
  and schema_identity_and_corporate_action_mapping_required
  and freshness_clock_quality_and_gap_controls_required
  and quota_backpressure_replay_and_failover_required
  and observability_cost_incident_and_rollback_required
  and independent_human_integration_authorization_required
  from public.licensed_live_data_integration_controls), 'license, entitlements, security, mapping, quality, resilience, operations, rollback and independent authorization are required');
select ok(not exists(
  select 1 from public.licensed_live_data_integration_controls
  where provider_selected or live_provider_connectivity_enabled
    or production_credential_storage_enabled or production_payload_intake_enabled
    or live_data_display_enabled or derived_data_publication_enabled or model_training_enabled
    or external_audience_activation_enabled or public_signup_enabled or live_order_routing_enabled
    or payment_execution_enabled or money_movement_enabled or custody_enabled or settlement_enabled
), 'provider, credentials, payloads, audience, publication and financial execution remain locked');

select is((select feed_class_count from public.licensed_live_data_integration_status), 8, 'status reports eight feed classes');
select is((select integration_gate_count from public.licensed_live_data_integration_status), 8, 'status reports eight integration gates');
select is((select integration_state_count from public.licensed_live_data_integration_status), 7, 'status reports seven integration states');
select is((select readiness_cell_count from public.licensed_live_data_integration_status), 64, 'status reports sixty-four readiness cells');
select is((select blocked_readiness_cell_count from public.licensed_live_data_integration_status), 64, 'status reports sixty-four blocked cells');
select is((select authorized_readiness_cell_count from public.licensed_live_data_integration_status), 0, 'status reports zero authorized cells');

select is((select count(*) from public.licensed_live_data_integration_state_templates), 7::bigint, 'seven integration state templates exist');
select ok((select bool_and(not provider_present and not real_evidence_present
  and not automatic_transition_enabled and human_integration_authorization_required
  and not credential_access_effect and not payload_intake_effect
  and not live_display_effect and not production_effect)
  from public.licensed_live_data_integration_state_templates), 'integration states are empty, manual and non-production');

select is((select count(*) from public.licensed_live_data_feed_templates), 8::bigint, 'eight licensed feed templates exist');
select is((select count(distinct feed_key) from public.licensed_live_data_feed_templates), 8::bigint, 'licensed feed keys are unique');
select ok((select bool_and(availability_status = 'unavailable' and not provider_selected
  and not rights_evidence_present and not credential_present and not real_payload_present
  and not live_display_enabled and not production_effect)
  from public.licensed_live_data_feed_templates), 'every feed class is unavailable, empty and non-production');

select is((select count(*) from public.licensed_live_data_gate_templates), 8::bigint, 'eight integration gate templates exist');
select is((select count(distinct gate_key) from public.licensed_live_data_gate_templates), 8::bigint, 'integration gate keys are unique');
select is((select count(distinct integration_domain) from public.licensed_live_data_gate_templates), 8::bigint, 'eight integration domains are represented');
select ok((select bool_and(gate_status = 'unmet' and not real_evidence_present
  and not reviewer_assigned and not human_authorized)
  from public.licensed_live_data_gate_templates), 'every integration gate is unmet, empty and unauthorized');

select is((select count(*) from public.licensed_live_data_readiness_matrix), 64::bigint, 'sixty-four integration readiness cells exist');
select ok(not exists(
  select feed_template_id from public.licensed_live_data_readiness_matrix
  group by feed_template_id having count(*) <> 8
), 'each feed class has eight integration gates');
select ok((select bool_and(readiness_status = 'blocked' and not human_authorized)
  from public.licensed_live_data_readiness_matrix), 'every readiness cell is blocked and unauthorized');
select ok(not exists(
  select 1 from public.licensed_live_data_readiness_matrix
  where provider_reference is not null or evidence_reference is not null
    or entitlement_reference is not null or credential_reference is not null
    or adapter_reference is not null or reviewer_identity is not null
    or authorization_reference is not null or rollback_reference is not null
    or verified_at is not null or expires_at is not null
    or credential_access_effect or provider_egress_effect or payload_intake_effect
    or live_display_effect or audience_effect or publication_effect
    or financial_execution_effect or release_effect or production_effect
), 'readiness cells contain no provider, evidence, entitlement, credential, adapter, audience, publication, financial, release or production effect');

select ok(has_table_privilege('anon', 'public.licensed_live_data_integration_status', 'SELECT'), 'guests can read sanitized integration status');
select ok(has_table_privilege('anon', 'public.licensed_live_data_readiness_catalog', 'SELECT'), 'guests can read blocked integration matrix');
select ok(not has_table_privilege('anon', 'public.licensed_live_data_gate_templates', 'INSERT'), 'browser roles cannot create integration gates');
select ok(not has_table_privilege('authenticated', 'public.licensed_live_data_readiness_matrix', 'UPDATE'), 'browser roles cannot authorize an integration');
select ok(coalesce((
  select bool_and(reloptions @> array['security_invoker=true'])
  from pg_class where oid in (
    'public.licensed_live_data_integration_status'::regclass,
    'public.licensed_live_data_state_catalog'::regclass,
    'public.licensed_live_data_feed_catalog'::regclass,
    'public.licensed_live_data_gate_catalog'::regclass,
    'public.licensed_live_data_readiness_catalog'::regclass
  )
), false), 'licensed live-data views preserve caller permissions');
select ok(to_regprocedure('public.authorize_licensed_live_data_integration(jsonb)') is null, 'no integration authorization RPC exists');
select ok(to_regprocedure('public.connect_licensed_live_data_provider(text)') is null, 'no provider connection RPC exists');
select ok(to_regprocedure('public.activate_licensed_live_data_feed(text)') is null, 'no live feed activation RPC exists');

select set_config('request.jwt.claim.role', 'service_role', true);
select throws_ok(
  $$update public.licensed_live_data_gate_templates set gate_status = 'met' where id = 1$$,
  'P0001', 'Licensed live-data integration reference records are append-only',
  'integration gate templates are append-only'
);
select throws_ok(
  $$delete from public.licensed_live_data_readiness_matrix where id = 1$$,
  'P0001', 'Licensed live-data integration reference records are append-only',
  'integration readiness matrix is append-only'
);

select * from finish();
rollback;
