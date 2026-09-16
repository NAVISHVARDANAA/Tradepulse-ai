import { supabase } from '../supabase/client'

export type GlobalObservationIntakeStatus = {
  policyVersion: string
  sourceFamilyTarget: number
  normalizationContractTarget: number
  quarantineLaneTarget: number
  sourceFamilyCount: number
  disconnectedSourceCount: number
  normalizationContractCount: number
  quarantineLaneCount: number
  candidateObservationCount: number
  releasedObservationCount: number
  releaseGateCount: number
  immutableProvenanceRequired: boolean
  sourceRightsRequired: boolean
  schemaValidationRequired: boolean
  unitNormalizationRequired: boolean
  temporalLineageRequired: boolean
  independentCorroborationRequired: boolean
  conflictQuarantineRequired: boolean
  humanReleaseReviewRequired: boolean
  liveProviderConnectivityEnabled: boolean
  productionIngestionEnabled: boolean
  automaticNormalizationApprovalEnabled: boolean
  automaticConflictResolutionEnabled: boolean
  automaticReleaseEnabled: boolean
  modelTrainingEnabled: boolean
  autonomousPublicationEnabled: boolean
  autonomousTradeExecutionEnabled: boolean
}

export type GlobalObservationSource = {
  id: number
  sequenceNumber: number
  sourceFamilyKey: string
  displayName: string
  sourceClass: string
  intendedObservationScope: string
  requiredRights: string[]
  requiredProvenanceFields: string[]
  connectorStatus: string
  endpointApproved: boolean
  credentialsConfigured: boolean
  retentionApproved: boolean
  displayRightsApproved: boolean
  derivationRightsApproved: boolean
  modelUseRightsApproved: boolean
  productionIngestionEnabled: boolean
  laneStatus: string
  candidateObservationCount: number
  schemaValidCount: number
  corroboratedCount: number
  conflictCount: number
  releasedObservationCount: number
  gapReason: string
  publicationEligible: boolean
  modelEligible: boolean
  productionEffect: boolean
}

export type GlobalObservationNormalizationContract = {
  id: number
  sequenceNumber: number
  contractKey: string
  displayName: string
  canonicalRequirement: string
  invalidExample: string
  requiredForQuarantineEntry: boolean
  requiredForRelease: boolean
  nullFabricationForbidden: boolean
  automaticApprovalEnabled: boolean
}

export type GlobalObservationReleaseGate = {
  id: number
  sequenceNumber: number
  gateKey: string
  displayName: string
  requirementNote: string
  blocksPublication: boolean
  blocksModelUse: boolean
  blocksDownstreamAnalysis: boolean
  automaticApprovalEnabled: boolean
}

export type GlobalObservationProvenance = {
  status: GlobalObservationIntakeStatus
  sources: GlobalObservationSource[]
  contracts: GlobalObservationNormalizationContract[]
  gates: GlobalObservationReleaseGate[]
}

export async function getGlobalObservationProvenance(): Promise<GlobalObservationProvenance> {
  const [statusResult, sourceResult, contractResult, gateResult] = await Promise.all([
    supabase.from('global_observation_intake_status').select('*')
      .eq('control_key', 'global-observation-provenance-quarantine').single(),
    supabase.from('global_observation_source_catalog').select('*').order('sequence_number'),
    supabase.from('global_observation_normalization_catalog').select('*').order('sequence_number'),
    supabase.from('global_observation_release_gate_catalog').select('*').order('sequence_number'),
  ])
  const firstError = [statusResult.error, sourceResult.error, contractResult.error,
    gateResult.error].find(Boolean)
  if (firstError) throw firstError
  const status = statusResult.data

  return {
    status: {
      policyVersion: status.policy_version,
      sourceFamilyTarget: status.source_family_target,
      normalizationContractTarget: status.normalization_contract_target,
      quarantineLaneTarget: status.quarantine_lane_target,
      sourceFamilyCount: status.source_family_count,
      disconnectedSourceCount: status.disconnected_source_count,
      normalizationContractCount: status.normalization_contract_count,
      quarantineLaneCount: status.quarantine_lane_count,
      candidateObservationCount: status.candidate_observation_count,
      releasedObservationCount: status.released_observation_count,
      releaseGateCount: status.release_gate_count,
      immutableProvenanceRequired: status.immutable_provenance_required,
      sourceRightsRequired: status.source_rights_required,
      schemaValidationRequired: status.schema_validation_required,
      unitNormalizationRequired: status.unit_normalization_required,
      temporalLineageRequired: status.temporal_lineage_required,
      independentCorroborationRequired: status.independent_corroboration_required,
      conflictQuarantineRequired: status.conflict_quarantine_required,
      humanReleaseReviewRequired: status.human_release_review_required,
      liveProviderConnectivityEnabled: status.live_provider_connectivity_enabled,
      productionIngestionEnabled: status.production_ingestion_enabled,
      automaticNormalizationApprovalEnabled: status.automatic_normalization_approval_enabled,
      automaticConflictResolutionEnabled: status.automatic_conflict_resolution_enabled,
      automaticReleaseEnabled: status.automatic_release_enabled,
      modelTrainingEnabled: status.model_training_enabled,
      autonomousPublicationEnabled: status.autonomous_publication_enabled,
      autonomousTradeExecutionEnabled: status.autonomous_trade_execution_enabled,
    },
    sources: (sourceResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number,
      sourceFamilyKey: item.source_family_key, displayName: item.display_name,
      sourceClass: item.source_class, intendedObservationScope: item.intended_observation_scope,
      requiredRights: item.required_rights ?? [],
      requiredProvenanceFields: item.required_provenance_fields ?? [],
      connectorStatus: item.connector_status, endpointApproved: item.endpoint_approved,
      credentialsConfigured: item.credentials_configured,
      retentionApproved: item.retention_approved,
      displayRightsApproved: item.display_rights_approved,
      derivationRightsApproved: item.derivation_rights_approved,
      modelUseRightsApproved: item.model_use_rights_approved,
      productionIngestionEnabled: item.production_ingestion_enabled,
      laneStatus: item.lane_status, candidateObservationCount: item.candidate_observation_count,
      schemaValidCount: item.schema_valid_count, corroboratedCount: item.corroborated_count,
      conflictCount: item.conflict_count, releasedObservationCount: item.released_observation_count,
      gapReason: item.gap_reason, publicationEligible: item.publication_eligible,
      modelEligible: item.model_eligible, productionEffect: item.production_effect,
    })),
    contracts: (contractResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number,
      contractKey: item.contract_key, displayName: item.display_name,
      canonicalRequirement: item.canonical_requirement, invalidExample: item.invalid_example,
      requiredForQuarantineEntry: item.required_for_quarantine_entry,
      requiredForRelease: item.required_for_release,
      nullFabricationForbidden: item.null_fabrication_forbidden,
      automaticApprovalEnabled: item.automatic_approval_enabled,
    })),
    gates: (gateResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number,
      gateKey: item.gate_key, displayName: item.display_name,
      requirementNote: item.requirement_note, blocksPublication: item.blocks_publication,
      blocksModelUse: item.blocks_model_use,
      blocksDownstreamAnalysis: item.blocks_downstream_analysis,
      automaticApprovalEnabled: item.automatic_approval_enabled,
    })),
  }
}
