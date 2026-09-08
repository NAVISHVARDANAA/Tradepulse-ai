import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function mockGuestBackend(page: Page) {
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204 })
      return
    }
    if (path.startsWith('/functions/v1/')) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Authentication is required' }),
      })
      return
    }
    if (path.startsWith('/auth/v1/')) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Authentication is required' }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': '0-0/0' },
      body: '[]',
    })
  })
}

test.beforeEach(async ({ page }) => {
  await mockGuestBackend(page)
  await page.goto('/')
  const welcome = page.getByRole('dialog', { name: 'Learn before you invest' })
  if (await welcome.isVisible()) {
    await welcome.getByRole('button', { name: 'Explore on my own' }).click()
  }
  await expect(
    page.getByRole('heading', { level: 1, name: 'One platform. Focused workspaces.' }),
  ).toBeVisible()
})

test('core landmarks pass automated WCAG A and AA checks', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'mobile-chromium') {
    const toggle = page.getByRole('button', { name: 'Open product navigation' })
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-controls', 'mobile-product-navigation')
    await expect(page.locator('#mobile-product-navigation')).toBeAttached()
  } else {
    await expect(page.getByRole('navigation', { name: 'Product navigation' })).toBeVisible()
  }
  await expect(page.getByRole('main')).toHaveAttribute('id', 'main-content')

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  expect(results.violations).toEqual([])
})

test('first-run guide traps focus and restores it when closed', async ({ page }) => {
  await page.evaluate(() => localStorage.removeItem('tradepulse-product-tour-v3'))
  await page.reload()

  const dialog = page.getByRole('dialog', { name: 'Learn before you invest' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toBeFocused()

  const results = await new AxeBuilder({ page })
    .include('.tour-welcome')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])

  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Explore on my own' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: 'Guide' })).toBeFocused()
})

test('desktop grouped navigation is keyboard operable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop-only navigation contract')

  const navigation = page.getByRole('navigation', { name: 'Product navigation' })
  const research = navigation.locator('details').filter({ hasText: 'Research' })
  const summary = research.locator('summary')
  await summary.press('Enter')
  await expect(research).toHaveJSProperty('open', true)
  await expect(navigation.getByRole('link', { name: 'Stock research' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(research).toHaveJSProperty('open', false)
})

test('mobile menu keeps every destination reachable without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile-only navigation contract')

  const toggle = page.getByRole('button', { name: 'Open product navigation' })
  await toggle.click()
  const navigation = page.getByRole('navigation', { name: 'Mobile product navigation' })
  await expect(navigation).toBeVisible()
  await expect(navigation.getByRole('link')).toHaveCount(28)

  await navigation.getByRole('link', { name: 'System status' }).click()
  await expect(page).toHaveURL(/#system-status$/)
  await expect(navigation).toBeHidden()
  await expect(page.getByRole('heading', { level: 1, name: 'Production reliability' })).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
})

