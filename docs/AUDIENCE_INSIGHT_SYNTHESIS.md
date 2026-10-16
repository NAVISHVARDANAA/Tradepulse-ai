# Phase 9C audience-insight synthesis

Phase 9C turns separate Phase 9B debrief exports into a bounded product-research
decision. The `#audience-insights` workspace accepts up to 24 local JSON files,
validates each one against the Phase 9B schema and creates an aggregate scorecard
without sending evidence to TradePulse or another service.

## Local evidence contract

- Only Phase 9B schema-version 1 exports with the explicit no-identity and
  no-transmission flags are accepted.
- Each file is limited to 64 KB and each synthesis is limited to 24 accepted
  debriefs.
- Evidence exists only in the page's React memory. Refreshing, navigating away
  or clearing the workspace removes the imported set.
- No source file, raw note, identity or contact field is retained, persisted or
  included in the aggregate export.
- Files containing identity/contact keys or an email-like value fail closed.
- The structured audience role, ratings, journey completion, most-useful,
  confusion, next-action and weekly-use selections are the only inputs used.

## Research decision thresholds

| Signal | Pilot-review threshold |
| --- | ---: |
| Valid debriefs | At least 5 |
| Full four-stop journeys | At least 80% |
| Average clarity | At least 4.0 / 5 |
| Average trust | At least 4.0 / 5 |
| Average perceived value | At least 4.0 / 5 |
| Weekly interest (`yes` or `maybe`) | At least 70% |

Fewer than five debriefs yields **Collect more evidence**. A usable sample that
misses any threshold yields **Iterate before the next wave**. Eight or more
debriefs with value below 2.5 or at least 50% `Not relevant today` yields
**Stop and reframe the proposition**. Meeting every threshold yields
**Evidence supports pilot review**.

The last state is a research signal, not an authorization. It cannot send an
invitation, approve or activate a cohort, provision an account, connect a data
provider, display a licensed feed or perform a financial action.

## Sharing boundary

Copy and download are explicit user actions. The export contains only aggregate
scores, distributions, gates and the non-authorizing decision state. It includes
flags confirming that raw text, source files, identity and contact fields are
absent and that nothing was transmitted automatically.

Phase 9C adds no migration, server endpoint, analytics tracker or provider
connection. The web release confirmations are `BUILD_PHASE_9C`,
`DEPLOY_PHASE_9C` and `VERIFY_WEB_PHASE_9C`. Publishing the code does not run
any of them; the Phase 8Z data confirmations remain unchanged.
