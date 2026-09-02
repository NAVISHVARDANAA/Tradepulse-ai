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
  await expect(page.getByRole('heading', { level: 1, name: 'Beneficiary protection' })).toBeVisible()
  await expect(page.getByText('No beneficiary can be created and no route can be paid from this workspace.')).toBeVisible()
  await expect(page.getByRole('button', { name: /select|accept|transfer|pay|execute|submit/i })).toHaveCount(0)
})

test('payment safety rehearses beneficiary intervention and preserves corridor transparency', async ({ page }) => {
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

  await page.goto('/#payments')
  await expect(page.getByRole('heading', { level: 3, name: 'See the intervention before the payment' })).toBeVisible()
  await expect(page.getByText('No names, accounts or addresses')).toBeVisible()
  await expect(page.getByText('Blocked', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 4, name: 'Recently changed payment details', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 4, name: 'Unverified channel change', exact: true })).toBeVisible()
  await expect(page.getByText(/Real beneficiary data is neither requested nor stored/)).toBeVisible()
  await expect(page.getByText('Tax unavailable—not shown as zero')).toBeVisible()
  await expect(page.locator('.corridor-route-card')).toHaveCount(2)
  await expect(page.getByText('Sandbox provider-model rate')).toHaveCount(2)
  await expect(page.getByText('Estimated delivered before unknown tax')).toHaveCount(2)
  await expect(page.getByRole('button', { name: /select|accept|transfer|pay|execute|submit/i })).toHaveCount(0)
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
      /\/rest\/v1\/(market_assets|market_observations|trade_observations|display_qualified_market_forecasts|equity_research_dashboard)/.test(
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
