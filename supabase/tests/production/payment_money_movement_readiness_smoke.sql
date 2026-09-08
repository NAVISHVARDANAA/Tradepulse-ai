do $$
begin
  if to_regclass('public.payment_money_movement_controls') is null
    or to_regclass('public.payment_money_movement_requirements') is null
    or to_regclass('public.payment_money_movement_approval_evidence') is null
    or to_regclass('public.payment_money_movement_readiness_reference') is null
    or to_regclass('public.payment_money_movement_readiness_summary') is null then
    raise exception 'Payment money-movement readiness schema is incomplete';
  end if;

  if (select count(*) from public.payment_money_movement_controls) <> 1
    or exists (
      select 1 from public.payment_money_movement_controls where
        control_key <> 'controlled-money-movement'
        or activation_status <> 'blocked'
        or not manual_activation_review_required
        or real_customer_data_enabled
        or real_beneficiary_data_enabled
        or production_partner_connectivity_enabled
        or safeguarding_account_activation_enabled
        or customer_funding_enabled
        or quote_acceptance_enabled
        or transfer_creation_enabled
        or webhook_ingestion_enabled
        or financial_ledger_posting_enabled
        or reconciliation_write_enabled
        or rescue_operator_action_enabled
        or dispute_case_writes_enabled
        or refund_execution_enabled
        or payment_execution_enabled
        or money_movement_enabled
        or custody_enabled
        or settlement_enabled
        or automatic_activation_enabled
    ) then
    raise exception 'Payment money-movement controls are not fail-closed';
  end if;

  if (select count(*) from public.payment_money_movement_requirements) <> 48
    or exists (select 1 from public.payment_money_movement_requirements where not evidence_required or not activation_blocking)
    or exists (select 1 from public.payment_money_movement_readiness_summary where requirement_count <> 12)
    or exists (select 1 from public.payment_money_movement_readiness_summary where activation_status <> 'blocked' or money_movement_enabled) then
    raise exception 'Corridor approval evidence can bypass manual activation';
  end if;

  if has_table_privilege('anon', 'public.payment_money_movement_controls', 'INSERT')
    or has_table_privilege('authenticated', 'public.payment_money_movement_requirements', 'UPDATE')
    or has_table_privilege('service_role', 'public.payment_money_movement_approval_evidence', 'INSERT')
    or has_function_privilege('authenticated', 'public.persist_payment_money_movement_approval_evidence(jsonb)', 'EXECUTE')
    or has_column_privilege('anon', 'public.payment_money_movement_approval_evidence', 'evidence_digest', 'SELECT')
    or has_column_privilege('authenticated', 'public.payment_money_movement_approval_evidence', 'reviewer_fingerprint', 'SELECT') then
    raise exception 'Payment money-movement approval permissions are unsafe';
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'payment_money_movement_approval_evidence_append_only' and not tgisinternal)
    or to_regclass('public.production_payment_transfers') is not null
    or to_regclass('public.payment_funding_accounts') is not null
    or to_regclass('public.payment_customer_balances') is not null
    or to_regclass('public.payment_financial_ledger_entries') is not null
    or to_regprocedure('public.activate_payment_corridor(text)') is not null
    or to_regprocedure('public.create_production_payment_transfer(jsonb)') is not null
    or to_regprocedure('public.initiate_payment_funding(jsonb)') is not null
    or to_regprocedure('public.post_payment_ledger_entry(jsonb)') is not null
    or exists (select 1 from public.payment_intents where status <> 'disabled')
    or exists (select 1 from public.payment_quotes where status = 'accepted') then
    raise exception 'A production funding or money-movement path unexpectedly exists';
  end if;
end;
$$;
