import { supabase } from '../supabase/client'

export type GlobalProviderActivationStatus = {
  policyVersion: string
  sourceFamilyCount: number
  activationGateCount: number
  activationStateCount: number
  readinessCellCount: number
  blockedReadinessCellCount: number
  authorizedReadinessCellCount: number
}

export type GlobalProviderActivationState = {
  id: number
  sequenceNumber: number
  stateKey: string
  displayName: string
  stateDefinition: string
  realActivationPresent: boolean
  automaticTransitionEnabled: boolean
  humanActivationAuthorizationRequired: boolean
  endpointAccessEffect: boolean
  credentialAccessEffect: boolean
  activationEffect: boolean
  productionEffect: boolean
}

export type GlobalProviderActivationGate = {
  id: number
  sequenceNumber: number
  gateKey: string
  activationDomain: string
  displayName: string
  gateDefinition: string
  gateStatus: string
  realEvidencePresent: boolean
  reviewerAssigned: boolean
  humanAuthorized: boolean
}

export type GlobalProviderActivationCell = {
  id: number
  sourceFamilyKey: string
  sourceFamilyName: string
  gateKey: string
  gateSequenceNumber: number
  gateName: string
  activationDomain: string
  readinessStatus: string
  humanAuthorized: boolean
  endpointAccessEffect: boolean
  credentialAccessEffect: boolean
  activationEffect: boolean
  candidateWriteEffect: boolean
  releaseEffect: boolean
  productionEffect: boolean
}

export type GlobalProviderActivationReadiness = {
  status: GlobalProviderActivationStatus
  states: GlobalProviderActivationState[]
  gates: GlobalProviderActivationGate[]
  readiness: GlobalProviderActivationCell[]
}

export async function getGlobalProviderActivationReadiness(): Promise<GlobalProviderActivationReadiness> {
  const [statusResult, stateResult, gateResult, readinessResult] = await Promise.all([
    supabase.from('global_provider_activation_status').select('*')
      .eq('control_key', 'global-provider-activation-readiness-controls').single(),
    supabase.from('global_provider_activation_state_catalog').select('*').order('sequence_number'),
    supabase.from('global_provider_activation_gate_catalog').select('*').order('sequence_number'),
    supabase.from('global_provider_activation_readiness_catalog').select('*')
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
      activationGateCount: status.activation_gate_count,
      activationStateCount: status.activation_state_count,
      readinessCellCount: status.readiness_cell_count,
      blockedReadinessCellCount: status.blocked_readiness_cell_count,
      authorizedReadinessCellCount: status.authorized_readiness_cell_count,
    },
    states: (stateResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number, stateKey: item.state_key,
      displayName: item.display_name, stateDefinition: item.state_definition,
      realActivationPresent: item.real_activation_present,
      automaticTransitionEnabled: item.automatic_transition_enabled,
      humanActivationAuthorizationRequired: item.human_activation_authorization_required,
      endpointAccessEffect: item.endpoint_access_effect,
      credentialAccessEffect: item.credential_access_effect,
      activationEffect: item.activation_effect, productionEffect: item.production_effect,
    })),
    gates: (gateResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number, gateKey: item.gate_key,
      activationDomain: item.activation_domain, displayName: item.display_name,
      gateDefinition: item.gate_definition, gateStatus: item.gate_status,
      realEvidencePresent: item.real_evidence_present, reviewerAssigned: item.reviewer_assigned,
      humanAuthorized: item.human_authorized,
    })),
    readiness: (readinessResult.data ?? []).map((item) => ({
      id: item.id, sourceFamilyKey: item.source_family_key,
      sourceFamilyName: item.source_family_name, gateKey: item.gate_key,
      gateSequenceNumber: item.gate_sequence_number, gateName: item.gate_name,
      activationDomain: item.activation_domain, readinessStatus: item.readiness_status,
      humanAuthorized: item.human_authorized, endpointAccessEffect: item.endpoint_access_effect,
      credentialAccessEffect: item.credential_access_effect,
      activationEffect: item.activation_effect, candidateWriteEffect: item.candidate_write_effect,
      releaseEffect: item.release_effect, productionEffect: item.production_effect,
    })),
  }
}
