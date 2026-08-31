# Customer trust layer

## Phase 5G boundary

Phase 5G adds a focused Trust Center at `#trust-center`. It turns the strongest
themes from global trading and payment-app feedback—unclear costs, unexplained
failures, missing evidence, support repetition and clutter—into explicit product
contracts.

This is a web-only controlled-beta release. It changes no database migration,
Edge Function, authentication policy, entitlement, provider route or regulatory
approval. **No execution or money movement** is possible. Live brokerage,
custody, checkout, charge collection, payment execution and personalized advice
remain hard locked.

## Customer capabilities

### Trust receipts

The Trust Center defines the evidence customers must see before reviewing three
future high-consequence outputs:

- a forecast receipt identifies source freshness, model/evidence version,
  uncertainty, reliability and limitations;
- a brokerage preview receipt identifies the quote timestamp, estimated price,
  fees, slippage, risk checks and non-executable provider state; and
- a cross-border quote receipt identifies the reference rate, provider rate,
  spread, fees, taxes, recipient amount, delivery estimate and non-executable
  route state.

These are review standards, not fabricated transaction receipts. Phase 5G does
not create a completed order or transfer record.

### Reliability Shield and smart alerts

The Reliability Shield reads the existing customer-safe service-health view. A
missing or failed status request becomes a visible unavailable state while every
safety lock remains active. It never converts missing evidence into an
operational claim.

The smart alert inbox groups reliability attention states separately from
informational safety boundaries. It does not deliver email, push notifications
or trading instructions.

### Financial flight recorder

The first flight-recorder foundation keeps only recent workspace visits in
**local browser storage**. It stores a route label and timestamp, is capped at
20 entries and can be cleared by the customer. It does not store holdings,
orders, quotes, payment details, identity, credentials or advice.

Future financial events require append-only server evidence, identity binding,
retention controls and regulatory review. The browser trail must never be
represented as that future financial ledger.

### Context-aware support

Customers can copy a deliberately bounded diagnostic context containing only
the release, current workspace, reliability state and timestamp. Email,
credentials, account identifiers, portfolio data and payment data are explicitly
omitted.

### Guided and Professional modes

Guided mode retains explanatory text. Professional mode condenses that guidance
while preserving the same evidence, warnings and hard locks. The preference is
device-local; it does not change authorization, entitlements or data access.

## Acceptance evidence

- `npm run check:trust-layer` pins the route, receipts, storage boundary, support
  redaction, release manifest, workflow confirmations and hard locks.
- Desktop/mobile Playwright verifies the three review standards, mode
  persistence, local activity, safe support context and absence of execution
  actions.
- Production smoke includes the Trust Center and continues to reject console,
  runtime and governed-origin HTTP failures.
- The Trust Center has no shared market, trade, forecast or equity data
  requirement and creates no shared realtime subscription.

## Release procedure

After merge and green `main` checks:

1. Run **Build production web release** with `BUILD_PHASE_5G`.
2. Run **Deploy controlled beta web** with `DEPLOY_PHASE_5G` and approve the
   protected production environment.
3. Run **Verify web production** with `VERIFY_WEB_PHASE_5G`.
4. Retain the merge commit and green workflow links in the restricted release
   record.

Do not run a Supabase deployment or production database verification for this
phase.

