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

### Phase 4P — customer feedback and support (implemented)

- Authenticated, private intake for bugs, product feedback, data questions and account help.
- Customer-visible opaque support references and request history.
- Server-side content bounds and per-account abuse controls.
- No attachments, credentials, device fingerprints, provider payloads or trade instructions.

**Phase 4P exit gate:** migration 028 parity, cross-user isolation, protected
status history and unchanged payment, brokerage and execution locks.

### Phase 4Q — Business workspace foundation (implemented)

- Private organization profiles and customer-visible workspace identity.
- Owner, admin, analyst and viewer role vocabulary with server-controlled membership.
- Append-only workspace evidence and one owned workspace per customer.
- Invitations, shared portfolios, organization billing and trading remain disabled.

**Phase 4Q exit gate:** migration 031 parity, cross-workspace isolation, role
escalation prevention, append-only evidence and unchanged execution locks.

### Phase 4R — Business team access (implemented)

- Seven-day in-app invitations matched to a verified signed-in email.
- Owner/admin member visibility and protected non-owner removal.
- Seat-limit enforcement across active memberships and pending invitations.
- External email, organization billing, shared portfolios and trading remain disabled.

**Phase 4R exit gate:** migration 032 parity, invitation identity matching,
single-use acceptance, owner protection and unchanged billing and execution locks.

### Phase 4S — shared Business research (implemented)

- Role-controlled team research collections over covered instruments.
- Evidence-based research theses and bounded watch/positive/neutral/cautious stances.
- Owner, admin and analyst editors with read-only viewers.
- Append-only research evidence without personalized advice or order routing.

**Phase 4S exit gate:** migration 033 parity, viewer write denial, collection and
item bounds, append-only evidence and unchanged billing and execution locks.

### Phase 4T — production web-release foundation (implemented)

- Validated public Supabase runtime configuration with server-secret rejection.
- Host-neutral SPA routing, PWA assets, cache controls and browser security headers.
- Release artifact checks reject source maps, local environment files and secret markers.
- Manual, environment-protected and commit-addressed web artifact workflow.

**Phase 4T exit gate:** green application build, bundle budgets, release-boundary
checks and successful `BUILD_PHASE_4T` artifact creation from `main`.

### Phase 4U — navigation and mobile UX consolidation (implemented)

- Five stable product groups replace the crowded flat application navigation.
- All 20 existing destinations remain available across desktop and mobile.
- Active-section state, keyboard escape handling and mobile touch targets are explicit.
- CI and production web releases enforce the navigation-to-section contract.

**Phase 4U exit gate:** green type-check, application build, bundle and release
budgets, navigation contract and successful `BUILD_PHASE_4U` artifact creation
from `main`.

### Phase 4V — accessibility, security and browser regression (implemented)

- Desktop and mobile Chromium exercise the controlled-beta customer journey.
- WCAG A/AA automation covers the product shell and first-run guide.
- Keyboard focus, grouped navigation, mobile overflow and guest execution locks are pinned.
- Security contracts guard browser policy, unsafe DOM use and customer/internal Edge Functions.

**Phase 4V exit gate:** green desktop/mobile browser suite, accessibility scan,
security contract, shared authentication tests and successful `BUILD_PHASE_4V`
artifact creation from `main`.

### Phase 4W — controlled-beta release candidate (implemented)

- Machine-readable artifact manifest states audience, release status and hard locks.
- One readiness contract joins build, browser, security, migration and release evidence.
- Customer capabilities, deliberate limitations and manual launch prerequisites are explicit.
- The protected workflow emits an immutable commit-addressed beta candidate artifact.

**Phase 4W exit gate:** green application, browser, security and beta-readiness
checks plus successful `BUILD_PHASE_4W` artifact creation from `main`.

### Phase 4X — Cloudflare Pages deployment foundation (implemented)

- Cloudflare Pages is selected for the controlled-beta static web application.
- A protected manual workflow rebuilds, validates and deploys an immutable commit.
- Live HTTPS smoke checks prove security headers, release identity and hard locks.
- Public-domain approval, Auth redirects and external tester invitations stay manual.

