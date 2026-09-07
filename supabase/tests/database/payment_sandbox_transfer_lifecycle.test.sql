begin;

select plan(73);

select ok(to_regclass('public.payment_sandbox_transfer_controls') is not null, 'sandbox transfer controls exist');
select ok(to_regclass('public.payment_sandbox_transfer_stage_templates') is not null, 'sandbox transfer stage templates exist');
select ok(to_regclass('public.payment_sandbox_ledger_templates') is not null, 'sandbox ledger templates exist');
select ok(to_regclass('public.payment_sandbox_transfer_lifecycle_reference') is not null, 'sandbox transfer reference exists');
select ok(to_regclass('public.payment_sandbox_ledger_reference') is not null, 'sandbox ledger reference exists');

select ok((select bool_and(relrowsecurity) from pg_class where oid in (
  'public.payment_sandbox_transfer_controls'::regclass,
  'public.payment_sandbox_transfer_stage_templates'::regclass,
  'public.payment_sandbox_ledger_templates'::regclass
)), 'all sandbox transfer relations use RLS');
select ok(has_table_privilege('anon', 'public.payment_sandbox_transfer_controls', 'SELECT'), 'anonymous users can read transfer locks');
select ok(has_table_privilege('anon', 'public.payment_sandbox_transfer_stage_templates', 'SELECT'), 'anonymous users can read stage templates');
select ok(has_table_privilege('anon', 'public.payment_sandbox_ledger_templates', 'SELECT'), 'anonymous users can read ledger templates');
select ok(has_table_privilege('authenticated', 'public.payment_sandbox_transfer_lifecycle_reference', 'SELECT'), 'authenticated users can read lifecycle reference');
select ok(has_table_privilege('authenticated', 'public.payment_sandbox_ledger_reference', 'SELECT'), 'authenticated users can read ledger reference');
select ok(not has_table_privilege('anon', 'public.payment_sandbox_transfer_stage_templates', 'INSERT,UPDATE,DELETE'), 'anonymous users cannot mutate stage templates');
select ok(not has_table_privilege('authenticated', 'public.payment_sandbox_ledger_templates', 'INSERT,UPDATE,DELETE'), 'authenticated users cannot mutate ledger templates');
select ok(not has_table_privilege('service_role', 'public.payment_sandbox_transfer_stage_templates', 'INSERT'), 'service role cannot insert transfer stages');
select ok(not has_table_privilege('service_role', 'public.payment_sandbox_ledger_templates', 'INSERT,UPDATE,DELETE'), 'service role cannot mutate ledger templates');

select is((select count(*) from public.payment_sandbox_transfer_controls), 1::bigint, 'one sandbox transfer control row exists');
select is((select control_key from public.payment_sandbox_transfer_controls), 'payment-sandbox-transfer-lifecycle', 'control key is fixed');
select ok((select workspace_enabled from public.payment_sandbox_transfer_controls), 'sandbox transfer workspace is enabled');
select ok((select synthetic_transfer_rehearsal_enabled from public.payment_sandbox_transfer_controls), 'synthetic transfer rehearsal is enabled');
select is((select data_mode from public.payment_sandbox_transfer_controls), 'synthetic_transfer_rehearsal', 'data mode is synthetic only');
select ok((select licensed_partner_sandbox_reference_enabled from public.payment_sandbox_transfer_controls), 'licensed-partner sandbox reference is enabled');
select ok((select double_entry_preview_enabled from public.payment_sandbox_transfer_controls), 'double-entry preview is enabled');
select ok((select idempotency_rehearsal_enabled and signed_webhook_rehearsal_enabled and bounded_retry_rehearsal_enabled from public.payment_sandbox_transfer_controls), 'idempotency, webhook and retry rehearsals are enabled');
select ok((select reconciliation_rehearsal_enabled and rescue_mode_rehearsal_enabled from public.payment_sandbox_transfer_controls), 'reconciliation and rescue rehearsals are enabled');
select ok((select dispute_rehearsal_enabled and refund_rehearsal_enabled from public.payment_sandbox_transfer_controls), 'dispute and refund rehearsals are enabled');
select ok((select not real_customer_data_enabled and not real_beneficiary_data_enabled from public.payment_sandbox_transfer_controls), 'real customer and beneficiary data remain disabled');
select ok((select not provider_sandbox_connectivity_enabled and not browser_transfer_creation_enabled and not service_transfer_creation_enabled from public.payment_sandbox_transfer_controls), 'provider connectivity and transfer creation remain disabled');
select ok((select not webhook_ingestion_enabled and not financial_ledger_posting_enabled and not retry_execution_enabled from public.payment_sandbox_transfer_controls), 'webhook, ledger and retry writes remain disabled');
select ok((select not reconciliation_write_enabled and not rescue_operator_action_enabled from public.payment_sandbox_transfer_controls), 'reconciliation and rescue writes remain disabled');
select ok((select not dispute_case_writes_enabled and not refund_execution_enabled from public.payment_sandbox_transfer_controls), 'dispute and refund writes remain disabled');
select ok((select not production_provider_connectivity_enabled and not quote_acceptance_enabled from public.payment_sandbox_transfer_controls), 'production provider and quote acceptance remain disabled');
select ok((select not payment_execution_enabled and not money_movement_enabled and not customer_funding_enabled from public.payment_sandbox_transfer_controls), 'execution, money movement and funding remain disabled');
select ok((select not custody_enabled and not settlement_enabled from public.payment_sandbox_transfer_controls), 'custody and settlement remain disabled');
select is((select policy_version from public.payment_sandbox_transfer_controls), 'payment-sandbox-transfer-lifecycle-v1', 'policy version is explicit');

