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
- Global commercial billing is designed around USD and GBP. User profiles retain
  a preferred billing currency without creating any fund-movement capability.

### Phase 3D — watchlists and daily research copilot

- Authenticated users can build a private, plan-limited equity watchlist from
  the licensed coverage registry.
- An evidence-linked daily brief summarizes current research classifications,
  model confidence, forecast direction, source freshness and risk flags.
- Research-score alert rules are evaluated against new stored snapshots and
  retain the exact evidence and deduplication key behind each in-app event.
- Brief generation is deterministic and versioned; it does not invent news,
  prices, fundamentals or model outputs.
- Email and push channels remain disabled until reviewed delivery providers,
  consent controls and regional privacy requirements are configured.

### Phase 3E — TradePulse Academy and guided onboarding

- Six free launch courses teach platform navigation, AI forecast literacy,
  stock research, paper trading, portfolio risk, the research copilot and
  regulated brokerage boundaries.
- Every lesson includes a server-graded knowledge check with explanations and a
  70% pass mark; the protected answer bank is never exposed to browser clients.
- Guests can learn immediately with device-local progress. Authenticated users
  receive private, cross-device progress protected by row-level security.
- A restartable six-step product tour and contextual “Learn this” links connect
  complex dashboard features directly to their relevant lessons.
- Completion records are certificate-ready but service-issued only. Academy
  content is education, not personalized advice or authorization to trade.

### Phase 4A — compliance-locked brokerage readiness

- A broker-neutral provider registry separates adapter contracts, regulatory
  due diligence, certification and production enablement.
- Private readiness records expose jurisdiction, identity, sanctions, AML,
  suitability, disclosure, broker-account and funding gates without treating a
  signed-in session as regulatory approval.
- Authenticated users can record current disclosure acknowledgements and create
  server-evaluated order previews with explicit blocker ownership.
- Every preview is constrained to `executable = false`; every provider route and
  instrument live-execution flag remains disabled, and no live-order endpoint
  exists.
- Brokerage and custody remain external regulated-partner responsibilities. No
  provider credentials, customer account numbers or assets enter the browser.

### Phase 4B — broker sandbox certification control plane

- A versioned broker-neutral certification catalog covers sandbox isolation,
  credential redaction, account normalization, order idempotency and lifecycle,
  webhook replay defense, resilience, reconciliation and the production-route
  lock.
- Immutable certification reports are accepted only from the service role and
  retain bounded outcomes, latency, source commit and evidence digests without
  storing provider payloads, credentials or customer account numbers.
- The brokerage dashboard exposes explicit passed, failed and not-run states so
  operational readiness cannot be inferred from a configured provider name.
- Database constraints keep every certification run in `sandbox` and prove that
  live routing was neither tested nor enabled.
- A passing certification report is operational evidence only. It cannot approve
  a jurisdiction, satisfy KYC/suitability, connect an account or authorize a live
  trade.

### Phase 4C — provider-bound sandbox adapter

- The first concrete brokerage implementation targets only Alpaca's Broker API
  sandbox at the fixed `broker-api.sandbox.alpaca.markets` origin.
- A server-only capability probe performs one read-only asset lookup. The
  adapter has no account, order, transfer, custody or production-host method.
- HTTP Basic credentials come only from Supabase Edge Function secrets. Errors,
  audit records and the product health view contain no credentials, account
  numbers or raw provider responses.
- Retries are bounded to one repeat of the safe GET. Production hosts, redirects,
  alternate paths and query strings fail closed before a request is made.
- An append-only health ledger records sanitized outcome, latency and attempt
  metadata. Browser clients cannot write it, and all live execution locks remain
  enforced independently by the database.

### Phase 4D — aggregate sandbox account inventory

- A second fixed read-only route calls only
  `GET /v1/accounts?entities=trading_configurations` in Alpaca's Broker API
  sandbox using the existing server-side read-only credential. The query avoids
  requesting contact, identity, document, agreement and trusted-contact entities.
