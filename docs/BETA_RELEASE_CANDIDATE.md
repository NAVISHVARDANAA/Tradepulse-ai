# Controlled-beta release candidate

## Artifact-only status

Phase 4W produced the first controlled-beta engineering release candidate.
Phase 4X selects Cloudflare Pages and prepares RC2 for a protected, manual
deployment. It does not approve a production domain, configure Supabase Auth
redirects, approve external customer invitations or activate regulated execution.

The artifact contains `beta-release.json`, a machine-readable statement of its
scope. Live brokerage, payment execution, charge collection, custody and
personalized advice remain false. Search indexing also remains disabled.

## Included customer capabilities

- Evidence-first market, trade and global-equity research with explicit data states.
- Qualified forecast evidence, uncertainty and model-governance visibility.
- Private research routines, team research and free Academy learning.
- Passwordless accounts, TOTP step-up, privacy controls and customer support references.
- Paper investing, decision journals and portfolio-risk controls with no live routing.
- Brokerage-readiness previews and payment estimates that cannot execute.
- Responsive navigation, installable web assets and desktop/mobile accessibility gates.

## Deliberately unavailable

- Live broker orders, custody, settlement or real-money portfolio activity.
- Payment or transfer execution, checkout, charge collection or customer billing.
- Personalized investment advice, suitability approval or guaranteed forecasts.
- Automatic privacy-request fulfillment or destructive account deletion.
- Public discovery, unrestricted signup or unsupported external beta invitations.

## Manual prerequisites before external invitations

1. Select and validate the production domain, SPA routing, caching and rollback.
2. Configure exact web origin, Supabase Auth redirects and the deployed HTTPS URL.
3. Configure custom Auth SMTP, CAPTCHA/rate limits and customer security notifications.
4. Publish the controller entity, privacy/terms/risk policies and staffed support contacts.
5. Connect monitoring, assign on-call roles and exercise the incident-response runbook.
6. Approve the tester list, supported jurisdictions and feedback/escalation process.

These are operational, legal and business launch decisions. Passing Phase 4W
means the engineering candidate is ready for that review; it does not certify
regulatory approval or declare a public production launch.

## Evidence and acceptance

| Gate | Evidence |
| --- | --- |
| Application integrity | TypeScript, production build and bundle budgets |
| Browser experience | Desktop and mobile Playwright plus WCAG A/AA axe checks |
| Customer boundaries | Guest paper/brokerage/payment regression and Edge auth tests |
| Security | Production dependency audit, CodeQL, dependency review and security contract |
| Data boundary | RLS/migration tests and query-only production verification history |
| Artifact boundary | CSP/headers, no source maps or secret markers, static-only service worker |
| Release scope | `beta-release.json` and `npm run check:beta` |

Record the merge commit, GitHub workflow run ID and artifact name in the
restricted release record. Never place secrets, customer data or raw operational
evidence in a public issue or artifact.

## Hosting deployment procedure

After the Phase 4X PR is merged and all `main` checks pass:

1. Open **Actions → Build production web release**.
2. Select `main`, enter `BUILD_PHASE_4X` and run the workflow.
3. Confirm the workflow is green and record the `tradepulse-beta-rc2-<commit>` artifact.
4. Follow `docs/CLOUDFLARE_PAGES_HOSTING.md` for the guarded deployment.
5. Do not invite external testers until every manual prerequisite above is approved.

This phase has no database migration or deployed Edge Function change. Do not
run Supabase deployment or production verification for the Phase 4X PR.
