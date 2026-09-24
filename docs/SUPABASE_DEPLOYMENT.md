# Supabase production deployment

TradePulse AI deploys database migrations and protected Edge Functions through
a manually triggered GitHub Actions workflow. The workflow
runs only from `main`, uses a non-cancelling production concurrency lock and
requires an explicit release phrase.

## One-time GitHub setup

1. In the repository, create a GitHub environment named `production`.
2. Add a required reviewer to that environment so a production release needs a
   second deliberate approval before GitHub exposes its secrets.
3. Add these environment secrets:

   | Secret | Value |
   | --- | --- |
   | `SUPABASE_ACCESS_TOKEN` | A scoped Supabase personal access token used only by GitHub Actions |
   | `SUPABASE_DB_PASSWORD` | The database password for the target Supabase project |
   | `SUPABASE_PROJECT_REF` | The target project's reference ID |
   | `WEB_SUPABASE_ANON_KEY` | The public anonymous key used only for browser-equivalent read smoke checks |

Never paste these values into an issue, pull request, workflow input, log,
browser client variable or chat. Rotate the access token and database password
immediately if either is exposed.

## One-time Supabase broker-sandbox runtime setup

Add these secrets through the Supabase dashboard or CLI; they are runtime Edge
Function secrets, not browser variables or GitHub workflow inputs:

| Secret | Value |
| --- | --- |
| `BROKER_SANDBOX_SYNC_SECRET` | A random scheduler secret shared only by protected internal broker-sandbox functions |
| `ALPACA_BROKER_API_KEY` | Alpaca Broker API sandbox key |
| `ALPACA_BROKER_API_SECRET` | Alpaca Broker API sandbox secret |
| `TRADEPULSE_WEB_ORIGIN` | Exact production web origin, for example `https://app.example.com`, with no trailing slash |

The migration and function can deploy before Alpaca credentials are available.
The dashboard will show `not run`; an authorized probe without credentials fails
closed and stores only `CONFIGURATION_INVALID`. Never use Alpaca live credentials
for this adapter.

## Release Phase 8N

1. Confirm the CI workflow on `main` is green.
2. Open **Actions → Deploy Supabase production → Run workflow**.
3. Select the `main` branch.
4. Enter `DEPLOY_DATA_PHASE_8N` as the confirmation value.
5. Approve the `production` environment deployment when prompted.

The workflow performs a database dry run, applies every pending migration in
filename order and redeploys every customer and internal Edge Function affected
by the shared security, observability and account-protection boundary. It verifies
migration `058`, checks active functions, verifies global-provider-candidate-review, global-provider-contract-tests, global-provider-certification, global-observation-provenance, global-dependency-transmission, global-country-coverage, global-evidence, controlled-live-rollout, global-event-intelligence, private agentic-investing, regulated-preflight,
internal-only sandbox-order, corridor-intelligence, beneficiary-protection and payment-compliance boundaries, and confirms approved public
runtime reads return HTTP 2xx. It also runs query-only production lock smoke
checks and proves that unauthenticated brokerage, paper-simulation,
platform-evaluation and account-security requests receive HTTP 401.

## Read-only production verification

Run **Actions → Verify Supabase production → Run workflow** after a release or
operational incident. Select `main` and enter `VERIFY_DATA_PHASE_8N`.

