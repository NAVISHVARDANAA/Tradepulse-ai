do $approved_tester_pilot_smoke$
begin
  if to_regclass('public.controlled_beta_pilot_cohorts') is null
    or to_regclass('public.controlled_beta_pilot_memberships') is null
    or to_regclass('public.controlled_beta_pilot_mission_progress') is null then
    raise exception 'Approved-tester pilot schema is incomplete';
  end if;

  if has_table_privilege('anon', 'public.controlled_beta_pilot_cohorts', 'SELECT')
    or has_table_privilege('anon', 'public.controlled_beta_pilot_memberships', 'SELECT')
    or has_table_privilege('anon', 'public.controlled_beta_pilot_mission_progress', 'SELECT') then
    raise exception 'Anonymous pilot data access is unexpectedly enabled';
  end if;

  if has_table_privilege('authenticated', 'public.controlled_beta_pilot_cohorts', 'INSERT')
    or has_table_privilege('authenticated', 'public.controlled_beta_pilot_memberships', 'INSERT')
    or has_table_privilege('authenticated', 'public.controlled_beta_pilot_mission_progress', 'INSERT') then
    raise exception 'Browser-based pilot approval or progress forgery is unexpectedly enabled';
  end if;

  if not has_function_privilege('authenticated', 'public.get_controlled_beta_pilot_status()', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.accept_controlled_beta_pilot_terms(text)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.set_controlled_beta_pilot_mission(text,boolean)', 'EXECUTE') then
    raise exception 'Authenticated approved-tester pilot RPC boundary is incomplete';
  end if;

  if has_function_privilege('anon', 'public.get_controlled_beta_pilot_status()', 'EXECUTE')
    or has_function_privilege('anon', 'public.accept_controlled_beta_pilot_terms(text)', 'EXECUTE')
    or has_function_privilege('anon', 'public.set_controlled_beta_pilot_mission(text,boolean)', 'EXECUTE') then
    raise exception 'Anonymous pilot RPC access is unexpectedly enabled';
  end if;

  if exists (
    select 1 from public.controlled_beta_pilot_cohorts
    where max_testers not between 1 and 100
      or ends_at <= starts_at
  ) then
    raise exception 'A pilot cohort violates capacity or schedule bounds';
  end if;

  if exists (select 1 from public.broker_provider_registry where live_order_routing_enabled)
    or exists (select 1 from public.investment_instruments where live_execution_enabled)
    or exists (
      select 1 from public.brokerage_execution_controls
      where control_key = 'global-live-orders' and execution_enabled
    ) then
    raise exception 'A regulated execution route is unexpectedly enabled';
  end if;

  if to_regclass('public.payment_transactions') is not null then
    raise exception 'Payment execution unexpectedly exists';
  end if;
end;
$approved_tester_pilot_smoke$;

