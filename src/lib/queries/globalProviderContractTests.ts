import { supabase } from '../supabase/client'

export type GlobalProviderContractTestStatus = {
  policyVersion: string
  contractSuiteCount: number
  specificationOnlySuiteCount: number
  executedTestCount: number
  passedTestCount: number
  assertionCount: number
  syntheticFixtureCount: number
  fixtureExecutionCount: number
}

export type GlobalProviderContractSuite = {
  id: number
  sequenceNumber: number
  sourceFamilyKey: string
  sourceFamilyName: string
  sourceClass: string
  suiteStatus: string
  schemaContractVersion: string
  executedTestCount: number
  passedTestCount: number
  conformanceApproved: boolean
  candidateWriteEnabled: boolean
  releaseEnabled: boolean
  productionEffect: boolean
}

export type GlobalProviderContractAssertion = {
  id: number
  sequenceNumber: number
  assertionKey: string
  displayName: string
  assertionRequirement: string
  failureDisposition: string
  blocksExternalExecution: boolean
  blocksCandidateWrite: boolean
  blocksRelease: boolean
  automaticPassEnabled: boolean
}

export type GlobalProviderSyntheticFixture = {
  id: number
  sequenceNumber: number
  sourceFamilyKey: string
  suiteSequenceNumber: number
  fixtureKey: string
  fixtureClass: string
  specification: string
  expectedDisposition: string
  providerNeutral: boolean
  containsExternalData: boolean
  containsRealWorldObservation: boolean
  executionCount: number
  candidateWriteEnabled: boolean
  releaseEnabled: boolean
  productionEffect: boolean
}

export type GlobalProviderContractTests = {
  status: GlobalProviderContractTestStatus
  suites: GlobalProviderContractSuite[]
  assertions: GlobalProviderContractAssertion[]
  fixtures: GlobalProviderSyntheticFixture[]
}

export async function getGlobalProviderContractTests(): Promise<GlobalProviderContractTests> {
  const [statusResult, suiteResult, assertionResult, fixtureResult] = await Promise.all([
    supabase.from('global_provider_contract_test_status').select('*')
      .eq('control_key', 'global-provider-contract-test-lab').single(),
    supabase.from('global_provider_contract_suite_catalog').select('*').order('sequence_number'),
    supabase.from('global_provider_contract_assertion_catalog').select('*').order('sequence_number'),
    supabase.from('global_provider_synthetic_fixture_catalog').select('*').order('sequence_number'),
  ])
  const firstError = [statusResult.error, suiteResult.error, assertionResult.error,
    fixtureResult.error].find(Boolean)
  if (firstError) throw firstError
  const status = statusResult.data

  return {
    status: {
      policyVersion: status.policy_version,
      contractSuiteCount: status.contract_suite_count,
      specificationOnlySuiteCount: status.specification_only_suite_count,
      executedTestCount: status.executed_test_count,
      passedTestCount: status.passed_test_count,
      assertionCount: status.assertion_count,
      syntheticFixtureCount: status.synthetic_fixture_count,
      fixtureExecutionCount: status.fixture_execution_count,
    },
    suites: (suiteResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number,
      sourceFamilyKey: item.source_family_key, sourceFamilyName: item.source_family_name,
      sourceClass: item.source_class, suiteStatus: item.suite_status,
      schemaContractVersion: item.schema_contract_version,
      executedTestCount: item.executed_test_count, passedTestCount: item.passed_test_count,
      conformanceApproved: item.conformance_approved,
      candidateWriteEnabled: item.candidate_write_enabled,
      releaseEnabled: item.release_enabled, productionEffect: item.production_effect,
    })),
    assertions: (assertionResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number,
      assertionKey: item.assertion_key, displayName: item.display_name,
      assertionRequirement: item.assertion_requirement,
      failureDisposition: item.failure_disposition,
      blocksExternalExecution: item.blocks_external_execution,
      blocksCandidateWrite: item.blocks_candidate_write,
      blocksRelease: item.blocks_release,
      automaticPassEnabled: item.automatic_pass_enabled,
    })),
    fixtures: (fixtureResult.data ?? []).map((item) => ({
      id: item.id, sequenceNumber: item.sequence_number,
      sourceFamilyKey: item.source_family_key,
      suiteSequenceNumber: item.suite_sequence_number,
      fixtureKey: item.fixture_key, fixtureClass: item.fixture_class,
      specification: item.specification, expectedDisposition: item.expected_disposition,
      providerNeutral: item.provider_neutral,
      containsExternalData: item.contains_external_data,
      containsRealWorldObservation: item.contains_real_world_observation,
      executionCount: item.execution_count,
      candidateWriteEnabled: item.candidate_write_enabled,
      releaseEnabled: item.release_enabled, productionEffect: item.production_effect,
    })),
  }
}