select is((select count(*) from public.payment_sandbox_transfer_stage_templates), 36::bigint, 'four corridors expose nine lifecycle stages each');
select is((select count(*) from public.payment_sandbox_ledger_templates), 16::bigint, 'four corridors expose four ledger postings each');
select ok(not exists (
  select corridor_id from public.payment_sandbox_transfer_stage_templates
  group by corridor_id having count(*) <> 9 or count(distinct stage_key) <> 9
), 'every corridor has a complete unique lifecycle map');
select ok(not exists (
  select corridor_id from public.payment_sandbox_ledger_templates
  group by corridor_id having count(*) <> 4 or count(distinct account_code) <> 4
), 'every corridor has a complete unique ledger map');
select is((select count(distinct stage_key) from public.payment_sandbox_transfer_stage_templates), 9::bigint, 'all nine lifecycle stage types exist');
select is((select count(distinct stage_code) from public.payment_sandbox_transfer_stage_templates), 36::bigint, 'stage codes are unique');
select ok(not exists (
  select stage_key from public.payment_sandbox_transfer_stage_templates
  group by stage_key having count(*) <> 4
), 'each lifecycle stage appears in all four corridors');
select ok(not exists (select 1 from public.payment_sandbox_transfer_stage_templates where priority not in (10,20,30,40,50,60,70,80,90)), 'stage priorities are bounded and ordered');
select is((select count(distinct rehearsal_outcome) from public.payment_sandbox_transfer_stage_templates), 8::bigint, 'all expected rehearsal outcomes are represented');
select is((select count(distinct responsible_owner) from public.payment_sandbox_transfer_stage_templates), 4::bigint, 'all four operating owners are represented');
select ok(not exists (select 1 from public.payment_sandbox_transfer_stage_templates where description = '' or evidence_required = '' or safe_response = ''), 'stage guidance is complete');

select is((select count(*) from public.payment_sandbox_transfer_lifecycle_reference), 36::bigint, 'lifecycle reference exposes all stages');
select is((select count(distinct corridor_code) from public.payment_sandbox_transfer_lifecycle_reference), 4::bigint, 'lifecycle reference exposes four corridors');
select ok(not exists (select 1 from public.payment_sandbox_transfer_lifecycle_reference where data_mode <> 'synthetic_transfer_rehearsal' or not licensed_partner_sandbox_reference_enabled or not double_entry_preview_enabled), 'lifecycle reference remains synthetic and non-posting');
select ok(not exists (
  select 1 from public.payment_sandbox_transfer_lifecycle_reference where
    real_customer_data_enabled or real_beneficiary_data_enabled or
    provider_sandbox_connectivity_enabled or browser_transfer_creation_enabled or
    service_transfer_creation_enabled or webhook_ingestion_enabled or
    financial_ledger_posting_enabled or retry_execution_enabled or
    reconciliation_write_enabled or rescue_operator_action_enabled or
    dispute_case_writes_enabled or refund_execution_enabled or
    production_provider_connectivity_enabled or quote_acceptance_enabled or
    payment_execution_enabled or money_movement_enabled or customer_funding_enabled or
    custody_enabled or settlement_enabled
), 'lifecycle reference exposes every operational lock as false');
select is((select count(*) from public.payment_sandbox_ledger_reference), 16::bigint, 'ledger reference exposes all posting templates');
select is((select count(distinct corridor_code) from public.payment_sandbox_ledger_reference), 4::bigint, 'ledger reference exposes four corridors');
select ok(not exists (select 1 from public.payment_sandbox_ledger_reference where data_mode <> 'synthetic_transfer_rehearsal' or not double_entry_preview_enabled or financial_ledger_posting_enabled or refund_execution_enabled or payment_execution_enabled or money_movement_enabled), 'ledger reference is preview-only');

