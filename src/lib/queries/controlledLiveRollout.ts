import { supabase } from '../supabase/client'

const numberValue = (value: number | string | null) => Number(value) || 0

export type RolloutStatus = {
  policyVersion: string; candidateCohortCount: number; liveCohortCount: number
  requirementCount: number; drillTemplateCount: number; observedDrillCount: number
}
export type RolloutCohort = {
  cohortKey: string; cohortLabel: string; residencyCountry: string; micCode: string
  venueName: string; settlementCurrency: string; accountType: string; assetClass: string
  allowedOrderTypes: string[]; maximumCustomerCount: number; activationStatus: string
  scopeDecisionCount: number; openScopeDecisionCount: number; gateCount: number; blockingGateCount: number
}
export type RolloutLimit = {
  cohortKey: string; settlementCurrency: string; maximumOrderNotional: number
  maximumDailyNotional: number; maximumPositionConcentrationPct: number
  maximumOrdersPerWindow: number; velocityWindowMinutes: number; maximumOpenOrders: number
  maximumFundingCredit: number
}
export type RolloutGate = { requirementKey: string; title: string; summary: string; cohortReviewCount: number; blockingReviewCount: number }
export type RolloutDrill = { drillKey: string; title: string; objective: string; successCriteria: string[]; observedCount: number }
export type ControlledLiveRollout = { status: RolloutStatus; cohorts: RolloutCohort[]; limits: RolloutLimit[]; gates: RolloutGate[]; drills: RolloutDrill[] }

export async function getControlledLiveRollout(): Promise<ControlledLiveRollout> {
  const [statusResult, cohortResult, limitResult, gateResult, drillResult] = await Promise.all([
    supabase.from('controlled_live_rollout_status').select('*').single(),
    supabase.from('controlled_live_rollout_cohort_catalog').select('*').order('cohort_key'),
    supabase.from('controlled_live_rollout_limit_catalog').select('*').order('cohort_key'),
    supabase.from('controlled_live_rollout_gate_catalog').select('*').order('display_order'),
    supabase.from('controlled_live_rollout_drill_catalog').select('*').order('display_order'),
  ])
  const error = [statusResult.error,cohortResult.error,limitResult.error,gateResult.error,drillResult.error].find(Boolean)
  if (error) throw error
  const status = statusResult.data
  return {
    status: { policyVersion: status.policy_version, candidateCohortCount: status.candidate_cohort_count,
      liveCohortCount: status.live_cohort_count, requirementCount: status.requirement_count,
      drillTemplateCount: status.drill_template_count, observedDrillCount: status.observed_drill_count },
    cohorts: (cohortResult.data ?? []).map((row) => ({ cohortKey: row.cohort_key,
      cohortLabel: row.cohort_label, residencyCountry: row.residency_country, micCode: row.mic_code,
      venueName: row.venue_name, settlementCurrency: row.settlement_currency,
      accountType: row.account_type, assetClass: row.asset_class, allowedOrderTypes: row.allowed_order_types,
      maximumCustomerCount: row.maximum_customer_count, activationStatus: row.activation_status,
      scopeDecisionCount: row.scope_decision_count, openScopeDecisionCount: row.open_scope_decision_count,
      gateCount: row.gate_count, blockingGateCount: row.blocking_gate_count })),
    limits: (limitResult.data ?? []).map((row) => ({ cohortKey: row.cohort_key,
      settlementCurrency: row.settlement_currency, maximumOrderNotional: numberValue(row.maximum_order_notional),
      maximumDailyNotional: numberValue(row.maximum_daily_notional),
      maximumPositionConcentrationPct: numberValue(row.maximum_position_concentration_pct),
      maximumOrdersPerWindow: row.maximum_orders_per_window, velocityWindowMinutes: row.velocity_window_minutes,
      maximumOpenOrders: row.maximum_open_orders, maximumFundingCredit: numberValue(row.maximum_funding_credit) })),
    gates: (gateResult.data ?? []).map((row) => ({ requirementKey: row.requirement_key,
      title: row.title, summary: row.summary, cohortReviewCount: row.cohort_review_count,
      blockingReviewCount: row.blocking_review_count })),
    drills: (drillResult.data ?? []).map((row) => ({ drillKey: row.drill_key, title: row.title,
      objective: row.objective, successCriteria: row.success_criteria, observedCount: row.observed_count })),
  }
}
