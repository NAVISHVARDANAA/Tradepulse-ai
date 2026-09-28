import { supabase } from '../supabase/client'

export type GlobalProviderReviewDecisionStatus = {
  policyVersion: string
  sourceFamilyCount: number
  decisionGateCount: number
  decisionStateCount: number
  readinessCellCount: number
  unmetReadinessCellCount: number
  authorizedReadinessCellCount: number
}

export type GlobalProviderReviewDecisionState = {
  id: number
  sequenceNumber: number
  stateKey: string
  displayName: string
  stateDefinition: string
  realDecisionPresent: boolean
  automaticTransitionEnabled: boolean
  humanDecisionRequired: boolean
  endpointAccessEffect: boolean
  releaseEffect: boolean
  productionEffect: boolean
}

export type GlobalProviderReviewDecisionGate = {
  id: number
  sequenceNumber: number
  gateKey: string
  reviewDomain: string
  displayName: string
  gateDefinition: string
  gateStatus: string
  evidencePresent: boolean
  reviewerAssigned: boolean
  humanAuthorized: boolean
}

export type GlobalProviderReviewDecisionReadiness = {
  id: number
  sourceFamilyKey: string
  sourceFamilyName: string
  gateKey: string
  gateSequenceNumber: number
  gateName: string
  reviewDomain: string
  readinessStatus: string
  humanAuthorized: boolean
  packetOpenEffect: boolean
  endpointAccessEffect: boolean
  candidateWriteEffect: boolean
  releaseEffect: boolean
  productionEffect: boolean
}

export type GlobalProviderReviewDecisions = {
  status: GlobalProviderReviewDecisionStatus
  states: GlobalProviderReviewDecisionState[]
  gates: GlobalProviderReviewDecisionGate[]
  readiness: GlobalProviderReviewDecisionReadiness[]
}

export async function getGlobalProviderReviewDecisions(): Promise<GlobalProviderReviewDecisions> {
  const [statusResult, stateResult, gateResult, readinessResult] = await Promise.all([
    supabase.from('global_provider_review_decision_status').select('*')
      .eq('control_key', 'global-provider-review-decision-controls').single(),
    supabase.from('global_provider_review_decision_state_catalog').select('*').order('sequence_number'),
    supabase.from('global_provider_review_decision_gate_catalog').select('*').order('sequence_number'),
    supabase.from('global_provider_review_decision_readiness_catalog').select('*')
      .order('source_family_key').order('gate_sequence_number'),
  ])
  const firstError = [statusResult.error, stateResult.error, gateResult.error,
    readinessResult.error].find(Boolean)
  if (firstError) throw firstError
  const status = statusResult.data

  return {
    status: {
      policyVersion: status.policy_version,
      sourceFamilyCount: status.source_family_count,
      decisionGateCount: status.decision_gate_count,
      decisionStateCount: status.decision_state_count,
      readinessCellCount: status.readiness_cell_count,
      unmetReadinessCellCount: status.unmet_readiness_cell_count,
      authorizedReadinessCellCount: status.authorized_readiness_cell_count,
    },
    states: (stateResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number, stateKey: item.state_key,
      displayName: item.display_name, stateDefinition: item.state_definition,
      realDecisionPresent: item.real_decision_present,
      automaticTransitionEnabled: item.automatic_transition_enabled,
      humanDecisionRequired: item.human_decision_required,
      endpointAccessEffect: item.endpoint_access_effect,
      releaseEffect: item.release_effect, productionEffect: item.production_effect,
    })),
    gates: (gateResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number, gateKey: item.gate_key,
      reviewDomain: item.review_domain, displayName: item.display_name,
      gateDefinition: item.gate_definition, gateStatus: item.gate_status,
      evidencePresent: item.evidence_present, reviewerAssigned: item.reviewer_assigned,
      humanAuthorized: item.human_authorized,
    })),
    readiness: (readinessResult.data ?? []).map((item) => ({
      id: item.id, sourceFamilyKey: item.source_family_key,
      sourceFamilyName: item.source_family_name, gateKey: item.gate_key,
      gateSequenceNumber: item.gate_sequence_number, gateName: item.gate_name,
      reviewDomain: item.review_domain, readinessStatus: item.readiness_status,
      humanAuthorized: item.human_authorized, packetOpenEffect: item.packet_open_effect,
      endpointAccessEffect: item.endpoint_access_effect,
      candidateWriteEffect: item.candidate_write_effect,
      releaseEffect: item.release_effect, productionEffect: item.production_effect,
    })),
  }
}
