begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(80);

select has_table('public', 'global_event_intelligence_controls', 'global event control table exists');
select has_table('public', 'global_event_source_registry', 'source authenticity registry exists');
select has_table('public', 'global_country_intelligence_profiles', 'country intelligence profile table exists');
select has_table('public', 'global_event_records', 'normalized event record table exists');
select has_table('public', 'global_event_entities', 'event knowledge graph entity table exists');
select has_table('public', 'global_event_entity_links', 'event-to-entity link table exists');
select has_table('public', 'global_event_impact_edges', 'causal impact edge table exists');
select has_table('public', 'global_event_analysis_runs', 'event analysis evidence ledger exists');
select has_table('public', 'user_global_event_alert_policies', 'private alert policy table exists');
select has_view('public', 'global_event_intelligence_status', 'sanitized control status view exists');
select has_view('public', 'global_event_signal_catalog', 'sanitized event catalog exists');
select has_view('public', 'global_event_impact_graph', 'causal impact graph view exists');
select has_view('public', 'global_country_intelligence_coverage', 'country coverage view exists');

select is((select count(*) from public.global_event_intelligence_controls), 1::bigint, 'one global event policy is active');
select ok((select workspace_enabled from public.global_event_intelligence_controls), 'global event workspace is enabled');
select ok((select source_authenticity_required from public.global_event_intelligence_controls), 'source authenticity is mandatory');
select ok((select multi_source_corroboration_required from public.global_event_intelligence_controls), 'multi-source corroboration is mandatory');
select ok((select causal_impact_graph_enabled from public.global_event_intelligence_controls), 'causal impact graph is enabled');
select ok((select scenario_forecasting_enabled from public.global_event_intelligence_controls), 'probabilistic scenario forecasting is enabled');
select ok((select personalized_alerts_enabled from public.global_event_intelligence_controls), 'private alert policies are enabled');
select is((select country_coverage_target from public.global_event_intelligence_controls), 195, 'country coverage target follows the documented sovereign-state convention');
select ok(not exists(
  select 1 from public.global_event_intelligence_controls
  where raw_web_scraping_enabled or credentialed_source_bypass_enabled
    or unlicensed_content_storage_enabled
    or automatic_verification_without_evidence_enabled or rumor_promotion_enabled
    or autonomous_publication_enabled or production_provider_connectivity_enabled
    or autonomous_trade_execution_enabled or customer_funding_enabled
    or custody_enabled or settlement_enabled
), 'unsafe ingestion, publishing, execution and money paths are locked');

select is((select count(*) from public.global_event_source_registry), 5::bigint, 'five source slots are governed');
select is((select count(*) from public.global_event_source_registry where enabled), 1::bigint, 'only the synthetic source is enabled');
select ok(not exists(select 1 from public.global_event_source_registry where provider_connectivity_enabled), 'no event provider is connected');
select ok(not exists(select 1 from public.global_event_source_registry where raw_content_storage_enabled), 'raw source content is never stored');
select is(
  (select count(*) from public.global_country_intelligence_profiles),
  (select count(*) from public.countries),
  'every catalogued country has an explicit intelligence coverage row'
);
select ok(not exists(select 1 from public.global_country_intelligence_profiles where provider_coverage_enabled), 'country provider coverage remains fail-closed');

select is((select count(*) from public.global_event_records), 5::bigint, 'five synthetic global event scenarios are seeded');
select ok((select bool_and(synthetic) from public.global_event_records), 'every seeded event is clearly synthetic');
select ok(not exists(select 1 from public.global_event_records where model_eligible), 'synthetic events cannot train a model');
select ok(not exists(select 1 from public.global_event_records where source_published_at > observed_at), 'events preserve a no-future observation cutoff');
select ok((select bool_and(char_length(input_digest) = 64) from public.global_event_records), 'event inputs retain one-way evidence digests');
select ok((select bool_and(verification_status = 'synthetic') from public.global_event_records), 'fixtures never claim real-world verification');
select is((select count(*) from public.global_event_entities), 12::bigint, 'twelve graph entities are defined');
select is((select count(*) from public.global_event_entity_links), 15::bigint, 'fifteen event-to-entity links are defined');
select is((select count(*) from public.global_event_impact_edges), 9::bigint, 'nine causal impact edges are defined');
select is((select count(*) from public.global_event_impact_edges where terminal_edge), 6::bigint, 'six probabilistic market scenarios terminate at tracked assets');
select ok(not exists(
  select 1 from public.global_event_impact_edges
  where sequence_number < 1 or from_entity_id = to_entity_id
), 'causal edges preserve valid direction and ordering');
select ok((select bool_and(human_review_required) from public.global_event_impact_edges), 'every scenario requires human review');
select ok(not exists(select 1 from public.global_event_impact_edges where production_effect), 'causal scenarios have no production effect');
select ok(not exists(select 1 from public.global_event_impact_edges where model_eligible), 'synthetic impact edges cannot train a model');
select ok(not exists(
  select 1 from public.global_event_impact_edges
  where terminal_edge and (
    target_asset_id is null or estimated_effect_low_pct is null
      or estimated_effect_high_pct is null
  )
), 'terminal scenarios expose bounded impact ranges');
select is((select count(*) from public.global_event_analysis_runs), 5::bigint, 'each synthetic event has an auditable analysis run');
select ok(not exists(select 1 from public.global_event_analysis_runs where automatically_published), 'event analyses are never automatically published');
select ok(not exists(select 1 from public.global_event_analysis_runs where production_effect), 'event analysis runs have no production effect');

