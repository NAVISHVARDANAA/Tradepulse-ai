# Data trust and notification boundary

Phase 4M makes data reliability visible before an alert is treated as useful.
The protected evaluator measures freshness, required-value completeness,
duplicate groups and source-sync outcomes against versioned policies. Evidence
is append-only, sanitized and contains no provider payload, credential, customer
identity, device or network data.

In-app notifications remain the only active channel. Email and push selections
record customer intent but `external_delivery_enabled` is database-constrained
to false. Before enabling either channel, approve a delivery provider, regional
privacy basis, verified sender domains, bounce/complaint handling, abuse limits,
quiet hours, accessible templates and one-action unsubscribe processing.

Alerts are review prompts. They never authorize or route an order, payment,
transfer or other fund movement.
