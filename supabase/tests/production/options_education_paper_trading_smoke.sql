do $$
begin
  if to_regclass('public.options_paper_controls') is null
    or to_regclass('public.options_chain_entitlements') is null
    or to_regclass('public.options_chain_scenarios') is null
    or to_regclass('public.options_paper_accounts') is null
    or to_regclass('public.options_paper_appropriateness_profiles') is null
    or to_regclass('public.options_paper_strategies') is null
    or to_regclass('public.options_paper_legs') is null
    or to_regclass('public.options_paper_events') is null
    or to_regclass('public.options_paper_journal_entries') is null
    or to_regclass('public.options_paper_journal_lines') is null
    or to_regclass('public.options_paper_reconciliations') is null
    or to_regclass('public.options_paper_chain_catalog') is null
    or to_regclass('public.options_paper_strategy_history') is null then
    raise exception 'Options education paper-trading schema is incomplete';
  end if;

  if (select count(*) from public.options_chain_entitlements) <> 1
    or (select count(*) from public.options_chain_scenarios) <> 8
    or (select count(*) from public.options_paper_chain_catalog) <> 8 then
    raise exception 'Options education scenario reference counts changed';
  end if;

  if exists (
    select 1 from public.options_paper_controls where
      not education_workspace_enabled or not single_leg_simulation_enabled or
      not defined_risk_spread_simulation_enabled or not payoff_simulation_enabled or
      not assignment_simulation_enabled or live_market_data_enabled or
      live_options_routing_enabled or broker_connectivity_enabled or
      real_customer_funds_enabled or real_positions_enabled or custody_enabled or
      real_settlement_enabled or margin_enabled or uncovered_short_options_enabled or
      automatic_options_permission_enabled
  ) then
    raise exception 'Options paper controls are not education-only and fail-closed';
  end if;

  if exists (
    select 1 from public.options_paper_chain_catalog where
      not simulation_only or not educational_display_permitted or
      live_display_rights_confirmed or live_market_data_enabled or
      live_options_routing_enabled or broker_connectivity_enabled or
      margin_enabled or uncovered_short_options_enabled
  ) then
    raise exception 'Options chain catalog implies an unsupported live capability';
  end if;

  if has_table_privilege('authenticated', 'public.options_paper_strategies', 'INSERT')
    or has_table_privilege('authenticated', 'public.options_paper_accounts', 'UPDATE')
    or has_table_privilege('service_role', 'public.options_paper_strategies', 'INSERT') then
    raise exception 'Options paper write permissions are unsafe';
  end if;

  if to_regclass('public.live_options_orders') is not null
    or to_regclass('public.options_margin_accounts') is not null
    or to_regprocedure('public.route_live_options_order(jsonb)') is not null then
    raise exception 'A live options order or margin path unexpectedly exists';
  end if;

  if exists(select 1 from public.live_trading_activation_controls where live_order_routing_enabled or customer_funding_enabled or custody_enabled or settlement_enabled)
    or exists(select 1 from public.international_paper_trading_controls where live_order_routing_enabled or broker_connectivity_enabled or real_customer_funds_enabled or custody_enabled or real_settlement_enabled or margin_enabled or short_selling_enabled) then
    raise exception 'Existing execution or international paper locks changed';
  end if;
end;
$$;
