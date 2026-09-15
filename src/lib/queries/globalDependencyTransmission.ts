import { supabase } from '../supabase/client'

export type GlobalDependencyTransmissionStatus = {
  policyVersion: string
  sovereignCountryTarget: number
  dependencyDomainTarget: number
  referenceCountryCount: number
  dependencyDomainCount: number
  readinessCellCount: number
  relationshipGapCount: number
  verifiedRelationshipCount: number
  mechanismTemplateCount: number
  reviewGateCount: number
  explicitRelationshipGapsRequired: boolean
  directedRelationshipEvidenceRequired: boolean
  temporalAlignmentRequired: boolean
  exposureMagnitudeRequired: boolean
  substitutePathReviewRequired: boolean
  humanReleaseReviewRequired: boolean
  liveProviderConnectivityEnabled: boolean
  automaticRelationshipInferenceEnabled: boolean
  generatedDependencyFillEnabled: boolean
  automaticImpactScoringEnabled: boolean
  productionScenarioPromotionEnabled: boolean
  modelTrainingEnabled: boolean
  autonomousPublicationEnabled: boolean
  autonomousTradeExecutionEnabled: boolean
}

export type GlobalDependencyDomain = {
  id: number
  sequenceNumber: number
  domainKey: string
  displayName: string
  relationshipQuestion: string
  transmissionMechanism: string
  requiredEvidenceClasses: string[]
  minimumIndependentSources: number
  maximumSourceAgeHours: number
  directionalEvidenceRequired: boolean
  magnitudeEvidenceRequired: boolean
  substitutionReviewRequired: boolean
  providerConnected: boolean
  automaticInferenceEnabled: boolean
  countryCount: number
  missingCountryCount: number
}

export type GlobalCountryDependencyReadiness = {
  id: number
  countryCode: string
  countryName: string
  regionGroup: string
  dependencyDomainCount: number
  missingDomainCount: number
  missingDomainKeys: string[]
  verifiedRelationshipCount: number
  upstreamLinkCount: number
  downstreamLinkCount: number
  scenarioEligible: boolean
  modelEligible: boolean
  publicationEligible: boolean
}

export type GlobalTransmissionMechanism = {
  id: number
  sequenceNumber: number
  templateKey: string
  displayName: string
  originState: string
  intermediaryState: string
  downstreamState: string
  explanation: string
  templateStatus: string
  probability: number | null
  confidenceScore: number | null
  estimatedEffectLowPct: number | null
  estimatedEffectHighPct: number | null
  evidenceRequired: boolean
  humanReviewRequired: boolean
  automaticScenarioGenerationEnabled: boolean
  modelEligible: boolean
  publicationEligible: boolean
  productionEffect: boolean
}

export type GlobalDependencyReleaseGate = {
  id: number
  sequenceNumber: number
  gateKey: string
  displayName: string
  requirementNote: string
  blocksScenarioUse: boolean
  blocksModelUse: boolean
  blocksPublication: boolean
  automaticApprovalEnabled: boolean
}

export type GlobalDependencyTransmission = {
  status: GlobalDependencyTransmissionStatus
  domains: GlobalDependencyDomain[]
  countries: GlobalCountryDependencyReadiness[]
  mechanisms: GlobalTransmissionMechanism[]
  gates: GlobalDependencyReleaseGate[]
}

function nullableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function getGlobalDependencyTransmission(): Promise<GlobalDependencyTransmission> {
  const [statusResult, domainResult, countryResult, mechanismResult, gateResult] = await Promise.all([
    supabase.from('global_dependency_transmission_status').select('*')
      .eq('control_key', 'global-dependency-transmission').single(),
    supabase.from('global_dependency_domain_catalog').select('*')
      .order('sequence_number'),
    supabase.from('global_country_dependency_readiness_catalog').select('*')
      .order('country_name'),
    supabase.from('global_transmission_mechanism_catalog').select('*')
      .order('sequence_number'),
    supabase.from('global_dependency_release_gate_catalog').select('*')
      .order('sequence_number'),
  ])
  const firstError = [statusResult.error, domainResult.error, countryResult.error,
    mechanismResult.error, gateResult.error].find(Boolean)
  if (firstError) throw firstError
  const status = statusResult.data

  return {
    status: {
      policyVersion: status.policy_version,
      sovereignCountryTarget: status.sovereign_country_target,
      dependencyDomainTarget: status.dependency_domain_target,
      referenceCountryCount: status.reference_country_count,
      dependencyDomainCount: status.dependency_domain_count,
      readinessCellCount: status.readiness_cell_count,
      relationshipGapCount: status.relationship_gap_count,
      verifiedRelationshipCount: status.verified_relationship_count,
      mechanismTemplateCount: status.mechanism_template_count,
      reviewGateCount: status.review_gate_count,
      explicitRelationshipGapsRequired: status.explicit_relationship_gaps_required,
      directedRelationshipEvidenceRequired: status.directed_relationship_evidence_required,
      temporalAlignmentRequired: status.temporal_alignment_required,
      exposureMagnitudeRequired: status.exposure_magnitude_required,
      substitutePathReviewRequired: status.substitute_path_review_required,
      humanReleaseReviewRequired: status.human_release_review_required,
      liveProviderConnectivityEnabled: status.live_provider_connectivity_enabled,
      automaticRelationshipInferenceEnabled: status.automatic_relationship_inference_enabled,
      generatedDependencyFillEnabled: status.generated_dependency_fill_enabled,
      automaticImpactScoringEnabled: status.automatic_impact_scoring_enabled,
      productionScenarioPromotionEnabled: status.production_scenario_promotion_enabled,
      modelTrainingEnabled: status.model_training_enabled,
      autonomousPublicationEnabled: status.autonomous_publication_enabled,
      autonomousTradeExecutionEnabled: status.autonomous_trade_execution_enabled,
    },
    domains: (domainResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number,
      domainKey: item.domain_key, displayName: item.display_name,
      relationshipQuestion: item.relationship_question,
      transmissionMechanism: item.transmission_mechanism,
      requiredEvidenceClasses: item.required_evidence_classes ?? [],
      minimumIndependentSources: item.minimum_independent_sources,
      maximumSourceAgeHours: item.maximum_source_age_hours,
      directionalEvidenceRequired: item.directional_evidence_required,
      magnitudeEvidenceRequired: item.magnitude_evidence_required,
      substitutionReviewRequired: item.substitution_review_required,
      providerConnected: item.provider_connected,
      automaticInferenceEnabled: item.automatic_inference_enabled,
      countryCount: item.country_count, missingCountryCount: item.missing_country_count,
    })),
    countries: (countryResult.data ?? []).map((item) => ({
      id: item.id, countryCode: item.country_code, countryName: item.country_name,
      regionGroup: item.region_group, dependencyDomainCount: item.dependency_domain_count,
      missingDomainCount: item.missing_domain_count,
      missingDomainKeys: item.missing_domain_keys ?? [],
      verifiedRelationshipCount: item.verified_relationship_count,
      upstreamLinkCount: item.upstream_link_count,
      downstreamLinkCount: item.downstream_link_count,
      scenarioEligible: item.scenario_eligible, modelEligible: item.model_eligible,
      publicationEligible: item.publication_eligible,
    })),
    mechanisms: (mechanismResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number,
      templateKey: item.template_key, displayName: item.display_name,
      originState: item.origin_state, intermediaryState: item.intermediary_state,
      downstreamState: item.downstream_state, explanation: item.explanation,
      templateStatus: item.template_status,
      probability: nullableNumber(item.probability),
      confidenceScore: nullableNumber(item.confidence_score),
      estimatedEffectLowPct: nullableNumber(item.estimated_effect_low_pct),
      estimatedEffectHighPct: nullableNumber(item.estimated_effect_high_pct),
      evidenceRequired: item.evidence_required,
      humanReviewRequired: item.human_review_required,
      automaticScenarioGenerationEnabled: item.automatic_scenario_generation_enabled,
      modelEligible: item.model_eligible, publicationEligible: item.publication_eligible,
      productionEffect: item.production_effect,
    })),
    gates: (gateResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number, gateKey: item.gate_key,
      displayName: item.display_name, requirementNote: item.requirement_note,
      blocksScenarioUse: item.blocks_scenario_use,
      blocksModelUse: item.blocks_model_use,
      blocksPublication: item.blocks_publication,
      automaticApprovalEnabled: item.automatic_approval_enabled,
    })),
  }
}
