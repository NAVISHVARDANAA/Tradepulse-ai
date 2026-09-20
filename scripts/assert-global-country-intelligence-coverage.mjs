import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (value, message) => { if (!value) throw new Error(message) }

const [migration, test, smoke, query, panel, app, navigation, header, browser,
  production, manifestText, packageText, ci, deployData, verifyData, buildWeb,
  deployWeb, verifyWeb, publicRead, deployed, roadmap, guide] = await Promise.all([
  'supabase/migrations/053_global_country_intelligence_coverage.sql',
  'supabase/tests/database/global_country_intelligence_coverage.test.sql',
  'supabase/tests/production/global_country_intelligence_coverage_smoke.sql',
  'src/lib/queries/globalCountryCoverage.ts',
  'src/components/GlobalCountryCoveragePanel.tsx', 'src/App.tsx',
  'src/components/ProductNavigation.tsx', 'src/components/ProductPageHeader.tsx',
  'tests/e2e/controlled-beta.spec.ts', 'tests/e2e/production-smoke.spec.ts',
  'public/beta-release.json', 'package.json', '.github/workflows/ci.yml',
  '.github/workflows/deploy-supabase.yml', '.github/workflows/verify-supabase-production.yml',
  '.github/workflows/build-web-release.yml', '.github/workflows/deploy-web-production.yml',
  '.github/workflows/verify-web-production.yml', 'scripts/verify-public-runtime-read.sh',
  'scripts/verify-web-deployment.mjs', 'docs/PRODUCT_ROADMAP.md',
  'docs/GLOBAL_COUNTRY_INTELLIGENCE_COVERAGE.md',
].map(read))

for (const table of ['global_country_coverage_controls', 'global_sovereign_country_reference',
  'global_country_intelligence_domains', 'global_country_intelligence_coverage_matrix',
  'global_country_coverage_gate_templates']) {
  assert(migration.includes(`create table public.${table}`), `Missing ${table}`)
}
for (const view of ['country_coverage_status', 'sovereign_country_catalog',
  'country_intelligence_domain_catalog', 'country_coverage_gate_catalog']) {
  assert(migration.includes(`create view public.global_${view}`), `Missing global ${view}`)
}
for (const lock of ['sovereign_country_target = 195', 'intelligence_domain_target = 8',
  'not live_provider_connectivity_enabled', 'not generated_fact_fill_enabled',
  'not automatic_country_scoring_enabled', 'not production_ingestion_enabled',
  'not model_training_enabled', 'not autonomous_publication_enabled',
  'not autonomous_trade_execution_enabled',
  'Global country coverage reference records are append-only']) {
  assert(migration.includes(lock), `Missing Phase 8I coverage contract: ${lock}`)
}
const countryFixtures = migration.match(/\('[A-Z]{2}','(?:[^']|'')+','(?:Africa|Americas|Asia|Europe|Oceania)'\)/g) ?? []
assert(countryFixtures.length === 195, `Expected 195 country fixtures, found ${countryFixtures.length}`)
assert(new Set(countryFixtures.map((fixture) => fixture.slice(2, 4))).size === 195, 'Country codes are not unique')
assert(test.includes('select plan(50)'), 'PgTAP plan changed')
assert(smoke.includes("generate_country_intelligence(text)') is not null"), 'Smoke omits generation absence')
assert(query.includes("from('global_sovereign_country_catalog')"), 'Client omits sovereign country catalog')
assert(query.includes("from('global_country_intelligence_domain_catalog')"), 'Client omits intelligence domains')
for (const copy of ['Global country coverage fabric', 'No country fact is generated or inferred in Phase 8I',
  'Country intelligence standard', '195-country reference ledger',
  'Selected-country gaps', 'Seven gates before country intelligence']) {
  assert(panel.includes(copy), `UI omits ${copy}`)
}
assert(app.includes("activeHref === '#country-coverage'"), 'App omits country coverage route')
assert(app.includes("import('./components/GlobalCountryCoveragePanel')"), 'Country coverage route is not lazy')
assert(navigation.includes("href: '#country-coverage'"), 'Navigation omits country coverage route')
assert(header.includes("'#country-coverage'"), 'Header omits country coverage route')
assert(browser.includes("page.goto('/#country-coverage')"), 'E2E omits country coverage route')
assert(production.includes("'#country-coverage'"), 'Production test omits country coverage route')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
const release = manifest.globalCountryCoverage
assert(manifest.phase === '8L' && manifest.status === 'global_provider_certification_isolated_intake_candidate', 'Manifest is not Phase 8I')
assert(packageJson.scripts?.['check:global-country-coverage'], 'Package omits Phase 8I check')
assert(manifest.requiredChecks.includes('check:global-country-coverage'), 'Manifest omits Phase 8I check')
for (const key of ['workspaceEnabled', 'sovereignReferenceCatalogEnabled',
  'explicitEvidenceGapsRequired', 'sourceRightsReviewRequired',
  'independentCorroborationRequired', 'temporalFreshnessRequired',
  'humanReleaseReviewRequired', 'appendOnlyCoverageReference']) {
  assert(release?.[key] === true, `${key} is not true`)
}
for (const key of ['liveProviderConnectivityEnabled', 'generatedFactFillEnabled',
  'automaticCountryScoringEnabled', 'productionIngestionEnabled',
  'modelTrainingEnabled', 'autonomousPublicationEnabled',
  'autonomousTradeExecutionEnabled']) {
  assert(release?.[key] === false, `${key} is not false`)
}
assert(release?.sovereignCountryCount === 195 && release?.intelligenceDomainCount === 8,
  'Country or domain counts changed')
assert(release?.coverageCellCount === 1560 && release?.evidenceGapCount === 1560,
  'Coverage matrix counts changed')
assert(release?.evidencedCountryCount === 0 && release?.reviewGateCount === 7,
  'Evidence or gate counts changed')

for (const [workflow, token] of [[deployData, 'DEPLOY_DATA_PHASE_8L'],
  [verifyData, 'VERIFY_DATA_PHASE_8L'], [buildWeb, 'BUILD_PHASE_8L'],
  [deployWeb, 'DEPLOY_PHASE_8L'], [verifyWeb, 'VERIFY_WEB_PHASE_8L']]) {
  assert(workflow.includes(token), `Workflow omits ${token}`)
}
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:global-country-coverage'), 'Web gate omits country coverage check')
}
assert(ci.includes('global_country_intelligence_coverage.test.sql'), 'CI omits Phase 8I DB test')
assert(deployData.includes('global_country_intelligence_coverage_smoke.sql')
  && verifyData.includes('global_country_intelligence_coverage_smoke.sql'), 'Data workflows omit Phase 8I smoke')
assert(publicRead.includes('global_country_coverage_status'), 'Public verifier omits Phase 8I')
assert(deployed.includes('manifest.globalCountryCoverage'), 'Web verifier omits Phase 8I')
assert(roadmap.includes('Phase 8I — global country intelligence coverage fabric (implemented foundation)'), 'Roadmap omits Phase 8I')
assert(guide.includes('Every cell starts as'), 'Guide omits explicit-gap contract')

console.log('Global country coverage passed: 195 references and 1,560 evidence gaps remain fail-closed.')
