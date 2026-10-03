import { readFile } from 'node:fs/promises'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const [migration, test, smoke, query, panel, app, navigation, header, browser,
  production, manifestText, packageText, ci, deployData, verifyData, buildWeb,
  deployWeb, verifyWeb, publicRead, deployed, roadmap, guide] = await Promise.all([
  'supabase/migrations/064_external_audience_launch_readiness.sql',
  'supabase/tests/database/external_audience_launch_readiness.test.sql',
  'supabase/tests/production/external_audience_launch_readiness_smoke.sql',
  'src/lib/queries/externalAudienceLaunchReadiness.ts',
  'src/components/ExternalAudienceLaunchReadinessPanel.tsx', 'src/App.tsx',
  'src/components/ProductNavigation.tsx', 'src/components/ProductPageHeader.tsx',
  'tests/e2e/controlled-beta.spec.ts', 'tests/e2e/production-smoke.spec.ts',
  'public/beta-release.json', 'package.json', '.github/workflows/ci.yml',
  '.github/workflows/deploy-supabase.yml', '.github/workflows/verify-supabase-production.yml',
  '.github/workflows/build-web-release.yml', '.github/workflows/deploy-web-production.yml',
  '.github/workflows/verify-web-production.yml', 'scripts/verify-public-runtime-read.sh',
  'scripts/verify-web-deployment.mjs', 'docs/PRODUCT_ROADMAP.md',
  'docs/EXTERNAL_AUDIENCE_LAUNCH_READINESS.md',
].map(read))

for (const table of ['external_audience_launch_controls',
  'external_audience_launch_state_templates', 'external_audience_launch_surface_templates',
  'external_audience_launch_gate_templates', 'external_audience_launch_readiness_matrix']) {
  assert(migration.includes(`create table public.${table}`), `Missing ${table}`)
}
for (const view of ['external_audience_launch_status', 'external_audience_launch_state_catalog',
  'external_audience_launch_surface_catalog', 'external_audience_launch_gate_catalog',
  'external_audience_launch_readiness_catalog']) {
  assert(migration.includes(`create view public.${view}`), `Missing ${view}`)
}
for (const contract of ['audience_surface_target = 8', 'launch_gate_target = 8',
  'readiness_cell_target = 64', 'launch_state_target = 7',
  'protected_production_domain_required', 'exact_auth_origin_and_redirects_required',
  'custom_auth_delivery_and_abuse_controls_required',
  'published_legal_privacy_risk_support_required',
  'production_monitoring_on_call_incident_required',
  'approved_external_cohort_and_feedback_required',
  'accessibility_performance_capacity_evidence_required',
  'data_rights_freshness_and_labels_required', 'release_rollback_expiry_required',
  'independent_human_launch_authorization_required', 'not public_signup_enabled',
  'not unrestricted_discovery_enabled', 'not automated_tester_provisioning_enabled',
  'not external_audience_activation_enabled', 'not live_provider_connectivity_enabled',
  'not production_credential_storage_enabled', 'not production_payload_intake_enabled',
  'not unrestricted_customer_data_collection_enabled', 'not autonomous_publication_enabled',
  'not model_training_enabled', 'not live_order_routing_enabled',
  'not payment_execution_enabled', 'not money_movement_enabled', 'not custody_enabled',
  'not settlement_enabled', 'External audience launch-readiness reference records are append-only']) {
  assert(migration.includes(contract), `Missing Phase 8U launch boundary: ${contract}`)
}
for (const state of ['launch_not_requested', 'operational_evidence_required',
  'remediation_required', 'independent_verification_required',
  'bounded_cohort_authorization_required', 'monitored_launch_window_required',
  'closed_or_revoked']) {
  assert(migration.includes(`'${state}'`), `Missing launch state: ${state}`)
}
for (const surface of ['public_market_dashboard', 'equity_research_and_watchlists',
  'agentic_analysis_and_reports', 'country_event_and_dependency_intelligence',
  'paper_trading_and_education', 'account_security_and_privacy',
  'support_feedback_and_incidents', 'beta_operations_and_status']) {
  assert(migration.includes(`'${surface}'`), `Missing audience surface: ${surface}`)
}
assert((migration.match(/^  \([1-8],'.*','(?:hosting|identity|legal|operations|cohort|quality|data|release)','.*','.*'\)[,;]$/gm) ?? []).length === 8,
  'Expected eight external audience launch gate templates')
assert(test.includes('select plan(45)'), 'PgTAP plan changed')
assert(smoke.includes('external_audience_launch_status'), 'Smoke omits launch status')

