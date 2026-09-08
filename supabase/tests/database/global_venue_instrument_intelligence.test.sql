begin;

select plan(63);

select ok(to_regclass('public.global_market_intelligence_controls') is not null, 'global market controls exist');
select ok(to_regclass('public.global_market_venues') is not null, 'global venue directory exists');
select ok(to_regclass('public.global_market_calendars') is not null, 'global venue calendars exist');
select ok(to_regclass('public.global_instrument_listings') is not null, 'global instrument listings exist');
select ok(to_regclass('public.global_market_data_entitlements') is not null, 'global market entitlements exist');
select ok(to_regclass('public.global_market_access_policies') is not null, 'global market access policies exist');
select ok(to_regclass('public.global_venue_instrument_reference') is not null, 'global venue reference view exists');

select is((select count(*) from public.global_market_intelligence_controls), 1::bigint, 'one global control is seeded');
select is((select policy_version from public.global_market_intelligence_controls), 'global-venue-instrument-intelligence-v1', 'policy version is explicit');
select ok((select reference_workspace_enabled from public.global_market_intelligence_controls), 'reference workspace is enabled');
select ok(not exists (
  select 1 from public.global_market_intelligence_controls where
    live_market_data_connectivity_enabled or customer_entitlement_assignment_enabled or
    automatic_jurisdiction_approval_enabled or order_preview_enabled or order_routing_enabled or
    broker_connectivity_enabled or customer_funding_enabled or custody_enabled or settlement_enabled
), 'every global operational capability is fail-closed');

select is((select count(*) from public.global_market_venues), 6::bigint, 'six reference venues are seeded');
select is((select count(distinct country_code) from public.global_market_venues), 5::bigint, 'five venue countries are represented');
select is((select count(distinct primary_currency) from public.global_market_venues), 5::bigint, 'five venue currencies are represented');
select ok(not exists(select 1 from public.global_market_venues where availability_status <> 'reference_only' or not enabled), 'every venue is reference-only');
select ok((select bool_and(mic_code ~ '^[A-Z0-9]{4}$') from public.global_market_venues), 'every venue has a four-character MIC');

select is((select count(*) from public.global_market_calendars), 6::bigint, 'every venue has a calendar record');
select ok(not exists(select 1 from public.global_market_calendars where calendar_status <> 'review_required'), 'calendar evidence starts under review');
select ok(not exists(select 1 from public.global_market_calendars where holiday_calendar_status <> 'review_required'), 'holiday evidence starts under review');
select ok(not exists(select 1 from public.global_market_calendars where settlement_convention <> 'source_review_required'), 'settlement conventions are not guessed');
select ok(not exists(select 1 from public.global_market_calendars where session_use_enabled), 'calendar records cannot drive a market session');

select is((select count(*) from public.global_instrument_listings), 12::bigint, 'twelve reference listings are seeded');
select is((select count(distinct instrument_type) from public.global_instrument_listings), 3::bigint, 'equity, ETF and depositary receipt classes are represented');
select ok(not exists (
  select venue_id from public.global_instrument_listings group by venue_id having count(*) <> 2
), 'each reference venue exposes two listing identities');
select is((select count(distinct listing_key) from public.global_instrument_listings), 12::bigint, 'listing keys are unique');
select is((select count(distinct canonical_instrument_key) from public.global_instrument_listings), 12::bigint, 'canonical instrument keys do not collapse listings');
select ok(not exists(select 1 from public.global_instrument_listings where listing_status <> 'reference_only'), 'listings remain reference-only');
select ok(not exists(select 1 from public.global_instrument_listings where identifier_status <> 'review_required'), 'identifier verification is not implied');
select ok(not exists(select 1 from public.global_instrument_listings where provider_mapping_status <> 'review_required'), 'provider mapping verification is not implied');
select ok(not exists(select 1 from public.global_instrument_listings where corporate_action_status <> 'review_required'), 'corporate-action evidence is not implied');

select is((select count(*) from public.global_market_data_entitlements), 18::bigint, 'each venue has three display-right categories');
select ok(not exists (
  select venue_id from public.global_market_data_entitlements group by venue_id having count(*) <> 3
), 'each venue has reference, price and corporate-action rights');
select ok(not exists (
  select 1 from public.global_market_data_entitlements where dataset = 'reference' and display_status <> 'reference_only'
), 'reference metadata is labeled reference-only');
select ok(not exists (
  select 1 from public.global_market_data_entitlements where dataset in ('prices', 'corporate_actions') and display_status <> 'unavailable'
), 'unlicensed prices and actions remain unavailable');
select ok(not exists(select 1 from public.global_market_data_entitlements where license_status <> 'review_required'), 'license review remains explicit');
select ok(not exists(select 1 from public.global_market_data_entitlements where redistribution_allowed), 'redistribution is not authorized');
select ok(not exists(select 1 from public.global_market_data_entitlements where browser_feed_credentials_enabled), 'browser feed credentials remain disabled');

