import { supabase } from '../supabase/client'

export type GlobalProviderActivationRehearsalStatus = {
  policyVersion: string
  sourceFamilyCount: number
  rehearsalGateCount: number
  rehearsalStateCount: number
  rehearsalCellCount: number
  blockedRehearsalCellCount: number
  authorizedRehearsalCellCount: number
}

export type GlobalProviderActivationRehearsalState = {
  id: number
  sequenceNumber: number
  stateKey: string
  displayName: string
  stateDefinition: string
  realRehearsalPresent: boolean
  automaticTransitionEnabled: boolean
  humanRehearsalAuthorizationRequired: boolean
  egressAccessEffect: boolean
  credentialAccessEffect: boolean
  activationEffect: boolean
  productionEffect: boolean
}

export type GlobalProviderActivationRehearsalGate = {
  id: number
  sequenceNumber: number
  gateKey: string
  rehearsalDomain: string
  displayName: string
  gateDefinition: string
  gateStatus: string
  realEvidencePresent: boolean
  reviewerAssigned: boolean
  humanAuthorized: boolean
}

export type GlobalProviderActivationRehearsalCell = {
  id: number
  sourceFamilyKey: string
  sourceFamilyName: string
  gateKey: string
  gateSequenceNumber: number
  gateName: string
  rehearsalDomain: string
  rehearsalStatus: string
  humanAuthorized: boolean
  egressAccessEffect: boolean
  credentialAccessEffect: boolean
  fixtureExecutionEffect: boolean
  abortExecutionEffect: boolean
  restorationExecutionEffect: boolean
  activationEffect: boolean
  candidateWriteEffect: boolean
  releaseEffect: boolean
  productionEffect: boolean
}

export type GlobalProviderActivationRehearsal = {
  status: GlobalProviderActivationRehearsalStatus
  states: GlobalProviderActivationRehearsalState[]
  gates: GlobalProviderActivationRehearsalGate[]
  rehearsal: GlobalProviderActivationRehearsalCell[]
}

export async function getGlobalProviderActivationRehearsal(): Promise<GlobalProviderActivationRehearsal> {
  const [statusResult, stateResult, gateResult, rehearsalResult] = await Promise.all([
    supabase.from('global_provider_activation_rehearsal_status').select('*')
      .eq('control_key', 'global-provider-activation-rehearsal-controls').single(),
    supabase.from('global_provider_activation_rehearsal_state_catalog').select('*').order('sequence_number'),
    supabase.from('global_provider_activation_rehearsal_gate_catalog').select('*').order('sequence_number'),
    supabase.from('global_provider_activation_rehearsal_catalog').select('*')
      .order('source_family_key').order('gate_sequence_number'),
  ])
  const firstError = [statusResult.error, stateResult.error, gateResult.error,
    rehearsalResult.error].find(Boolean)
  if (firstError) throw firstError
  const status = statusResult.data

  return {
    status: {
      policyVersion: status.policy_version,
      sourceFamilyCount: status.source_family_count,
      rehearsalGateCount: status.rehearsal_gate_count,
      rehearsalStateCount: status.rehearsal_state_count,
      rehearsalCellCount: status.rehearsal_cell_count,
      blockedRehearsalCellCount: status.blocked_rehearsal_cell_count,
      authorizedRehearsalCellCount: status.authorized_rehearsal_cell_count,
    },
    states: (stateResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number, stateKey: item.state_key,
      displayName: item.display_name, stateDefinition: item.state_definition,
      realRehearsalPresent: item.real_rehearsal_present,
      automaticTransitionEnabled: item.automatic_transition_enabled,
      humanRehearsalAuthorizationRequired: item.human_rehearsal_authorization_required,
      egressAccessEffect: item.egress_access_effect,
      credentialAccessEffect: item.credential_access_effect,
      activationEffect: item.activation_effect, productionEffect: item.production_effect,
    })),
    gates: (gateResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number, gateKey: item.gate_key,
      rehearsalDomain: item.rehearsal_domain, displayName: item.display_name,
      gateDefinition: item.gate_definition, gateStatus: item.gate_status,
      realEvidencePresent: item.real_evidence_present, reviewerAssigned: item.reviewer_assigned,
      humanAuthorized: item.human_authorized,
    })),
    rehearsal: (rehearsalResult.data ?? []).map((item) => ({
      id: item.id, sourceFamilyKey: item.source_family_key,
      sourceFamilyName: item.source_family_name, gateKey: item.gate_key,
      gateSequenceNumber: item.gate_sequence_number, gateName: item.gate_name,
      rehearsalDomain: item.rehearsal_domain, rehearsalStatus: item.rehearsal_status,
      humanAuthorized: item.human_authorized, egressAccessEffect: item.egress_access_effect,
      credentialAccessEffect: item.credential_access_effect,
      fixtureExecutionEffect: item.fixture_execution_effect,
      abortExecutionEffect: item.abort_execution_effect,
      restorationExecutionEffect: item.restoration_execution_effect,
      activationEffect: item.activation_effect, candidateWriteEffect: item.candidate_write_effect,
      releaseEffect: item.release_effect, productionEffect: item.production_effect,
    })),
  }
}
