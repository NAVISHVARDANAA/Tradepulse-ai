import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (value, message) => { if (!value) throw new Error(message) }

const [migration, test, smoke, query, panel, app, navigation, header, browser,
  production, manifestText, packageText, ci, deployData, verifyData, buildWeb,
  deployWeb, verifyWeb, publicRead, deployed, roadmap, guide] = await Promise.all([
  'supabase/migrations/054_global_dependency_transmission_readiness.sql',
  'supabase/tests/database/global_dependency_transmission_readiness.test.sql',
  'supabase/tests/production/global_dependency_transmission_readiness_smoke.sql',
  'src/lib/queries/globalDependencyTransmission.ts',
  'src/components/GlobalDependencyTransmissionPanel.tsx', 'src/App.tsx',
  'src/components/ProductNavigation.tsx', 'src/components/ProductPageHeader.tsx',
  'tests/e2e/controlled-beta.spec.ts', 'tests/e2e/production-smoke.spec.ts',
  'public/beta-release.json', 'package.json', '.github/workflows/ci.yml',
  '.github/workflows/deploy-supabase.yml', '.github/workflows/verify-supabase-production.yml',
  '.github/workflows/build-web-release.yml', '.github/workflows/deploy-web-production.yml',
  '.github/workflows/verify-web-production.yml', 'scripts/verify-public-runtime-read.sh',
  'scripts/verify-web-deployment.mjs', 'docs/PRODUCT_ROADMAP.md',
  'docs/GLOBAL_DEPENDENCY_TRANSMISSION_READINESS.md',
].map(read))

