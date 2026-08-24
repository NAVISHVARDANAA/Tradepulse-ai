# Service level objectives and error-budget policy

These are initial engineering objectives, not a contractual customer SLA. They
exist to make reliability measurable before TradePulse AI accepts real trading
or payment risk. Objectives must be reviewed against production traffic and
regional obligations before a public availability commitment is published.

## Initial objectives

| Customer-visible service | Rolling availability objective | Evidence freshness warning | Evidence freshness critical |
| --- | ---: | ---: | ---: |
| TradePulse platform | 99.50% | 15 minutes | 45 minutes |
| Market data | 99.00% | 3 hours | 12 hours |
| Forecast intelligence | 99.00% | 24 hours | 48 hours |

Availability is calculated over a rolling 30-day window from sanitized health
observations. `not_run` evidence is excluded from the calculation and remains
visibly `initializing`; it is never counted as healthy. Missing evaluator
evidence dynamically degrades the public status so a stopped monitor cannot
leave a permanent green indicator.

The error budget is `1 - SLO`. When the rolling observed availability consumes
the budget, non-critical feature releases for the affected service pause until:

1. customer impact is contained;
2. the cause and contributing controls are understood;
3. corrective actions have owners and deadlines; and
4. recovery evidence shows that the service is stable.

Security patches, regulatory controls and changes required to restore service
may proceed with incident-commander approval. A healthy error budget does not
override a security, compliance, data-quality or execution-safety gate.

## Evidence contract

Health records may contain only service code, bounded outcome, bounded evidence
code, latency, freshness, count and timestamp. They must never contain request
or response bodies, customer or broker identifiers, IP addresses, credentials,
tokens, portfolio values, bank details or provider payloads.

Every Edge Function emits one structured completion event with a support
reference, service code, HTTP method, outcome, status and latency. The runtime
log drain—not the application database—is the source for detailed request
telemetry. Health observations remain available for at least 30 days and are
purged through the guarded retention function after the approved period.

The reliability evaluator runs inside Postgres every five minutes. It also has a
protected Edge Function for authorized operational use. Neither path can enable
broker routing, customer account connection, live orders, custody or fund
movement.

## References

- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google SRE Workbook: Error Budget Policy](https://sre.google/workbook/error-budget-policy/)
- [Supabase Edge Function logging](https://supabase.com/docs/guides/functions/logging)
