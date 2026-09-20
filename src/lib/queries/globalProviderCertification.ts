import { supabase } from '../supabase/client'

export type GlobalProviderCertificationStatus = {
  policyVersion: string
  sourceFamilyCount: number
  unselectedProviderCount: number
  certifiedProviderCount: number
  certificationGateCount: number
  isolationProfileCount: number
  unprovisionedIsolationCount: number
  failureDrillCount: number
  observedDrillCount: number
}

export type GlobalProviderCertificationProfile = {
  id: number
  sequenceNumber: number
  sourceFamilyKey: string
  sourceFamilyName: string
  sourceClass: string
  certificationStatus: string
  rightsReviewStatus: string
  privacySecurityReviewStatus: string
  schemaReviewStatus: string
  provenanceReviewStatus: string
  resilienceReviewStatus: string
  accountableOwnerAssigned: boolean
  certificationApproved: boolean
  isolatedIntakeApproved: boolean
  productionEffect: boolean
  gapReason: string
}

export type GlobalProviderCertificationGate = {
  id: number
  sequenceNumber: number
  gateKey: string
  displayName: string
  certificationRequirement: string
  evidenceClass: string
  blocksEndpointTest: boolean
  blocksCandidateIntake: boolean
  blocksRelease: boolean
  automaticApprovalEnabled: boolean
}

export type GlobalIsolatedIntakeProfile = {
  id: number
  sequenceNumber: number
  sourceFamilyKey: string
  environmentStatus: string
  networkEgressEnabled: boolean
  credentialAccessEnabled: boolean
  payloadStorageEnabled: boolean
  candidateWriteEnabled: boolean
  maximumCandidateRows: number
  destructiveTestDataOnly: boolean
  quarantineReleaseEnabled: boolean
  downstreamReadEnabled: boolean
  publicationEligible: boolean
  modelEligible: boolean
  productionEffect: boolean
}

export type GlobalProviderFailureDrill = {
  id: number
  sequenceNumber: number
  drillKey: string
  displayName: string
  drillRequirement: string
  expectedSafeState: string
  observedDrillCount: number
  automaticPassEnabled: boolean
  manualEvidenceRequired: boolean
  blocksCertification: boolean
}

export type GlobalProviderCertification = {
  status: GlobalProviderCertificationStatus
  profiles: GlobalProviderCertificationProfile[]
  gates: GlobalProviderCertificationGate[]
  isolation: GlobalIsolatedIntakeProfile[]
  drills: GlobalProviderFailureDrill[]
}

export async function getGlobalProviderCertification(): Promise<GlobalProviderCertification> {
  const [statusResult, profileResult, gateResult, isolationResult, drillResult] = await Promise.all([
    supabase.from('global_provider_certification_status').select('*')
      .eq('control_key', 'global-provider-certification-isolated-intake').single(),
    supabase.from('global_provider_certification_catalog').select('*').order('sequence_number'),
    supabase.from('global_provider_certification_gate_catalog').select('*').order('sequence_number'),
    supabase.from('global_isolated_intake_catalog').select('*').order('sequence_number'),
    supabase.from('global_provider_failure_drill_catalog').select('*').order('sequence_number'),
  ])
  const firstError = [statusResult.error, profileResult.error, gateResult.error,
    isolationResult.error, drillResult.error].find(Boolean)
  if (firstError) throw firstError
  const status = statusResult.data

  return {
    status: {
      policyVersion: status.policy_version,
      sourceFamilyCount: status.source_family_count,
      unselectedProviderCount: status.unselected_provider_count,
      certifiedProviderCount: status.certified_provider_count,
      certificationGateCount: status.certification_gate_count,
      isolationProfileCount: status.isolation_profile_count,
      unprovisionedIsolationCount: status.unprovisioned_isolation_count,
      failureDrillCount: status.failure_drill_count,
      observedDrillCount: status.observed_drill_count,
    },
    profiles: (profileResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number,
      sourceFamilyKey: item.source_family_key, sourceFamilyName: item.source_family_name,
      sourceClass: item.source_class, certificationStatus: item.certification_status,
      rightsReviewStatus: item.rights_review_status,
      privacySecurityReviewStatus: item.privacy_security_review_status,
      schemaReviewStatus: item.schema_review_status,
      provenanceReviewStatus: item.provenance_review_status,
      resilienceReviewStatus: item.resilience_review_status,
      accountableOwnerAssigned: item.accountable_owner_assigned,
      certificationApproved: item.certification_approved,
      isolatedIntakeApproved: item.isolated_intake_approved,
      productionEffect: item.production_effect, gapReason: item.gap_reason,
    })),
    gates: (gateResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number,
      gateKey: item.gate_key, displayName: item.display_name,
      certificationRequirement: item.certification_requirement,
      evidenceClass: item.evidence_class, blocksEndpointTest: item.blocks_endpoint_test,
      blocksCandidateIntake: item.blocks_candidate_intake,
      blocksRelease: item.blocks_release,
      automaticApprovalEnabled: item.automatic_approval_enabled,
    })),
    isolation: (isolationResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number,
      sourceFamilyKey: item.source_family_key, environmentStatus: item.environment_status,
      networkEgressEnabled: item.network_egress_enabled,
      credentialAccessEnabled: item.credential_access_enabled,
      payloadStorageEnabled: item.payload_storage_enabled,
      candidateWriteEnabled: item.candidate_write_enabled,
      maximumCandidateRows: item.maximum_candidate_rows,
      destructiveTestDataOnly: item.destructive_test_data_only,
      quarantineReleaseEnabled: item.quarantine_release_enabled,
      downstreamReadEnabled: item.downstream_read_enabled,
      publicationEligible: item.publication_eligible,
      modelEligible: item.model_eligible, productionEffect: item.production_effect,
    })),
    drills: (drillResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number,
      drillKey: item.drill_key, displayName: item.display_name,
      drillRequirement: item.drill_requirement, expectedSafeState: item.expected_safe_state,
      observedDrillCount: item.observed_drill_count,
      automaticPassEnabled: item.automatic_pass_enabled,
      manualEvidenceRequired: item.manual_evidence_required,
      blocksCertification: item.blocks_certification,
    })),
  }
}
