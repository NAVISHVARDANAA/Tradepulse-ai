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

### Phase 4C — Alpaca Broker API sandbox adapter (implemented)

- Fixed-origin server adapter for the Alpaca Broker API sandbox using Basic
  authentication sourced only from Supabase secrets.
- Read-only asset capability probe with response validation, bounded timeout,
  one safe retry and sanitized errors; account, order and transfer routes are
  not implemented.
- Database-enforced sandbox origin, immutable service-issued health evidence and
  an authenticated product status view with no provider payload or customer data.
- Deployment and production-verification gates for migration 016, active Edge
  Function state, unauthenticated denial and the pre-existing live-order locks.

**Phase 4C exit gate:** mocked adapter tests, isolated database authorization and
immutability tests, production lock smoke checks, then one successful sandbox
credential probe before account mirroring work begins.

### Phase 4D — sanitized Alpaca sandbox account inventory (implemented)

- Exact read-only `GET /v1/accounts?entities=trading_configurations` route with
  the production and query-string route lock preserved to minimize provider data.
- In-memory normalization into aggregate account-status and restriction counts;
  provider identifiers and customer PII are never persisted or returned.
- Append-only snapshot digest and change signal for reconciliation monitoring,
  with authenticated aggregate health in the brokerage-readiness dashboard.
- Dedicated protected Edge Function, database authorization tests, deployment
  gate for migration 017 and unauthenticated HTTP 401 verification.

**Phase 4D exit gate:** mocked account inventory tests, database reconciliation
and immutability tests, then one successful production-hosted sandbox inventory
sync while account connection and all order capabilities remain disabled.

### Phase 4E — broker operations monitoring (implemented)

- Policy-driven adapter and account-inventory freshness thresholds with explicit
  healthy, warning, critical and not-run states.
- Idempotent operational alert lifecycle for provider failures, stale evidence,
  page-limit risk, aggregate restrictions and inventory changes.
- Authenticated control-plane dashboard with next action, open incidents and
  freshness; no provider account identifiers or customer PII are exposed.
- Protected evaluation endpoint, automatic evaluation after probe/inventory
  operations, database authorization tests and production 401 verification.

**Phase 4E exit gate:** migration 018 parity, monitoring lifecycle tests, all
execution locks green, then one protected production evaluation with only
sanitized aggregate alert evidence.

### Phase 4F — paper decision intelligence (implemented)

- Private thesis, conviction and review horizon required for each new paper
  order, with the point-in-time validated forecast and published research state
  captured server-side.
- Immutable decision and outcome evidence that prevents hindsight edits and
  idempotently reuses the original journal entry on request retries.
- Deterministic learning scorecard for forecast-direction accuracy, paper
  decision return and forecast error using later synchronized market prices.
- Automatic evaluation during risk refresh, strict user isolation and service-
  only writes; all broker and real-money execution paths remain disabled.

**Phase 4F exit gate:** migration 019 parity, decision lifecycle and isolation
tests, authenticated Edge Function denial checks, and a production paper-order
exercise showing append-only evidence with no live routing or fund movement.

### Phase 4G — forecast reliability and model governance (implemented)

- Deterministic evaluation of matured forecasts against the first eligible
  synchronized observation after their target time.
- Versioned rolling reliability policy for model error versus the no-change
  baseline, direction accuracy, uncertainty calibration and evidence count.
- Append-only per-asset/model/horizon snapshots with provisional, qualified,
  watch and suspended states plus sanitized drift events.
- A display-qualified forecast boundary that automatically removes suspended
  model versions from both market and equity research dashboards.
- Cost-aware walk-forward backtests and held-out interval coverage retained in
  every newly generated ML forecast.

**Phase 4G exit gate:** migration 020 parity, deterministic lifecycle and
authorization tests, cost-aware ML tests, active protected evaluator, production
HTTP 401 denial and confirmation that no suspended model appears in a public
forecast view.

### Phase 4H — product performance foundation (implemented)

- Shared authentication state with one Supabase session subscription for every
  private research, Academy, simulation, risk and brokerage surface.
- Visibility-aware lazy loading for large product modules and chart dependencies,
  with payment configuration withheld from startup work.
- Debounced realtime invalidation so synchronized data bursts produce bounded
  dashboard refreshes instead of one query fan-out per database event.
- Isolated module error boundaries, reduced-motion loading behavior and explicit
  browser bundle budgets enforced during CI.

**Phase 4H exit gate:** typecheck and production build pass, bundle budgets remain
green, the initial HTML preloads no chart or deferred product chunk, and exactly
one browser authentication listener owns session lifecycle state.

### Phase 4I — customer trust and security foundation (implemented)

- Per-user, per-route authenticated API abuse limits with short-lived,
  service-only database evidence and customer-safe retry responses.
- Constant-time scheduler-secret validation, internal endpoint CORS isolation,
  bounded mutation bodies, request identifiers and defensive API headers.
- CodeQL security-extended analysis for TypeScript, Python and workflows,
  dependency-diff enforcement, production dependency audit and automated update
  proposals.
