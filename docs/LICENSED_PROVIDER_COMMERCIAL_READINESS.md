# Licensed-provider commercial readiness

Phase 8W defines the fail-closed review boundary required before TradePulse AI
can shortlist or contract any licensed production data provider. It converts
provider procurement into eight explicit review domains, eight independent
commercial gates and seven manual states. All 64 readiness cells start blocked.

## Safety boundary

No provider shortlist, quote, redline, executed agreement, purchase order,
credential or real payload is recorded. No commercial commitment, live display,
publication, model training, external audience, order routing, payment, money
movement, custody or settlement is enabled.

The migration creates append-only reference records and sanitized
`security_invoker` views. Browser and service roles receive read-only access;
there is no shortlist, quote acceptance, contract signature, purchasing,
provider-connection or activation RPC.

## Commercial review domains

1. Corporate ownership and financial stability.
2. Product, venue and geography coverage.
3. Display, derived and redistribution rights.
4. Entitlement, user, device and non-display scope.
5. Pricing, minimums, overage and total cost.
6. Security, privacy, subprocessors and audit.
7. Service levels, support, incident and change.
8. Termination, portability, deletion and transition.

## Mandatory commercial gates

1. Corporate identity, ownership, sanctions and stability verification.
2. Product coverage, rights schedule and roadmap verification.
3. Entitlement, metering, reporting and audit-term verification.
4. Pricing, commitment, overage, currency, tax and cost-ceiling approval.
5. Security, privacy, subprocessors and assurance verification.
6. Service level, support, incident, change and remedies verification.
7. Implementation acceptance, ownership and change-control verification.
8. Termination, portability, deletion, transition and independent review.

## Seven manual states

The reference lifecycle is commercial review not requested, corporate due
diligence required, rights and entitlements schedule required, security and
operational terms required, commercial model approval required, signature
readiness review required, and withdrawn, expired or rejected. None transitions
automatically or grants shortlist, quote, signature or purchasing authority.

## Release evidence

- `npm run check:licensed-provider-commercial-readiness` validates the repository contract.
- The PgTAP suite proves deterministic counts, grants, append-only enforcement
  and the absence of shortlist, quote, contract, commitment and production effects.
- The production smoke query is read-only and verifies that every gate and cell
  remains blocked.
- Desktop/mobile browser checks load the lazy workspace and verify that no
  shortlist, accept, sign, purchase, connect, display, trade or payment control exists.

Phase 8W is commercial-review scaffolding only. It does not select or connect a
provider, accept a quote, execute a contract or authorize purchasing. Any real
commitment still requires provider-specific legal, rights, security, commercial,
operational, implementation and exit evidence that is current, independently
verified and explicitly authorized by accountable humans.
