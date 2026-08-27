# Production web release foundation

Phase 4W creates a host-neutral controlled-beta candidate for the TradePulse AI web
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
and enter `BUILD_PHASE_4W`. The workflow validates the public configuration,
builds the application and retains the immutable commit-addressed artifact for
14 days as `tradepulse-beta-rc-<commit>`. It does not publish to a hosting
provider; provider selection and the first production URL remain manual launch
prerequisites.
