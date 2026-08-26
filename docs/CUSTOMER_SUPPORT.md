# Customer feedback and support

Phase 4P provides authenticated customers with private, in-product intake for
bugs, product feedback, data questions and account help. Each accepted request
receives an opaque `TP-` support reference and appears in the customer's own
history.

Submission is bounded to five requests per hour and validated for type and
length. Browser roles cannot insert directly, change status or read another
customer's requests. The intake stores no attachments, credentials, device
fingerprints, provider payloads, payment details or trade instructions.

After merge, deploy with `DEPLOY_PHASE_4P`, then run the query-only production
verification with `VERIFY_PHASE_4P`.

Migration `029_support_reference_compatibility.sql` replaces the optional
`gen_random_bytes` dependency with the Supabase-supported UUID primitive while
preserving the same opaque support-reference format.
