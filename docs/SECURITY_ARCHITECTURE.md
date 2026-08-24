# Customer trust and security architecture

## Enforced controls

- Supabase Row Level Security is the browser-data authorization boundary.
- Edge Functions revalidate the caller with Supabase Auth before using the
  service role and enforce a per-user, per-route allowance of 60 requests per
  minute.
- API request bodies are limited to 16 KiB for customer-initiated mutations.
- Internal synchronization endpoints do not expose CORS and validate scheduler
  secrets using fixed-length SHA-256 comparisons.
- Browser endpoints never advertise `x-sync-secret` as an allowed CORS header.
- JSON responses are non-cacheable, include a request identifier, and ship
  defensive content, frame, referrer and browser-permission headers.
- Broker integrations are pinned to the Alpaca sandbox origin. Live order
  routing remains disabled in database controls and application behavior.
- CodeQL, dependency review, production dependency audit, type checks, database
  contract tests and Edge Function tests run before release.

## Production configuration checklist

1. Set the Supabase Edge Function secret `TRADEPULSE_WEB_ORIGIN` to the exact
   HTTPS origin of the production web application, with no trailing slash.
   Until configured, browser endpoints retain wildcard CORS for deployment
   compatibility; internal scheduler endpoints are restricted regardless.
2. Keep `SYNC_SECRET`, `BROKER_SANDBOX_SYNC_SECRET`, broker credentials and the
   Supabase service role only in Supabase secrets. Generate at least 32 random
   bytes and rotate immediately after suspected disclosure.
3. Configure Supabase custom SMTP before customer launch. The default mail
   service is for evaluation, not reliable production authentication.
4. Enable Supabase Auth rate limits and a low-friction CAPTCHA such as
   Cloudflare Turnstile on sign-in and signup abuse paths.
5. Require MFA and phishing-resistant authentication for GitHub, Supabase,
   cloud, broker and domain-administrator accounts.
6. Enable GitHub private vulnerability reporting, secret scanning, push
   protection, Dependabot security updates and a `main` ruleset requiring CI,
   Security, review and signed deployment approval.
7. Send database, Auth, Edge Function, GitHub and broker audit events to an
   append-only security monitoring destination with alerts for authentication
   spikes, repeated 401/429 responses, RLS failures and secret rotation.
8. Publish customer-facing privacy, risk, incident-notification and account
   recovery policies before accepting real customer data or money.

## Customer experience principles

- Controls fail closed while returning a safe, actionable message.
- Rate limits apply to authenticated users by route, so one noisy feature does
  not block the whole dashboard.
- Request identifiers support faster customer care without exposing internals.
- Security controls do not claim that forecasts are certain or enable live
  execution before the corresponding governance gates are approved.

## Next security gates before real trading or payments

- Independent penetration test and remediation verification.
- Threat model covering identity takeover, market-data manipulation, forecast
  poisoning, order replay, insider access, sanctions, fraud and payment abuse.
- Device/session management, verified account recovery, step-up authentication
  for high-risk actions, and customer security notifications.
- KYC/AML/sanctions, licensing, suitability, best-execution, custody, privacy,
  data-residency and incident-reporting approval for each launch jurisdiction.
- Provider redundancy, disaster recovery tests, recovery objectives, key
  management, data classification and deletion evidence.
