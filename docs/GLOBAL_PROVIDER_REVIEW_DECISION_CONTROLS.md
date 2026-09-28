# Global provider review decision controls

Phase 8Q defines the decision states, mandatory gates and immutable audit
requirements that must exist before a future provider-candidate review could
produce a bounded human decision. It records no real decision, approval,
reviewer identity, evidence reference, signature, provider or endpoint.

## Seven reference-only decision states

The catalog covers `not_assessed`, `awaiting_independent_reviews`,
`blocked_by_gap`, `remediation_required`, `decision_ready`,
`accepted_until_expiry`, and `expired_or_revoked`. These are governance
definitions, not workflow state. Automatic transitions are disabled, every
state requires human action and no state grants endpoint, release or production
effects.

## Eight mandatory decision gates

Every source family must eventually satisfy accountable scope, legal entity
authority, licensing and rights, privacy and transfer, security and custody,
schema and provenance, conformance and operations, and independent dual
control. All eight templates are currently unmet, contain no evidence and have
no assigned reviewer or human authorization.

## Sixty-four blocked readiness cells

The eight provider-neutral source families and eight decision gates create 64
deterministic readiness cells. Every cell is unmet and contains no evidence
reference, reviewer identity, reason code, signature, assessment time,
authorization time or expiry. Sanitized public views expose only these gaps.

## Hard boundary

Decision recording, signature storage, evidence linkage, automated quorum
evaluation, provider selection, packet opening, endpoint connectivity,
credentials, external payloads, fixture execution, approval, candidate writes,
observation release, model training, publication and trading remain
database-constrained off. Reference records are append-only and production
smoke verification is query-only.

A future separately authorized change must establish verified identities,
independent reviews, conflict-of-interest handling, controlled evidence links,
explicit reason codes, immutable audit retention, dual control, bounded scope,
expiry, revocation and rollback before it may record a real decision. Phase 8Q
creates decision scaffolding only; it creates no approval or activation path.
