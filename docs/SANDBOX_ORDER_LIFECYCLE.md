# Partner-sandbox order lifecycle

## Phase 6B boundary

Phase 6B adds a bounded order lifecycle against Alpaca's Broker API sandbox.
It is an engineering and approved-pilot evidence capability, not authorization
for live trading. Live brokerage, short selling, customer funding, custody,
settlement, checkout, payments and money movement remain disabled.

## Internal service boundary

`manage-alpaca-sandbox-order` accepts only `POST` requests carrying the existing
`BROKER_SANDBOX_SYNC_SECRET`. It deliberately sends no browser CORS headers and
is not invoked by the web application. Alpaca sandbox credentials stay in the
Edge Function runtime. The handler rejects any request unless all of these are
true:

- the target user has an active, consented membership in an active approved
  pilot cohort;
- the provider registry points to `alpaca-broker-sandbox` and its live route is
  false;
- the fixed API origin is `https://broker-api.sandbox.alpaca.markets`;
- global live-order execution and browser submission are false; and
- the order is a long-only, day US-equity limit bracket within the configured
  quantity and USD-notional ceilings.

The internal scheduler sends the secret in `x-sync-secret`. A submit body uses
this contract (values shown are placeholders, not credentials):

```json
{
  "action": "submit",
  "commandId": "00000000-0000-4000-8000-000000000001",
  "requestedForUserId": "00000000-0000-4000-8000-000000000002",
  "providerAccountId": "00000000-0000-4000-8000-000000000003",
  "symbol": "AAPL",
  "side": "buy",
  "orderType": "limit",
  "quantity": 1,
  "limitPrice": 190,
  "takeProfitLimitPrice": 200,
  "stopLossStopPrice": 180
}
```

Cancel and reconcile require a new `commandId`, the same transient
`providerAccountId`, and the original `rootClientOrderId`. Replace also supplies
the new quantity/limit price while preserving the original symbol, side, order
type and protective legs.

## Lifecycle and idempotency

The internal caller supplies a UUID `commandId`. Submit and replace actions use
`tp-sbx-<commandId>` as the provider client order identifier. A command can be
persisted only once per user; reusing it with different normalized input fails.

Mutating provider requests are never blindly retried. If a submit response is
ambiguous, the adapter performs a safe lookup by client order identifier. If
that lookup also cannot confirm the result, an `ambiguous` receipt is retained
and the caller must reconcile rather than repeat the submission.
The same safe lookup resolves a duplicate-client-order rejection caused by a
concurrent retry; the adapter still never emits a second mutation.

Cancel resolves the sandbox provider order transiently and issues one DELETE.
Replace resolves it transiently and issues one PATCH with a new deterministic
client identifier. Replacement preserves the provider-managed protective legs
and requires the internal caller to supply the same valid protective envelope.

## Trust receipts and privacy

`broker_sandbox_order_receipts` is append-only and customer scoped through RLS.
It stores lifecycle values, request and payload digests, and one-way SHA-256
fingerprints for provider account/order identifiers. It never stores raw
provider account IDs, provider order IDs or credentials. Browser roles can read
their own sanitized receipts but cannot insert, update, delete or call the
service writer.

`broker_sandbox_reconciliation_runs` stores only aggregate counts and a digest.
The web workspace has no submit, cancel or replace control; it shows the latest
sanitized lifecycle, recent receipts and aggregate reconciliation health.

## Release procedure

After the Phase 6B pull request is merged and `main` is green:

1. deploy migration 037 and the internal handler with `DEPLOY_DATA_PHASE_6B`;
2. retain the read-only `VERIFY_DATA_PHASE_6B` evidence;
3. create the web artifact with `BUILD_PHASE_6B`;
4. deploy it with `DEPLOY_PHASE_6B`; and
5. retain `VERIFY_WEB_PHASE_6B` production evidence.

These gates do not approve Phase 6C or alter any live-execution lock.