- Private vulnerability-reporting policy, production security checklist and
  explicit controls that preserve sandbox-only brokerage and non-executable
  payment behavior.

**Phase 4I exit gate:** migration 021 parity, abuse-control and Edge security
tests, green CodeQL/dependency review, production 401 denial, internal CORS
isolation and all live execution and fund-movement locks unchanged.

### Phase 4J — platform observability and incident readiness (implemented)

- Versioned service policies define customer visibility, freshness thresholds,
  availability objectives and initial latency objectives without claiming a
  contractual SLA.
- A five-minute database evaluator consolidates sanitized platform, data,
  forecast and broker-sandbox evidence and dynamically detects stopped
  monitoring rather than leaving a stale green status.
- Append-only health and incident-transition evidence drives a customer-safe
  status panel, 30-day availability measurement and explicit error-budget state.
- Every Edge Function emits one bounded structured completion record with an
  interaction reference and no identity, credential, payload or financial data.
- A NIST-aligned incident runbook defines severity, roles, containment,
  communications, recovery, evidence and post-incident learning.

**Phase 4J exit gate:** migration 022 parity, scheduler and incident lifecycle
tests, structured telemetry tests, active protected evaluator, unauthenticated
HTTP 401 and internal CORS isolation, public status sanitization and all live
execution and fund-movement locks unchanged.

### Phase 4K — customer account security center (implemented)

- Optional TOTP authenticator enrollment with a fail-closed challenge gate for
  every account that has a verified factor.
- Enrolled-session `aal2` step-up enforcement at both the product shell and
  sensitive paper, indicative quote and brokerage-readiness Edge boundaries.
- Explicit current-device sign-out and other-session revocation that preserves
  the verified session instead of relying on ambiguous global sign-out defaults.
- Private service-synchronized security posture and append-only customer history
  with no token, factor secret, one-time code, email, IP or device fingerprint.
- Production MFA, SMTP, redirect, notification, abuse-control and recovery
  checklist with no administrator recovery bypass.

**Phase 4K exit gate:** migration 023 parity, account isolation and append-only
tests, MFA helper tests, active account-security function, production HTTP 401,
successful enrolled-session step-up and all live execution and fund-movement
locks unchanged.

### Phase 4L — customer privacy and data control (implemented)

- Private, opt-in product analytics and research-update preferences with no
  preselected consent and a versioned policy reference.
- Identity-bound access/export and account-deletion requests with one active
  request per type, explicit status and customer-visible history.
- Enrolled accounts require an AAL2 session before a rights request is accepted;
  browser roles cannot forge, complete or reject a request.
- Account deletion is queued for protected review and can be cancelled while
  pending. No browser action directly destroys data or activates execution.

**Phase 4L exit gate:** migration 024 parity, cross-user RLS and privilege tests,
idempotent request creation, verified-session enforcement for enrolled accounts,
and all live execution and fund-movement locks unchanged.

### Phase 4M — data trust and notification consent (implemented)

- Versioned freshness, completeness, duplicate and synchronization policies for
  market, trade and source-operation datasets.
- Protected service evaluation writes append-only sanitized evidence and a
  customer-visible current state without provider payloads or credentials.
- Private notification category and channel intent with explicit opt-in defaults,
  one-click external-channel unsubscribe and append-only consent history.
- Email and push delivery remain technically disabled until provider, regional
  privacy, deliverability and abuse-control approval; in-app alerts remain the
  only active delivery surface.

**Phase 4M exit gate:** migration 025 parity, service-only evaluator tests,
notification isolation and append-only consent tests, production HTTP 401 and
internal CORS isolation, with all live execution and fund-movement locks unchanged.

### Phase 4N — monetization foundation (implemented)

- Versioned Free, Pro and Business catalog in USD and GBP with normalized,
  customer-visible entitlements instead of new hard-coded commercial limits.
- Private subscription lifecycle, append-only events and hourly fail-closed
  reconciliation of expired trials back to Free access.
- A one-time 14-day Pro trial requires authentication, collects no payment method
  and cannot create a checkout session, charge, refund or fund movement.
- Service-only, idempotent, non-billable usage evidence supports future plan
  analytics without becoming a financial or accounting ledger.
- Billing-provider abstraction is database-locked with checkout, charge collection
  and customer portal disabled until provider, tax and entity approval.

**Phase 4N exit gate:** migration 026 parity, subscription isolation, append-only
history, trial idempotency, expiry reconciliation and explicit absence of payment
and live-order objects, with all execution locks unchanged.

### Phase 4O — customer experience foundation (implemented)

- Unified signed-in profile for locale, time zone, theme and display density.
- Durable guided onboarding across devices with bounded, append-only evidence.
- User-controlled reduced motion and high contrast preferences.
- Installable mobile web app with a static-assets-only service-worker boundary.
- No device fingerprints, behavioral tracking, auth caching or account-data caching.

**Phase 4O exit gate:** migration 027 parity, private preference and onboarding
tests, static-only PWA cache verification and unchanged payment and execution locks.

### Future regulated activation work

- Sandbox account and order mirroring behind separately permissioned services.
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
