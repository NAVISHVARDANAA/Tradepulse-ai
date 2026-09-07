# Payment sandbox transfer lifecycle

Phase 7D adds a public, synthetic rehearsal of the operating controls a future
licensed-partner cross-border payment sandbox would require. It is a reference
experience—not a provider adapter, transfer processor, financial ledger,
webhook receiver, dispute system, refund service or money-movement capability.

## Customer experience

The payments workspace keeps the selected corridor and illustrative amount
visible while customers switch among five synthetic scenarios:

- a standard sandbox delivery;
- a customer retry after an ambiguous timeout;
- a replayed webhook event;
- a provider-versus-ledger reconciliation exception;
- a dispute and refund review.

Each scenario maps nine lifecycle controls: idempotency, licensed-partner
sandbox hand-off, signed webhook verification, currency-separated double-entry
journals, bounded retries, reconciliation, rescue mode, disputes and refunds.
The interface changes only local calculation state. It sends no transfer or
lifecycle command and stores no scenario selection.

## Double-entry boundary

Four templates per corridor produce two illustrative journals:

1. a source-currency funding journal with one matching debit and credit; and
2. a destination-currency obligation journal with one matching debit and credit.

The journals balance independently because different currencies must never be
silently netted into one accounting balance. Values are computed in the browser
from the already-visible corridor quote, are labeled illustrative and are never
posted to a financial ledger. Tax remains unavailable and is not represented as
zero.

## Data and execution boundary

No real customer, beneficiary, provider, webhook, ledger, dispute or refund data is collected
or stored. The database contains only versioned lifecycle and ledger templates
for the four existing synthetic corridors.

The database explicitly keeps these capabilities false:

- real customer and beneficiary data collection;
- licensed-partner sandbox and production-provider connectivity;
- browser or service transfer creation;
- webhook ingestion and financial-ledger posting;
- retry execution and reconciliation writes;
- rescue-mode operator actions and dispute-case writes;
- refund execution and quote acceptance;
- customer funding, payment execution and money movement;
- custody and settlement.

There is no `payment_sandbox_transfers`, `payment_sandbox_webhook_events`,
`payment_sandbox_ledger_entries`, `payment_sandbox_disputes` or
`payment_sandbox_refunds` table. There is no transfer-creation, webhook-ingestion
or refund-execution RPC. Anonymous and authenticated users can read sanitized
references only, and the service role cannot insert or mutate their source
tables through granted table privileges.

## Release sequence

After the Phase 7D pull request and `main` checks pass:

1. Run **Deploy Supabase production** with `DEPLOY_DATA_PHASE_7D`.
2. Run **Verify Supabase production** with `VERIFY_DATA_PHASE_7D`.
3. Run **Build production web release** with `BUILD_PHASE_7D`.
4. Run **Deploy controlled beta web** with `DEPLOY_PHASE_7D`.
5. Run **Verify web production** with `VERIFY_WEB_PHASE_7D`.

Passing these gates proves only that the reference lifecycle is present, both
currency journals are structurally balanced and every operational path remains
disabled. Any real sandbox-provider connection requires a selected licensed
partner, scoped credentials, signed-webhook key management, legal and compliance
approval, privacy review, threat modeling, reconciliation ownership, incident
drills and explicit authorization in a later change.
