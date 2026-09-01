# Cross-border corridor intelligence

## Phase 7A boundary

Phase 7A compares transparent, reference-only cross-border route models. It
does not connect a production payment provider, collect beneficiary details,
accept a quote, create a transfer, hold funds, settle funds or move money.

## What customers can compare

For each enabled corridor, the workspace exposes:

- the synchronized FX reference rate and observation freshness;
- a clearly labeled sandbox provider-model rate;
- the provider-model FX spread in basis points;
- variable, fixed and minimum fee effects;
- tax status and the reason a tax value is unavailable;
- reference value and estimated delivered amount before unknown tax;
- the effective rate before unknown tax;
- estimated minimum and maximum delivery time; and
- reference-only route availability with the blocking reason.

The interface does not rank or automatically select a route. It gives customers
the evidence needed to compare models without implying that a route is
available for payment.

## Unknown tax is not zero

Tax depends on customer, transaction and corridor facts that Phase 7A does not
collect. An unavailable tax is stored as `NULL`, displayed as unavailable and
excluded from the delivered amount with an explicit “before unknown tax” label.
It is never silently converted to zero.

## Database locks

`payment_corridor_intelligence_controls` constrains provider connectivity,
beneficiary collection, quote acceptance, automatic route selection, transfer
creation, payment execution, money movement, custody and settlement to `false`.

Legacy payment intents are additionally constrained to `disabled`, accepted
payment quotes are prohibited and direct service-role writes to payment intents
are revoked. There is no payment-transfer or payment-submission RPC and no
payment transaction table.

## Release procedure

After the Phase 7A pull request is merged and `main` is green:

1. deploy migration 040 with `DEPLOY_DATA_PHASE_7A`;
2. retain read-only `VERIFY_DATA_PHASE_7A` evidence;
3. build the web candidate with `BUILD_PHASE_7A`;
4. deploy it with `DEPLOY_PHASE_7A`; and
5. retain `VERIFY_WEB_PHASE_7A` production evidence.

These gates approve only corridor intelligence. They do not authorize a
provider connection, beneficiary workflow, quote acceptance, transfer or money
movement.
