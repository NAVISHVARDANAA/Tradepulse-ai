# Monetization and billing boundary

Phase 4N introduces the product catalog, entitlements, one-time Pro trial,
subscription lifecycle and non-billable usage evidence. It does not select a
billing provider or create checkout, charge, refund, payout, invoice-tax or
fund-movement capability.

All customers are migrated to a verified Free baseline. A signed-in customer may
activate one fourteen-day Pro trial without a payment method. Hourly reconciliation
expires the trial and returns the profile to Free. Browser roles cannot directly
change a plan, subscription status, usage event or commercial audit record.

Before enabling paid subscriptions, approve the operating entity, merchant of
record or payment service provider, supported countries, USD/GBP price and tax
treatment, VAT/GST evidence, refund/cancellation policy, invoice requirements,
chargeback handling, webhook verification, reconciliation, customer support and
data-processing terms. Provider references must be stored only as irreversible
digests in the product database; payment credentials must remain provider-hosted.
