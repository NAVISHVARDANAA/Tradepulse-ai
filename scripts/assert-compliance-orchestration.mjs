import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => { if (!condition) throw new Error(message) }

const [
  migration, logic, query, panel, app, navigation, header, styles,
  databaseTest, productionSmoke, browserTest, productionBrowserTest,
  manifestText, packageText, ci, deployData, verifyData, buildWeb, deployWeb,
  verifyWeb, publicRead, deployedVerification, roadmap, guide,
] = await Promise.all([
  read('supabase/migrations/042_payment_compliance_orchestration.sql'),
  read('src/lib/complianceOrchestration.ts'),
  read('src/lib/queries/referenceData.ts'),
  read('src/components/PaymentQuotePanel.tsx'),
  read('src/App.tsx'),
  read('src/components/ProductNavigation.tsx'),
  read('src/components/ProductPageHeader.tsx'),
  read('src/index.css'),
  read('supabase/tests/database/payment_compliance_orchestration.test.sql'),
  read('supabase/tests/production/payment_compliance_orchestration_smoke.sql'),
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
  read('docs/COMPLIANCE_ORCHESTRATION.md'),
])

for (const contract of [
  'payment_compliance_orchestration_controls',
  'payment_compliance_workflow_requirements',
  'payment_compliance_orchestration_reference',
  "data_mode = 'synthetic_case_rehearsal'",
  'check (not real_identity_collection_enabled)',
  'check (not document_upload_enabled)',
  'check (not pii_storage_enabled)',
  'check (not compliance_provider_connectivity_enabled)',
  'check (not live_sanctions_screening_enabled)',
  'check (not transaction_monitoring_connectivity_enabled)',
  'check (not travel_rule_transmission_enabled)',
  'check (not compliance_case_writes_enabled)',
  'check (not automated_clearance_enabled)',
  'check (not manual_override_enabled)',
  "to_regclass('public.payment_compliance_cases') is not null",
  "to_regprocedure('public.clear_payment_compliance(jsonb)') is not null",
]) assert(migration.includes(contract), `Compliance orchestration migration omits: ${contract}`)

for (const stage of ["'kyc'", "'kyb'", "'aml'", "'sanctions'", "'transaction_monitoring'", "'travel_rule'", "'audit'"]) {
  assert(migration.includes(stage), `Compliance orchestration omits stage: ${stage}`)
}
for (const contract of [
  'buildComplianceOrchestration',
  "'individual'",
  "'business'",
  "'unavailable'",
  "'review_required'",
  "'blocked'",
]) assert(logic.includes(contract), `Compliance orchestration logic omits: ${contract}`)

assert(query.includes("from('payment_compliance_orchestration_reference')"), 'Compliance query does not use the sanitized view')
for (const contract of [
  'Map compliance gates before any payment',
  'No documents, identities or live screening',
  'Individual remittance',
  'Business supplier payment',
  'Review owner',
  'Compliance activation blocked',
  'travel-rule transmission, case writes, automated clearance and manual overrides are disabled',
]) assert(panel.includes(contract), `Compliance orchestration workspace omits: ${contract}`)

assert(app.includes('getPaymentComplianceRequirements'), 'Application omits compliance orchestration loading')
assert(navigation.includes("label: 'Payment compliance'"), 'Navigation omits payment compliance')
assert(header.includes("title: 'Payment compliance orchestration'"), 'Page header omits payment compliance orchestration')
assert(styles.includes('.compliance-stage-grid'), 'Compliance orchestration styles are missing')
assert(databaseTest.includes('select plan(67)'), 'Compliance orchestration database contract count changed')
assert(productionSmoke.includes('A real compliance clearance, identity collection or payment execution path unexpectedly exists'), 'Production compliance lock guard is missing')
assert(browserTest.includes("name: 'Map compliance gates before any payment'"), 'Browser test omits compliance orchestration')
assert(browserTest.includes("selectOption('business')"), 'Browser test omits the business compliance journey')
assert(productionBrowserTest.includes("['#payments', 'Payment compliance orchestration']"), 'Production smoke omits payment compliance orchestration')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
assert(manifest.phase === '7C', 'Release manifest is not Phase 7C')
assert(manifest.status === 'compliance_orchestration_candidate', 'Release status is not the compliance orchestration candidate')
for (const [key, expected] of Object.entries({
  workspaceEnabled: true,
  syntheticCaseRehearsalOnly: true,
  corridorCount: 4,
  requirementCount: 28,
  individualStageCount: 6,
  businessStageCount: 6,
  kycVisible: true,
  kybVisible: true,
  amlVisible: true,
  sanctionsVisible: true,
  transactionMonitoringVisible: true,
  travelRuleVisible: true,
  auditWorkflowVisible: true,
  realIdentityCollectionEnabled: false,
  documentUploadEnabled: false,
  piiStorageEnabled: false,
  complianceProviderConnectivityEnabled: false,
  liveSanctionsScreeningEnabled: false,
  transactionMonitoringConnectivityEnabled: false,
  travelRuleTransmissionEnabled: false,
  complianceCaseWritesEnabled: false,
  automatedClearanceEnabled: false,
  manualOverrideEnabled: false,
  quoteAcceptanceEnabled: false,
  transferCreationEnabled: false,
  paymentExecutionEnabled: false,
  moneyMovementEnabled: false,
})) assert(manifest.complianceOrchestration?.[key] === expected, `Manifest compliance orchestration mismatch: ${key}`)
assert(manifest.requiredChecks.includes('check:compliance-orchestration'), 'Manifest omits compliance orchestration check')
assert(packageJson.scripts?.['check:compliance-orchestration'], 'Package compliance orchestration check is missing')

for (const [workflow, contract] of [
  [deployData, 'DEPLOY_DATA_PHASE_7C'],
  [verifyData, 'VERIFY_DATA_PHASE_7C'],
  [buildWeb, 'BUILD_PHASE_7C'],
  [deployWeb, 'DEPLOY_PHASE_7C'],
  [verifyWeb, 'VERIFY_WEB_PHASE_7C'],
]) assert(workflow.includes(contract), `Release workflow omits ${contract}`)
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:compliance-orchestration'), 'A web gate omits compliance orchestration')
}
assert(ci.includes('payment_compliance_orchestration.test.sql'), 'CI omits compliance orchestration database tests')
assert(deployData.includes('payment_compliance_orchestration_smoke.sql'), 'Data deploy omits compliance orchestration smoke')
assert(verifyData.includes('payment_compliance_orchestration_smoke.sql'), 'Data verification omits compliance orchestration smoke')
assert(publicRead.includes('payment_compliance_orchestration_reference'), 'Public runtime check omits compliance reference')
assert(deployedVerification.includes('manifest.complianceOrchestration'), 'Deployed manifest check omits compliance orchestration')
assert(roadmap.includes('Phase 7C — compliance orchestration (implemented foundation)'), 'Roadmap omits Phase 7C foundation')
assert(guide.includes('No real identity, document, screening response, case or payment data is collected'), 'Operating guide omits the no-data boundary')

for (const lock of ['liveBrokerageExecution', 'paymentExecution', 'chargeCollection', 'custody', 'personalizedAdvice']) {
  assert(manifest.hardLocks?.[lock] === false, `${lock} must remain hard locked`)
}

console.log('Compliance orchestration passed: synthetic corridor requirements expose no identity, clearance or payment path.')
