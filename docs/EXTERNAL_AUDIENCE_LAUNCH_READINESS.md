# External audience production launch readiness

Phase 8U defines the fail-closed evidence boundary required before TradePulse AI
can invite real external users into a bounded production beta. It converts the
launch goal into eight explicit product surfaces, eight independent gates and
seven manual review states. All 64 readiness cells start blocked.

## Safety boundary

No real external audience, cohort, reviewer, evidence item, authorization,
launch window or production effect is recorded. No public signup, unrestricted
discovery, automated provisioning, live provider, production credential,
customer payload, autonomous publication, model training, order routing,
payment, money movement, custody or settlement is enabled.

The migration creates append-only reference records and sanitized
`security_invoker` views. Browser and service roles receive read-only access;
there is no launch-authorization or audience-activation RPC.

## Product surfaces

1. Public market dashboard.
2. Equity research and watchlists.
3. Agentic analysis and reports.
4. Country, event and dependency intelligence.
5. Paper trading and education.
6. Account security and privacy.
7. Support, feedback and incidents.
8. Beta operations and status.

## Mandatory launch gates

1. Production domain, TLS and routing verification.
2. Authentication redirects, custom email and abuse controls.
3. Published legal, privacy, risk and support ownership.
4. Monitoring, on-call coverage and incident-response drill evidence.
5. Bounded cohort, jurisdiction, consent and feedback approval.
6. Accessibility, performance, compatibility and capacity evidence.
7. Data rights, freshness, unavailable states and customer-facing labels.
8. Independent launch review, rollback, expiry and accountable closeout.

## Seven manual states

The reference lifecycle is launch not requested, operational evidence required,
remediation required, independent verification required, bounded cohort
authorization required, monitored launch window required, and closed or
revoked. None transitions automatically or grants access.

## Release evidence

- `npm run check:external-audience-launch-readiness` validates the repository contract.
- The PgTAP suite proves deterministic counts, grants, append-only enforcement
  and the absence of audience-activation effects.
- The production smoke query is read-only and verifies that every gate and cell
  remains blocked.
- Desktop/mobile browser checks load the lazy workspace and verify that no
  launch, signup, provider, publication, trade or payment control is exposed.

Phase 8U is production launch-readiness scaffolding only. It does not approve a
real audience or replace domain, legal, privacy, security, data-rights,
operational, support and jurisdiction decisions made by accountable humans.