**Phase 4X exit gate:** green application and hosting contracts, successful
`BUILD_PHASE_4X` RC2 artifact creation, then a reviewed `DEPLOY_PHASE_4X` run.

### Phase 4Y — production public-read boundary (implemented)

- Explicit grants replace environment-dependent defaults for public web data.
- Security-invoker views retain RLS filtering across their base relations.
- Private customer, execution, payment and quiz-answer records remain denied.
- Production verification runs the browser's anonymous REST read contract.

**Phase 4Y exit gate:** migration 034 parity, successful anonymous REST smoke
checks and unchanged HTTP 401 protection for every private execution surface.

### Phase 4Z — deterministic passwordless authentication (implemented)

- Browser callbacks establish the Supabase session before private modules load.
- Access and refresh tokens are removed from browser history immediately.
- Expired, consumed and incomplete links fail closed with actionable guidance.
- Paper Investing and Security Center return links use approved destinations.
- Browser regression tests prove both successful and failed callback behavior.

**Phase 4Z exit gate:** green callback regression checks, successful
`BUILD_PHASE_4Z` artifact creation, reviewed `DEPLOY_PHASE_4Z` deployment and a
production passwordless sign-in that exposes only private simulation controls.

### Phase 5A — layered product workspaces (implemented)

- The executive dashboard is a concise launchpad instead of one long product scroll.
- Research, forecasting, markets, simulation, risk, business and account tools render as focused hash-routed workspaces.
- Forecast reporting adds instrument, governance and direction filters, report sorting and live summary counts.
- Desktop and mobile navigation, deep links, passwordless return routes and the six-step guide follow the same workspace model.
- Database, model-governance, security and live-execution locks remain unchanged.

**Phase 5A exit gate:** green type, build, bundle, navigation, accessibility,
security and hosting checks, successful `BUILD_PHASE_5A` artifact creation and
a reviewed `DEPLOY_PHASE_5A` deployment.

### Phase 5B — governed enterprise analytics (implemented)

- Analytics Studio introduces reusable subject areas for markets, forecasts, equities and trade.
- Certified metric definitions expose formula, grain and source-to-report lineage.
- Report consumers can apply slicers, cross-filter distributions, sort rows and drill into governed evidence.
- Saved views remain device-local and filtered report rows can be exported as CSV.
- Freshness and completeness stay visible; missing evidence is never converted into a live signal.
- The current runtime remains Supabase Postgres behind RLS. The semantic contract is warehouse-ready, but no Snowflake connection is claimed or configured.

**Phase 5B exit gate:** green Analytics Studio contract, desktop/mobile browser
regression, bundle, security and hosting checks, successful `BUILD_PHASE_5B`
artifact creation and a reviewed `DEPLOY_PHASE_5B` deployment.

### Phase 5C — production experience assurance (implemented)

- A production-only Playwright contract visits every public high-risk workspace on desktop and mobile.
- Console errors, uncaught page errors and HTTP 4xx/5xx responses from TradePulse or Supabase fail the release gate.
- Analytics Studio subject switching, cross-filtering, saved views and governed drill-through are exercised against the deployed runtime.
- Guest paper, brokerage and payment execution boundaries are re-proved after deployment.
- The protected deployment workflow runs the browser gate automatically, while a separate read-only workflow can repeat it after releases or incidents.
- No database, Edge Function, authorization, live trading, payment or custody boundary changes in this phase.

**Phase 5C exit gate:** green production-experience contract, desktop/mobile
deployed browser smoke, CI, Security and release checks, successful
`BUILD_PHASE_5C`, reviewed `DEPLOY_PHASE_5C`, and read-only
`VERIFY_WEB_PHASE_5C` evidence.

### Phase 5D — invite-only controlled-beta access (implemented)

- Passwordless entry points share one reviewed access helper and never create a
  new Supabase user implicitly.
