import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function mockGuestBackend(page: Page) {
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204 })
      return
    }
    if (path.startsWith('/functions/v1/')) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Authentication is required' }),
      })
      return
    }
    if (path.startsWith('/auth/v1/')) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Authentication is required' }),
      })
      return
    }
    if (path === '/rest/v1/global_event_intelligence_status') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          control_key: 'global-event-intelligence', policy_version: 'global-event-policy-v1',
          country_coverage_target: 195, catalogued_country_count: 12,
          display_event_count: 1, scenario_count: 1,
          source_authenticity_required: true, multi_source_corroboration_required: true,
          causal_impact_graph_enabled: true, scenario_forecasting_enabled: true,
          personalized_alerts_enabled: true, raw_web_scraping_enabled: false,
          rumor_promotion_enabled: false, production_provider_connectivity_enabled: false,
          autonomous_trade_execution_enabled: false,
        }),
      })
      return
    }
    if (path === '/rest/v1/global_event_signal_catalog') {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([{
          id: 1, event_key: 'synthetic-india-gold-discovery', country_code: 'IN',
          country_name: 'India', region_code: 'IN', event_type: 'resource_discovery',
          normalized_summary: 'Synthetic discovery scenario tests global gold supply and pricing.',
          source_reference: 'synthetic://india-gold-discovery', source_name: 'TradePulse synthetic event laboratory',
          source_class: 'synthetic_fixture', rights_status: 'synthetic', authenticity_tier: 'reference',
          authenticity_score: 0, corroboration_count: 0, verification_status: 'synthetic',
          severity: 'high', novelty_score: 0.92, source_published_at: '2026-09-12T08:00:00Z',
          synthetic: true, model_eligible: false,
        }]),
      })
      return
    }
    if (path === '/rest/v1/global_event_impact_graph') {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([{
          id: 1, edge_key: 'india-gold-supply-to-price', event_id: 1,
          event_key: 'synthetic-india-gold-discovery', event_type: 'resource_discovery',
          event_summary: 'Synthetic discovery scenario', origin_country_code: 'IN', region_code: 'IN',
          sequence_number: 1, from_entity_kind: 'commodity', entity_key: 'commodity-gold',
          from_entity_name: 'Global gold supply', to_entity_kind: 'market_asset',
          target_entity_key: 'asset-XAUUSD', to_entity_name: 'Gold / US Dollar', mechanism: 'supply',
          impact_direction: 'negative', probability: 0.63, confidence_score: 0.42,
          horizon: '1y', lag_description: 'multi-year', rationale: 'Higher expected supply can pressure global gold prices while demand can offset the effect.',
          assumptions: ['commercial viability unknown'], target_symbol: 'XAUUSD',
          estimated_effect_low_pct: -3.5, estimated_effect_high_pct: 0.5,
          terminal_edge: true, human_review_required: true, synthetic: true,
        }]),
      })
      return
    }
    if (path === '/rest/v1/global_country_intelligence_coverage') {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([{
          country_code: 'IN', country_name: 'India', region: 'Asia', coverage_status: 'catalogued',
          approved_source_count: 0, provider_coverage_enabled: false, current_event_count: 1,
          latest_event_at: '2026-09-12T08:00:00Z', evidence_state: 'synthetic_scenario_only',
        }]),
      })
      return
    }
    if (path === '/rest/v1/controlled_live_rollout_status') {
      await route.fulfill({ status:200,contentType:'application/json',body:JSON.stringify({
        policy_version:'controlled-live-rollout-v1',candidate_cohort_count:3,live_cohort_count:0,
        requirement_count:18,drill_template_count:4,observed_drill_count:0,
      }) }); return
    }
    if (path === '/rest/v1/controlled_live_rollout_cohort_catalog') {
      await route.fulfill({ status:200,contentType:'application/json',body:JSON.stringify([{
        cohort_key:'IN:XNSE:CASH:EQUITY:COHORT-01',cohort_label:'India cash-equity candidate',
        residency_country:'IN',mic_code:'XNSE',venue_name:'National Stock Exchange of India',
        settlement_currency:'INR',account_type:'cash',asset_class:'equity',allowed_order_types:['market','limit'],
        maximum_customer_count:20,activation_status:'blocked',scope_decision_count:10,
        open_scope_decision_count:10,gate_count:18,blocking_gate_count:18,
      }]) }); return
    }
    if (path === '/rest/v1/controlled_live_rollout_limit_catalog') {
      await route.fulfill({ status:200,contentType:'application/json',body:JSON.stringify([{
        cohort_key:'IN:XNSE:CASH:EQUITY:COHORT-01',settlement_currency:'INR',maximum_order_notional:2000,
        maximum_daily_notional:7500,maximum_position_concentration_pct:10,maximum_orders_per_window:6,
        velocity_window_minutes:5,maximum_open_orders:5,maximum_funding_credit:0,
      }]) }); return
    }
    if (path === '/rest/v1/controlled_live_rollout_gate_catalog') {
      await route.fulfill({ status:200,contentType:'application/json',body:JSON.stringify([{
        requirement_key:'kill_switch_rollback',title:'Kill switch and rollback',
        summary:'Observed kill-switch and rollback drills must prove a bounded stop.',
        cohort_review_count:3,blocking_review_count:3,
      }]) }); return
    }
    if (path === '/rest/v1/controlled_live_rollout_drill_catalog') {
      await route.fulfill({ status:200,contentType:'application/json',body:JSON.stringify([{
        drill_key:'rollback',title:'Cohort rollback rehearsal',
        objective:'Prove one exact cohort can be withdrawn without changing another decision.',
        success_criteria:['scope isolated','version retained'],observed_count:0,
      }]) }); return
    }
    if (path === '/rest/v1/global_evidence_operations_status') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        control_key: 'global-evidence-operations', policy_version: 'global-evidence-policy-v1',
        country_coverage_target: 195, minimum_independent_sources: 2,
        connected_source_count: 0, source_lane_count: 5, enabled_source_lane_count: 0,
        corroboration_policy_count: 6, rehearsal_case_count: 5,
        publication_eligible_case_count: 0, immutable_provenance_required: true,
        source_rights_review_required: true, independent_corroboration_required: true,
        conflict_review_required: true, human_publication_review_required: true,
        raw_web_scraping_enabled: false, private_source_access_enabled: false,
        unlicensed_content_storage_enabled: false, automatic_verification_enabled: false,
        rumor_promotion_enabled: false, autonomous_publication_enabled: false,
        production_ingestion_enabled: false, model_training_enabled: false,
        autonomous_trade_execution_enabled: false,
      }) }); return
    }
    if (path === '/rest/v1/global_evidence_source_lane_catalog') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
        id: 1, lane_key: 'official-authority-lane', display_name: 'Official authority evidence',
        source_class: 'official_authority', review_priority: 1,
        supported_claim_classes: ['macro_data', 'resource_discovery'],
        rights_status: 'review_required', authenticity_status: 'review_required',
        privacy_status: 'review_required', security_status: 'review_required',
        retention_status: 'review_required', connectivity_status: 'disconnected',
        ingestion_enabled: false, publication_enabled: false, model_training_enabled: false,
        review_note: 'Named authorities require full review before connection.',
      }]) }); return
    }
    if (path === '/rest/v1/global_evidence_corroboration_catalog') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
        id: 1, claim_class: 'resource_discovery', display_name: 'Resource discovery',
        minimum_independent_sources: 3, minimum_primary_sources: 1,
        maximum_source_age_hours: 720, geographic_alignment_required: true,
        temporal_alignment_required: true, conflict_resolution: 'reject_until_resolved',
        human_review_required: true, publication_enabled: false, model_training_enabled: false,
      }]) }); return
    }
    if (path === '/rest/v1/global_evidence_review_queue_catalog') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
        id: 1, case_key: 'rehearsal-resource-discovery', claim_class: 'resource_discovery',
        claim_class_name: 'Resource discovery', country_scope: 'IN',
        rehearsal_summary: 'Synthetic intake drill; no real discovery or country assertion is represented.',
        independent_source_count: 0, required_independent_sources: 3,
        primary_source_count: 0, required_primary_sources: 1,
        rights_status: 'evidence_missing', authenticity_status: 'evidence_missing',
        corroboration_status: 'evidence_missing', conflict_status: 'not_evaluated',
        review_status: 'blocked', synthetic: true, display_eligible: false,
        publication_eligible: false, model_eligible: false,
        observed_at: '2026-09-15T08:00:00Z', stage_count: 8, blocking_stage_count: 8,
      }]) }); return
    }
    if (path === '/rest/v1/global_evidence_review_stage_catalog') {
      const stages = ['source_rights', 'source_authenticity', 'extraction_integrity',
        'temporal_alignment', 'independent_corroboration', 'conflict_resolution',
        'editorial_approval', 'model_eligibility']
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(
        stages.map((stage, index) => ({
          id: index + 1, review_case_id: 1, case_key: 'rehearsal-resource-discovery',
          sequence_number: index + 1, stage_key: stage, stage_status: 'evidence_missing',
          requirement_note: 'Independent evidence and accountable human review are required.',
          human_review_required: true, production_effect: false,
        })),
      ) }); return
    }
    if (path === '/rest/v1/global_country_coverage_status') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        control_key: 'global-country-coverage', policy_version: 'global-country-coverage-v1',
        sovereign_country_target: 195, intelligence_domain_target: 8,
        reference_country_count: 195, mapped_product_country_count: 12,
        evidenced_country_count: 0, intelligence_domain_count: 8,
        coverage_cell_count: 1560, evidence_gap_count: 1560, review_gate_count: 7,
        explicit_evidence_gaps_required: true, independent_corroboration_required: true,
        temporal_freshness_required: true, human_release_review_required: true,
        live_provider_connectivity_enabled: false, generated_fact_fill_enabled: false,
        automatic_country_scoring_enabled: false, production_ingestion_enabled: false,
        model_training_enabled: false, autonomous_publication_enabled: false,
        autonomous_trade_execution_enabled: false,
      }) }); return
    }
    if (path === '/rest/v1/global_sovereign_country_catalog') {
      const domains = ['macro_economy', 'currency_monetary', 'resources_commodities', 'trade_flows',
        'logistics_supply_chain', 'markets_corporates', 'climate_weather', 'geopolitics_regulation']
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 1, country_code: 'IN', country_name: 'India', region_group: 'Asia', existing_country_id: 1, reference_status: 'reference_only', approved_source_count: 0, current_observation_count: 0, completeness_status: 'evidence_missing', intelligence_domain_count: 8, missing_domain_count: 8, missing_domain_keys: domains, publication_eligible: false, model_eligible: false },
        { id: 2, country_code: 'GB', country_name: 'United Kingdom', region_group: 'Europe', existing_country_id: 2, reference_status: 'reference_only', approved_source_count: 0, current_observation_count: 0, completeness_status: 'evidence_missing', intelligence_domain_count: 8, missing_domain_count: 8, missing_domain_keys: domains, publication_eligible: false, model_eligible: false },
        { id: 3, country_code: 'US', country_name: 'United States', region_group: 'Americas', existing_country_id: 3, reference_status: 'reference_only', approved_source_count: 0, current_observation_count: 0, completeness_status: 'evidence_missing', intelligence_domain_count: 8, missing_domain_count: 8, missing_domain_keys: domains, publication_eligible: false, model_eligible: false },
      ]) }); return
    }
    if (path === '/rest/v1/global_country_intelligence_domain_catalog') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
        id: 1, domain_key: 'resources_commodities', display_name: 'Resources and commodities',
        coverage_question: 'What licensed evidence supports resource reserves, discoveries, production, imports, exports and substitution risk?',
        minimum_independent_sources: 3, maximum_source_age_hours: 8760,
        primary_source_required: true, human_review_required: true,
        provider_connected: false, automatic_fill_enabled: false,
        country_count: 195, missing_country_count: 195,
      }]) }); return
    }
    if (path === '/rest/v1/global_country_coverage_gate_catalog') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
        id: 1, sequence_number: 1, gate_key: 'source_rights', display_name: 'Source rights',
        requirement_note: 'Approve the exact provider, endpoint, display, retention, derivation and model-use rights.',
        blocks_publication: true, blocks_model_use: true, automatic_approval_enabled: false,
      }]) }); return
    }
    if (path === '/rest/v1/global_dependency_transmission_status') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        control_key: 'global-dependency-transmission', policy_version: 'global-dependency-transmission-v1',
        sovereign_country_target: 195, dependency_domain_target: 8,
        reference_country_count: 195, dependency_domain_count: 8,
        readiness_cell_count: 1560, relationship_gap_count: 1560,
        verified_relationship_count: 0, mechanism_template_count: 6, review_gate_count: 8,
        explicit_relationship_gaps_required: true, directed_relationship_evidence_required: true,
        temporal_alignment_required: true, exposure_magnitude_required: true,
        substitute_path_review_required: true, human_release_review_required: true,
        live_provider_connectivity_enabled: false, automatic_relationship_inference_enabled: false,
        generated_dependency_fill_enabled: false, automatic_impact_scoring_enabled: false,
        production_scenario_promotion_enabled: false, model_training_enabled: false,
        autonomous_publication_enabled: false, autonomous_trade_execution_enabled: false,
      }) }); return
    }
    if (path === '/rest/v1/global_dependency_domain_catalog') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
        id: 1, sequence_number: 1, domain_key: 'bilateral_trade', display_name: 'Bilateral trade',
        relationship_question: 'Which directed product and service flows connect two economies, in what units, period and reporting scope?',
        transmission_mechanism: 'trade', required_evidence_classes: ['official_trade', 'classification_mapping'],
        minimum_independent_sources: 2, maximum_source_age_hours: 1488,
        directional_evidence_required: true, magnitude_evidence_required: true,
        substitution_review_required: true, provider_connected: false,
        automatic_inference_enabled: false, country_count: 195, missing_country_count: 195,
      }]) }); return
    }
    if (path === '/rest/v1/global_country_dependency_readiness_catalog') {
      const domains = ['bilateral_trade', 'commodity_supply', 'energy_flows', 'logistics_routes',
        'currency_funding', 'monetary_policy', 'corporate_supply_chain', 'climate_regulatory']
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 1, country_code: 'IN', country_name: 'India', region_group: 'Asia', dependency_domain_count: 8, missing_domain_count: 8, missing_domain_keys: domains, verified_relationship_count: 0, upstream_link_count: 0, downstream_link_count: 0, scenario_eligible: false, model_eligible: false, publication_eligible: false },
        { id: 2, country_code: 'GB', country_name: 'United Kingdom', region_group: 'Europe', dependency_domain_count: 8, missing_domain_count: 8, missing_domain_keys: domains, verified_relationship_count: 0, upstream_link_count: 0, downstream_link_count: 0, scenario_eligible: false, model_eligible: false, publication_eligible: false },
        { id: 3, country_code: 'US', country_name: 'United States', region_group: 'Americas', dependency_domain_count: 8, missing_domain_count: 8, missing_domain_keys: domains, verified_relationship_count: 0, upstream_link_count: 0, downstream_link_count: 0, scenario_eligible: false, model_eligible: false, publication_eligible: false },
      ]) }); return
    }
    if (path === '/rest/v1/global_transmission_mechanism_catalog') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
        id: 1, sequence_number: 1, template_key: 'supply_expansion', display_name: 'Supply expansion',
        origin_state: 'Verified change in available supply',
        intermediary_state: 'Reconciled production, inventory, substitution and time-to-market path',
        downstream_state: 'Conditional availability, trade-balance and price-pressure scenarios',
        explanation: 'A discovery or production change becomes analyzable only after commercial timing, quality, substitution and cross-border flow evidence are verified.',
        template_status: 'template_only', probability: null, confidence_score: null,
        estimated_effect_low_pct: null, estimated_effect_high_pct: null,
        evidence_required: true, human_review_required: true,
        automatic_scenario_generation_enabled: false, model_eligible: false,
        publication_eligible: false, production_effect: false,
      }]) }); return
    }
    if (path === '/rest/v1/global_dependency_release_gate_catalog') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
        id: 1, sequence_number: 1, gate_key: 'source_rights', display_name: 'Source rights',
        requirement_note: 'Approve the exact source, endpoint, field, display, retention, derivation and model-use rights.',
        blocks_scenario_use: true, blocks_model_use: true, blocks_publication: true,
        automatic_approval_enabled: false,
      }]) }); return
    }
    if (path === '/rest/v1/global_provider_certification_status') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        control_key: 'global-provider-certification-isolated-intake',
        policy_version: 'global-provider-certification-isolated-intake-v1',
        source_family_count: 8, unselected_provider_count: 8, certified_provider_count: 0,
        certification_gate_count: 10, isolation_profile_count: 8,
        unprovisioned_isolation_count: 8, failure_drill_count: 6, observed_drill_count: 0,
      }) }); return
    }
    if (path === '/rest/v1/global_provider_certification_catalog') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
        id: 1, sequence_number: 1, source_family_key: 'official_statistics',
        source_family_name: 'Official statistics', source_class: 'authoritative',
        certification_status: 'provider_unselected', rights_review_status: 'not_started',
        privacy_security_review_status: 'not_started', schema_review_status: 'not_started',
        provenance_review_status: 'not_started', resilience_review_status: 'not_started',
        accountable_owner_assigned: false, certification_approved: false,
        isolated_intake_approved: false, production_effect: false,
        gap_reason: 'No provider has been selected; contractual, security, schema, provenance and resilience reviews have not started.',
      }]) }); return
    }
    if (path === '/rest/v1/global_provider_certification_gate_catalog') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
        id: 1, sequence_number: 1, gate_key: 'legal_identity_ownership',
        display_name: 'Legal identity and source ownership',
        certification_requirement: 'Verify the contracting entity, publisher authority and accountable source ownership.',
        evidence_class: 'legal', blocks_endpoint_test: true,
        blocks_candidate_intake: true, blocks_release: true, automatic_approval_enabled: false,
      }]) }); return
    }
    if (path === '/rest/v1/global_isolated_intake_catalog') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
        id: 1, sequence_number: 1, source_family_key: 'official_statistics',
        environment_status: 'not_provisioned', network_egress_enabled: false,
        credential_access_enabled: false, payload_storage_enabled: false,
        candidate_write_enabled: false, maximum_candidate_rows: 0,
        destructive_test_data_only: true, quarantine_release_enabled: false,
        downstream_read_enabled: false, publication_eligible: false,
        model_eligible: false, production_effect: false,
      }]) }); return
    }
    if (path === '/rest/v1/global_provider_failure_drill_catalog') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
        id: 1, sequence_number: 1, drill_key: 'credential_exposure',
        display_name: 'Credential exposure',
        drill_requirement: 'Rehearse immediate secret revocation, access-log review and evidence-preserving recovery.',
        expected_safe_state: 'No credential remains usable and no candidate observation is admitted.',
        observed_drill_count: 0, automatic_pass_enabled: false,
        manual_evidence_required: true, blocks_certification: true,
      }]) }); return
    }
    if (path === '/rest/v1/global_provider_contract_test_status') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        control_key: 'global-provider-contract-test-lab',
        policy_version: 'global-provider-contract-test-lab-v1',
        contract_suite_count: 8, specification_only_suite_count: 8,
        executed_test_count: 0, passed_test_count: 0, assertion_count: 10,
        synthetic_fixture_count: 24, fixture_execution_count: 0,
      }) }); return
    }
    if (path === '/rest/v1/global_provider_contract_suite_catalog') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
        id: 1, sequence_number: 1, source_family_key: 'official_statistics',
        source_family_name: 'Official statistics', source_class: 'authoritative',
        suite_status: 'specification_only', schema_contract_version: 'provider-neutral-v1',
        executed_test_count: 0, passed_test_count: 0, conformance_approved: false,
        candidate_write_enabled: false, release_enabled: false, production_effect: false,
      }]) }); return
    }
    if (path === '/rest/v1/global_provider_contract_assertion_catalog') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
        id: 1, sequence_number: 1, assertion_key: 'source_identity',
        display_name: 'Source identity',
        assertion_requirement: 'Require a stable source-family identity without naming or connecting an external provider.',
        failure_disposition: 'reject', blocks_external_execution: true,
        blocks_candidate_write: true, blocks_release: true, automatic_pass_enabled: false,
      }]) }); return
    }
    if (path === '/rest/v1/global_provider_synthetic_fixture_catalog') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
        id: 1, sequence_number: 1, source_family_key: 'official_statistics',
        suite_sequence_number: 1, fixture_key: 'official_statistics-valid_minimal',
        fixture_class: 'valid_minimal',
        specification: 'Specify the smallest provider-neutral shape satisfying canonical identity, version, field, unit, time and lineage requirements.',
        expected_disposition: 'accept_to_ephemeral_test', provider_neutral: true,
        contains_external_data: false, contains_real_world_observation: false,
        execution_count: 0, candidate_write_enabled: false,
        release_enabled: false, production_effect: false,
      }]) }); return
    }
    if (path === '/rest/v1/global_provider_candidate_review_status') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        control_key: 'global-provider-candidate-evidence-review',
        policy_version: 'global-provider-candidate-evidence-review-v1',
        review_packet_count: 8, unopened_review_packet_count: 8,
        selected_candidate_count: 0, evidence_requirement_count: 12,
        review_matrix_count: 96, missing_evidence_count: 96,
        approved_evidence_count: 0,
      }) }); return
    }
    if (path === '/rest/v1/global_provider_candidate_review_catalog') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
        id: 1, sequence_number: 1, source_family_key: 'official_statistics',
        source_family_name: 'Official statistics', source_class: 'authoritative',
        contract_suite_sequence_number: 1, review_status: 'not_opened',
        conformance_state: 'blocked', submitted_requirement_count: 0,
        approved_requirement_count: 0, executed_fixture_count: 0,
        passed_fixture_count: 0, accountable_activation_approved: false,
        candidate_write_enabled: false, release_enabled: false, production_effect: false,
      }]) }); return
    }
    if (path === '/rest/v1/global_provider_candidate_evidence_catalog') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
        id: 1, sequence_number: 1, requirement_key: 'legal_identity_owner',
        review_domain: 'legal', display_name: 'Legal identity and owner',
        evidence_requirement: 'Require the named contracting entity, accountable internal owner and review authority before a provider candidate can be opened.',
        blocks_endpoint_execution: true, blocks_candidate_write: true,
        blocks_release: true, automatic_pass_enabled: false,
      }]) }); return
    }
    if (path === '/rest/v1/global_provider_candidate_review_matrix_catalog') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
        id: 1, source_family_key: 'official_statistics',
        requirement_key: 'legal_identity_owner', requirement_sequence_number: 1,
        evidence_status: 'not_submitted', human_approved: false,
        endpoint_execution_effect: false, candidate_write_effect: false,
        release_effect: false, production_effect: false,
      }]) }); return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': '0-0/0' },
      body: '[]',
    })
  })
}

