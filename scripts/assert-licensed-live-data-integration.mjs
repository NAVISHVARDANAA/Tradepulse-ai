import { readFile } from 'node:fs/promises'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const [migration, test, smoke, query, panel, app, navigation, header, browser,
  production, manifestText, packageText, ci, deployData, verifyData, buildWeb,
  deployWeb, verifyWeb, publicRead, deployed, roadmap, guide] = await Promise.all([
  'supabase/migrations/065_licensed_live_data_integration.sql',
  'supabase/tests/database/licensed_live_data_integration.test.sql',
  'supabase/tests/production/licensed_live_data_integration_smoke.sql',
  'src/lib/queries/licensedLiveDataIntegration.ts',
  'src/components/LicensedLiveDataIntegrationPanel.tsx', 'src/App.tsx',
  'src/components/ProductNavigation.tsx', 'src/components/ProductPageHeader.tsx',
  'tests/e2e/controlled-beta.spec.ts', 'tests/e2e/production-smoke.spec.ts',
  'public/beta-release.json', 'package.json', '.github/workflows/ci.yml',
  '.github/workflows/deploy-supabase.yml', '.github/workflows/verify-supabase-production.yml',
  '.github/workflows/build-web-release.yml', '.github/workflows/deploy-web-production.yml',
  '.github/workflows/verify-web-production.yml', 'scripts/verify-public-runtime-read.sh',
  'scripts/verify-web-deployment.mjs', 'docs/PRODUCT_ROADMAP.md',
  'docs/LICENSED_LIVE_DATA_INTEGRATION.md',
].map(read))

for (const table of ['licensed_live_data_integration_controls',
  'licensed_live_data_integration_state_templates', 'licensed_live_data_feed_templates',
  'licensed_live_data_gate_templates', 'licensed_live_data_readiness_matrix']) {
  assert(migration.includes(`create table public.${table}`), `Missing ${table}`)
}
for (const view of ['licensed_live_data_integration_status', 'licensed_live_data_state_catalog',
  'licensed_live_data_feed_catalog', 'licensed_live_data_gate_catalog',
  'licensed_live_data_readiness_catalog']) {
  assert(migration.includes(`create view public.${view}`), `Missing ${view}`)
}
for (const contract of ['feed_class_target = 8', 'integration_gate_target = 8',
  'readiness_cell_target = 64', 'integration_state_target = 7',
  'executed_data_license_required', 'permitted_display_and_derived_use_required',
  'jurisdiction_and_audience_entitlements_required',
  'credential_vault_and_egress_controls_required',
  'schema_identity_and_corporate_action_mapping_required',
  'freshness_clock_quality_and_gap_controls_required',
  'quota_backpressure_replay_and_failover_required',
  'observability_cost_incident_and_rollback_required',
  'independent_human_integration_authorization_required', 'not provider_selected',
  'not live_provider_connectivity_enabled', 'not production_credential_storage_enabled',
  'not production_payload_intake_enabled', 'not live_data_display_enabled',
  'not derived_data_publication_enabled', 'not model_training_enabled',
  'not external_audience_activation_enabled', 'not public_signup_enabled',
  'not live_order_routing_enabled', 'not payment_execution_enabled',
  'not money_movement_enabled', 'not custody_enabled', 'not settlement_enabled',
  'Licensed live-data integration reference records are append-only']) {
  assert(migration.includes(contract), `Missing Phase 8V integration boundary: ${contract}`)
}
for (const state of ['integration_not_requested', 'license_evidence_required',
  'entitlement_mapping_required', 'isolated_certification_required',
  'production_canary_authorization_required', 'monitored_live_data_window_required',
  'suspended_or_revoked']) {
  assert(migration.includes(`'${state}'`), `Missing integration state: ${state}`)
}
for (const feed of ['instrument_reference_master', 'venue_calendars_and_sessions',
  'quotes_and_top_of_book', 'trades_and_aggregated_bars',
  'corporate_actions_and_identifiers', 'fundamentals_and_company_reference',
  'fx_rates_and_cross_asset_reference', 'news_events_and_source_metadata']) {
  assert(migration.includes(`'${feed}'`), `Missing licensed feed class: ${feed}`)
}
assert((migration.match(/^  \([1-8],'.*','(?:legal|entitlement|security|mapping|quality|resilience|operations|release)','.*','.*'\)[,;]$/gm) ?? []).length === 8,
  'Expected eight licensed live-data integration gates')
assert(test.includes('select plan(46)'), 'PgTAP plan changed')
assert(smoke.includes('licensed_live_data_integration_status'), 'Smoke omits integration status')