- Only pre-provisioned approved email addresses can receive a controlled-beta
  sign-in link; the browser cannot add, approve or invite a tester.
- Customer feedback is intentionally non-enumerating, so an unknown address
  cannot be distinguished from an approved address through the product UI.
- The release manifest, CI, desktop/mobile browser suite and deployed production
  checks pin the invite-only boundary while public research remains available.
- Tester approval, supported jurisdiction, custom SMTP and external invitation
  decisions remain manual launch prerequisites outside the browser application.

**Phase 5D exit gate:** green invite-only access, browser, security, release and
production-experience contracts, successful `BUILD_PHASE_5D`, reviewed
`DEPLOY_PHASE_5D`, and read-only `VERIFY_WEB_PHASE_5D` evidence. No database,
Edge Function, live-trading, payment, custody or advice boundary changes.

### Phase 5E — controlled-beta onboarding and operations (implemented)

- A dedicated Beta launch center replaces scattered onboarding instructions
  with one focused, customer-facing operations workspace.
- Approved testers can see private readiness signals for their identity,
  experience profile, notification controls and support route without exposing
  administrative data or other customers.
- Independent checks use partial-failure handling so a delayed security or
  support service does not hide the remaining customer recovery actions.
- Guided links connect Academy, experience preferences, notification controls,
  Security Center and private support into one ordered beta journey.
- Authenticator enrollment remains recommended rather than falsely mandatory;
  browser-based tester approval and implicit signup remain disabled.
- Research, education and simulation remain separated from advice, live
  execution, checkout, payments, custody and money movement.

**Phase 5E exit gate:** green beta operations, invite-only access, browser,
security, release and production-experience contracts, successful
`BUILD_PHASE_5E`, reviewed `DEPLOY_PHASE_5E`, and read-only
`VERIFY_WEB_PHASE_5E` evidence. No database or Edge Function deployment.

### Phase 5F — route-aware data loading (implemented)

- Every focused workspace declares the market, trade, forecast and equity data
  domains it actually renders instead of inheriting dashboard-wide startup work.
- Dashboard, status, account, privacy, support, experience and beta-operations
  routes issue no shared research-data query and create no shared realtime channel.
- Query modules load on demand; route-scoped realtime subscriptions are removed
  and rebuilt when customers move between workspaces.
- Forecast-linked equity research continues to refresh from forecast reliability
  changes, while unrelated workspaces remain isolated from those events.
- Desktop/mobile browser evidence proves both negative isolation and the positive
  Forecasts loading path; a repository contract pins the complete route matrix.
- Research truth states, invite-only access and every execution hard lock remain
  unchanged.

**Phase 5F exit gate:** green route-aware data, browser, bundle, security,
release and production-experience contracts, successful `BUILD_PHASE_5F`,
reviewed `DEPLOY_PHASE_5F`, and read-only `VERIFY_WEB_PHASE_5F` evidence. No
database or Edge Function deployment.

### Phase 5G — customer trust layer (implemented)

- A dedicated Trust Center defines reviewable evidence receipts for forecasts,
  non-executable brokerage previews and indicative cross-border quotes.
- The Reliability Shield fails safely when customer-safe status evidence is
  missing and the smart alert inbox separates attention from information.
- A customer-clearable, capped financial-flight-recorder foundation records
  workspace visits only in local browser storage; no financial or identity data
  is retained there.
- Context-aware support produces a bounded diagnostic summary without email,
  credentials, account, portfolio or payment details.
- Guided and Professional modes change explanation density without changing
  evidence, authorization, entitlements or hard locks.
- The focused route loads no shared research data and introduces no migration,
  Edge Function or provider integration.

**Phase 5G exit gate:** green trust-layer, route-aware data, browser, bundle,
security, release and production-experience contracts, successful
`BUILD_PHASE_5G`, reviewed `DEPLOY_PHASE_5G`, and read-only
`VERIFY_WEB_PHASE_5G` evidence. Live orders, custody, checkout, payment
execution, charge collection and personalized advice remain hard locked.

