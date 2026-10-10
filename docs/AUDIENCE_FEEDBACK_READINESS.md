# Phase 9B audience-feedback readiness

## Outcome

Phase 9B turns the safe Phase 9A walkthrough into a repeatable learning loop.
The public `#demo-feedback` workspace records whether an audience member
completed the four demo stops and captures structured signals about clarity,
trust, perceived value, confusion, expected next action and likely weekly use.

The purpose is product discovery, not lead capture. The workspace does not ask
for a name, email address, phone number, account identifier, brokerage detail or
financial information.

## Evidence boundary

- Journey progress and feedback are stored in `sessionStorage` for the current
  tab session only.
- Nothing is posted to an API, Supabase or an analytics service.
- Copy and JSON export require an explicit facilitator action and remain subject
  to review before sharing.
- The free-text observation is optional, capped at 500 characters and labelled
  to prohibit participant identity or contact details.
- Clearing the session removes the journey and debrief from browser storage.

## Recommended audience protocol

1. Recruit 5–8 participants from one target segment at a time: active market
   learner, analyst, data/risk operator or prospective business buyer.
2. Start at `#live-demo` and let the participant navigate the four stops with
   minimal explanation.
3. Complete the debrief immediately after the walkthrough.
4. Export only reviewed, identity-free evidence into the approved research
   repository. Do not put participant identity into the exported observation.
5. Compare patterns by segment before changing positioning or opening a wider
   pilot. Treat one session as qualitative evidence, not product validation.

## Release boundary

Phase 9B is web-only. It adds no database migration, server endpoint, provider
credential, invitation delivery, signup, checkout, order routing, payment,
money movement, funding, custody or settlement capability. The Phase 8Z
licensed real-time adapter remains fail closed. Publishing this code does not
run a deployment or activate a data provider.

The guarded web confirmations are `BUILD_PHASE_9B`, `DEPLOY_PHASE_9B` and
`VERIFY_WEB_PHASE_9B`. The Phase 8Z data confirmations remain unchanged.
