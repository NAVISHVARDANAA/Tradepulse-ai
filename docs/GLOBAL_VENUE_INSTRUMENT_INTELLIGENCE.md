# Global venue and instrument intelligence

## Phase 8A boundary

Phase 8A introduces a canonical reference layer for venue-qualified instrument
identity, market calendars, display-rights status and hypothetical residency
outcomes. It is research infrastructure only. No order routing, broker
connection, funding, custody or settlement capability is created.

The initial foundation contains six venues, twelve listings and four residency
scenarios. All records are explicitly versioned and source-dated. They are not
live exchange feeds, licensed price data, legal advice or customer eligibility
decisions.

## Venue and listing identity

Every venue has a four-character MIC, country, time zone, reference currency,
source date and current availability state. Each listing has its own
`MIC:symbol` key and a separate canonical instrument key, so symbols and
similarly named instruments are never treated as interchangeable.

The initial asset scope is cash equities, ETFs and one depositary-receipt
reference. Identifier and provider mappings remain `review_required`. Listing
metadata cannot create an equity price, forecast, paper order or live order.

## Calendars and corporate actions

Calendar, holiday and settlement evidence starts in `review_required` state.
Session-use is database-constrained to `false`, so unverified hours or holidays
cannot drive a market-open decision. Corporate-action state is also
`review_required`; the product does not infer splits, dividends, symbol changes,
suspensions or delistings from missing data.

## Display rights

Each venue has separate reference, price and corporate-action rights records.
Reference metadata is labeled `reference_only`; prices and corporate actions
remain `unavailable` until a reviewed license permits display. Redistribution
and browser feed credentials are constrained to `false`.

Provider credentials, commercial contract bodies and customer entitlement data
are not stored in the Phase 8A tables or exposed to the browser.

## Residency scenarios

The workspace lets a customer explore four hypothetical residency scenarios:
United States, United Kingdom, India and Canada. A matching venue country is
still only `research_only`; it is not an eligibility approval. Cross-border
combinations remain `review_required`.

A future customer-specific decision must verify residency, citizenship, entity
type, investor classification, disclosures, sanctions restrictions, instrument
identity, venue coverage and legal policy. Unknown combinations fail closed.

## Database locks

Migration 045 constrains all of these capabilities to `false`:

- live market-data connectivity;
- customer entitlement assignment;
- automatic jurisdiction approval;
- order previews and order routing;
- broker connectivity;
- customer funding;
- custody; and
- settlement.

No live global-order, custody-account or settlement-ledger table exists, and no
global order-submission or market-activation RPC exists. Existing live-trading
and payment money-movement locks remain unchanged.

## Release sequence

After the Phase 8A pull request is merged and the new `main` CI passes:

1. Run **Deploy Supabase production** with `DEPLOY_DATA_PHASE_8A`.
2. Run **Verify Supabase production** with `VERIFY_DATA_PHASE_8A`.
3. Run **Build production web release** with `BUILD_PHASE_8A`.
4. Run **Deploy controlled beta web** with `DEPLOY_PHASE_8A`.
5. Run **Verify web production** with `VERIFY_WEB_PHASE_8A`.

Use `main` for every workflow and wait for each workflow to pass before starting
the next. These workflows deploy and verify reference intelligence only; they
do not authorize market-data use or regulated execution.
