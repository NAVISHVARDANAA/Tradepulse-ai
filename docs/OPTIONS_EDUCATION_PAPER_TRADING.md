# Options education and defined-risk paper trading

Phase 8C adds an education-first options lab using deterministic chain fixtures
for two modeled underlyings. No live option, broker, margin or real-money system
is connected.

## Customer experience

- The public chain exposes expiry, strike, call or put, bid/ask, volume, open
  interest, data freshness, implied volatility and Greeks only under an explicit
  deterministic-education display entitlement.
- The strategy builder covers long calls, long puts, bull call debit spreads
  and bear put debit spreads. It shows the legs, premium, break-even, maximum
  loss, bounded or explicitly unbounded profit potential and a payoff diagram.
- Approved authenticated users can attach a private education-only options
  account to an existing paper portfolio and reserve virtual cash equal to the
  complete maximum loss before saving a strategy.
- Expiration, exercise, protected assignment, early-assignment risk and
  corporate-action adjustments produce auditable virtual outcomes.
- Appropriateness answers tailor the education record only. They never grant
  live options permission, and forecast confidence cannot override the gate.

## Security and accounting boundary

Private accounts, assessments, strategies, legs, lifecycle events, journals and
reconciliations use row-level security. Browser writes are not granted.
Mutations pass through `manage-options-paper`, which requires an authenticated
user and verified MFA when enrolled, then invokes service-role-only database
functions with that user's identity.

Every supported strategy has bounded maximum loss. Any short option leg exists
only inside a debit spread with its protective long leg. Opening premiums and
virtual settlement cash use balanced USD simulation journals, and deterministic
reconciliation checks virtual cash, journal balance, protected legs and risk
boundaries.

Database constraints keep live market data, options routing, broker
connectivity, real funds, real positions, custody, settlement, margin,
uncovered short options and automatic options permission false. No live options
order, margin account or routing function exists.

## Release evidence

CI rebuilds the database through migration
`047_options_education_paper_trading.sql`, runs the 82-assertion PgTAP contract,
type-checks the protected Edge Function, executes a query-only production smoke
test, tests the guest browser boundary and enforces the static Phase 8C release
contract.

After merge and green `main` CI, run the five manual workflows sequentially:

1. `DEPLOY_DATA_PHASE_8C`
2. `VERIFY_DATA_PHASE_8C`
3. `BUILD_PHASE_8C`
4. `DEPLOY_PHASE_8C`
5. `VERIFY_WEB_PHASE_8C`

Use `main` every time and wait for each workflow to pass before starting the
next one. These gates deploy and verify an educational simulation; they do not
authorize options trading, customer funding, margin, custody or settlement.
