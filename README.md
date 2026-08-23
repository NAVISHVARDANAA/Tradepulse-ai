# TradePulse AI

TradePulse AI is an early-stage global market research, forecasting, paper
investing and trade-intelligence platform. The product is being built as a real FinTech
foundation: data provenance, model uncertainty, access controls and payment
compliance boundaries are designed in before execution features are enabled.

## Current product scope

### Phase 1 — trusted intelligence foundation

- Market cards read the latest stored observation for each configured asset.
- FX reference rates can be synchronized server-side from Frankfurter v2.
- Trade KPIs, trend charts and country rankings are calculated from Supabase
  observations; missing data is displayed as missing rather than replaced by
  fabricated values.
- Realtime subscriptions refresh market, trade and forecast views.
- Profiles, plan-aware watchlists, asset limits and alerts use row-level
  security.
- Provider sync runs are recorded for operational auditing.

### Phase 2 — forecasting and payment foundations

- Forecast runs are versioned and preserve feature snapshots, horizons,
  uncertainty intervals and confidence scores.
- A Python ML worker combines standardized Ridge regression and histogram
  gradient boosting after leakage-aware expanding-window validation.
- Every ML run is compared with a zero-return baseline. Rejected models remain
  auditable but are not shown as qualified forecasts.
- The server-side trend/EWMA Edge Function remains a transparent baseline for
  pipeline diagnostics; it is not displayed as validated ML output.
- Enabled payment corridors calculate indicative estimates from stored FX
  observations and explicit fee configuration.
- Authenticated payment quotes can be created server-side. Payment intents are
  read-only to clients and default to `disabled`.
- No code in this repository can submit, settle or custody real funds.
- Jurisdiction, instrument eligibility, investor compliance state, paper
  portfolios, simulated orders, fills, positions and risk checks have isolated
  schemas. Live execution has no writable order path.

### Phase 3 — authenticated paper investing

- Passwordless Supabase authentication protects each user's simulation data.
- Paper portfolio creation is server-controlled and plan-limited.
- Virtual cash, risk limits, orders, fills, positions and ledger entries update
  together through a service-only transactional database function.
- Market orders require a synchronized, non-stale price and record simulated
  slippage and fees.
- Order idempotency prevents duplicate fills during retries.
- Pre-trade checks reject excessive order/position sizes, insufficient virtual
  cash and unsupported sells while retaining an audit record.

### Phase 3B — portfolio risk and reconciliation

- Authenticated users can run a monitored valuation and reconciliation for a
  private paper portfolio.
- The risk engine records NAV, gross/net exposure, concentration, cash reserve,
  drawdown, 24-hour P&L and a transparent 95% one-day historical scenario VaR.
- VaR is withheld as a decision metric until at least 20 daily scenarios exist.
- Virtual cash reconciles to the ledger and positions reconcile to signed fills;
  exceptions remain visible and auditable.
- Critical stale-price, drawdown, loss or VaR breaches can automatically engage
  a paper-trading kill switch. Users can also pause simulated trading manually.
- A system-triggered kill switch requires risk review before it can be released.

### Phase 3C — global equity research

- A provider-neutral security and coverage registry separates reference,
  delayed, licensed real-time and unavailable data states.
- The first server-side adapter imports selected active US equities and adjusted
  daily bars from Alpaca. Global venue adapters can use the same contracts.
- A searchable per-stock dashboard shows price provenance, history, licensed
  fundamentals, display-qualified forecasts, uncertainty and model validation.
- A versioned research methodology combines forecast, momentum, company
  quality, valuation, volatility and data-quality components. Each score retains
  human-readable evidence and risk flags.
- Classifications are non-personalized research summaries, never buy/sell/hold
  instructions or suitability advice.
- Provider display licensing must be explicitly approved server-side; the sync
  refuses to ingest provider data until that approval is present.

## Architecture

```text
External providers
  → Supabase Edge Functions
  → validation and normalization
  → versioned Supabase observations
  → scheduled Python ML worker and validation gate
  → query layer
  → React dashboard / future mobile clients
```

Provider credentials and the Supabase service-role key must remain inside
server-side secrets. Never expose them through a `VITE_*` variable.

## Technology

- React 18, TypeScript and Vite
- Recharts
- Supabase Postgres, Auth, Realtime, RLS and Edge Functions
- Python, NumPy and scikit-learn for validated forecasting
- GitHub Actions CI

## Local setup

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Copy `.env.example` to `.env.local` and add the Supabase project URL and
   anonymous key.

