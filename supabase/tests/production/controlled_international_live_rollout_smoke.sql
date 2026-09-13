do $$
begin
  if to_regclass('public.controlled_live_rollout_controls') is null
    or to_regclass('public.controlled_live_rollout_cohorts') is null
    or to_regclass('public.controlled_live_rollout_limit_policies') is null
    or to_regclass('public.controlled_live_rollout_scope_decisions') is null
    or to_regclass('public.controlled_live_rollout_requirements') is null
    or to_regclass('public.controlled_live_rollout_gate_reviews') is null
    or to_regclass('public.controlled_live_rollout_drill_templates') is null
    or to_regclass('public.controlled_live_rollout_status') is null
    or to_regclass('public.controlled_live_rollout_cohort_catalog') is null then
    raise exception 'Phase 8G controlled rollout schema is incomplete';
  end if;
  if (select count(*) from public.controlled_live_rollout_cohorts)<>3
    or (select count(*) from public.controlled_live_rollout_scope_decisions)<>30
    or (select count(*) from public.controlled_live_rollout_requirements)<>18
    or (select count(*) from public.controlled_live_rollout_gate_reviews)<>54
    or (select count(*) from public.controlled_live_rollout_drill_templates)<>4 then
    raise exception 'Phase 8G deterministic counts changed';
  end if;
  if exists(select 1 from public.controlled_live_rollout_controls
    where rollout_status<>'approval_required' or live_cohort_count<>0
      or not manual_signed_activation_required or broker_connectivity_enabled
      or exchange_connectivity_enabled or live_market_data_enabled
      or live_order_routing_enabled or customer_funding_enabled or custody_enabled
      or settlement_enabled or margin_enabled or options_enabled or automatic_activation_enabled) then
    raise exception 'Phase 8G is not fail closed';
  end if;
  if exists(select 1 from public.controlled_live_rollout_cohorts
    where account_type<>'cash' or asset_class<>'equity' or activation_status<>'blocked' or production_enabled)
    or exists(select 1 from public.controlled_live_rollout_scope_decisions
      where decision_status<>'review_required' or approval_inherited or production_effect)
    or exists(select 1 from public.controlled_live_rollout_limit_policies
      where enforcement_mode<>'rehearsal_only' or maximum_funding_credit<>0 or production_effect) then
    raise exception 'A cohort, decision or limit exceeds the candidate boundary';
  end if;
  if (select count(*) from public.controlled_live_rollout_drill_observations)<>0
    or exists(select 1 from public.controlled_live_rollout_decision_ledger
      where signed_approval_reference is not null or activation_effect) then
    raise exception 'Approval or drill evidence was fabricated';
  end if;
  if to_regclass('public.controlled_live_orders') is not null
    or to_regprocedure('public.activate_controlled_live_rollout(jsonb)') is not null
    or to_regprocedure('public.route_controlled_live_order(jsonb)') is not null then
    raise exception 'An unapproved activation or routing surface exists';
  end if;
  if exists(select 1 from public.live_trading_activation_controls
    where live_order_routing_enabled or customer_funding_enabled or custody_enabled or settlement_enabled)
    or exists(select 1 from public.global_brokerage_custody_controls
      where live_order_routing_enabled or customer_funding_enabled or custody_accounts_enabled or settlement_instructions_enabled) then
    raise exception 'An earlier execution lock changed';
  end if;
end;
$$;
