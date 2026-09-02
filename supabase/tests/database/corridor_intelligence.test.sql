begin;

select plan(53);

select ok(to_regclass('public.payment_corridor_intelligence_controls') is not null, 'corridor intelligence controls exist');
select ok(to_regclass('public.payment_corridor_routes') is not null, 'corridor route models exist');
select ok(to_regclass('public.payment_corridor_intelligence') is not null, 'sanitized corridor intelligence view exists');
select is((select count(*) from public.payment_corridor_intelligence_controls), 1::bigint, 'one intelligence control is seeded');
select is((select data_mode from public.payment_corridor_intelligence_controls), 'sandbox_model', 'data is explicitly modeled');
select is((select max_reference_age_minutes from public.payment_corridor_intelligence_controls), 60, 'reference freshness threshold is explicit');
select is((select provider_connectivity_enabled from public.payment_corridor_intelligence_controls), false, 'provider connectivity is disabled');
select is((select beneficiary_collection_enabled from public.payment_corridor_intelligence_controls), false, 'beneficiary collection is disabled');
select is((select quote_acceptance_enabled from public.payment_corridor_intelligence_controls), false, 'quote acceptance is disabled');
select is((select automatic_route_selection_enabled from public.payment_corridor_intelligence_controls), false, 'automatic route selection is disabled');
select is((select transfer_creation_enabled from public.payment_corridor_intelligence_controls), false, 'transfer creation is disabled');
select is((select payment_execution_enabled from public.payment_corridor_intelligence_controls), false, 'payment execution is disabled');
select is((select money_movement_enabled from public.payment_corridor_intelligence_controls), false, 'money movement is disabled');
select is((select custody_enabled from public.payment_corridor_intelligence_controls), false, 'custody is disabled');
select is((select settlement_enabled from public.payment_corridor_intelligence_controls), false, 'settlement is disabled');

select is((select count(*) from public.payment_corridor_routes), 8::bigint, 'eight route models are seeded');
select ok(not exists(
  select corridor_id from public.payment_corridor_routes
  group by corridor_id having count(*) <> 2
), 'every enabled corridor has two comparison models');
select ok((select bool_and(provider_rate_mode = 'sandbox_model') from public.payment_corridor_routes), 'every provider rate is labeled as a sandbox model');
select ok((select bool_and(availability = 'reference_only') from public.payment_corridor_routes), 'every route is reference only');
select ok((select bool_and(tax_status = 'unavailable') from public.payment_corridor_routes), 'tax uncertainty is explicit');
select ok((select bool_and(estimated_tax_bps is null) from public.payment_corridor_routes), 'unknown tax is never encoded as zero');
select ok((select bool_and(char_length(tax_explanation) >= 10) from public.payment_corridor_routes), 'tax gaps have customer-safe explanations');
select ok((select bool_and(eta_max_minutes >= eta_min_minutes) from public.payment_corridor_routes), 'delivery estimates use valid ranges');
select ok((select bool_and(char_length(availability_reason) >= 10) from public.payment_corridor_routes), 'route limitations are explained');
select ok((select bool_and(enabled) from public.payment_corridor_routes), 'seeded route models are enabled for comparison');

select ok((select bool_and(relrowsecurity) from pg_class where oid in (
  'public.payment_corridor_intelligence_controls'::regclass,
  'public.payment_corridor_routes'::regclass
)), 'corridor intelligence relations use RLS');
select ok(exists(select 1 from pg_policies where tablename = 'payment_corridor_intelligence_controls' and policyname = 'Public reads corridor intelligence locks'), 'public reads corridor locks');
select ok(exists(select 1 from pg_policies where tablename = 'payment_corridor_routes' and policyname = 'Public reads enabled corridor route models'), 'public reads enabled route models');
select ok(not has_table_privilege('anon', 'public.payment_corridor_intelligence_controls', 'INSERT'), 'anonymous users cannot alter controls');
select ok(not has_table_privilege('authenticated', 'public.payment_corridor_routes', 'UPDATE'), 'customers cannot alter route models');
select ok(not has_table_privilege('service_role', 'public.payment_corridor_routes', 'INSERT'), 'service role cannot create undeclared route models');
select ok(has_table_privilege('anon', 'public.payment_corridor_intelligence', 'SELECT'), 'anonymous users can read sanitized corridor intelligence');

select is((select count(*) from public.payment_corridor_intelligence), 8::bigint, 'sanitized intelligence exposes eight route models');
select ok((select bool_and(not provider_connectivity_enabled) from public.payment_corridor_intelligence), 'view exposes provider connectivity lock');
select ok((select bool_and(not beneficiary_collection_enabled) from public.payment_corridor_intelligence), 'view exposes beneficiary collection lock');
select ok((select bool_and(not quote_acceptance_enabled) from public.payment_corridor_intelligence), 'view exposes quote acceptance lock');
select ok((select bool_and(not automatic_route_selection_enabled) from public.payment_corridor_intelligence), 'view exposes automatic route selection lock');
select ok((select bool_and(not transfer_creation_enabled) from public.payment_corridor_intelligence), 'view exposes transfer creation lock');
select ok((select bool_and(not payment_execution_enabled) from public.payment_corridor_intelligence), 'view exposes payment execution lock');
select ok((select bool_and(not money_movement_enabled) from public.payment_corridor_intelligence), 'view exposes money movement lock');
select ok((select bool_and(not custody_enabled) from public.payment_corridor_intelligence), 'view exposes custody lock');
select ok((select bool_and(not settlement_enabled) from public.payment_corridor_intelligence), 'view exposes settlement lock');
select ok((select bool_and(tax_status = 'unavailable' and estimated_tax_bps is null) from public.payment_corridor_intelligence), 'view preserves tax uncertainty');

select ok(not exists(
  select 1 from information_schema.columns
  where table_schema = 'public'
    and table_name in ('payment_corridor_routes', 'payment_corridor_intelligence')
    and column_name in ('account_number', 'beneficiary_name', 'beneficiary_address', 'provider_token', 'api_key', 'secret', 'credential')
), 'route intelligence stores no beneficiary, account or provider credential data');
select ok(exists(
  select 1 from pg_constraint
  where conrelid = 'public.payment_intents'::regclass
    and conname = 'payment_intents_phase_7a_disabled'
    and pg_get_constraintdef(oid) like '%status = ''disabled''%'
), 'payment intents are constrained disabled');
select ok(exists(
  select 1 from pg_constraint
  where conrelid = 'public.payment_quotes'::regclass
    and conname = 'payment_quotes_phase_7a_non_executable'
    and pg_get_constraintdef(oid) like '%status <> ''accepted''%'
), 'payment quote acceptance is constrained out');
select ok(not has_table_privilege('service_role', 'public.payment_intents', 'INSERT'), 'service role cannot create payment intents');
select ok(not exists(select 1 from public.payment_intents where status <> 'disabled'), 'no enabled payment intent exists');
select ok(not exists(select 1 from public.payment_quotes where status = 'accepted'), 'no accepted payment quote exists');
select ok(to_regclass('public.payment_transactions') is null, 'payment transaction storage remains absent');
select ok(to_regprocedure('public.create_payment_transfer(jsonb)') is null, 'no transfer creation RPC exists');
select ok(to_regprocedure('public.submit_payment(jsonb)') is null, 'no payment submission RPC exists');
select ok(not exists(select 1 from public.brokerage_execution_controls where execution_enabled), 'brokerage execution remains locked');

select * from finish();
rollback;
