begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(46);

select has_table('public', 'licensed_provider_commercial_readiness_controls', 'licensed provider commercial controls exist');
select has_table('public', 'licensed_provider_commercial_readiness_state_templates', 'commercial review states exist');
select has_table('public', 'licensed_provider_commercial_domain_templates', 'commercial review domains exist');
select has_table('public', 'licensed_provider_commercial_gate_templates', 'commercial review gates exist');
select has_table('public', 'licensed_provider_commercial_readiness_matrix', 'commercial readiness matrix exists');
select has_view('public', 'licensed_provider_commercial_readiness_status', 'sanitized commercial status exists');
select has_view('public', 'licensed_provider_commercial_state_catalog', 'sanitized commercial states exist');
select has_view('public', 'licensed_provider_commercial_domain_catalog', 'sanitized commercial domains exist');
select has_view('public', 'licensed_provider_commercial_gate_catalog', 'sanitized commercial gates exist');
select has_view('public', 'licensed_provider_commercial_readiness_catalog', 'sanitized readiness matrix exists');

select is((select count(*) from public.licensed_provider_commercial_readiness_controls), 1::bigint, 'one commercial-readiness policy is active');
select is((select commercial_domain_target from public.licensed_provider_commercial_readiness_controls), 8, 'eight commercial domains are targeted');
select is((select commercial_gate_target from public.licensed_provider_commercial_readiness_controls), 8, 'eight commercial gates are targeted');
select is((select readiness_cell_target from public.licensed_provider_commercial_readiness_controls), 64, 'sixty-four readiness cells are targeted');
select is((select commercial_state_target from public.licensed_provider_commercial_readiness_controls), 7, 'seven commercial states are targeted');
select ok((select corporate_identity_and_beneficial_ownership_required
  and product_coverage_and_rights_schedule_required
  and entitlement_and_redistribution_terms_required
  and commercial_pricing_and_cost_ceiling_required
  and security_privacy_and_subprocessor_review_required
  and service_level_support_and_incident_terms_required
  and implementation_acceptance_and_change_control_required
  and exit_portability_deletion_and_termination_required
  and independent_human_commercial_authorization_required
  from public.licensed_provider_commercial_readiness_controls), 'corporate, rights, entitlement, pricing, security, service, implementation, exit and independent authorization are required');
select ok(not exists(
  select 1 from public.licensed_provider_commercial_readiness_controls
  where provider_shortlisted or pricing_quote_accepted or contract_signed
    or purchase_order_issued or provider_selected or live_provider_connectivity_enabled
    or production_credential_storage_enabled or production_payload_intake_enabled
    or live_data_display_enabled or derived_data_publication_enabled or model_training_enabled
    or external_audience_activation_enabled or public_signup_enabled or live_order_routing_enabled
    or payment_execution_enabled or money_movement_enabled or custody_enabled or settlement_enabled
), 'shortlist, quote, contract, purchasing, provider access, payloads and production remain locked');

select is((select commercial_domain_count from public.licensed_provider_commercial_readiness_status), 8, 'status reports eight commercial domains');
select is((select commercial_gate_count from public.licensed_provider_commercial_readiness_status), 8, 'status reports eight commercial gates');
select is((select commercial_state_count from public.licensed_provider_commercial_readiness_status), 7, 'status reports seven commercial states');
select is((select readiness_cell_count from public.licensed_provider_commercial_readiness_status), 64, 'status reports sixty-four readiness cells');
select is((select blocked_readiness_cell_count from public.licensed_provider_commercial_readiness_status), 64, 'status reports sixty-four blocked cells');
select is((select authorized_readiness_cell_count from public.licensed_provider_commercial_readiness_status), 0, 'status reports zero authorized cells');

select is((select count(*) from public.licensed_provider_commercial_readiness_state_templates), 7::bigint, 'seven commercial state templates exist');
select ok((select bool_and(not provider_present and not real_evidence_present
  and not automatic_transition_enabled and human_commercial_authorization_required
  and not provider_selection_effect and not commercial_commitment_effect
  and not contract_signature_effect and not credential_access_effect and not payload_intake_effect
  and not live_display_effect and not production_effect)
  from public.licensed_provider_commercial_readiness_state_templates), 'commercial states are empty, manual and non-production');

