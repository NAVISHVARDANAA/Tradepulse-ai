import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (value, message) => { if (!value) throw new Error(message) }

const [migration, test, smoke, query, panel, app, navigation, header, browser,
  production, manifestText, packageText, ci, deployData, verifyData, buildWeb,
  deployWeb, verifyWeb, publicRead, deployed, roadmap, guide] = await Promise.all([
  'supabase/migrations/056_global_provider_certification_isolated_intake.sql',
  'supabase/tests/database/global_provider_certification_isolated_intake.test.sql',
  'supabase/tests/production/global_provider_certification_isolated_intake_smoke.sql',
  'src/lib/queries/globalProviderCertification.ts',
  'src/components/GlobalProviderCertificationPanel.tsx', 'src/App.tsx',
  'src/components/ProductNavigation.tsx', 'src/components/ProductPageHeader.tsx',
  'tests/e2e/controlled-beta.spec.ts', 'tests/e2e/production-smoke.spec.ts',
  'public/beta-release.json', 'package.json', '.github/workflows/ci.yml',
  '.github/workflows/deploy-supabase.yml', '.github/workflows/verify-supabase-production.yml',
  '.github/workflows/build-web-release.yml', '.github/workflows/deploy-web-production.yml',
  '.github/workflows/verify-web-production.yml', 'scripts/verify-public-runtime-read.sh',
  'scripts/verify-web-deployment.mjs', 'docs/PRODUCT_ROADMAP.md',
  'docs/GLOBAL_PROVIDER_CERTIFICATION_ISOLATED_INTAKE.md',
].map(read))

for (const table of ['global_provider_certification_controls',
  'global_provider_certification_profiles', 'global_provider_certification_gate_templates',
  'global_isolated_intake_profiles', 'global_provider_failure_drill_templates']) {
  assert(migration.includes(`create table public.${table}`), `Missing ${table}`)
}
for (const view of ['global_provider_certification_status',
  'global_provider_certification_catalog', 'global_provider_certification_gate_catalog',
  'global_isolated_intake_catalog', 'global_provider_failure_drill_catalog']) {
  assert(migration.includes(`create view public.${view}`), `Missing ${view}`)
}
for (const lock of ['source_family_target = 8', 'certification_gate_target = 10',
  'isolation_profile_target = 8', 'failure_drill_target = 6',
  'not provider_selection_enabled', 'not endpoint_testing_enabled',
  'not credential_storage_enabled', 'not candidate_intake_enabled',
  'not production_ingestion_enabled', 'not automatic_certification_enabled',
  'not observation_release_enabled', 'not model_training_enabled',
  'not autonomous_publication_enabled', 'not autonomous_trade_execution_enabled',
  'Global provider certification reference records are append-only']) {
  assert(migration.includes(lock), `Missing Phase 8L certification contract: ${lock}`)
}
assert((migration.match(/^  \([1-9][0-9]?,'.*','.*','.*','(?:legal|rights|privacy|security|technical|operations|governance)'\)/gm) ?? []).length === 10,
  'Expected ten certification gates')
assert((migration.match(/^  \([1-6],'.*','.*','.*','.*'\)/gm) ?? []).length >= 6,
  'Expected six failure drills')
assert(test.includes('select plan(52)'), 'PgTAP plan changed')
assert(smoke.includes('global_provider_certification_status'), 'Smoke omits certification status')

for (const view of ['global_provider_certification_status',
  'global_provider_certification_catalog', 'global_provider_certification_gate_catalog',
  'global_isolated_intake_catalog', 'global_provider_failure_drill_catalog']) {
  assert(query.includes(`from('${view}')`), `Client omits ${view}`)
}
for (const copy of ['Provider certification and isolated intake readiness',
  'No provider is selected or connected in Phase 8L',
  'Provider-family certification gaps', 'Ten gates before an endpoint test',
  'Six evidence-required failure drills']) {
  assert(panel.includes(copy), `UI omits ${copy}`)
}
assert(app.includes("activeHref === '#provider-certification'"), 'App omits provider-certification route')
assert(app.includes("import('./components/GlobalProviderCertificationPanel')"), 'Provider certification route is not lazy')
assert(navigation.includes("href: '#provider-certification'"), 'Navigation omits provider-certification route')
assert(header.includes("'#provider-certification'"), 'Header omits provider-certification route')
assert(browser.includes("page.goto('/#provider-certification')"), 'E2E omits provider-certification route')
assert(production.includes("'#provider-certification'"), 'Production test omits provider-certification route')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
const release = manifest.globalProviderCertification
assert(manifest.phase === '8M' && manifest.status === 'global_provider_contract_test_lab_candidate',
  'Manifest is not Phase 8L')
assert(packageJson.scripts?.['check:global-provider-certification'], 'Package omits Phase 8L check')
assert(manifest.requiredChecks.includes('check:global-provider-certification'), 'Manifest omits Phase 8L check')
for (const key of ['workspaceEnabled', 'namedLegalOwnerRequired',
  'sourceRightsReviewRequired', 'privacySecurityReviewRequired',
  'versionedSchemaContractRequired', 'boundedIsolationRequired',
  'accountableHumanActivationRequired', 'appendOnlyReferenceContracts']) {
  assert(release?.[key] === true, `${key} is not true`)
}
for (const key of ['providerSelectionEnabled', 'endpointTestingEnabled',
  'credentialStorageEnabled', 'candidateIntakeEnabled', 'productionIngestionEnabled',
  'automaticCertificationEnabled', 'observationReleaseEnabled', 'modelTrainingEnabled',
  'autonomousPublicationEnabled', 'autonomousTradeExecutionEnabled']) {
  assert(release?.[key] === false, `${key} is not false`)
}
assert(release?.sourceFamilyCount === 8 && release?.unselectedProviderCount === 8
  && release?.certifiedProviderCount === 0, 'Provider counts changed')
assert(release?.certificationGateCount === 10 && release?.isolationProfileCount === 8
  && release?.unprovisionedIsolationCount === 8, 'Gate or isolation counts changed')
assert(release?.failureDrillCount === 6 && release?.observedDrillCount === 0,
  'Failure-drill counts changed')

for (const [workflow, token] of [[deployData, 'DEPLOY_DATA_PHASE_8M'],
  [verifyData, 'VERIFY_DATA_PHASE_8M'], [buildWeb, 'BUILD_PHASE_8M'],
  [deployWeb, 'DEPLOY_PHASE_8M'], [verifyWeb, 'VERIFY_WEB_PHASE_8M']]) {
  assert(workflow.includes(token), `Workflow omits ${token}`)
}
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:global-provider-certification'), 'Web gate omits provider certification check')
}
assert(ci.includes('global_provider_certification_isolated_intake.test.sql'), 'CI omits Phase 8L DB test')
assert(deployData.includes('global_provider_certification_isolated_intake_smoke.sql')
  && verifyData.includes('global_provider_certification_isolated_intake_smoke.sql'),
  'Data workflows omit Phase 8L smoke')
assert(publicRead.includes('global_provider_certification_status'), 'Public verifier omits Phase 8L')
assert(deployed.includes('manifest.globalProviderCertification'), 'Web verifier omits Phase 8L')
assert(roadmap.includes('Phase 8L — provider certification and isolated intake readiness (implemented foundation)'),
  'Roadmap omits Phase 8L')
assert(guide.includes('No provider selection, endpoint test or isolated intake is implied'),
  'Guide omits the no-provider contract')

console.log('Global provider certification passed: eight providers remain unselected and every isolation environment remains unprovisioned.')
