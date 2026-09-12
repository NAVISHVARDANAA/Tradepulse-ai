import { supabase } from '../supabase/client'

type NumericValue = number | string | null

function numberValue(value: NumericValue | undefined) {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export type GlobalEventStatus = {
  policyVersion: string
  countryCoverageTarget: number
  cataloguedCountryCount: number
  displayEventCount: number
  scenarioCount: number
  sourceAuthenticityRequired: boolean
  multiSourceCorroborationRequired: boolean
  causalImpactGraphEnabled: boolean
  scenarioForecastingEnabled: boolean
  personalizedAlertsEnabled: boolean
  rawWebScrapingEnabled: boolean
  rumorPromotionEnabled: boolean
  productionProviderConnectivityEnabled: boolean
  autonomousTradeExecutionEnabled: boolean
}

export type GlobalEventSignal = {
  id: number
  eventKey: string
  countryCode: string | null
  countryName: string | null
  regionCode: string
  eventType: string
  summary: string
  sourceReference: string
  sourceName: string
  sourceClass: string
  rightsStatus: string
  authenticityTier: string
  authenticityScore: number
  corroborationCount: number
  verificationStatus: string
  severity: string
  noveltyScore: number
  publishedAt: string
  synthetic: boolean
  modelEligible: boolean
}

export type GlobalEventImpact = {
  id: number
  edgeKey: string
  eventId: number
  eventKey: string
  eventType: string
  eventSummary: string
  originCountryCode: string | null
  regionCode: string
  sequenceNumber: number
  fromEntityKind: string
  fromEntityKey: string
  fromEntityName: string
  toEntityKind: string
  targetEntityKey: string
  toEntityName: string
  mechanism: string
  impactDirection: string
  probability: number
  confidenceScore: number
  horizon: string
  lagDescription: string
  rationale: string
  assumptions: string[]
  targetSymbol: string | null
  estimatedEffectLowPct: number | null
  estimatedEffectHighPct: number | null
  terminalEdge: boolean
  humanReviewRequired: boolean
  synthetic: boolean
}

export type CountryIntelligenceCoverage = {
  countryCode: string
  countryName: string
  region: string | null
  coverageStatus: string
  approvedSourceCount: number
  providerCoverageEnabled: boolean
  currentEventCount: number
  latestEventAt: string | null
  evidenceState: string
}

export type GlobalEventAlertPolicy = {
  id: string
  clientPolicyId: string
  name: string
  countryCodes: string[]
  eventTypes: string[]
  assetSymbols: string[]
  minimumAuthenticityScore: number
  minimumConfidenceScore: number
  minimumSeverity: 'low' | 'medium' | 'high' | 'critical'
  deliveryChannel: 'in_app'
  updatedAt: string
}

export type GlobalEventIntelligence = {
  status: GlobalEventStatus
  events: GlobalEventSignal[]
  impacts: GlobalEventImpact[]
  countries: CountryIntelligenceCoverage[]
  alerts: GlobalEventAlertPolicy[]
}

export async function getGlobalEventIntelligence(userId?: string): Promise<GlobalEventIntelligence> {
  const alertsRequest = userId
    ? supabase.from('user_global_event_alert_policies').select('*')
      .eq('user_id', userId).eq('active', true).order('updated_at', { ascending: false }).limit(12)
    : Promise.resolve({ data: [], error: null })
  const [statusResult, eventResult, impactResult, countryResult, alertResult] = await Promise.all([
    supabase.from('global_event_intelligence_status').select('*')
      .eq('control_key', 'global-event-intelligence').single(),
    supabase.from('global_event_signal_catalog').select('*')
      .order('source_published_at', { ascending: false }).limit(20),
    supabase.from('global_event_impact_graph').select('*')
      .order('event_id').order('sequence_number').limit(50),
    supabase.from('global_country_intelligence_coverage').select('*')
      .order('country_name').limit(250),
    alertsRequest,
  ])
  const firstError = [statusResult.error, eventResult.error, impactResult.error, countryResult.error, alertResult.error].find(Boolean)
  if (firstError) throw firstError
  const status = statusResult.data

  return {
    status: {
      policyVersion: status.policy_version,
      countryCoverageTarget: status.country_coverage_target,
      cataloguedCountryCount: status.catalogued_country_count,
      displayEventCount: status.display_event_count,
      scenarioCount: status.scenario_count,
      sourceAuthenticityRequired: status.source_authenticity_required,
      multiSourceCorroborationRequired: status.multi_source_corroboration_required,
      causalImpactGraphEnabled: status.causal_impact_graph_enabled,
      scenarioForecastingEnabled: status.scenario_forecasting_enabled,
      personalizedAlertsEnabled: status.personalized_alerts_enabled,
      rawWebScrapingEnabled: status.raw_web_scraping_enabled,
      rumorPromotionEnabled: status.rumor_promotion_enabled,
      productionProviderConnectivityEnabled: status.production_provider_connectivity_enabled,
      autonomousTradeExecutionEnabled: status.autonomous_trade_execution_enabled,
    },
    events: (eventResult.data ?? []).map((item) => ({
      id: item.id, eventKey: item.event_key, countryCode: item.country_code,
      countryName: item.country_name, regionCode: item.region_code,
      eventType: item.event_type, summary: item.normalized_summary,
      sourceReference: item.source_reference, sourceName: item.source_name,
      sourceClass: item.source_class, rightsStatus: item.rights_status,
      authenticityTier: item.authenticity_tier,
      authenticityScore: numberValue(item.authenticity_score) ?? 0,
      corroborationCount: item.corroboration_count,
      verificationStatus: item.verification_status, severity: item.severity,
      noveltyScore: numberValue(item.novelty_score) ?? 0,
      publishedAt: item.source_published_at, synthetic: item.synthetic,
      modelEligible: item.model_eligible,
    })),
    impacts: (impactResult.data ?? []).map((item) => ({
      id: item.id, edgeKey: item.edge_key, eventId: item.event_id,
      eventKey: item.event_key, eventType: item.event_type,
      eventSummary: item.event_summary,
      originCountryCode: item.origin_country_code, regionCode: item.region_code,
      sequenceNumber: item.sequence_number,
      fromEntityKind: item.from_entity_kind, fromEntityKey: item.entity_key,
      fromEntityName: item.from_entity_name, toEntityKind: item.to_entity_kind,
      targetEntityKey: item.target_entity_key, toEntityName: item.to_entity_name,
      mechanism: item.mechanism, impactDirection: item.impact_direction,
      probability: numberValue(item.probability) ?? 0,
      confidenceScore: numberValue(item.confidence_score) ?? 0,
      horizon: item.horizon, lagDescription: item.lag_description,
      rationale: item.rationale,
      assumptions: Array.isArray(item.assumptions) ? item.assumptions : [],
      targetSymbol: item.target_symbol,
      estimatedEffectLowPct: numberValue(item.estimated_effect_low_pct),
      estimatedEffectHighPct: numberValue(item.estimated_effect_high_pct),
      terminalEdge: item.terminal_edge,
      humanReviewRequired: item.human_review_required,
      synthetic: item.synthetic,
    })),
    countries: (countryResult.data ?? []).map((item) => ({
      countryCode: item.country_code, countryName: item.country_name,
      region: item.region, coverageStatus: item.coverage_status,
      approvedSourceCount: item.approved_source_count,
      providerCoverageEnabled: item.provider_coverage_enabled,
      currentEventCount: item.current_event_count,
      latestEventAt: item.latest_event_at, evidenceState: item.evidence_state,
    })),
    alerts: (alertResult.data ?? []).map((item) => ({
      id: item.id, clientPolicyId: item.client_policy_id, name: item.name,
      countryCodes: item.country_codes, eventTypes: item.event_types,
      assetSymbols: item.asset_symbols,
      minimumAuthenticityScore: numberValue(item.minimum_authenticity_score) ?? 0,
      minimumConfidenceScore: numberValue(item.minimum_confidence_score) ?? 0,
      minimumSeverity: item.minimum_severity,
      deliveryChannel: item.delivery_channel, updatedAt: item.updated_at,
    })),
  }
}

export async function saveGlobalEventAlertPolicy(input: Omit<GlobalEventAlertPolicy, 'id' | 'deliveryChannel' | 'updatedAt'>) {
  const { error } = await supabase.rpc('save_global_event_alert_policy', {
    p_client_policy_id: input.clientPolicyId,
    p_name: input.name,
    p_country_codes: input.countryCodes,
    p_event_types: input.eventTypes,
    p_asset_symbols: input.assetSymbols,
    p_minimum_authenticity_score: input.minimumAuthenticityScore,
    p_minimum_confidence_score: input.minimumConfidenceScore,
    p_minimum_severity: input.minimumSeverity,
  })
  if (error) throw error
}