for (const view of ['licensed_live_data_integration_status', 'licensed_live_data_state_catalog',
  'licensed_live_data_feed_catalog', 'licensed_live_data_gate_catalog',
  'licensed_live_data_readiness_catalog']) {
  assert(query.includes(`from('${view}')`), `Client omits ${view}`)
}
for (const copy of ['Licensed live-data integration',
  'No licensed live-data provider is connected in Phase 8V',
  'Eight licensed live-data gates', 'Seven manual integration states',
  'Phase 8V is licensed live-data integration scaffolding, not a provider connection or real-user beta']) {
  assert(panel.includes(copy), `UI omits ${copy}`)
}
assert(app.includes("activeHref === '#licensed-live-data'"), 'App omits licensed live-data route')
assert(app.includes("import('./components/LicensedLiveDataIntegrationPanel')"), 'Licensed live-data route is not lazy')
assert(navigation.includes("href: '#licensed-live-data'"), 'Navigation omits licensed live-data route')
assert(header.includes("'#licensed-live-data'"), 'Header omits licensed live-data route')
assert(browser.includes("page.goto('/#licensed-live-data')"), 'E2E omits licensed live-data route')
assert(production.includes("'#licensed-live-data'"), 'Production test omits licensed live-data route')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
const release = manifest.licensedLiveDataIntegration
assert(manifest.phase === '8Z' && manifest.status === 'licensed_realtime_data_activation_candidate',
  'Manifest is not Phase 8V')
assert(packageJson.scripts?.['check:licensed-live-data-integration'], 'Package omits Phase 8V check')
assert(manifest.requiredChecks.includes('check:licensed-live-data-integration'), 'Manifest omits Phase 8V check')
for (const key of ['workspaceEnabled', 'executedDataLicenseRequired',
  'permittedDisplayAndDerivedUseRequired', 'jurisdictionAndAudienceEntitlementsRequired',
  'credentialVaultAndEgressControlsRequired',
  'schemaIdentityAndCorporateActionMappingRequired',
  'freshnessClockQualityAndGapControlsRequired',
  'quotaBackpressureReplayAndFailoverRequired',
  'observabilityCostIncidentAndRollbackRequired',
  'independentHumanIntegrationAuthorizationRequired', 'appendOnlyReferenceContracts']) {
  assert(release?.[key] === true, `${key} is not true`)
}
for (const key of ['providerSelected', 'liveProviderConnectivityEnabled',
  'productionCredentialStorageEnabled', 'productionPayloadIntakeEnabled',
  'liveDataDisplayEnabled', 'derivedDataPublicationEnabled', 'modelTrainingEnabled',
  'externalAudienceActivationEnabled', 'publicSignupEnabled', 'liveOrderRoutingEnabled',
  'paymentExecutionEnabled', 'moneyMovementEnabled', 'custodyEnabled', 'settlementEnabled']) {
  assert(release?.[key] === false, `${key} is not false`)
}
assert(release?.feedClassCount === 8 && release?.integrationGateCount === 8
  && release?.integrationStateCount === 7 && release?.readinessCellCount === 64,
  'Licensed live-data integration catalog counts changed')
assert(release?.blockedReadinessCellCount === 64 && release?.authorizedReadinessCellCount === 0,
  'Licensed live-data integration counts changed')

for (const [workflow, token] of [[deployData, 'DEPLOY_DATA_PHASE_8Z'],
  [verifyData, 'VERIFY_DATA_PHASE_8Z'], [buildWeb, 'BUILD_PHASE_8Z'],
  [deployWeb, 'DEPLOY_PHASE_8Z'], [verifyWeb, 'VERIFY_WEB_PHASE_8Z']]) {
  assert(workflow.includes(token), `Workflow omits ${token}`)
}
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:licensed-live-data-integration'), 'Web gate omits licensed live-data integration check')
}
assert(ci.includes('licensed_live_data_integration.test.sql'), 'CI omits Phase 8V DB test')
assert(deployData.includes('licensed_live_data_integration_smoke.sql')
  && verifyData.includes('licensed_live_data_integration_smoke.sql'),
  'Data workflows omit Phase 8V smoke')
assert(deployData.includes("grep -Eq '(^|[^0-9])066([^0-9]|$)'"), 'Data deployment does not verify migration 066')
assert(verifyData.includes("grep -Eq '(^|[^0-9])066([^0-9]|$)'"), 'Data verification does not verify migration 066')
assert(publicRead.includes('licensed_live_data_integration_status'), 'Public verifier omits Phase 8V')
assert(deployed.includes('manifest.licensedLiveDataIntegration'), 'Web verifier omits Phase 8V')
assert(roadmap.includes('Phase 8V — licensed live-data integration (implemented foundation)'),
  'Roadmap omits Phase 8V')
assert(guide.includes('No provider, credential or real payload') && guide.includes('No live display'),
  'Guide omits the fail-closed integration boundary')

console.log('Licensed live-data integration passed: 64 blocked cells, zero authorizations and no provider, payload, display or production effects.')
