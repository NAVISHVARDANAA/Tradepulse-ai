begin;

select plan(56);

select ok(to_regclass('public.payment_beneficiary_protection_controls') is not null, 'beneficiary protection controls exist');
select ok(to_regclass('public.payment_beneficiary_protection_rules') is not null, 'beneficiary protection rules exist');
select ok(to_regclass('public.payment_beneficiary_protection_reference') is not null, 'sanitized protection view exists');
select is((select count(*) from public.payment_beneficiary_protection_controls), 1::bigint, 'one beneficiary protection control is seeded');
select is((select data_mode from public.payment_beneficiary_protection_controls), 'synthetic_rehearsal', 'data mode is explicitly synthetic');
select is((select workspace_enabled from public.payment_beneficiary_protection_controls), true, 'protection workspace is enabled');
select is((select synthetic_rehearsal_enabled from public.payment_beneficiary_protection_controls), true, 'synthetic rehearsals are enabled');
select is((select real_beneficiary_collection_enabled from public.payment_beneficiary_protection_controls), false, 'real beneficiary collection is disabled');
select is((select beneficiary_identifier_storage_enabled from public.payment_beneficiary_protection_controls), false, 'beneficiary identifier storage is disabled');
select is((select validation_provider_connectivity_enabled from public.payment_beneficiary_protection_controls), false, 'validation provider connectivity is disabled');
select is((select beneficiary_creation_enabled from public.payment_beneficiary_protection_controls), false, 'beneficiary creation is disabled');
select is((select duplicate_override_enabled from public.payment_beneficiary_protection_controls), false, 'duplicate override is disabled');
select is((select cooling_off_bypass_enabled from public.payment_beneficiary_protection_controls), false, 'cooling-off bypass is disabled');
select is((select quote_acceptance_enabled from public.payment_beneficiary_protection_controls), false, 'quote acceptance is disabled');
select is((select transfer_creation_enabled from public.payment_beneficiary_protection_controls), false, 'transfer creation is disabled');
select is((select payment_execution_enabled from public.payment_beneficiary_protection_controls), false, 'payment execution is disabled');
select is((select money_movement_enabled from public.payment_beneficiary_protection_controls), false, 'money movement is disabled');

select is((select count(*) from public.payment_beneficiary_protection_rules), 7::bigint, 'seven protection rules are seeded');
select ok(exists(select 1 from public.payment_beneficiary_protection_rules where category = 'validation'), 'validation rules exist');
select ok(exists(select 1 from public.payment_beneficiary_protection_rules where category = 'duplicate'), 'duplicate rules exist');
select ok(exists(select 1 from public.payment_beneficiary_protection_rules where category = 'cooling_off'), 'cooling-off rules exist');
select ok(exists(select 1 from public.payment_beneficiary_protection_rules where category = 'scam'), 'scam-intervention rules exist');
select ok((select bool_and(enabled) from public.payment_beneficiary_protection_rules), 'all seeded rules are enabled');
select ok((select bool_and(outcome in ('manual_review', 'cooling_off', 'blocked')) from public.payment_beneficiary_protection_rules), 'all outcomes are non-executable');
select ok((select bool_and(cooling_off_hours > 0) from public.payment_beneficiary_protection_rules where outcome = 'cooling_off'), 'cooling-off rules have a mandatory pause');
select ok((select bool_and(cooling_off_hours = 0) from public.payment_beneficiary_protection_rules where outcome <> 'cooling_off'), 'other rules do not invent a pause');
select is((select count(distinct priority) from public.payment_beneficiary_protection_rules), 7::bigint, 'rule priorities are deterministic');
select ok((select bool_and(char_length(customer_message) >= 10) from public.payment_beneficiary_protection_rules), 'every rule has a customer explanation');
select ok((select bool_and(char_length(required_action) >= 10) from public.payment_beneficiary_protection_rules), 'every rule has a required response');