- Provider account IDs, account numbers, names, emails, addresses, identity and
  raw response objects are discarded in memory and never persisted or returned.
- The adapter stores only status-bucket counts, currencies, restriction count and
  a one-way snapshot digest for change detection in an append-only audit ledger.
- Account creation, account connection, orders, transfers, positions, cash and
  all production hosts remain unimplemented and database-disabled.

### Phase 4E — broker operations monitoring

- A dynamic operations-health view evaluates adapter and inventory freshness,
  provider failures, aggregate restrictions, page-limit risk and inventory change.
- A service-only evaluator opens, refreshes and resolves idempotent in-app
  operational alerts. Every lifecycle transition is recorded in the financial
  audit trail, while browser clients remain read-only.
- Alert evidence contains only sanitized status, timestamps and aggregate counts;
  it contains no customer PII, provider account identifiers or credentials.
- The protected evaluator can be called by the existing server-side scheduler
  secret and is also invoked after the broker probe and inventory sync.

### Phase 4F — paper decision intelligence

- Every new simulated order requires a private thesis, conviction level and
  review horizon. The server captures the validated forecast and published
  research state available at decision time, preventing hindsight edits.
- Later synchronized prices evaluate paper decision return, forecast direction
  and forecast error through an append-only learning record and private scorecard.
- Idempotent retries reuse the original journal entry. Browser clients cannot
  forge or rewrite evidence or outcomes, and the evaluator has no provider or
  HTTP route.
- This feature remains virtual-cash simulation only. Broker account connection,
  real orders, custody and fund movement stay disabled.

### Phase 4G — forecast reliability and model governance

- Due forecasts are matched only to later synchronized observations inside a
  bounded evaluation window, producing immutable model error, no-change
  baseline error, direction and uncertainty-interval outcomes.
- A versioned policy evaluates rolling production evidence by asset, model and
  horizon. States remain explicit: provisional, qualified, watch or suspended.
- Suspended model versions are automatically excluded from forecast and equity
  research display views. Provisional and watch states stay visibly labeled.
- The ML validator now records held-out interval coverage plus a transparent
  turnover- and transaction-cost-aware backtest alongside its leakage-aware
  walk-forward metrics.
- Sanitized drift events contain only model and aggregate performance evidence.
  Governance cannot submit an order, call a broker or enable money movement.

### Phase 4H — product performance foundation

- One application-level authentication provider owns the Supabase session,
  replacing repeated listeners across authenticated product modules.
- Heavy stock-research, copilot, Academy, forecasting, paper-investing, risk,
  brokerage, chart and payment modules are split into independent browser chunks
  and mounted only as users approach them.
- Payment-corridor configuration is fetched only when the payment sandbox becomes
  relevant, and realtime refresh bursts are coalesced before re-querying data.
- Product-level error boundaries isolate a failed module so the rest of the
  platform remains usable.
- CI enforces measured gzip budgets for the initial shell, total JavaScript and
  the largest generated asset to prevent silent performance regressions.
- This optimization adds no brokerage, custody, order-routing or money-movement
  capability.

### Phase 4I — customer trust and security foundation

- Customer APIs enforce bounded request bodies and database-backed per-user,
  per-route allowances while returning retryable, support-friendly errors.
- Internal jobs use constant-time secret checks and never enable browser CORS.
- API responses include non-cacheable defensive headers and a support reference
  without exposing tokens, provider responses or customer financial data.
- CodeQL, dependency review, production dependency audit and automated security
  updates protect the software supply chain.

### Phase 4J — platform observability and incident readiness

- A five-minute database scheduler consolidates core-platform, market-data,
  forecasting and broker-sandbox health while preserving every execution lock.
- Append-only sanitized health and incident-transition evidence drives a
  customer-safe status surface with explicit initializing, degraded, outage and
  operational states.
- Rolling 30-day SLO and error-budget evidence prevents missing monitoring from
  being presented as healthy and pauses non-critical releases after budget burn.
