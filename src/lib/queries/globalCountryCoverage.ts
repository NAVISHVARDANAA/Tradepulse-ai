import { supabase } from '../supabase/client'

export type GlobalCountryCoverageStatus = {
  policyVersion: string
  sovereignCountryTarget: number
  intelligenceDomainTarget: number
  referenceCountryCount: number
  mappedProductCountryCount: number
  evidencedCountryCount: number
  intelligenceDomainCount: number
  coverageCellCount: number
  evidenceGapCount: number
  reviewGateCount: number
  explicitEvidenceGapsRequired: boolean
  independentCorroborationRequired: boolean
  temporalFreshnessRequired: boolean
  humanReleaseReviewRequired: boolean
  liveProviderConnectivityEnabled: boolean
  generatedFactFillEnabled: boolean
  automaticCountryScoringEnabled: boolean
  productionIngestionEnabled: boolean
  modelTrainingEnabled: boolean
  autonomousPublicationEnabled: boolean
  autonomousTradeExecutionEnabled: boolean
}

export type GlobalSovereignCountry = {
  id: number
  countryCode: string
  countryName: string
  regionGroup: string
  mappedToProduct: boolean
  referenceStatus: string
  approvedSourceCount: number
  currentObservationCount: number
  completenessStatus: string
  intelligenceDomainCount: number
  missingDomainCount: number
  missingDomainKeys: string[]
  publicationEligible: boolean
  modelEligible: boolean
}

export type GlobalCountryIntelligenceDomain = {
  id: number
  domainKey: string
  displayName: string
  coverageQuestion: string
  minimumIndependentSources: number
  maximumSourceAgeHours: number
  primarySourceRequired: boolean
  humanReviewRequired: boolean
  providerConnected: boolean
  automaticFillEnabled: boolean
  countryCount: number
  missingCountryCount: number
}

export type GlobalCountryCoverageGate = {
  id: number
  sequenceNumber: number
  gateKey: string
  displayName: string
  requirementNote: string
  blocksPublication: boolean
  blocksModelUse: boolean
  automaticApprovalEnabled: boolean
}

export type GlobalCountryCoverage = {
  status: GlobalCountryCoverageStatus
  countries: GlobalSovereignCountry[]
  domains: GlobalCountryIntelligenceDomain[]
  gates: GlobalCountryCoverageGate[]
}

export async function getGlobalCountryCoverage(): Promise<GlobalCountryCoverage> {
  const [statusResult, countryResult, domainResult, gateResult] = await Promise.all([
    supabase.from('global_country_coverage_status').select('*')
      .eq('control_key', 'global-country-coverage').single(),
    supabase.from('global_sovereign_country_catalog').select('*')
      .order('country_name'),
    supabase.from('global_country_intelligence_domain_catalog').select('*')
      .order('id'),
    supabase.from('global_country_coverage_gate_catalog').select('*')
      .order('sequence_number'),
  ])
  const firstError = [statusResult.error, countryResult.error, domainResult.error, gateResult.error].find(Boolean)
  if (firstError) throw firstError
  const status = statusResult.data

  return {
    status: {
      policyVersion: status.policy_version,
      sovereignCountryTarget: status.sovereign_country_target,
      intelligenceDomainTarget: status.intelligence_domain_target,
      referenceCountryCount: status.reference_country_count,
      mappedProductCountryCount: status.mapped_product_country_count,
      evidencedCountryCount: status.evidenced_country_count,
      intelligenceDomainCount: status.intelligence_domain_count,
      coverageCellCount: status.coverage_cell_count,
      evidenceGapCount: status.evidence_gap_count,
      reviewGateCount: status.review_gate_count,
      explicitEvidenceGapsRequired: status.explicit_evidence_gaps_required,
      independentCorroborationRequired: status.independent_corroboration_required,
      temporalFreshnessRequired: status.temporal_freshness_required,
      humanReleaseReviewRequired: status.human_release_review_required,
      liveProviderConnectivityEnabled: status.live_provider_connectivity_enabled,
      generatedFactFillEnabled: status.generated_fact_fill_enabled,
      automaticCountryScoringEnabled: status.automatic_country_scoring_enabled,
      productionIngestionEnabled: status.production_ingestion_enabled,
      modelTrainingEnabled: status.model_training_enabled,
      autonomousPublicationEnabled: status.autonomous_publication_enabled,
      autonomousTradeExecutionEnabled: status.autonomous_trade_execution_enabled,
    },
    countries: (countryResult.data ?? []).map((item) => ({
      id: item.id, countryCode: item.country_code, countryName: item.country_name,
      regionGroup: item.region_group, mappedToProduct: item.existing_country_id !== null,
      referenceStatus: item.reference_status, approvedSourceCount: item.approved_source_count,
      currentObservationCount: item.current_observation_count,
      completenessStatus: item.completeness_status,
      intelligenceDomainCount: item.intelligence_domain_count,
      missingDomainCount: item.missing_domain_count,
      missingDomainKeys: item.missing_domain_keys ?? [],
      publicationEligible: item.publication_eligible, modelEligible: item.model_eligible,
    })),
    domains: (domainResult.data ?? []).map((item) => ({
      id: item.id, domainKey: item.domain_key, displayName: item.display_name,
      coverageQuestion: item.coverage_question,
      minimumIndependentSources: item.minimum_independent_sources,
      maximumSourceAgeHours: item.maximum_source_age_hours,
      primarySourceRequired: item.primary_source_required,
      humanReviewRequired: item.human_review_required,
      providerConnected: item.provider_connected,
      automaticFillEnabled: item.automatic_fill_enabled,
      countryCount: item.country_count, missingCountryCount: item.missing_country_count,
    })),
    gates: (gateResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number, gateKey: item.gate_key,
      displayName: item.display_name, requirementNote: item.requirement_note,
      blocksPublication: item.blocks_publication, blocksModelUse: item.blocks_model_use,
      automaticApprovalEnabled: item.automatic_approval_enabled,
    })),
  }
}
