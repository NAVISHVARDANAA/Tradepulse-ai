import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const [migration, databaseTest, smoke, edgeFunction, query, accountMenu, panel,
  app, navigation, header, features, engine, worker, modelTest, browserTest,
  productionTest, manifestText, packageText, ci, deployData, verifyData,
  buildWeb, deployWeb, verifyWeb, publicRead, deployedVerification, config,
  roadmap, guide] = await Promise.all([
  read('supabase/migrations/049_agentic_investing_workspace.sql'),
  read('supabase/tests/database/agentic_investing_workspace.test.sql'),
  read('supabase/tests/production/agentic_investing_workspace_smoke.sql'),
  read('supabase/functions/run-investing-agent/index.ts'),
  read('src/lib/queries/agenticInvesting.ts'),
  read('src/components/AccountMenu.tsx'),
  read('src/components/AgenticInvestingPanel.tsx'),
  read('src/App.tsx'),
  read('src/components/ProductNavigation.tsx'),
  read('src/components/ProductPageHeader.tsx'),
  read('services/forecasting/src/tradepulse_forecasting/features.py'),
  read('services/forecasting/src/tradepulse_forecasting/engine.py'),
  read('services/forecasting/src/tradepulse_forecasting/worker.py'),
  read('services/forecasting/tests/test_engine.py'),
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
  read('supabase/config.toml'),
  read('docs/PRODUCT_ROADMAP.md'),
  read('docs/AGENTIC_INVESTING_WORKSPACE.md'),
])

for (const table of [
  'agentic_ai_controls', 'global_news_signal_sources', 'global_news_signals',
  'agentic_workspace_preferences', 'agentic_report_definitions',
  'agentic_conversations', 'agentic_runs', 'agentic_run_steps',
  'agentic_messages', 'agentic_model_training_candidates',
]) assert(migration.includes(`create table public.${table}`), `Migration omits ${table}`)

for (const view of [
  'agentic_ai_control_status', 'global_news_signal_catalog',
  'agentic_model_learning_ledger',
]) assert(migration.includes(`create view public.${view}`), `Migration omits ${view}`)

for (const fn of ['save_agentic_workspace_preferences', 'save_agentic_report_definition']) {
  assert(migration.includes(`create or replace function public.${fn}`), `Migration omits ${fn}`)
  assert(migration.includes(`grant execute on function public.${fn}`), `${fn} is not protected`)
}

for (const contract of [
  'grounded_responses_required', 'citations_required',
  'continuous_candidate_training_enabled', 'human_model_promotion_required',
  'not synthetic or not training_eligible', 'prompt_training_default_opt_in',
  'not prompt_content_training_enabled', 'not automatically_promoted',
  'leakage_gap_enabled', 'walk_forward_validation_enabled',
  'cost_aware_backtest_enabled', 'Agentic report limit reached',
  'pg_advisory_xact_lock', 'production_effect boolean not null default false',
]) assert(migration.includes(contract), `Migration contract missing: ${contract}`)

assert(databaseTest.includes('select plan(80)'), 'Phase 8E PgTAP plan changed unexpectedly')
assert(smoke.includes("to_regprocedure('public.execute_agentic_trade(jsonb)') is not null"), 'Production smoke omits autonomous-trade absence check')
assert(smoke.includes("auto_promote_forecast_model(jsonb)"), 'Production smoke omits model-promotion lock')
assert(edgeFunction.includes('requireVerifiedMfaWhenEnrolled: true'), 'Agent API omits verified-MFA enforcement')
assert(edgeFunction.includes("observeEdgeHandler('agentic-investing'"), 'Agent API omits observability')
assert(edgeFunction.includes('executionRequest.test(prompt)'), 'Agent API omits execution-request refusal')
assert(edgeFunction.includes("externalLlmConnected: false"), 'Agent response does not disclose local grounded mode')
assert(edgeFunction.includes("status: 'failed'"), 'Agent failures are not recorded')
assert(query.includes("functions.invoke('run-investing-agent'"), 'Client omits protected agent API')
assert(query.includes("rpc('save_agentic_report_definition'"), 'Client omits server-stored reports')
assert(accountMenu.includes("href=\"#agentic-ai\""), 'Top-level account menu omits AI workspace')