- Every Edge Function emits one bounded structured completion event containing
  only service, support reference, method, status, outcome and latency.
- The incident runbook defines severity, containment, customer updates, recovery,
  evidence handling and post-incident review without placing secrets or PII in
  logs or public issues.

### Phase 4K — customer account security center

- Customers can enroll a TOTP authenticator, complete an accessible six-digit
  challenge and review a private security history.
- Accounts with a verified factor fail closed until the session reaches `aal2`;
  sensitive paper, quote and brokerage-readiness APIs enforce the same rule.
- Explicit local sign-out and other-session revocation avoid accidentally
  signing out every device when the customer intended a narrower action.
- Service-synchronized posture evidence excludes factor secrets, codes, tokens,
  email addresses, IP addresses and device fingerprints.
- Recovery remains fail-closed until custom SMTP, security notifications and a
  dual-control identity-verification procedure are tested.

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
- Node.js 24 LTS for application and deployment tooling
- Python, NumPy and scikit-learn for validated forecasting
- GitHub Actions CI

## Local setup

1. Install dependencies:

   ```bash
   nvm install
   nvm use
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

The repository contains seventeen server-side functions:

| Function | Purpose | Authorization |
| --- | --- | --- |
| `sync-fx-market-data` | Fetch and normalize EUR/USD and USD/INR reference rates from Frankfurter v2 | `x-sync-secret` |
| `generate-market-forecasts` | Generate a versioned 24-hour baseline forecast after enough observations exist | `x-sync-secret` |
| `create-payment-quote` | Persist an authenticated, non-executable indicative quote | Supabase user JWT |
| `create-paper-portfolio` | Create a plan-limited portfolio with virtual cash and risk limits | Supabase user JWT |
| `submit-paper-order` | Journal the thesis and point-in-time AI context for an idempotent, risk-checked simulated market order | Supabase user JWT |
| `refresh-paper-risk` | Value and reconcile an owned simulation portfolio, then evaluate due decision outcomes | Supabase user JWT |
| `set-paper-trading-control` | Pause or resume user-controlled paper trading | Supabase user JWT |
| `sync-equity-market-data` | Import approved equity reference data and adjusted daily bars with explicit feed/licensing state | `x-sync-secret` |
| `generate-equity-research` | Publish versioned, non-personalized research classifications and explanations | `x-sync-secret` |
| `sync-sec-equity-fundamentals` | Import reported US-company facts from SEC EDGAR with public-domain provenance | `x-sync-secret` |
| `generate-daily-research-brief` | Generate a private evidence-linked watchlist brief and evaluate research alerts | Supabase user JWT or `x-sync-secret` scheduler |
| `preview-brokerage-order` | Persist an authenticated, blocked order-readiness preview with explicit compliance and platform gates | Supabase user JWT |
| `probe-alpaca-broker-sandbox` | Run the fixed read-only Alpaca Broker API sandbox asset probe and persist sanitized health | `x-sync-secret` |
| `sync-alpaca-sandbox-account-inventory` | Persist a PII-free aggregate of sandbox account states for reconciliation monitoring | `x-sync-secret` |
| `evaluate-broker-operations` | Evaluate sanitized broker freshness and reconciliation signals and manage operational alerts | `x-sync-secret` |
| `evaluate-forecast-governance` | Score due forecasts, publish reliability evidence and enforce the model display gate | `x-sync-secret` |
| `evaluate-platform-reliability` | Consolidate sanitized service health, SLO evidence and incident lifecycle without enabling execution | `x-sync-secret` |
| `evaluate-data-quality` | Evaluate freshness, completeness, duplicate and synchronization evidence against versioned policies | `x-sync-secret` |

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

The brokerage adapter uses a separate Alpaca Broker API sandbox credential and
scheduler boundary. Configure `ALPACA_BROKER_API_KEY`,
`ALPACA_BROKER_API_SECRET` and a strong `BROKER_SANDBOX_SYNC_SECRET` in Supabase
Edge Function secrets. Do not reuse retail Trading API credentials, expose these
values as `VITE_*` variables or paste them into workflow inputs. The current
adapter cannot submit an order even when these secrets are present.

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
npm run check:beta-access
npm run check:beta-operations
npm run check:data-loading
npm run check:bundle
npm run check:beta
npm run check:navigation
npm run check:security
npm run typecheck:e2e
npm run test:e2e
PYTHONPATH=services/forecasting/src python -m unittest discover -s services/forecasting/tests -v
```

