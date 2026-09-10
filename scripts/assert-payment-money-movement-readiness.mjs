import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const [
  migration,
  databaseTest,
  productionSmoke,
  component,
  header,
  navigation,
  platformReadiness,
  types,
  queries,
  app,
  browserTest,
  productionBrowserTest,
  guide,
  roadmap,
  releaseGuide,
  hostingGuide,
  supabaseGuide,
  publicRead,
  deployedVerification,
  ci,
  deployData,
  verifyData,
  buildWeb,
  deployWeb,
  verifyWeb,
  manifestText,
  packageText,
] = await Promise.all([
  read('supabase/migrations/044_payment_money_movement_readiness.sql'),
  read('supabase/tests/database/payment_money_movement_readiness.test.sql'),
  read('supabase/tests/production/payment_money_movement_readiness_smoke.sql'),
  read('src/components/PaymentQuotePanel.tsx'),
  read('src/components/ProductPageHeader.tsx'),
  read('src/components/ProductNavigation.tsx'),
  read('src/components/PlatformReadiness.tsx'),
  read('src/types/domain.ts'),
  read('src/lib/queries/referenceData.ts'),
  read('src/App.tsx'),
  read('tests/e2e/controlled-beta.spec.ts'),
  read('tests/e2e/production-smoke.spec.ts'),
  read('docs/CONTROLLED_MONEY_MOVEMENT.md'),
  read('docs/PRODUCT_ROADMAP.md'),
  read('docs/BETA_RELEASE_CANDIDATE.md'),
  read('docs/CLOUDFLARE_PAGES_HOSTING.md'),
  read('docs/SUPABASE_DEPLOYMENT.md'),
  read('scripts/verify-public-runtime-read.sh'),
  read('scripts/verify-web-deployment.mjs'),
  read('.github/workflows/ci.yml'),
  read('.github/workflows/deploy-supabase.yml'),
  read('.github/workflows/verify-supabase-production.yml'),
  read('.github/workflows/build-web-release.yml'),
  read('.github/workflows/deploy-web-production.yml'),
  read('.github/workflows/verify-web-production.yml'),
  read('public/beta-release.json'),
  read('package.json'),
])

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)

for (const contract of [
  'payment_money_movement_controls',
  'payment_money_movement_requirements',
  'payment_money_movement_approval_evidence',
  'payment_money_movement_readiness_reference',
  'payment_money_movement_readiness_summary',
  'persist_payment_money_movement_approval_evidence',
  'controlled-money-movement',
  'legal_authorization',
  'regulated_partner_agreement',
  'partner_production_certification',
  'safeguarding_account_structure',
  'customer_funds_reconciliation',
  'kyc_kyb_program',
  'aml_sanctions_monitoring',
  'source_of_funds_controls',
  'security_privacy_review',
  'treasury_liquidity_fx_controls',
  'operational_resilience',
  'customer_protection_redress',
  'security_invoker = true',
]) assert(migration.includes(contract), `Migration omits ${contract}`)

for (const lock of [
  'real_customer_data_enabled',
  'real_beneficiary_data_enabled',
  'production_partner_connectivity_enabled',
  'safeguarding_account_activation_enabled',
  'customer_funding_enabled',
  'quote_acceptance_enabled',
  'transfer_creation_enabled',
  'webhook_ingestion_enabled',
  'financial_ledger_posting_enabled',
  'reconciliation_write_enabled',
  'rescue_operator_action_enabled',
  'dispute_case_writes_enabled',
  'refund_execution_enabled',
  'payment_execution_enabled',
  'money_movement_enabled',
  'custody_enabled',
  'settlement_enabled',
  'automatic_activation_enabled',
]) {
  assert(migration.includes(`${lock} boolean not null default false check (not ${lock})`), `Migration does not constrain ${lock} to false`)
}

for (const forbidden of [
  'create table public.production_payment_transfers',
  'create table public.payment_funding_accounts',
  'create table public.payment_customer_balances',
  'create table public.payment_financial_ledger_entries',
  'create or replace function public.activate_payment_corridor',
  'create or replace function public.create_production_payment_transfer',
  'create or replace function public.initiate_payment_funding',
  'create or replace function public.post_payment_ledger_entry',
]) assert(!migration.includes(forbidden), `Migration introduces a forbidden operational path: ${forbidden}`)

assert(databaseTest.includes('select plan(70)'), 'Database contract plan changed')
for (const contract of ['48::bigint', '12::bigint', 'eight approval domains', 'complete evidence still cannot activate a corridor', 'Phase 7D transfer locks remain closed']) {
  assert(databaseTest.includes(contract), `Database test omits ${contract}`)
}
for (const contract of ['activation_status <> \'blocked\'', 'has_table_privilege(\'service_role\'', 'A production funding or money-movement path unexpectedly exists']) {
  assert(productionSmoke.includes(contract), `Production smoke omits ${contract}`)
}

for (const contract of [
  'Cross-border payments · Phase 7E',
  'Controlled money-movement readiness and payment protection',
  'Corridor activation ledger',
  'Production money movement remains blocked',
  'Manual activation review required',
  'Current approvals',
  'Blocking gaps',
  'Independent domains',
  'Approval evidence is informational and append-only',
  'safeguarding account',
]) assert(component.includes(contract), `Payment experience omits ${contract}`)
assert(!component.includes('<button'), 'Payment readiness unexpectedly exposes an action button')
assert(!component.includes("../lib/supabase"), 'Payment readiness bypasses the query boundary')
assert(header.includes("title: 'Money movement readiness'"), 'Payments page header omits current Phase 7E readiness')
assert(navigation.includes("label: 'Payment readiness'"), 'Product navigation omits Phase 7E payment readiness')
assert(platformReadiness.includes("status: 'Phase 7E activation readiness'"), 'Platform readiness omits the Phase 7E payment boundary')

