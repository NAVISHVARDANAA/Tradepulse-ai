# Regulated preflight operating guide

## Phase 6A boundary

Phase 6A adds a private, server-evaluated evidence review before any future
regulated order flow. It evaluates six dimensions:

1. verified-residency and instrument-policy eligibility;
2. exact current disclosure acceptance;
3. compliance-managed suitability status;
4. reference-data freshness and separately unverified market-session state;
5. transparent total-cost availability; and
6. bounded order-value evidence with unresolved loss-capacity and portfolio risk.

Every result is a review record, not advice, approval, an order or a broker
instruction. Migration 036 constrains every row to `review_status = blocked`
and `executable = false`.

## Fail-closed behavior

- Missing residency, identity, sanctions or eligibility policy is never inferred
  as approval.
- Browser input cannot write compliance outcomes or preflight records.
- A current quote does not prove that an exchange session is open.
- Unknown fees, taxes or FX charges stay unavailable; they are never displayed
  as zero.
- A notional calculation does not approve loss capacity, concentration or
  portfolio impact.
- Idempotency is enforced per authenticated user and client request ID.
- The Edge Function requires an authenticated session, applies the shared rate
  limit and MFA step-up boundary, and persists through a service-only function.

## Data minimization

The review stores governed status values, reference evidence, structured cost
and risk summaries, and blocking reason codes. It does not store provider
credentials, raw brokerage account numbers, identity documents, payment data or
raw compliance-provider payloads.

## Release sequence

After the Phase 6A pull request is merged and `main` is green:

1. run **Deploy Supabase production** with `DEPLOY_DATA_PHASE_6A`;
2. run **Verify Supabase production** with `VERIFY_DATA_PHASE_6A`;
3. run **Build production web release** with `BUILD_PHASE_6A`;
4. run **Deploy controlled beta web** with `DEPLOY_PHASE_6A`; and
5. run **Verify web production** with `VERIFY_WEB_PHASE_6A`.

The data deployment must precede the web deployment because the workspace reads
migration 036 and calls `evaluate-regulated-preflight`. Production SQL
verification is query-only. None of these confirmations authorizes order
submission, account funding, custody, settlement, checkout or money movement.
