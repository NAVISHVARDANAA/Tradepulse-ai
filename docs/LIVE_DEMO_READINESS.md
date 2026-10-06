# Phase 9A live-demo readiness

## Outcome

Phase 9A makes the public product understandable to a real audience without
misrepresenting sample data or weakening regulated controls. The default
`#live-demo` route supports a ten-minute presentation across four stops:

1. market and trade context;
2. governed analytics and source lineage;
3. transparent equity research;
4. forecast uncertainty and reliability.

The presentation is designed to test whether the audience understands the
value proposition, trusts the evidence, and can identify a useful next action.

## Demo-data boundary

Demo mode is opt-in and stored only for the current browser session. It supplies
deterministic market, trade, forecast and equity fixtures. Every page displays a
persistent banner stating that the values are curated samples, not live prices
or real transactions. The stock price history uses the same deterministic demo
source so a walkthrough does not silently fall back to a provider request.

Demo mode does not write to Supabase, create an account, submit an order, accept
a payment quote, move funds, grant custody or settle a transaction. Exiting demo
mode restores the normal route-aware data loaders.

## Navigation boundary

Visitor-facing workspaces are grouped under Demo, Research, Learn & practise,
Business, and Trust & account. Provider, brokerage, live-data, payment and
compliance workspaces remain reachable under Readiness controls. This makes the
intentional gates legible as operational controls instead of presenting them as
broken product features.

## Recommended audience session

- Recruit 5–8 target participants from investing, analysis, operations or a
  prospective business buyer segment.
- Ask each participant to complete the four-stop journey without explanation.
- Capture task completion, trust rating, confusing terms, most valuable insight
  and the action they expected to take next.
- Do not promise real-time data, personalized advice, live trading, payments or
  public account access.
- Review findings before changing product positioning or starting a wider pilot.

## Release boundary

Phase 9A is a web-only change and introduces no database migration or Edge
Function change. Web release confirmations advance to `BUILD_PHASE_9A`,
`DEPLOY_PHASE_9A` and `VERIFY_WEB_PHASE_9A`. Migration 066 and the guarded Phase
8Z data confirmations remain unchanged. Publishing the code does not run a
deployment or activate a data provider.
