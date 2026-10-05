# Phase 8Z licensed real-time data activation

Phase 8Z implements a production-shaped, fail-closed path for licensed price
streaming. It does not claim that TradePulse currently has a contracted live
feed. The implementation candidate is Twelve Data because its business plans
offer an explicit external-display and redistribution path; final rights remain
subject to the contracted plan, instrument coverage and exchange terms.

## What is implemented

- `stream-twelve-data-market-data` is an internal-only Supabase Edge Function.
  It accepts no browser credential and requires the constant-time `SYNC_SECRET`
  guard plus the exact `STREAM_PHASE_8Z` confirmation.
- Four independent production flags must all be true: external-display rights,
  real-time entitlement, redistribution approval and stream enablement.
- The API key is read only from `TWELVE_DATA_API_KEY`. It is never returned,
  logged, bundled into the web application or accepted in a request body.
- `TWELVE_DATA_MARKET_ASSET_MAP` is a server-side allow-list that maps no more
  than 30 provider symbols to existing `market_assets.symbol` values.
- The stream window is bounded to 15–100 seconds. A heartbeat is sent every ten
  seconds and the socket is closed at the end of the canary window.
- Only allow-listed `price` events with a positive finite price and a current,
  bounded timestamp are accepted. Malformed, stale, future and unknown events
  are discarded.
- The latest validated observation per symbol is upserted into
  `market_observations` with source `twelve-data-realtime-price-v1`.
- Migration 004 already publishes `market_observations` through Supabase
  Realtime. The application already uses route-scoped database-change
  subscriptions, so no provider WebSocket or provider secret reaches a browser.

## What remains externally blocked

Production real-time display remains off until accountable owners retain the
following evidence outside the browser:

1. An executed Twelve Data business agreement covering the selected instruments,
   countries and intended customer audience.
2. Explicit external-display and redistribution rights, including any exchange
   agreement or add-on required for the selected US or non-US market feed.
3. Approved pricing, spend ceiling, security/privacy review, support ownership,
   production credentials and a precise provider-to-local symbol map.
4. A zero-customer canary that proves current events, schema mapping, data
   quality, database delivery, observability, provider quota behavior and
   rollback.
5. Continuous connection orchestration appropriate to the provider connection
   limit and the Supabase Edge runtime limit. The bounded canary is deliberately
   not presented as a 24/7 stream supervisor.
6. An independent release decision that changes the manifest and user-facing
   freshness labels only after the evidence above is approved.

Alpaca remains suitable for TradePulse paper-broker workflows, but its standard
market-data service is not the customer redistribution path for this phase. No
existing Alpaca key is reused by the real-time adapter.

## Safe activation order

1. Sign the correct business/data agreement and record the rights schedule.
2. Add production secrets and the smallest approved symbol map in the platform
   secret store; never commit or paste them into the browser.
3. Deploy Phase 8Z from reviewed `main` using the protected data workflow.
4. Invoke one zero-customer bounded canary with `STREAM_PHASE_8Z` and retain the
   sanitized result, database freshness evidence and rollback evidence.
5. If the canary fails or receives no current event, leave every display flag
   off, close the connection, correct the cause and repeat only after review.
6. Design and approve continuous orchestration before enabling the live-data
   customer label. A scheduled succession of short Edge invocations is not a
   substitute for an owned, monitored streaming service.

Phase 8Z introduces no database migration and preserves migration 066. It adds
no trade execution, payment, money movement, custody or settlement capability.

