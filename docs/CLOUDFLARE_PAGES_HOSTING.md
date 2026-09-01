# Cloudflare Pages controlled-beta hosting

## Boundary

Phase 4X selects Cloudflare Pages and adds a protected, manual deployment path
for the controlled-beta candidate. It does not approve a production domain,
open customer registration or activate live trading, custody, personalized
advice, checkout, charge collection or payment execution. External invitations remain disabled
until the operational, privacy, security and tester gates are approved outside
this repository.

## One-time Cloudflare setup

1. In Cloudflare, create a Pages project named with lowercase letters, numbers
   and hyphens. Direct Upload is sufficient; do not enable automatic Git builds.
2. Create an API token scoped only to **Account → Cloudflare Pages → Edit** for
   the account that owns that project.
3. In GitHub, open **Settings → Environments → production** and add:
   - secret `CLOUDFLARE_API_TOKEN`
   - variable `CLOUDFLARE_ACCOUNT_ID`
   - variable `CLOUDFLARE_PAGES_PROJECT`
4. Keep the existing production environment reviewer protection. The existing
   `SUPABASE_PROJECT_REF` and `WEB_SUPABASE_ANON_KEY` remain required.

The API token is a deployment credential and must never be exposed to Vite,
committed to Git or copied into a downloadable artifact. The Supabase anon key
is intentionally public and is still constrained by RLS and server-side auth.

## First guarded deployment

After this PR is merged and all `main` checks pass:

1. Open **Actions → Build production web release**, choose `main`, enter
   `BUILD_PHASE_6B` and record the green sandbox-order lifecycle web artifact.
2. Open **Actions → Deploy controlled beta web**, choose `main`, enter
   `DEPLOY_PHASE_6B` and approve the protected production environment.
3. Record the immutable commit, workflow run and Cloudflare deployment URL from
   the job summary. The workflow verifies HTTPS, browser security headers, the
   release manifest and every hard lock after upload. It then runs desktop and
   mobile production browser checks across the public workspaces, Analytics
   interactions, console/network failures and guest execution locks.
4. After a release or operational incident, open **Actions → Verify web
   production**, choose `main`, enter `VERIFY_WEB_PHASE_6B` and retain the green
   production-browser report.
5. Do not invite testers yet. Choose and validate the final domain, configure
   its exact Supabase Auth site URL and redirect allow-list, then complete the
   remaining launch prerequisites in `docs/BETA_RELEASE_CANDIDATE.md`.

Deploy and verify migrations 037-038 with the Phase 6B data gates before deploying the
web workspace. The new evaluator creates only blocked, non-executable evidence
and the sandbox lifecycle remains internal-only. Neither activates a live order
route, cohort or external invitation.
