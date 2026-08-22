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
- Walk-forward validation, cost-aware backtests, calibration, drift and champion /
  challenger evaluation.
- Payment corridors, FX references, fee rules, quote expiry and idempotent intent
  records.
- Authentication and audit trails around persisted quotes.

**Exit gate:** forecasts beat named baselines out of sample without leakage;
payment quotes reconcile deterministically; no real-money execution exists.

## Phase 3 — portfolio and paper trading

- Virtual portfolios, orders, fills and position accounting.
- Risk limits, drawdown controls, exposure, VaR scenarios and kill switches.
- Strategy notebooks promoted through a reviewed model registry.
- Alert delivery and explainable daily briefings.

**Exit gate:** paper-trading reconciliation and risk tests pass over an agreed
evaluation window.

## Phase 4 — regulated execution integrations

- Broker adapter behind a separately permissioned execution service.
- Licensed payment/banking partner behind a separately permissioned payment
  orchestration service.
- KYC/KYB, AML, sanctions, transaction monitoring, travel-rule applicability,
  disputes, refunds and regulatory reporting.
- Double-entry ledger, provider reconciliation, webhooks, retries and disaster
  recovery.

**Exit gate:** legal, compliance, security and provider approvals are written and
auditable before any production fund movement is enabled.

## Platform evolution

- Public web dashboard first; responsive mobile experience throughout.
- Shared typed contracts for future iOS/Android and partner APIs.
- Multi-tenant business accounts, role-based access and organization billing.
- Regional deployment, observability, incident response and data-retention
  policies before global expansion.
