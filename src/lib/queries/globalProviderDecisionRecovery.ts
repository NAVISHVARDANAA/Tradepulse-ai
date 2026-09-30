import { supabase } from '../supabase/client'

export type GlobalProviderDecisionRecoveryStatus = {
  policyVersion: string
  sourceFamilyCount: number
  recoveryTriggerCount: number
  recoveryStateCount: number
  recoveryCellCount: number
  blockedRecoveryCellCount: number
  authorizedRecoveryCellCount: number
}

export type GlobalProviderDecisionRecoveryState = {
  id: number
  sequenceNumber: number
  stateKey: string
  displayName: string
  stateDefinition: string
  realRecoveryEventPresent: boolean
  automaticTransitionEnabled: boolean
  humanRecoveryReviewRequired: boolean
  freezeEffect: boolean
  rollbackEffect: boolean
  revocationEffect: boolean
  productionEffect: boolean
}

export type GlobalProviderDecisionRecoveryTrigger = {
  id: number
  sequenceNumber: number
  triggerKey: string
  recoveryDomain: string
  displayName: string
  triggerDefinition: string
  triggerStatus: string
  realEventPresent: boolean
  investigatorAssigned: boolean
  humanAuthorized: boolean
}

export type GlobalProviderDecisionRecoveryCell = {
  id: number
  sourceFamilyKey: string
  sourceFamilyName: string
  triggerKey: string
  triggerSequenceNumber: number
  triggerName: string
  recoveryDomain: string
  recoveryStatus: string
  humanAuthorized: boolean
  automatedFreezeEffect: boolean
  rollbackEffect: boolean
  revocationEffect: boolean
  endpointAccessEffect: boolean
  candidateWriteEffect: boolean
  releaseEffect: boolean
  productionEffect: boolean
}

export type GlobalProviderDecisionRecovery = {
  status: GlobalProviderDecisionRecoveryStatus
  states: GlobalProviderDecisionRecoveryState[]
  triggers: GlobalProviderDecisionRecoveryTrigger[]
  recovery: GlobalProviderDecisionRecoveryCell[]
}

export async function getGlobalProviderDecisionRecovery(): Promise<GlobalProviderDecisionRecovery> {
  const [statusResult, stateResult, triggerResult, recoveryResult] = await Promise.all([
    supabase.from('global_provider_decision_recovery_status').select('*')
      .eq('control_key', 'global-provider-decision-recovery-controls').single(),
    supabase.from('global_provider_decision_recovery_state_catalog').select('*').order('sequence_number'),
    supabase.from('global_provider_decision_recovery_trigger_catalog').select('*').order('sequence_number'),
    supabase.from('global_provider_decision_recovery_catalog').select('*')
      .order('source_family_key').order('trigger_sequence_number'),
  ])
  const firstError = [statusResult.error, stateResult.error, triggerResult.error,
    recoveryResult.error].find(Boolean)
  if (firstError) throw firstError
  const status = statusResult.data

  return {
    status: {
      policyVersion: status.policy_version,
      sourceFamilyCount: status.source_family_count,
      recoveryTriggerCount: status.recovery_trigger_count,
      recoveryStateCount: status.recovery_state_count,
      recoveryCellCount: status.recovery_cell_count,
      blockedRecoveryCellCount: status.blocked_recovery_cell_count,
      authorizedRecoveryCellCount: status.authorized_recovery_cell_count,
    },
    states: (stateResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number, stateKey: item.state_key,
      displayName: item.display_name, stateDefinition: item.state_definition,
      realRecoveryEventPresent: item.real_recovery_event_present,
      automaticTransitionEnabled: item.automatic_transition_enabled,
      humanRecoveryReviewRequired: item.human_recovery_review_required,
      freezeEffect: item.freeze_effect, rollbackEffect: item.rollback_effect,
      revocationEffect: item.revocation_effect, productionEffect: item.production_effect,
    })),
    triggers: (triggerResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number, triggerKey: item.trigger_key,
      recoveryDomain: item.recovery_domain, displayName: item.display_name,
      triggerDefinition: item.trigger_definition, triggerStatus: item.trigger_status,
      realEventPresent: item.real_event_present, investigatorAssigned: item.investigator_assigned,
      humanAuthorized: item.human_authorized,
    })),
    recovery: (recoveryResult.data ?? []).map((item) => ({
      id: item.id, sourceFamilyKey: item.source_family_key,
      sourceFamilyName: item.source_family_name, triggerKey: item.trigger_key,
      triggerSequenceNumber: item.trigger_sequence_number, triggerName: item.trigger_name,
      recoveryDomain: item.recovery_domain, recoveryStatus: item.recovery_status,
      humanAuthorized: item.human_authorized,
      automatedFreezeEffect: item.automated_freeze_effect,
      rollbackEffect: item.rollback_effect, revocationEffect: item.revocation_effect,
      endpointAccessEffect: item.endpoint_access_effect,
      candidateWriteEffect: item.candidate_write_effect,
      releaseEffect: item.release_effect, productionEffect: item.production_effect,
    })),
  }
}