GitHub Actions validates the browser application, all Edge Functions, the ML
forecasting worker, and a clean rebuild of every migration in an isolated
Supabase Postgres instance for pull requests and pushes to `main`.

The browser build also enforces gzip budgets for the initial application shell,
the complete JavaScript graph and the largest individual chunk. Heavy research,
Academy, paper-investing, risk, brokerage and payment modules load only as users
approach them, while one shared authentication provider owns the Supabase session.

Production Supabase releases are manual and environment-protected. See
[`docs/SUPABASE_DEPLOYMENT.md`](docs/SUPABASE_DEPLOYMENT.md) for the required
GitHub environment secrets, approval gate, read-only verification workflow and
Phase 4S release procedure. The enforced trust baseline and operational launch
checklist are documented in
[`docs/SECURITY_ARCHITECTURE.md`](docs/SECURITY_ARCHITECTURE.md). Reliability
objectives and incident operations are documented in
[`docs/SERVICE_LEVEL_OBJECTIVES.md`](docs/SERVICE_LEVEL_OBJECTIVES.md) and
[`docs/INCIDENT_RESPONSE.md`](docs/INCIDENT_RESPONSE.md). Account MFA, session
and recovery controls are documented in
[`docs/ACCOUNT_SECURITY.md`](docs/ACCOUNT_SECURITY.md).
Customer consent and data-rights boundaries are documented in
[`docs/CUSTOMER_PRIVACY.md`](docs/CUSTOMER_PRIVACY.md).
The host-neutral production web artifact and required public-client secret are
documented in [`docs/WEB_RELEASE.md`](docs/WEB_RELEASE.md).
The grouped desktop and mobile product-navigation contract is documented in
[`docs/NAVIGATION_MOBILE_UX.md`](docs/NAVIGATION_MOBILE_UX.md).
The controlled-beta accessibility, browser and security regression gate is
documented in
[`docs/ACCESSIBILITY_SECURITY_REGRESSION.md`](docs/ACCESSIBILITY_SECURITY_REGRESSION.md).
The final engineering candidate scope, hard locks and manual launch prerequisites
are documented in
[`docs/BETA_RELEASE_CANDIDATE.md`](docs/BETA_RELEASE_CANDIDATE.md).

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
surface, plus USD/GBP billing-currency preferences. It does not create a live
brokerage or payment route.

Migration `012_research_copilot.sql` adds private brief preferences, idempotent
daily briefs, explainable alert evidence and a caller-secured watchlist research
view. Only the service-side copilot can publish briefs or alert events.

Migration `013_tradepulse_academy.sql` adds the public curriculum, protected
quiz answer bank, private lesson progress, guided-tour state and service-only
completion records. All essential launch courses are free and English-first;
language codes and versioned content support future localization.

Migration `014_brokerage_readiness_foundation.sql` adds broker-neutral provider
contracts, private readiness and consent records, globally locked execution
controls, non-executable order previews and the brokerage-readiness Academy
course. It creates no live-order or custody path.

Migration `015_broker_sandbox_certification.sql` adds the sandbox-only adapter
certification catalog, immutable sanitized evidence ledger, service-only report
writer and public readiness matrix. It adds no provider credential, production
endpoint or live-order path.

Migration `016_alpaca_broker_sandbox_adapter.sql` binds the provider registry to
the Alpaca Broker API sandbox, adds an immutable sanitized adapter-health ledger
and a service-only writer that refuses any alternate origin or execution-enabled
provider state. It adds no broker account or order capability.