test('guest brokerage, paper and payment execution boundaries stay closed', async ({ page }) => {
  await page.goto('/#beta-operations')
  await expect(page.getByRole('heading', { level: 1, name: 'Beta launch center' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Approved beta access required' })).toBeVisible()
  await expect(page.getByText(/never approves or creates users/)).toBeVisible()

  await page.goto('/#approved-pilot')
  await expect(page.getByRole('heading', { level: 1, name: 'Private pilot workspace' })).toBeVisible()
  await expect(page.getByText(/cannot approve, enroll or create a tester/)).toBeVisible()
  await expect(page.getByText('No execution or money movement')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Accept and begin pilot' })).toHaveCount(0)

  await page.goto('/#paper-investing')
  await expect(page.getByText('Sign in to create a private paper portfolio')).toBeVisible()
  await expect(page.getByText(/Approved beta testers receive/)).toBeVisible()

  await page.goto('/#account-security')
  await expect(page.getByText(/Controlled-beta access is limited to approved email addresses/)).toBeVisible()

  await page.goto('/#brokerage-readiness')
  await expect(
    page.getByText('Sign in through Paper Investing to view disclosures and create a non-executable preview.'),
  ).toBeVisible()

  await page.goto('/#regulated-preflight')
  await expect(page.getByRole('heading', { level: 1, name: 'Preflight evidence review' })).toBeVisible()
  await expect(page.getByText('Your preflight evidence is private.')).toBeVisible()
  await expect(page.getByText(/Every saved review is database-constrained to blocked/)).toBeVisible()
  await expect(page.getByRole('button', { name: /submit order|place order|execute/i })).toHaveCount(0)

  await page.goto('/#sandbox-orders')
  await expect(page.getByRole('heading', { level: 1, name: 'Sandbox order lifecycle' })).toBeVisible()
  await expect(page.getByText('Your sandbox receipts are private.')).toBeVisible()
  await expect(page.getByText(/browser has no order endpoint/)).toBeVisible()
  await expect(page.getByRole('button', { name: /submit|cancel|replace|place|execute/i })).toHaveCount(0)

  await page.goto('/#live-readiness')
  await expect(page.getByRole('heading', { level: 1, name: 'Live trading readiness' })).toBeVisible()
  await expect(page.getByText('Even complete evidence cannot activate trading.')).toBeVisible()
  await expect(page.getByText(/No live order endpoint exists in this phase/)).toBeVisible()
  await expect(page.getByRole('button', { name: /activate|submit|route|fund|execute/i })).toHaveCount(0)

  await page.goto('/#payments')
  await expect(page.getByRole('heading', { level: 1, name: 'Money movement readiness' })).toBeVisible()
  await expect(page.getByText('Production money movement is blocked—even when every approval is current.')).toBeVisible()
  await expect(page.getByRole('button', { name: /select|accept|transfer|pay|execute|submit|clear|approve/i })).toHaveCount(0)
})

test('global venue intelligence preserves listing identity and fails closed by residency', async ({ page }) => {
  const base = {
    venue_availability: 'reference_only',
    calendar_status: 'review_required',
    holiday_calendar_status: 'review_required',
    settlement_convention: 'source_review_required',
    primary_listing: true,
    listing_status: 'reference_only',
    identifier_status: 'review_required',
    provider_mapping_status: 'review_required',
    corporate_action_status: 'review_required',
    fractional_reference_status: 'review_required',
    residency_country: 'IN',
    customer_type: 'individual',
    investor_type: 'retail',
    disclosure_status: 'not_assessed',
    legal_review_status: 'review_required',
    reference_display_status: 'reference_only',
    price_display_status: 'unavailable',
    corporate_action_display_status: 'unavailable',
    reference_license_status: 'review_required',
    reference_as_of: '2026-09-08',
    policy_version: 'global-venue-instrument-intelligence-v1',
    live_market_data_connectivity_enabled: false,
    customer_entitlement_assignment_enabled: false,
    automatic_jurisdiction_approval_enabled: false,
    order_preview_enabled: false,
    order_routing_enabled: false,
    broker_connectivity_enabled: false,
    customer_funding_enabled: false,
    custody_enabled: false,
    settlement_enabled: false,
  }
  const records = [
    {
      ...base,
      venue_id: 1,
      mic_code: 'XNSE',
      venue_name: 'National Stock Exchange of India',
      venue_country_code: 'IN',
      timezone: 'Asia/Kolkata',
      primary_currency: 'INR',
      listing_id: 1,
      listing_key: 'XNSE:RELIANCE',
      canonical_instrument_key: 'IN:RELIANCE',
      display_symbol: 'RELIANCE',
      instrument_name: 'Reliance Industries equity reference',
      instrument_type: 'equity',
      quote_currency: 'INR',
      access_status: 'research_only',
      reason_code: 'DOMESTIC_REFERENCE_ONLY_NOT_ELIGIBILITY',
    },
    {
      ...base,
      venue_id: 2,
      mic_code: 'XNAS',
      venue_name: 'The Nasdaq Stock Market',
      venue_country_code: 'US',
      timezone: 'America/New_York',
      primary_currency: 'USD',
      listing_id: 2,
      listing_key: 'XNAS:QQQ',
      canonical_instrument_key: 'US:QQQ',
      display_symbol: 'QQQ',
      instrument_name: 'Nasdaq-100 ETF reference',
      instrument_type: 'etf',
      quote_currency: 'USD',
      access_status: 'review_required',
      reason_code: 'CROSS_BORDER_LEGAL_REVIEW_REQUIRED',
    },
  ]
  await page.route('http://127.0.0.1:54321/rest/v1/global_venue_instrument_reference**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'content-range': '0-1/2' },
    body: JSON.stringify(records),
  }))

  await page.goto('/#global-access')
  await expect(page.getByRole('heading', { level: 1, name: 'Venue and instrument access map' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Venue and instrument intelligence' })).toBeVisible()
  await expect(page.getByText('Global execution remains unavailable')).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'National Stock Exchange of India' })).toBeVisible()
  await expect(page.getByText(/^XNSE:RELIANCE ·/)).toBeVisible()
  await expect(page.getByText('Research only', { exact: true })).toBeVisible()
  await expect(page.getByText(/Reason: Cross border legal review required/)).toBeVisible()
  await page.getByLabel('Instrument class').selectOption('etf')
  await expect(page.getByText(/^XNAS:QQQ ·/)).toBeVisible()
  await expect(page.getByText(/^XNSE:RELIANCE ·/)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /preview|route|trade|buy|sell|fund|execute|submit/i })).toHaveCount(0)
})

