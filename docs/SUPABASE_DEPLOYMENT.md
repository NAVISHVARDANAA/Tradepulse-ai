# Supabase production deployment

TradePulse AI deploys database migrations and the brokerage-readiness Edge
Function through a manually triggered GitHub Actions workflow. The workflow
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

Never paste these values into an issue, pull request, workflow input, log,
browser client variable or chat. Rotate the access token and database password
immediately if either is exposed.

## One-time Supabase broker-sandbox runtime setup

Add these secrets through the Supabase dashboard or CLI; they are runtime Edge
Function secrets, not browser variables or GitHub workflow inputs:

| Secret | Value |
| --- | --- |
| `BROKER_SANDBOX_SYNC_SECRET` | A random scheduler secret shared only by the protected broker sandbox probe and account-inventory sync |
| `ALPACA_BROKER_API_KEY` | Alpaca Broker API sandbox key |
| `ALPACA_BROKER_API_SECRET` | Alpaca Broker API sandbox secret |
| `TRADEPULSE_WEB_ORIGIN` | Exact production web origin, for example `https://app.example.com`, with no trailing slash |

The migration and function can deploy before Alpaca credentials are available.
The dashboard will show `not run`; an authorized probe without credentials fails
closed and stores only `CONFIGURATION_INVALID`. Never use Alpaca live credentials
for this adapter.

## Release Phase 4Q

1. Confirm the CI workflow on `main` is green.
2. Open **Actions → Deploy Supabase production → Run workflow**.
3. Select the `main` branch.
4. Enter `DEPLOY_PHASE_4Q` as the confirmation value.
5. Approve the `production` environment deployment when prompted.

The workflow performs a database dry run, applies every pending migration in
filename order and redeploys every customer and internal Edge Function affected
by the shared security, observability and account-protection boundary. It verifies
migration `031`, checks active functions, runs the query-only production lock
smoke check and proves that unauthenticated brokerage, paper-simulation,
platform-evaluation and account-security requests receive HTTP 401.

## Read-only production verification

Run **Actions → Verify Supabase production → Run workflow** after a release or
operational incident. Select `main` and enter `VERIFY_PHASE_4Q`.

The verification workflow performs no production writes. It confirms local and
remote migration parity, executes the audited, query-only
`brokerage_readiness_smoke.sql` block, checks that protected Edge Functions are active,
proves that unauthenticated requests remain blocked and confirms that internal
broker jobs do not enable browser CORS. It does not call Alpaca
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

Live brokerage execution remains database-locked after this deployment. This
release adds optional TOTP MFA, mandatory step-up for enrolled accounts, explicit
session revocation and private security history. Complete
`docs/ACCOUNT_SECURITY.md` before external beta access. The release still creates
no live-order route, provider credential store, customer account connection,
custody capability or money movement.

## Runtime baseline

Repository JavaScript tooling and GitHub workflows use Node.js 24 LTS from
`.nvmrc`. Privileged production workflows disable persisted checkout
credentials and automatic package-manager caching.