for (const view of ['external_audience_launch_status', 'external_audience_launch_state_catalog',
  'external_audience_launch_surface_catalog', 'external_audience_launch_gate_catalog',
  'external_audience_launch_readiness_catalog']) {
  assert(query.includes(`from('${view}')`), `Client omits ${view}`)
}
for (const copy of ['External audience launch readiness',
  'No external audience is activated in Phase 8U', 'Eight production launch gates',
  'Seven manual launch states',
  'Phase 8U is production launch-readiness scaffolding, not public launch authorization']) {
  assert(panel.includes(copy), `UI omits ${copy}`)
}
assert(app.includes("activeHref === '#audience-launch-readiness'"), 'App omits audience launch-readiness route')
assert(app.includes("import('./components/ExternalAudienceLaunchReadinessPanel')"), 'Audience launch-readiness route is not lazy')
assert(navigation.includes("href: '#audience-launch-readiness'"), 'Navigation omits audience launch-readiness route')
assert(header.includes("'#audience-launch-readiness'"), 'Header omits audience launch-readiness route')
assert(browser.includes("page.goto('/#audience-launch-readiness')"), 'E2E omits audience launch-readiness route')
assert(production.includes("'#audience-launch-readiness'"), 'Production test omits audience launch-readiness route')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
const release = manifest.externalAudienceLaunchReadiness
assert(manifest.phase === '8W' && manifest.status === 'licensed_provider_commercial_readiness_candidate',
  'Manifest is not Phase 8W')
assert(packageJson.scripts?.['check:external-audience-launch-readiness'], 'Package omits Phase 8U check')
assert(manifest.requiredChecks.includes('check:external-audience-launch-readiness'), 'Manifest omits Phase 8U check')
for (const key of ['workspaceEnabled', 'protectedProductionDomainRequired',
  'exactAuthOriginAndRedirectsRequired', 'customAuthDeliveryAndAbuseControlsRequired',
  'publishedLegalPrivacyRiskSupportRequired', 'productionMonitoringOnCallIncidentRequired',
  'approvedExternalCohortAndFeedbackRequired',
  'accessibilityPerformanceCapacityEvidenceRequired', 'dataRightsFreshnessAndLabelsRequired',
  'releaseRollbackExpiryRequired', 'independentHumanLaunchAuthorizationRequired',
  'appendOnlyReferenceContracts']) {
  assert(release?.[key] === true, `${key} is not true`)
}
for (const key of ['publicSignupEnabled', 'unrestrictedDiscoveryEnabled',
  'automatedTesterProvisioningEnabled', 'externalAudienceActivationEnabled',
  'liveProviderConnectivityEnabled', 'productionCredentialStorageEnabled',
  'productionPayloadIntakeEnabled', 'unrestrictedCustomerDataCollectionEnabled',
  'autonomousPublicationEnabled', 'modelTrainingEnabled', 'liveOrderRoutingEnabled',
  'paymentExecutionEnabled', 'moneyMovementEnabled', 'custodyEnabled', 'settlementEnabled']) {
  assert(release?.[key] === false, `${key} is not false`)
}
assert(release?.audienceSurfaceCount === 8 && release?.launchGateCount === 8
  && release?.launchStateCount === 7 && release?.readinessCellCount === 64,
  'External audience launch-readiness catalog counts changed')
assert(release?.blockedReadinessCellCount === 64 && release?.authorizedReadinessCellCount === 0,
  'External audience launch-readiness counts changed')

for (const [workflow, token] of [[deployData, 'DEPLOY_DATA_PHASE_8W'],
  [verifyData, 'VERIFY_DATA_PHASE_8W'], [buildWeb, 'BUILD_PHASE_8W'],
  [deployWeb, 'DEPLOY_PHASE_8W'], [verifyWeb, 'VERIFY_WEB_PHASE_8W']]) {
  assert(workflow.includes(token), `Workflow omits ${token}`)
}
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:external-audience-launch-readiness'), 'Web gate omits external audience launch-readiness check')
}
assert(ci.includes('external_audience_launch_readiness.test.sql'), 'CI omits Phase 8U DB test')
assert(deployData.includes('external_audience_launch_readiness_smoke.sql')
  && verifyData.includes('external_audience_launch_readiness_smoke.sql'),
  'Data workflows omit Phase 8U smoke')
assert(deployData.includes("grep -Eq '(^|[^0-9])066([^0-9]|$)'"), 'Data deployment does not verify migration 066')
assert(verifyData.includes("grep -Eq '(^|[^0-9])066([^0-9]|$)'"), 'Data verification does not verify migration 066')
assert(publicRead.includes('external_audience_launch_status'), 'Public verifier omits Phase 8U')
assert(deployed.includes('manifest.externalAudienceLaunchReadiness'), 'Web verifier omits Phase 8U')
assert(roadmap.includes('Phase 8U — external audience production launch readiness (implemented foundation)'),
  'Roadmap omits Phase 8U')
assert(guide.includes('No real external audience') && guide.includes('No public signup'),
  'Guide omits the fail-closed launch boundary')

console.log('External audience launch readiness passed: 64 blocked cells, zero authorizations and no audience or production effects.')
