# Payment compliance orchestration

Phase 7C adds a public, synthetic map of the compliance stages that a future
licensed cross-border payment service would need to satisfy. It is a readiness
and customer-education experience—not KYC, KYB, screening, monitoring, case
management, regulatory approval or payment execution.

## Customer experience

The payments workspace keeps the selected corridor visible and lets a customer
switch between two illustrative journeys:

- **Individual remittance:** KYC, AML, sanctions, transaction monitoring,
  travel-rule applicability and audit evidence.
- **Business supplier payment:** KYB, AML, sanctions, transaction monitoring,
  travel-rule applicability and audit evidence.

Each stage explains the future evidence category, the responsible operational
function and a safe customer response. A complete map is still shown as
**Compliance activation blocked** because no live provider, licensed review or
protected transmission exists. Missing stages fail closed as **Map unavailable**.

## Data and privacy boundary

No real identity, document, screening response, case or payment data is collected
or stored. The public reference includes only versioned policy text connected to
the four existing synthetic corridor models.

The database explicitly keeps these capabilities false:

- real identity collection, document upload and PII storage;
- KYC/KYB, AML, sanctions and transaction-monitoring provider connectivity;
- travel-rule data transmission and compliance case writes;
- automated clearance and manual overrides;
- quote acceptance, transfer creation, payment execution and money movement.

There is no `payment_compliance_cases` or `payment_identity_documents` table and
no compliance-clearance or case-creation RPC. Anonymous and authenticated users
can read the sanitized reference view only; no browser or service role can add or
change a requirement through table privileges.

## Release sequence

After the Phase 7C pull request and `main` CI checks pass:

1. Run **Deploy Supabase production** with `DEPLOY_DATA_PHASE_7C`.
2. Run **Verify Supabase production** with `VERIFY_DATA_PHASE_7C`.
3. Run **Build production web release** with `BUILD_PHASE_7C`.
4. Run **Deploy controlled beta web** with `DEPLOY_PHASE_7C`.
5. Run **Verify web production** with `VERIFY_WEB_PHASE_7C`.

Passing these gates proves only that the synthetic map is present and every
operational and execution capability remains disabled. Activating real compliance
or money movement requires written corridor-specific legal, compliance, privacy,
security, partner and operational approvals in a future phase.
