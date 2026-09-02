begin;

select plan(67);

select ok(to_regclass('public.payment_compliance_orchestration_controls') is not null, 'payment compliance controls exist');
select ok(to_regclass('public.payment_compliance_workflow_requirements') is not null, 'payment compliance requirements exist');
select ok(to_regclass('public.payment_compliance_orchestration_reference') is not null, 'sanitized compliance reference exists');
select is((select count(*) from public.payment_compliance_orchestration_controls), 1::bigint, 'one compliance control is seeded');
select is((select data_mode from public.payment_compliance_orchestration_controls), 'synthetic_case_rehearsal', 'data mode is explicitly synthetic');
select is((select workspace_enabled from public.payment_compliance_orchestration_controls), true, 'compliance workspace is enabled');
select is((select synthetic_case_rehearsal_enabled from public.payment_compliance_orchestration_controls), true, 'synthetic case rehearsal is enabled');
select is((select real_identity_collection_enabled from public.payment_compliance_orchestration_controls), false, 'real identity collection is disabled');
select is((select document_upload_enabled from public.payment_compliance_orchestration_controls), false, 'document upload is disabled');
select is((select pii_storage_enabled from public.payment_compliance_orchestration_controls), false, 'PII storage is disabled');
select is((select compliance_provider_connectivity_enabled from public.payment_compliance_orchestration_controls), false, 'compliance provider connectivity is disabled');
select is((select live_sanctions_screening_enabled from public.payment_compliance_orchestration_controls), false, 'live sanctions screening is disabled');
select is((select transaction_monitoring_connectivity_enabled from public.payment_compliance_orchestration_controls), false, 'transaction monitoring connectivity is disabled');
select is((select travel_rule_transmission_enabled from public.payment_compliance_orchestration_controls), false, 'travel-rule transmission is disabled');
select is((select compliance_case_writes_enabled from public.payment_compliance_orchestration_controls), false, 'compliance case writes are disabled');
select is((select automated_clearance_enabled from public.payment_compliance_orchestration_controls), false, 'automated clearance is disabled');
select is((select manual_override_enabled from public.payment_compliance_orchestration_controls), false, 'manual override is disabled');
select is((select quote_acceptance_enabled from public.payment_compliance_orchestration_controls), false, 'quote acceptance is disabled');
select is((select transfer_creation_enabled from public.payment_compliance_orchestration_controls), false, 'transfer creation is disabled');
select is((select payment_execution_enabled from public.payment_compliance_orchestration_controls), false, 'payment execution is disabled');
select is((select money_movement_enabled from public.payment_compliance_orchestration_controls), false, 'money movement is disabled');

select is((select count(*) from public.payment_compliance_workflow_requirements), 28::bigint, 'seven requirements are mapped for each enabled corridor');
select is((select count(distinct corridor_id) from public.payment_compliance_workflow_requirements), 4::bigint, 'all four enabled corridors are mapped');
select ok(exists(select 1 from public.payment_compliance_workflow_requirements where stage_key = 'kyc' and customer_type = 'individual'), 'individual KYC is mapped');
select ok(exists(select 1 from public.payment_compliance_workflow_requirements where stage_key = 'kyb' and customer_type = 'business'), 'business KYB is mapped');
select ok(exists(select 1 from public.payment_compliance_workflow_requirements where stage_key = 'aml'), 'AML is mapped');
select ok(exists(select 1 from public.payment_compliance_workflow_requirements where stage_key = 'sanctions'), 'sanctions screening is mapped');
select ok(exists(select 1 from public.payment_compliance_workflow_requirements where stage_key = 'transaction_monitoring'), 'transaction monitoring is mapped');
select ok(exists(select 1 from public.payment_compliance_workflow_requirements where stage_key = 'travel_rule'), 'travel-rule applicability is mapped');
select ok(exists(select 1 from public.payment_compliance_workflow_requirements where stage_key = 'audit'), 'audit evidence is mapped');
select ok((select bool_and(enabled) from public.payment_compliance_workflow_requirements), 'all seeded requirements are enabled');
select ok((select bool_and(outcome in ('review_required', 'blocked')) from public.payment_compliance_workflow_requirements), 'all outcomes remain non-clearing');
select is((select count(*) from public.payment_compliance_workflow_requirements where outcome = 'blocked'), 8::bigint, 'sanctions and travel-rule gates block every corridor');
select ok((select bool_and(char_length(evidence_required) >= 10) from public.payment_compliance_workflow_requirements), 'every stage has an evidence map');
select ok((select bool_and(char_length(customer_action) >= 10) from public.payment_compliance_workflow_requirements), 'every stage has a customer-safe response');

