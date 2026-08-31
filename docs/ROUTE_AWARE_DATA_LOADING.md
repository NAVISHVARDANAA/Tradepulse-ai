# Route-aware product data loading

## Customer experience contract

Phase 5F assigns each focused workspace only the shared data domains it renders.
The dashboard, account, support, privacy, experience, beta-operations, approved-pilot and beta-hardening routes
do not start market, trade, forecast or equity-research queries. No shared-data request
or realtime subscription is created until a customer enters a workspace
that declares the corresponding domain.

| Workspace | Shared data loaded | Realtime scope |
| --- | --- | --- |
| Analytics Studio | Markets, trade, forecasts, equity research | All four domains |
| Markets | Markets and trade | Market and trade observations |
| Trade data | Trade | Trade observations |
| Forecasts | Forecasts | Forecast and reliability changes |
| Stock research / AI Copilot | Equity research | Equity score, forecast and reliability changes |
| Paper investing | Markets | Market observations |
| Payments | Markets plus deferred corridor configuration | Market observations |
| All other workspaces | None | None |

Query modules are imported only when requested. When a customer changes routes,
the previous route-scoped realtime channel and pending refresh timers are removed
before the new channel is subscribed. Returning to a data workspace requests a
fresh snapshot rather than treating stale browser state as current evidence.
The production bundle targets current evergreen browsers with ES2022 and native
module preloading; the controlled-beta desktop/mobile Chromium gates exercise
that delivery contract.

## Verification

`npm run check:data-loading` pins the route matrix, dynamic query imports,
scoped channel lifecycle, browser regression, release manifest and Phase 5F
workflow confirmations. The desktop/mobile Playwright suite also proves that
Beta Operations, Approved Pilot and Beta Hardening make no shared data request, while Forecasts requests forecast
data without loading market, trade or equity-research datasets.

No execution boundary changes are included. Live trading, payment execution,
checkout, charge collection, custody and personalized advice remain hard locked.
Phase 5F requires no database migration or Edge Function deployment.
