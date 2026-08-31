# Controlled-beta release candidate

## Artifact-only status

Phase 4W produced the first controlled-beta engineering release candidate.
Phase 4X selects Cloudflare Pages and prepares RC2 for a protected, manual
deployment. It does not approve a production domain, configure Supabase Auth
redirects, approve external customer invitations or activate regulated execution.
Phase 5D prevents the browser from implicitly creating Auth users: private
features are available only to pre-provisioned approved testers.
Phase 5E adds a dedicated **Beta launch center** that summarizes each approved
tester's private profile, security, notification and support readiness. It is a
customer operations view—not an administrator console—and cannot approve a
tester, create an account or change any execution boundary.
Phase 5F makes shared product data route-aware: account and operations pages no
longer start unrelated market, trade, forecast or equity queries, while each
research workspace retains the exact data and realtime updates it needs.
Phase 5G adds a focused Trust Center with evidence-receipt standards,
customer-safe reliability alerts, a local-only activity trail, safe support
context and guided/professional explanation modes. It does not unlock any
regulated action.
Phase 5H adds a separate approved-tester pilot workspace. Cohort capacity,
schedule and agreement version are database enforced; the browser cannot
approve or enroll a tester. Active members can follow four bounded missions and
use private staffed feedback or incident escalation. No cohort or external
invitation is activated by code.
Phase 5I adds customer-safe recovery drills, accessibility closure and local
browser performance evidence. Review state is not persisted or transmitted and
cannot activate a tester, deployment, trade, checkout or payment.

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

## Invite-only access procedure

1. Approve the tester, supported jurisdiction and feedback/escalation owner
   outside the public repository.
2. Pre-provision the exact approved email through **Supabase → Authentication →
   Users → Add user**. Never commit tester addresses or distribute a shared login.
3. The tester requests a passwordless link from TradePulse. The browser passes
   `shouldCreateUser: false`, so an unapproved address cannot create an account.
4. The product always returns the same customer-safe acknowledgement and does
   not reveal whether an address is registered.
5. Remove access through the reviewed Auth administration process when the test
   period ends. This does not bypass the separate privacy-request workflow.

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

After the Phase 5I PR is merged and all `main` checks pass:

1. Confirm the previously deployed Phase 5H migration 035 verification remains green.
2. Open **Actions → Build production web release**.
3. Select `main`, enter `BUILD_PHASE_5I` and run the workflow.
4. Confirm the workflow is green and record the `tradepulse-beta-rc2-<commit>` artifact.
5. Follow `docs/CLOUDFLARE_PAGES_HOSTING.md` for the guarded deployment.
6. Run **Verify web production** with `VERIFY_WEB_PHASE_5I` after deployment
   or any customer-facing operational incident.
7. Do not invite external testers until every manual prerequisite above is approved.

Phase 5I adds no database migration or Edge Function. Do not rerun a data
deployment merely for this web hardening change.