select ok((select bool_and(relrowsecurity) from pg_class where oid in (
  'public.payment_beneficiary_protection_controls'::regclass,
  'public.payment_beneficiary_protection_rules'::regclass
)), 'beneficiary protection relations use RLS');
select ok(exists(select 1 from pg_policies where tablename = 'payment_beneficiary_protection_controls' and policyname = 'Public reads beneficiary protection locks'), 'public reads beneficiary protection locks');
select ok(exists(select 1 from pg_policies where tablename = 'payment_beneficiary_protection_rules' and policyname = 'Public reads enabled beneficiary protection rules'), 'public reads enabled protection rules');
select ok(not has_table_privilege('anon', 'public.payment_beneficiary_protection_controls', 'INSERT'), 'anonymous users cannot alter protection controls');
select ok(not has_table_privilege('authenticated', 'public.payment_beneficiary_protection_rules', 'UPDATE'), 'customers cannot alter protection rules');
select ok(not has_table_privilege('service_role', 'public.payment_beneficiary_protection_rules', 'INSERT'), 'service role cannot add undeclared protection rules');
select ok(has_table_privilege('anon', 'public.payment_beneficiary_protection_reference', 'SELECT'), 'anonymous users can read sanitized protection rules');

select is((select count(*) from public.payment_beneficiary_protection_reference), 7::bigint, 'sanitized view exposes seven protection rules');
select ok((select bool_and(data_mode = 'synthetic_rehearsal') from public.payment_beneficiary_protection_reference), 'view labels every rule as synthetic');
select ok((select bool_and(not real_beneficiary_collection_enabled) from public.payment_beneficiary_protection_reference), 'view exposes beneficiary collection lock');
select ok((select bool_and(not beneficiary_identifier_storage_enabled) from public.payment_beneficiary_protection_reference), 'view exposes identifier storage lock');
select ok((select bool_and(not validation_provider_connectivity_enabled) from public.payment_beneficiary_protection_reference), 'view exposes provider validation lock');
select ok((select bool_and(not beneficiary_creation_enabled) from public.payment_beneficiary_protection_reference), 'view exposes beneficiary creation lock');
select ok((select bool_and(not duplicate_override_enabled) from public.payment_beneficiary_protection_reference), 'view exposes duplicate override lock');
select ok((select bool_and(not cooling_off_bypass_enabled) from public.payment_beneficiary_protection_reference), 'view exposes cooling-off bypass lock');
select ok((select bool_and(not quote_acceptance_enabled) from public.payment_beneficiary_protection_reference), 'view exposes quote acceptance lock');
select ok((select bool_and(not transfer_creation_enabled) from public.payment_beneficiary_protection_reference), 'view exposes transfer creation lock');
select ok((select bool_and(not payment_execution_enabled) from public.payment_beneficiary_protection_reference), 'view exposes payment execution lock');
select ok((select bool_and(not money_movement_enabled) from public.payment_beneficiary_protection_reference), 'view exposes money movement lock');

select ok(not exists(
  select 1 from information_schema.columns
  where table_schema = 'public'
    and table_name in ('payment_beneficiary_protection_rules', 'payment_beneficiary_protection_reference')
    and column_name in ('account_number', 'routing_number', 'beneficiary_name', 'beneficiary_address', 'email', 'phone', 'provider_token', 'credential')
), 'protection reference data contains no beneficiary identifiers or provider credentials');
select ok(to_regclass('public.payment_beneficiaries') is null, 'beneficiary record storage remains absent');
select ok(to_regprocedure('public.create_payment_beneficiary(jsonb)') is null, 'beneficiary creation RPC remains absent');
select ok(not exists(select 1 from public.payment_intents where status <> 'disabled'), 'payment intents remain disabled');
select ok(not exists(select 1 from public.payment_quotes where status = 'accepted'), 'no accepted payment quote exists');
select ok(to_regclass('public.payment_transactions') is null, 'payment transaction storage remains absent');
select ok(not exists(select 1 from public.brokerage_execution_controls where execution_enabled), 'brokerage execution remains locked');
select ok(not exists(select 1 from public.payment_corridor_intelligence where money_movement_enabled), 'corridor intelligence remains non-executable');

select * from finish();
rollback;
