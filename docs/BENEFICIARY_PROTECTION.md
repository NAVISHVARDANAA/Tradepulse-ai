# Beneficiary protection

## Scope

Phase 7B adds a synthetic, reference-only beneficiary safety rehearsal to the
cross-border workspace. It explains how validation, duplicate, cooling-off and
scam-intervention signals combine before a payment could proceed.

The workspace does not collect a real name, account or routing number, address,
email, phone number, identity document or provider credential. It cannot create
a beneficiary, accept a quote, create a transfer or move money.

## Customer experience

Customers select a clearly labeled synthetic scenario and receive:

- the strongest non-executable outcome: manual review, mandatory cooling-off
  or blocked;
- the rule category and severity;
- a plain-language explanation; and
- a safe required response, such as independent verification through a trusted
  contact channel.

A no-signal result is called **No rule triggered**, not “approved” or “safe.” It
remains an informational rehearsal and cannot create a beneficiary.

## Protection rules

Migration 041 seeds seven public reference rules:

1. incomplete required details;
2. account-name mismatch;
3. possible duplicate beneficiary identity;
4. recently changed payment details;
5. unverified channel change;
6. urgency, secrecy or coercion pressure; and
7. a first-time elevated-risk beneficiary signal.

Cooling-off rules have database-constrained 12- or 24-hour pauses. Blocked and
manual-review rules cannot invent a cooling period. Duplicate override and
cooling-off bypass are both database-locked off.

## Privacy and execution boundary

`payment_beneficiary_protection_controls` constrains real beneficiary
collection, beneficiary identifier storage, validation-provider connectivity,
beneficiary creation, duplicate override, cooling-off bypass, quote acceptance,
transfer creation, payment execution and money movement to false.

`payment_beneficiary_protection_rules` stores policy content only. The sanitized
`payment_beneficiary_protection_reference` view exposes the rules and their
false execution controls to the browser. No beneficiary-record table or
beneficiary-creation RPC exists.

## Release procedure

After the Phase 7B pull request and `main` CI checks pass:

1. Run **Deploy Supabase production** with `DEPLOY_DATA_PHASE_7B`.
2. Run **Verify Supabase production** with `VERIFY_DATA_PHASE_7B`.
3. Run **Build production web release** with `BUILD_PHASE_7B`.
4. Run **Deploy controlled beta web** with `DEPLOY_PHASE_7B`.
5. Run **Verify web production** with `VERIFY_WEB_PHASE_7B`.

These gates validate the synthetic policy model. They do not authorize real
beneficiary collection, provider connectivity, payment execution or money
movement.