test('payment safety maps money-movement readiness, sandbox lifecycle, compliance, beneficiary intervention and corridor transparency', async ({ page }) => {
  const routeBase = {
    corridor_id: 1,
    corridor_code: 'USD-INR',
    source_currency: 'USD',
    destination_currency: 'INR',
    fx_symbol: 'USDINR',
    rate_operation: 'direct',
    provider_rate_mode: 'sandbox_model',
    tax_status: 'unavailable',
    estimated_tax_bps: null,
    tax_explanation: 'Tax depends on customer and corridor facts and is not available in this reference-only phase.',
    availability: 'reference_only',
    availability_reason: 'Licensed provider production connectivity and route approval are not configured.',
    max_reference_age_minutes: 60,
    provider_connectivity_enabled: false,
    beneficiary_collection_enabled: false,
    quote_acceptance_enabled: false,
    automatic_route_selection_enabled: false,
    transfer_creation_enabled: false,
    payment_execution_enabled: false,
    money_movement_enabled: false,
    custody_enabled: false,
    settlement_enabled: false,
  }
  await page.route('**/rest/v1/payment_corridor_intelligence*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      { ...routeBase, id: 1, route_code: 'USD-INR-ECONOMY', provider_label: 'Economy sandbox provider model', delivery_tier: 'economy', provider_spread_bps: 25, variable_fee_bps: 30, fixed_fee: 0.35, minimum_fee: 0.75, eta_min_minutes: 60, eta_max_minutes: 90 },
      { ...routeBase, id: 2, route_code: 'USD-INR-PRIORITY', provider_label: 'Priority sandbox provider model', delivery_tier: 'priority', provider_spread_bps: 40, variable_fee_bps: 20, fixed_fee: 0.75, minimum_fee: 1.25, eta_min_minutes: 15, eta_max_minutes: 45 },
    ]),
  }))
  await page.route('**/rest/v1/market_assets*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ id: 1, symbol: 'USDINR', name: 'US Dollar / Indian Rupee', asset_type: 'forex', currency: 'INR', market_observations: [{ observed_at: new Date().toISOString(), price: 83.25, change_percent: 0.1, source: 'test-reference' }] }]),
  }))
  const protectionBase = {
    description: 'Synthetic protection rule used by the browser contract.',
    severity: 'critical',
    outcome: 'blocked',
    cooling_off_hours: 0,
    required_action: 'Stop and independently verify the recipient using a trusted channel.',
    data_mode: 'synthetic_rehearsal',
    real_beneficiary_collection_enabled: false,
    beneficiary_identifier_storage_enabled: false,
    validation_provider_connectivity_enabled: false,
    beneficiary_creation_enabled: false,
    duplicate_override_enabled: false,
    cooling_off_bypass_enabled: false,
    quote_acceptance_enabled: false,
    transfer_creation_enabled: false,
    payment_execution_enabled: false,
    money_movement_enabled: false,
  }
  await page.route('**/rest/v1/payment_beneficiary_protection_reference*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      { ...protectionBase, id: 1, rule_code: 'RECENT_DETAILS_CHANGE', category: 'cooling_off', signal_key: 'recent_details_change', title: 'Recently changed payment details', severity: 'high', outcome: 'cooling_off', cooling_off_hours: 24, customer_message: 'Recently changed details trigger a 24-hour protection pause.', priority: 40 },
      { ...protectionBase, id: 2, rule_code: 'UNVERIFIED_CHANNEL_CHANGE', category: 'scam', signal_key: 'unverified_channel_change', title: 'Unverified channel change', customer_message: 'Unverified channel changes are a common invoice-redirection warning.', priority: 50 },
    ]),
  }))
  const complianceBase = {
    corridor_id: 1,
    corridor_code: 'USD-INR',
    source_currency: 'USD',
    destination_currency: 'INR',
    customer_type: 'both',
    description: 'Synthetic compliance requirement used by the browser contract.',
    evidence_required: 'Synthetic evidence only; no customer or provider data is processed.',
    customer_action: 'Review this illustrative requirement without entering identity or payment data.',
    review_owner: 'financial_crime_operations',
    outcome: 'review_required',
    data_mode: 'synthetic_case_rehearsal',
    real_identity_collection_enabled: false,
    document_upload_enabled: false,
    pii_storage_enabled: false,
    compliance_provider_connectivity_enabled: false,
    live_sanctions_screening_enabled: false,
    transaction_monitoring_connectivity_enabled: false,
    travel_rule_transmission_enabled: false,
    compliance_case_writes_enabled: false,
    automated_clearance_enabled: false,
    manual_override_enabled: false,
    quote_acceptance_enabled: false,
    transfer_creation_enabled: false,
    payment_execution_enabled: false,
    money_movement_enabled: false,
  }
  await page.route('**/rest/v1/payment_compliance_orchestration_reference*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      { ...complianceBase, id: 1, workflow_code: 'USD-INR-KYC', customer_type: 'individual', stage_key: 'kyc', title: 'Individual identity and residency', review_owner: 'identity_operations', priority: 10 },
      { ...complianceBase, id: 7, workflow_code: 'USD-INR-KYB', customer_type: 'business', stage_key: 'kyb', title: 'Business identity and controllers', review_owner: 'identity_operations', priority: 10 },
      { ...complianceBase, id: 2, workflow_code: 'USD-INR-AML', stage_key: 'aml', title: 'AML risk assessment', priority: 20 },
      { ...complianceBase, id: 3, workflow_code: 'USD-INR-SANCTIONS', stage_key: 'sanctions', title: 'Sanctions and watchlist screening', review_owner: 'sanctions_operations', outcome: 'blocked', priority: 30 },
      { ...complianceBase, id: 4, workflow_code: 'USD-INR-TXMON', stage_key: 'transaction_monitoring', title: 'Transaction-monitoring controls', review_owner: 'transaction_monitoring_operations', priority: 40 },
      { ...complianceBase, id: 5, workflow_code: 'USD-INR-TRAVELRULE', stage_key: 'travel_rule', title: 'Travel-rule applicability', review_owner: 'travel_rule_operations', outcome: 'blocked', priority: 50 },
      { ...complianceBase, id: 6, workflow_code: 'USD-INR-AUDIT', stage_key: 'audit', title: 'Audit evidence and decision trace', review_owner: 'compliance_assurance', priority: 60 },
    ]),
  }))
  const transferStageBase = {
    corridor_id: 1,
    corridor_code: 'USD-INR',
    source_currency: 'USD',
    destination_currency: 'INR',
    description: 'Synthetic sandbox transfer stage used by the browser contract.',
    evidence_required: 'Synthetic lifecycle evidence only; no customer, provider or financial data is processed.',
    safe_response: 'Review the illustrative evidence and keep every operational write disabled.',
    responsible_owner: 'payment_operations',
    data_mode: 'synthetic_transfer_rehearsal',
    licensed_partner_sandbox_reference_enabled: true,
    double_entry_preview_enabled: true,
    real_customer_data_enabled: false,
    real_beneficiary_data_enabled: false,
    provider_sandbox_connectivity_enabled: false,
    browser_transfer_creation_enabled: false,
    service_transfer_creation_enabled: false,
    webhook_ingestion_enabled: false,
    financial_ledger_posting_enabled: false,
    retry_execution_enabled: false,
    reconciliation_write_enabled: false,
    rescue_operator_action_enabled: false,
    dispute_case_writes_enabled: false,
    refund_execution_enabled: false,
    production_provider_connectivity_enabled: false,
    quote_acceptance_enabled: false,
    payment_execution_enabled: false,
    money_movement_enabled: false,
    customer_funding_enabled: false,
    custody_enabled: false,
    settlement_enabled: false,
  }
  await page.route('**/rest/v1/payment_sandbox_transfer_lifecycle_reference*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      { ...transferStageBase, id: 1, stage_code: 'USD-INR-IDEMP', stage_key: 'idempotency', title: 'Idempotency and duplicate suppression', rehearsal_outcome: 'deduplicated', responsible_owner: 'platform_reliability', priority: 10 },
      { ...transferStageBase, id: 2, stage_code: 'USD-INR-SUBMIT', stage_key: 'sandbox_submission', title: 'Licensed-partner sandbox hand-off', rehearsal_outcome: 'acknowledged', priority: 20 },
      { ...transferStageBase, id: 3, stage_code: 'USD-INR-WEBHOOK', stage_key: 'webhook_verification', title: 'Signed webhook verification', rehearsal_outcome: 'signature_verified', responsible_owner: 'platform_reliability', priority: 30 },
      { ...transferStageBase, id: 4, stage_code: 'USD-INR-LEDGER', stage_key: 'double_entry_ledger', title: 'Currency-separated double-entry journals', rehearsal_outcome: 'balanced', responsible_owner: 'financial_control', priority: 40 },
      { ...transferStageBase, id: 5, stage_code: 'USD-INR-RETRY', stage_key: 'retry_policy', title: 'Bounded retry and ambiguity policy', rehearsal_outcome: 'bounded', responsible_owner: 'platform_reliability', priority: 50 },
      { ...transferStageBase, id: 6, stage_code: 'USD-INR-RECON', stage_key: 'reconciliation', title: 'Provider and ledger reconciliation', rehearsal_outcome: 'matched', responsible_owner: 'financial_control', priority: 60 },
      { ...transferStageBase, id: 7, stage_code: 'USD-INR-RESCUE', stage_key: 'rescue_mode', title: 'Rescue-mode hold and recovery', rehearsal_outcome: 'standby', priority: 70 },
      { ...transferStageBase, id: 8, stage_code: 'USD-INR-DISPUTE', stage_key: 'dispute', title: 'Dispute evidence and customer protection', rehearsal_outcome: 'review_ready', responsible_owner: 'customer_protection', priority: 80 },
      { ...transferStageBase, id: 9, stage_code: 'USD-INR-REFUND', stage_key: 'refund', title: 'Refund and balanced reversal plan', rehearsal_outcome: 'review_ready', responsible_owner: 'financial_control', priority: 90 },
    ]),
  }))
  const ledgerBase = {
    corridor_id: 1,
    corridor_code: 'USD-INR',
    source_currency: 'USD',
    destination_currency: 'INR',
    data_mode: 'synthetic_transfer_rehearsal',
    double_entry_preview_enabled: true,
    financial_ledger_posting_enabled: false,
    refund_execution_enabled: false,
    payment_execution_enabled: false,
    money_movement_enabled: false,
    narrative: 'Synthetic double-entry template used by the browser contract.',
  }
  await page.route('**/rest/v1/payment_sandbox_ledger_reference*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      { ...ledgerBase, id: 1, posting_code: 'USD-INR-SRC-DR', journal_key: 'source_funding', currency_role: 'source', account_code: 'sandbox_cash_control', entry_side: 'debit', amount_basis: 'source_amount', priority: 10 },
      { ...ledgerBase, id: 2, posting_code: 'USD-INR-SRC-CR', journal_key: 'source_funding', currency_role: 'source', account_code: 'sandbox_transfer_liability', entry_side: 'credit', amount_basis: 'source_amount', priority: 20 },
      { ...ledgerBase, id: 3, posting_code: 'USD-INR-DST-DR', journal_key: 'destination_obligation', currency_role: 'destination', account_code: 'sandbox_fx_bridge_control', entry_side: 'debit', amount_basis: 'destination_before_tax', priority: 10 },
      { ...ledgerBase, id: 4, posting_code: 'USD-INR-DST-CR', journal_key: 'destination_obligation', currency_role: 'destination', account_code: 'sandbox_payout_payable', entry_side: 'credit', amount_basis: 'destination_before_tax', priority: 20 },
    ]),
  }))
  const moneyMovementRequirementBase = {
    corridor_id: 1,
    corridor_code: 'USD-INR',
    source_currency: 'USD',
    destination_currency: 'INR',
    summary: 'Corridor-specific approval evidence is required before any production capability could be considered.',
    evidence_expected: 'Dated, independently reviewed and accountable approval evidence with a defined validity window.',
    activation_blocking: true,
    evidence_status: 'missing',
    reviewed_at: null,
    valid_until: null,
    approval_current: false,
    activation_status: 'blocked',
    manual_activation_review_required: true,
    production_partner_connectivity_enabled: false,
    safeguarding_account_activation_enabled: false,
    customer_funding_enabled: false,
    transfer_creation_enabled: false,
    financial_ledger_posting_enabled: false,
    payment_execution_enabled: false,
    money_movement_enabled: false,
    custody_enabled: false,
    settlement_enabled: false,
    automatic_activation_enabled: false,
  }
  const moneyMovementRequirements = [
    ['LEGAL', 'legal_authorization', 'legal', 'Corridor legal authorization', 'legal_compliance'],
    ['PARTNER', 'regulated_partner_agreement', 'partner', 'Regulated partner agreement', 'partner_management'],
    ['CERT', 'partner_production_certification', 'partner', 'Partner production certification', 'partner_management'],
    ['SAFEGUARD', 'safeguarding_account_structure', 'safeguarding', 'Safeguarding account structure', 'financial_control'],
    ['RECON', 'customer_funds_reconciliation', 'safeguarding', 'Customer-funds reconciliation', 'financial_control'],
    ['KYC', 'kyc_kyb_program', 'compliance', 'KYC and KYB operating approval', 'financial_crime_operations'],
    ['AML', 'aml_sanctions_monitoring', 'compliance', 'AML, sanctions and monitoring approval', 'financial_crime_operations'],
    ['SOF', 'source_of_funds_controls', 'compliance', 'Source-of-funds controls', 'financial_crime_operations'],
    ['SECURITY', 'security_privacy_review', 'security', 'Security and privacy approval', 'security_privacy'],
    ['TREASURY', 'treasury_liquidity_fx_controls', 'treasury', 'Treasury, liquidity and FX controls', 'treasury'],
    ['RESILIENCE', 'operational_resilience', 'operations', 'Operational resilience and recovery', 'payment_operations'],
    ['REDRESS', 'customer_protection_redress', 'customer_protection', 'Customer protection and redress', 'customer_protection'],
  ].map(([suffix, requirementKey, domain, title, responsibleOwner], index) => ({
    ...moneyMovementRequirementBase,
    id: index + 1,
    requirement_code: `USD-INR-${suffix}`,
    requirement_key: requirementKey,
    domain,
    title,
    responsible_owner: responsibleOwner,
    display_order: (index + 1) * 10,
  }))
  await page.route('**/rest/v1/payment_money_movement_readiness_reference*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(moneyMovementRequirements),
  }))

  await page.goto('/#payments')
  await expect(page.getByRole('heading', { level: 3, name: 'Production money movement remains blocked' })).toBeVisible()
  const moneyMovementSummary = page.locator('.money-movement-readiness-summary')
  await expect(moneyMovementSummary.getByText('0 of 12', { exact: true })).toBeVisible()
  await expect(moneyMovementSummary.getByText('8', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 4, name: 'Safeguarding account structure', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 4, name: 'Security and privacy approval', exact: true })).toBeVisible()
  await expect(page.getByText(/Approval evidence is informational and append-only/)).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Rehearse the transfer lifecycle without moving money' })).toBeVisible()
  await expect(page.getByText('Licensed-partner sandbox reference')).toBeVisible()
  const transferDecision = page.locator('.sandbox-transfer-decision')
  await expect(transferDecision.getByText('rescue review', { exact: true })).toBeVisible()
  await expect(page.getByText('9 of 9', { exact: true })).toBeVisible()
  await expect(page.getByText('2 of 2', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 4, name: 'Provider and ledger reconciliation', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 4, name: 'Rescue-mode hold and recovery', exact: true })).toBeVisible()
  await expect(page.locator('.sandbox-ledger-grid article')).toHaveCount(2)
  await expect(page.getByText('Balanced', { exact: true })).toHaveCount(2)
  await page.getByLabel('Synthetic lifecycle scenario').selectOption('duplicate_retry')
  await expect(transferDecision.getByText('duplicate suppressed', { exact: true })).toBeVisible()
  await expect(page.getByText(/No second transfer was created/)).toBeVisible()
  await page.getByLabel('Synthetic lifecycle scenario').selectOption('webhook_replay')
  await expect(transferDecision.getByText('webhook rejected', { exact: true })).toBeVisible()
  await expect(page.getByText(/Webhook replay rejected before state or ledger changes/)).toBeVisible()
  await page.getByLabel('Synthetic lifecycle scenario').selectOption('dispute_refund')
  await expect(transferDecision.getByText('refund review', { exact: true })).toBeVisible()
  await expect(page.getByText(/No case or refund was created/)).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Map compliance gates before any payment' })).toBeVisible()
  await expect(page.getByText('No documents, identities or live screening')).toBeVisible()
  await expect(page.getByText('Compliance activation blocked', { exact: true })).toBeVisible()
  await expect(page.getByText('6 of 6', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 4, name: 'Sanctions and watchlist screening', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 4, name: 'Travel-rule applicability', exact: true })).toBeVisible()
  await expect(page.getByText(/case writes, automated clearance and manual overrides are disabled/)).toBeVisible()
  await page.getByLabel('Synthetic customer journey').selectOption('business')
  await expect(page.getByRole('heading', { level: 4, name: 'Business identity and controllers', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 4, name: 'Individual identity and residency', exact: true })).toHaveCount(0)
  await expect(page.getByText('6 of 6', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'See the intervention before the payment' })).toBeVisible()
  await expect(page.getByText('No names, accounts or addresses')).toBeVisible()
  await expect(page.locator('.beneficiary-protection').getByText('Blocked', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 4, name: 'Recently changed payment details', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 4, name: 'Unverified channel change', exact: true })).toBeVisible()
  await expect(page.getByText(/Real beneficiary data is neither requested nor stored/)).toBeVisible()
  await expect(page.getByText('Tax unavailable—not shown as zero')).toBeVisible()
  await expect(page.locator('.corridor-route-card')).toHaveCount(2)
  await expect(page.getByText('Sandbox provider-model rate')).toHaveCount(2)
  await expect(page.getByText('Estimated delivered before unknown tax')).toHaveCount(2)
  await expect(page.getByRole('button', { name: /select|accept|transfer|pay|execute|submit|clear|approve/i })).toHaveCount(0)
})

