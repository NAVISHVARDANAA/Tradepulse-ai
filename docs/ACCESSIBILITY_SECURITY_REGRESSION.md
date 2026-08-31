# Controlled-beta accessibility and security regression

Phase 4V adds a browser-level release gate without changing customer data,
authorization, brokerage or payment execution behavior.

The Playwright suite runs in desktop Chromium and a Pixel 7 mobile viewport. It
checks WCAG 2 A/AA and WCAG 2.1 A/AA rules with axe-core, first-run guide focus
containment and restoration, keyboard desktop navigation, all 23 mobile product
destinations, mobile overflow and the guest-visible paper, brokerage and payment
locks. Failed CI runs retain a Playwright report for seven days.

`npm run check:security` independently enforces the browser security-header and
CSP contract, rejects unsafe DOM execution primitives and unreviewed browser
storage—including the reviewed Phase 5G activity and experience-mode keys—and
verifies guards on eight customer and eleven internal Edge
Functions. The shared authentication unit tests pin anonymous requests to HTTP
401, MFA step-up to HTTP 403 and server misconfiguration to HTTP 500.

## Local verification

Install the Chromium runtime once, then run the gates:

```bash
npx --no-install playwright install --only-shell chromium
npm run typecheck:e2e
npm run test:e2e
npm run check:security
```

Automated checks complement, but do not replace, final keyboard, screen-reader,
browser compatibility and security review during the beta release-candidate
audit.

## Release procedure

This phase has no database migration or deployed Edge Function change. After
merging to `main`, run **Actions → Build production web release**, select `main`,
and enter `BUILD_PHASE_4V`. Do not run the Supabase deployment or verification
workflows for this phase.
