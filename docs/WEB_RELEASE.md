# Phase 9A live-demo readiness candidate

Phase 9A extends the host-neutral controlled-beta candidate for the TradePulse AI web
application. The artifact includes SPA routing, a static-only service worker,
PWA metadata, cache controls and browser security headers. Source maps, server
secret names and local environment files are rejected before upload.

The public browser configuration contains only the Supabase project URL and anon
key. The anon key is designed for public clients and remains constrained by RLS;
the service-role key, scheduler secrets and provider credentials must never use a
`VITE_` variable or enter a web artifact.

## Required GitHub production secret

Add `WEB_SUPABASE_ANON_KEY` to the existing `production` environment. Use only
the project's public Supabase anon key. `SUPABASE_PROJECT_REF` remains the source
for the approved HTTPS origin.

After merging, open **Actions → Build production web release**, select `main`
and enter `BUILD_PHASE_9A`. The workflow validates the public configuration,
builds the application and retains the immutable commit-addressed artifact for
14 days as `tradepulse-beta-rc-<commit>`. It does not publish to a hosting
provider; the final domain and external audience authorization remain manual
launch prerequisites. The release adds a public live-demo route and explicitly
labelled, session-scoped sample data for audience walkthroughs. The Phase 8Z
workspace still exposes a read-only real-time-data activation cockpit and a
server-only, license-gated streaming adapter. The adapter is not called by the
web release and no provider key is included in the
artifact. The release signs no data contract, provisions no credential, runs no
canary, enables no continuous stream or customer real-time label, sends no
invitation and performs no trading, payment, money movement, custody or
settlement.
