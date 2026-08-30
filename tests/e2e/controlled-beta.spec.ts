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
  await expect(navigation.getByRole('link')).toHaveCount(21)

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
  await page.goto('/#paper-investing')
  await expect(page.getByText('Sign in to create a private paper portfolio')).toBeVisible()
  await expect(page.getByText(/Approved beta testers receive/)).toBeVisible()

  await page.goto('/#account-security')
  await expect(page.getByText(/Controlled-beta access is limited to approved email addresses/)).toBeVisible()

  await page.goto('/#brokerage-readiness')
  await expect(
    page.getByText('Sign in through Paper Investing to view disclosures and create a non-executable preview.'),
  ).toBeVisible()

  await page.goto('/#payments')
  await expect(page.getByText('Sandbox · no money movement')).toBeVisible()
  await expect(page.getByRole('button', { name: /execute|place live|submit live/i })).toHaveCount(0)
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
