import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (value, message) => { if (!value) throw new Error(message) }

const [migration, test, smoke, query, panel, app, navigation, header, browser,
  production, manifestText, packageText, ci, deployData, verifyData, buildWeb,
  deployWeb, verifyWeb, publicRead, deployed, roadmap, guide] = await Promise.all([
  'supabase/migrations/055_global_observation_provenance_quarantine.sql',
  'supabase/tests/database/global_observation_provenance_quarantine.test.sql',
  'supabase/tests/production/global_observation_provenance_quarantine_smoke.sql',
  'src/lib/queries/globalObservationProvenance.ts',
  'src/components/GlobalObservationProvenancePanel.tsx', 'src/App.tsx',
  'src/components/ProductNavigation.tsx', 'src/components/ProductPageHeader.tsx',
  'tests/e2e/controlled-beta.spec.ts', 'tests/e2e/production-smoke.spec.ts',
  'public/beta-release.json', 'package.json', '.github/workflows/ci.yml',
  '.github/workflows/deploy-supabase.yml', '.github/workflows/verify-supabase-production.yml',
  '.github/workflows/build-web-release.yml', '.github/workflows/deploy-web-production.yml',
  '.github/workflows/verify-web-production.yml', 'scripts/verify-public-runtime-read.sh',
  'scripts/verify-web-deployment.mjs', 'docs/PRODUCT_ROADMAP.md',
  'docs/GLOBAL_OBSERVATION_PROVENANCE_QUARANTINE.md',
].map(read))

for (const table of ['global_observation_intake_controls',
  'global_observation_source_connectors', 'global_observation_normalization_contracts',
  'global_observation_quarantine_lanes', 'global_observation_release_gate_templates']) {
  assert(migration.includes(`create table public.${table}`), `Missing ${table}`)
}
for (const view of ['global_observation_intake_status', 'global_observation_source_catalog',
  'global_observation_normalization_catalog', 'global_observation_release_gate_catalog']) {
  assert(migration.includes(`create view public.${view}`), `Missing ${view}`)
}
for (const lock of ['source_family_target = 8', 'normalization_contract_target = 9',
  'quarantine_lane_target = 8', 'not live_provider_connectivity_enabled',
  'not production_ingestion_enabled', 'not automatic_normalization_approval_enabled',
  'not automatic_conflict_resolution_enabled', 'not automatic_release_enabled',
  'not model_training_enabled', 'not autonomous_publication_enabled',
  'not autonomous_trade_execution_enabled',
  'Global observation provenance reference records are append-only']) {
  assert(migration.includes(lock), `Missing Phase 8K observation contract: ${lock}`)
}
assert((migration.match(/^  \([1-8],'(?:official_statistics|central_bank|regulator_law|issuer_filing|licensed_market_data|licensed_news|licensed_logistics|official_geoscience_hazard)'/gm) ?? []).length === 8,
  'Expected eight source-family contracts')
assert((migration.match(/^  \([1-9],'(?:source_identity|subject_identity|field_semantics|value_representation|unit_currency|geography_scope|observation_time|publication_revision_lineage|license_lineage)'/gm) ?? []).length === 9,
  'Expected nine normalization contracts')
assert(test.includes('select plan(46)'), 'PgTAP plan changed')
assert(smoke.includes('global_observation_intake_status'), 'Smoke omits observation intake status')

for (const view of ['global_observation_intake_status', 'global_observation_source_catalog',
  'global_observation_normalization_catalog', 'global_observation_release_gate_catalog']) {
  assert(query.includes(`from('${view}')`), `Client omits ${view}`)
}
for (const copy of ['Global observation provenance and quarantine fabric',
  'No provider or observation is connected in Phase 8K', 'Disconnected source contracts',
  'Nine canonical normalization contracts', 'Eight gates before any release']) {
  assert(panel.includes(copy), `UI omits ${copy}`)
}
assert(app.includes("activeHref === '#observation-intake'"), 'App omits observation route')
assert(app.includes("import('./components/GlobalObservationProvenancePanel')"), 'Observation route is not lazy')
assert(navigation.includes("href: '#observation-intake'"), 'Navigation omits observation route')
assert(header.includes("'#observation-intake'"), 'Header omits observation route')
assert(browser.includes("page.goto('/#observation-intake')"), 'E2E omits observation route')
assert(production.includes("'#observation-intake'"), 'Production test omits observation route')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
const release = manifest.globalObservationProvenance
assert(manifest.phase === '8N' && manifest.status === 'global_provider_candidate_evidence_review_candidate',
  'Manifest is not Phase 8K')
assert(packageJson.scripts?.['check:global-observation-provenance'], 'Package omits Phase 8K check')
assert(manifest.requiredChecks.includes('check:global-observation-provenance'), 'Manifest omits Phase 8K check')
for (const key of ['workspaceEnabled', 'immutableProvenanceRequired', 'sourceRightsRequired',
  'schemaValidationRequired', 'unitNormalizationRequired', 'temporalLineageRequired',
  'independentCorroborationRequired', 'conflictQuarantineRequired',
  'humanReleaseReviewRequired', 'appendOnlyReferenceContracts']) {
  assert(release?.[key] === true, `${key} is not true`)
}
for (const key of ['liveProviderConnectivityEnabled', 'productionIngestionEnabled',
  'automaticNormalizationApprovalEnabled', 'automaticConflictResolutionEnabled',
  'automaticReleaseEnabled', 'modelTrainingEnabled', 'autonomousPublicationEnabled',
  'autonomousTradeExecutionEnabled']) {
  assert(release?.[key] === false, `${key} is not false`)
}
assert(release?.sourceFamilyCount === 8 && release?.disconnectedSourceCount === 8,
  'Source-family counts changed')
assert(release?.normalizationContractCount === 9 && release?.quarantineLaneCount === 8,
  'Normalization or quarantine counts changed')
assert(release?.candidateObservationCount === 0 && release?.releasedObservationCount === 0
  && release?.releaseGateCount === 8, 'Observation or gate counts changed')

for (const [workflow, token] of [[deployData, 'DEPLOY_DATA_PHASE_8N'],
  [verifyData, 'VERIFY_DATA_PHASE_8N'], [buildWeb, 'BUILD_PHASE_8N'],
  [deployWeb, 'DEPLOY_PHASE_8N'], [verifyWeb, 'VERIFY_WEB_PHASE_8N']]) {
  assert(workflow.includes(token), `Workflow omits ${token}`)
}
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:global-observation-provenance'), 'Web gate omits observation check')
}
assert(ci.includes('global_observation_provenance_quarantine.test.sql'), 'CI omits Phase 8K DB test')
assert(deployData.includes('global_observation_provenance_quarantine_smoke.sql')
  && verifyData.includes('global_observation_provenance_quarantine_smoke.sql'),
  'Data workflows omit Phase 8K smoke')
assert(publicRead.includes('global_observation_intake_status'), 'Public verifier omits Phase 8K')
assert(deployed.includes('manifest.globalObservationProvenance'), 'Web verifier omits Phase 8K')
assert(roadmap.includes('Phase 8K — global observation provenance and quarantine fabric (implemented foundation)'),
  'Roadmap omits Phase 8K')
assert(guide.includes('No provider connection or observation release is implied'),
  'Guide omits the no-connection contract')

console.log('Global observation provenance passed: eight source families remain disconnected and zero observations are released.')
