import { supabase } from '../supabase/client'

export type LicensedProviderCommercialStatus = {
  policyVersion: string
  commercialDomainCount: number
  commercialGateCount: number
  commercialStateCount: number
  readinessCellCount: number
  blockedReadinessCellCount: number
  authorizedReadinessCellCount: number
}

export type LicensedProviderCommercialState = {
  id: number
  sequenceNumber: number
  stateKey: string
  displayName: string
  stateDefinition: string
  providerPresent: boolean
  realEvidencePresent: boolean
  automaticTransitionEnabled: boolean
  humanCommercialAuthorizationRequired: boolean
  providerSelectionEffect: boolean
  commercialCommitmentEffect: boolean
  contractSignatureEffect: boolean
  credentialAccessEffect: boolean
  payloadIntakeEffect: boolean
  liveDisplayEffect: boolean
  productionEffect: boolean
}

export type LicensedProviderCommercialDomain = {
  id: number
  sequenceNumber: number
  domainKey: string
  displayName: string
  domainDefinition: string
  availabilityStatus: string
  providerShortlisted: boolean
  realEvidencePresent: boolean
  quotePresent: boolean
  contractPresent: boolean
  commercialCommitmentEnabled: boolean
  productionEffect: boolean
}

export type LicensedProviderCommercialGate = {
  id: number
  sequenceNumber: number
  gateKey: string
  reviewDomain: string
  displayName: string
  gateDefinition: string
  gateStatus: string
  realEvidencePresent: boolean
  reviewerAssigned: boolean
  humanAuthorized: boolean
}

export type LicensedProviderCommercialReadinessCell = {
  id: number
  domainKey: string
  domainSequenceNumber: number
  domainName: string
  gateKey: string
  gateSequenceNumber: number
  gateName: string
  reviewDomain: string
  readinessStatus: string
  humanAuthorized: boolean
  providerSelectionEffect: boolean
  commercialCommitmentEffect: boolean
  contractSignatureEffect: boolean
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

export type LicensedProviderCommercialReadiness = {
  status: LicensedProviderCommercialStatus
  states: LicensedProviderCommercialState[]
  domains: LicensedProviderCommercialDomain[]
  gates: LicensedProviderCommercialGate[]
  readiness: LicensedProviderCommercialReadinessCell[]
}

export async function getLicensedProviderCommercialReadiness(): Promise<LicensedProviderCommercialReadiness> {
  const [statusResult, stateResult, domainResult, gateResult, readinessResult] = await Promise.all([
    supabase.from('licensed_provider_commercial_readiness_status').select('*')
      .eq('control_key', 'licensed-provider-commercial-readiness-controls').single(),
    supabase.from('licensed_provider_commercial_state_catalog').select('*').order('sequence_number'),
    supabase.from('licensed_provider_commercial_domain_catalog').select('*').order('sequence_number'),
    supabase.from('licensed_provider_commercial_gate_catalog').select('*').order('sequence_number'),
    supabase.from('licensed_provider_commercial_readiness_catalog').select('*')
      .order('domain_sequence_number').order('gate_sequence_number'),
  ])
  const firstError = [statusResult.error, stateResult.error, domainResult.error,
    gateResult.error, readinessResult.error].find(Boolean)
  if (firstError) throw firstError
  const status = statusResult.data

  return {
    status: {
      policyVersion: status.policy_version,
      commercialDomainCount: status.commercial_domain_count,
      commercialGateCount: status.commercial_gate_count,
      commercialStateCount: status.commercial_state_count,
      readinessCellCount: status.readiness_cell_count,
      blockedReadinessCellCount: status.blocked_readiness_cell_count,
      authorizedReadinessCellCount: status.authorized_readiness_cell_count,
    },
    states: (stateResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number, stateKey: item.state_key,
      displayName: item.display_name, stateDefinition: item.state_definition,
      providerPresent: item.provider_present, realEvidencePresent: item.real_evidence_present,
      automaticTransitionEnabled: item.automatic_transition_enabled,
      humanCommercialAuthorizationRequired: item.human_commercial_authorization_required,
      providerSelectionEffect: item.provider_selection_effect,
      commercialCommitmentEffect: item.commercial_commitment_effect,
      contractSignatureEffect: item.contract_signature_effect,
      credentialAccessEffect: item.credential_access_effect,
      payloadIntakeEffect: item.payload_intake_effect,
      liveDisplayEffect: item.live_display_effect, productionEffect: item.production_effect,
    })),
    domains: (domainResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number, domainKey: item.domain_key,
      displayName: item.display_name, domainDefinition: item.domain_definition,
      availabilityStatus: item.availability_status, providerShortlisted: item.provider_shortlisted,
      realEvidencePresent: item.real_evidence_present, quotePresent: item.quote_present,
      contractPresent: item.contract_present,
      commercialCommitmentEnabled: item.commercial_commitment_enabled,
      productionEffect: item.production_effect,
    })),
    gates: (gateResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number, gateKey: item.gate_key,
      reviewDomain: item.review_domain, displayName: item.display_name,
      gateDefinition: item.gate_definition, gateStatus: item.gate_status,
      realEvidencePresent: item.real_evidence_present, reviewerAssigned: item.reviewer_assigned,
      humanAuthorized: item.human_authorized,
    })),
    readiness: (readinessResult.data ?? []).map((item) => ({
      id: item.id, domainKey: item.domain_key, domainSequenceNumber: item.domain_sequence_number,
      domainName: item.domain_name, gateKey: item.gate_key,
      gateSequenceNumber: item.gate_sequence_number, gateName: item.gate_name,
      reviewDomain: item.review_domain, readinessStatus: item.readiness_status,
      humanAuthorized: item.human_authorized,
      providerSelectionEffect: item.provider_selection_effect,
      commercialCommitmentEffect: item.commercial_commitment_effect,
      contractSignatureEffect: item.contract_signature_effect,
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
