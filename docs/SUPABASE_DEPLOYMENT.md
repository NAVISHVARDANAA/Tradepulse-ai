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

## Release Phase 4B

1. Confirm the CI workflow on `main` is green.
2. Open **Actions → Deploy Supabase production → Run workflow**.
3. Select the `main` branch.
4. Enter `DEPLOY_PHASE_4B` as the confirmation value.
5. Approve the `production` environment deployment when prompted.

The workflow performs a database dry run, applies every pending migration in
filename order, deploys only `preview-brokerage-order`, and verifies that
migration `015` and the active function are visible remotely. It also runs the
read-only production execution-lock and sandbox-certification smoke query and
proves that an unauthenticated preview request receives HTTP 401.

## Read-only production verification

Run **Actions → Verify Supabase production → Run workflow** after a release or
operational incident. Select `main` and enter `VERIFY_PHASE_4B`.

The verification workflow performs no production writes. It confirms local and
remote migration parity, executes the audited, query-only
`brokerage_readiness_smoke.sql` block, checks that `preview-brokerage-order` is
active and proves that unauthenticated requests remain blocked. The GitHub run
summary is the deployment-health audit record. CI and both production workflows
reject the smoke file if it contains a write-capable SQL statement.

## Failure handling

- Database migration failures stop the workflow before the function deploys.
- Function-deployment failures leave completed database migrations in place;
  rerun the workflow after correcting the function because migrations are
  forward-only and must not be manually rolled back in production.
- A missing secret fails during preflight without printing the secret.
- Never use `--include-all` until remote migration history has been reconciled
  and reviewed.

Live brokerage execution remains database-locked after this deployment. This
release adds a sandbox-only certification control plane; it still creates no
live-order route, provider credential store or custody capability.

## Runtime baseline

Repository JavaScript tooling and GitHub workflows use Node.js 24 LTS from
`.nvmrc`. Privileged production workflows disable persisted checkout
credentials and automatic package-manager caching.
