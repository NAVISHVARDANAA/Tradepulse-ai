begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(45);

select has_table('public', 'external_audience_launch_controls', 'external audience launch controls exist');
select has_table('public', 'external_audience_launch_state_templates', 'external audience launch states exist');
select has_table('public', 'external_audience_launch_surface_templates', 'external audience launch surfaces exist');
select has_table('public', 'external_audience_launch_gate_templates', 'external audience launch gates exist');
select has_table('public', 'external_audience_launch_readiness_matrix', 'external audience launch matrix exists');
select has_view('public', 'external_audience_launch_status', 'sanitized launch status exists');
select has_view('public', 'external_audience_launch_state_catalog', 'sanitized launch states exist');
select has_view('public', 'external_audience_launch_surface_catalog', 'sanitized launch surfaces exist');
select has_view('public', 'external_audience_launch_gate_catalog', 'sanitized launch gates exist');
select has_view('public', 'external_audience_launch_readiness_catalog', 'sanitized launch matrix exists');

select is((select count(*) from public.external_audience_launch_controls), 1::bigint, 'one launch policy is active');
select is((select audience_surface_target from public.external_audience_launch_controls), 8, 'eight audience surfaces are targeted');
select is((select launch_gate_target from public.external_audience_launch_controls), 8, 'eight launch gates are targeted');
select is((select readiness_cell_target from public.external_audience_launch_controls), 64, 'sixty-four readiness cells are targeted');
select is((select launch_state_target from public.external_audience_launch_controls), 7, 'seven launch states are targeted');
select ok((select protected_production_domain_required and exact_auth_origin_and_redirects_required
  and custom_auth_delivery_and_abuse_controls_required
  and published_legal_privacy_risk_support_required
  and production_monitoring_on_call_incident_required
  and approved_external_cohort_and_feedback_required
  and accessibility_performance_capacity_evidence_required
  and data_rights_freshness_and_labels_required
  and release_rollback_expiry_required and independent_human_launch_authorization_required
  from public.external_audience_launch_controls), 'domain, identity, legal, operations, cohort, quality, data, release and independent authorization are required');
select ok(not exists(
  select 1 from public.external_audience_launch_controls
  where public_signup_enabled or unrestricted_discovery_enabled
    or automated_tester_provisioning_enabled or external_audience_activation_enabled
    or live_provider_connectivity_enabled or production_credential_storage_enabled
    or production_payload_intake_enabled or unrestricted_customer_data_collection_enabled
    or autonomous_publication_enabled or model_training_enabled or live_order_routing_enabled
    or payment_execution_enabled or money_movement_enabled or custody_enabled or settlement_enabled
), 'audience activation, providers, publication and financial execution remain locked');

select is((select audience_surface_count from public.external_audience_launch_status), 8, 'status reports eight audience surfaces');
select is((select launch_gate_count from public.external_audience_launch_status), 8, 'status reports eight launch gates');
select is((select launch_state_count from public.external_audience_launch_status), 7, 'status reports seven launch states');
select is((select readiness_cell_count from public.external_audience_launch_status), 64, 'status reports sixty-four readiness cells');
select is((select blocked_readiness_cell_count from public.external_audience_launch_status), 64, 'status reports sixty-four blocked cells');
select is((select authorized_readiness_cell_count from public.external_audience_launch_status), 0, 'status reports zero authorized cells');

select is((select count(*) from public.external_audience_launch_state_templates), 7::bigint, 'seven launch state templates exist');
select ok((select bool_and(not real_audience_present and not automatic_transition_enabled
  and human_launch_authorization_required and not public_access_effect
  and not customer_data_effect and not financial_execution_effect and not production_effect)
  from public.external_audience_launch_state_templates), 'launch states are empty, manual and non-production');

select is((select count(*) from public.external_audience_launch_surface_templates), 8::bigint, 'eight launch surface templates exist');
select is((select count(distinct surface_key) from public.external_audience_launch_surface_templates), 8::bigint, 'launch surface keys are unique');
select ok((select bool_and(audience_access_status = 'unavailable' and not real_audience_present
  and not customer_data_enabled and not financial_execution_enabled and not production_effect)
  from public.external_audience_launch_surface_templates), 'every audience surface is unavailable and non-production');

select is((select count(*) from public.external_audience_launch_gate_templates), 8::bigint, 'eight launch gate templates exist');
select is((select count(distinct gate_key) from public.external_audience_launch_gate_templates), 8::bigint, 'launch gate keys are unique');
select is((select count(distinct launch_domain) from public.external_audience_launch_gate_templates), 8::bigint, 'eight launch domains are represented');
select ok((select bool_and(gate_status = 'unmet' and not real_evidence_present
  and not reviewer_assigned and not human_authorized)
  from public.external_audience_launch_gate_templates), 'every launch gate is unmet, empty and unauthorized');

select is((select count(*) from public.external_audience_launch_readiness_matrix), 64::bigint, 'sixty-four launch readiness cells exist');
select ok(not exists(
  select surface_template_id from public.external_audience_launch_readiness_matrix
  group by surface_template_id having count(*) <> 8
), 'each audience surface has eight launch gates');
select ok((select bool_and(readiness_status = 'blocked' and not human_authorized)
  from public.external_audience_launch_readiness_matrix), 'every readiness cell is blocked and unauthorized');
select ok(not exists(
  select 1 from public.external_audience_launch_readiness_matrix
  where evidence_reference is not null or reviewer_identity is not null
    or authorization_reference is not null or cohort_reference is not null
    or rollback_reference is not null or verified_at is not null or expires_at is not null
    or public_access_effect or account_provisioning_effect or customer_data_effect
    or live_provider_effect or publication_effect or financial_execution_effect
    or release_effect or production_effect
), 'readiness cells contain no evidence, identity, cohort, access, data, provider, publication, financial, release or production effect');

select ok(has_table_privilege('anon', 'public.external_audience_launch_status', 'SELECT'), 'guests can read sanitized launch status');
select ok(has_table_privilege('anon', 'public.external_audience_launch_readiness_catalog', 'SELECT'), 'guests can read blocked launch matrix');
select ok(not has_table_privilege('anon', 'public.external_audience_launch_gate_templates', 'INSERT'), 'browser roles cannot create launch gates');
select ok(not has_table_privilege('authenticated', 'public.external_audience_launch_readiness_matrix', 'UPDATE'), 'browser roles cannot authorize a launch');
select ok(coalesce((
  select bool_and(reloptions @> array['security_invoker=true'])
  from pg_class where oid in (
    'public.external_audience_launch_status'::regclass,
    'public.external_audience_launch_state_catalog'::regclass,
    'public.external_audience_launch_surface_catalog'::regclass,
    'public.external_audience_launch_gate_catalog'::regclass,
    'public.external_audience_launch_readiness_catalog'::regclass
  )
), false), 'external audience launch views preserve caller permissions');
select ok(to_regprocedure('public.authorize_external_audience_launch(jsonb)') is null, 'no audience authorization RPC exists');
select ok(to_regprocedure('public.activate_external_audience(text)') is null, 'no audience activation RPC exists');

select set_config('request.jwt.claim.role', 'service_role', true);
select throws_ok(
  $$update public.external_audience_launch_gate_templates set gate_status = 'met' where id = 1$$,
  'P0001', 'External audience launch-readiness reference records are append-only',
  'launch gate templates are append-only'
);
select throws_ok(
  $$delete from public.external_audience_launch_readiness_matrix where id = 1$$,
  'P0001', 'External audience launch-readiness reference records are append-only',
  'launch readiness matrix is append-only'
);

select * from finish();
rollback;
