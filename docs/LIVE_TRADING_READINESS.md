# Controlled live-trading readiness

## Phase 6C boundary

Phase 6C creates an auditable readiness ledger for a possible future regulated
activation. It does not create a production broker adapter, customer funding,
custody, settlement, margin, short selling, live order submission or automatic
activation capability.

## No activation mechanism

The database contains no function that enables live routing. The singleton
activation control is constrained to `blocked`, and each execution or
money-movement flag is constrained to `false`. Even if all eighteen requirements
have current approval evidence, the summary remains blocked and requires a new,
separately reviewed manual activation phase.

The browser has no approval, activation, funding or order control. It reads only
the sanitized requirement ledger and aggregate readiness totals.

## Independent written requirements

The ledger covers:

- jurisdiction authorization;
- production broker agreement and certification;
- KYC, AML, sanctions, suitability and appropriateness;
- customer disclosures and versioned consent;
- funding, custody, safeguarding, settlement and clearing;
- production market-data licensing;
- pre-trade risk limits and an observed kill-switch drill;
- monitoring, reconciliation, incident response and disaster recovery;
- independent security and privacy review; and
- customer support and regulated complaint operations.

Every requirement is activation-blocking. A missing, rejected or expired item
remains a visible gap.

## Approval evidence

`persist_live_trading_approval_evidence` is executable only by `service_role`.
Direct table inserts are revoked even from the service role, and update/delete
operations are rejected by an append-only trigger. Evidence is idempotent by
requirement and one-way digest.

The database stores no raw approval document, reviewer name, reviewer email or
credential. Public roles can read only the requirement, sanitized decision and
review/expiry timestamps; evidence and reviewer fingerprints are not selectable.

## Release procedure

After the Phase 6C pull request is merged and `main` is green:

1. deploy migration 039 with `DEPLOY_DATA_PHASE_6C`;
2. retain read-only `VERIFY_DATA_PHASE_6C` evidence;
3. build the web candidate with `BUILD_PHASE_6C`;
4. deploy it with `DEPLOY_PHASE_6C`; and
5. retain `VERIFY_WEB_PHASE_6C` production evidence.

These gates approve only the readiness ledger. They do not authorize a live
broker route or satisfy any external legal, regulatory, broker or operational
approval.