select is((select count(*) from public.licensed_provider_commercial_domain_templates), 8::bigint, 'eight commercial domain templates exist');
select is((select count(distinct domain_key) from public.licensed_provider_commercial_domain_templates), 8::bigint, 'commercial domain keys are unique');
select ok((select bool_and(availability_status = 'unavailable' and not provider_shortlisted
  and not real_evidence_present and not quote_present and not contract_present
  and not commercial_commitment_enabled and not production_effect)
  from public.licensed_provider_commercial_domain_templates), 'every commercial domain is unavailable, empty and non-production');

select is((select count(*) from public.licensed_provider_commercial_gate_templates), 8::bigint, 'eight commercial gate templates exist');
select is((select count(distinct gate_key) from public.licensed_provider_commercial_gate_templates), 8::bigint, 'commercial gate keys are unique');
select is((select count(distinct review_domain) from public.licensed_provider_commercial_gate_templates), 8::bigint, 'eight review domains are represented');
select ok((select bool_and(gate_status = 'unmet' and not real_evidence_present
  and not reviewer_assigned and not human_authorized)
  from public.licensed_provider_commercial_gate_templates), 'every commercial gate is unmet, empty and unauthorized');

select is((select count(*) from public.licensed_provider_commercial_readiness_matrix), 64::bigint, 'sixty-four commercial readiness cells exist');
select ok(not exists(
  select domain_template_id from public.licensed_provider_commercial_readiness_matrix
  group by domain_template_id having count(*) <> 8
), 'each commercial domain has eight commercial gates');
select ok((select bool_and(readiness_status = 'blocked' and not human_authorized)
  from public.licensed_provider_commercial_readiness_matrix), 'every readiness cell is blocked and unauthorized');
select ok(not exists(
  select 1 from public.licensed_provider_commercial_readiness_matrix
  where provider_reference is not null or evidence_reference is not null
    or quote_reference is not null or contract_reference is not null
    or pricing_reference is not null or security_review_reference is not null
    or reviewer_identity is not null or authorization_reference is not null
    or exit_plan_reference is not null
    or verified_at is not null or expires_at is not null
    or provider_selection_effect or commercial_commitment_effect or contract_signature_effect
    or credential_access_effect or provider_egress_effect or payload_intake_effect
    or live_display_effect or audience_effect or publication_effect
    or financial_execution_effect or release_effect or production_effect
), 'readiness cells contain no shortlist, quote, contract, commitment, credential, payload, audience, release or production effect');

select ok(has_table_privilege('anon', 'public.licensed_provider_commercial_readiness_status', 'SELECT'), 'guests can read sanitized commercial status');
select ok(has_table_privilege('anon', 'public.licensed_provider_commercial_readiness_catalog', 'SELECT'), 'guests can read blocked commercial matrix');
select ok(not has_table_privilege('anon', 'public.licensed_provider_commercial_gate_templates', 'INSERT'), 'browser roles cannot create commercial gates');
select ok(not has_table_privilege('authenticated', 'public.licensed_provider_commercial_readiness_matrix', 'UPDATE'), 'browser roles cannot authorize commercial readiness');
select ok(coalesce((
  select bool_and(reloptions @> array['security_invoker=true'])
  from pg_class where oid in (
    'public.licensed_provider_commercial_readiness_status'::regclass,
    'public.licensed_provider_commercial_state_catalog'::regclass,
    'public.licensed_provider_commercial_domain_catalog'::regclass,
    'public.licensed_provider_commercial_gate_catalog'::regclass,
    'public.licensed_provider_commercial_readiness_catalog'::regclass
  )
), false), 'licensed provider commercial views preserve caller permissions');
select ok(to_regprocedure('public.authorize_licensed_provider_commercial_readiness(jsonb)') is null, 'no commercial authorization RPC exists');
select ok(to_regprocedure('public.connect_licensed_provider_commercial_provider(text)') is null, 'no provider connection RPC exists');
select ok(to_regprocedure('public.sign_licensed_provider_contract(text)') is null, 'no provider contract signature RPC exists');

select set_config('request.jwt.claim.role', 'service_role', true);
select throws_ok(
  $$update public.licensed_provider_commercial_gate_templates set gate_status = 'met' where id = 1$$,
  'P0001', 'Licensed provider commercial-readiness reference records are append-only',
  'commercial gate templates are append-only'
);
select throws_ok(
  $$delete from public.licensed_provider_commercial_readiness_matrix where id = 1$$,
  'P0001', 'Licensed provider commercial-readiness reference records are append-only',
  'commercial readiness matrix is append-only'
);

select * from finish();
rollback;