The verification workflow performs no production writes. It confirms local and
remote migration parity, executes the audited, query-only
`brokerage_readiness_smoke.sql`, `approved_tester_pilot_smoke.sql`,
`regulated_preflight_smoke.sql`, `sandbox_order_lifecycle_smoke.sql` and
`live_trading_readiness_smoke.sql`, `corridor_intelligence_smoke.sql` and
`beneficiary_protection_smoke.sql`, `payment_compliance_orchestration_smoke.sql`
`payment_sandbox_transfer_lifecycle_smoke.sql` and
`payment_money_movement_readiness_smoke.sql` and
`global_venue_instrument_intelligence_smoke.sql` and
`international_multi_asset_paper_trading_smoke.sql` and
`options_education_paper_trading_smoke.sql` and
`global_brokerage_custody_orchestration_smoke.sql` and
`agentic_investing_workspace_smoke.sql` and
`global_event_intelligence_engine_smoke.sql` blocks,
`global_evidence_corroboration_operations_smoke.sql` blocks,
`global_country_intelligence_coverage_smoke.sql` blocks,
`global_dependency_transmission_readiness_smoke.sql` blocks,
`global_observation_provenance_quarantine_smoke.sql` blocks,
`global_provider_certification_isolated_intake_smoke.sql` blocks,
`global_provider_contract_test_lab_smoke.sql` blocks,
`global_provider_candidate_evidence_review_smoke.sql` blocks,
checks that protected Edge Functions are active,
proves that approved anonymous browser reads work, confirms that protected
unauthenticated requests remain blocked and confirms that internal broker jobs
do not enable browser CORS. It does not call Alpaca
or write a health result. The GitHub run summary is the deployment-health audit
record. CI and both production workflows reject the smoke file if it contains a
write-capable SQL statement.

## Failure handling

- Database migration failures stop the workflow before the function deploys.
- Function-deployment failures leave completed database migrations in place;
  rerun the workflow after correcting the function because migrations are
  forward-only and must not be manually rolled back in production.
- A missing secret fails during preflight without printing the secret.
- Never use `--include-all` until remote migration history has been reconciled
  and reviewed.

Live brokerage and payment execution remain database-locked after this
deployment. Phase 8F adds the source-authenticity registry, causal event graph,
explicit country coverage and private in-app alert foundation described in
`docs/GLOBAL_EVENT_INTELLIGENCE_ENGINE.md`; it cannot scrape or store unlicensed
content, promote rumors, publish autonomously, accept real funds, hold assets,
route an order or settle a trade. Phase 8D brokerage and Phase 7E money-movement locks remain
unchanged.
Phase 8H adds the disconnected source-rights and corroboration control plane
described in `docs/GLOBAL_EVIDENCE_CORROBORATION_OPERATIONS.md`; it cannot
access private sources, bypass credentials, ingest unlicensed content, verify
or publish claims automatically, train models or execute trades.
Phase 8I adds the 195-country reference and explicit evidence-gap fabric
described in `docs/GLOBAL_COUNTRY_INTELLIGENCE_COVERAGE.md`; it cannot generate
country facts, connect providers, publish, train models or execute trades.
Phase 8J adds the global dependency and transmission readiness fabric described
in `docs/GLOBAL_DEPENDENCY_TRANSMISSION_READINESS.md`; it cannot infer or fill a
relationship, score an impact, promote a scenario, train a model, publish or
execute a trade.
Phase 8K adds the global observation provenance and quarantine fabric described
in `docs/GLOBAL_OBSERVATION_PROVENANCE_QUARANTINE.md`; it cannot connect a
provider, ingest or release an observation, auto-normalize or resolve conflicts,
train a model, publish or execute a trade.
Phase 8L adds the provider certification and isolated intake readiness fabric
described in `docs/GLOBAL_PROVIDER_CERTIFICATION_ISOLATED_INTAKE.md`; it cannot
select a provider, test an endpoint, store a credential, provision intake,
ingest or release an observation, train a model, publish or execute a trade.
Phase 8M adds the provider-neutral contract-test specification laboratory
described in `docs/GLOBAL_PROVIDER_CONTRACT_TEST_LAB.md`; its twenty-four
synthetic fixture specifications contain no provider payload or real-world
observation and none is represented as executed.
Phase 8N adds the provider-candidate evidence review foundation described in
`docs/GLOBAL_PROVIDER_CANDIDATE_EVIDENCE_REVIEW.md`; its eight packets are
unopened, all ninety-six evidence cells remain missing and no provider,
endpoint, credential, document, payload, reviewer or approval is recorded.

## Runtime baseline

Repository JavaScript tooling and GitHub workflows use Node.js 24 LTS from
`.nvmrc`. Privileged production workflows disable persisted checkout
credentials and automatic package-manager caching.
