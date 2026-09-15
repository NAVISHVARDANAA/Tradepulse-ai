import { supabase } from '../supabase/client'

function numeric(value: number | string | null | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export type GlobalEvidenceStatus = {
  policyVersion: string
  countryCoverageTarget: number
  minimumIndependentSources: number
  connectedSourceCount: number
  sourceLaneCount: number
  enabledSourceLaneCount: number
  corroborationPolicyCount: number
  rehearsalCaseCount: number
  publicationEligibleCaseCount: number
  immutableProvenanceRequired: boolean
  sourceRightsReviewRequired: boolean
  independentCorroborationRequired: boolean
  conflictReviewRequired: boolean
  humanPublicationReviewRequired: boolean
  rawWebScrapingEnabled: boolean
  privateSourceAccessEnabled: boolean
  unlicensedContentStorageEnabled: boolean
  automaticVerificationEnabled: boolean
  rumorPromotionEnabled: boolean
  autonomousPublicationEnabled: boolean
  productionIngestionEnabled: boolean
  modelTrainingEnabled: boolean
  autonomousTradeExecutionEnabled: boolean
}

export type GlobalEvidenceSourceLane = {
  id: number
  laneKey: string
  displayName: string
  sourceClass: string
  reviewPriority: number
  supportedClaimClasses: string[]
  rightsStatus: string
  authenticityStatus: string
  privacyStatus: string
  securityStatus: string
  retentionStatus: string
  connectivityStatus: string
  ingestionEnabled: boolean
  publicationEnabled: boolean
  modelTrainingEnabled: boolean
  reviewNote: string
}

export type GlobalEvidenceCorroborationPolicy = {
  id: number
  claimClass: string
  displayName: string
  minimumIndependentSources: number
  minimumPrimarySources: number
  maximumSourceAgeHours: number
  geographicAlignmentRequired: boolean
  temporalAlignmentRequired: boolean
  conflictResolution: string
  humanReviewRequired: boolean
  publicationEnabled: boolean
  modelTrainingEnabled: boolean
}

export type GlobalEvidenceReviewCase = {
  id: number
  caseKey: string
  claimClass: string
  claimClassName: string
  countryScope: string
  rehearsalSummary: string
  independentSourceCount: number
  requiredIndependentSources: number
  primarySourceCount: number
  requiredPrimarySources: number
  rightsStatus: string
  authenticityStatus: string
  corroborationStatus: string
  conflictStatus: string
  reviewStatus: string
  synthetic: boolean
  displayEligible: boolean
  publicationEligible: boolean
  modelEligible: boolean
  observedAt: string
  stageCount: number
  blockingStageCount: number
}

export type GlobalEvidenceReviewStage = {
  id: number
  reviewCaseId: number
  caseKey: string
  sequenceNumber: number
  stageKey: string
  stageStatus: string
  requirementNote: string
  humanReviewRequired: boolean
  productionEffect: boolean
}

export type GlobalEvidenceOperations = {
  status: GlobalEvidenceStatus
  sourceLanes: GlobalEvidenceSourceLane[]
  policies: GlobalEvidenceCorroborationPolicy[]
  reviewCases: GlobalEvidenceReviewCase[]
  stages: GlobalEvidenceReviewStage[]
}

export async function getGlobalEvidenceOperations(): Promise<GlobalEvidenceOperations> {
  const [statusResult, sourceResult, policyResult, caseResult, stageResult] = await Promise.all([
    supabase.from('global_evidence_operations_status').select('*')
      .eq('control_key', 'global-evidence-operations').single(),
    supabase.from('global_evidence_source_lane_catalog').select('*')
      .order('review_priority').order('display_name'),
    supabase.from('global_evidence_corroboration_catalog').select('*')
      .order('display_name'),
    supabase.from('global_evidence_review_queue_catalog').select('*')
      .order('observed_at', { ascending: false }).order('id'),
    supabase.from('global_evidence_review_stage_catalog').select('*')
      .order('review_case_id').order('sequence_number'),
  ])
  const firstError = [
    statusResult.error, sourceResult.error, policyResult.error,
    caseResult.error, stageResult.error,
  ].find(Boolean)
  if (firstError) throw firstError
  const status = statusResult.data

  return {
    status: {
      policyVersion: status.policy_version,
      countryCoverageTarget: status.country_coverage_target,
      minimumIndependentSources: status.minimum_independent_sources,
      connectedSourceCount: status.connected_source_count,
      sourceLaneCount: status.source_lane_count,
      enabledSourceLaneCount: status.enabled_source_lane_count,
      corroborationPolicyCount: status.corroboration_policy_count,
      rehearsalCaseCount: status.rehearsal_case_count,
      publicationEligibleCaseCount: status.publication_eligible_case_count,
      immutableProvenanceRequired: status.immutable_provenance_required,
      sourceRightsReviewRequired: status.source_rights_review_required,
      independentCorroborationRequired: status.independent_corroboration_required,
      conflictReviewRequired: status.conflict_review_required,
      humanPublicationReviewRequired: status.human_publication_review_required,
      rawWebScrapingEnabled: status.raw_web_scraping_enabled,
      privateSourceAccessEnabled: status.private_source_access_enabled,
      unlicensedContentStorageEnabled: status.unlicensed_content_storage_enabled,
      automaticVerificationEnabled: status.automatic_verification_enabled,
      rumorPromotionEnabled: status.rumor_promotion_enabled,
      autonomousPublicationEnabled: status.autonomous_publication_enabled,
      productionIngestionEnabled: status.production_ingestion_enabled,
      modelTrainingEnabled: status.model_training_enabled,
      autonomousTradeExecutionEnabled: status.autonomous_trade_execution_enabled,
    },
    sourceLanes: (sourceResult.data ?? []).map((item) => ({
      id: item.id, laneKey: item.lane_key, displayName: item.display_name,
      sourceClass: item.source_class, reviewPriority: item.review_priority,
      supportedClaimClasses: item.supported_claim_classes ?? [],
      rightsStatus: item.rights_status, authenticityStatus: item.authenticity_status,
      privacyStatus: item.privacy_status, securityStatus: item.security_status,
      retentionStatus: item.retention_status, connectivityStatus: item.connectivity_status,
      ingestionEnabled: item.ingestion_enabled, publicationEnabled: item.publication_enabled,
      modelTrainingEnabled: item.model_training_enabled, reviewNote: item.review_note,
    })),
    policies: (policyResult.data ?? []).map((item) => ({
      id: item.id, claimClass: item.claim_class, displayName: item.display_name,
      minimumIndependentSources: item.minimum_independent_sources,
      minimumPrimarySources: item.minimum_primary_sources,
      maximumSourceAgeHours: item.maximum_source_age_hours,
      geographicAlignmentRequired: item.geographic_alignment_required,
      temporalAlignmentRequired: item.temporal_alignment_required,
      conflictResolution: item.conflict_resolution,
      humanReviewRequired: item.human_review_required,
      publicationEnabled: item.publication_enabled,
      modelTrainingEnabled: item.model_training_enabled,
    })),
    reviewCases: (caseResult.data ?? []).map((item) => ({
      id: item.id, caseKey: item.case_key, claimClass: item.claim_class,
      claimClassName: item.claim_class_name, countryScope: item.country_scope,
      rehearsalSummary: item.rehearsal_summary,
      independentSourceCount: item.independent_source_count,
      requiredIndependentSources: item.required_independent_sources,
      primarySourceCount: item.primary_source_count,
      requiredPrimarySources: item.required_primary_sources,
      rightsStatus: item.rights_status, authenticityStatus: item.authenticity_status,
      corroborationStatus: item.corroboration_status, conflictStatus: item.conflict_status,
      reviewStatus: item.review_status, synthetic: item.synthetic,
      displayEligible: item.display_eligible, publicationEligible: item.publication_eligible,
      modelEligible: item.model_eligible, observedAt: item.observed_at,
      stageCount: item.stage_count, blockingStageCount: item.blocking_stage_count,
    })),
    stages: (stageResult.data ?? []).map((item) => ({
      id: numeric(item.id), reviewCaseId: numeric(item.review_case_id),
      caseKey: item.case_key, sequenceNumber: item.sequence_number,
      stageKey: item.stage_key, stageStatus: item.stage_status,
      requirementNote: item.requirement_note,
      humanReviewRequired: item.human_review_required,
      productionEffect: item.production_effect,
    })),
  }
}
