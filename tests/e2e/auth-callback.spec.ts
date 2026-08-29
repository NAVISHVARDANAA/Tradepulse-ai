import { expect, test, type Page } from '@playwright/test'

const user = {
  id: '00000000-0000-4000-8000-000000000099',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'customer@example.test',
  email_confirmed_at: '2026-08-29T00:00:00.000Z',
  phone: '',
  confirmed_at: '2026-08-29T00:00:00.000Z',
  last_sign_in_at: '2026-08-29T00:00:00.000Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  identities: [],
  created_at: '2026-08-29T00:00:00.000Z',
  updated_at: '2026-08-29T00:00:00.000Z',
  is_anonymous: false,
}

function accessToken() {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: 'authenticated',
    sub: user.id,
  })}.test-signature`
}

async function mockBackend(page: Page) {
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204 })
      return
    }
    if (path === '/auth/v1/user') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(user),
      })
      return
    }
    if (path.startsWith('/functions/v1/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ portfolios: [], instruments: [] }),
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
  await mockBackend(page)
})

test('passwordless callback establishes and cleans the customer session', async ({ page }) => {
  await page.goto(
    `/?auth_return=paper-investing#access_token=${accessToken()}&refresh_token=test-refresh&expires_in=3600&token_type=bearer&type=magiclink`,
  )

  await expect(page).toHaveURL(/\/#paper-investing$/)
  await expect(page.getByRole('dialog', { name: 'Learn before you invest' })).toHaveCount(0)
  await expect(page.getByText('Signed in as customer@example.test')).toBeVisible()
  await expect(page.getByText('Create your first simulation portfolio')).toBeVisible()
  expect(await page.evaluate(() => window.location.href)).not.toContain('access_token')
})

test('expired passwordless callback fails safely with recovery guidance', async ({ page }) => {
  await page.goto(
    '/?auth_return=paper-investing#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
  )

  await expect(page).toHaveURL(/\/#paper-investing$/)
  await expect(page.locator('#paper-investing').getByRole('alert')).toContainText(
    'expired or was already used',
  )
  await expect(page.getByText('Sign in to create a private paper portfolio')).toBeVisible()
  expect(await page.evaluate(() => window.location.href)).not.toContain('error_description')
})
