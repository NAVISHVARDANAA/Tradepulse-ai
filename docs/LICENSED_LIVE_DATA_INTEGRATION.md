# Licensed live-data integration

Phase 8V defines the fail-closed evidence boundary required before TradePulse AI
can connect any licensed production market-data provider. It converts live-data
integration into eight explicit feed classes, eight independent gates and seven
manual states. All 64 readiness cells start blocked.

## Safety boundary

No provider, credential or real payload is recorded. No live display, derived
publication, model training, external audience, public signup, order routing,
payment, money movement, custody or settlement is enabled.

The migration creates append-only reference records and sanitized
`security_invoker` views. Browser and service roles receive read-only access;
there is no provider-connection, integration-authorization or feed-activation
RPC.

## Licensed feed classes

1. Instrument reference master.
2. Venue calendars and sessions.
3. Quotes and top of book.
4. Trades and aggregated bars.
5. Corporate actions and identifiers.
6. Fundamentals and company reference.
7. FX rates and cross-asset reference.
8. News, events and source metadata.

## Mandatory integration gates

1. Executed license and exact permitted-use verification.
2. Jurisdiction, audience and display entitlement verification.
3. Credential vaulting, restricted egress and secret rotation.
4. Schema, identity and corporate-action mapping verification.
5. Freshness, clock, quality, gap and stale-state controls.
6. Quota, backpressure, replay, idempotency and failover controls.
7. Observability, cost, support and incident ownership.
8. Bounded zero-customer canary, rollback, expiry and independent review.

## Seven manual states

The reference lifecycle is integration not requested, license evidence
required, entitlement mapping required, isolated certification required,
production canary authorization required, monitored live-data window required,
and suspended or revoked. None transitions automatically or grants provider,
credential, payload or display access.

## Release evidence

- `npm run check:licensed-live-data-integration` validates the repository contract.
- The PgTAP suite proves deterministic counts, grants, append-only enforcement
  and the absence of provider, credential, payload, display and production effects.
- The production smoke query is read-only and verifies that every gate and cell
  remains blocked.
- Desktop/mobile browser checks load the lazy workspace and verify that no
  connect, credential, intake, display, publish, trade or payment control exists.

Phase 8V is licensed live-data integration scaffolding only. It does not select
or connect a provider and does not replace executed licensing, entitlements,
security, operational, cost, support and production decisions made by
accountable humans. Phase 8W real-user beta remains blocked until this evidence
is real, current, independently verified and explicitly authorized.
