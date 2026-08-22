# TradePulse AI

TradePulse AI is an early-stage global market, trade-intelligence and
cross-border payment platform. The product is being built as a real FinTech
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

The repository contains three initial server-side functions:

| Function | Purpose | Authorization |
| --- | --- | --- |
| `sync-fx-market-data` | Fetch and normalize EUR/USD and USD/INR reference rates from Frankfurter v2 | `x-sync-secret` |
| `generate-market-forecasts` | Generate a versioned 24-hour baseline forecast after enough observations exist | `x-sync-secret` |
| `create-payment-quote` | Persist an authenticated, non-executable indicative quote | Supabase user JWT |

Set a strong `SYNC_SECRET` in Supabase secrets before deploying scheduled
functions. Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` to deployed Edge Functions.

Frankfurter rates are reference rates, not executable trading prices. For
production, retain provider attribution and confirm the terms for every
underlying data source.

## Quality checks

```bash
npm run typecheck
npm run build
PYTHONPATH=services/forecasting/src python -m unittest discover -s services/forecasting/tests -v
```

GitHub Actions validates the browser application, all Edge Functions and the ML
forecasting worker for pull requests and pushes to `main`.

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

## Production gates

Forecasting must pass walk-forward validation, backtesting with transaction
costs, drift monitoring and independent risk review before it can influence
trades.

Cross-border payments require, at minimum, authenticated customers, KYC/KYB,
AML and sanctions screening, transaction monitoring, audit retention,
idempotent provider orchestration, reconciliation, dispute/refund handling,
encryption and a licensed banking/payment partner in every operating corridor.

Market data, forecasts and indicative quotes are not financial advice and do
not guarantee execution price, settlement time or investment performance.
