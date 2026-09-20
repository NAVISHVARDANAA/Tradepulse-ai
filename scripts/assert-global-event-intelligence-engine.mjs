import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const [migration, databaseTest, smoke, query, panel, app, navigation, header,
  agent, browserTest, productionTest, manifestText, packageText, ci,
  deployData, verifyData, buildWeb, deployWeb, verifyWeb, publicRead,
  deployedVerification, roadmap, guide] = await Promise.all([
  read('supabase/migrations/050_global_event_intelligence_engine.sql'),
  read('supabase/tests/database/global_event_intelligence_engine.test.sql'),
  read('supabase/tests/production/global_event_intelligence_engine_smoke.sql'),
  read('src/lib/queries/globalEventIntelligence.ts'),
  read('src/components/GlobalEventIntelligencePanel.tsx'),
  read('src/App.tsx'),
  read('src/components/ProductNavigation.tsx'),
  read('src/components/ProductPageHeader.tsx'),
  read('supabase/functions/run-investing-agent/index.ts'),
  read('tests/e2e/controlled-beta.spec.ts'),
  read('tests/e2e/production-smoke.spec.ts'),
  read('public/beta-release.json'),
  read('package.json'),
  read('.github/workflows/ci.yml'),
  read('.github/workflows/deploy-supabase.yml'),
  read('.github/workflows/verify-supabase-production.yml'),
  read('.github/workflows/build-web-release.yml'),
  read('.github/workflows/deploy-web-production.yml'),
  read('.github/workflows/verify-web-production.yml'),
  read('scripts/verify-public-runtime-read.sh'),
  read('scripts/verify-web-deployment.mjs'),
  read('docs/PRODUCT_ROADMAP.md'),
  read('docs/GLOBAL_EVENT_INTELLIGENCE_ENGINE.md'),
])

for (const table of [
  'global_event_intelligence_controls', 'global_event_source_registry',
  'global_country_intelligence_profiles', 'global_event_records',
  'global_event_entities', 'global_event_entity_links',
  'global_event_impact_edges', 'global_event_analysis_runs',
  'user_global_event_alert_policies',
]) assert(migration.includes(`create table public.${table}`), `Migration omits ${table}`)

for (const view of [
  'global_event_intelligence_status', 'global_event_signal_catalog',
  'global_event_impact_graph', 'global_country_intelligence_coverage',
]) assert(migration.includes(`create view public.${view}`), `Migration omits ${view}`)

for (const contract of [
  'source_authenticity_required', 'multi_source_corroboration_required',
  'causal_impact_graph_enabled', 'scenario_forecasting_enabled',
  'country_coverage_target = 195', 'not raw_web_scraping_enabled',
  'not credentialed_source_bypass_enabled', 'not unlicensed_content_storage_enabled',
  'not automatic_verification_without_evidence_enabled', 'not rumor_promotion_enabled',
  'not autonomous_publication_enabled', 'not production_provider_connectivity_enabled',
  'provider_connectivity_enabled boolean not null default false check (not provider_connectivity_enabled)',
  'provider_coverage_enabled boolean not null default false check (not provider_coverage_enabled)',
  'not autonomous_trade_execution_enabled', 'not customer_funding_enabled',
  'not custody_enabled', 'not settlement_enabled',
  'not synthetic or not model_eligible', 'human_review_required',
  'production_effect boolean not null default false',
  'idx_global_event_records_display_time',
  'Global event intelligence evidence is append-only',
  'Global event alert policy limit reached', 'pg_advisory_xact_lock',
  'asset.symbol = requested.symbol',
]) assert(migration.includes(contract), `Migration contract missing: ${contract}`)

assert(databaseTest.includes('select plan(80)'), 'Phase 8F PgTAP plan changed unexpectedly')
assert(databaseTest.includes('reactivating an inactive policy cannot exceed'), 'Alert-limit test omits inactive-policy reactivation')
assert(migration.match(/source\.enabled/g)?.length >= 8, 'Public event reads are not consistently source-gated')
assert(smoke.includes("to_regprocedure('public.ingest_unlicensed_web_event(jsonb)') is not null"), 'Production smoke omits unlicensed-ingestion absence check')
assert(smoke.includes("auto_publish_global_event(jsonb)"), 'Production smoke omits automatic-publication lock')
assert(query.includes("from('global_event_impact_graph')"), 'Client omits the event impact graph')
assert(query.includes("rpc('save_global_event_alert_policy'"), 'Client omits server-stored private alerts')

