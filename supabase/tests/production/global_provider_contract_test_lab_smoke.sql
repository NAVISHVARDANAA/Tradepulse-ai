do $$
begin
  if to_regclass('public.global_provider_contract_test_controls') is null
    or to_regclass('public.global_provider_contract_test_suites') is null
    or to_regclass('public.global_provider_contract_assertion_templates') is null
    or to_regclass('public.global_provider_synthetic_fixture_templates') is null
    or to_regclass('public.global_provider_contract_test_status') is null
    or to_regclass('public.global_provider_contract_suite_catalog') is null
    or to_regclass('public.global_provider_contract_assertion_catalog') is null
    or to_regclass('public.global_provider_synthetic_fixture_catalog') is null then
    raise exception 'Phase 8M provider contract-test schema is incomplete';
  end if;

  if (select count(*) from public.global_provider_contract_test_suites) <> 8
    or (select count(*) from public.global_provider_contract_assertion_templates) <> 10
    or (select count(*) from public.global_provider_synthetic_fixture_templates) <> 24 then
    raise exception 'Phase 8M deterministic provider contract-test counts changed';
  end if;

  if exists (
    select 1 from public.global_provider_contract_test_controls
    where source_family_target <> 8 or contract_suite_target <> 8
      or assertion_target <> 10 or synthetic_fixture_target <> 24
      or not deterministic_fixture_required or not explicit_missingness_required
      or not schema_version_required or not fail_closed_disposition_required
      or provider_selection_enabled or endpoint_execution_enabled
      or credential_access_enabled or external_payload_intake_enabled
      or synthetic_fixture_execution_enabled or candidate_write_enabled
      or automatic_conformance_approval_enabled or observation_release_enabled
      or model_training_enabled or autonomous_publication_enabled
      or autonomous_trade_execution_enabled
  ) or exists (
    select 1 from public.global_provider_contract_test_suites
    where suite_status <> 'specification_only' or provider_legal_name is not null
      or endpoint_domain is not null or credential_reference is not null
      or external_payload_reference is not null or executed_test_count <> 0
      or passed_test_count <> 0 or conformance_approved
      or candidate_write_enabled or release_enabled or production_effect
  ) or exists (
    select 1 from public.global_provider_synthetic_fixture_templates
    where not provider_neutral or contains_external_data or contains_real_world_observation
      or execution_count <> 0 or latest_executed_at is not null
      or candidate_write_enabled or release_enabled or production_effect
  ) then
    raise exception 'Phase 8M provider contract-test boundary is not specification-only and fail-closed';
  end if;

  if to_regprocedure('public.execute_global_provider_contract_test(text)') is not null
    or to_regprocedure('public.ingest_global_provider_payload(jsonb)') is not null then
    raise exception 'A provider contract-test execution or payload-ingestion surface exists';
  end if;

  if exists (
    select 1 from public.global_provider_certification_controls
    where provider_selection_enabled or endpoint_testing_enabled
      or credential_storage_enabled or candidate_intake_enabled
      or production_ingestion_enabled or automatic_certification_enabled
      or observation_release_enabled or model_training_enabled
      or autonomous_publication_enabled or autonomous_trade_execution_enabled
  ) or exists (
    select 1 from public.controlled_live_rollout_controls
    where live_order_routing_enabled or customer_funding_enabled
      or custody_enabled or settlement_enabled or automatic_activation_enabled
  ) then
    raise exception 'An earlier provider or execution lock changed';
  end if;
end;
$$;
