do $$
begin
  if to_regclass('public.payment_corridor_intelligence_controls') is null
    or to_regclass('public.payment_corridor_routes') is null
    or to_regclass('public.payment_corridor_intelligence') is null then
    raise exception 'Corridor intelligence schema is incomplete';
  end if;

  if (select count(*) from public.payment_corridor_intelligence_controls) <> 1
    or exists (
      select 1 from public.payment_corridor_intelligence_controls
      where control_key <> 'corridor-intelligence'
        or data_mode <> 'sandbox_model'
        or provider_connectivity_enabled
        or beneficiary_collection_enabled
        or quote_acceptance_enabled
        or automatic_route_selection_enabled
        or transfer_creation_enabled
        or payment_execution_enabled
        or money_movement_enabled
        or custody_enabled
        or settlement_enabled
    ) then
    raise exception 'Corridor intelligence controls are not fail-closed';
  end if;

  if (select count(*) from public.payment_corridor_intelligence) <> 8
    or exists (
      select 1 from public.payment_corridor_intelligence
      where provider_rate_mode <> 'sandbox_model'
        or availability <> 'reference_only'
        or tax_status <> 'unavailable'
        or estimated_tax_bps is not null
        or provider_connectivity_enabled
        or beneficiary_collection_enabled
        or quote_acceptance_enabled
        or automatic_route_selection_enabled
        or transfer_creation_enabled
        or payment_execution_enabled
        or money_movement_enabled
        or custody_enabled
        or settlement_enabled
    ) then
    raise exception 'Corridor intelligence output is misleading or executable';
  end if;

  if has_table_privilege('anon', 'public.payment_corridor_routes', 'INSERT')
    or has_table_privilege('authenticated', 'public.payment_corridor_routes', 'UPDATE')
    or has_table_privilege('service_role', 'public.payment_intents', 'INSERT')
    or exists (select 1 from public.payment_intents where status <> 'disabled')
    or exists (select 1 from public.payment_quotes where status = 'accepted')
    or to_regprocedure('public.create_payment_transfer(jsonb)') is not null
    or to_regprocedure('public.submit_payment(jsonb)') is not null
    or to_regclass('public.payment_transactions') is not null then
    raise exception 'A payment execution or money-movement path unexpectedly exists';
  end if;
end;
$$;
