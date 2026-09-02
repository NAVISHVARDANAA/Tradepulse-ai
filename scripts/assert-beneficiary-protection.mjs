import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => { if (!condition) throw new Error(message) }

const [
  migration, logic, query, panel, app, navigation, header, styles,
  databaseTest, productionSmoke, browserTest, productionBrowserTest,
  manifestText, packageText, ci, deployData, verifyData, buildWeb, deployWeb,
  verifyWeb, roadmap, guide,
] = await Promise.all([
  read('supabase/migrations/041_beneficiary_protection.sql'),
  read('src/lib/beneficiaryProtection.ts'),
  read('src/lib/queries/referenceData.ts'),
  read('src/components/PaymentQuotePanel.tsx'),
  read('src/App.tsx'),
  read('src/components/ProductNavigation.tsx'),
  read('src/components/ProductPageHeader.tsx'),
  read('src/index.css'),
  read('supabase/tests/database/beneficiary_protection.test.sql'),
  read('supabase/tests/production/beneficiary_protection_smoke.sql'),
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
  read('docs/PRODUCT_ROADMAP.md'),
  read('docs/BENEFICIARY_PROTECTION.md'),
])

for (const contract of [
  'payment_beneficiary_protection_controls',
  'payment_beneficiary_protection_rules',
  'payment_beneficiary_protection_reference',
  "data_mode = 'synthetic_rehearsal'",
  'check (not real_beneficiary_collection_enabled)',
  'check (not beneficiary_identifier_storage_enabled)',
  'check (not validation_provider_connectivity_enabled)',
  'check (not beneficiary_creation_enabled)',
  'check (not duplicate_override_enabled)',
  'check (not cooling_off_bypass_enabled)',
  'priority integer not null unique',
  "to_regclass('public.payment_beneficiaries') is not null",
  "to_regprocedure('public.create_payment_beneficiary(jsonb)') is not null",
]) assert(migration.includes(contract), `Beneficiary protection migration omits: ${contract}`)

for (const contract of [
  'evaluateBeneficiaryProtection',
  "'clear_rehearsal'",
  "'manual_review'",
  "'cooling_off'",
  "'blocked'",
  'Math.max(hours, rule.coolingOffHours)',
]) assert(logic.includes(contract), `Beneficiary protection logic omits: ${contract}`)

assert(query.includes("from('payment_beneficiary_protection_reference')"), 'Protection query does not use the sanitized view')
for (const contract of [
  'See the intervention before the payment',
  'No names, accounts or addresses',
  'Nothing is saved or sent',
  'No rule triggered',
  'Real beneficiary data is neither requested nor stored',
]) assert(panel.includes(contract), `Beneficiary protection workspace omits: ${contract}`)

assert(app.includes('getBeneficiaryProtectionRules'), 'Application omits beneficiary protection loading')
assert(navigation.includes("label: 'Payment protection'"), 'Navigation omits payment protection')
assert(header.includes("title: 'Beneficiary protection'"), 'Page header omits beneficiary protection')
assert(styles.includes('.beneficiary-rule-grid'), 'Beneficiary protection styles are missing')
assert(databaseTest.includes('select plan(56)'), 'Beneficiary protection database contract count changed')
assert(productionSmoke.includes('A beneficiary or payment execution path unexpectedly exists'), 'Production beneficiary lock guard is missing')
assert(browserTest.includes("name: 'See the intervention before the payment'"), 'Browser test omits beneficiary intervention')
assert(productionBrowserTest.includes("['#payments', 'Beneficiary protection']"), 'Production smoke omits beneficiary protection')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
assert(manifest.phase === '7B', 'Release manifest is not Phase 7B')
assert(manifest.status === 'beneficiary_protection_candidate', 'Release status is not the beneficiary protection candidate')
for (const [key, expected] of Object.entries({
  workspaceEnabled: true,
  syntheticRehearsalOnly: true,
  ruleCount: 7,
  validationRulesVisible: true,
  duplicateDetectionVisible: true,
  coolingOffVisible: true,
  scamInterventionsVisible: true,
  realBeneficiaryCollectionEnabled: false,
  beneficiaryIdentifierStorageEnabled: false,
  validationProviderConnectivityEnabled: false,
  beneficiaryCreationEnabled: false,
  duplicateOverrideEnabled: false,
  coolingOffBypassEnabled: false,
  quoteAcceptanceEnabled: false,
  transferCreationEnabled: false,
  paymentExecutionEnabled: false,
  moneyMovementEnabled: false,
})) assert(manifest.beneficiaryProtection?.[key] === expected, `Manifest beneficiary protection mismatch: ${key}`)
assert(manifest.requiredChecks.includes('check:beneficiary-protection'), 'Manifest omits beneficiary protection check')
assert(packageJson.scripts?.['check:beneficiary-protection'], 'Package beneficiary protection check is missing')

for (const [workflow, contract] of [
  [deployData, 'DEPLOY_DATA_PHASE_7B'],
  [verifyData, 'VERIFY_DATA_PHASE_7B'],
  [buildWeb, 'BUILD_PHASE_7B'],
  [deployWeb, 'DEPLOY_PHASE_7B'],
  [verifyWeb, 'VERIFY_WEB_PHASE_7B'],
]) assert(workflow.includes(contract), `Release workflow omits ${contract}`)
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:beneficiary-protection'), 'A web gate omits beneficiary protection')
}
assert(ci.includes('beneficiary_protection.test.sql'), 'CI omits beneficiary protection database tests')
assert(deployData.includes('beneficiary_protection_smoke.sql'), 'Data deploy omits beneficiary protection smoke')
assert(verifyData.includes('beneficiary_protection_smoke.sql'), 'Data verification omits beneficiary protection smoke')
assert(roadmap.includes('Phase 7B — beneficiary protection (implemented foundation)'), 'Roadmap omits Phase 7B foundation')
assert(guide.includes('A no-signal result is called **No rule triggered**'), 'Operating guide overstates a no-signal result')

for (const lock of ['liveBrokerageExecution', 'paymentExecution', 'chargeCollection', 'custody', 'personalizedAdvice']) {
  assert(manifest.hardLocks?.[lock] === false, `${lock} must remain hard locked`)
}

console.log('Beneficiary protection passed: synthetic interventions store no beneficiary data and expose no payment path.')
