# Controlled money-movement readiness

## Phase 7E boundary

Phase 7E publishes a sanitized, corridor-specific readiness ledger for the
approvals TradePulse AI would need before any production fund movement could be
considered. It does not activate a licensed partner, safeguarding account,
customer funding, transfer processor, financial ledger, payment execution,
custody or settlement capability.

Every corridor remains `blocked` even if all displayed approval evidence is
current. A separate future activation decision would require external legal,
regulatory, compliance, security, partner, safeguarding and operational
authorization. No such authorization is represented by this release.

## Corridor approval ledger

Each of the four reference corridors has twelve independently reviewable
requirements across eight domains:

1. corridor legal authorization;
2. regulated partner agreement;
3. partner production certification;
4. safeguarding account structure;
5. customer-funds reconciliation;
6. KYC and KYB operating approval;
7. AML, sanctions and transaction-monitoring approval;
8. source-of-funds controls;
9. security and privacy approval;
10. treasury, liquidity and FX controls;
11. operational resilience and recovery; and
12. customer protection and redress.

The browser shows only the requirement, accountable operating owner, expected
evidence category and latest sanitized decision state. It contains no approval
control and cannot submit, reject, override or activate anything.

## Approval-evidence boundary

Approval decisions are append-only and service-only. The database accepts a
corridor code, requirement key, evidence version, decision, one-way evidence
digest, one-way reviewer fingerprint, review timestamp and optional validity
window. Reusing a digest with different input is rejected.

Public and authenticated browser clients cannot insert, update or delete
evidence and cannot read the evidence digest or reviewer fingerprint. Raw legal
opinions, contracts, certificates, security reports, customer data, reviewer
identities and partner credentials are never stored in these readiness tables.

Evidence completeness changes only the visible approval and gap counts. It
never changes the hard-coded `blocked` activation status or any execution lock.

## Database locks

Migration 044 constrains all of these capabilities to `false`:

- real customer and beneficiary data;
- production partner connectivity;
- safeguarding-account activation and customer funding;
- quote acceptance and transfer creation;
- webhook ingestion and financial-ledger posting;
- reconciliation writes and rescue-operator actions;
- dispute-case writes and refund execution;
- payment execution and money movement;
- custody and settlement; and
- automatic activation.

The migration fails if a production payment-transfer, funding, customer-balance
or financial-ledger table exists, or if an activation, production-transfer,
funding or ledger-posting RPC exists. Existing payment intents remain disabled,
accepted payment quotes remain forbidden and every Phase 7D transfer lock stays
closed.

## Customer experience

The Payments workspace leads with the readiness ledger for the selected
corridor. It displays the blocked activation state, current approvals, blocking
gaps and independent approval domains before the synthetic Phase 7D lifecycle,
Phase 7C compliance map, Phase 7B beneficiary rehearsal and Phase 7A corridor
comparison.

This ordering makes the production boundary explicit: technical rehearsal is
not regulatory approval, and approval evidence is not a payment capability.

## Release sequence

After the Phase 7E pull request is merged and the new `main` CI passes:

1. Run **Deploy Supabase production** with `DEPLOY_DATA_PHASE_7E`.
2. Run **Verify Supabase production** with `VERIFY_DATA_PHASE_7E`.
3. Run **Build production web release** with `BUILD_PHASE_7E`.
4. Run **Deploy controlled beta web** with `DEPLOY_PHASE_7E`.
5. Run **Verify web production** with `VERIFY_WEB_PHASE_7E`.

Use `main` for every workflow and retain the green workflow and artifact
evidence. These workflows deploy and verify the readiness boundary only; they do
not authorize production fund movement.

## Required external decision

Real money movement remains a separate, explicitly prohibited step until each
corridor has current written approvals, contracted licensed partners, verified
safeguarding and reconciliation, tested security and resilience controls,
staffed customer redress and a reviewed activation plan with dual control and a
tested kill switch.
