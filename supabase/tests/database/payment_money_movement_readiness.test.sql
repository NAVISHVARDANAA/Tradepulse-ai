begin;

select plan(70);

select ok(to_regclass('public.payment_money_movement_controls') is not null, 'money-movement controls exist');
select ok(to_regclass('public.payment_money_movement_requirements') is not null, 'corridor requirements exist');
select ok(to_regclass('public.payment_money_movement_approval_evidence') is not null, 'approval evidence exists');
select ok(to_regclass('public.payment_money_movement_readiness_reference') is not null, 'sanitized readiness reference exists');
select ok(to_regclass('public.payment_money_movement_readiness_summary') is not null, 'corridor readiness summary exists');
select ok(to_regprocedure('public.persist_payment_money_movement_approval_evidence(jsonb)') is not null, 'service-only evidence writer exists');

select is((select count(*) from public.payment_money_movement_controls), 1::bigint, 'one global control is seeded');
select is((select activation_status from public.payment_money_movement_controls), 'blocked', 'activation is blocked');
select is((select manual_activation_review_required from public.payment_money_movement_controls), true, 'manual activation review is required');
select ok(not exists (
  select 1 from public.payment_money_movement_controls where
    real_customer_data_enabled or real_beneficiary_data_enabled or
    production_partner_connectivity_enabled or safeguarding_account_activation_enabled or
    customer_funding_enabled or quote_acceptance_enabled or transfer_creation_enabled or
    webhook_ingestion_enabled or financial_ledger_posting_enabled or
    reconciliation_write_enabled or rescue_operator_action_enabled or
    dispute_case_writes_enabled or refund_execution_enabled or
    payment_execution_enabled or money_movement_enabled or custody_enabled or
    settlement_enabled or automatic_activation_enabled
), 'every operational capability is fail-closed');
select is((select policy_version from public.payment_money_movement_controls), 'controlled-money-movement-readiness-v1', 'policy version is explicit');

select is((select count(*) from public.payment_money_movement_requirements), 48::bigint, 'four corridors expose twelve requirements each');
select ok(not exists (
  select corridor_id from public.payment_money_movement_requirements
  group by corridor_id having count(*) <> 12 or count(distinct requirement_key) <> 12
), 'each corridor has a complete unique requirement ledger');
select is((select count(distinct requirement_key) from public.payment_money_movement_requirements), 12::bigint, 'twelve requirement types exist');
select is((select count(distinct domain) from public.payment_money_movement_requirements), 8::bigint, 'eight approval domains are represented');
select ok((select bool_and(evidence_required and activation_blocking) from public.payment_money_movement_requirements), 'every requirement needs evidence and blocks activation');
select ok(not exists (
  select 1 from public.payment_money_movement_requirements
  where title = '' or summary = '' or evidence_expected = '' or not enabled
), 'enabled requirement guidance is complete');

select is((select count(*) from public.payment_money_movement_readiness_reference), 48::bigint, 'public readiness reference exposes all requirements');
select is((select count(distinct corridor_code) from public.payment_money_movement_readiness_reference), 4::bigint, 'public readiness reference exposes four corridors');
select ok(not exists (
  select 1 from public.payment_money_movement_readiness_reference where
    activation_status <> 'blocked' or not manual_activation_review_required or
    real_customer_data_enabled or real_beneficiary_data_enabled or
    production_partner_connectivity_enabled or safeguarding_account_activation_enabled or
    customer_funding_enabled or quote_acceptance_enabled or transfer_creation_enabled or
    webhook_ingestion_enabled or financial_ledger_posting_enabled or
    reconciliation_write_enabled or rescue_operator_action_enabled or
    dispute_case_writes_enabled or refund_execution_enabled or
    payment_execution_enabled or money_movement_enabled or custody_enabled or
    settlement_enabled or automatic_activation_enabled
), 'public readiness reference exposes every operational lock as false');
select is((select count(*) from public.payment_money_movement_readiness_summary), 4::bigint, 'one readiness summary exists per corridor');
select ok(not exists (select 1 from public.payment_money_movement_readiness_summary where requirement_count <> 12), 'each summary reports twelve requirements');
select ok(not exists (select 1 from public.payment_money_movement_readiness_summary where current_approval_count <> 0), 'no corridor starts with an approval');
select ok(not exists (select 1 from public.payment_money_movement_readiness_summary where blocking_gap_count <> 12), 'every corridor starts with twelve blocking gaps');
select ok(not exists (select 1 from public.payment_money_movement_readiness_summary where activation_status <> 'blocked'), 'every corridor starts blocked');
select ok(not exists (
  select 1 from public.payment_money_movement_readiness_summary where
    production_partner_connectivity_enabled or safeguarding_account_activation_enabled or
    customer_funding_enabled or transfer_creation_enabled or
    financial_ledger_posting_enabled or payment_execution_enabled or
    money_movement_enabled or custody_enabled or settlement_enabled or
    automatic_activation_enabled
), 'summary cannot imply an operational capability');