### Controlled-beta finish line

The planned product engineering foundation is complete after Phase 4W. Phase
4X adds the selected hosting deployment path, Phase 4Y verifies the live
public-data authorization boundary, and Phase 4Z repairs the passwordless
customer-session callback. Phase 5D makes the deployed account boundary
explicitly invite-only, and Phase 5E gives approved testers a private launch
center for onboarding and operational recovery. Phase 5F limits shared queries
and realtime work to the active product workspace. The candidate remains closed to
external testers until its documented domain, operational, privacy, security
and tester-approval prerequisites are complete. Phase 5G adds the visible trust
and recovery foundation needed before controlled testers evaluate more complex
financial workflows.

### Controlled-beta completion

#### Phase 5H — approved tester pilot (implemented)

- A separate private pilot workspace keeps launch operations and tester missions
  out of the executive dashboard.
- Cohort capacity, schedule and agreement version are database enforced; the
  browser cannot create a cohort, approve a tester or increase capacity.
- Approved testers accept the exact current pilot agreement before recording
  private progress across four fixed research, trust, simulation and recovery
  missions.
- Dedicated pilot feedback and incident categories use the existing private,
  rate-limited support intake with staffed response targets.
- No cohort or tester is activated by code. Jurisdiction, support, legal,
  privacy, security and operational approvals remain manual prerequisites.

**Phase 5H exit gate:** green approved-pilot, database, browser, security,
release and production-experience contracts; reviewed `DEPLOY_DATA_PHASE_5H`;
read-only `VERIFY_DATA_PHASE_5H`; successful `BUILD_PHASE_5H`; reviewed
`DEPLOY_PHASE_5H`; and read-only `VERIFY_WEB_PHASE_5H` evidence. Public signup,
live orders, custody, checkout, payment execution and money movement remain
hard locked.

#### Phase 5I — beta hardening (implemented)

- A focused hardening workspace turns final beta review into four explicit
  customer recovery drills for stale data, identity/session recovery, decision
  evidence and private incident escalation.
- Native controls, live progress, keyboard-safe links and mobile layout closure
  extend accessibility evidence without replacing manual screen-reader review.
- Customer-safe browser diagnostics expose connectivity, viewport overflow,
  reduced-motion preference and Navigation Timing without persistence,
  fingerprinting or external analytics.
- The release manifest and one repository contract join recovery, performance,
  accessibility, production browser and hard-lock evidence into the final
  controlled-beta engineering gate.
- In-product completion is review evidence only. Deployment and external tester
  activation remain protected, manual decisions.

**Phase 5I exit gate:** green beta-hardening, approved-pilot, route-aware data,
browser, bundle, security, release and production-experience contracts;
successful `BUILD_PHASE_5I`; reviewed `DEPLOY_PHASE_5I`; and read-only
`VERIFY_WEB_PHASE_5I` evidence. No database migration or Edge Function is
added, and live orders, custody, checkout, payment execution and money movement
remain hard locked.

### Regulated trading sequence

#### Phase 6A — regulated preflight (implemented)

- A separate private workspace evaluates jurisdiction eligibility, exact current
  disclosures, compliance-managed suitability, reference freshness, market
  session state, total-cost availability and bounded risk evidence.
- Missing policy or evidence fails closed. A current quote never proves an
  executable session, and unavailable fees, taxes or FX costs are never shown
  as zero.
- Reviews are identity-bound, idempotent and auditable. Browser clients cannot
  forge reviews or compliance outcomes; the service-only writer constrains
  every result to blocked and non-executable.
- No brokerage order table or submission function exists. Account funding,
  custody, settlement, checkout, payment execution and money movement remain
  absent.

**Phase 6A exit gate:** green regulated-preflight, database, Edge Function,
browser, security and release contracts; reviewed `DEPLOY_DATA_PHASE_6A`;
read-only `VERIFY_DATA_PHASE_6A`; successful `BUILD_PHASE_6A`; reviewed
`DEPLOY_PHASE_6A`; and read-only `VERIFY_WEB_PHASE_6A` evidence.