select ok(not exists (
  select corridor_id, journal_key from public.payment_sandbox_ledger_templates
  group by corridor_id, journal_key having count(*) <> 2
), 'each corridor journal has exactly two postings');
select ok(not exists (
  select corridor_id, journal_key from public.payment_sandbox_ledger_templates
  group by corridor_id, journal_key
  having count(*) filter (where entry_side = 'debit') <> 1
    or count(*) filter (where entry_side = 'credit') <> 1
), 'each corridor journal has one debit and one credit');
select ok(not exists (
  select corridor_id, journal_key from public.payment_sandbox_ledger_templates
  group by corridor_id, journal_key having count(distinct currency_role) <> 1
), 'each journal uses one currency role');
select ok(not exists (select 1 from public.payment_sandbox_ledger_templates where journal_key = 'source_funding' and currency_role <> 'source'), 'source journals use source currency only');
select ok(not exists (select 1 from public.payment_sandbox_ledger_templates where journal_key = 'destination_obligation' and currency_role <> 'destination'), 'destination journals use destination currency only');
select ok(not exists (select 1 from public.payment_sandbox_ledger_templates where currency_role = 'source' and amount_basis <> 'source_amount'), 'source postings use source amount basis');
select ok(not exists (select 1 from public.payment_sandbox_ledger_templates where currency_role = 'destination' and amount_basis <> 'destination_before_tax'), 'destination postings use destination-before-tax basis');
select ok(not exists (select 1 from public.payment_sandbox_ledger_templates where priority not in (10,20)), 'ledger posting order is deterministic');

select ok(not exists (
  select 1 from information_schema.columns
  where table_schema = 'public'
    and table_name in ('payment_sandbox_transfer_stage_templates', 'payment_sandbox_ledger_templates')
    and column_name in ('user_id','customer_id','beneficiary_id','name','email','phone','address','account_number','provider_reference','idempotency_key','webhook_payload')
), 'reference templates contain no customer, beneficiary or provider identifiers');
select ok(not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'payment_sandbox_ledger_templates'
    and column_name in ('amount','balance','debit_amount','credit_amount','exchange_rate')
), 'ledger templates store no financial amounts or balances');
select ok(to_regclass('public.payment_sandbox_transfers') is null and to_regclass('public.payment_sandbox_webhook_events') is null and to_regclass('public.payment_sandbox_ledger_entries') is null and to_regclass('public.payment_sandbox_disputes') is null and to_regclass('public.payment_sandbox_refunds') is null, 'no operational transfer, webhook, ledger, dispute or refund table exists');
select ok(to_regprocedure('public.create_payment_sandbox_transfer(jsonb)') is null and to_regprocedure('public.ingest_payment_sandbox_webhook(jsonb)') is null and to_regprocedure('public.execute_payment_sandbox_refund(jsonb)') is null, 'no transfer, webhook or refund RPC exists');
select ok(not exists(select 1 from public.payment_intents where status <> 'disabled'), 'payment intents remain disabled');
select ok(not exists(select 1 from public.payment_quotes where status = 'accepted'), 'payment quotes remain non-executable');
select ok((select not real_identity_collection_enabled and not compliance_provider_connectivity_enabled and not payment_execution_enabled and not money_movement_enabled from public.payment_compliance_orchestration_controls), 'Phase 7C compliance locks remain false');
select ok('security_invoker=true' = any(coalesce((select reloptions from pg_class where oid = 'public.payment_sandbox_transfer_lifecycle_reference'::regclass), array[]::text[])), 'lifecycle view uses invoker security');
select ok('security_invoker=true' = any(coalesce((select reloptions from pg_class where oid = 'public.payment_sandbox_ledger_reference'::regclass), array[]::text[])), 'ledger view uses invoker security');
select is((select count(*) from pg_policies where schemaname = 'public' and tablename in ('payment_sandbox_transfer_controls','payment_sandbox_transfer_stage_templates','payment_sandbox_ledger_templates')), 3::bigint, 'three read-only RLS policies protect sandbox transfer references');
select ok(exists(select 1 from pg_trigger where tgname = 'payment_sandbox_transfer_controls_set_updated_at' and not tgisinternal), 'control timestamp trigger exists');
select ok(exists(select 1 from pg_trigger where tgname = 'payment_sandbox_transfer_stages_set_updated_at' and not tgisinternal), 'stage timestamp trigger exists');
select ok(not exists (
  select 1 from information_schema.columns
  where table_schema = 'public'
    and table_name in ('payment_sandbox_transfer_lifecycle_reference','payment_sandbox_ledger_reference')
    and column_name in ('user_id','customer_id','beneficiary_id','provider_reference','webhook_payload')
), 'public references expose no customer or provider identifiers');

select * from finish();
rollback;
