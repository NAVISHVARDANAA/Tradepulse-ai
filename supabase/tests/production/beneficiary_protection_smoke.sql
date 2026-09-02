do $$
begin
  if to_regclass('public.payment_beneficiary_protection_controls') is null
    or to_regclass('public.payment_beneficiary_protection_rules') is null
    or to_regclass('public.payment_beneficiary_protection_reference') is null then
    raise exception 'Beneficiary protection schema is incomplete';
  end if;

  if (select count(*) from public.payment_beneficiary_protection_controls) <> 1
    or exists (
      select 1 from public.payment_beneficiary_protection_controls
      where control_key <> 'beneficiary-protection'
        or not workspace_enabled
        or not synthetic_rehearsal_enabled
        or data_mode <> 'synthetic_rehearsal'
        or real_beneficiary_collection_enabled
        or beneficiary_identifier_storage_enabled
        or validation_provider_connectivity_enabled
        or beneficiary_creation_enabled
        or duplicate_override_enabled
        or cooling_off_bypass_enabled
        or quote_acceptance_enabled
        or transfer_creation_enabled
        or payment_execution_enabled
        or money_movement_enabled
    ) then
    raise exception 'Beneficiary protection controls are not fail-closed';
  end if;

  if (select count(*) from public.payment_beneficiary_protection_reference) <> 7
    or not exists (select 1 from public.payment_beneficiary_protection_reference where category = 'validation')
    or not exists (select 1 from public.payment_beneficiary_protection_reference where category = 'duplicate')
    or not exists (select 1 from public.payment_beneficiary_protection_reference where category = 'cooling_off')
    or not exists (select 1 from public.payment_beneficiary_protection_reference where category = 'scam')
    or exists (
      select 1 from public.payment_beneficiary_protection_reference
      where data_mode <> 'synthetic_rehearsal'
        or outcome not in ('manual_review', 'cooling_off', 'blocked')
        or (outcome = 'cooling_off' and cooling_off_hours <= 0)
        or (outcome <> 'cooling_off' and cooling_off_hours <> 0)
        or real_beneficiary_collection_enabled
        or beneficiary_identifier_storage_enabled
        or validation_provider_connectivity_enabled
        or beneficiary_creation_enabled
        or duplicate_override_enabled
        or cooling_off_bypass_enabled
        or quote_acceptance_enabled
        or transfer_creation_enabled
        or payment_execution_enabled
        or money_movement_enabled
    ) then
    raise exception 'Beneficiary protection reference is incomplete or executable';
  end if;

  if to_regclass('public.payment_beneficiaries') is not null
    or to_regprocedure('public.create_payment_beneficiary(jsonb)') is not null
    or has_table_privilege('service_role', 'public.payment_beneficiary_protection_rules', 'INSERT')
    or exists (select 1 from public.payment_intents where status <> 'disabled')
    or exists (select 1 from public.payment_quotes where status = 'accepted')
    or to_regclass('public.payment_transactions') is not null then
    raise exception 'A beneficiary or payment execution path unexpectedly exists';
  end if;
end;
$$;
