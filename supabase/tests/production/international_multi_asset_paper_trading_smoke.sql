do $$
begin
  if to_regclass('public.international_paper_trading_controls') is null
    or to_regclass('public.international_paper_venue_rules') is null
    or to_regclass('public.international_paper_quotes') is null
    or to_regclass('public.international_paper_fx_rates') is null
    or to_regclass('public.international_paper_cost_rules') is null
    or to_regclass('public.international_paper_accounts') is null
    or to_regclass('public.international_paper_cash_balances') is null
    or to_regclass('public.international_paper_orders') is null
    or to_regclass('public.international_paper_fills') is null
    or to_regclass('public.international_paper_positions') is null
    or to_regclass('public.international_paper_tax_lots') is null
    or to_regclass('public.international_paper_journal_entries') is null
    or to_regclass('public.international_paper_journal_lines') is null
    or to_regclass('public.international_paper_fx_conversions') is null
    or to_regclass('public.international_paper_route_evidence') is null
    or to_regclass('public.international_paper_reconciliations') is null
    or to_regclass('public.international_paper_market_catalog') is null then
    raise exception 'International multi-asset paper trading schema is incomplete';
  end if;

  if (select count(*) from public.international_paper_venue_rules) <> 6
    or (select count(*) from public.international_paper_quotes) <> 12
    or (select count(*) from public.international_paper_fx_rates) <> 5
    or (select count(*) from public.international_paper_cost_rules) <> 12
    or (select count(*) from public.international_paper_market_catalog) <> 12 then
    raise exception 'International paper scenario reference counts changed';
  end if;

  if exists (
    select 1 from public.international_paper_trading_controls where
      not simulation_enabled or not user_initiated_simulation_enabled or
      live_market_data_enabled or live_order_routing_enabled or
      broker_connectivity_enabled or real_customer_funds_enabled or
      custody_enabled or real_settlement_enabled or margin_enabled or
      short_selling_enabled
  ) then
    raise exception 'International paper controls are not simulation-only';
  end if;

  if exists (
    select 1 from public.international_paper_market_catalog where
      not simulation_only or live_market_data_enabled or live_order_routing_enabled or
      broker_connectivity_enabled or real_customer_funds_enabled or
      custody_enabled or real_settlement_enabled or cost_status <> 'modeled_scenario'
  ) then
    raise exception 'International paper catalog implies an unsupported capability';
  end if;

  if has_table_privilege('authenticated', 'public.international_paper_orders', 'INSERT')
    or has_table_privilege('authenticated', 'public.international_paper_cash_balances', 'UPDATE')
    or has_table_privilege('service_role', 'public.international_paper_orders', 'INSERT') then
    raise exception 'International paper write permissions are unsafe';
  end if;

  if to_regclass('public.live_international_orders') is not null
    or to_regclass('public.international_custody_accounts') is not null
    or to_regprocedure('public.route_international_order(jsonb)') is not null then
    raise exception 'A live international order or custody path unexpectedly exists';
  end if;

  if exists(select 1 from public.live_trading_activation_controls where live_order_routing_enabled or customer_funding_enabled or custody_enabled or settlement_enabled)
    or exists(select 1 from public.payment_money_movement_controls where money_movement_enabled or customer_funding_enabled or custody_enabled or settlement_enabled) then
    raise exception 'Existing execution or money-movement locks changed';
  end if;
end;
$$;