Migration `017_alpaca_sandbox_account_inventory.sql` adds an immutable aggregate
account-inventory ledger and authenticated health view. It stores no provider
account identifier or customer PII and cannot enable account connections or any
order route.

Migration `018_broker_operations_monitoring.sql` adds sandbox freshness policy,
dynamic operational health and a service-controlled alert lifecycle derived only
from sanitized aggregate evidence. It cannot enable account connections, order
reads, order writes or live routing.

Migration `019_paper_decision_intelligence.sql` adds private append-only paper
decision evidence, deterministic outcome evaluation and a forecast-attribution
scorecard. It can only extend the existing virtual-cash simulator and creates no
broker, custody, payment or live-execution route.

Migration `020_forecast_reliability_governance.sql` adds immutable production
forecast outcomes, versioned reliability thresholds, drift evidence and a
display-qualified forecast boundary. Suspended models are removed from product
views, but the evaluator has no broker, order, custody or payment capability.

Migration `021_customer_trust_security.sql` adds short-lived service-only API
allowance counters and an atomic abuse-control boundary for authenticated Edge
Functions. Browser roles cannot inspect or modify the counters, and the release
does not add live execution, custody or money movement.

Migration `022_platform_observability_incidents.sql` adds privacy-safe service
health, SLO and incident evidence plus a sanitized customer status surface. It
does not copy identities, credentials, request payloads or financial data into
operational telemetry.

Migration `023_account_security_center.sql` adds private service-synchronized MFA
posture and append-only security history. The Security Center supports TOTP,
enrolled-session step-up and explicit session revocation while storing no factor
secret, one-time code, access token, IP address or device fingerprint. See
[`docs/ACCOUNT_SECURITY.md`](docs/ACCOUNT_SECURITY.md) for the production setup
and fail-closed recovery boundary.

Migration `024_customer_privacy_center.sql` adds private, opt-in preferences and
identity-bound data-access and deletion requests. Browser roles cannot complete,
reject or directly execute destructive requests, and enrolled accounts require
a verified session before a request is accepted. See
[`docs/CUSTOMER_PRIVACY.md`](docs/CUSTOMER_PRIVACY.md).

Migration `025_data_trust_notifications.sql` adds versioned data-quality policies,
append-only evaluations, a current trust surface and private notification consent
history. Email and push remain hard-disabled; see
[`docs/DATA_TRUST_NOTIFICATIONS.md`](docs/DATA_TRUST_NOTIFICATIONS.md).

Migration `026_monetization_foundation.sql` adds a versioned USD/GBP plan catalog,
private subscriptions, one-time Pro trials, normalized entitlements and
non-billable usage evidence. Checkout and charge collection remain disabled; see
[`docs/MONETIZATION_BOUNDARY.md`](docs/MONETIZATION_BOUNDARY.md).

Migration `027_customer_experience_foundation.sql` adds cross-device profile,
regional, accessibility and durable onboarding preferences. The installable web
app caches static assets only; see
[`docs/CUSTOMER_EXPERIENCE.md`](docs/CUSTOMER_EXPERIENCE.md).

Migration `028_customer_feedback_support.sql` adds private, rate-limited support
and product-feedback intake with customer-visible references; see
[`docs/CUSTOMER_SUPPORT.md`](docs/CUSTOMER_SUPPORT.md).
Migration `029_support_reference_compatibility.sql` makes opaque support-reference
generation portable across the production and isolated Supabase environments.
Migration `030_deterministic_trial_window.sql` guarantees exact fourteen-day Pro
trial windows by deriving every boundary from one captured timestamp.
Migration `031_business_workspace_foundation.sql` adds private organization and
role foundations without invitations, organization billing or shared trading;
see [`docs/BUSINESS_WORKSPACES.md`](docs/BUSINESS_WORKSPACES.md).
Migration `032_business_team_access.sql` adds bounded, in-app team invitations
and protected member administration without external email or shared execution.
Migration `033_business_shared_research.sql` adds role-controlled team research
collections and non-executing evidence notes.
Migration `034_public_runtime_read_boundary.sql` makes the intended anonymous
read boundary explicit for public market, forecast, equity, Academy, paper-
instrument and indicative-corridor surfaces while retaining RLS and denying
guest access to private customer, execution, payment and quiz-answer records.