test.beforeEach(async ({ page }) => {
  await mockGuestBackend(page)
  await page.goto('/')
  const welcome = page.getByRole('dialog', { name: 'Learn before you invest' })
  if (await welcome.isVisible()) {
    await welcome.getByRole('button', { name: 'Explore on my own' }).click()
  }
  await expect(
    page.getByRole('heading', { level: 1, name: 'One platform. Focused workspaces.' }),
  ).toBeVisible()
})

test('core landmarks pass automated WCAG A and AA checks', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'mobile-chromium') {
    const toggle = page.getByRole('button', { name: 'Open product navigation' })
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-controls', 'mobile-product-navigation')
    await expect(page.locator('#mobile-product-navigation')).toBeAttached()
  } else {
    await expect(page.getByRole('navigation', { name: 'Product navigation' })).toBeVisible()
  }
  await expect(page.getByRole('main')).toHaveAttribute('id', 'main-content')

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  expect(results.violations).toEqual([])
})

test('first-run guide traps focus and restores it when closed', async ({ page }) => {
  await page.evaluate(() => localStorage.removeItem('tradepulse-product-tour-v3'))
  await page.reload()

  const dialog = page.getByRole('dialog', { name: 'Learn before you invest' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toBeFocused()

  const results = await new AxeBuilder({ page })
    .include('.tour-welcome')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])

  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Explore on my own' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: 'Guide' })).toBeFocused()
})

