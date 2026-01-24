import { test, expect } from '@playwright/test'

const MAILPIT_API = 'http://localhost:8025/api/v1'
const TEST_EMAIL = 'admin@admin.com'
const NEW_PASSWORD = 'newpassword123'

async function clearMailpit() {
  await fetch(`${MAILPIT_API}/messages`, { method: 'DELETE' })
}

async function getLatestEmail(retries = 5): Promise<any> {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(`${MAILPIT_API}/messages`)
    const data = await response.json()
    if (data.messages && data.messages.length > 0) {
      const messageId = data.messages[0].ID
      const messageResponse = await fetch(`${MAILPIT_API}/message/${messageId}`)
      return messageResponse.json()
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  return null
}

function extractResetToken(html: string): string | null {
  const match = html.match(/reset-password\?token=([^"&\s]+)/)
  return match ? match[1] : null
}

test.describe('Forgot Password Flow', () => {
  test.beforeEach(async () => {
    await clearMailpit()
  })

  test('shows forgot password link on login page', async ({ page }) => {
    await page.goto('/login')

    const forgotLink = page.getByRole('link', { name: /forgot your password/i })
    await expect(forgotLink).toBeVisible()

    await forgotLink.click()
    await expect(page).toHaveURL('/forgot-password')
  })

  test('forgot password page shows success message after submission', async ({ page }) => {
    await page.goto('/forgot-password')

    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible()

    await page.getByLabel(/email/i).fill(TEST_EMAIL)
    await page.getByRole('button', { name: /send reset link/i }).click()

    // Wait for success message with longer timeout
    await expect(page.getByText(/if an account exists/i)).toBeVisible({ timeout: 10000 })
  })

  test('non-existent email still shows success message (no enumeration)', async ({ page }) => {
    await page.goto('/forgot-password')

    await page.getByLabel(/email/i).fill('nonexistent@example.com')
    await page.getByRole('button', { name: /send reset link/i }).click()

    // Should still show success to prevent email enumeration
    await expect(page.getByText(/if an account exists/i)).toBeVisible({ timeout: 10000 })
  })

  test('sends reset email with valid link', async ({ page }) => {
    await page.goto('/forgot-password')

    await page.getByLabel(/email/i).fill(TEST_EMAIL)
    await page.getByRole('button', { name: /send reset link/i }).click()

    await expect(page.getByText(/if an account exists/i)).toBeVisible({ timeout: 10000 })

    // Wait for email to arrive
    const email = await getLatestEmail()
    expect(email).not.toBeNull()
    expect(email.To[0].Address).toBe(TEST_EMAIL)
    expect(email.Subject).toBe('Reset your password')

    const token = extractResetToken(email.HTML)
    expect(token).not.toBeNull()
  })

  test('reset password page shows error for missing token', async ({ page }) => {
    await page.goto('/reset-password')

    await expect(page.getByText(/invalid reset link/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /request new reset link/i })).toBeVisible()
  })

  test('reset password page shows error for invalid token', async ({ page }) => {
    await page.goto('/reset-password?token=invalid-token')

    await page.getByLabel(/new password/i).fill(NEW_PASSWORD)
    await page.getByLabel(/confirm password/i).fill(NEW_PASSWORD)
    await page.getByRole('button', { name: /reset password/i }).click()

    await expect(page.getByText(/invalid or expired/i)).toBeVisible({ timeout: 10000 })
  })

  test('reset password validates password match', async ({ page }) => {
    await page.goto('/reset-password?token=some-token')

    await page.getByLabel(/new password/i).fill('password123')
    await page.getByLabel(/confirm password/i).fill('differentpassword')
    await page.getByRole('button', { name: /reset password/i }).click()

    await expect(page.getByText(/passwords do not match/i)).toBeVisible({ timeout: 5000 })
  })

  test('reset password validates minimum length', async ({ page }) => {
    await page.goto('/reset-password?token=some-token')

    await page.getByLabel(/new password/i).fill('short')
    await page.getByLabel(/confirm password/i).fill('short')
    await page.getByRole('button', { name: /reset password/i }).click()

    await expect(page.getByText(/at least 8 characters/i)).toBeVisible({ timeout: 5000 })
  })

  test('complete password reset flow', async ({ page }) => {
    // Step 1: Request password reset
    await page.goto('/forgot-password')
    await page.getByLabel(/email/i).fill(TEST_EMAIL)
    await page.getByRole('button', { name: /send reset link/i }).click()
    await expect(page.getByText(/if an account exists/i)).toBeVisible({ timeout: 10000 })

    // Step 2: Get reset token from email
    const email = await getLatestEmail()
    expect(email).not.toBeNull()

    const token = extractResetToken(email.HTML)
    expect(token).not.toBeNull()

    // Step 3: Reset password
    await page.goto(`/reset-password?token=${token}`)
    await page.getByLabel(/new password/i).fill(NEW_PASSWORD)
    await page.getByLabel(/confirm password/i).fill(NEW_PASSWORD)
    await page.getByRole('button', { name: /reset password/i }).click()

    // Step 4: Verify success
    await expect(page.getByText(/password has been reset/i)).toBeVisible({ timeout: 10000 })

    // Step 5: Go to login
    await page.getByRole('button', { name: /go to login/i }).click()
    await expect(page).toHaveURL('/login')

    // Step 6: Login with new password
    await page.getByLabel(/email/i).fill(TEST_EMAIL)
    await page.getByLabel(/password/i).fill(NEW_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should redirect to dashboard on successful login
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 })
  })
})

test('debug: capture page state after form submit', async ({ page }) => {
  // Capture network requests
  const requests: string[] = []
  page.on('request', req => {
    if (req.url().includes('/api/')) {
      requests.push(`${req.method()} ${req.url()}`)
    }
  })
  page.on('response', resp => {
    if (resp.url().includes('/api/')) {
      console.log(`Response: ${resp.status()} ${resp.url()}`)
    }
  })

  // Capture console errors
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })
  page.on('pageerror', err => {
    errors.push(err.message)
  })

  await page.goto('/forgot-password')

  // Wait for Vue hydration
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  await page.getByLabel(/email/i).fill('admin@admin.com')

  const button = page.getByRole('button', { name: /send reset link/i })
  console.log('Button found:', await button.count())
  console.log('Button disabled:', await button.isDisabled())

  // Try clicking with force
  await button.click()
  console.log('Button clicked')

  // Also try submitting the form directly
  // await page.locator('form').evaluate(form => (form as HTMLFormElement).submit())

  await page.waitForTimeout(3000)

  console.log('API requests:', requests)
  console.log('Console errors:', errors)

  // Check if success element exists
  const successVisible = await page.getByText(/if an account exists/i).isVisible().catch(() => false)
  console.log('Success message visible:', successVisible)
})
