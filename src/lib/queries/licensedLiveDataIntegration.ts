import { supabase } from '../supabase/client'

export type LicensedLiveDataStatus = {
  policyVersion: string
  feedClassCount: number
  integrationGateCount: number
  integrationStateCount: number
  readinessCellCount: number
  blockedReadinessCellCount: number
  authorizedReadinessCellCount: number
}

export type LicensedLiveDataState = {
  id: number
  sequenceNumber: number
  stateKey: string
  displayName: string
  stateDefinition: string
  providerPresent: boolean
  realEvidencePresent: boolean
  automaticTransitionEnabled: boolean
  humanIntegrationAuthorizationRequired: boolean
  credentialAccessEffect: boolean
  payloadIntakeEffect: boolean
  liveDisplayEffect: boolean
  productionEffect: boolean
}

export type LicensedLiveDataFeed = {
  id: number
  sequenceNumber: number
  feedKey: string
  displayName: string
  feedDefinition: string
  availabilityStatus: string
  providerSelected: boolean
  rightsEvidencePresent: boolean
  credentialPresent: boolean
  realPayloadPresent: boolean
  liveDisplayEnabled: boolean
  productionEffect: boolean
}

export type LicensedLiveDataGate = {
  id: number
  sequenceNumber: number
  gateKey: string
  integrationDomain: string
  displayName: string
  gateDefinition: string
  gateStatus: string
  realEvidencePresent: boolean
  reviewerAssigned: boolean
  humanAuthorized: boolean
}

export type LicensedLiveDataReadinessCell = {
  id: number
  feedKey: string
  feedSequenceNumber: number
  feedName: string
  gateKey: string
  gateSequenceNumber: number
  gateName: string
  integrationDomain: string
  readinessStatus: string
  humanAuthorized: boolean
  credentialAccessEffect: boolean
  providerEgressEffect: boolean
  payloadIntakeEffect: boolean
  liveDisplayEffect: boolean
  audienceEffect: boolean
  publicationEffect: boolean
  financialExecutionEffect: boolean
  releaseEffect: boolean
  productionEffect: boolean
}

export type LicensedLiveDataIntegration = {
  status: LicensedLiveDataStatus
  states: LicensedLiveDataState[]
  feeds: LicensedLiveDataFeed[]
  gates: LicensedLiveDataGate[]
  readiness: LicensedLiveDataReadinessCell[]
}

export async function getLicensedLiveDataIntegration(): Promise<LicensedLiveDataIntegration> {
  const [statusResult, stateResult, feedResult, gateResult, readinessResult] = await Promise.all([
    supabase.from('licensed_live_data_integration_status').select('*')
      .eq('control_key', 'licensed-live-data-integration-controls').single(),
    supabase.from('licensed_live_data_state_catalog').select('*').order('sequence_number'),
    supabase.from('licensed_live_data_feed_catalog').select('*').order('sequence_number'),
    supabase.from('licensed_live_data_gate_catalog').select('*').order('sequence_number'),
    supabase.from('licensed_live_data_readiness_catalog').select('*')
      .order('feed_sequence_number').order('gate_sequence_number'),
  ])
  const firstError = [statusResult.error, stateResult.error, feedResult.error,
    gateResult.error, readinessResult.error].find(Boolean)
  if (firstError) throw firstError
  const status = statusResult.data

  return {
    status: {
      policyVersion: status.policy_version,
      feedClassCount: status.feed_class_count,
      integrationGateCount: status.integration_gate_count,
      integrationStateCount: status.integration_state_count,
      readinessCellCount: status.readiness_cell_count,
      blockedReadinessCellCount: status.blocked_readiness_cell_count,
      authorizedReadinessCellCount: status.authorized_readiness_cell_count,
    },
    states: (stateResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number, stateKey: item.state_key,
      displayName: item.display_name, stateDefinition: item.state_definition,
      providerPresent: item.provider_present, realEvidencePresent: item.real_evidence_present,
      automaticTransitionEnabled: item.automatic_transition_enabled,
      humanIntegrationAuthorizationRequired: item.human_integration_authorization_required,
      credentialAccessEffect: item.credential_access_effect,
      payloadIntakeEffect: item.payload_intake_effect,
      liveDisplayEffect: item.live_display_effect, productionEffect: item.production_effect,
    })),
    feeds: (feedResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number, feedKey: item.feed_key,
      displayName: item.display_name, feedDefinition: item.feed_definition,
      availabilityStatus: item.availability_status, providerSelected: item.provider_selected,
      rightsEvidencePresent: item.rights_evidence_present,
      credentialPresent: item.credential_present, realPayloadPresent: item.real_payload_present,
      liveDisplayEnabled: item.live_display_enabled, productionEffect: item.production_effect,
    })),
    gates: (gateResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number, gateKey: item.gate_key,
      integrationDomain: item.integration_domain, displayName: item.display_name,
      gateDefinition: item.gate_definition, gateStatus: item.gate_status,
      realEvidencePresent: item.real_evidence_present, reviewerAssigned: item.reviewer_assigned,
      humanAuthorized: item.human_authorized,
    })),
    readiness: (readinessResult.data ?? []).map((item) => ({
      id: item.id, feedKey: item.feed_key, feedSequenceNumber: item.feed_sequence_number,
      feedName: item.feed_name, gateKey: item.gate_key,
      gateSequenceNumber: item.gate_sequence_number, gateName: item.gate_name,
      integrationDomain: item.integration_domain, readinessStatus: item.readiness_status,
      humanAuthorized: item.human_authorized,
      credentialAccessEffect: item.credential_access_effect,
      providerEgressEffect: item.provider_egress_effect,
      payloadIntakeEffect: item.payload_intake_effect,
      liveDisplayEffect: item.live_display_effect, audienceEffect: item.audience_effect,
      publicationEffect: item.publication_effect,
      financialExecutionEffect: item.financial_execution_effect,
      releaseEffect: item.release_effect, productionEffect: item.production_effect,
    })),
  }
}
