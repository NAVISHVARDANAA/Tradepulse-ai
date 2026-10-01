import { supabase } from '../supabase/client'

export type ExternalAudienceLaunchStatus = {
  policyVersion: string
  audienceSurfaceCount: number
  launchGateCount: number
  launchStateCount: number
  readinessCellCount: number
  blockedReadinessCellCount: number
  authorizedReadinessCellCount: number
}

export type ExternalAudienceLaunchState = {
  id: number
  sequenceNumber: number
  stateKey: string
  displayName: string
  stateDefinition: string
  realAudiencePresent: boolean
  automaticTransitionEnabled: boolean
  humanLaunchAuthorizationRequired: boolean
  publicAccessEffect: boolean
  customerDataEffect: boolean
  financialExecutionEffect: boolean
  productionEffect: boolean
}

export type ExternalAudienceLaunchSurface = {
  id: number
  sequenceNumber: number
  surfaceKey: string
  displayName: string
  surfaceDefinition: string
  audienceAccessStatus: string
  realAudiencePresent: boolean
  customerDataEnabled: boolean
  financialExecutionEnabled: boolean
  productionEffect: boolean
}

export type ExternalAudienceLaunchGate = {
  id: number
  sequenceNumber: number
  gateKey: string
  launchDomain: string
  displayName: string
  gateDefinition: string
  gateStatus: string
  realEvidencePresent: boolean
  reviewerAssigned: boolean
  humanAuthorized: boolean
}

export type ExternalAudienceLaunchCell = {
  id: number
  surfaceKey: string
  surfaceSequenceNumber: number
  surfaceName: string
  gateKey: string
  gateSequenceNumber: number
  gateName: string
  launchDomain: string
  readinessStatus: string
  humanAuthorized: boolean
  publicAccessEffect: boolean
  accountProvisioningEffect: boolean
  customerDataEffect: boolean
  liveProviderEffect: boolean
  publicationEffect: boolean
  financialExecutionEffect: boolean
  releaseEffect: boolean
  productionEffect: boolean
}

export type ExternalAudienceLaunchReadiness = {
  status: ExternalAudienceLaunchStatus
  states: ExternalAudienceLaunchState[]
  surfaces: ExternalAudienceLaunchSurface[]
  gates: ExternalAudienceLaunchGate[]
  readiness: ExternalAudienceLaunchCell[]
}

export async function getExternalAudienceLaunchReadiness(): Promise<ExternalAudienceLaunchReadiness> {
  const [statusResult, stateResult, surfaceResult, gateResult, readinessResult] = await Promise.all([
    supabase.from('external_audience_launch_status').select('*')
      .eq('control_key', 'external-audience-launch-controls').single(),
    supabase.from('external_audience_launch_state_catalog').select('*').order('sequence_number'),
    supabase.from('external_audience_launch_surface_catalog').select('*').order('sequence_number'),
    supabase.from('external_audience_launch_gate_catalog').select('*').order('sequence_number'),
    supabase.from('external_audience_launch_readiness_catalog').select('*')
      .order('surface_sequence_number').order('gate_sequence_number'),
  ])
  const firstError = [statusResult.error, stateResult.error, surfaceResult.error,
    gateResult.error, readinessResult.error].find(Boolean)
  if (firstError) throw firstError
  const status = statusResult.data

  return {
    status: {
      policyVersion: status.policy_version,
      audienceSurfaceCount: status.audience_surface_count,
      launchGateCount: status.launch_gate_count,
      launchStateCount: status.launch_state_count,
      readinessCellCount: status.readiness_cell_count,
      blockedReadinessCellCount: status.blocked_readiness_cell_count,
      authorizedReadinessCellCount: status.authorized_readiness_cell_count,
    },
    states: (stateResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number, stateKey: item.state_key,
      displayName: item.display_name, stateDefinition: item.state_definition,
      realAudiencePresent: item.real_audience_present,
      automaticTransitionEnabled: item.automatic_transition_enabled,
      humanLaunchAuthorizationRequired: item.human_launch_authorization_required,
      publicAccessEffect: item.public_access_effect, customerDataEffect: item.customer_data_effect,
      financialExecutionEffect: item.financial_execution_effect,
      productionEffect: item.production_effect,
    })),
    surfaces: (surfaceResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number, surfaceKey: item.surface_key,
      displayName: item.display_name, surfaceDefinition: item.surface_definition,
      audienceAccessStatus: item.audience_access_status,
      realAudiencePresent: item.real_audience_present,
      customerDataEnabled: item.customer_data_enabled,
      financialExecutionEnabled: item.financial_execution_enabled,
      productionEffect: item.production_effect,
    })),
    gates: (gateResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number, gateKey: item.gate_key,
      launchDomain: item.launch_domain, displayName: item.display_name,
      gateDefinition: item.gate_definition, gateStatus: item.gate_status,
      realEvidencePresent: item.real_evidence_present, reviewerAssigned: item.reviewer_assigned,
      humanAuthorized: item.human_authorized,
    })),
    readiness: (readinessResult.data ?? []).map((item) => ({
      id: item.id, surfaceKey: item.surface_key,
      surfaceSequenceNumber: item.surface_sequence_number, surfaceName: item.surface_name,
      gateKey: item.gate_key, gateSequenceNumber: item.gate_sequence_number,
      gateName: item.gate_name, launchDomain: item.launch_domain,
      readinessStatus: item.readiness_status, humanAuthorized: item.human_authorized,
      publicAccessEffect: item.public_access_effect,
      accountProvisioningEffect: item.account_provisioning_effect,
      customerDataEffect: item.customer_data_effect, liveProviderEffect: item.live_provider_effect,
      publicationEffect: item.publication_effect,
      financialExecutionEffect: item.financial_execution_effect,
      releaseEffect: item.release_effect, productionEffect: item.production_effect,
    })),
  }
}