select ok(has_table_privilege('anon', 'public.global_event_intelligence_status', 'SELECT'), 'guests can read sanitized event status');
select ok(not has_table_privilege('anon', 'public.user_global_event_alert_policies', 'SELECT'), 'guests cannot read private alert policies');
select ok(has_table_privilege('authenticated', 'public.user_global_event_alert_policies', 'SELECT'), 'signed-in users can read their RLS-scoped alert policies');
select ok(not has_table_privilege('authenticated', 'public.user_global_event_alert_policies', 'INSERT'), 'browser users cannot bypass the alert RPC');
select ok(has_table_privilege('service_role', 'public.global_event_records', 'INSERT'), 'protected services can append normalized event evidence');
select ok(coalesce((
  select bool_and(reloptions @> array['security_invoker=true'])
  from pg_class
  where oid in (
    'public.global_event_intelligence_status'::regclass,
    'public.global_event_signal_catalog'::regclass,
    'public.global_event_impact_graph'::regclass,
    'public.global_country_intelligence_coverage'::regclass
  )
), false), 'global intelligence views preserve caller permissions');

select ok(to_regprocedure('public.save_global_event_alert_policy(text,text,text[],text[],text[],numeric,numeric,text)') is not null, 'private alert RPC exists');
select ok(has_function_privilege('authenticated', 'public.save_global_event_alert_policy(text,text,text[],text[],text[],numeric,numeric,text)', 'EXECUTE'), 'authenticated users can save alert policies');
select ok(not has_function_privilege('anon', 'public.save_global_event_alert_policy(text,text,text[],text[],text[],numeric,numeric,text)', 'EXECUTE'), 'guests cannot save alert policies');
select ok(
  pg_get_functiondef('public.save_global_event_alert_policy(text,text,text[],text[],text[],numeric,numeric,text)'::regprocedure) ~* 'pg_advisory_xact_lock',
  'alert saves use a transaction-scoped idempotency lock'
);
select ok(exists(
  select 1 from pg_constraint
  where conrelid = 'public.agentic_run_steps'::regclass
    and pg_get_constraintdef(oid) like '%event_intelligence_analyst%'
), 'the agent orchestrator recognizes the event intelligence analyst role');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-4000-8000-00000000008f',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'phase8f@example.test', '', now(), now(), now(),
  '{}'::jsonb, '{"display_name":"Phase 8F Test"}'::jsonb
);

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000008f', true);

