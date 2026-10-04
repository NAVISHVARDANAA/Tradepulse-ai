import { readFile } from 'node:fs/promises'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const [migration, test, smoke, query, panel, app, navigation, header, browser,
  production, manifestText, packageText, ci, deployData, verifyData, buildWeb,
  deployWeb, verifyWeb, publicRead, deployed, roadmap, guide] = await Promise.all([
  'supabase/migrations/066_licensed_provider_commercial_readiness.sql',
  'supabase/tests/database/licensed_provider_commercial_readiness.test.sql',
  'supabase/tests/production/licensed_provider_commercial_readiness_smoke.sql',
  'src/lib/queries/licensedProviderCommercialReadiness.ts',
  'src/components/LicensedProviderCommercialReadinessPanel.tsx', 'src/App.tsx',
  'src/components/ProductNavigation.tsx', 'src/components/ProductPageHeader.tsx',
  'tests/e2e/controlled-beta.spec.ts', 'tests/e2e/production-smoke.spec.ts',
  'public/beta-release.json', 'package.json', '.github/workflows/ci.yml',
  '.github/workflows/deploy-supabase.yml', '.github/workflows/verify-supabase-production.yml',
  '.github/workflows/build-web-release.yml', '.github/workflows/deploy-web-production.yml',
  '.github/workflows/verify-web-production.yml', 'scripts/verify-public-runtime-read.sh',
  'scripts/verify-web-deployment.mjs', 'docs/PRODUCT_ROADMAP.md',
  'docs/LICENSED_PROVIDER_COMMERCIAL_READINESS.md',
].map(read))

for (const table of ['licensed_provider_commercial_readiness_controls',
  'licensed_provider_commercial_readiness_state_templates', 'licensed_provider_commercial_domain_templates',
  'licensed_provider_commercial_gate_templates', 'licensed_provider_commercial_readiness_matrix']) {
  assert(migration.includes(`create table public.${table}`), `Missing ${table}`)
}
for (const view of ['licensed_provider_commercial_readiness_status', 'licensed_provider_commercial_state_catalog',
  'licensed_provider_commercial_domain_catalog', 'licensed_provider_commercial_gate_catalog',
  'licensed_provider_commercial_readiness_catalog']) {
  assert(migration.includes(`create view public.${view}`), `Missing ${view}`)
}
for (const contract of ['commercial_domain_target = 8', 'commercial_gate_target = 8',
  'readiness_cell_target = 64', 'commercial_state_target = 7',
  'corporate_identity_and_beneficial_ownership_required',
  'product_coverage_and_rights_schedule_required',
  'entitlement_and_redistribution_terms_required',
  'commercial_pricing_and_cost_ceiling_required',
  'security_privacy_and_subprocessor_review_required',
  'service_level_support_and_incident_terms_required',
  'implementation_acceptance_and_change_control_required',
  'exit_portability_deletion_and_termination_required',
  'independent_human_commercial_authorization_required', 'not provider_shortlisted',
  'not pricing_quote_accepted', 'not contract_signed', 'not purchase_order_issued',
  'not provider_selected',
  'not live_provider_connectivity_enabled', 'not production_credential_storage_enabled',
  'not production_payload_intake_enabled', 'not live_data_display_enabled',
  'not derived_data_publication_enabled', 'not model_training_enabled',
  'not external_audience_activation_enabled', 'not public_signup_enabled',
  'not live_order_routing_enabled', 'not payment_execution_enabled',
  'not money_movement_enabled', 'not custody_enabled', 'not settlement_enabled',
  'Licensed provider commercial-readiness reference records are append-only']) {
  assert(migration.includes(contract), `Missing Phase 8W commercial boundary: ${contract}`)
}
for (const state of ['commercial_review_not_requested', 'corporate_due_diligence_required',
  'rights_and_entitlements_schedule_required', 'security_and_operational_terms_required',
  'commercial_model_approval_required', 'signature_readiness_review_required',
  'withdrawn_expired_or_rejected']) {
  assert(migration.includes(`'${state}'`), `Missing commercial state: ${state}`)
}
for (const domain of ['corporate_ownership_and_financial_stability',
  'product_venue_and_geography_coverage', 'display_derived_and_redistribution_rights',
  'entitlement_user_device_and_non_display_scope',
  'pricing_minimums_overage_and_total_cost', 'security_privacy_subprocessors_and_audit',
  'service_levels_support_incident_and_change',
  'termination_portability_deletion_and_transition']) {
  assert(migration.includes(`'${domain}'`), `Missing commercial review domain: ${domain}`)
}
assert((migration.match(/^  \([1-8],'.*','(?:corporate|rights|entitlement|commercial|security|operations|implementation|exit)','.*','.*'\)[,;]$/gm) ?? []).length === 8,
  'Expected eight licensed-provider commercial gates')
assert(test.includes('select plan(46)'), 'PgTAP plan changed')
assert(smoke.includes('licensed_provider_commercial_readiness_status'), 'Smoke omits commercial status')