Phase 4T adds hardened browser runtime validation, security headers, SPA routing
and an environment-protected production web-artifact workflow. It does not
publish to a hosting provider.

Phase 4U consolidates every existing product destination into five responsive,
keyboard-operable navigation groups without changing data, authorization or
execution boundaries.

Phase 4V adds automated desktop/mobile accessibility, keyboard, guest-boundary
and browser-security regression checks ahead of the beta release-candidate audit.

Phase 4W packages the artifact-only controlled-beta release candidate with a
machine-readable scope, consolidated readiness contract and explicit manual
prerequisites. It does not activate public distribution or regulated execution.

Phase 4X selects Cloudflare Pages and adds a protected manual web deployment
with live HTTPS, security-header and release-lock verification. External tester
invitations remain disabled until the domain, Auth and operational gates pass.

Phase 4Y repairs the production public-data authorization boundary discovered
during the first live smoke test. CI and the query-only production verifier now
exercise the same anonymous REST reads used by the browser.

Phase 4Z makes passwordless authentication deterministic in the hosted SPA.
The application owns the callback exchange, removes credentials and error
details from browser history, preserves an approved return destination and
shows safe recovery guidance when a link is expired, consumed or incomplete.
Build the repair with `BUILD_PHASE_4Z`, then deploy it through the protected
Cloudflare workflow with `DEPLOY_PHASE_4Z`.

Phase 5D makes controlled-beta authentication genuinely invite-only. Both
passwordless entry points use one reviewed helper with implicit Supabase user
creation disabled, normalized email handling and non-enumerating feedback.
Approved testers must be pre-provisioned through the protected Auth
administration process; the browser cannot approve or create an account.

Phase 5E adds a dedicated Beta launch center for approved testers. It combines
private identity, experience, notification and support readiness with ordered
links to Academy, Security Center and customer support. Checks fail partially
and safely, authenticator enrollment stays optional, and the workspace cannot
approve testers or unlock trading, payments, checkout or money movement.

Phase 5F makes shared product data route-aware. Focused workspaces now request
only their declared market, trade, forecast or equity domains, and realtime
listeners are created and removed with the active route. Dashboard, account,
support, privacy and beta-operations pages no longer pay the reliability or
performance cost of unrelated research queries. See
[`docs/ROUTE_AWARE_DATA_LOADING.md`](docs/ROUTE_AWARE_DATA_LOADING.md).

Phase 5G adds a focused customer Trust Center. It defines reviewable forecast,
brokerage-preview and cross-border-quote receipt standards, presents a
fail-safe Reliability Shield and smart alert inbox, records only clearable
workspace visits in local browser storage, and creates a redacted support
context. Guided and Professional modes change explanation density without
changing evidence or permissions. See
[`docs/CUSTOMER_TRUST_LAYER.md`](docs/CUSTOMER_TRUST_LAYER.md).

Phase 5H adds a separate approved-tester pilot workspace backed by
capacity-bounded cohorts, identity-bound agreement acceptance, four private
evaluation missions and dedicated staffed feedback/incident routes. The browser
cannot approve or enroll a tester, and all execution and money-movement locks
remain unchanged. See
[`docs/APPROVED_TESTER_PILOT.md`](docs/APPROVED_TESTER_PILOT.md).

Phase 5I adds a focused beta-hardening center for customer-safe recovery drills,
accessible review progress, local-only browser performance evidence and final
administrative release closure. It creates no analytics profile or regulated
activation path. See
[`docs/BETA_HARDENING.md`](docs/BETA_HARDENING.md).

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
