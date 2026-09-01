begin;

select plan(54);

select ok(to_regclass('public.live_trading_activation_controls') is not null, 'activation controls exist');
select ok(to_regclass('public.live_trading_activation_requirements') is not null, 'activation requirements exist');
select ok(to_regclass('public.live_trading_approval_evidence') is not null, 'approval evidence exists');
select ok(to_regclass('public.live_trading_readiness_requirements') is not null, 'sanitized requirement view exists');
select ok(to_regclass('public.live_trading_readiness_summary') is not null, 'readiness summary exists');
select ok(to_regprocedure('public.persist_live_trading_approval_evidence(jsonb)') is not null, 'evidence writer exists');

select is((select count(*) from public.live_trading_activation_controls), 1::bigint, 'one activation control is seeded');
select is((select activation_status from public.live_trading_activation_controls), 'blocked', 'activation is blocked');
select is((select live_order_routing_enabled from public.live_trading_activation_controls), false, 'live routing is disabled');
select is((select browser_order_submission_enabled from public.live_trading_activation_controls), false, 'browser submission is disabled');
select is((select automatic_activation_enabled from public.live_trading_activation_controls), false, 'automatic activation is disabled');
select is((select customer_funding_enabled from public.live_trading_activation_controls), false, 'customer funding is disabled');
select is((select custody_enabled from public.live_trading_activation_controls), false, 'custody is disabled');
select is((select settlement_enabled from public.live_trading_activation_controls), false, 'settlement is disabled');
select is((select kill_switch_activation_enabled from public.live_trading_activation_controls), false, 'kill-switch activation is disabled');
select is((select count(*) from public.live_trading_activation_requirements), 18::bigint, 'eighteen independent requirements are seeded');
select ok((select bool_and(activation_blocking) from public.live_trading_activation_requirements), 'every requirement blocks activation');
select is((select count(distinct domain) from public.live_trading_activation_requirements), 8::bigint, 'eight readiness domains are represented');

select ok((select bool_and(relrowsecurity) from pg_class where oid in (
  'public.live_trading_activation_controls'::regclass,
  'public.live_trading_activation_requirements'::regclass,
  'public.live_trading_approval_evidence'::regclass
)), 'readiness relations use RLS');
select ok(exists(select 1 from pg_policies where tablename = 'live_trading_activation_controls' and policyname = 'Public reads live trading activation locks'), 'public reads activation locks');
select ok(exists(select 1 from pg_policies where tablename = 'live_trading_activation_requirements' and policyname = 'Public reads activation requirements'), 'public reads requirements');
select ok(exists(select 1 from pg_policies where tablename = 'live_trading_approval_evidence' and policyname = 'Public reads sanitized approval states'), 'public reads sanitized approval states');
select ok(not has_table_privilege('anon', 'public.live_trading_activation_controls', 'INSERT'), 'anonymous users cannot alter controls');
select ok(not has_table_privilege('authenticated', 'public.live_trading_activation_requirements', 'UPDATE'), 'customers cannot alter requirements');
select ok(not has_table_privilege('service_role', 'public.live_trading_approval_evidence', 'INSERT'), 'service cannot bypass the evidence writer');
select ok(not has_function_privilege('authenticated', 'public.persist_live_trading_approval_evidence(jsonb)', 'EXECUTE'), 'customers cannot call the evidence writer');
select ok(not has_function_privilege('anon', 'public.persist_live_trading_approval_evidence(jsonb)', 'EXECUTE'), 'anonymous users cannot call the evidence writer');
select ok(has_function_privilege('service_role', 'public.persist_live_trading_approval_evidence(jsonb)', 'EXECUTE'), 'regulated service can call the evidence writer');
select ok(has_column_privilege('anon', 'public.live_trading_approval_evidence', 'decision', 'SELECT'), 'public can read sanitized decisions');
select ok(not has_column_privilege('anon', 'public.live_trading_approval_evidence', 'evidence_digest', 'SELECT'), 'public cannot read evidence digests');
select ok(not has_column_privilege('authenticated', 'public.live_trading_approval_evidence', 'reviewer_fingerprint', 'SELECT'), 'customers cannot read reviewer fingerprints');
select ok(not exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'live_trading_approval_evidence' and column_name in ('document', 'document_body', 'reviewer_name', 'reviewer_email', 'api_key', 'access_token')), 'raw documents, identities and credentials are absent');
select ok(exists(select 1 from pg_trigger where tgname = 'live_trading_approval_evidence_append_only' and not tgisinternal), 'approval evidence is append-only');
select ok(to_regprocedure('public.submit_live_order(jsonb)') is null, 'no live order submission RPC exists');
select ok(not exists(select 1 from public.brokerage_execution_controls where execution_enabled), 'global brokerage execution remains locked');

