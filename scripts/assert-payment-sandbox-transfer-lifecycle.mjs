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
  lifecycle,
  types,
  queries,
  app,
  browserTest,
  productionBrowserTest,
  guide,
  roadmap,
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
  read('supabase/migrations/043_payment_sandbox_transfer_lifecycle.sql'),
  read('supabase/tests/database/payment_sandbox_transfer_lifecycle.test.sql'),
  read('supabase/tests/production/payment_sandbox_transfer_lifecycle_smoke.sql'),
  read('src/components/PaymentQuotePanel.tsx'),
  read('src/lib/sandboxTransferLifecycle.ts'),
  read('src/types/domain.ts'),
  read('src/lib/queries/referenceData.ts'),
  read('src/App.tsx'),
  read('tests/e2e/controlled-beta.spec.ts'),
  read('tests/e2e/production-smoke.spec.ts'),
  read('docs/SANDBOX_TRANSFER_LIFECYCLE.md'),
  read('docs/PRODUCT_ROADMAP.md'),
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
  'payment_sandbox_transfer_controls',
  'payment_sandbox_transfer_stage_templates',
  'payment_sandbox_ledger_templates',
  'payment_sandbox_transfer_lifecycle_reference',
  'payment_sandbox_ledger_reference',
  'synthetic_transfer_rehearsal',
  'licensed_partner_sandbox_reference_enabled',
  'double_entry_preview_enabled',
  'idempotency',
  'sandbox_submission',
  'webhook_verification',
  'double_entry_ledger',
  'retry_policy',
  'reconciliation',
  'rescue_mode',
  'dispute',
  'refund',
  'source_funding',
  'destination_obligation',
  'security_invoker = true',
]) assert(migration.includes(contract), `Migration omits ${contract}`)

for (const lock of [
  'real_customer_data_enabled',
  'real_beneficiary_data_enabled',
  'provider_sandbox_connectivity_enabled',
  'browser_transfer_creation_enabled',
  'service_transfer_creation_enabled',
  'webhook_ingestion_enabled',
  'financial_ledger_posting_enabled',
  'retry_execution_enabled',
  'reconciliation_write_enabled',
  'rescue_operator_action_enabled',
  'dispute_case_writes_enabled',
  'refund_execution_enabled',
  'production_provider_connectivity_enabled',
  'quote_acceptance_enabled',
  'payment_execution_enabled',
  'money_movement_enabled',
  'customer_funding_enabled',
  'custody_enabled',
  'settlement_enabled',
]) {
  assert(migration.includes(`${lock} boolean not null default false check (not ${lock})`), `Migration does not constrain ${lock} to false`)
}

for (const forbidden of [
  'create table public.payment_sandbox_transfers',
  'create table public.payment_sandbox_webhook_events',
  'create table public.payment_sandbox_ledger_entries',
  'create table public.payment_sandbox_disputes',
  'create table public.payment_sandbox_refunds',
  'create or replace function public.create_payment_sandbox_transfer',
  'create or replace function public.ingest_payment_sandbox_webhook',
  'create or replace function public.execute_payment_sandbox_refund',
  'grant execute on function',
]) assert(!migration.includes(forbidden), `Migration introduces a forbidden operational path: ${forbidden}`)

assert(databaseTest.includes('select plan(73)'), 'Database contract plan changed')
for (const contract of ['36::bigint', '16::bigint', 'payment intents remain disabled', 'payment quotes remain non-executable', 'no operational transfer, webhook, ledger, dispute or refund table exists']) {
  assert(databaseTest.includes(contract), `Database test omits ${contract}`)
}
assert(productionSmoke.includes("data_mode <> 'synthetic_transfer_rehearsal'"), 'Production smoke omits synthetic mode check')
assert(productionSmoke.includes("has_table_privilege('service_role'"), 'Production smoke omits service-role write check')

for (const contract of [
  'Cross-border payments · Phase 7E',
  'Licensed-partner sandbox reference',
  'Rehearse the transfer lifecycle without moving money',
  'Customer retries after timeout',
  'Replayed webhook event',
  'Reconciliation exception',
  'Dispute and refund review',
  'Currency-separated journals',
  'Source and destination currencies balance independently',
  'No transfer, webhook, ledger posting, dispute or refund can be created',
]) assert(component.includes(contract), `Payment experience omits ${contract}`)
assert(!component.includes('<button'), 'Payment sandbox unexpectedly exposes an action button')
assert(!component.includes("../lib/supabase"), 'Payment sandbox bypasses the query boundary')

for (const contract of [
  'buildSandboxTransferRehearsal',
  'buildSandboxLedgerPreview',
  'duplicate_suppressed',
  'replay_rejected',
  'exception_detected',
  "Math.abs(debit - credit) < 0.005",
  "entries.length === 4",
]) assert(lifecycle.includes(contract), `Lifecycle evaluator omits ${contract}`)
assert(!lifecycle.includes('fetch(') && !lifecycle.includes('supabase'), 'Lifecycle evaluator performs network or database writes')

