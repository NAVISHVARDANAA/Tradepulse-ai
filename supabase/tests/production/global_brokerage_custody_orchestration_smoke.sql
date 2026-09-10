do $$
begin
  if to_regclass('public.global_brokerage_custody_controls') is null
    or to_regclass('public.global_brokerage_partner_roles') is null
    or to_regclass('public.global_brokerage_launch_matrix') is null
    or to_regclass('public.global_brokerage_onboarding_requirements') is null
    or to_regclass('public.global_brokerage_onboarding_cases') is null
    or to_regclass('public.global_brokerage_evidence_rehearsals') is null
    or to_regclass('public.global_brokerage_order_previews') is null
    or to_regclass('public.global_brokerage_reconciliation_runs') is null
    or to_regclass('public.global_brokerage_reconciliation_items') is null
    or to_regclass('public.global_brokerage_launch_matrix_catalog') is null
    or to_regclass('public.global_brokerage_orchestration_summary') is null
    or to_regclass('public.global_brokerage_onboarding_progress') is null
    or to_regclass('public.global_brokerage_preview_history') is null
    or to_regclass('public.global_brokerage_reconciliation_history') is null then
    raise exception 'Global brokerage and custody orchestration schema is incomplete';
  end if;

  if (select count(*) from public.global_brokerage_custody_controls) <> 1
    or (select count(*) from public.global_brokerage_partner_roles) <> 5
    or (select count(*) from public.global_brokerage_launch_matrix) <> 4
    or (select count(*) from public.global_brokerage_launch_matrix_catalog) <> 4
    or (select count(*) from public.global_brokerage_onboarding_requirements) <> 10 then
    raise exception 'Phase 8D reference counts changed';
  end if;

  if exists (
    select 1 from public.global_brokerage_custody_controls where
      not orchestration_workspace_enabled or not launch_matrix_review_enabled
      or not onboarding_rehearsal_enabled or not non_executable_preview_enabled
      or not reconciliation_rehearsal_enabled or activation_status <> 'blocked'
      or live_broker_connectivity_enabled or exchange_connectivity_enabled
      or clearing_connectivity_enabled or custody_accounts_enabled
      or customer_asset_safeguarding_enabled or real_cash_ledger_enabled
      or real_position_ledger_enabled or settlement_instructions_enabled
      or market_data_credentials_enabled or cross_border_funding_link_enabled
      or live_order_routing_enabled or automatic_activation_enabled
      or not manual_activation_review_required
  ) then
    raise exception 'Global brokerage and custody controls are not fail-closed';
  end if;

  if exists (
    select 1 from public.global_brokerage_partner_roles
    where assignment_status <> 'unassigned' or due_diligence_status <> 'not_started'
      or credential_status <> 'absent' or production_enabled
      or partner_identifier is not null
  ) then
    raise exception 'A production partner or credential is unexpectedly configured';
  end if;

  if exists (
    select 1 from public.global_brokerage_launch_matrix
    where matrix_status <> 'blocked' or legal_approval_status <> 'missing'
      or compliance_approval_status <> 'missing' or tax_approval_status <> 'missing'
      or market_data_approval_status <> 'missing' or broker_approval_status <> 'missing'
      or custody_approval_status <> 'missing' or security_approval_status <> 'missing'
      or operations_approval_status <> 'missing' or broker_assigned
      or exchange_access_assigned or clearing_partner_assigned or custody_partner_assigned
      or market_data_partner_assigned or onboarding_supported or live_execution_enabled
  ) then
    raise exception 'A launch matrix is unexpectedly enabled';
  end if;

  if to_regprocedure('public.initialize_global_brokerage_case(uuid,text,bigint,text)') is null
    or to_regprocedure('public.record_global_brokerage_evidence_rehearsal(uuid,uuid,text,text,text,timestamptz,timestamptz)') is null
    or to_regprocedure('public.create_global_brokerage_order_preview(uuid,uuid,text,bigint,text,text,numeric,numeric)') is null
    or to_regprocedure('public.reconcile_global_brokerage_case(uuid,uuid,text)') is null then
    raise exception 'Global brokerage protected RPC contract is incomplete';
  end if;

  if has_function_privilege('authenticated', 'public.create_global_brokerage_order_preview(uuid,uuid,text,bigint,text,text,numeric,numeric)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.reconcile_global_brokerage_case(uuid,uuid,text)', 'EXECUTE') then
    raise exception 'Browser clients can bypass the protected orchestration service';
  end if;

  if to_regclass('public.global_live_brokerage_orders') is not null
    or to_regclass('public.production_custody_accounts') is not null
    or to_regprocedure('public.route_global_brokerage_order(jsonb)') is not null
    or to_regprocedure('public.link_payment_quote_to_brokerage_cash(jsonb)') is not null then
    raise exception 'Live brokerage, custody or payment-funding path exists';
  end if;

  if exists (
    select 1 from public.live_trading_activation_controls
    where live_order_routing_enabled or customer_funding_enabled
      or custody_enabled or settlement_enabled
  ) or exists (
    select 1 from public.payment_money_movement_controls
    where production_partner_connectivity_enabled or customer_funding_enabled
      or transfer_creation_enabled or financial_ledger_posting_enabled
      or safeguarding_account_activation_enabled or payment_execution_enabled
      or money_movement_enabled
  ) or exists (
    select 1 from public.options_paper_controls
    where live_options_routing_enabled or broker_connectivity_enabled
      or real_customer_funds_enabled or custody_enabled or real_settlement_enabled
  ) then
    raise exception 'An existing execution, payment or options lock changed';
  end if;
end;
$$;
