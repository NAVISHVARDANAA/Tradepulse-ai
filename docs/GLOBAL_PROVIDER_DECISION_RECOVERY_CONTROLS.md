# Global provider decision recovery controls

Phase 8R defines the exception, expiry, revocation and rollback-rehearsal
requirements that must exist before a future provider decision could be safely
challenged or withdrawn. It records no real recovery event, decision,
exception, investigator, evidence reference, signature, provider or endpoint.

## Seven reference-only recovery states

The catalog covers `monitoring_inactive`, `exception_reported`,
`protective_freeze_required`, `independent_review_required`,
`rollback_rehearsal_required`, `revocation_required`, and
`recovery_closed_without_effect`. These are governance definitions, not a live
incident workflow. Automatic transitions are disabled and no state freezes,
rolls back, revokes or changes production.

## Eight fail-closed recovery triggers

Every source family must eventually handle authority or scope changes, legal
status changes, rights withdrawal or expiry, privacy or transfer changes,
security or custody incidents, schema or provenance breaches, conformance or
operations regressions, and conflict, quorum or expiry failures. All trigger
templates are unobserved, contain no event and have no assigned investigator or
human authorization.

## Sixty-four blocked recovery cells

The eight provider-neutral source families and eight recovery triggers create
64 deterministic recovery cells. Every cell is blocked and contains no
exception, challenge, evidence, investigator, reason code, signature,
detection, freeze, revocation or resolution time. Sanitized public views expose
only these gaps.

## Hard boundary

Exception and challenge recording, identity storage, evidence linkage,
automated freeze, rollback execution, decision revocation, provider selection,
packet opening, endpoint connectivity, credentials, external payloads,
fixture execution, approval, candidate writes, observation release, model
training, publication and trading remain database-constrained off. Reference
records are append-only and production smoke verification is query-only.

A future separately authorized change must establish verified identities,
controlled evidence, independent recovery review, explicit reason codes,
immutable audit retention, dual control, bounded restoration, observed drills
and accountable closeout before it may record or execute a real recovery.
Phase 8R creates recovery scaffolding only; it creates no activation path.