for (const table of ['global_dependency_transmission_controls',
  'global_dependency_intelligence_domains', 'global_country_dependency_readiness',
  'global_transmission_mechanism_templates', 'global_dependency_release_gate_templates']) {
  assert(migration.includes(`create table public.${table}`), `Missing ${table}`)
}
for (const view of ['global_dependency_transmission_status', 'global_dependency_domain_catalog',
  'global_country_dependency_readiness_catalog', 'global_transmission_mechanism_catalog',
  'global_dependency_release_gate_catalog']) {
  assert(migration.includes(`create view public.${view}`), `Missing ${view}`)
}
for (const lock of ['sovereign_country_target = 195', 'dependency_domain_target = 8',
  'not live_provider_connectivity_enabled', 'not automatic_relationship_inference_enabled',
  'not generated_dependency_fill_enabled', 'not automatic_impact_scoring_enabled',
  'not production_scenario_promotion_enabled', 'not model_training_enabled',
  'not autonomous_publication_enabled', 'not autonomous_trade_execution_enabled',
  'Global dependency transmission reference records are append-only']) {
  assert(migration.includes(lock), `Missing Phase 8J dependency contract: ${lock}`)
}
assert((migration.match(/^  \([1-8],'(?:bilateral_trade|commodity_supply|energy_flows|logistics_routes|currency_funding|monetary_policy|corporate_supply_chain|climate_regulatory)'/gm) ?? []).length === 8,
  'Expected eight dependency domains')
assert((migration.match(/^  \([1-6],'(?:supply_expansion|route_disruption|currency_repricing|rate_change|climate_shock|regulatory_change)'/gm) ?? []).length === 6,
  'Expected six transmission templates')
assert(test.includes('select plan(51)'), 'PgTAP plan changed')
assert(smoke.includes("global_dependency_transmission_status"), 'Smoke omits dependency status')
for (const view of ['global_dependency_transmission_status', 'global_dependency_domain_catalog',
  'global_country_dependency_readiness_catalog', 'global_transmission_mechanism_catalog',
  'global_dependency_release_gate_catalog']) {
  assert(query.includes(`from('${view}')`), `Client omits ${view}`)
}
for (const copy of ['Global dependency and transmission fabric',
  'No dependency relationship is inferred in Phase 8J', 'Six transmission templates',
  'Evidence-empty templates, not market predictions', 'Country dependency readiness',
  'Eight gates before scenario use']) {
  assert(panel.includes(copy), `UI omits ${copy}`)
}
assert(app.includes("activeHref === '#dependency-intelligence'"), 'App omits dependency route')
assert(app.includes("import('./components/GlobalDependencyTransmissionPanel')"), 'Dependency route is not lazy')
assert(navigation.includes("href: '#dependency-intelligence'"), 'Navigation omits dependency route')
assert(header.includes("'#dependency-intelligence'"), 'Header omits dependency route')
assert(browser.includes("page.goto('/#dependency-intelligence')"), 'E2E omits dependency route')
assert(production.includes("'#dependency-intelligence'"), 'Production test omits dependency route')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
const release = manifest.globalDependencyTransmission
assert(manifest.phase === '8K' && manifest.status === 'global_observation_provenance_quarantine_candidate',
  'Manifest is not Phase 8J')
assert(packageJson.scripts?.['check:global-dependency-transmission'], 'Package omits Phase 8J check')
assert(manifest.requiredChecks.includes('check:global-dependency-transmission'), 'Manifest omits Phase 8J check')
for (const key of ['workspaceEnabled', 'explicitRelationshipGapsRequired',
  'directedRelationshipEvidenceRequired', 'temporalAlignmentRequired',
  'exposureMagnitudeRequired', 'substitutePathReviewRequired', 'humanReleaseReviewRequired',
  'appendOnlyDependencyReference']) {
  assert(release?.[key] === true, `${key} is not true`)
}
for (const key of ['liveProviderConnectivityEnabled', 'automaticRelationshipInferenceEnabled',
  'generatedDependencyFillEnabled', 'automaticImpactScoringEnabled',
  'productionScenarioPromotionEnabled', 'modelTrainingEnabled',
  'autonomousPublicationEnabled', 'autonomousTradeExecutionEnabled']) {
  assert(release?.[key] === false, `${key} is not false`)
}
assert(release?.sovereignCountryCount === 195 && release?.dependencyDomainCount === 8,
  'Country or dependency-domain counts changed')
assert(release?.readinessCellCount === 1560 && release?.relationshipGapCount === 1560,
  'Dependency readiness counts changed')
assert(release?.verifiedRelationshipCount === 0 && release?.mechanismTemplateCount === 6
  && release?.reviewGateCount === 8, 'Relationship, mechanism, or gate counts changed')

for (const [workflow, token] of [[deployData, 'DEPLOY_DATA_PHASE_8K'],
  [verifyData, 'VERIFY_DATA_PHASE_8K'], [buildWeb, 'BUILD_PHASE_8K'],
  [deployWeb, 'DEPLOY_PHASE_8K'], [verifyWeb, 'VERIFY_WEB_PHASE_8K']]) {
  assert(workflow.includes(token), `Workflow omits ${token}`)
}
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:global-dependency-transmission'), 'Web gate omits dependency check')
}
assert(ci.includes('global_dependency_transmission_readiness.test.sql'), 'CI omits Phase 8J DB test')
assert(deployData.includes('global_dependency_transmission_readiness_smoke.sql')
  && verifyData.includes('global_dependency_transmission_readiness_smoke.sql'),
  'Data workflows omit Phase 8J smoke')
assert(publicRead.includes('global_dependency_transmission_status'), 'Public verifier omits Phase 8J')
assert(deployed.includes('manifest.globalDependencyTransmission'), 'Web verifier omits Phase 8J')
assert(roadmap.includes('Phase 8J — global dependency and transmission readiness fabric (implemented foundation)'),
  'Roadmap omits Phase 8J')
assert(guide.includes('No relationship is inferred from a country or domain alone'),
  'Guide omits the no-inference contract')

console.log('Global dependency transmission passed: 1,560 relationship gaps remain explicit and fail-closed.')