select is((select count(*) from public.global_market_access_policies), 24::bigint, 'six venues expose four residency scenarios');
select ok(not exists (
  select venue_id from public.global_market_access_policies group by venue_id having count(*) <> 4
), 'each venue has four reference residency scenarios');
select is((select count(*) from public.global_market_access_policies where access_status = 'research_only'), 5::bigint, 'only matching-country scenarios are research-only');
select is((select count(*) from public.global_market_access_policies where access_status = 'review_required'), 19::bigint, 'cross-border scenarios require legal review');
select ok(not exists(select 1 from public.global_market_access_policies where disclosure_status <> 'not_assessed'), 'customer disclosures are not inferred');
select ok(not exists(select 1 from public.global_market_access_policies where legal_review_status <> 'review_required'), 'legal approval is not inferred');

select is((select count(*) from public.global_venue_instrument_reference), 48::bigint, 'twelve listings expose four reference scenarios each');
select is((select count(distinct mic_code) from public.global_venue_instrument_reference), 6::bigint, 'public view exposes six venue identities');
select is((select count(distinct listing_key) from public.global_venue_instrument_reference), 12::bigint, 'public view preserves twelve listing identities');
select is((select count(distinct residency_country) from public.global_venue_instrument_reference), 4::bigint, 'public view exposes four hypothetical residencies');
select ok(not exists (
  select 1 from public.global_venue_instrument_reference where reference_as_of is null
), 'public reference exposes a review date');
select ok(not exists (
  select listing_key from public.global_venue_instrument_reference group by listing_key having count(*) <> 4
), 'each listing keeps every residency scenario independent');
select ok(not exists (
  select 1 from public.global_venue_instrument_reference where
    live_market_data_connectivity_enabled or customer_entitlement_assignment_enabled or
    automatic_jurisdiction_approval_enabled or order_preview_enabled or order_routing_enabled or
    broker_connectivity_enabled or customer_funding_enabled or custody_enabled or settlement_enabled
), 'public reference cannot imply any operational capability');
select ok(not exists (
  select 1 from public.global_venue_instrument_reference where
    price_display_status <> 'unavailable' or corporate_action_display_status <> 'unavailable'
), 'public view does not imply unlicensed prices or corporate actions');

select ok((select bool_and(relrowsecurity) from pg_class where oid in (
  'public.global_market_intelligence_controls'::regclass,
  'public.global_market_venues'::regclass,
  'public.global_market_calendars'::regclass,
  'public.global_instrument_listings'::regclass,
  'public.global_market_data_entitlements'::regclass,
  'public.global_market_access_policies'::regclass
)), 'all Phase 8A tables use RLS');
select is((select count(*) from pg_policies where tablename like 'global_market_%' or tablename = 'global_instrument_listings'), 6::bigint, 'six public read policies are defined');
select ok(not has_table_privilege('anon', 'public.global_market_venues', 'INSERT'), 'anonymous users cannot add venues');
select ok(not has_table_privilege('authenticated', 'public.global_instrument_listings', 'UPDATE'), 'customers cannot alter listings');
select ok(not has_table_privilege('anon', 'public.global_market_data_entitlements', 'DELETE'), 'anonymous users cannot alter entitlements');
select ok(not exists (
  select 1 from information_schema.columns where table_schema = 'public'
    and table_name in ('global_market_data_entitlements', 'global_market_access_policies')
    and column_name in ('feed_credential', 'api_key', 'contract_body', 'customer_id', 'account_id', 'citizenship_document')
), 'credentials, contracts and customer identity data are absent');
select ok(exists(select 1 from pg_trigger where tgname = 'global_market_venues_set_updated_at' and not tgisinternal), 'venue timestamp trigger exists');
select ok(exists(select 1 from pg_trigger where tgname = 'global_instrument_listings_set_updated_at' and not tgisinternal), 'listing timestamp trigger exists');
select ok(to_regclass('public.live_global_orders') is null and to_regclass('public.global_custody_accounts') is null and to_regclass('public.global_settlement_ledger') is null, 'no global order, custody or settlement table exists');
select ok(to_regprocedure('public.submit_global_order(jsonb)') is null and to_regprocedure('public.activate_global_market(text)') is null, 'no global execution or activation RPC exists');
select ok(not exists(select 1 from public.live_trading_readiness_controls where live_order_routing_enabled or customer_funding_enabled or custody_enabled or settlement_enabled), 'live-trading locks remain closed');
select ok(not exists(select 1 from public.payment_money_movement_controls where money_movement_enabled or customer_funding_enabled or custody_enabled or settlement_enabled), 'payment money-movement locks remain closed');

select * from finish();
rollback;