select ok((select bool_and(relrowsecurity) from pg_class where oid in (
  'public.payment_compliance_orchestration_controls'::regclass,
  'public.payment_compliance_workflow_requirements'::regclass
)), 'payment compliance relations use RLS');
select ok(exists(select 1 from pg_policies where tablename = 'payment_compliance_orchestration_controls' and policyname = 'Public reads payment compliance locks'), 'public reads compliance locks');
select ok(exists(select 1 from pg_policies where tablename = 'payment_compliance_workflow_requirements' and policyname = 'Public reads enabled synthetic compliance requirements'), 'public reads enabled synthetic requirements');
select ok(not has_table_privilege('anon', 'public.payment_compliance_orchestration_controls', 'INSERT'), 'anonymous users cannot alter compliance controls');
select ok(not has_table_privilege('authenticated', 'public.payment_compliance_workflow_requirements', 'UPDATE'), 'customers cannot alter compliance requirements');
select ok(not has_table_privilege('service_role', 'public.payment_compliance_workflow_requirements', 'INSERT'), 'service role cannot add undeclared compliance requirements');
select ok(has_table_privilege('anon', 'public.payment_compliance_orchestration_reference', 'SELECT'), 'anonymous users can read the sanitized compliance map');

select is((select count(*) from public.payment_compliance_orchestration_reference), 28::bigint, 'sanitized view exposes all corridor requirements');
select ok((select bool_and(data_mode = 'synthetic_case_rehearsal') from public.payment_compliance_orchestration_reference), 'view labels every requirement as synthetic');
select ok((select bool_and(not real_identity_collection_enabled) from public.payment_compliance_orchestration_reference), 'view exposes identity collection lock');
select ok((select bool_and(not document_upload_enabled) from public.payment_compliance_orchestration_reference), 'view exposes document upload lock');
select ok((select bool_and(not pii_storage_enabled) from public.payment_compliance_orchestration_reference), 'view exposes PII storage lock');
select ok((select bool_and(not compliance_provider_connectivity_enabled) from public.payment_compliance_orchestration_reference), 'view exposes provider connectivity lock');
select ok((select bool_and(not live_sanctions_screening_enabled) from public.payment_compliance_orchestration_reference), 'view exposes live sanctions lock');
select ok((select bool_and(not transaction_monitoring_connectivity_enabled) from public.payment_compliance_orchestration_reference), 'view exposes monitoring connectivity lock');
select ok((select bool_and(not travel_rule_transmission_enabled) from public.payment_compliance_orchestration_reference), 'view exposes travel-rule transmission lock');
select ok((select bool_and(not compliance_case_writes_enabled) from public.payment_compliance_orchestration_reference), 'view exposes case-write lock');
select ok((select bool_and(not automated_clearance_enabled) from public.payment_compliance_orchestration_reference), 'view exposes automated-clearance lock');
select ok((select bool_and(not manual_override_enabled) from public.payment_compliance_orchestration_reference), 'view exposes manual-override lock');
select ok((select bool_and(not quote_acceptance_enabled) from public.payment_compliance_orchestration_reference), 'view exposes quote-acceptance lock');
select ok((select bool_and(not transfer_creation_enabled) from public.payment_compliance_orchestration_reference), 'view exposes transfer-creation lock');
select ok((select bool_and(not payment_execution_enabled) from public.payment_compliance_orchestration_reference), 'view exposes payment-execution lock');
select ok((select bool_and(not money_movement_enabled) from public.payment_compliance_orchestration_reference), 'view exposes money-movement lock');

select ok(not exists(
  select 1 from information_schema.columns
  where table_schema = 'public'
    and table_name in ('payment_compliance_workflow_requirements', 'payment_compliance_orchestration_reference')
    and column_name in ('full_name', 'date_of_birth', 'address', 'document_number', 'account_number', 'routing_number', 'beneficiary_name', 'provider_token', 'credential')
), 'compliance reference data contains no identity, beneficiary or provider identifiers');
select ok(to_regclass('public.payment_compliance_cases') is null, 'compliance case storage remains absent');
select ok(to_regclass('public.payment_identity_documents') is null, 'identity document storage remains absent');
select ok(to_regprocedure('public.clear_payment_compliance(jsonb)') is null, 'compliance clearance RPC remains absent');
select ok(to_regprocedure('public.create_payment_compliance_case(jsonb)') is null, 'compliance case RPC remains absent');
select ok(not exists(select 1 from public.payment_intents where status <> 'disabled'), 'payment intents remain disabled');
select ok(not exists(select 1 from public.payment_quotes where status = 'accepted'), 'no accepted payment quote exists');
select ok(to_regclass('public.payment_transactions') is null, 'payment transaction storage remains absent');
select ok(not exists(select 1 from public.brokerage_execution_controls where execution_enabled), 'brokerage execution remains locked');

select * from finish();
rollback;