for (const contract of ['PaymentMoneyMovementRequirement', "requirementKey: 'legal_authorization'", "domain: 'legal'", "activationStatus: 'blocked'"]) {
  assert(types.includes(contract), `Typed contract omits ${contract}`)
}
assert(queries.includes('getPaymentMoneyMovementRequirements'), 'Reference query omits money-movement requirements')
assert(queries.includes("from('payment_money_movement_readiness_reference')"), 'Reference query omits the Phase 7E view')
assert(app.includes('getPaymentMoneyMovementRequirements'), 'Payments loader omits money-movement requirements')
assert(app.includes('moneyMovementRequirements={paymentMoneyMovementRequirements}'), 'Payments workspace omits Phase 7E data')
assert(browserTest.includes('payment_money_movement_readiness_reference'), 'Browser contract does not mock the Phase 7E reference')
assert(browserTest.includes('Production money movement remains blocked'), 'Browser contract omits the Phase 7E heading')
assert(productionBrowserTest.includes("['#payments', 'Money movement readiness']"), 'Production smoke omits the Phase 7E workspace')

assert(manifest.phase === '8D', 'Release manifest is not Phase 8D')
assert(manifest.status === 'global_brokerage_custody_candidate', 'Release status is not the Phase 8A candidate')
assert(manifest.requiredChecks.includes('check:money-movement-readiness'), 'Release manifest omits the Phase 7E gate')
assert(packageJson.scripts?.['check:money-movement-readiness'], 'Package scripts omit the Phase 7E gate')
const release = manifest.controlledMoneyMovement
assert(release?.workspaceEnabled === true, 'Controlled money-movement workspace is disabled')
assert(release?.corridorCount === 4, 'Controlled money-movement corridor count changed')
assert(release?.requirementCount === 48, 'Controlled money-movement requirement count changed')
assert(release?.requirementsPerCorridor === 12, 'Controlled money-movement corridor ledger is incomplete')
assert(release?.approvalDomainCount === 8, 'Controlled money-movement approval domains changed')
for (const capability of [
  'publicSanitizedRequirementLedger',
  'appendOnlyApprovalEvidence',
  'manualActivationReviewRequired',
]) assert(release?.[capability] === true, `Readiness evidence capability is missing: ${capability}`)
assert(release?.activationStatus === 'blocked', 'Controlled money-movement activation is not blocked')
for (const lock of [
  'rawApprovalDocumentsStored',
  'reviewerIdentitiesExposed',
  'realCustomerDataEnabled',
  'realBeneficiaryDataEnabled',
  'productionPartnerConnectivityEnabled',
  'safeguardingAccountActivationEnabled',
  'customerFundingEnabled',
  'quoteAcceptanceEnabled',
  'transferCreationEnabled',
  'webhookIngestionEnabled',
  'financialLedgerPostingEnabled',
  'reconciliationWriteEnabled',
  'rescueOperatorActionEnabled',
  'disputeCaseWritesEnabled',
  'refundExecutionEnabled',
  'paymentExecutionEnabled',
  'moneyMovementEnabled',
  'custodyEnabled',
  'settlementEnabled',
  'automaticActivationEnabled',
]) assert(release?.[lock] === false, `Controlled money-movement lock is not false: ${lock}`)

for (const [workflow, contract] of [
  [deployData, 'DEPLOY_DATA_PHASE_8D'],
  [verifyData, 'VERIFY_DATA_PHASE_8D'],
  [buildWeb, 'BUILD_PHASE_8D'],
  [deployWeb, 'DEPLOY_PHASE_8D'],
  [verifyWeb, 'VERIFY_WEB_PHASE_8D'],
]) assert(workflow.includes(contract), `Release workflow omits ${contract}`)
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:money-movement-readiness'), 'A web gate omits controlled money-movement readiness')
}
assert(ci.includes('payment_money_movement_readiness.test.sql'), 'CI omits the Phase 7E database tests')
assert(deployData.includes('payment_money_movement_readiness_smoke.sql'), 'Data deploy omits the Phase 7E smoke')
assert(verifyData.includes('payment_money_movement_readiness_smoke.sql'), 'Data verification omits the Phase 7E smoke')
assert(verifyData.includes('migration 048'), 'Current data verification does not prove parity through migration 048')
assert(publicRead.includes('payment_money_movement_readiness_reference'), 'Public runtime check omits the Phase 7E reference')
assert(publicRead.includes('payment_money_movement_readiness_summary'), 'Public runtime check omits the Phase 7E summary')
assert(deployedVerification.includes('manifest.controlledMoneyMovement'), 'Deployed manifest verification omits Phase 7E')
assert(roadmap.includes('Phase 7E — controlled money-movement readiness (implemented foundation)'), 'Roadmap omits the Phase 7E foundation')
assert(guide.includes('Every corridor remains `blocked` even if all displayed approval evidence is'), 'Operating guide omits the no-activation boundary')
for (const guideText of [releaseGuide, hostingGuide, supabaseGuide]) {
  assert(guideText.includes('PHASE_8D'), 'A current release guide omits Phase 8D confirmations')
}

for (const lock of ['liveBrokerageExecution', 'paymentExecution', 'moneyMovement', 'customerFunding', 'chargeCollection', 'custody', 'personalizedAdvice']) {
  assert(manifest.hardLocks?.[lock] === false, `${lock} must remain hard locked`)
}

console.log('Controlled money-movement readiness passed: 48 corridor approval requirements remain sanitized, append-only and unable to activate funding or production money movement.')
