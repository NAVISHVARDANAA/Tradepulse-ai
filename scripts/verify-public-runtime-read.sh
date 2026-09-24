#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF is required}"
: "${WEB_SUPABASE_ANON_KEY:?WEB_SUPABASE_ANON_KEY is required}"

base_url="https://${SUPABASE_PROJECT_REF}.supabase.co/rest/v1"
endpoints=(
  'trade_observations?select=period_date&limit=1'
  'display_qualified_market_forecasts?select=id&limit=1'
  'equity_research_dashboard?select=security_id&limit=1'
  'global_venue_instrument_reference?select=listing_key&limit=1'
  'international_paper_market_catalog?select=listing_key&limit=1'
  'options_paper_chain_catalog?select=contract_symbol&limit=1'
  'global_brokerage_launch_matrix_catalog?select=matrix_code&limit=1'
  'agentic_ai_control_status?select=control_key&limit=1'
  'global_news_signal_catalog?select=id&limit=1'
  'agentic_model_learning_ledger?select=candidate_key&limit=1'
  'global_event_intelligence_status?select=control_key&limit=1'
  'global_event_signal_catalog?select=event_key&limit=1'
  'global_event_impact_graph?select=edge_key&limit=1'
  'global_country_intelligence_coverage?select=country_code&limit=1'
  'controlled_live_rollout_status?select=control_key&limit=1'
  'controlled_live_rollout_cohort_catalog?select=cohort_key&limit=1'
  'controlled_live_rollout_limit_catalog?select=cohort_key&limit=1'
  'controlled_live_rollout_gate_catalog?select=requirement_key&limit=1'
  'controlled_live_rollout_drill_catalog?select=drill_key&limit=1'
  'global_evidence_operations_status?select=control_key&limit=1'
  'global_evidence_source_lane_catalog?select=lane_key&limit=1'
  'global_evidence_corroboration_catalog?select=claim_class&limit=1'
  'global_evidence_review_queue_catalog?select=case_key&limit=1'
  'global_evidence_review_stage_catalog?select=stage_key&limit=1'
  'global_country_coverage_status?select=control_key&limit=1'
  'global_sovereign_country_catalog?select=country_code&limit=1'
  'global_country_intelligence_domain_catalog?select=domain_key&limit=1'
  'global_country_coverage_gate_catalog?select=gate_key&limit=1'
  'global_dependency_transmission_status?select=control_key&limit=1'
  'global_dependency_domain_catalog?select=domain_key&limit=1'
  'global_country_dependency_readiness_catalog?select=country_code&limit=1'
  'global_transmission_mechanism_catalog?select=template_key&limit=1'
  'global_dependency_release_gate_catalog?select=gate_key&limit=1'
  'global_observation_intake_status?select=control_key&limit=1'
  'global_observation_source_catalog?select=source_family_key&limit=1'
  'global_observation_normalization_catalog?select=contract_key&limit=1'
  'global_observation_release_gate_catalog?select=gate_key&limit=1'
  'global_provider_certification_status?select=control_key&limit=1'
  'global_provider_certification_catalog?select=source_family_key&limit=1'
  'global_provider_certification_gate_catalog?select=gate_key&limit=1'
  'global_isolated_intake_catalog?select=source_family_key&limit=1'
  'global_provider_failure_drill_catalog?select=drill_key&limit=1'
  'global_provider_contract_test_status?select=control_key&limit=1'
  'global_provider_contract_suite_catalog?select=source_family_key&limit=1'
  'global_provider_contract_assertion_catalog?select=assertion_key&limit=1'
  'global_provider_synthetic_fixture_catalog?select=fixture_key&limit=1'
  'global_provider_candidate_review_status?select=control_key&limit=1'
  'global_provider_candidate_review_catalog?select=source_family_key&limit=1'
  'global_provider_candidate_evidence_catalog?select=requirement_key&limit=1'
  'global_provider_candidate_review_matrix_catalog?select=source_family_key&limit=1'
  'academy_catalog?select=slug&limit=1'
  'investment_instruments?select=id&paper_trading_enabled=eq.true&limit=1'
  'payment_corridors?select=id&enabled=eq.true&limit=1'
  'payment_corridor_intelligence?select=route_code&limit=1'
  'payment_beneficiary_protection_reference?select=rule_code&limit=1'
  'payment_compliance_orchestration_reference?select=workflow_code&limit=1'
  'payment_sandbox_transfer_lifecycle_reference?select=stage_code&limit=1'
  'payment_sandbox_ledger_reference?select=posting_code&limit=1'
  'payment_money_movement_readiness_reference?select=requirement_code&limit=1'
  'payment_money_movement_readiness_summary?select=corridor_code&limit=1'
)

for endpoint in "${endpoints[@]}"; do
  curl \
    --fail-with-body \
    --silent \
    --show-error \
    --output /dev/null \
    --header "apikey: ${WEB_SUPABASE_ANON_KEY}" \
    --header "Authorization: Bearer ${WEB_SUPABASE_ANON_KEY}" \
    "${base_url}/${endpoint}"
done

echo "All public runtime reads returned HTTP 2xx."
