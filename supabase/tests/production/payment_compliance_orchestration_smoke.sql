do $$
begin
  if to_regclass('public.payment_compliance_orchestration_controls') is null
    or to_regclass('public.payment_compliance_workflow_requirements') is null
    or to_regclass('public.payment_compliance_orchestration_reference') is null then
    raise exception 'Payment compliance orchestration schema is incomplete';
  end if;

  if (select count(*) from public.payment_compliance_orchestration_controls) <> 1
    or exists (
      select 1 from public.payment_compliance_orchestration_controls
      where control_key <> 'payment-compliance-orchestration'
        or not workspace_enabled
        or not synthetic_case_rehearsal_enabled
        or data_mode <> 'synthetic_case_rehearsal'
        or real_identity_collection_enabled
        or document_upload_enabled
        or pii_storage_enabled
        or compliance_provider_connectivity_enabled
        or live_sanctions_screening_enabled
        or transaction_monitoring_connectivity_enabled
        or travel_rule_transmission_enabled
        or compliance_case_writes_enabled
        or automated_clearance_enabled
        or manual_override_enabled
        or quote_acceptance_enabled
        or transfer_creation_enabled
        or payment_execution_enabled
        or money_movement_enabled
    ) then
    raise exception 'Payment compliance orchestration controls are not fail-closed';
  end if;

  if (select count(*) from public.payment_compliance_orchestration_reference) <> 28
    or (select count(distinct corridor_id) from public.payment_compliance_orchestration_reference) <> 4
    or not exists (select 1 from public.payment_compliance_orchestration_reference where stage_key = 'kyc')
    or not exists (select 1 from public.payment_compliance_orchestration_reference where stage_key = 'kyb')
    or not exists (select 1 from public.payment_compliance_orchestration_reference where stage_key = 'aml')
    or not exists (select 1 from public.payment_compliance_orchestration_reference where stage_key = 'sanctions')
    or not exists (select 1 from public.payment_compliance_orchestration_reference where stage_key = 'transaction_monitoring')
    or not exists (select 1 from public.payment_compliance_orchestration_reference where stage_key = 'travel_rule')
    or not exists (select 1 from public.payment_compliance_orchestration_reference where stage_key = 'audit')
    or exists (
      select 1 from public.payment_compliance_orchestration_reference
      where data_mode <> 'synthetic_case_rehearsal'
        or outcome not in ('review_required', 'blocked')
        or real_identity_collection_enabled
        or document_upload_enabled
        or pii_storage_enabled
        or compliance_provider_connectivity_enabled
        or live_sanctions_screening_enabled
        or transaction_monitoring_connectivity_enabled
        or travel_rule_transmission_enabled
        or compliance_case_writes_enabled
        or automated_clearance_enabled
        or manual_override_enabled
        or quote_acceptance_enabled
        or transfer_creation_enabled
        or payment_execution_enabled
        or money_movement_enabled
    ) then
    raise exception 'Payment compliance orchestration reference is incomplete or operational';
  end if;

  if to_regclass('public.payment_compliance_cases') is not null
    or to_regclass('public.payment_identity_documents') is not null
    or to_regprocedure('public.clear_payment_compliance(jsonb)') is not null
    or to_regprocedure('public.create_payment_compliance_case(jsonb)') is not null
    or has_table_privilege('service_role', 'public.payment_compliance_workflow_requirements', 'INSERT')
    or exists (select 1 from public.payment_intents where status <> 'disabled')
    or exists (select 1 from public.payment_quotes where status = 'accepted')
    or to_regclass('public.payment_transactions') is not null then
    raise exception 'A real compliance clearance, identity collection or payment execution path unexpectedly exists';
  end if;
end;
$$;
