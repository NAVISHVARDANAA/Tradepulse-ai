# TradePulse AI Security

TradePulse AI handles financial decision support, simulated trading and broker
sandbox integrations. We treat security reports as high priority.

## Report a vulnerability

Please use GitHub's **Security** tab and **Report a vulnerability** to submit a
private report. Do not open a public issue, attach credentials, or include real
customer financial information.

Include the affected component, a minimal reproduction, impact, and any safe
mitigation you have identified. We will acknowledge the report, preserve the
reporter's confidentiality, and coordinate a remediation and disclosure plan.

## Supported code

Security fixes target the `main` branch. Production deployment remains a
separate, confirmation-gated workflow after required checks and database
migration verification pass.

## Safety boundaries

- Forecasts and research are decision support, not guaranteed outcomes.
- Broker connectivity remains sandbox-only until legal, compliance, security,
  operational and customer-protection gates are independently approved.
- Payment quotes do not move funds.
- Never commit or expose Supabase service-role, broker, database, scheduler or
  synchronization secrets through a `VITE_*` variable.