select set_config('request.jwt.claim.role', 'service_role', true);

select is(
  (public.persist_live_trading_approval_evidence(
    '{"requirementKey":"jurisdiction_authorization","evidenceVersion":"test-v1","decision":"approved","evidenceDigest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","reviewerFingerprint":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","reviewedAt":"2026-09-01T00:00:00Z","validUntil":"2030-09-01T00:00:00Z"}'::jsonb
  ) ->> 'idempotent')::boolean,
  false,
  'first approval decision appends evidence'
);
select is((select count(*) from public.live_trading_approval_evidence), 1::bigint, 'one approval decision is stored');
select is((select evidence_status from public.live_trading_readiness_requirements where requirement_key = 'jurisdiction_authorization'), 'approved', 'sanitized ledger shows the latest decision');
select is((select approval_current from public.live_trading_readiness_requirements where requirement_key = 'jurisdiction_authorization'), true, 'unexpired approval is current');
select is(
  (public.persist_live_trading_approval_evidence(
    '{"requirementKey":"jurisdiction_authorization","evidenceVersion":"test-v1","decision":"approved","evidenceDigest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","reviewerFingerprint":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","reviewedAt":"2026-09-01T00:00:00Z","validUntil":"2030-09-01T00:00:00Z"}'::jsonb
  ) ->> 'idempotent')::boolean,
  true,
  'repeated evidence is idempotent'
);
select is((select count(*) from public.live_trading_approval_evidence), 1::bigint, 'idempotency prevents duplicate evidence');
select throws_ok(
  $$select public.persist_live_trading_approval_evidence('{"requirementKey":"jurisdiction_authorization","evidenceVersion":"changed-v2","decision":"rejected","evidenceDigest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","reviewerFingerprint":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","reviewedAt":"2026-09-01T00:00:00Z"}'::jsonb)$$,
  'P0001', 'Activation evidence digest was reused with different input',
  'evidence digest reuse with different input is rejected'
);
select throws_ok(
  $$update public.live_trading_approval_evidence set decision = 'rejected' where requirement_key = 'jurisdiction_authorization'$$,
  'P0001', 'Live trading approval evidence is append-only',
  'approval evidence cannot be updated'
);
select throws_ok(
  $$delete from public.live_trading_approval_evidence where requirement_key = 'jurisdiction_authorization'$$,
  'P0001', 'Live trading approval evidence is append-only',
  'approval evidence cannot be deleted'
);

insert into public.live_trading_approval_evidence (
  requirement_key, evidence_version, decision, evidence_digest,
  reviewer_fingerprint, reviewed_at, valid_until
)
select
  requirement_key,
  'complete-test-v1',
  'approved',
  encode(digest(requirement_key || '-complete', 'sha256'), 'hex'),
  repeat('c', 64),
  '2026-09-01T00:00:00Z'::timestamptz,
  '2030-09-01T00:00:00Z'::timestamptz
from public.live_trading_activation_requirements
where requirement_key <> 'jurisdiction_authorization';

select is((select current_approval_count from public.live_trading_readiness_summary), 18, 'all requirement evidence can be current');
select is((select blocking_gap_count from public.live_trading_readiness_summary), 0, 'complete evidence closes the displayed gap count');
select is((select readiness_status from public.live_trading_readiness_summary), 'blocked', 'complete evidence still cannot activate trading');
select is((select live_order_routing_enabled from public.live_trading_readiness_summary), false, 'complete evidence cannot enable routing');
select is((select automatic_activation_enabled from public.live_trading_readiness_summary), false, 'complete evidence cannot automate activation');
select is((select customer_funding_enabled from public.live_trading_readiness_summary), false, 'complete evidence cannot enable funding');
select is((select custody_enabled from public.live_trading_readiness_summary), false, 'complete evidence cannot enable custody');
select is((select settlement_enabled from public.live_trading_readiness_summary), false, 'complete evidence cannot enable settlement');
select is((select kill_switch_activation_enabled from public.live_trading_readiness_summary), false, 'complete evidence cannot claim a kill switch is activated');
select ok(to_regclass('public.payment_transactions') is null, 'money movement remains absent');

select * from finish();
rollback;

