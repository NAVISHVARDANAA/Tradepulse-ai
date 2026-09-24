import { supabase } from '../supabase/client'

export type GlobalProviderCandidateReviewStatus = {
  policyVersion: string
  reviewPacketCount: number
  unopenedReviewPacketCount: number
  selectedCandidateCount: number
  evidenceRequirementCount: number
  reviewMatrixCount: number
  missingEvidenceCount: number
  approvedEvidenceCount: number
}

export type GlobalProviderCandidateReviewProfile = {
  id: number
  sequenceNumber: number
  sourceFamilyKey: string
  sourceFamilyName: string
  sourceClass: string
  contractSuiteSequenceNumber: number
  reviewStatus: string
  conformanceState: string
  submittedRequirementCount: number
  approvedRequirementCount: number
  executedFixtureCount: number
  passedFixtureCount: number
  accountableActivationApproved: boolean
  candidateWriteEnabled: boolean
  releaseEnabled: boolean
  productionEffect: boolean
}

export type GlobalProviderCandidateEvidenceRequirement = {
  id: number
  sequenceNumber: number
  requirementKey: string
  reviewDomain: string
  displayName: string
  evidenceRequirement: string
  blocksEndpointExecution: boolean
  blocksCandidateWrite: boolean
  blocksRelease: boolean
  automaticPassEnabled: boolean
}

export type GlobalProviderCandidateReviewMatrixItem = {
  id: number
  sourceFamilyKey: string
  requirementKey: string
  requirementSequenceNumber: number
  evidenceStatus: string
  humanApproved: boolean
  endpointExecutionEffect: boolean
  candidateWriteEffect: boolean
  releaseEffect: boolean
  productionEffect: boolean
}

export type GlobalProviderCandidateReviews = {
  status: GlobalProviderCandidateReviewStatus
  profiles: GlobalProviderCandidateReviewProfile[]
  requirements: GlobalProviderCandidateEvidenceRequirement[]
  matrix: GlobalProviderCandidateReviewMatrixItem[]
}

export async function getGlobalProviderCandidateReviews(): Promise<GlobalProviderCandidateReviews> {
  const [statusResult, profileResult, requirementResult, matrixResult] = await Promise.all([
    supabase.from('global_provider_candidate_review_status').select('*')
      .eq('control_key', 'global-provider-candidate-evidence-review').single(),
    supabase.from('global_provider_candidate_review_catalog').select('*').order('sequence_number'),
    supabase.from('global_provider_candidate_evidence_catalog').select('*').order('sequence_number'),
    supabase.from('global_provider_candidate_review_matrix_catalog').select('*')
      .order('source_family_key').order('requirement_sequence_number'),
  ])
  const firstError = [statusResult.error, profileResult.error, requirementResult.error,
    matrixResult.error].find(Boolean)
  if (firstError) throw firstError
  const status = statusResult.data

  return {
    status: {
      policyVersion: status.policy_version,
      reviewPacketCount: status.review_packet_count,
      unopenedReviewPacketCount: status.unopened_review_packet_count,
      selectedCandidateCount: status.selected_candidate_count,
      evidenceRequirementCount: status.evidence_requirement_count,
      reviewMatrixCount: status.review_matrix_count,
      missingEvidenceCount: status.missing_evidence_count,
      approvedEvidenceCount: status.approved_evidence_count,
    },
    profiles: (profileResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number,
      sourceFamilyKey: item.source_family_key, sourceFamilyName: item.source_family_name,
      sourceClass: item.source_class,
      contractSuiteSequenceNumber: item.contract_suite_sequence_number,
      reviewStatus: item.review_status, conformanceState: item.conformance_state,
      submittedRequirementCount: item.submitted_requirement_count,
      approvedRequirementCount: item.approved_requirement_count,
      executedFixtureCount: item.executed_fixture_count,
      passedFixtureCount: item.passed_fixture_count,
      accountableActivationApproved: item.accountable_activation_approved,
      candidateWriteEnabled: item.candidate_write_enabled,
      releaseEnabled: item.release_enabled, productionEffect: item.production_effect,
    })),
    requirements: (requirementResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number,
      requirementKey: item.requirement_key, reviewDomain: item.review_domain,
      displayName: item.display_name, evidenceRequirement: item.evidence_requirement,
      blocksEndpointExecution: item.blocks_endpoint_execution,
      blocksCandidateWrite: item.blocks_candidate_write,
      blocksRelease: item.blocks_release,
      automaticPassEnabled: item.automatic_pass_enabled,
    })),
    matrix: (matrixResult.data ?? []).map((item) => ({
      id: item.id, sourceFamilyKey: item.source_family_key,
      requirementKey: item.requirement_key,
      requirementSequenceNumber: item.requirement_sequence_number,
      evidenceStatus: item.evidence_status, humanApproved: item.human_approved,
      endpointExecutionEffect: item.endpoint_execution_effect,
      candidateWriteEffect: item.candidate_write_effect,
      releaseEffect: item.release_effect, productionEffect: item.production_effect,
    })),
  }
}
