do $$
begin
  if to_regclass('public.live_trading_activation_controls') is null
    or to_regclass('public.live_trading_activation_requirements') is null
    or to_regclass('public.live_trading_approval_evidence') is null
    or to_regclass('public.live_trading_readiness_requirements') is null
    or to_regclass('public.live_trading_readiness_summary') is null then
    raise exception 'Live trading readiness schema is incomplete';
  end if;

  if (select count(*) from public.live_trading_activation_controls) <> 1
    or exists (
      select 1 from public.live_trading_activation_controls
      where control_key <> 'controlled-live-trading'
        or activation_status <> 'blocked'
        or live_order_routing_enabled
        or browser_order_submission_enabled
        or automatic_activation_enabled
        or customer_funding_enabled
        or custody_enabled
        or settlement_enabled
        or short_selling_enabled
        or margin_enabled
        or kill_switch_activation_enabled
        or not manual_activation_review_required
    ) then
    raise exception 'Live trading activation controls are not fail-closed';
  end if;

  if (select count(*) from public.live_trading_activation_requirements) <> 18
    or exists (select 1 from public.live_trading_activation_requirements where not activation_blocking)
    or (select readiness_status from public.live_trading_readiness_summary) <> 'blocked'
    or (select live_order_routing_enabled from public.live_trading_readiness_summary) then
    raise exception 'Live trading readiness evidence can bypass manual activation';
  end if;

  if has_table_privilege('anon', 'public.live_trading_activation_controls', 'INSERT')
    or has_table_privilege('authenticated', 'public.live_trading_activation_requirements', 'UPDATE')
    or has_table_privilege('service_role', 'public.live_trading_approval_evidence', 'INSERT')
    or has_function_privilege('authenticated', 'public.persist_live_trading_approval_evidence(jsonb)', 'EXECUTE')
    or has_column_privilege('anon', 'public.live_trading_approval_evidence', 'evidence_digest', 'SELECT')
    or has_column_privilege('authenticated', 'public.live_trading_approval_evidence', 'reviewer_fingerprint', 'SELECT') then
    raise exception 'Live trading approval evidence permissions are unsafe';
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'live_trading_approval_evidence_append_only' and not tgisinternal)
    or to_regprocedure('public.submit_live_order(jsonb)') is not null
    or exists (select 1 from public.brokerage_execution_controls where execution_enabled)
    or exists (select 1 from public.broker_provider_registry where live_order_routing_enabled)
    or to_regclass('public.payment_transactions') is not null then
    raise exception 'A production execution or money-movement path unexpectedly exists';
  end if;
end;
$$;
