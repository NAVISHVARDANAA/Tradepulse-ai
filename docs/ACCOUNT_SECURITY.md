# Account security and recovery boundary

## Customer controls delivered in Phase 4K

- Passwordless email sign-in remains the first factor.
- Customers may enroll a time-based one-time password (TOTP) authenticator from
  the private Security Center.
- An account with a verified factor must complete an `aal2` step-up before the
  product loads private tools and before protected paper, quote or brokerage-
  readiness APIs accept the request.
- Customers can revoke every other refresh-token session while preserving the
  current verified session, or sign out only the current device.
- A private append-only history records sanitized posture transitions and
  successful other-session revocation. Tokens, authenticator secrets, one-time
  codes, email addresses, IP addresses, device fingerprints and provider
  payloads are excluded.

MFA is optional for an account that has never enrolled a factor. Once enrolled,
step-up is mandatory for that account. This avoids a surprise lockout for early
beta customers while making the protection meaningful for customers who enable
it.

## Supabase production configuration

Before inviting external beta customers:

1. In **Authentication → Multi-Factor**, enable TOTP enrollment, challenge and
   verification. Do not enable phone factors until a regional SMS provider,
   cost controls, abuse controls and jurisdiction rules are approved.
2. Configure a custom SMTP provider. Supabase's default sender is restricted and
   is not intended for production authentication delivery.
3. Configure the production Site URL and an exact redirect allow list. Do not
   use wildcard production redirects.
4. Enable security-notification email templates for factor added/removed,
   sign-in method changes and credential changes.
5. Configure Auth rate limits and CAPTCHA for public sign-in entry points.
6. Test enrollment, a fresh-session challenge, lost-device recovery, factor
   removal, other-session revocation and account deletion in a non-production
   account before launch.

Authoritative references:

- [Supabase MFA guide](https://supabase.com/docs/guides/auth/auth-mfa)
- [Supabase TOTP flow](https://supabase.com/docs/guides/auth/auth-mfa/totp)
- [Supabase sign-out scopes](https://supabase.com/docs/reference/javascript/auth-signout)
- [Supabase email templates and security notifications](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits)

## Recovery policy

Phase 4K does not create a support bypass, reusable recovery code or administrator
backdoor. If a customer loses the only authenticator, recovery must use a written
identity-verification procedure with dual-control approval and a customer
notification. Until that procedure, custom SMTP and notification delivery are
tested, the account must fail closed rather than silently removing MFA.

The first production recovery procedure must define:

- evidence accepted for the operating jurisdiction;
- staff roles and separation of duties;
- cooling-off periods for high-risk profile or payout changes;
- notification to the previously verified contact channel;
- immutable case evidence and approval history;
- escalation for suspected takeover, fraud or coercion; and
- post-recovery revocation of every pre-existing session.

## Safety boundary

The Security Center protects authentication and simulated product actions. It
does not activate a broker account, live order route, custody capability,
payment execution, transfer or fund movement. Future regulated actions require
separate step-up policy, transaction signing, fraud controls and jurisdictional
approval.