for (const copy of [
  'TradePulse Agent', 'Private conversation', 'Personal AI settings',
  'Custom report', 'Global news signal board', 'Continuous learning ledger',
  'No silent promotion', 'Autonomous execution off',
]) assert(panel.includes(copy), `Agentic investing UI omits: ${copy}`)
assert(app.includes("activeHref === '#agentic-ai'"), 'Application omits the Phase 8E route')
assert(app.includes("import('./components/AgenticInvestingPanel')"), 'Agent workspace is not deferred')
assert(navigation.includes("href: '#agentic-ai'"), 'Product navigation omits the agent workspace')
assert(header.includes("title: 'TradePulse Agent workspace'"), 'Page header omits agent workspace copy')
assert(browserTest.includes("page.goto('/#agentic-ai')"), 'Controlled-beta browser test omits Phase 8E')
assert(productionTest.includes("'#agentic-ai'"), 'Production browser test omits Phase 8E')

for (const feature of [
  'news_weighted_sentiment_7d', 'news_event_volume_7d',
  'news_negative_shock_7d', 'news_freshness_7d',
]) assert(features.includes(feature), `Forecast engine omits ${feature}`)
assert(engine.includes('MODEL_NAME = "ridge-histgb-news-ensemble"'), 'Forecast engine omits news-aware candidate identity')
for (const filter of ['"training_eligible": "eq.true"', '"synthetic": "eq.false"', 'observation_cutoff']) {
  assert(worker.includes(filter), `Forecast worker omits governed news filter: ${filter}`)
}
assert(modelTest.includes('test_news_features_never_use_future_signals'), 'Forecast tests omit news leakage guard')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
const release = manifest.agenticInvesting
assert(manifest.phase === '8E', 'Release manifest is not Phase 8E')
assert(manifest.status === 'agentic_investing_candidate', 'Release status is not the Phase 8E candidate')
assert(packageJson.scripts?.['check:agentic-investing'], 'Package scripts omit the Phase 8E check')
assert(manifest.requiredChecks.includes('check:agentic-investing'), 'Manifest omits the Phase 8E check')
for (const capability of [
  'workspaceEnabled', 'topLevelAccountAccess', 'privateConversationHistory',
  'serverStoredReportDefinitions', 'groundedResponsesRequired',
  'citationsRequired', 'continuousCandidateTrainingEnabled',
  'licensedNewsFeaturesSupported', 'walkForwardValidationRequired',
  'leakageGapRequired', 'costAwareBacktestRequired', 'humanModelPromotionRequired',
]) assert(release?.[capability] === true, `Phase 8E capability is not true: ${capability}`)
for (const lock of [
  'promptTrainingDefaultOptIn', 'rawNewsStorageEnabled', 'externalLlmConnected',
  'productionNewsProviderConnected', 'directSelfPromotionEnabled',
  'autonomousTradeExecutionEnabled', 'customerFundingEnabled',
]) assert(release?.[lock] === false, `Phase 8E lock is not false: ${lock}`)

for (const [workflow, confirmation] of [
  [deployData, 'DEPLOY_DATA_PHASE_8E'], [verifyData, 'VERIFY_DATA_PHASE_8E'],
  [buildWeb, 'BUILD_PHASE_8E'], [deployWeb, 'DEPLOY_PHASE_8E'],
  [verifyWeb, 'VERIFY_WEB_PHASE_8E'],
]) assert(workflow.includes(confirmation), `Workflow omits ${confirmation}`)
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:agentic-investing'), 'A web gate omits the Phase 8E check')
}
assert(ci.includes('agentic_investing_workspace.test.sql'), 'CI omits Phase 8E database tests')
assert(ci.includes('deno check supabase/functions/run-investing-agent/index.ts'), 'CI omits agent API type-checking')
assert(deployData.includes('functions deploy run-investing-agent'), 'Data deploy omits agent API')
assert(deployData.includes('agentic_investing_workspace_smoke.sql'), 'Data deploy omits Phase 8E smoke')
assert(verifyData.includes('agentic_investing_workspace_smoke.sql'), 'Data verification omits Phase 8E smoke')
assert(publicRead.includes('global_news_signal_catalog'), 'Public runtime check omits normalized news signals')
assert(deployedVerification.includes('manifest.agenticInvesting'), 'Deployed verification omits Phase 8E locks')
assert(config.includes('[functions.run-investing-agent]\nverify_jwt = true'), 'Agent API does not explicitly verify JWTs')
assert(roadmap.includes('Phase 8E — personalized agentic investing workspace (implemented foundation)'), 'Roadmap omits implemented Phase 8E foundation')
assert(guide.includes('No silent self-promotion'), 'Phase 8E guide omits model-promotion boundary')

console.log('Agentic investing workspace passed: private accounts, grounded agents, reusable reports and evaluation-gated news features are fail-closed.')
