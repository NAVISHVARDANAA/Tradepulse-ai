begin;

select plan(80);

select ok(to_regclass('public.agentic_ai_controls') is not null, 'agentic AI controls exist');
select ok(to_regclass('public.global_news_signal_sources') is not null, 'global news sources exist');
select ok(to_regclass('public.global_news_signals') is not null, 'normalized news signals exist');
select ok(to_regclass('public.agentic_workspace_preferences') is not null, 'private AI preferences exist');
select ok(to_regclass('public.agentic_report_definitions') is not null, 'custom report definitions exist');
select ok(to_regclass('public.agentic_conversations') is not null, 'private conversations exist');
select ok(to_regclass('public.agentic_runs') is not null, 'agent runs exist');
select ok(to_regclass('public.agentic_run_steps') is not null, 'agent run steps exist');
select ok(to_regclass('public.agentic_messages') is not null, 'private agent messages exist');
select ok(to_regclass('public.agentic_model_training_candidates') is not null, 'model candidate ledger exists');
select ok(to_regclass('public.agentic_ai_control_status') is not null, 'sanitized AI control view exists');
select ok(to_regclass('public.global_news_signal_catalog') is not null, 'sanitized news signal view exists');
select ok(to_regclass('public.agentic_model_learning_ledger') is not null, 'sanitized learning ledger exists');

select is((select count(*) from public.agentic_ai_controls), 1::bigint, 'one Phase 8E AI policy is seeded');
select is((select count(*) from public.global_news_signal_sources), 2::bigint, 'synthetic and licensed provider slots are modeled');
select is((select count(*) from public.global_news_signals), 4::bigint, 'four synthetic global-news scenarios are seeded');
select is((select count(*) from public.global_news_signal_catalog), 4::bigint, 'every display fixture reaches the news catalog');
select is((select count(*) from public.agentic_model_training_candidates), 1::bigint, 'one news-aware model candidate is scheduled');
select ok((select bool_and(workspace_enabled and grounded_responses_required and citations_required) from public.agentic_ai_controls), 'AI workspace requires grounding and citations');
select ok((select bool_and(continuous_candidate_training_enabled and human_model_promotion_required) from public.agentic_ai_controls), 'candidate learning remains human-promotion gated');
select ok(not exists(select 1 from public.agentic_ai_controls where external_llm_connected or unlicensed_news_ingestion_enabled or direct_self_promotion_enabled or autonomous_trade_execution_enabled or customer_funding_enabled or prompt_training_default_opt_in), 'unsafe AI, news, execution, funding and default training paths remain false');
select ok(not exists(select 1 from public.global_news_signal_sources where raw_content_storage_enabled), 'news sources never store raw article content');
select ok(not exists(select 1 from public.global_news_signal_sources where provider_connectivity_enabled), 'no production news provider is connected');
select ok((select bool_and(synthetic and display_eligible and not training_eligible) from public.global_news_signals), 'synthetic signals are visible but excluded from training');
select ok((select bool_and(input_digest ~ '^[a-f0-9]{64}$') from public.global_news_signals), 'news inputs retain only deterministic digests');
select ok(not exists(select 1 from public.agentic_model_training_candidates where automatically_promoted or promotion_status <> 'human_review_required' or prompt_content_training_enabled), 'model candidate cannot auto-promote or train on prompts');
select ok((select bool_and(leakage_gap_enabled and walk_forward_validation_enabled and cost_aware_backtest_enabled) from public.agentic_model_training_candidates), 'candidate evaluation requires leakage, walk-forward and cost controls');