test('hash navigation renders one focused product workspace at a time', async ({ page }) => {
  await page.goto('/#forecasts')
  await expect(page.getByRole('heading', { level: 1, name: 'Forecast governance dashboard' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Probabilistic market outlook' })).toBeVisible()
  await expect(page.locator('#stock-research')).toHaveCount(0)
  await expect(page.locator('#paper-investing')).toHaveCount(0)

  await page.goto('/#stock-research')
  await expect(page.getByRole('heading', { level: 1, name: 'Interactive stock intelligence' })).toBeVisible()
  await expect(page.locator('#stock-research')).toBeVisible()
  await expect(page.locator('#forecasts')).toHaveCount(0)
})

test('beta hardening supports accessible recovery review without regulated activation', async ({ page }) => {
  await page.goto('/#beta-hardening')
  await expect(page.getByRole('heading', { level: 1, name: 'Beta hardening center' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Customer-safe release closure' })).toBeVisible()
  const confirmations = page.getByRole('checkbox', { name: /Confirm .* drill reviewed/ })
  await expect(confirmations).toHaveCount(4)
  await confirmations.first().check()
  await expect(page.getByText('1 of 4 recovery drills reviewed')).toBeVisible()
  await expect(page.getByText('No execution or money movement')).toBeVisible()
  await expect(page.getByRole('button', { name: /deploy|activate|submit order|send payment/i })).toHaveCount(0)
})

test('shared product data loads only for the active workspace', async ({ page }) => {
  const sharedDataPaths: string[] = []
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname
    if (
      /\/rest\/v1\/(market_assets|market_observations|trade_observations|display_qualified_market_forecasts|equity_research_dashboard|global_venue_instrument_reference)/.test(
        path,
      )
    ) {
      sharedDataPaths.push(path)
    }
  })

  await page.goto('/#beta-operations')
  await expect(page.getByRole('heading', { level: 1, name: 'Beta launch center' })).toBeVisible()
  await page.waitForTimeout(250)
  expect(sharedDataPaths).toEqual([])

  await page.goto('/#approved-pilot')
  await expect(page.getByRole('heading', { level: 1, name: 'Private pilot workspace' })).toBeVisible()
  await page.waitForTimeout(250)
  expect(sharedDataPaths).toEqual([])

  await page.goto('/#beta-hardening')
  await expect(page.getByRole('heading', { level: 1, name: 'Beta hardening center' })).toBeVisible()
  await page.waitForTimeout(250)
  expect(sharedDataPaths).toEqual([])

  await page.goto('/#global-access')
  await expect(page.getByRole('heading', { level: 1, name: 'Venue and instrument access map' })).toBeVisible()
  await expect.poll(
    () => sharedDataPaths.some((path) => path.includes('/global_venue_instrument_reference')),
  ).toBe(true)
  expect(sharedDataPaths.some((path) => path.includes('/market_assets'))).toBe(false)
  expect(sharedDataPaths.some((path) => path.includes('/equity_research_dashboard'))).toBe(false)

  await page.goto('/#forecasts')
  await expect(page.getByRole('heading', { level: 1, name: 'Forecast governance dashboard' })).toBeVisible()
  await expect.poll(
    () => sharedDataPaths.some((path) => path.includes('/display_qualified_market_forecasts')),
  ).toBe(true)
  expect(sharedDataPaths.some((path) => path.includes('/market_assets'))).toBe(false)
  expect(sharedDataPaths.some((path) => path.includes('/trade_observations'))).toBe(false)
  expect(
    sharedDataPaths.some((path) => path.includes('/equity_research_dashboard')),
  ).toBe(false)
})

test('Trust Center verifies evidence, local activity and safety boundaries', async ({ page }) => {
  await page.goto('/#trust-center')
  await expect(page.getByRole('heading', { level: 1, name: 'Trust and activity center' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Evidence you can verify' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Forecast receipt' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Brokerage preview receipt' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Cross-border quote receipt' })).toBeVisible()
  await expect(page.locator('.trust-boundary').filter({ hasText: 'Live orders hard locked' })).toBeVisible()
  await expect(page.locator('.trust-boundary').filter({ hasText: 'No money movement' })).toBeVisible()
  await expect(page.getByRole('button', { name: /execute|place live|submit live|send money/i })).toHaveCount(0)

  const professional = page.getByRole('button', { name: 'Professional' })
  await professional.click()
  await expect(professional).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate(() => localStorage.getItem('tradepulse-trust-mode-v1'))).toBe('professional')

  await page.goto('/#forecasts')
  await expect(page.getByRole('heading', { level: 1, name: 'Forecast governance dashboard' })).toBeVisible()
  await page.goto('/#trust-center')
  await expect(page.getByRole('link', { name: 'Forecasts' })).toBeVisible()

  const safeContext = page.getByLabel('Safe support context')
  await expect(safeContext).toContainText('Release: Phase 5G controlled beta')
  await expect(safeContext).toContainText('Sensitive data: omitted')
  await page.getByRole('button', { name: 'Clear local activity' }).click()
  await expect(page.getByText('No local workspace activity recorded.')).toBeVisible()
})

test('Analytics Studio exposes governed interactive reporting controls', async ({ page }) => {
  await page.goto('/#analytics-studio')
  await expect(page.getByRole('heading', { level: 1, name: 'Governed Analytics Studio' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Governed Analytics Studio', exact: true })).toBeVisible()
  await expect(page.getByLabel('Subject area')).toBeVisible()
  await expect(page.getByLabel('Search report')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save view' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export CSV' })).toBeDisabled()
  await expect(page.getByText('Snowflake adapter: not connected')).toBeVisible()
  await expect(page.getByText('Semantic metric dictionary')).toBeVisible()
  await expect(page.locator('#forecasts')).toHaveCount(0)
})
