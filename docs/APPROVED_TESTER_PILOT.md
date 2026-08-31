# Approved tester pilot

## Phase 5H boundary

Phase 5H adds a private pilot workspace at `#approved-pilot`. It supports a
small, manually approved customer cohort without opening public registration or
changing any regulated execution boundary.

The browser cannot create a Supabase user, approve a pilot cohort, assign a
tester or increase cohort capacity. Those actions remain controlled operational
decisions performed outside the customer application. **No public signup, live
broker order, checkout, custody, payment execution or money movement is
introduced by this phase.**

**No execution or money movement:** the pilot evaluates research, simulation,
trust and recovery only.

## Pilot controls

### Bounded cohorts

Each cohort has a database-enforced maximum of 1–100 approved testers, a start
and end time, an agreement version, a status and staffed response targets. A
transaction-scoped advisory lock prevents concurrent provisioning from
exceeding the approved capacity.

No cohort is seeded or activated by the migration. The release owner must
create, approve and activate a cohort through the protected database
administration process after legal, privacy, security, support and jurisdiction
review.

### Manual tester assignment

The approved email must first be pre-provisioned in Supabase Auth with implicit
signup disabled. An administrator then assigns that exact Auth user ID to one
approved cohort. Never store customer email addresses in migration files,
issues, workflow inputs or public release artifacts.

The customer application reads only a sanitized, identity-bound pilot status.
It never returns a cohort roster, another tester's identity or an administrative
approval control.

### Identity-bound agreement

An assigned tester must accept the exact current agreement version while the
cohort is active and within its approved schedule. Acceptance is timestamped
against the authenticated user. A stale version, inactive cohort or unassigned
identity fails closed.

### Bounded missions

The active pilot contains four fixed evaluation missions:

1. verify a trust receipt;
2. challenge forecast evidence;
3. test a paper decision using virtual funds; and
4. exercise private support recovery.

Mission completion is private, server-side and restricted to those four codes.
It stores no portfolio, order, quote, payment, identity-document or credential
payload.

### Staffed feedback and incidents

The existing private support intake adds `pilot_feedback` and `pilot_incident`
categories. Requests retain a private support reference, existing per-user rate
limit and protected history. Response targets are service goals rather than an
emergency guarantee. Customers are told never to include passwords, tokens,
payment details or brokerage credentials.

## Operational activation

Before assigning any tester:

1. approve the cohort size, schedule, jurisdictions and agreement version;
2. name the staffed feedback and incident owners in the restricted operating
   record;
3. confirm custom SMTP, abuse controls, monitoring, on-call and rollback;
4. pre-provision the exact approved Auth identities;
5. create and activate the cohort through protected database administration;
6. assign users without exposing addresses or user IDs in public artifacts;
7. exercise feedback, incident escalation, pause, revocation and cohort closure.

Pause or revoke access through the protected administration process. Do not
delete or rewrite agreement, progress or support evidence to conceal an event.

## Acceptance evidence

- Migration `035_approved_tester_pilot.sql` implements bounded cohorts,
  identity-bound agreement acceptance, private mission progress and dedicated
  pilot feedback/incident types.
- The pgTAP suite proves tenant isolation, capacity enforcement, stale-agreement
  rejection, guarded mission codes, support intake and execution locks.
- Production smoke is query-only and verifies schema, privileges, RPC access and
  regulated-action locks.
- Desktop/mobile Playwright verifies the guest boundary and absence of browser
  enrollment.
- `npm run check:approved-pilot` pins the complete repository contract.

## Release sequence

After merge and green `main` checks:

1. run **Deploy Supabase production** with `DEPLOY_DATA_PHASE_5H`;
2. run **Verify Supabase production** with `VERIFY_DATA_PHASE_5H`;
3. run **Build production web release** with `BUILD_PHASE_5H`;
4. run **Deploy controlled beta web** with `DEPLOY_PHASE_5H`;
5. run **Verify web production** with `VERIFY_WEB_PHASE_5H`.

Retain workflow links and the immutable merge commit in the restricted release
record. A green deployment proves engineering controls; it does not by itself
approve external invitations.