test('desktop grouped navigation is keyboard operable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop-only navigation contract')

  const navigation = page.getByRole('navigation', { name: 'Product navigation' })
  const research = navigation.locator('details').filter({ hasText: 'Research' })
  const summary = research.locator('summary')
  await summary.press('Enter')
  await expect(research).toHaveJSProperty('open', true)
  await expect(navigation.getByRole('link', { name: 'Stock research' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(research).toHaveJSProperty('open', false)
})

test('mobile menu keeps every destination reachable without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile-only navigation contract')

  const toggle = page.getByRole('button', { name: 'Open product navigation' })
  await toggle.click()
  const navigation = page.getByRole('navigation', { name: 'Mobile product navigation' })
  await expect(navigation).toBeVisible()
  await expect(navigation.getByRole('link')).toHaveCount(41)

  await navigation.getByRole('link', { name: 'System status' }).click()
  await expect(page).toHaveURL(/#system-status$/)
  await expect(navigation).toBeHidden()
  await expect(page.getByRole('heading', { level: 1, name: 'Production reliability' })).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
})

test('guest brokerage, paper and payment execution boundaries stay closed', async ({ page }) => {
  await page.goto('/#beta-operations')
  await expect(page.getByRole('heading', { level: 1, name: 'Beta launch center' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Approved beta access required' })).toBeVisible()
  await expect(page.getByText(/never approves or creates users/)).toBeVisible()

  await page.goto('/#approved-pilot')
  await expect(page.getByRole('heading', { level: 1, name: 'Private pilot workspace' })).toBeVisible()
  await expect(page.getByText(/cannot approve, enroll or create a tester/)).toBeVisible()
  await expect(page.getByText('No execution or money movement')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Accept and begin pilot' })).toHaveCount(0)

  await page.goto('/#paper-investing')
  await expect(page.getByText('Sign in to create a private paper portfolio')).toBeVisible()
  await expect(page.getByText(/Approved beta testers receive/)).toBeVisible()

  await page.goto('/#international-paper')
  await expect(page.getByRole('heading', { level: 1, name: 'International paper trading lab' })).toBeVisible()
  await expect(page.getByText('No broker or real-money path exists')).toBeVisible()
  await expect(page.getByText('Private simulation account required')).toBeVisible()
  await expect(page.getByRole('button', { name: /convert|simulate|reconcile|create simulation/i })).toHaveCount(0)

  await page.goto('/#options-paper')
  await expect(page.getByRole('heading', { level: 1, name: 'Defined-risk options paper lab' })).toBeVisible()
  await expect(page.getByText('Options permission is never granted here')).toBeVisible()
  await expect(page.getByText('Private options simulation account required')).toBeVisible()
  await expect(page.getByRole('button', { name: /save defined-risk|record lifecycle|reconcile options|create education/i })).toHaveCount(0)

  await page.goto('/#brokerage-custody')
  await expect(page.getByRole('heading', { level: 1, name: 'Brokerage and custody control plane' })).toBeVisible()
  await expect(page.getByText('Production credentials cannot activate a market')).toBeVisible()
  await expect(page.getByText(/A payment quote cannot become brokerage cash/)).toBeVisible()
  await expect(page.getByText('Your onboarding and preview rehearsals are private')).toBeVisible()
  await expect(page.getByRole('button', { name: /create review|record evidence|generate blocked|rehearse reconciliation|activate|route|fund|execute/i })).toHaveCount(0)

  await page.goto('/#agentic-ai')
  await expect(page.getByRole('heading', { level: 1, name: 'TradePulse Agent workspace' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'TradePulse Agent' })).toBeVisible()
  await expect(page.getByText('Account required')).toBeVisible()
  await expect(page.getByText(/conversations, report designs and preferences are private/)).toBeVisible()
  await expect(page.getByRole('button', { name: /run grounded agents|save preferences|save reusable report/i })).toHaveCount(0)

  await page.goto('/#global-events')
  await expect(page.getByRole('heading', { level: 1, name: 'Global event impact engine' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Event impact command center' })).toBeVisible()
  await expect(page.getByText(/current event set is synthetic and cannot train a model/i)).toBeVisible()
  await expect(page.getByText('Rumor promotion off')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save private in-app alert' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Sign in to account' })).toBeVisible()

  await page.goto('/#evidence-operations')
  await expect(page.getByRole('heading', { level: 1, name: 'Evidence operations' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Global evidence control room' })).toBeVisible()
  await expect(page.getByText('No external source is connected in Phase 8H')).toBeVisible()
  await expect(page.getByText(/workflow fixture, not a real-world claim/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /publish|verify|ingest|train|execute|trade/i })).toHaveCount(0)

  await page.goto('/#country-coverage')
  await expect(page.getByRole('heading', { level: 1, name: 'Global country coverage fabric' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Global country coverage fabric' })).toBeVisible()
  await expect(page.getByText('No country fact is generated or inferred in Phase 8I')).toBeVisible()
  await expect(page.getByText('1,560', { exact: true })).toBeVisible()
  await expect(page.getByText(/reference checklist, not real-world coverage/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /publish|generate|infer|score|train|execute|trade/i })).toHaveCount(0)

  await page.goto('/#dependency-intelligence')
  await expect(page.getByRole('heading', { level: 1, name: 'Global dependency and transmission fabric' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Global dependency and transmission fabric' })).toBeVisible()
  await expect(page.getByText('No dependency relationship is inferred in Phase 8J')).toBeVisible()
  await expect(page.getByText('1,560', { exact: true })).toBeVisible()
  await expect(page.getByText('Evidence-empty templates, not market predictions')).toBeVisible()
  await expect(page.getByRole('button', { name: /publish|infer|score|train|execute|trade/i })).toHaveCount(0)

  await page.goto('/#observation-intake')
  await expect(page.getByRole('heading', { level: 1, name: 'Observation intake and quarantine' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Global observation provenance and quarantine fabric' })).toBeVisible()
  await expect(page.getByText('No provider or observation is connected in Phase 8K')).toBeVisible()
  await expect(page.getByText('Nine canonical normalization contracts')).toBeVisible()
  await expect(page.getByRole('button', { name: /ingest|normalize|release|publish|train|execute|trade/i })).toHaveCount(0)

  await page.goto('/#provider-certification')
  await expect(page.getByRole('heading', { level: 1, name: 'Provider certification and isolation' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Provider certification and isolated intake readiness' })).toBeVisible()
  await expect(page.getByText('No provider is selected or connected in Phase 8L')).toBeVisible()
  await expect(page.getByText('Ten gates before an endpoint test')).toBeVisible()
  await expect(page.getByRole('button', { name: /connect|test endpoint|provision|ingest|release|publish|train|execute|trade/i })).toHaveCount(0)

  await page.goto('/#provider-contract-tests')
  await expect(page.getByRole('heading', { level: 1, name: 'Provider contract test laboratory' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Provider-neutral contract test readiness' })).toBeVisible()
  await expect(page.getByText('No provider payload is tested in Phase 8M')).toBeVisible()
  await expect(page.getByText('Ten fail-closed conformance assertions')).toBeVisible()
  await expect(page.getByText(/Synthetic fixtures are specifications, not observations/)).toBeVisible()
  await expect(page.getByRole('button', { name: /connect|run test|ingest|release|publish|train|execute|trade/i })).toHaveCount(0)

  await page.goto('/#provider-candidate-review')
  await expect(page.getByRole('heading', { level: 1, name: 'Provider candidate evidence review' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Provider candidate evidence review' })).toBeVisible()
  await expect(page.getByText('No provider candidate is selected in Phase 8N')).toBeVisible()
  await expect(page.getByText('Twelve evidence gates before conformance testing')).toBeVisible()
  await expect(page.getByText(/Phase 8N is an evidence checklist, not a provider onboarding or activation/)).toBeVisible()
  await expect(page.getByRole('button', { name: /open review|submit|approve|connect|run test|ingest|release|publish|train|execute|trade/i })).toHaveCount(0)

  await page.goto('/#live-rollout')
  await expect(page.getByRole('heading', { level: 1, name: 'Controlled live rollout' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Live rollout control plane' })).toBeVisible()
  await expect(page.getByText('No live order endpoint exists in Phase 8G')).toBeVisible()
  await expect(page.getByText(/Approval for one row never propagates/)).toBeVisible()
  await expect(page.getByText('Exit gate remains closed')).toBeVisible()
  await expect(page.getByRole('button', { name: /activate|submit|route|fund|execute|approve/i })).toHaveCount(0)

  await page.goto('/#account-security')
  await expect(page.getByText(/Controlled-beta access is limited to approved email addresses/)).toBeVisible()

  await page.goto('/#brokerage-readiness')
  await expect(
    page.getByText('Sign in through Paper Investing to view disclosures and create a non-executable preview.'),
  ).toBeVisible()

  await page.goto('/#regulated-preflight')
  await expect(page.getByRole('heading', { level: 1, name: 'Preflight evidence review' })).toBeVisible()
  await expect(page.getByText('Your preflight evidence is private.')).toBeVisible()
  await expect(page.getByText(/Every saved review is database-constrained to blocked/)).toBeVisible()
  await expect(page.getByRole('button', { name: /submit order|place order|execute/i })).toHaveCount(0)

  await page.goto('/#sandbox-orders')
  await expect(page.getByRole('heading', { level: 1, name: 'Sandbox order lifecycle' })).toBeVisible()
  await expect(page.getByText('Your sandbox receipts are private.')).toBeVisible()
  await expect(page.getByText(/browser has no order endpoint/)).toBeVisible()
  await expect(page.getByRole('button', { name: /submit|cancel|replace|place|execute/i })).toHaveCount(0)

  await page.goto('/#live-readiness')
  await expect(page.getByRole('heading', { level: 1, name: 'Live trading readiness' })).toBeVisible()
  await expect(page.getByText('Even complete evidence cannot activate trading.')).toBeVisible()
  await expect(page.getByText(/No live order endpoint exists in this phase/)).toBeVisible()
  await expect(page.getByRole('button', { name: /activate|submit|route|fund|execute/i })).toHaveCount(0)

  await page.goto('/#payments')
  await expect(page.getByRole('heading', { level: 1, name: 'Money movement readiness' })).toBeVisible()
  await expect(page.getByText('Production money movement is blocked—even when every approval is current.')).toBeVisible()
  await expect(page.getByRole('button', { name: /select|accept|transfer|pay|execute|submit|clear|approve/i })).toHaveCount(0)
})

test('global venue intelligence preserves listing identity and fails closed by residency', async ({ page }) => {
  const base = {
    venue_availability: 'reference_only',
    calendar_status: 'review_required',
    holiday_calendar_status: 'review_required',
    settlement_convention: 'source_review_required',
    primary_listing: true,
    listing_status: 'reference_only',
    identifier_status: 'review_required',
    provider_mapping_status: 'review_required',
    corporate_action_status: 'review_required',
    fractional_reference_status: 'review_required',
    residency_country: 'IN',
    customer_type: 'individual',
    investor_type: 'retail',
    disclosure_status: 'not_assessed',
    legal_review_status: 'review_required',
    reference_display_status: 'reference_only',
    price_display_status: 'unavailable',
    corporate_action_display_status: 'unavailable',
    reference_license_status: 'review_required',
    reference_as_of: '2026-09-08',
    policy_version: 'global-venue-instrument-intelligence-v1',
    live_market_data_connectivity_enabled: false,
    customer_entitlement_assignment_enabled: false,
    automatic_jurisdiction_approval_enabled: false,
    order_preview_enabled: false,
    order_routing_enabled: false,
    broker_connectivity_enabled: false,
    customer_funding_enabled: false,
    custody_enabled: false,
    settlement_enabled: false,
  }
  const records = [
    {
      ...base,
      venue_id: 1,
      mic_code: 'XNSE',
      venue_name: 'National Stock Exchange of India',
      venue_country_code: 'IN',
      timezone: 'Asia/Kolkata',
      primary_currency: 'INR',
      listing_id: 1,
      listing_key: 'XNSE:RELIANCE',
      canonical_instrument_key: 'IN:RELIANCE',
      display_symbol: 'RELIANCE',
      instrument_name: 'Reliance Industries equity reference',
      instrument_type: 'equity',
      quote_currency: 'INR',
      access_status: 'research_only',
      reason_code: 'DOMESTIC_REFERENCE_ONLY_NOT_ELIGIBILITY',
    },
    {
      ...base,
      venue_id: 2,
      mic_code: 'XNAS',
      venue_name: 'The Nasdaq Stock Market',
      venue_country_code: 'US',
      timezone: 'America/New_York',
      primary_currency: 'USD',
      listing_id: 2,
      listing_key: 'XNAS:QQQ',
      canonical_instrument_key: 'US:QQQ',
      display_symbol: 'QQQ',
      instrument_name: 'Nasdaq-100 ETF reference',
      instrument_type: 'etf',
      quote_currency: 'USD',
      access_status: 'review_required',
      reason_code: 'CROSS_BORDER_LEGAL_REVIEW_REQUIRED',
    },
  ]
  await page.route('http://127.0.0.1:54321/rest/v1/global_venue_instrument_reference**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'content-range': '0-1/2' },
    body: JSON.stringify(records),
  }))

  await page.goto('/#global-access')
  await expect(page.getByRole('heading', { level: 1, name: 'Venue and instrument access map' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Venue and instrument intelligence' })).toBeVisible()
  await expect(page.getByText('Global execution remains unavailable')).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'National Stock Exchange of India' })).toBeVisible()
  await expect(page.getByText(/^XNSE:RELIANCE ·/)).toBeVisible()
  await expect(page.getByText('Research only', { exact: true })).toBeVisible()
  await expect(page.getByText(/Reason: Cross border legal review required/)).toBeVisible()
  await page.getByLabel('Instrument class').selectOption('etf')
  await expect(page.getByText(/^XNAS:QQQ ·/)).toBeVisible()
  await expect(page.getByText(/^XNSE:RELIANCE ·/)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /preview|route|trade|buy|sell|fund|execute|submit/i })).toHaveCount(0)
})

test('international paper lab exposes deterministic venue scenarios without guest execution', async ({ page }) => {
  const base = {
    instrument_type: 'equity', venue_name: 'Scenario venue', venue_country_code: 'US',
    session_state: 'open_scenario', tick_size: 0.01, lot_size: 1,
    fractional_simulation_enabled: false, partial_fill_simulation_enabled: true,
    settlement_days: 1, available_quantity: 250, quote_status: 'available_scenario',
    quote_observed_at: '2026-09-09T12:00:00Z', commission_bps: 5,
    exchange_fee_bps: 1, tax_assumption_bps: 2, cost_status: 'modeled_scenario',
    rule_version: 'phase-8b-v1', quote_version: 'phase-8b-v1',
  }
  await page.route('**/rest/v1/international_paper_market_catalog*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      { ...base, listing_id: 1, listing_key: 'XNSE:RELIANCE', display_symbol: 'RELIANCE', instrument_name: 'Reliance Industries scenario', quote_currency: 'INR', mic_code: 'XNSE', venue_country_code: 'IN', settlement_days: 2, scenario_price: 2915.25 },
      { ...base, listing_id: 2, listing_key: 'XNAS:QQQ', display_symbol: 'QQQ', instrument_name: 'Nasdaq-100 ETF scenario', instrument_type: 'etf', quote_currency: 'USD', mic_code: 'XNAS', scenario_price: 487.5 },
    ]),
  }))

  await page.goto('/#international-paper')
  await expect(page.getByRole('heading', { level: 1, name: 'International paper trading lab' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'International multi-asset paper trading' })).toBeVisible()
  await expect(page.getByText('No broker or real-money path exists')).toBeVisible()
  await expect(page.getByText('XNSE · INR')).toBeVisible()
  await expect(page.getByText('XNAS · USD')).toBeVisible()
  await expect(page.getByText('Private simulation account required')).toBeVisible()
  await expect(page.getByRole('button', { name: /convert|simulate venue order|reconcile|create simulation/i })).toHaveCount(0)
})

test('options paper lab explains bounded risk without granting guest options permission', async ({ page }) => {
  const base = {
    underlying_listing_id: 1, underlying_listing_key: 'XNAS:AAPL', underlying_symbol: 'AAPL',
    underlying_name: 'Apple common equity reference', underlying_scenario_price: 250,
    quote_currency: 'USD', mic_code: 'XNAS', expires_on: '2030-12-20', contract_multiplier: 100,
    volume: 1000, open_interest: 8000, implied_volatility: 0.28,
    gamma: 0.018, theta: -0.07, vega: 0.21,
    quote_observed_at: '2026-09-09T00:00:00Z', freshness_status: 'scenario_current',
    corporate_action_adjusted: false, scenario_version: 'options-chain-v1',
  }
  await page.route('**/rest/v1/options_paper_chain_catalog*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      { ...base, contract_id: 1, contract_symbol: 'AAPL301220C00240000', option_type: 'call', strike: 240, bid: 13, ask: 14, delta: 0.68 },
      { ...base, contract_id: 2, contract_symbol: 'AAPL301220C00260000', option_type: 'call', strike: 260, bid: 7, ask: 8, delta: 0.43 },
      { ...base, contract_id: 3, contract_symbol: 'AAPL301220P00240000', option_type: 'put', strike: 240, bid: 6, ask: 7, delta: -0.32 },
      { ...base, contract_id: 4, contract_symbol: 'AAPL301220P00260000', option_type: 'put', strike: 260, bid: 12, ask: 13, delta: -0.57 },
    ]),
  }))

  await page.goto('/#options-paper')
  await expect(page.getByRole('heading', { level: 2, name: 'Defined-risk options paper lab' })).toBeVisible()
  await expect(page.getByText('Options permission is never granted here')).toBeVisible()
  await expect(page.getByText('Educational strategy builder')).toBeVisible()
  await expect(page.getByText('$700.00')).toBeVisible()
  await expect(page.getByText('$1,300.00')).toBeVisible()
  await expect(page.getByRole('img', { name: /Estimated profit and loss payoff/ })).toBeVisible()
  await expect(page.getByText('Educational display permitted · no live display rights')).toBeVisible()
  await expect(page.getByText('Private options simulation account required')).toBeVisible()
  await expect(page.getByRole('button', { name: /save defined-risk|record lifecycle|reconcile options|create education/i })).toHaveCount(0)
})

test('payment safety maps money-movement readiness, sandbox lifecycle, compliance, beneficiary intervention and corridor transparency', async ({ page }) => {
  const routeBase = {
    corridor_id: 1,
    corridor_code: 'USD-INR',
    source_currency: 'USD',
    destination_currency: 'INR',
    fx_symbol: 'USDINR',
    rate_operation: 'direct',
    provider_rate_mode: 'sandbox_model',
    tax_status: 'unavailable',
    estimated_tax_bps: null,
    tax_explanation: 'Tax depends on customer and corridor facts and is not available in this reference-only phase.',
    availability: 'reference_only',
    availability_reason: 'Licensed provider production connectivity and route approval are not configured.',
    max_reference_age_minutes: 60,
    provider_connectivity_enabled: false,
    beneficiary_collection_enabled: false,
    quote_acceptance_enabled: false,
    automatic_route_selection_enabled: false,
    transfer_creation_enabled: false,
    payment_execution_enabled: false,
    money_movement_enabled: false,
    custody_enabled: false,
    settlement_enabled: false,
  }
  await page.route('**/rest/v1/payment_corridor_intelligence*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      { ...routeBase, id: 1, route_code: 'USD-INR-ECONOMY', provider_label: 'Economy sandbox provider model', delivery_tier: 'economy', provider_spread_bps: 25, variable_fee_bps: 30, fixed_fee: 0.35, minimum_fee: 0.75, eta_min_minutes: 60, eta_max_minutes: 90 },
      { ...routeBase, id: 2, route_code: 'USD-INR-PRIORITY', provider_label: 'Priority sandbox provider model', delivery_tier: 'priority', provider_spread_bps: 40, variable_fee_bps: 20, fixed_fee: 0.75, minimum_fee: 1.25, eta_min_minutes: 15, eta_max_minutes: 45 },
    ]),
  }))
  await page.route('**/rest/v1/market_assets*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ id: 1, symbol: 'USDINR', name: 'US Dollar / Indian Rupee', asset_type: 'forex', currency: 'INR', market_observations: [{ observed_at: new Date().toISOString(), price: 83.25, change_percent: 0.1, source: 'test-reference' }] }]),
  }))
  const protectionBase = {
    description: 'Synthetic protection rule used by the browser contract.',
    severity: 'critical',
    outcome: 'blocked',
    cooling_off_hours: 0,
    required_action: 'Stop and independently verify the recipient using a trusted channel.',
    data_mode: 'synthetic_rehearsal',
    real_beneficiary_collection_enabled: false,
    beneficiary_identifier_storage_enabled: false,
    validation_provider_connectivity_enabled: false,
    beneficiary_creation_enabled: false,
    duplicate_override_enabled: false,
    cooling_off_bypass_enabled: false,
    quote_acceptance_enabled: false,
    transfer_creation_enabled: false,
    payment_execution_enabled: false,
    money_movement_enabled: false,
  }
  await page.route('**/rest/v1/payment_beneficiary_protection_reference*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      { ...protectionBase, id: 1, rule_code: 'RECENT_DETAILS_CHANGE', category: 'cooling_off', signal_key: 'recent_details_change', title: 'Recently changed payment details', severity: 'high', outcome: 'cooling_off', cooling_off_hours: 24, customer_message: 'Recently changed details trigger a 24-hour protection pause.', priority: 40 },
      { ...protectionBase, id: 2, rule_code: 'UNVERIFIED_CHANNEL_CHANGE', category: 'scam', signal_key: 'unverified_channel_change', title: 'Unverified channel change', customer_message: 'Unverified channel changes are a common invoice-redirection warning.', priority: 50 },
    ]),
  }))
  const complianceBase = {
    corridor_id: 1,
    corridor_code: 'USD-INR',
    source_currency: 'USD',
    destination_currency: 'INR',
    customer_type: 'both',
    description: 'Synthetic compliance requirement used by the browser contract.',
    evidence_required: 'Synthetic evidence only; no customer or provider data is processed.',
    customer_action: 'Review this illustrative requirement without entering identity or payment data.',
    review_owner: 'financial_crime_operations',
    outcome: 'review_required',
    data_mode: 'synthetic_case_rehearsal',
    real_identity_collection_enabled: false,
    document_upload_enabled: false,
    pii_storage_enabled: false,
    compliance_provider_connectivity_enabled: false,
    live_sanctions_screening_enabled: false,
    transaction_monitoring_connectivity_enabled: false,
    travel_rule_transmission_enabled: false,
    compliance_case_writes_enabled: false,
    automated_clearance_enabled: false,
    manual_override_enabled: false,
    quote_acceptance_enabled: false,
    transfer_creation_enabled: false,
    payment_execution_enabled: false,
    money_movement_enabled: false,
  }
  await page.route('**/rest/v1/payment_compliance_orchestration_reference*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      { ...complianceBase, id: 1, workflow_code: 'USD-INR-KYC', customer_type: 'individual', stage_key: 'kyc', title: 'Individual identity and residency', review_owner: 'identity_operations', priority: 10 },
      { ...complianceBase, id: 7, workflow_code: 'USD-INR-KYB', customer_type: 'business', stage_key: 'kyb', title: 'Business identity and controllers', review_owner: 'identity_operations', priority: 10 },
      { ...complianceBase, id: 2, workflow_code: 'USD-INR-AML', stage_key: 'aml', title: 'AML risk assessment', priority: 20 },
      { ...complianceBase, id: 3, workflow_code: 'USD-INR-SANCTIONS', stage_key: 'sanctions', title: 'Sanctions and watchlist screening', review_owner: 'sanctions_operations', outcome: 'blocked', priority: 30 },
      { ...complianceBase, id: 4, workflow_code: 'USD-INR-TXMON', stage_key: 'transaction_monitoring', title: 'Transaction-monitoring controls', review_owner: 'transaction_monitoring_operations', priority: 40 },
      { ...complianceBase, id: 5, workflow_code: 'USD-INR-TRAVELRULE', stage_key: 'travel_rule', title: 'Travel-rule applicability', review_owner: 'travel_rule_operations', outcome: 'blocked', priority: 50 },
      { ...complianceBase, id: 6, workflow_code: 'USD-INR-AUDIT', stage_key: 'audit', title: 'Audit evidence and decision trace', review_owner: 'compliance_assurance', priority: 60 },
    ]),
  }))
  const transferStageBase = {
    corridor_id: 1,
    corridor_code: 'USD-INR',
    source_currency: 'USD',
    destination_currency: 'INR',
    description: 'Synthetic sandbox transfer stage used by the browser contract.',
    evidence_required: 'Synthetic lifecycle evidence only; no customer, provider or financial data is processed.',
    safe_response: 'Review the illustrative evidence and keep every operational write disabled.',
    responsible_owner: 'payment_operations',
    data_mode: 'synthetic_transfer_rehearsal',
    licensed_partner_sandbox_reference_enabled: true,
    double_entry_preview_enabled: true,
    real_customer_data_enabled: false,
    real_beneficiary_data_enabled: false,
    provider_sandbox_connectivity_enabled: false,
    browser_transfer_creation_enabled: false,
    service_transfer_creation_enabled: false,
    webhook_ingestion_enabled: false,
    financial_ledger_posting_enabled: false,
    retry_execution_enabled: false,
    reconciliation_write_enabled: false,
    rescue_operator_action_enabled: false,
    dispute_case_writes_enabled: false,
    refund_execution_enabled: false,
    production_provider_connectivity_enabled: false,
    quote_acceptance_enabled: false,
    payment_execution_enabled: false,
    money_movement_enabled: false,
    customer_funding_enabled: false,
    custody_enabled: false,
    settlement_enabled: false,
  }
  await page.route('**/rest/v1/payment_sandbox_transfer_lifecycle_reference*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      { ...transferStageBase, id: 1, stage_code: 'USD-INR-IDEMP', stage_key: 'idempotency', title: 'Idempotency and duplicate suppression', rehearsal_outcome: 'deduplicated', responsible_owner: 'platform_reliability', priority: 10 },
      { ...transferStageBase, id: 2, stage_code: 'USD-INR-SUBMIT', stage_key: 'sandbox_submission', title: 'Licensed-partner sandbox hand-off', rehearsal_outcome: 'acknowledged', priority: 20 },
      { ...transferStageBase, id: 3, stage_code: 'USD-INR-WEBHOOK', stage_key: 'webhook_verification', title: 'Signed webhook verification', rehearsal_outcome: 'signature_verified', responsible_owner: 'platform_reliability', priority: 30 },
      { ...transferStageBase, id: 4, stage_code: 'USD-INR-LEDGER', stage_key: 'double_entry_ledger', title: 'Currency-separated double-entry journals', rehearsal_outcome: 'balanced', responsible_owner: 'financial_control', priority: 40 },
      { ...transferStageBase, id: 5, stage_code: 'USD-INR-RETRY', stage_key: 'retry_policy', title: 'Bounded retry and ambiguity policy', rehearsal_outcome: 'bounded', responsible_owner: 'platform_reliability', priority: 50 },
      { ...transferStageBase, id: 6, stage_code: 'USD-INR-RECON', stage_key: 'reconciliation', title: 'Provider and ledger reconciliation', rehearsal_outcome: 'matched', responsible_owner: 'financial_control', priority: 60 },
      { ...transferStageBase, id: 7, stage_code: 'USD-INR-RESCUE', stage_key: 'rescue_mode', title: 'Rescue-mode hold and recovery', rehearsal_outcome: 'standby', priority: 70 },
      { ...transferStageBase, id: 8, stage_code: 'USD-INR-DISPUTE', stage_key: 'dispute', title: 'Dispute evidence and customer protection', rehearsal_outcome: 'review_ready', responsible_owner: 'customer_protection', priority: 80 },
      { ...transferStageBase, id: 9, stage_code: 'USD-INR-REFUND', stage_key: 'refund', title: 'Refund and balanced reversal plan', rehearsal_outcome: 'review_ready', responsible_owner: 'financial_control', priority: 90 },
    ]),
  }))
  const ledgerBase = {
    corridor_id: 1,
    corridor_code: 'USD-INR',
    source_currency: 'USD',
    destination_currency: 'INR',
    data_mode: 'synthetic_transfer_rehearsal',
    double_entry_preview_enabled: true,
    financial_ledger_posting_enabled: false,
    refund_execution_enabled: false,
    payment_execution_enabled: false,
    money_movement_enabled: false,
    narrative: 'Synthetic double-entry template used by the browser contract.',
  }
  await page.route('**/rest/v1/payment_sandbox_ledger_reference*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      { ...ledgerBase, id: 1, posting_code: 'USD-INR-SRC-DR', journal_key: 'source_funding', currency_role: 'source', account_code: 'sandbox_cash_control', entry_side: 'debit', amount_basis: 'source_amount', priority: 10 },
      { ...ledgerBase, id: 2, posting_code: 'USD-INR-SRC-CR', journal_key: 'source_funding', currency_role: 'source', account_code: 'sandbox_transfer_liability', entry_side: 'credit', amount_basis: 'source_amount', priority: 20 },
      { ...ledgerBase, id: 3, posting_code: 'USD-INR-DST-DR', journal_key: 'destination_obligation', currency_role: 'destination', account_code: 'sandbox_fx_bridge_control', entry_side: 'debit', amount_basis: 'destination_before_tax', priority: 10 },
      { ...ledgerBase, id: 4, posting_code: 'USD-INR-DST-CR', journal_key: 'destination_obligation', currency_role: 'destination', account_code: 'sandbox_payout_payable', entry_side: 'credit', amount_basis: 'destination_before_tax', priority: 20 },
    ]),
  }))
  const moneyMovementRequirementBase = {
    corridor_id: 1,
    corridor_code: 'USD-INR',
    source_currency: 'USD',
    destination_currency: 'INR',
    summary: 'Corridor-specific approval evidence is required before any production capability could be considered.',
    evidence_expected: 'Dated, independently reviewed and accountable approval evidence with a defined validity window.',
    activation_blocking: true,
    evidence_status: 'missing',
    reviewed_at: null,
    valid_until: null,
    approval_current: false,
    activation_status: 'blocked',
    manual_activation_review_required: true,
    production_partner_connectivity_enabled: false,
    safeguarding_account_activation_enabled: false,
    customer_funding_enabled: false,
    transfer_creation_enabled: false,
    financial_ledger_posting_enabled: false,
    payment_execution_enabled: false,
    money_movement_enabled: false,
    custody_enabled: false,
    settlement_enabled: false,
    automatic_activation_enabled: false,
  }
  const moneyMovementRequirements = [
    ['LEGAL', 'legal_authorization', 'legal', 'Corridor legal authorization', 'legal_compliance'],
    ['PARTNER', 'regulated_partner_agreement', 'partner', 'Regulated partner agreement', 'partner_management'],
    ['CERT', 'partner_production_certification', 'partner', 'Partner production certification', 'partner_management'],
    ['SAFEGUARD', 'safeguarding_account_structure', 'safeguarding', 'Safeguarding account structure', 'financial_control'],
    ['RECON', 'customer_funds_reconciliation', 'safeguarding', 'Customer-funds reconciliation', 'financial_control'],
    ['KYC', 'kyc_kyb_program', 'compliance', 'KYC and KYB operating approval', 'financial_crime_operations'],
    ['AML', 'aml_sanctions_monitoring', 'compliance', 'AML, sanctions and monitoring approval', 'financial_crime_operations'],
    ['SOF', 'source_of_funds_controls', 'compliance', 'Source-of-funds controls', 'financial_crime_operations'],
    ['SECURITY', 'security_privacy_review', 'security', 'Security and privacy approval', 'security_privacy'],
    ['TREASURY', 'treasury_liquidity_fx_controls', 'treasury', 'Treasury, liquidity and FX controls', 'treasury'],
    ['RESILIENCE', 'operational_resilience', 'operations', 'Operational resilience and recovery', 'payment_operations'],
    ['REDRESS', 'customer_protection_redress', 'customer_protection', 'Customer protection and redress', 'customer_protection'],
  ].map(([suffix, requirementKey, domain, title, responsibleOwner], index) => ({
    ...moneyMovementRequirementBase,
    id: index + 1,
    requirement_code: `USD-INR-${suffix}`,
    requirement_key: requirementKey,
    domain,
    title,
    responsible_owner: responsibleOwner,
    display_order: (index + 1) * 10,
  }))
  await page.route('**/rest/v1/payment_money_movement_readiness_reference*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(moneyMovementRequirements),
  }))

  await page.goto('/#payments')
  await expect(page.getByRole('heading', { level: 3, name: 'Production money movement remains blocked' })).toBeVisible()
  const moneyMovementSummary = page.locator('.money-movement-readiness-summary')
  await expect(moneyMovementSummary.getByText('0 of 12', { exact: true })).toBeVisible()
  await expect(moneyMovementSummary.getByText('8', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 4, name: 'Safeguarding account structure', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 4, name: 'Security and privacy approval', exact: true })).toBeVisible()
  await expect(page.getByText(/Approval evidence is informational and append-only/)).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Rehearse the transfer lifecycle without moving money' })).toBeVisible()
  await expect(page.getByText('Licensed-partner sandbox reference')).toBeVisible()
  const transferDecision = page.locator('.sandbox-transfer-decision')
  await expect(transferDecision.getByText('rescue review', { exact: true })).toBeVisible()
  await expect(page.getByText('9 of 9', { exact: true })).toBeVisible()
  await expect(page.getByText('2 of 2', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 4, name: 'Provider and ledger reconciliation', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 4, name: 'Rescue-mode hold and recovery', exact: true })).toBeVisible()
  await expect(page.locator('.sandbox-ledger-grid article')).toHaveCount(2)
  await expect(page.getByText('Balanced', { exact: true })).toHaveCount(2)
  await page.getByLabel('Synthetic lifecycle scenario').selectOption('duplicate_retry')
  await expect(transferDecision.getByText('duplicate suppressed', { exact: true })).toBeVisible()
  await expect(page.getByText(/No second transfer was created/)).toBeVisible()
  await page.getByLabel('Synthetic lifecycle scenario').selectOption('webhook_replay')
  await expect(transferDecision.getByText('webhook rejected', { exact: true })).toBeVisible()
  await expect(page.getByText(/Webhook replay rejected before state or ledger changes/)).toBeVisible()
  await page.getByLabel('Synthetic lifecycle scenario').selectOption('dispute_refund')
  await expect(transferDecision.getByText('refund review', { exact: true })).toBeVisible()
  await expect(page.getByText(/No case or refund was created/)).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Map compliance gates before any payment' })).toBeVisible()
  await expect(page.getByText('No documents, identities or live screening')).toBeVisible()
  await expect(page.getByText('Compliance activation blocked', { exact: true })).toBeVisible()
  await expect(page.getByText('6 of 6', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 4, name: 'Sanctions and watchlist screening', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 4, name: 'Travel-rule applicability', exact: true })).toBeVisible()
  await expect(page.getByText(/case writes, automated clearance and manual overrides are disabled/)).toBeVisible()
  await page.getByLabel('Synthetic customer journey').selectOption('business')
  await expect(page.getByRole('heading', { level: 4, name: 'Business identity and controllers', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 4, name: 'Individual identity and residency', exact: true })).toHaveCount(0)
  await expect(page.getByText('6 of 6', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'See the intervention before the payment' })).toBeVisible()
  await expect(page.getByText('No names, accounts or addresses')).toBeVisible()
  await expect(page.locator('.beneficiary-protection').getByText('Blocked', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 4, name: 'Recently changed payment details', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 4, name: 'Unverified channel change', exact: true })).toBeVisible()
  await expect(page.getByText(/Real beneficiary data is neither requested nor stored/)).toBeVisible()
  await expect(page.getByText('Tax unavailable—not shown as zero')).toBeVisible()
  await expect(page.locator('.corridor-route-card')).toHaveCount(2)
  await expect(page.getByText('Sandbox provider-model rate')).toHaveCount(2)
  await expect(page.getByText('Estimated delivered before unknown tax')).toHaveCount(2)
  await expect(page.getByRole('button', { name: /select|accept|transfer|pay|execute|submit|clear|approve/i })).toHaveCount(0)
})

