# Global evidence corroboration operations

Phase 8H adds the fail-closed review layer between candidate external sources
and the Phase 8F global event engine. No external provider is connected by Phase 8H,
and no real-world claim is ingested or represented by its fixtures.

## Evidence boundary

Five source lanes describe the reviews required for official authorities,
regulators and exchanges, licensed news, licensed logistics and licensed
geoscience. They are categories, not approved provider selections. Every lane
is disconnected and requires separate rights, authenticity, privacy, security
and retention approval for an exact provider and endpoint.

Six claim policies set independent-source, primary-source, freshness,
geographic and conflict-handling requirements. Resource discoveries and energy
supply changes require three independent sources; no claim family can use fewer
than two. Meeting a numeric threshold never bypasses human editorial review.

Five clearly labelled synthetic review cases exercise eight gates:

1. source rights;
2. source authenticity;
3. extraction integrity;
4. temporal alignment;
5. independent corroboration;
6. conflict resolution;
7. editorial approval; and
8. model eligibility.

Every gate is missing evidence, every case is blocked and the restricted
decision ledger is append-only. The public workspace receives sanitized policy
and workflow state only; evidence digests and reviewer references are not
exposed to browser roles.

## Explicit exclusions

Raw web scraping, private-source access, credential bypass, unlicensed-content
storage, automatic verification, rumor promotion, autonomous publication,
production ingestion, model training and autonomous trade execution are
database-constrained off. There is no verification or publication RPC.

The 195-country figure is a coverage target, not a claim of complete evidence.
Country, source and event gaps must remain visible until approved observations
exist. Information described as leaked, private, stolen or access-controlled is
not an acceptable source.

## Release order

After merge and green `main` CI, run GitHub Actions in order:

1. **Deploy Supabase production** — `DEPLOY_DATA_PHASE_8H`
2. **Verify Supabase production** — `VERIFY_DATA_PHASE_8H`
3. **Build production web release** — `BUILD_PHASE_8H`
4. **Deploy controlled beta web** — `DEPLOY_PHASE_8H`
5. **Verify web production** — `VERIFY_WEB_PHASE_8H`

Production verification is query-only. Selecting or connecting any named
provider requires a later reviewed migration, approved contractual rights,
security and privacy review, retention rules, source-specific tests and human
operating ownership.
