# International multi-asset paper trading

Phase 8B adds an isolated, deterministic international paper-trading lab for
cash equities, ETFs and depositary receipts. It is an educational simulation:
no broker, exchange, custodian or real-money system is connected.

## Customer experience

- The public catalog shows 12 venue-qualified scenario listings across six
  modeled venues and five currencies. Prices, availability and FX rates are
  deterministic fixtures—not market data or executable quotes.
- An approved, authenticated user can attach an isolated international
  simulation account to an existing private paper portfolio, allocate virtual
  base cash and convert it between modeled currencies.
- Market, limit, stop and stop-limit rehearsals apply the selected venue's
  session, halt, tick, lot, partial-fill and expiry rules.
- Commission, exchange-fee and tax assumptions are recorded separately. A
  missing rule fails closed instead of silently becoming zero.
- Fills update multi-currency virtual cash, FIFO tax lots, positions,
  settlement dates and balanced per-currency journal lines.
- Timestamped route evidence records the one deterministic scenario source and
  explicitly makes no best-execution or achievable-fill claim.

## Security and accounting boundary

Private account, cash, order, fill, position, tax-lot, journal, conversion,
route-evidence and reconciliation records use row-level security. Browser
writes are not granted. Mutations pass through `manage-international-paper`,
which requires an authenticated user and verified MFA when enrolled, then calls
service-role-only database functions with the user's identity.

The international paper ledger is deliberately separate from the earlier paper
portfolio ledger so its multi-currency scenarios cannot affect existing risk
reconciliation. Initialization, FX and filled orders create balanced journal
entries; the reconciliation function compares journals, cash, fills, positions
and open lots.

Database constraints keep live market data, order routing, broker connectivity,
real customer funds, custody, real settlement, margin and short selling false.
No live international order table, custody account or routing function exists.

## Release evidence

CI rebuilds the database through migration
`046_international_multi_asset_paper_trading.sql`, runs the 84-assertion PgTAP
contract, type-checks the protected Edge Function, executes a query-only
production smoke test, tests the guest browser boundary and enforces the static
Phase 8B release contract.

After merge and green `main` CI, run the five manual workflows sequentially:

1. `DEPLOY_DATA_PHASE_8B`
2. `VERIFY_DATA_PHASE_8B`
3. `BUILD_PHASE_8B`
4. `DEPLOY_PHASE_8B`
5. `VERIFY_WEB_PHASE_8B`

Use `main` every time and wait for each workflow to pass before starting the
next one. These gates deploy and verify the simulation; they do not authorize
live trading, customer funding, custody or settlement.