test('hash navigation renders one focused product workspace at a time', async ({ page }) => {
  await page.goto('/#forecasts')
  await expect(page.getByRole('heading', { level: 1, name: 'Forecast governance dashboard' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Probabilistic market outlook' })).toBeVisible()
  await expect(page.locator('#stock-research')).toHaveCount(0)
  await expect(page.locator('#paper-investing')).toHaveCount(0)

  await page.goto('/#stock-research')
  await expect(page.getByRole('heading', { level: 1, name: 'Interactive stock intelligence' })).toBeVisible()
  await expect(page.locator('#stock-research')).toBeVisible()
  await expect(page.locator('#forecasts')).toHaveCount(0)
})

test('beta hardening supports accessible recovery review without regulated activation', async ({ page }) => {
  await page.goto('/#beta-hardening')
  await expect(page.getByRole('heading', { level: 1, name: 'Beta hardening center' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Customer-safe release closure' })).toBeVisible()
  const confirmations = page.getByRole('checkbox', { name: /Confirm .* drill reviewed/ })
  await expect(confirmations).toHaveCount(4)
  await confirmations.first().check()
  await expect(page.getByText('1 of 4 recovery drills reviewed')).toBeVisible()
  await expect(page.getByText('No execution or money movement')).toBeVisible()
  await expect(page.getByRole('button', { name: /deploy|activate|submit order|send payment/i })).toHaveCount(0)
})

test('shared product data loads only for the active workspace', async ({ page }) => {
  const sharedDataPaths: string[] = []
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname
    if (
      /\/rest\/v1\/(market_assets|market_observations|trade_observations|display_qualified_market_forecasts|equity_research_dashboard|global_venue_instrument_reference|international_paper_market_catalog|options_paper_chain_catalog)/.test(
        path,
      )
    ) {
      sharedDataPaths.push(path)
    }
  })

  await page.goto('/#beta-operations')
  await expect(page.getByRole('heading', { level: 1, name: 'Beta launch center' })).toBeVisible()
  await page.waitForTimeout(250)
  expect(sharedDataPaths).toEqual([])

  await page.goto('/#approved-pilot')
  await expect(page.getByRole('heading', { level: 1, name: 'Private pilot workspace' })).toBeVisible()
  await page.waitForTimeout(250)
  expect(sharedDataPaths).toEqual([])

  await page.goto('/#beta-hardening')
  await expect(page.getByRole('heading', { level: 1, name: 'Beta hardening center' })).toBeVisible()
  await page.waitForTimeout(250)
  expect(sharedDataPaths).toEqual([])

  await page.goto('/#international-paper')
  await expect(page.getByRole('heading', { level: 1, name: 'International paper trading lab' })).toBeVisible()
  await expect.poll(
    () => sharedDataPaths.some((path) => path.includes('/international_paper_market_catalog')),
  ).toBe(true)
  expect(sharedDataPaths.some((path) => path.includes('/market_assets'))).toBe(false)
  expect(sharedDataPaths.some((path) => path.includes('/global_venue_instrument_reference'))).toBe(false)

  await page.goto('/#options-paper')
  await expect(page.getByRole('heading', { level: 1, name: 'Defined-risk options paper lab' })).toBeVisible()
  await expect.poll(
    () => sharedDataPaths.some((path) => path.includes('/options_paper_chain_catalog')),
  ).toBe(true)
  expect(sharedDataPaths.some((path) => path.includes('/market_assets'))).toBe(false)
  expect(sharedDataPaths.some((path) => path.includes('/global_venue_instrument_reference'))).toBe(false)

  await page.goto('/#global-access')
  await expect(page.getByRole('heading', { level: 1, name: 'Venue and instrument access map' })).toBeVisible()
  await expect.poll(
    () => sharedDataPaths.some((path) => path.includes('/global_venue_instrument_reference')),
  ).toBe(true)
  expect(sharedDataPaths.some((path) => path.includes('/market_assets'))).toBe(false)
  expect(sharedDataPaths.some((path) => path.includes('/equity_research_dashboard'))).toBe(false)

  await page.goto('/#forecasts')
  await expect(page.getByRole('heading', { level: 1, name: 'Forecast governance dashboard' })).toBeVisible()
  await expect.poll(
    () => sharedDataPaths.some((path) => path.includes('/display_qualified_market_forecasts')),
  ).toBe(true)
  expect(sharedDataPaths.some((path) => path.includes('/market_assets'))).toBe(false)
  expect(sharedDataPaths.some((path) => path.includes('/trade_observations'))).toBe(false)
  expect(
    sharedDataPaths.some((path) => path.includes('/equity_research_dashboard')),
  ).toBe(false)
})

test('Trust Center verifies evidence, local activity and safety boundaries', async ({ page }) => {
  await page.goto('/#trust-center')
  await expect(page.getByRole('heading', { level: 1, name: 'Trust and activity center' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Evidence you can verify' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Forecast receipt' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Brokerage preview receipt' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Cross-border quote receipt' })).toBeVisible()
  await expect(page.locator('.trust-boundary').filter({ hasText: 'Live orders hard locked' })).toBeVisible()
  await expect(page.locator('.trust-boundary').filter({ hasText: 'No money movement' })).toBeVisible()
  await expect(page.getByRole('button', { name: /execute|place live|submit live|send money/i })).toHaveCount(0)

  const professional = page.getByRole('button', { name: 'Professional' })
  await professional.click()
  await expect(professional).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate(() => localStorage.getItem('tradepulse-trust-mode-v1'))).toBe('professional')

  await page.goto('/#forecasts')
  await expect(page.getByRole('heading', { level: 1, name: 'Forecast governance dashboard' })).toBeVisible()
  await page.goto('/#trust-center')
  await expect(page.getByRole('link', { name: 'Forecasts' })).toBeVisible()

  const safeContext = page.getByLabel('Safe support context')
  await expect(safeContext).toContainText('Release: Phase 5G controlled beta')
  await expect(safeContext).toContainText('Sensitive data: omitted')
  await page.getByRole('button', { name: 'Clear local activity' }).click()
  await expect(page.getByText('No local workspace activity recorded.')).toBeVisible()
})

test('Analytics Studio exposes governed interactive reporting controls', async ({ page }) => {
  await page.goto('/#analytics-studio')
  await expect(page.getByRole('heading', { level: 1, name: 'Governed Analytics Studio' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Governed Analytics Studio', exact: true })).toBeVisible()
  await expect(page.getByLabel('Subject area')).toBeVisible()
  await expect(page.getByLabel('Search report')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save view' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export CSV' })).toBeDisabled()
  await expect(page.getByText('Snowflake adapter: not connected')).toBeVisible()
  await expect(page.getByText('Semantic metric dictionary')).toBeVisible()
  await expect(page.locator('#forecasts')).toHaveCount(0)
})
