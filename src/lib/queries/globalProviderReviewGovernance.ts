import { supabase } from '../supabase/client'

export type GlobalProviderReviewGovernanceStatus = {
  policyVersion: string
  sourceFamilyCount: number
  roleTemplateCount: number
  unassignedRoleCount: number
  lifecycleStageCount: number
  responsibilityCount: number
  unassignedResponsibilityCount: number
  authorizedResponsibilityCount: number
}

export type GlobalProviderReviewRole = {
  id: number
  sequenceNumber: number
  roleKey: string
  reviewDomain: string
  displayName: string
  responsibility: string
  assignmentStatus: string
  blocksPacketOpening: boolean
  blocksEndpointAccess: boolean
  blocksRelease: boolean
  humanAuthorized: boolean
}

export type GlobalProviderEvidenceLifecycleStage = {
  id: number
  sequenceNumber: number
  stageKey: string
  displayName: string
  stageDefinition: string
  realEvidencePresent: boolean
  automaticTransitionEnabled: boolean
  humanActionRequired: boolean
  productionEffect: boolean
}

export type GlobalProviderReviewResponsibility = {
  id: number
  sourceFamilyKey: string
  sourceFamilyName: string
  roleKey: string
  roleSequenceNumber: number
  roleName: string
  reviewDomain: string
  responsibilityStatus: string
  humanAuthorized: boolean
  packetOpenEffect: boolean
  endpointAccessEffect: boolean
  candidateWriteEffect: boolean
  releaseEffect: boolean
  productionEffect: boolean
}

export type GlobalProviderReviewGovernance = {
  status: GlobalProviderReviewGovernanceStatus
  roles: GlobalProviderReviewRole[]
  lifecycle: GlobalProviderEvidenceLifecycleStage[]
  responsibilities: GlobalProviderReviewResponsibility[]
}

export async function getGlobalProviderReviewGovernance(): Promise<GlobalProviderReviewGovernance> {
  const [statusResult, roleResult, lifecycleResult, responsibilityResult] = await Promise.all([
    supabase.from('global_provider_review_governance_status').select('*')
      .eq('control_key', 'global-provider-review-governance').single(),
    supabase.from('global_provider_review_role_catalog').select('*').order('sequence_number'),
    supabase.from('global_provider_evidence_lifecycle_catalog').select('*').order('sequence_number'),
    supabase.from('global_provider_review_responsibility_catalog').select('*')
      .order('source_family_key').order('role_sequence_number'),
  ])
  const firstError = [statusResult.error, roleResult.error, lifecycleResult.error,
    responsibilityResult.error].find(Boolean)
  if (firstError) throw firstError
  const status = statusResult.data

  return {
    status: {
      policyVersion: status.policy_version,
      sourceFamilyCount: status.source_family_count,
      roleTemplateCount: status.role_template_count,
      unassignedRoleCount: status.unassigned_role_count,
      lifecycleStageCount: status.lifecycle_stage_count,
      responsibilityCount: status.responsibility_count,
      unassignedResponsibilityCount: status.unassigned_responsibility_count,
      authorizedResponsibilityCount: status.authorized_responsibility_count,
    },
    roles: (roleResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number, roleKey: item.role_key,
      reviewDomain: item.review_domain, displayName: item.display_name,
      responsibility: item.responsibility, assignmentStatus: item.assignment_status,
      blocksPacketOpening: item.blocks_packet_opening,
      blocksEndpointAccess: item.blocks_endpoint_access,
      blocksRelease: item.blocks_release, humanAuthorized: item.human_authorized,
    })),
    lifecycle: (lifecycleResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number, stageKey: item.stage_key,
      displayName: item.display_name, stageDefinition: item.stage_definition,
      realEvidencePresent: item.real_evidence_present,
      automaticTransitionEnabled: item.automatic_transition_enabled,
      humanActionRequired: item.human_action_required,
      productionEffect: item.production_effect,
    })),
    responsibilities: (responsibilityResult.data ?? []).map((item) => ({
      id: item.id, sourceFamilyKey: item.source_family_key,
      sourceFamilyName: item.source_family_name, roleKey: item.role_key,
      roleSequenceNumber: item.role_sequence_number, roleName: item.role_name,
      reviewDomain: item.review_domain, responsibilityStatus: item.responsibility_status,
      humanAuthorized: item.human_authorized, packetOpenEffect: item.packet_open_effect,
      endpointAccessEffect: item.endpoint_access_effect,
      candidateWriteEffect: item.candidate_write_effect,
      releaseEffect: item.release_effect, productionEffect: item.production_effect,
    })),
  }
}
