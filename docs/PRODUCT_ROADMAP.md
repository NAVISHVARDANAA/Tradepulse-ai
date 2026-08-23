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

## Phase 3D — global watchlists and research copilot

- Private plan-limited equity watchlists linked to the licensed security master.
- Daily and on-demand research briefs with model confidence, source timestamps,
  evidence, risk flags and explicit missing-data states.
- Deduplicated research-score, classification, forecast-direction and risk-flag
  monitoring with retained trigger evidence.
- In-app alerts first; email and push require explicit consent, delivery-provider
  review, unsubscribe controls and regional privacy approval.
- Deterministic narration is the first production mode. Any future LLM layer
  must cite stored evidence, pass hallucination evaluation and retain a safe
  non-generative fallback.

**Exit gate:** cross-user isolation tests pass, repeated generation is
idempotent, every brief statement resolves to stored evidence, and alert events
cannot be forged by browser clients.

## Phase 3E — TradePulse Academy and guided onboarding

- Free, versioned courses for platform navigation, forecast literacy, stock
  research, paper trading, portfolio risk and evidence-linked copilot use.
- Restartable guided product tour plus contextual learning links from complex
  trading and research surfaces.
- Server-graded knowledge checks with a protected answer bank, explanations and
  an explicit pass threshold.
- Device-local guest progress and private cross-device progress for signed-in
  users, with service-only completion issuance for future certificates.
- Education is separated from personalized financial advice, suitability and
  authorization to submit any live transaction.

**Exit gate:** public content exposes no answer keys, private learning records
pass cross-user isolation tests, all dashboard links resolve to published
lessons, and course completion cannot be forged by browser clients.

## Phase 4 — regulated brokerage integrations

### Phase 4A — brokerage readiness foundation (implemented)

- Broker-neutral provider registry with explicit regulatory, sandbox,
  certification and production-disabled states.
- Private investor-readiness dashboard covering jurisdiction, identity,
  sanctions/AML, suitability, disclosures, broker connection and funding.
- Server-generated order previews that estimate notional value and preserve
  blocker evidence without creating, routing or submitting an order.
- Immutable current-release execution controls: all previews are non-executable,
  provider routes remain disabled and no browser client can write regulated
  readiness outcomes.
- Versioned brokerage-boundary Academy course and a six-step guided product tour.

**Phase 4A exit gate:** isolated database tests prove the global execution lock,
provider lock, non-forgeable readiness state, consent audit path, preview
idempotency and absence of any live-order table or submission function.

### Phase 4B — broker sandbox certification (implemented)

- Versioned adapter controls for sandbox isolation, secret redaction, account
  normalization, order idempotency and lifecycle, signed webhooks, rate limits,
  outage recovery, reconciliation and the production-route lock.
- Service-only immutable reports with source commit, suite version, bounded
  outcomes and evidence digests; raw provider payloads and credentials are never
  stored in the certification control plane.
- Sanitized provider readiness and per-control status views surface `passed`,
  `failed` and `not_run` states to the product without implying regulatory
  approval.
- All certification runs are database-constrained to `sandbox`, and the live
  execution lock remains independent and disabled.

**Phase 4B exit gate:** clean migration rebuild, certification authorization and
immutability tests, production read-only lock verification, and a complete
broker sandbox report before any provider can enter formal certification.

### Future regulated activation work

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
- Global subscriptions priced in USD and GBP, with localized tax handling added
  when the payment provider and operating entities are selected.
- Shared typed contracts for future iOS/Android and partner APIs.
- Multi-tenant business accounts, role-based access and organization billing.
- Regional deployment, observability, incident response and data-retention
  policies before global expansion.