#### Phase 6B — partner-sandbox order lifecycle (implemented)

- An internal-only Edge Function submits long-only US-equity limit bracket orders to
  the fixed Alpaca Broker API sandbox origin. Provider credentials and raw
  account identifiers never enter the browser or database.
- UUID command keys, deterministic client order identifiers and provider lookup
  reconciliation make submission idempotent. An ambiguous POST is never
  repeated; a safe lookup determines whether the sandbox accepted it.
- Cancel, replace and reconciliation actions remain internal capabilities. The
  customer workspace is read-only and exposes only sanitized lifecycle states,
  append-only trust receipts and aggregate reconciliation health.
- Active, consented approved-pilot membership, protective take-profit and
  stop-loss prices, quantity/notional ceilings, the sandbox provider route and
  the global live-order lock are enforced before and during persistence.
- Live brokerage, short selling, funding, custody, settlement, checkout,
  payment execution and money movement remain unavailable.

**Phase 6B exit gate:** green sandbox-order lifecycle, regulated-preflight,
database, Edge Function, browser, security and release contracts; reviewed
`DEPLOY_DATA_PHASE_6B`; read-only `VERIFY_DATA_PHASE_6B`; successful
`BUILD_PHASE_6B`; reviewed `DEPLOY_PHASE_6B`; and read-only
`VERIFY_WEB_PHASE_6B` evidence.

### Phase 6C — controlled live-trading readiness (implemented foundation)

- Eighteen independently reviewable jurisdiction, broker, compliance, funding,
  custody, settlement, market-data, risk, monitoring, reconciliation, security,
  incident and customer-protection requirements form a public sanitized ledger.
- Approval decisions are service-only and append-only. Only one-way evidence and
  reviewer fingerprints are retained; raw documents and reviewer identities are
  not stored or exposed.
- The browser is read-only and contains no approval, activation, funding or order
  control. Missing, rejected and expired evidence remains visibly blocking.
- Database constraints keep live routing, browser submission, automatic
  activation, funding, custody, settlement, margin, short selling and kill-switch
  activation false—even when all eighteen evidence items are current.
- A future activation phase remains separate and requires written external
  approvals, dual control, production broker integration and observed drills.

**Phase 6C exit gate:** green live-readiness, sandbox lifecycle, regulated
preflight, database, browser, security and release contracts; reviewed
`DEPLOY_DATA_PHASE_6C`; read-only `VERIFY_DATA_PHASE_6C`; successful
`BUILD_PHASE_6C`; reviewed `DEPLOY_PHASE_6C`; and read-only
`VERIFY_WEB_PHASE_6C` evidence. This exit gate does not authorize live trading.

### Future regulated activation work

- Sandbox account and order mirroring behind separately permissioned services.
- KYC/KYB, AML, sanctions, transaction monitoring, travel-rule applicability,
  suitability, disclosures and regulatory reporting.
- Broker ledger, provider reconciliation, webhooks, retries and disaster recovery.

**Exit gate:** legal, compliance, security, broker and market-data approvals are
written and auditable before any production trade can be submitted.

## Planned cross-border payments sequence (final execution domain)

- **Phase 7A — corridor intelligence:** transparent reference rate, provider
  rate, spread, fees, taxes, delivered amount, ETA and route availability.
- **Phase 7B — beneficiary protection:** validated beneficiary details,
  duplicate detection, cooling-off and scam/intervention warnings.
- **Phase 7C — compliance orchestration:** corridor-specific KYC/KYB, AML,
  sanctions, transaction monitoring, travel-rule and audit workflows.
- **Phase 7D — sandbox transfer lifecycle:** licensed-partner sandbox,
  double-entry ledger, idempotency, webhooks, retries, reconciliation, rescue
  mode, disputes and refunds.
- **Phase 7E — controlled money movement:** corridor-by-corridor safeguarding,
  legal, compliance, security, partner and operational approval before any
  production fund movement.

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