for (const contract of ['PaymentSandboxTransferStage', 'PaymentSandboxLedgerTemplate', "stageKey: 'idempotency'", "journalKey: 'source_funding'"]) {
  assert(types.includes(contract), `Typed contract omits ${contract}`)
}
for (const contract of ['getPaymentSandboxTransferStages', 'getPaymentSandboxLedgerTemplates']) {
  assert(queries.includes(contract), `Reference query omits ${contract}`)
  assert(app.includes(contract), `Payment loader omits ${contract}`)
}
for (const contract of ["from('payment_sandbox_transfer_lifecycle_reference')", "from('payment_sandbox_ledger_reference')"]) {
  assert(queries.includes(contract), `Reference query omits ${contract}`)
}
assert(browserTest.includes('money-movement readiness, sandbox lifecycle'), 'Browser regression omits Phase 7D lifecycle coverage')
assert(productionBrowserTest.includes('Money movement readiness'), 'Production browser smoke omits the current payments heading')

assert(manifest.phase === '8B', 'Release manifest is not Phase 8B')
assert(manifest.status === 'international_multi_asset_paper_trading_candidate', 'Release status is not the global venue and instrument intelligence candidate')
assert(manifest.requiredChecks.includes('check:sandbox-transfers'), 'Release manifest omits the Phase 7D gate')
assert(packageJson.scripts?.['check:sandbox-transfers'], 'Package scripts omit the Phase 7D gate')
const release = manifest.sandboxTransferLifecycle
assert(release?.workspaceEnabled === true, 'Sandbox transfer workspace is disabled')
assert(release?.syntheticTransferRehearsalOnly === true, 'Sandbox transfer release is not synthetic-only')
assert(release?.licensedPartnerSandboxReference === true, 'Licensed-partner sandbox reference is missing')
assert(release?.corridorCount === 4, 'Sandbox transfer corridor count changed')
assert(release?.stageTemplateCount === 36, 'Sandbox transfer stage count changed')
assert(release?.ledgerTemplateCount === 16, 'Sandbox transfer ledger count changed')
assert(release?.journalCountPerCorridor === 2, 'Sandbox journal count changed')
for (const capability of [
  'idempotencyVisible',
  'signedWebhookVisible',
  'doubleEntryPreviewVisible',
  'boundedRetryVisible',
  'reconciliationVisible',
  'rescueModeVisible',
  'disputeWorkflowVisible',
  'refundWorkflowVisible',
  'currencySeparatedJournals',
]) assert(release?.[capability] === true, `Sandbox transfer reference capability is missing: ${capability}`)
for (const lock of [
  'realCustomerDataEnabled',
  'realBeneficiaryDataEnabled',
  'providerSandboxConnectivityEnabled',
  'browserTransferCreationEnabled',
  'serviceTransferCreationEnabled',
  'webhookIngestionEnabled',
  'financialLedgerPostingEnabled',
  'retryExecutionEnabled',
  'reconciliationWriteEnabled',
  'rescueOperatorActionEnabled',
  'disputeCaseWritesEnabled',
  'refundExecutionEnabled',
  'productionProviderConnectivityEnabled',
  'quoteAcceptanceEnabled',
  'paymentExecutionEnabled',
  'moneyMovementEnabled',
  'customerFundingEnabled',
  'custodyEnabled',
  'settlementEnabled',
]) assert(release?.[lock] === false, `Sandbox transfer lock is not false: ${lock}`)

for (const [workflow, contract] of [
  [deployData, 'DEPLOY_DATA_PHASE_8B'],
  [verifyData, 'VERIFY_DATA_PHASE_8B'],
  [buildWeb, 'BUILD_PHASE_8B'],
  [deployWeb, 'DEPLOY_PHASE_8B'],
  [verifyWeb, 'VERIFY_WEB_PHASE_8B'],
]) assert(workflow.includes(contract), `Release workflow omits ${contract}`)
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:sandbox-transfers'), 'A web gate omits sandbox transfer lifecycle')
}
assert(ci.includes('payment_sandbox_transfer_lifecycle.test.sql'), 'CI omits sandbox transfer database tests')
assert(deployData.includes('payment_sandbox_transfer_lifecycle_smoke.sql'), 'Data deploy omits sandbox transfer smoke')
assert(verifyData.includes('payment_sandbox_transfer_lifecycle_smoke.sql'), 'Data verification omits sandbox transfer smoke')
assert(publicRead.includes('payment_sandbox_transfer_lifecycle_reference'), 'Public runtime check omits lifecycle reference')
assert(publicRead.includes('payment_sandbox_ledger_reference'), 'Public runtime check omits ledger reference')
assert(deployedVerification.includes('manifest.sandboxTransferLifecycle'), 'Deployed manifest check omits sandbox transfer lifecycle')
assert(roadmap.includes('Phase 7D — sandbox transfer lifecycle (implemented foundation)'), 'Roadmap omits Phase 7D foundation')
assert(guide.includes('No real customer, beneficiary, provider, webhook, ledger, dispute or refund data is collected'), 'Operating guide omits the no-data boundary')

for (const lock of ['liveBrokerageExecution', 'paymentExecution', 'chargeCollection', 'custody', 'personalizedAdvice']) {
  assert(manifest.hardLocks?.[lock] === false, `${lock} must remain hard locked`)
}

console.log('Sandbox transfer lifecycle passed: 36 stages and 16 balanced ledger templates expose no operational transfer, webhook, ledger, dispute, refund or money path.')
