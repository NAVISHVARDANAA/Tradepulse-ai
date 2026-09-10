# Global brokerage and custody orchestration

Phase 8D adds a fail-closed control plane for rehearsing how TradePulse AI could
coordinate regulated brokerage, exchange, clearing, custody and market-data
responsibilities. It does not connect a production partner or enable trading.

## Exact launch matrices

Every modeled launch row is scoped by customer residency, execution
jurisdiction, customer and investor type, cash account type, asset class, venue
and settlement currency. The initial four deterministic scenarios cover named
India, United Kingdom, United States and Germany market combinations. Each row
has eight missing approval domains and five unassigned partner roles.

Approval for one row cannot activate another country, venue, customer type,
account type or asset class. Production credentials alone have no activation
effect.

## Identity-bound onboarding rehearsal

Ten requirements coordinate identity/KYC/KYB, AML and sanctions, tax forms,
disclosures, appropriateness or suitability, customer agreements, market-data
subscriptions, broker accounts, safeguarding/custody and settlement/clearing.

Authenticated users can create a private 24-hour review-only case and record a
seven-day evidence rehearsal. The protected service stores a one-way digest,
the user identity, requirement and expiry. It stores no raw document and the
rehearsal never becomes an approval, account or permission.

## Transparent blocked previews

A private preview uses only the deterministic Phase 8B price, FX and cost
fixtures. It shows scenario price, gross notional, FX, commission, venue fee,
modeled tax, base-currency total and settlement currency. Buying power remains
unavailable, every partner route remains unassigned and five explicit blockers
are retained.

Cross-border payment funding is an independent risk domain. A payment quote is
never linked to a brokerage case or silently converted into trading cash.

## Independent reconciliation

The rehearsal evaluates order, allocation, cash, custody and settlement ledgers
separately. All five remain unavailable until real, approved partner statements
and signed events exist. Reconciliation records are append-only and have no
production effect.

## Security boundary

All private cases, evidence rehearsals, previews and reconciliation records use
row-level security. Browser clients receive read access to their own records
only. Every mutation requires the authenticated, MFA-aware
`manage-global-brokerage-custody` function and service-role-only database RPCs.

Database constraints keep live broker, exchange, clearing, custody,
safeguarding, cash, position, settlement, market-data credential, cross-border
funding, order-routing and automatic-activation capabilities false. No live
order, custody account, payment-funding link or partner instruction exists.

## Release evidence

CI rebuilds migration `048_global_brokerage_custody_orchestration.sql`, runs the
96-assertion PgTAP contract, type-checks the protected Edge Function, enforces a
query-only production smoke test, tests the guest browser boundary and verifies
the static Phase 8D release contract.

After merge and green `main` CI, run the five manual workflows sequentially:

1. `DEPLOY_DATA_PHASE_8D`
2. `VERIFY_DATA_PHASE_8D`
3. `BUILD_PHASE_8D`
4. `DEPLOY_PHASE_8D`
5. `VERIFY_WEB_PHASE_8D`

Use `main` every time and wait for each workflow to pass before starting the
next. These gates deploy and verify a blocked orchestration rehearsal; they do
not authorize partner connectivity, onboarding approval, customer funding,
live trading, custody or settlement.