select ok((select bool_and(relrowsecurity) from pg_class where oid in (
  'public.agentic_ai_controls'::regclass,
  'public.global_news_signal_sources'::regclass,
  'public.global_news_signals'::regclass,
  'public.agentic_workspace_preferences'::regclass,
  'public.agentic_report_definitions'::regclass,
  'public.agentic_conversations'::regclass,
  'public.agentic_runs'::regclass,
  'public.agentic_run_steps'::regclass,
  'public.agentic_messages'::regclass,
  'public.agentic_model_training_candidates'::regclass
)), 'every Phase 8E table uses RLS');
select ok(has_table_privilege('anon', 'public.agentic_ai_control_status', 'SELECT'), 'guests can inspect sanitized AI controls');
select ok(has_table_privilege('anon', 'public.global_news_signal_catalog', 'SELECT'), 'guests can inspect eligible normalized signals');
select ok(has_table_privilege('anon', 'public.agentic_model_learning_ledger', 'SELECT'), 'guests can inspect candidate governance');
select ok(not has_table_privilege('anon', 'public.agentic_messages', 'SELECT'), 'guests cannot read private messages');
select ok(not has_table_privilege('anon', 'public.agentic_report_definitions', 'SELECT'), 'guests cannot read private reports');
select ok(has_table_privilege('authenticated', 'public.agentic_messages', 'SELECT'), 'signed-in users can read their RLS-scoped messages');
select ok(not has_table_privilege('authenticated', 'public.agentic_messages', 'INSERT'), 'browser users cannot forge assistant messages');
select ok(not has_table_privilege('authenticated', 'public.agentic_runs', 'INSERT'), 'browser users cannot forge agent runs');
select ok(has_table_privilege('service_role', 'public.agentic_runs', 'INSERT'), 'protected agent service can create runs');
select ok(has_table_privilege('service_role', 'public.agentic_messages', 'INSERT'), 'protected agent service can append messages');
select ok(coalesce((select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.agentic_ai_control_status'::regclass), false), 'AI control view preserves caller permissions');
select ok(coalesce((select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.global_news_signal_catalog'::regclass), false), 'news catalog preserves caller permissions');

select ok(to_regprocedure('public.save_agentic_workspace_preferences(text,text,text,text,text[],text[],boolean)') is not null, 'preference RPC exists');
select ok(to_regprocedure('public.save_agentic_report_definition(text,text,text,text[],jsonb,text,text)') is not null, 'report RPC exists');
select ok(has_function_privilege('authenticated', 'public.save_agentic_workspace_preferences(text,text,text,text,text[],text[],boolean)', 'EXECUTE'), 'authenticated users can save private preferences');
select ok(has_function_privilege('authenticated', 'public.save_agentic_report_definition(text,text,text,text[],jsonb,text,text)', 'EXECUTE'), 'authenticated users can save private reports');
select ok(not has_function_privilege('anon', 'public.save_agentic_report_definition(text,text,text,text[],jsonb,text,text)', 'EXECUTE'), 'guests cannot save private reports');
select ok(pg_get_functiondef('public.save_agentic_report_definition(text,text,text,text[],jsonb,text,text)'::regprocedure) ~* 'pg_advisory_xact_lock', 'report saves use a transaction-scoped idempotency lock');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-4000-8000-00000000008e',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'phase8e@example.test', '', now(), now(), now(),
  '{}'::jsonb, '{"display_name":"Phase 8E Test"}'::jsonb
);

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000008e', true);

select lives_ok(
  $$select public.save_agentic_workspace_preferences(
    'detailed', 'conservative', '1m', 'INR', array['GLOBAL','IN'],
    array['market_snapshot','forecast','news','risk','methodology'], true
  )$$,
  'authenticated user can save private AI preferences'
);
select is((select assistant_style from public.agentic_workspace_preferences), 'detailed', 'assistant style is customizable');
select is((select risk_lens from public.agentic_workspace_preferences), 'conservative', 'risk lens is customizable');
select is((select default_horizon from public.agentic_workspace_preferences), '1m', 'analysis horizon is customizable');
select is((select default_currency from public.agentic_workspace_preferences), 'INR', 'reporting currency is customizable');
select is((select cardinality(report_sections) from public.agentic_workspace_preferences), 5, 'private report section preferences are stored');
select ok((select prompt_training_opt_in from public.agentic_workspace_preferences), 'prompt improvement consent requires an explicit opt-in');
select throws_ok(
  $$select public.save_agentic_workspace_preferences(
    'unbounded', 'balanced', '1w', 'USD', array['GLOBAL'], array['news'], false
  )$$,
  'P0001', 'Invalid agentic workspace preferences',
  'unsupported assistant settings fail closed'
);
select throws_ok(
  $$select public.save_agentic_workspace_preferences(
    'balanced', 'balanced', '1w', 'USD', array['GLOBAL'], array['trade_signal'], false
  )$$,
  'P0001', 'Unsupported report section',
  'unsupported report sections fail closed'
);

select lives_ok(
  $$select public.save_agentic_report_definition(
    'phase8e-report-001', 'My global risk report', 'watchlist',
    array['market_snapshot','forecast','news','risk'],
    '{"symbols":["AAPL"],"includeUncertainty":true}'::jsonb,
    'weekdays', 'interactive'
  )$$,
  'authenticated user can save a custom report definition'
);
select is((select count(*) from public.agentic_report_definitions), 1::bigint, 'one private report is stored');
select is((select schedule from public.agentic_report_definitions), 'weekdays', 'report cadence is customizable');
select is((select jsonb_array_length(filters -> 'symbols') from public.agentic_report_definitions), 1, 'report filters remain structured');
select lives_ok(
  $$select public.save_agentic_report_definition(
    'phase8e-report-001', 'My shorter risk report', 'stock',
    array['forecast','news','risk'], '{}'::jsonb, 'weekly', 'csv'
  )$$,
  'the same client report id updates safely'
);
select is((select count(*) from public.agentic_report_definitions), 1::bigint, 'idempotent report save remains singular');
select is((select output_format from public.agentic_report_definitions), 'csv', 'report output format is customizable');
select lives_ok(
  $test$do $block$
  begin
    for report_number in 2..8 loop
      perform public.save_agentic_report_definition(
        format('phase8e-report-%s', lpad(report_number::text, 3, '0')),
        format('Saved report %s', report_number), 'market', array['forecast','risk'],
        '{}'::jsonb, 'on_demand', 'interactive'
      );
    end loop;
  end
  $block$$test$,
  'an account can store the bounded report inventory'
);
select throws_ok(
  $$select public.save_agentic_report_definition(
    'phase8e-report-009', 'Ninth report', 'market', array['forecast','risk'],
    '{}'::jsonb, 'on_demand', 'interactive'
  )$$,
  'P0001', 'Agentic report limit reached',
  'the database rejects reports above the per-account limit'
);
select throws_ok(
  $$select public.save_agentic_report_definition(
    'phase8e-report-bad', 'Bad report', 'market', array[]::text[], '{}'::jsonb,
    'on_demand', 'interactive'
  )$$,
  'P0001', 'Invalid agentic report definition',
  'empty reports fail closed'
);

select set_config('request.jwt.claim.role', 'service_role', true);
insert into public.agentic_conversations (id, user_id, title)
values ('10000000-0000-4000-8000-00000000008e', '00000000-0000-4000-8000-00000000008e', 'Grounded market review');
insert into public.agentic_runs (
  id, user_id, conversation_id, client_run_id, mode, status,
  prompt_digest, orchestrator_version, evidence_count, response_payload, completed_at
) values (
  '20000000-0000-4000-8000-00000000008e', '00000000-0000-4000-8000-00000000008e',
  '10000000-0000-4000-8000-00000000008e', 'phase8e-run-001', 'market_brief',
  'completed', repeat('a', 64), 'tradepulse-agentic-research-v1.0.0', 2,
  '{"answer":"Grounded test answer","externalLlmConnected":false}'::jsonb, now()
);
insert into public.agentic_run_steps (run_id, sequence_number, agent_role, status, evidence)
values
  ('20000000-0000-4000-8000-00000000008e', 1, 'planner', 'completed', '{"production_effect":false}'),
  ('20000000-0000-4000-8000-00000000008e', 2, 'safety_reviewer', 'completed', '{"production_effect":false}');
insert into public.agentic_messages (
  conversation_id, run_id, user_id, role, content, grounded_evidence,
  safety_status, training_consent
) values
  ('10000000-0000-4000-8000-00000000008e', '20000000-0000-4000-8000-00000000008e', '00000000-0000-4000-8000-00000000008e', 'user', 'Summarize grounded evidence', '[]', 'not_applicable', false),
  ('10000000-0000-4000-8000-00000000008e', '20000000-0000-4000-8000-00000000008e', '00000000-0000-4000-8000-00000000008e', 'assistant', 'Grounded test answer', '[{"type":"forecast"}]', 'grounded', false);

select is((select count(*) from public.agentic_runs), 1::bigint, 'one auditable agent run is stored');
select is((select count(*) from public.agentic_run_steps), 2::bigint, 'planner and safety-review steps are auditable');
select is((select count(*) from public.agentic_messages), 2::bigint, 'private user and assistant messages are retained');
select ok(not (select production_effect from public.agentic_runs), 'agent run has no production effect');
select ok((select bool_and(not production_effect) from public.agentic_run_steps), 'every agent step has no production effect');
select ok(not exists(select 1 from public.agentic_messages where training_consent), 'conversation is excluded from training without message-level consent');
select throws_ok(
  $$delete from public.agentic_messages where role = 'assistant'$$,
  'P0001', 'Agentic AI evidence is append-only',
  'assistant evidence is append-only'
);
select throws_ok(
  $$update public.global_news_signals set sentiment_score = 1 where id = 1$$,
  'P0001', 'Agentic AI evidence is append-only',
  'news signals are append-only'
);
select throws_ok(
  $$update public.agentic_model_training_candidates set automatically_promoted = true$$,
  'P0001', 'Agentic AI evidence is append-only',
  'candidate governance evidence is append-only'
);

select ok(to_regclass('public.live_agent_trade_instructions') is null, 'no autonomous trade instruction table exists');
select ok(to_regprocedure('public.execute_agentic_trade(jsonb)') is null, 'no autonomous trade execution RPC exists');
select ok(to_regprocedure('public.auto_promote_forecast_model(jsonb)') is null, 'no automatic model promotion RPC exists');
select ok(to_regprocedure('public.ingest_unlicensed_news(jsonb)') is null, 'no unlicensed news ingestion RPC exists');
select ok(not exists(select 1 from public.live_trading_activation_controls where live_order_routing_enabled or customer_funding_enabled or custody_enabled or settlement_enabled), 'existing live-trading locks remain closed');
select ok(not exists(select 1 from public.payment_money_movement_controls where production_partner_connectivity_enabled or customer_funding_enabled or payment_execution_enabled or money_movement_enabled), 'existing money-movement locks remain closed');

select * from finish();
rollback;