3. Apply the SQL files in `supabase/migrations` to the Supabase project in
   filename order.

4. Start the application:

   ```bash
   npm run dev
   ```

## Edge Functions

The repository contains ten initial server-side functions:

| Function | Purpose | Authorization |
| --- | --- | --- |
| `sync-fx-market-data` | Fetch and normalize EUR/USD and USD/INR reference rates from Frankfurter v2 | `x-sync-secret` |
| `generate-market-forecasts` | Generate a versioned 24-hour baseline forecast after enough observations exist | `x-sync-secret` |
| `create-payment-quote` | Persist an authenticated, non-executable indicative quote | Supabase user JWT |
| `create-paper-portfolio` | Create a plan-limited portfolio with virtual cash and risk limits | Supabase user JWT |
| `submit-paper-order` | Submit an idempotent, risk-checked simulated market order | Supabase user JWT |
| `refresh-paper-risk` | Value and reconcile an owned simulation portfolio | Supabase user JWT |
| `set-paper-trading-control` | Pause or resume user-controlled paper trading | Supabase user JWT |
| `sync-equity-market-data` | Import approved equity reference data and adjusted daily bars with explicit feed/licensing state | `x-sync-secret` |
| `generate-equity-research` | Publish versioned, non-personalized research classifications and explanations | `x-sync-secret` |
| `sync-sec-equity-fundamentals` | Import reported US-company facts from SEC EDGAR with public-domain provenance | `x-sync-secret` |

Set a strong `SYNC_SECRET` in Supabase secrets before deploying scheduled
functions. Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` to deployed Edge Functions.

The initial equity adapter also expects `ALPACA_API_KEY_ID`,
`ALPACA_API_SECRET_KEY` and a comma-separated `EQUITY_SYNC_SYMBOLS` allowlist.
`ALPACA_DATA_FEED` accepts `iex`, `delayed_sip` or `sip`. Synchronization is
refused until `EQUITY_DATA_DISPLAY_LICENSED=true` confirms approved display rights;
set `ALPACA_REALTIME_LICENSED=true` only for a contract that permits SIP
real-time display. IEX is labeled as a partial reference feed, not consolidated
US-market coverage.

The SEC fundamentals adapter requires a descriptive `SEC_USER_AGENT` containing
an application name and operational contact. It processes at most 20 approved
US securities per invocation and stores the filing date, fiscal period and
CompanyFacts source URL with every public-domain snapshot.

Frankfurter rates are reference rates, not executable trading prices. For
production, retain provider attribution and confirm the terms for every
underlying data source.

## Quality checks

```bash
npm run typecheck
npm run build
PYTHONPATH=services/forecasting/src python -m unittest discover -s services/forecasting/tests -v
```

GitHub Actions validates the browser application, all Edge Functions, the ML
forecasting worker, and a clean rebuild of every migration in an isolated
Supabase Postgres instance for pull requests and pushes to `main`.

## ML forecasting service

`services/forecasting` contains the scheduled production ML worker. It builds
lagged return, trend, volatility, drawdown, relative-strength and UTC calendar
features; evaluates Ridge and histogram gradient-boosting models on expanding
windows; weights the ensemble by validation error; and derives uncertainty from
out-of-sample residuals.

The promotion gate requires at least 2% lower MAE than the named zero-return
baseline and at least 52% directional accuracy. Passing this gate still does not
make a forecast financial advice or permission to trade.

## Global investing boundary

Migration `008_global_investing_foundation.sql` introduces country availability,
instrument eligibility, compliance-managed investor profiles and paper trading.
All jurisdictions start as `research_only`; all venue execution flags start
disabled; and the only client-submittable order mode is `paper`.

Migration `011_global_equity_research.sql` adds the equity security master,
coverage registry, licensed-fundamentals boundary and explainable research
surface. It does not create a live brokerage route.

## Production gates

Forecasting must pass walk-forward validation, backtesting with transaction
costs, drift monitoring and independent risk review before it can influence
trades.

Cross-border payment execution is intentionally scheduled after the trading and
research platform phases. It requires, at minimum, authenticated customers, KYC/KYB,
AML and sanctions screening, transaction monitoring, audit retention,
idempotent provider orchestration, reconciliation, dispute/refund handling,
encryption and a licensed banking/payment partner in every operating corridor.

Market data, forecasts and indicative quotes are not financial advice and do
not guarantee execution price, settlement time or investment performance.
