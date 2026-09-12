do $$
begin
  if to_regclass('public.agentic_ai_controls') is null
    or to_regclass('public.global_news_signal_sources') is null
    or to_regclass('public.global_news_signals') is null
    or to_regclass('public.agentic_workspace_preferences') is null
    or to_regclass('public.agentic_report_definitions') is null
    or to_regclass('public.agentic_conversations') is null
    or to_regclass('public.agentic_runs') is null
    or to_regclass('public.agentic_run_steps') is null
    or to_regclass('public.agentic_messages') is null
    or to_regclass('public.agentic_model_training_candidates') is null
    or to_regclass('public.agentic_ai_control_status') is null
    or to_regclass('public.global_news_signal_catalog') is null
    or to_regclass('public.agentic_model_learning_ledger') is null then
    raise exception 'Phase 8E agentic investing schema is incomplete';
  end if;

  if (select count(*) from public.agentic_ai_controls) <> 1
    or (select count(*) from public.global_news_signal_sources) <> 2
    or (select count(*) from public.global_news_signals) <> 4
    or (select count(*) from public.agentic_model_training_candidates) <> 1 then
    raise exception 'Phase 8E reference counts changed';
  end if;

  if exists (
    select 1 from public.agentic_ai_controls
    where not workspace_enabled or not grounded_responses_required or not citations_required
      or not continuous_candidate_training_enabled or not human_model_promotion_required
      or external_llm_connected or unlicensed_news_ingestion_enabled
      or direct_self_promotion_enabled or autonomous_trade_execution_enabled
      or customer_funding_enabled or prompt_training_default_opt_in
  ) then
    raise exception 'Agentic AI controls are not fail-closed';
  end if;

  if exists (
    select 1 from public.global_news_signal_sources
    where raw_content_storage_enabled or provider_connectivity_enabled
  ) or exists (
    select 1 from public.global_news_signals
    where synthetic and training_eligible
  ) then
    raise exception 'News rights, raw-content, or synthetic-training boundary changed';
  end if;

  if exists (
    select 1 from public.agentic_model_training_candidates
    where automatically_promoted or promotion_status <> 'human_review_required'
      or prompt_content_training_enabled or not leakage_gap_enabled
      or not walk_forward_validation_enabled or not cost_aware_backtest_enabled
  ) then
    raise exception 'Continuous-learning evaluation gate changed';
  end if;

  if to_regprocedure('public.save_agentic_workspace_preferences(text,text,text,text,text[],text[],boolean)') is null
    or to_regprocedure('public.save_agentic_report_definition(text,text,text,text[],jsonb,text,text)') is null then
    raise exception 'Private customization RPC contract is incomplete';
  end if;

  if to_regclass('public.live_agent_trade_instructions') is not null
    or to_regprocedure('public.execute_agentic_trade(jsonb)') is not null
    or to_regprocedure('public.auto_promote_forecast_model(jsonb)') is not null
    or to_regprocedure('public.ingest_unlicensed_news(jsonb)') is not null then
    raise exception 'Unsafe AI execution, promotion, or news path exists';
  end if;

  if exists (
    select 1 from public.live_trading_activation_controls
    where live_order_routing_enabled or customer_funding_enabled
      or custody_enabled or settlement_enabled
  ) or exists (
    select 1 from public.payment_money_movement_controls
    where production_partner_connectivity_enabled or customer_funding_enabled
      or payment_execution_enabled or money_movement_enabled
  ) then
    raise exception 'An existing execution or money-movement lock changed';
  end if;
end;
$$;
