# Beta hardening and release closure

## Phase 5I boundary

Phase 5I closes the planned controlled-beta engineering sequence with a focused
workspace at `#beta-hardening`. It helps reviewers exercise customer recovery,
accessibility and browser-performance evidence without creating a new customer
data store, analytics profile or regulated capability.

**No execution or money movement:** this phase cannot approve testers, change
entitlements, submit orders, create checkout, collect charges, hold custody,
execute payments or move funds.

## Recovery drills

Reviewers exercise four bounded customer paths:

1. **Data freshness recovery** — stale, missing and unknown evidence stays
   visible and is never converted into a live signal.
2. **Session and identity recovery** — passwordless return and session guidance
   preserves the invite-only, no-implicit-signup boundary.
3. **Decision evidence recovery** — Trust Center receipts retain source,
   uncertainty and the non-executable boundary.
4. **Customer incident escalation** — private support creates an opaque
   reference without credentials, payment details or brokerage secrets.

The checkboxes are page-session review aids only. They are not stored, sent to
an analytics provider or accepted as operational approval.

## Accessibility closure

- Every drill uses a native checkbox with an explicit accessible name.
- Readiness and progress use live status text plus a native progress element.
- Keyboard focus follows existing product navigation and link behavior.
- Reduced-motion preference is displayed and existing global motion controls
  remain authoritative.
- Desktop and mobile browser regression continue to enforce WCAG A/AA,
  horizontal overflow and complete navigation reachability.

Automated evidence complements, but never replaces, a final keyboard and
screen-reader review by the release owner.

## Performance evidence

The workspace reads the browser's Navigation Timing entry, online state,
viewport overflow and reduced-motion preference. This evidence remains local to
the current page session and is never transmitted or persisted. It is diagnostic
rather than a contractual SLA.

CI bundle budgets, lazy-route boundaries and production Playwright checks remain
the authoritative performance gates.

## Release-readiness closure

A green engineering candidate requires:

- typecheck, build, bundle, browser, security and production-experience gates;
- approved-pilot, route-aware loading, trust and beta-hardening contracts;
- all five regulated-action hard locks remaining false;
- recovery, rollback, support and incident evidence retained by the release
  owner; and
- manual legal, privacy, jurisdiction, SMTP, on-call and tester approvals.

The in-product “Ready for administrative release review” state is not an
approval. Only the protected release workflow and named human reviewers may
authorize a deployment or tester invitation.

## Deployment

Phase 5I adds **no database migration**, Edge Function, provider integration or
external analytics connection. Migration 035 remains the latest data boundary.

After merge and green `main` checks:

1. run **Build production web release** with `BUILD_PHASE_5I`;
2. run **Deploy controlled beta web** with `DEPLOY_PHASE_5I`;
3. run **Verify web production** with `VERIFY_WEB_PHASE_5I`;
4. retain the merge commit, workflow links, artifact and deployment URL in the
   restricted release record.

External invitations remain disabled until every manual prerequisite is
approved and a bounded Phase 5H cohort is deliberately activated.
