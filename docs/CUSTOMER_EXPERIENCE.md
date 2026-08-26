# Customer experience foundation

Phase 4O gives signed-in customers one durable profile for regional display,
theme, density, motion and contrast preferences. The guided product tour now
persists progress across devices through a bounded RPC instead of relying only
on browser storage.

The installable web app caches only the static application shell and versioned
assets. Authentication, market data, research, billing and account information
are always fetched from the network and are never written to the service-worker
cache. The preference audit trail is private, append-only and excludes device
fingerprints, IP addresses, user-agent strings and raw request payloads.

## Release

After merging to `main`, run **Deploy Supabase production** with
`DEPLOY_PHASE_4O`. Then run **Verify Supabase production** with
`VERIFY_PHASE_4O`. Verification is query-only and confirms migration `027`,
remote migration parity, active protected functions and the existing execution
locks.
