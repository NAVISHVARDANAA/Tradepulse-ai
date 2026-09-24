import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (value, message) => { if (!value) throw new Error(message) }

const [migration, test, smoke, query, panel, app, navigation, header, browser,
  production, manifestText, packageText, ci, deployData, verifyData, buildWeb,
  deployWeb, verifyWeb, publicRead, deployed, roadmap, guide] = await Promise.all([
  'supabase/migrations/057_global_provider_contract_test_lab.sql',
  'supabase/tests/database/global_provider_contract_test_lab.test.sql',
  'supabase/tests/production/global_provider_contract_test_lab_smoke.sql',
  'src/lib/queries/globalProviderContractTests.ts',
  'src/components/GlobalProviderContractTestPanel.tsx', 'src/App.tsx',
  'src/components/ProductNavigation.tsx', 'src/components/ProductPageHeader.tsx',
  'tests/e2e/controlled-beta.spec.ts', 'tests/e2e/production-smoke.spec.ts',
  'public/beta-release.json', 'package.json', '.github/workflows/ci.yml',
  '.github/workflows/deploy-supabase.yml', '.github/workflows/verify-supabase-production.yml',
  '.github/workflows/build-web-release.yml', '.github/workflows/deploy-web-production.yml',
  '.github/workflows/verify-web-production.yml', 'scripts/verify-public-runtime-read.sh',
  'scripts/verify-web-deployment.mjs', 'docs/PRODUCT_ROADMAP.md',
  'docs/GLOBAL_PROVIDER_CONTRACT_TEST_LAB.md',
].map(read))

for (const table of ['global_provider_contract_test_controls',
  'global_provider_contract_test_suites', 'global_provider_contract_assertion_templates',
  'global_provider_synthetic_fixture_templates']) {
  assert(migration.includes(`create table public.${table}`), `Missing ${table}`)
}
for (const view of ['global_provider_contract_test_status',
  'global_provider_contract_suite_catalog', 'global_provider_contract_assertion_catalog',
  'global_provider_synthetic_fixture_catalog']) {
  assert(migration.includes(`create view public.${view}`), `Missing ${view}`)
}
for (const contract of ['source_family_target = 8', 'contract_suite_target = 8',
  'assertion_target = 10', 'synthetic_fixture_target = 24',
  'not provider_selection_enabled', 'not endpoint_execution_enabled',
  'not credential_access_enabled', 'not external_payload_intake_enabled',
  'not synthetic_fixture_execution_enabled', 'not candidate_write_enabled',
  'not automatic_conformance_approval_enabled', 'not observation_release_enabled',
  'not model_training_enabled', 'not autonomous_publication_enabled',
  'not autonomous_trade_execution_enabled',
  'Global provider contract-test reference records are append-only']) {
  assert(migration.includes(contract), `Missing Phase 8M contract-test boundary: ${contract}`)
}
assert((migration.match(/^  \([1-9][0-9]?,'.*','.*','.*','(?:reject|quarantine)'\)/gm) ?? []).length === 10,
  'Expected ten conformance assertions')
assert(migration.includes("values ('valid_minimal', 1), ('missing_required', 2), ('schema_drift', 3)"),
  'Expected three provider-neutral fixture classes')
assert(test.includes('select plan(43)'), 'PgTAP plan changed')
assert(smoke.includes('global_provider_contract_test_status'), 'Smoke omits contract-test status')

for (const view of ['global_provider_contract_test_status',
  'global_provider_contract_suite_catalog', 'global_provider_contract_assertion_catalog',
  'global_provider_synthetic_fixture_catalog']) {
  assert(query.includes(`from('${view}')`), `Client omits ${view}`)
}
for (const copy of ['Provider-neutral contract test readiness',
  'No provider payload is tested in Phase 8M',
  'Eight provider-neutral contract suites', 'Ten fail-closed conformance assertions',
  'Synthetic fixtures are specifications, not observations']) {
  assert(panel.includes(copy), `UI omits ${copy}`)
}
assert(app.includes("activeHref === '#provider-contract-tests'"), 'App omits contract-test route')
assert(app.includes("import('./components/GlobalProviderContractTestPanel')"), 'Contract-test route is not lazy')
assert(navigation.includes("href: '#provider-contract-tests'"), 'Navigation omits contract-test route')
assert(header.includes("'#provider-contract-tests'"), 'Header omits contract-test route')
assert(browser.includes("page.goto('/#provider-contract-tests')"), 'E2E omits contract-test route')
assert(production.includes("'#provider-contract-tests'"), 'Production test omits contract-test route')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
const release = manifest.globalProviderContractTests
assert(manifest.phase === '8N' && manifest.status === 'global_provider_candidate_evidence_review_candidate',
  'Manifest is not Phase 8M')
assert(packageJson.scripts?.['check:global-provider-contract-tests'], 'Package omits Phase 8M check')
assert(manifest.requiredChecks.includes('check:global-provider-contract-tests'), 'Manifest omits Phase 8M check')
for (const key of ['workspaceEnabled', 'deterministicFixtureRequired',
  'explicitMissingnessRequired', 'schemaVersionRequired',
  'failClosedDispositionRequired', 'appendOnlyReferenceContracts']) {
  assert(release?.[key] === true, `${key} is not true`)
}
for (const key of ['providerSelectionEnabled', 'endpointExecutionEnabled',
  'credentialAccessEnabled', 'externalPayloadIntakeEnabled',
  'syntheticFixtureExecutionEnabled', 'candidateWriteEnabled',
  'automaticConformanceApprovalEnabled', 'observationReleaseEnabled',
  'modelTrainingEnabled', 'autonomousPublicationEnabled',
  'autonomousTradeExecutionEnabled']) {
  assert(release?.[key] === false, `${key} is not false`)
}
assert(release?.sourceFamilyCount === 8 && release?.contractSuiteCount === 8
  && release?.specificationOnlySuiteCount === 8, 'Contract-suite counts changed')
assert(release?.assertionCount === 10 && release?.syntheticFixtureCount === 24,
  'Assertion or fixture counts changed')
assert(release?.executedTestCount === 0 && release?.passedTestCount === 0
  && release?.fixtureExecutionCount === 0, 'Contract tests are overstated as executed')

for (const [workflow, token] of [[deployData, 'DEPLOY_DATA_PHASE_8N'],
  [verifyData, 'VERIFY_DATA_PHASE_8N'], [buildWeb, 'BUILD_PHASE_8N'],
  [deployWeb, 'DEPLOY_PHASE_8N'], [verifyWeb, 'VERIFY_WEB_PHASE_8N']]) {
  assert(workflow.includes(token), `Workflow omits ${token}`)
}
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:global-provider-contract-tests'), 'Web gate omits provider contract-test check')
}
assert(ci.includes('global_provider_contract_test_lab.test.sql'), 'CI omits Phase 8M DB test')
assert(deployData.includes('global_provider_contract_test_lab_smoke.sql')
  && verifyData.includes('global_provider_contract_test_lab_smoke.sql'),
  'Data workflows omit Phase 8M smoke')
assert(publicRead.includes('global_provider_contract_test_status'), 'Public verifier omits Phase 8M')
assert(deployed.includes('manifest.globalProviderContractTests'), 'Web verifier omits Phase 8M')
assert(roadmap.includes('Phase 8M — provider-neutral contract-test laboratory (implemented foundation)'),
  'Roadmap omits Phase 8M')
assert(guide.includes('No provider, endpoint, credential or external payload is selected or accessed'),
  'Guide omits the no-provider-payload contract')

console.log('Global provider contract-test laboratory passed: 24 synthetic specifications, zero executions and no provider payload.')
