do $$
begin
  if to_regclass('public.global_market_intelligence_controls') is null
    or to_regclass('public.global_market_venues') is null
    or to_regclass('public.global_market_calendars') is null
    or to_regclass('public.global_instrument_listings') is null
    or to_regclass('public.global_market_data_entitlements') is null
    or to_regclass('public.global_market_access_policies') is null
    or to_regclass('public.global_venue_instrument_reference') is null then
    raise exception 'Global venue and instrument intelligence schema is incomplete';
  end if;

  if (select count(*) from public.global_market_venues) <> 6
    or (select count(*) from public.global_instrument_listings) <> 12
    or (select count(*) from public.global_market_data_entitlements) <> 18
    or (select count(*) from public.global_market_access_policies) <> 24
    or (select count(*) from public.global_venue_instrument_reference) <> 48 then
    raise exception 'Global venue and instrument reference counts changed';
  end if;

  if exists (
    select 1 from public.global_market_intelligence_controls where
      not reference_workspace_enabled or
      live_market_data_connectivity_enabled or customer_entitlement_assignment_enabled or
      automatic_jurisdiction_approval_enabled or order_preview_enabled or order_routing_enabled or
      broker_connectivity_enabled or customer_funding_enabled or custody_enabled or settlement_enabled
  ) then
    raise exception 'Global market intelligence controls are not fail-closed';
  end if;

  if exists (
    select 1 from public.global_venue_instrument_reference where
      reference_as_of is null or venue_availability <> 'reference_only' or listing_status <> 'reference_only' or
      price_display_status <> 'unavailable' or corporate_action_display_status <> 'unavailable' or
      live_market_data_connectivity_enabled or customer_entitlement_assignment_enabled or
      automatic_jurisdiction_approval_enabled or order_preview_enabled or order_routing_enabled or
      broker_connectivity_enabled or customer_funding_enabled or custody_enabled or settlement_enabled
  ) then
    raise exception 'Public global market reference implies an unsupported capability';
  end if;

  if has_table_privilege('anon', 'public.global_market_venues', 'INSERT')
    or has_table_privilege('authenticated', 'public.global_instrument_listings', 'UPDATE')
    or has_table_privilege('anon', 'public.global_market_data_entitlements', 'DELETE') then
    raise exception 'Global market reference permissions are unsafe';
  end if;

  if to_regclass('public.live_global_orders') is not null
    or to_regclass('public.global_custody_accounts') is not null
    or to_regclass('public.global_settlement_ledger') is not null
    or to_regprocedure('public.submit_global_order(jsonb)') is not null
    or to_regprocedure('public.activate_global_market(text)') is not null then
    raise exception 'A global order, custody or settlement path unexpectedly exists';
  end if;

  if exists(select 1 from public.live_trading_activation_controls where live_order_routing_enabled or customer_funding_enabled or custody_enabled or settlement_enabled)
    or exists(select 1 from public.payment_money_movement_controls where money_movement_enabled or customer_funding_enabled or custody_enabled or settlement_enabled) then
    raise exception 'Existing execution or money-movement locks changed';
  end if;
end;
$$;
