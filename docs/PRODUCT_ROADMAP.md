# TradePulse AI product roadmap

This roadmap keeps intelligence, trading execution and payment execution as
separate risk domains. A strong forecast is not permission to place a trade,
and a payment quote is not permission to move funds.

## Phase 1 — trusted data platform

**Goal:** every displayed number is traceable to a source and timestamp.

- Server-side adapters for FX, commodities, indices, country economics and
  trade observations.
- Normalized contracts, freshness rules, schema validation and sync audit logs.
- Authentication, profiles, plan limits, watchlists and market alerts.
- Realtime dashboard states with explicit loading, stale, missing and error
  handling.
- Data-quality monitoring for duplicates, gaps, stale sources and reconciliation.

**Exit gate:** agreed data sources are licensed, automated syncs are observable,
and no prototype value is presented as live data.

## Phase 2 — forecast intelligence and payment sandbox

**Goal:** produce measurable forecasts and safe, non-executable corridor quotes.

- Versioned forecast registry, features, horizons, intervals and confidence.
- Baseline models followed by tree, time-series and ensemble candidates.
- The first production candidate is a Ridge + histogram gradient-boosting
  ensemble with expanding-window validation, baseline comparison and empirical
  residual intervals.
- Walk-forward validation, cost-aware backtests, calibration, drift and champion /
  challenger evaluation.
- Payment corridors, FX references, fee rules, quote expiry and idempotent intent
  records.
- Authentication and audit trails around persisted quotes.

**Exit gate:** forecasts beat named baselines out of sample without leakage;
payment quotes reconcile deterministically; no real-money execution exists.

## Phase 3 — portfolio and paper trading

- Virtual portfolios, orders, fills and position accounting.
- Jurisdiction and instrument-eligibility contracts exist from Phase 2; all
  execution flags remain disabled until the regulated-execution phase.
- Passwordless authentication, virtual cash, transactional fills, simulated
  fees/slippage, idempotency, portfolio limits and service-only execution form
  the first implemented Phase 3 slice.
- Risk limits, drawdown controls, exposure, transparent historical scenarios,
  reconciliation and kill switches are implemented in the Phase 3B command
  center. System-triggered controls require review before release.
- Strategy notebooks promoted through a reviewed model registry.
- Alert delivery and explainable daily briefings.

**Exit gate:** paper-trading reconciliation and risk tests pass over an agreed
evaluation window.

## Phase 3C — global equity research and forecasting

- Global-ready security master with provider identifiers, venue, country,
  currency, sector and explicit data-coverage status.
- Server-side market-data adapters with licensed display controls and no browser
  credentials. The first implementation is a selected-symbol US equity pilot;
  additional venues are enabled only after provider and redistribution review.
- Searchable stock dashboard with verified price history, source timestamps,
  licensed fundamentals and per-stock forecast uncertainty.
- Transparent research ranking across validated forecast, momentum, business
  quality, valuation, risk and data quality, with reasons and risk flags.
- Research classifications remain non-personalized. Personalized buy/sell/hold
  advice requires separate suitability, licensing and compliance approval.

**Exit gate:** agreed venue coverage is licensed, stale/partial feeds are
correctly labeled, model qualification is monitored, and research explanations
reproduce their stored component scores.

## Phase 4 — regulated brokerage integrations

- Broker adapter behind a separately permissioned execution service.
- KYC/KYB, AML, sanctions, transaction monitoring, travel-rule applicability,
  suitability, disclosures and regulatory reporting.
- Broker ledger, provider reconciliation, webhooks, retries and disaster recovery.

**Exit gate:** legal, compliance, security, broker and market-data approvals are
written and auditable before any production trade can be submitted.

## Phase 5 — cross-border payments (final execution domain)

- Licensed payment/banking partner behind a separately permissioned payment
  orchestration service.
- Corridor-specific KYC/KYB, AML, sanctions, transaction monitoring,
  travel-rule applicability, disputes, refunds and regulatory reporting.
- Double-entry payments ledger, safeguarding/custody boundary, provider
  reconciliation, webhooks, idempotency, retries and disaster recovery.

**Exit gate:** corridor-by-corridor legal, compliance, security and partner
approvals are written and auditable before any production fund movement.

## Platform evolution

- Public web dashboard first; responsive mobile experience throughout.
- Shared typed contracts for future iOS/Android and partner APIs.
- Multi-tenant business accounts, role-based access and organization billing.
- Regional deployment, observability, incident response and data-retention
  policies before global expansion.
