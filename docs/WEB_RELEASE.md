# Phase 8X controlled-audience pilot operating-model foundation

Phase 8X extends the host-neutral controlled-beta candidate for the TradePulse AI web
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
and enter `BUILD_PHASE_8X`. The workflow validates the public configuration,
builds the application and retains the immutable commit-addressed artifact for
14 days as `tradepulse-beta-rc-<commit>`. It does not publish to a hosting
provider; the final domain and external audience authorization remain manual
launch prerequisites. The Phase 8X workspace exposes only a read-only pilot
plan and the blocked status of the audience, live-data and commercial
foundations. It sends no invitation, provisions no account, accepts no payment,
connects no provider, receives no production payload and performs no live-data
display, trading, money movement, custody or settlement.
