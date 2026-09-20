# Global provider contract-test laboratory

Phase 8M adds a provider-neutral specification layer for a future external-data
adapter review. It narrows the questions a later provider-specific change must
answer without selecting a provider or creating an operational test surface.

## What exists

- Eight contract-suite specifications, one for each established observation
  source family.
- Ten canonical conformance assertions covering source and subject identity,
  schema versions, required fields, types, missingness, units and currency,
  event-time and revision lineage, provenance and rights, and deterministic
  idempotency.
- Twenty-four synthetic fixture specifications: a minimal-valid shape, a
  missing-required-field shape and a schema-drift shape for every source family.
- Sanitized, caller-permission-preserving public views for status, suites,
  assertions and fixture specifications.
- Append-only reference metadata and database constraints that keep every
  operational capability disabled.

## What does not exist

No provider, endpoint, credential or external payload is selected or accessed.
The fixture rows describe deterministic shapes; they do not contain real-world
facts and are not observations. No fixture or contract test is represented as
executed, passed or approved. There is no RPC for endpoint execution or payload
ingestion, and no candidate write, release, training, publication or trading
path is enabled.

## Release evidence

The Phase 8M candidate requires the static contract check, database test,
production read-only smoke query, browser boundary, public runtime-read check,
deployed-manifest validation and all earlier safety checks. The reviewed manual
workflow confirmations are `DEPLOY_DATA_PHASE_8M`, `VERIFY_DATA_PHASE_8M`,
`BUILD_PHASE_8M`, `DEPLOY_PHASE_8M` and `VERIFY_WEB_PHASE_8M`.

## Future provider-specific boundary

A later change may map these neutral contracts to one named provider only after
legal and source-rights approval, privacy and security approval, an isolated
credential design, a versioned provider schema and accountable human review.
That change must add provider-specific fixtures, observe fail-closed test and
failure-drill evidence, and undergo a separate activation decision. Phase 8M
does not satisfy or bypass any Phase 8L certification gate.