for (const view of ['licensed_provider_commercial_readiness_status', 'licensed_provider_commercial_state_catalog',
  'licensed_provider_commercial_domain_catalog', 'licensed_provider_commercial_gate_catalog',
  'licensed_provider_commercial_readiness_catalog']) {
  assert(query.includes(`from('${view}')`), `Client omits ${view}`)
}
for (const copy of ['Licensed-provider commercial readiness',
  'No provider is shortlisted or contracted in Phase 8W',
  'Eight commercial review gates', 'Seven manual commercial states',
  'Phase 8W is commercial-review scaffolding, not vendor selection, contract execution, procurement approval or provider activation']) {
  assert(panel.includes(copy), `UI omits ${copy}`)
}
assert(app.includes("activeHref === '#provider-commercial-readiness'"), 'App omits provider commercial route')
assert(app.includes("import('./components/LicensedProviderCommercialReadinessPanel')"), 'Provider commercial route is not lazy')
assert(navigation.includes("href: '#provider-commercial-readiness'"), 'Navigation omits provider commercial route')
assert(header.includes("'#provider-commercial-readiness'"), 'Header omits provider commercial route')
assert(browser.includes("page.goto('/#provider-commercial-readiness')"), 'E2E omits provider commercial route')
assert(production.includes("'#provider-commercial-readiness'"), 'Production test omits provider commercial route')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
const release = manifest.licensedProviderCommercialReadiness
assert(manifest.phase === '8X' && manifest.status === 'controlled_audience_pilot_operating_model_candidate',
  'Manifest is not Phase 8X')
assert(packageJson.scripts?.['check:licensed-provider-commercial-readiness'], 'Package omits Phase 8W check')
assert(manifest.requiredChecks.includes('check:licensed-provider-commercial-readiness'), 'Manifest omits Phase 8W check')
for (const key of ['workspaceEnabled', 'corporateIdentityAndBeneficialOwnershipRequired',
  'productCoverageAndRightsScheduleRequired', 'entitlementAndRedistributionTermsRequired',
  'commercialPricingAndCostCeilingRequired', 'securityPrivacyAndSubprocessorReviewRequired',
  'serviceLevelSupportAndIncidentTermsRequired',
  'implementationAcceptanceAndChangeControlRequired',
  'exitPortabilityDeletionAndTerminationRequired',
  'independentHumanCommercialAuthorizationRequired', 'appendOnlyReferenceContracts']) {
  assert(release?.[key] === true, `${key} is not true`)
}
for (const key of ['providerShortlisted', 'pricingQuoteAccepted', 'contractSigned',
  'purchaseOrderIssued', 'providerSelected', 'liveProviderConnectivityEnabled',
  'productionCredentialStorageEnabled', 'productionPayloadIntakeEnabled',
  'liveDataDisplayEnabled', 'derivedDataPublicationEnabled', 'modelTrainingEnabled',
  'externalAudienceActivationEnabled', 'publicSignupEnabled', 'liveOrderRoutingEnabled',
  'paymentExecutionEnabled', 'moneyMovementEnabled', 'custodyEnabled', 'settlementEnabled']) {
  assert(release?.[key] === false, `${key} is not false`)
}
assert(release?.commercialDomainCount === 8 && release?.commercialGateCount === 8
  && release?.commercialStateCount === 7 && release?.readinessCellCount === 64,
  'Licensed-provider commercial catalog counts changed')
assert(release?.blockedReadinessCellCount === 64 && release?.authorizedReadinessCellCount === 0,
  'Licensed-provider commercial counts changed')

for (const [workflow, token] of [[deployData, 'DEPLOY_DATA_PHASE_8X'],
  [verifyData, 'VERIFY_DATA_PHASE_8X'], [buildWeb, 'BUILD_PHASE_8X'],
  [deployWeb, 'DEPLOY_PHASE_8X'], [verifyWeb, 'VERIFY_WEB_PHASE_8X']]) {
  assert(workflow.includes(token), `Workflow omits ${token}`)
}
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:licensed-provider-commercial-readiness'), 'Web gate omits licensed-provider commercial check')
}
assert(ci.includes('licensed_provider_commercial_readiness.test.sql'), 'CI omits Phase 8W DB test')
assert(deployData.includes('licensed_provider_commercial_readiness_smoke.sql')
  && verifyData.includes('licensed_provider_commercial_readiness_smoke.sql'),
  'Data workflows omit Phase 8W smoke')
assert(deployData.includes("grep -Eq '(^|[^0-9])066([^0-9]|$)'"), 'Data deployment does not verify migration 066')
assert(verifyData.includes("grep -Eq '(^|[^0-9])066([^0-9]|$)'"), 'Data verification does not verify migration 066')
assert(publicRead.includes('licensed_provider_commercial_readiness_status'), 'Public verifier omits Phase 8W')
assert(deployed.includes('manifest.licensedProviderCommercialReadiness'), 'Web verifier omits Phase 8W')
assert(roadmap.includes('Phase 8W — licensed-provider commercial readiness (implemented foundation)'),
  'Roadmap omits Phase 8W')
assert(guide.includes('No provider shortlist, quote, redline, executed agreement')
  && guide.includes('No commercial commitment'),
  'Guide omits the fail-closed commercial boundary')

console.log('Licensed-provider commercial readiness passed: 64 blocked cells, zero authorizations and no shortlist, quote, contract, commitment or production effects.')