select ok((select bool_and(relrowsecurity) from pg_class where oid in (
  'public.payment_money_movement_controls'::regclass,
  'public.payment_money_movement_requirements'::regclass,
  'public.payment_money_movement_approval_evidence'::regclass
)), 'money-movement readiness relations use RLS');
select ok(exists(select 1 from pg_policies where tablename = 'payment_money_movement_controls' and policyname = 'Public reads payment money movement locks'), 'public reads activation locks');
select ok(exists(select 1 from pg_policies where tablename = 'payment_money_movement_requirements' and policyname = 'Public reads enabled money movement requirements'), 'public reads enabled requirements');
select ok(exists(select 1 from pg_policies where tablename = 'payment_money_movement_approval_evidence' and policyname = 'Public reads sanitized money movement approval states'), 'public reads sanitized evidence states');
select ok(not has_table_privilege('anon', 'public.payment_money_movement_controls', 'INSERT'), 'anonymous users cannot alter controls');
select ok(not has_table_privilege('authenticated', 'public.payment_money_movement_requirements', 'UPDATE'), 'customers cannot alter requirements');
select ok(not has_table_privilege('service_role', 'public.payment_money_movement_approval_evidence', 'INSERT'), 'service role cannot bypass the evidence writer');
select ok(not has_function_privilege('authenticated', 'public.persist_payment_money_movement_approval_evidence(jsonb)', 'EXECUTE'), 'customers cannot call the evidence writer');
select ok(not has_function_privilege('anon', 'public.persist_payment_money_movement_approval_evidence(jsonb)', 'EXECUTE'), 'anonymous users cannot call the evidence writer');
select ok(has_function_privilege('service_role', 'public.persist_payment_money_movement_approval_evidence(jsonb)', 'EXECUTE'), 'regulated service can call the evidence writer');
select ok(has_column_privilege('anon', 'public.payment_money_movement_approval_evidence', 'decision', 'SELECT'), 'public can read sanitized decisions');
select ok(not has_column_privilege('anon', 'public.payment_money_movement_approval_evidence', 'evidence_digest', 'SELECT'), 'public cannot read evidence digests');
select ok(not has_column_privilege('authenticated', 'public.payment_money_movement_approval_evidence', 'reviewer_fingerprint', 'SELECT'), 'customers cannot read reviewer fingerprints');
select ok(not exists (
  select 1 from information_schema.columns
  where table_schema = 'public'
    and table_name in ('payment_money_movement_requirements', 'payment_money_movement_approval_evidence')
    and column_name in ('document', 'document_body', 'reviewer_name', 'reviewer_email',
      'customer_id', 'beneficiary_id', 'account_number', 'provider_credential', 'access_token')
), 'raw documents, identities, customer data and credentials are absent');
select ok(exists(select 1 from pg_trigger where tgname = 'payment_money_movement_approval_evidence_append_only' and not tgisinternal), 'approval evidence is append-only');
select ok(exists(select 1 from pg_trigger where tgname = 'payment_money_movement_controls_set_updated_at' and not tgisinternal), 'control timestamp trigger exists');
select ok(exists(select 1 from pg_trigger where tgname = 'payment_money_movement_requirements_set_updated_at' and not tgisinternal), 'requirement timestamp trigger exists');
select ok(to_regclass('public.production_payment_transfers') is null and to_regclass('public.payment_funding_accounts') is null and to_regclass('public.payment_customer_balances') is null and to_regclass('public.payment_financial_ledger_entries') is null, 'no production payment, funding, balance or ledger table exists');
select ok(to_regprocedure('public.activate_payment_corridor(text)') is null and to_regprocedure('public.create_production_payment_transfer(jsonb)') is null and to_regprocedure('public.initiate_payment_funding(jsonb)') is null and to_regprocedure('public.post_payment_ledger_entry(jsonb)') is null, 'no activation, funding, transfer or ledger RPC exists');
select ok(not exists(select 1 from public.payment_intents where status <> 'disabled'), 'payment intents remain disabled');
select ok(not exists(select 1 from public.payment_quotes where status = 'accepted'), 'payment quotes remain non-executable');
select ok(not exists(
  select 1 from public.payment_sandbox_transfer_controls where
    provider_sandbox_connectivity_enabled or production_provider_connectivity_enabled or
    financial_ledger_posting_enabled or payment_execution_enabled or money_movement_enabled
), 'Phase 7D transfer locks remain closed');

select set_config('request.jwt.claim.role', 'service_role', true);

