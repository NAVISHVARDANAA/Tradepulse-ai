# Incident response runbook

This runbook follows the risk-management approach in NIST SP 800-61 Rev. 3. It
is a minimum operating process for the current product foundation and must be
tested, staffed and adapted to each launch jurisdiction before real customer
money or regulated execution is enabled.

## Roles

| Role | Accountability |
| --- | --- |
| Incident commander | Own severity, decisions, timeline and closure |
| Operations lead | Diagnose, contain and restore the affected service |
| Security lead | Preserve evidence, assess compromise and coordinate disclosure |
| Customer communications | Publish verified impact and update times without speculation |
| Scribe | Maintain the decision, evidence and recovery timeline |

One founder may temporarily hold several roles, but every decision must still
identify the role being exercised. Never investigate a suspected credential or
customer-data incident in a public GitHub issue.

## Severity and response targets

| Severity | Example | Acknowledge | Customer update |
| --- | --- | ---: | ---: |
| SEV-0 critical | confirmed data exposure, unauthorized execution or fund movement | immediate | within 15 minutes |
| SEV-1 major | customer-facing outage, widespread authentication failure, corrupted market data | 15 minutes | within 30 minutes |
| SEV-2 minor | partial degradation with a safe workaround | 1 hour | within 2 hours when customer-visible |
| SEV-3 advisory | no current impact; control or capacity risk | 1 business day | normally not required |

Any evidence that a live execution or money-movement route is active is SEV-0.
Immediately disable the affected integration, preserve evidence and involve
legal/compliance. The current database is designed to prevent this state.

## Response sequence

1. **Declare and classify.** Record detection time, affected service, observable
   customer impact, severity and incident commander. Use support references to
   correlate events; never copy tokens, request bodies or personal data.
2. **Protect customers.** Fail closed, pause risky functionality, retain safe
   read-only access where possible and keep trading/payment execution locks off.
3. **Contain.** Rotate suspected secrets, revoke sessions or deployments when
   justified, isolate the failing provider and stop harmful retries. Do not
   destroy logs or forward raw evidence through chat or public tickets.
4. **Communicate.** State what customers experience, which safeguards remain
   active, any safe workaround and the next update time. Do not speculate about
   cause, blame or regulatory impact.
5. **Recover.** Restore from reviewed code/configuration, run production lock
   verification, confirm migration parity, validate customer-safe status and
   monitor through at least one normal operating interval.
6. **Learn.** Within five business days, document timeline, root cause,
   contributing controls, customer impact, detection gaps and corrective actions
   with owners and dates. Track completion to independent verification.

## Required evidence

- GitHub deployment and verification run IDs
- migration and release commit identifiers
- affected service and sanitized health/incident event IDs
- relevant Edge support references and structured log timestamps
- containment and secret-rotation decisions
- customer messages and update times
- recovery tests, execution-lock evidence and post-incident actions

Access to evidence follows least privilege. Export Edge, Auth, database, GitHub
and broker logs to an append-only monitoring destination over a secure channel.
Do not log passwords, tokens, connection strings, bank/card data, government
identifiers, provider payloads or customer request/response bodies.

## Customer update template

> We are investigating an issue affecting **[service]** beginning at **[time and
> timezone]**. Customers may experience **[verified impact]**. TradePulse safety
> controls remain active and **[live orders/fund movement remain disabled, when
> applicable]**. **[Safe workaround or no action required.]** Our next update is
> by **[time]**.

## Security reporting

Use GitHub private vulnerability reporting for suspected product vulnerabilities
and the restricted incident channel for operational evidence. Publish regulatory
or customer notifications only after the security, legal and compliance owners
approve scope, timing and wording.

## References

- [NIST SP 800-61 Rev. 3](https://csrc.nist.gov/pubs/sp/800/61/r3/final)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [Supabase Log Drains](https://supabase.com/docs/guides/monitoring-and-debugging/log-drains)