for (const copy of [
  'Event impact command center', 'Source-governed event board',
  'Causal impact graph', 'Country coverage ledger',
  'Personal intelligence alerts', 'Rumor promotion off',
  'Synthetic scenario', 'Save private in-app alert',
]) assert(panel.includes(copy), `Global event UI omits: ${copy}`)
assert(app.includes("activeHref === '#global-events'"), 'Application omits the Phase 8F route')
assert(app.includes("import('./components/GlobalEventIntelligencePanel')"), 'Global event workspace is not deferred')
assert(navigation.includes("href: '#global-events'"), 'Product navigation omits global events')
assert(header.includes("title: 'Global event impact engine'"), 'Page header omits global event copy')
assert(browserTest.includes("page.goto('/#global-events')"), 'Controlled-beta browser test omits Phase 8F')
assert(productionTest.includes("'#global-events'"), 'Production browser test omits Phase 8F')

for (const integration of [
  "ORCHESTRATOR_VERSION = 'tradepulse-agentic-research-v1.1.0'",
  "from('global_event_impact_graph')",
  "'event_intelligence_analyst'",
  "type: 'global_event_impact'",
  'globalEventImpactCount',
]) assert(agent.includes(integration), `Agent orchestrator omits Phase 8F integration: ${integration}`)

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
const release = manifest.globalEventIntelligence
assert(manifest.phase === '8L', 'Release manifest is not Phase 8F')
assert(manifest.status === 'global_provider_certification_isolated_intake_candidate', 'Release status is not the Phase 8F candidate')
assert(packageJson.scripts?.['check:global-event-intelligence'], 'Package scripts omit the Phase 8F check')
assert(manifest.requiredChecks.includes('check:global-event-intelligence'), 'Manifest omits the Phase 8F check')
for (const capability of [
  'workspaceEnabled', 'sourceAuthenticityRequired',
  'multiSourceCorroborationRequired', 'causalImpactGraphEnabled',
  'scenarioForecastingEnabled', 'personalizedAlertsEnabled',
  'privateInAppAlerts', 'humanReviewRequired',
]) assert(release?.[capability] === true, `Phase 8F capability is not true: ${capability}`)
for (const lock of [
  'syntheticModelTrainingEnabled', 'rawWebScrapingEnabled',
  'credentialedSourceBypassEnabled', 'unlicensedContentStorageEnabled',
  'automaticVerificationWithoutEvidenceEnabled', 'rumorPromotionEnabled',
  'autonomousPublicationEnabled', 'productionProviderConnectivityEnabled',
  'autonomousTradeExecutionEnabled', 'customerFundingEnabled',
  'custodyEnabled', 'settlementEnabled',
]) assert(release?.[lock] === false, `Phase 8F lock is not false: ${lock}`)
assert(release?.countryCoverageTarget === 195, 'Phase 8F country coverage target changed')
assert(release?.cataloguedCountryCount === 12, 'Phase 8F current country catalogue count changed')
assert(release?.syntheticEventCount === 5, 'Phase 8F synthetic event count changed')
assert(release?.causalImpactEdgeCount === 9, 'Phase 8F causal edge count changed')
assert(release?.terminalScenarioCount === 6, 'Phase 8F terminal scenario count changed')

for (const [workflow, confirmation] of [
  [deployData, 'DEPLOY_DATA_PHASE_8L'], [verifyData, 'VERIFY_DATA_PHASE_8L'],
  [buildWeb, 'BUILD_PHASE_8L'], [deployWeb, 'DEPLOY_PHASE_8L'],
  [verifyWeb, 'VERIFY_WEB_PHASE_8L'],
]) assert(workflow.includes(confirmation), `Workflow omits ${confirmation}`)
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:global-event-intelligence'), 'A web gate omits the Phase 8F check')
}
assert(ci.includes('global_event_intelligence_engine.test.sql'), 'CI omits Phase 8F database tests')
assert(ci.includes('deno check supabase/functions/run-investing-agent/index.ts'), 'CI no longer checks the integrated agent')
assert(deployData.includes('global_event_intelligence_engine_smoke.sql'), 'Data deploy omits Phase 8F smoke')
assert(verifyData.includes('global_event_intelligence_engine_smoke.sql'), 'Data verification omits Phase 8F smoke')
assert(publicRead.includes('global_event_impact_graph'), 'Public runtime check omits causal event impacts')
assert(deployedVerification.includes('manifest.globalEventIntelligence'), 'Deployed verification omits Phase 8F locks')
assert(roadmap.includes('Phase 8F — global event intelligence engine (implemented foundation)'), 'Roadmap omits implemented Phase 8F foundation')
assert(roadmap.includes('Phase 8G — controlled international live rollout'), 'Roadmap does not preserve the controlled live rollout')
assert(guide.includes('Probability describes the'), 'Phase 8F guide omits probability/confidence separation')

console.log('Global event intelligence passed: source authenticity, causal scenarios, explicit country gaps and private alerts are fail-closed.')
