do $$
begin
  if to_regclass('public.payment_sandbox_transfer_controls') is null
    or to_regclass('public.payment_sandbox_transfer_stage_templates') is null
    or to_regclass('public.payment_sandbox_ledger_templates') is null
    or to_regclass('public.payment_sandbox_transfer_lifecycle_reference') is null
    or to_regclass('public.payment_sandbox_ledger_reference') is null then
    raise exception 'Payment sandbox transfer lifecycle schema is incomplete';
  end if;

  if (select count(*) from public.payment_sandbox_transfer_controls) <> 1
    or exists (
      select 1 from public.payment_sandbox_transfer_controls
      where control_key <> 'payment-sandbox-transfer-lifecycle'
        or not workspace_enabled
        or not synthetic_transfer_rehearsal_enabled
        or data_mode <> 'synthetic_transfer_rehearsal'
        or not licensed_partner_sandbox_reference_enabled
        or not double_entry_preview_enabled
        or not idempotency_rehearsal_enabled
        or not signed_webhook_rehearsal_enabled
        or not bounded_retry_rehearsal_enabled
        or not reconciliation_rehearsal_enabled
        or not rescue_mode_rehearsal_enabled
        or not dispute_rehearsal_enabled
        or not refund_rehearsal_enabled
        or real_customer_data_enabled
        or real_beneficiary_data_enabled
        or provider_sandbox_connectivity_enabled
        or browser_transfer_creation_enabled
        or service_transfer_creation_enabled
        or webhook_ingestion_enabled
        or financial_ledger_posting_enabled
        or retry_execution_enabled
        or reconciliation_write_enabled
        or rescue_operator_action_enabled
        or dispute_case_writes_enabled
        or refund_execution_enabled
        or production_provider_connectivity_enabled
        or quote_acceptance_enabled
        or payment_execution_enabled
        or money_movement_enabled
        or customer_funding_enabled
        or custody_enabled
        or settlement_enabled
    ) then
    raise exception 'Payment sandbox transfer controls are not fail-closed';
  end if;

  if (select count(*) from public.payment_sandbox_transfer_lifecycle_reference) <> 36
    or (select count(distinct corridor_code) from public.payment_sandbox_transfer_lifecycle_reference) <> 4
    or (select count(distinct stage_key) from public.payment_sandbox_transfer_lifecycle_reference) <> 9
    or exists (
      select 1 from public.payment_sandbox_transfer_lifecycle_reference
      where data_mode <> 'synthetic_transfer_rehearsal'
        or not licensed_partner_sandbox_reference_enabled
        or not double_entry_preview_enabled
        or real_customer_data_enabled
        or real_beneficiary_data_enabled
        or provider_sandbox_connectivity_enabled
        or browser_transfer_creation_enabled
        or service_transfer_creation_enabled
        or webhook_ingestion_enabled
        or financial_ledger_posting_enabled
        or retry_execution_enabled
        or reconciliation_write_enabled
        or rescue_operator_action_enabled
        or dispute_case_writes_enabled
        or refund_execution_enabled
        or production_provider_connectivity_enabled
        or quote_acceptance_enabled
        or payment_execution_enabled
        or money_movement_enabled
        or customer_funding_enabled
        or custody_enabled
        or settlement_enabled
    ) then
    raise exception 'Payment sandbox lifecycle reference is incomplete or operational';
  end if;

  if (select count(*) from public.payment_sandbox_ledger_reference) <> 16
    or exists (
      select 1 from public.payment_sandbox_ledger_reference
      where data_mode <> 'synthetic_transfer_rehearsal'
        or not double_entry_preview_enabled
        or financial_ledger_posting_enabled
        or refund_execution_enabled
        or payment_execution_enabled
        or money_movement_enabled
    )
    or exists (
      select corridor_id, journal_key from public.payment_sandbox_ledger_templates
      group by corridor_id, journal_key
      having count(*) <> 2
        or count(*) filter (where entry_side = 'debit') <> 1
        or count(*) filter (where entry_side = 'credit') <> 1
        or count(distinct currency_role) <> 1
    ) then
    raise exception 'Payment sandbox ledger templates are incomplete, mixed-currency or writable';
  end if;

  if to_regclass('public.payment_sandbox_transfers') is not null
    or to_regclass('public.payment_sandbox_webhook_events') is not null
    or to_regclass('public.payment_sandbox_ledger_entries') is not null
    or to_regclass('public.payment_sandbox_disputes') is not null
    or to_regclass('public.payment_sandbox_refunds') is not null
    or to_regprocedure('public.create_payment_sandbox_transfer(jsonb)') is not null
    or to_regprocedure('public.ingest_payment_sandbox_webhook(jsonb)') is not null
    or to_regprocedure('public.execute_payment_sandbox_refund(jsonb)') is not null
    or has_table_privilege('service_role', 'public.payment_sandbox_transfer_stage_templates', 'INSERT')
    or has_table_privilege('service_role', 'public.payment_sandbox_ledger_templates', 'INSERT')
    or exists (select 1 from public.payment_intents where status <> 'disabled')
    or exists (select 1 from public.payment_quotes where status = 'accepted') then
    raise exception 'An operational transfer, webhook, ledger, dispute, refund or payment path unexpectedly exists';
  end if;
end;
$$;