select is(
  (public.persist_payment_money_movement_approval_evidence(
    '{"corridorCode":"USD-INR","requirementKey":"legal_authorization","evidenceVersion":"test-v1","decision":"approved","evidenceDigest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","reviewerFingerprint":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","reviewedAt":"2026-09-01T00:00:00Z","validUntil":"2030-09-01T00:00:00Z"}'::jsonb
  ) ->> 'idempotent')::boolean,
  false,
  'first corridor approval decision appends evidence'
);
select is((select count(*) from public.payment_money_movement_approval_evidence), 1::bigint, 'one approval decision is stored');
select is((select evidence_status from public.payment_money_movement_readiness_reference where corridor_code = 'USD-INR' and requirement_key = 'legal_authorization'), 'approved', 'sanitized ledger shows the latest decision');
select is((select approval_current from public.payment_money_movement_readiness_reference where corridor_code = 'USD-INR' and requirement_key = 'legal_authorization'), true, 'unexpired approval is current');
select is(
  (public.persist_payment_money_movement_approval_evidence(
    '{"corridorCode":"USD-INR","requirementKey":"legal_authorization","evidenceVersion":"test-v1","decision":"approved","evidenceDigest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","reviewerFingerprint":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","reviewedAt":"2026-09-01T00:00:00Z","validUntil":"2030-09-01T00:00:00Z"}'::jsonb
  ) ->> 'idempotent')::boolean,
  true,
  'repeated corridor evidence is idempotent'
);
select is((select count(*) from public.payment_money_movement_approval_evidence), 1::bigint, 'idempotency prevents duplicate evidence');
select throws_ok(
  $$select public.persist_payment_money_movement_approval_evidence('{"corridorCode":"USD-INR","requirementKey":"legal_authorization","evidenceVersion":"changed-v2","decision":"rejected","evidenceDigest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","reviewerFingerprint":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","reviewedAt":"2026-09-01T00:00:00Z"}'::jsonb)$$,
  'P0001', 'Money-movement evidence digest was reused with different input',
  'evidence digest reuse with different input is rejected'
);
select throws_ok(
  $$update public.payment_money_movement_approval_evidence set decision = 'rejected'$$,
  'P0001', 'Payment money-movement approval evidence is append-only',
  'approval evidence cannot be updated'
);
select throws_ok(
  $$delete from public.payment_money_movement_approval_evidence$$,
  'P0001', 'Payment money-movement approval evidence is append-only',
  'approval evidence cannot be deleted'
);

insert into public.payment_money_movement_approval_evidence (
  requirement_id, evidence_version, decision, evidence_digest,
  reviewer_fingerprint, reviewed_at, valid_until
)
select
  id,
  'complete-test-v1',
  'approved',
  encode(digest(requirement_code || '-complete', 'sha256'), 'hex'),
  repeat('c', 64),
  '2026-09-01T00:00:00Z'::timestamptz,
  '2030-09-01T00:00:00Z'::timestamptz
from public.payment_money_movement_requirements
where id <> (
  select id from public.payment_money_movement_requirements
  where requirement_code = 'USD-INR-LEGAL'
);

select is((select count(*) from public.payment_money_movement_approval_evidence), 48::bigint, 'all corridor requirement evidence can be retained');
select ok(not exists(select 1 from public.payment_money_movement_readiness_summary where current_approval_count <> 12), 'all twelve approvals can become current per corridor');
select ok(not exists(select 1 from public.payment_money_movement_readiness_summary where blocking_gap_count <> 0), 'complete evidence closes displayed gaps');
select ok(not exists(select 1 from public.payment_money_movement_readiness_summary where activation_status <> 'blocked'), 'complete evidence still cannot activate a corridor');
select ok(not exists(select 1 from public.payment_money_movement_readiness_summary where money_movement_enabled), 'complete evidence cannot enable money movement');
select ok(not exists(select 1 from public.payment_money_movement_readiness_summary where production_partner_connectivity_enabled), 'complete evidence cannot connect a partner');
select ok(not exists(select 1 from public.payment_money_movement_readiness_summary where customer_funding_enabled), 'complete evidence cannot enable customer funding');
select ok(not exists(select 1 from public.payment_money_movement_readiness_summary where safeguarding_account_activation_enabled), 'complete evidence cannot activate safeguarding accounts');
select ok(not exists(select 1 from public.payment_money_movement_readiness_summary where financial_ledger_posting_enabled), 'complete evidence cannot enable ledger posting');
select ok(not exists(select 1 from public.payment_money_movement_readiness_summary where payment_execution_enabled), 'complete evidence cannot enable payment execution');
select ok(not exists(select 1 from public.payment_money_movement_readiness_summary where custody_enabled or settlement_enabled), 'complete evidence cannot enable custody or settlement');
select ok(not exists(select 1 from public.payment_money_movement_readiness_summary where automatic_activation_enabled), 'complete evidence cannot automate activation');
select ok(to_regclass('public.payment_transactions') is null, 'a generic money-movement transaction table remains absent');

select * from finish();
rollback;