select lives_ok(
  $$select public.save_global_event_alert_policy(
    'phase8f-policy-001', 'Gold and energy disruption', array['GLOBAL','IN'],
    array['resource_discovery','energy_supply','logistics_disruption'],
    array['XAUUSD','WTI'], 0.7, 0.6, 'high'
  )$$,
  'authenticated user can save a private global event alert policy'
);
select is((select count(*) from public.user_global_event_alert_policies), 1::bigint, 'one private alert policy is stored');
select is((select cardinality(country_codes) from public.user_global_event_alert_policies), 2, 'country filters are customizable');
select is((select cardinality(event_types) from public.user_global_event_alert_policies), 3, 'event-type filters are customizable');
select is((select delivery_channel from public.user_global_event_alert_policies), 'in_app', 'alert delivery remains in-app only');
select lives_ok(
  $$select public.save_global_event_alert_policy(
    'phase8f-policy-001', 'Critical gold event', array['IN'],
    array['resource_discovery'], array['XAUUSD'], 0.8, 0.7, 'critical'
  )$$,
  'the same client policy id updates safely'
);
select is((select count(*) from public.user_global_event_alert_policies), 1::bigint, 'idempotent alert save remains singular');
select is((select minimum_severity from public.user_global_event_alert_policies), 'critical', 'alert severity is customizable');
select throws_ok(
  $$select public.save_global_event_alert_policy(
    'phase8f-policy-bad-country', 'Bad country', array['ZZ'],
    array['resource_discovery'], array['XAUUSD'], 0.7, 0.6, 'medium'
  )$$,
  'P0001', 'Unsupported country code',
  'unknown country filters fail closed'
);
select throws_ok(
  $$select public.save_global_event_alert_policy(
    'phase8f-policy-bad-event', 'Bad event', array['GLOBAL'],
    array['market_rumor'], array['XAUUSD'], 0.7, 0.6, 'medium'
  )$$,
  'P0001', 'Unsupported event type',
  'unsupported event categories fail closed'
);
select throws_ok(
  $$select public.save_global_event_alert_policy(
    'phase8f-policy-bad-asset', 'Bad asset', array['GLOBAL'],
    array['energy_supply'], array['UNKNOWN'], 0.7, 0.6, 'medium'
  )$$,
  'P0001', 'Unsupported market asset',
  'unknown asset filters fail closed'
);
select lives_ok(
  $test$do $block$
  begin
    for policy_number in 2..12 loop
      perform public.save_global_event_alert_policy(
        format('phase8f-policy-%s', lpad(policy_number::text, 3, '0')),
        format('Saved alert %s', policy_number), array['GLOBAL'],
        array['macro_data'], '{}'::text[], 0.7, 0.6, 'medium'
      );
    end loop;
  end
  $block$$test$,
  'an account can store the bounded alert inventory'
);
select throws_ok(
  $$select public.save_global_event_alert_policy(
    'phase8f-policy-013', 'Thirteenth policy', array['GLOBAL'],
    array['macro_data'], '{}'::text[], 0.7, 0.6, 'medium'
  )$$,
  'P0001', 'Global event alert policy limit reached',
  'the database rejects policies above the per-account limit'
);
update public.user_global_event_alert_policies
set active = false
where client_policy_id = 'phase8f-policy-001';
select lives_ok(
  $$select public.save_global_event_alert_policy(
    'phase8f-policy-013', 'Replacement policy', array['GLOBAL'],
    array['macro_data'], '{}'::text[], 0.7, 0.6, 'medium'
  )$$,
  'an inactive policy releases one bounded inventory slot'
);
select is(
  (select count(*) from public.user_global_event_alert_policies where active),
  12::bigint,
  'the active alert inventory remains bounded after replacement'
);
select throws_ok(
  $$select public.save_global_event_alert_policy(
    'phase8f-policy-001', 'Reactivated policy', array['GLOBAL'],
    array['resource_discovery'], array['XAUUSD'], 0.8, 0.7, 'high'
  )$$,
  'P0001', 'Global event alert policy limit reached',
  'reactivating an inactive policy cannot exceed the active-policy limit'
);

select set_config('request.jwt.claim.role', 'service_role', true);
select throws_ok(
  $$update public.global_event_records set severity = 'low' where id = 1$$,
  'P0001', 'Global event intelligence evidence is append-only',
  'normalized event evidence is append-only'
);
select throws_ok(
  $$delete from public.global_event_impact_edges where id = 1$$,
  'P0001', 'Global event intelligence evidence is append-only',
  'causal impact evidence is append-only'
);
select throws_ok(
  $$update public.global_event_analysis_runs set status = 'completed'$$,
  'P0001', 'Global event intelligence evidence is append-only',
  'analysis-run evidence is append-only'
);
select ok(to_regclass('public.global_event_live_actions') is null, 'no autonomous event action table exists');
select ok(to_regprocedure('public.ingest_unlicensed_web_event(jsonb)') is null, 'no unlicensed web ingestion RPC exists');
select ok(to_regprocedure('public.auto_publish_global_event(jsonb)') is null, 'no automatic event publication RPC exists');
select ok(
  not exists(
    select 1 from public.live_trading_activation_controls
    where live_order_routing_enabled or customer_funding_enabled
      or custody_enabled or settlement_enabled
  ) and not exists(
    select 1 from public.payment_money_movement_controls
    where production_partner_connectivity_enabled or customer_funding_enabled
      or payment_execution_enabled or money_movement_enabled
  ),
  'existing trading and money-movement locks remain closed'
);

select * from finish();
rollback;
