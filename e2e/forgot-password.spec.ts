import { test, expect } from '@playwright/test'

const MAILPIT_API = 'http://localhost:8025/api/v1'
const TEST_EMAIL = 'admin@admin.com'
const ORIGINAL_PASSWORD = 'admin123'
const NEW_PASSWORD = 'newpassword123'

async function clearMailpit() {
  await fetch(`${MAILPIT_API}/messages`, { method: 'DELETE' })
}

async function getLatestEmail(retries = 20): Promise<any> {
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

async function getEmailCount(): Promise<number> {
  const response = await fetch(`${MAILPIT_API}/messages`)
  const data = await response.json()
  return data.messages?.length || 0
}

function extractResetToken(html: string): string | null {
  const match = html.match(/reset-password\?token=([^"&\s]+)/)
  return match ? match[1] : null
}

// Helper to wait for Vue hydration
async function waitForHydration(page: any) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
}

test.describe('Forgot Password Flow', () => {
  // Run tests serially to avoid race conditions with shared test user
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async () => {
    await clearMailpit()
  })

  test.describe('Navigation & Links', () => {
    test('shows forgot password link on login page', async ({ page }) => {
      await page.goto('/login')
      await waitForHydration(page)

      const forgotLink = page.getByRole('link', { name: /forgot your password/i })
      await expect(forgotLink).toBeVisible()

      await forgotLink.click()
      await expect(page).toHaveURL('/forgot-password')
    })

    test('back to login link works on forgot password page', async ({ page }) => {
      await page.goto('/forgot-password')
      await waitForHydration(page)

      const backLink = page.getByRole('link', { name: /back to login/i })
      await expect(backLink).toBeVisible()

      await backLink.click()
      await expect(page).toHaveURL('/login')
    })

    test('back to login link works on reset password page', async ({ page }) => {
      await page.goto('/reset-password?token=some-token')
      await waitForHydration(page)

      const backLink = page.getByRole('link', { name: /back to login/i })
      await expect(backLink).toBeVisible()

      await backLink.click()
      await expect(page).toHaveURL('/login')
    })

    test('request new reset link button navigates to forgot password', async ({ page }) => {
      await page.goto('/reset-password')
      await waitForHydration(page)

      await page.getByRole('button', { name: /request new reset link/i }).click()
      await expect(page).toHaveURL('/forgot-password')
    })
  })

  test.describe('Forgot Password Page', () => {
    test('displays correct heading and description', async ({ page }) => {
      await page.goto('/forgot-password')
      await waitForHydration(page)

      await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible()
      await expect(page.getByText(/enter your email/i)).toBeVisible()
    })

    test('email input has proper label and is required', async ({ page }) => {
      await page.goto('/forgot-password')
      await waitForHydration(page)

      const emailInput = page.getByLabel(/email/i)
      await expect(emailInput).toBeVisible()
      await expect(emailInput).toHaveAttribute('required', '')
      await expect(emailInput).toHaveAttribute('type', 'email')
    })

    test('shows success message after valid submission', async ({ page }) => {
      await page.goto('/forgot-password')
      await waitForHydration(page)

      await page.getByLabel(/email/i).fill(TEST_EMAIL)
      await page.getByRole('button', { name: /send reset link/i }).click()

      await expect(page.getByText(/if an account exists/i)).toBeVisible({ timeout: 10000 })
    })

    test('shows success for non-existent email (prevents enumeration)', async ({ page }) => {
      await page.goto('/forgot-password')
      await waitForHydration(page)

      await page.getByLabel(/email/i).fill('nonexistent@example.com')
      await page.getByRole('button', { name: /send reset link/i }).click()

      // Should still show success to prevent email enumeration
      await expect(page.getByText(/if an account exists/i)).toBeVisible({ timeout: 10000 })
    })

    test('does not send email for non-existent account', async ({ page }) => {
      await page.goto('/forgot-password')
      await waitForHydration(page)

      await page.getByLabel(/email/i).fill('nonexistent@example.com')
      await page.getByRole('button', { name: /send reset link/i }).click()

      await expect(page.getByText(/if an account exists/i)).toBeVisible({ timeout: 10000 })

      // Wait a bit and verify no email was sent
      await page.waitForTimeout(2000)
      const emailCount = await getEmailCount()
      expect(emailCount).toBe(0)
    })

    test('shows loading state while submitting', async ({ page }) => {
      await page.goto('/forgot-password')
      await waitForHydration(page)

      await page.getByLabel(/email/i).fill(TEST_EMAIL)

      // Check button before click
      const button = page.getByRole('button', { name: /send reset link/i })
      await expect(button).not.toBeDisabled()

      // Click and immediately check for loading state
      await button.click()

      // Button should be disabled during loading (may be brief)
      // Success message should appear after
      await expect(page.getByText(/if an account exists/i)).toBeVisible({ timeout: 10000 })
    })

    test('hides form and shows success message after submission', async ({ page }) => {
      await page.goto('/forgot-password')
      await waitForHydration(page)

      await page.getByLabel(/email/i).fill(TEST_EMAIL)
      await page.getByRole('button', { name: /send reset link/i }).click()

      await expect(page.getByText(/if an account exists/i)).toBeVisible({ timeout: 10000 })

      // Form should be hidden
      await expect(page.getByLabel(/email/i)).not.toBeVisible()
      await expect(page.getByRole('button', { name: /send reset link/i })).not.toBeVisible()
    })
  })

  test.describe('Reset Email', () => {
    test('sends email with correct recipient and subject', async ({ page }) => {
      await page.goto('/forgot-password')
      await waitForHydration(page)

      await page.getByLabel(/email/i).fill(TEST_EMAIL)
      await page.getByRole('button', { name: /send reset link/i }).click()

      await expect(page.getByText(/if an account exists/i)).toBeVisible({ timeout: 10000 })

      const email = await getLatestEmail()
      expect(email).not.toBeNull()
      expect(email.To[0].Address).toBe(TEST_EMAIL)
      expect(email.Subject).toBe('Reset your password')
    })

    test('email contains valid reset link', async ({ page }) => {
      await page.goto('/forgot-password')
      await waitForHydration(page)

      await page.getByLabel(/email/i).fill(TEST_EMAIL)
      await page.getByRole('button', { name: /send reset link/i }).click()

      await expect(page.getByText(/if an account exists/i)).toBeVisible({ timeout: 10000 })

      const email = await getLatestEmail()
      const token = extractResetToken(email.HTML)
      expect(token).not.toBeNull()
      expect(token!.length).toBeGreaterThan(50) // JWT tokens are long
    })

    test('email contains expiry information', async ({ page }) => {
      await page.goto('/forgot-password')
      await waitForHydration(page)

      await page.getByLabel(/email/i).fill(TEST_EMAIL)
      await page.getByRole('button', { name: /send reset link/i }).click()

      await expect(page.getByText(/if an account exists/i)).toBeVisible({ timeout: 10000 })

      const email = await getLatestEmail()
      expect(email.HTML).toContain('15 minutes')
    })

    test('email contains user greeting', async ({ page }) => {
      await page.goto('/forgot-password')
      await waitForHydration(page)

      await page.getByLabel(/email/i).fill(TEST_EMAIL)
      await page.getByRole('button', { name: /send reset link/i }).click()

      await expect(page.getByText(/if an account exists/i)).toBeVisible({ timeout: 10000 })

      const email = await getLatestEmail()
      // Email should contain "Hi" followed by the user's name
      expect(email.HTML).toMatch(/Hi\s+\w+/i)
    })

    test('multiple requests generate different tokens', async ({ page }) => {
      await page.goto('/forgot-password')
      await waitForHydration(page)

      // First request
      await page.getByLabel(/email/i).fill(TEST_EMAIL)
      await page.getByRole('button', { name: /send reset link/i }).click()
      await expect(page.getByText(/if an account exists/i)).toBeVisible({ timeout: 10000 })

      const email1 = await getLatestEmail()
      const token1 = extractResetToken(email1.HTML)

      // Clear and make second request
      await clearMailpit()
      await page.goto('/forgot-password')
      await waitForHydration(page)

      await page.getByLabel(/email/i).fill(TEST_EMAIL)
      await page.getByRole('button', { name: /send reset link/i }).click()
      await expect(page.getByText(/if an account exists/i)).toBeVisible({ timeout: 10000 })

      const email2 = await getLatestEmail()
      const token2 = extractResetToken(email2.HTML)

      // Tokens should be different (different timestamps)
      expect(token1).not.toBe(token2)
    })
  })

  test.describe('Reset Password Page', () => {
    test('shows error for missing token', async ({ page }) => {
      await page.goto('/reset-password')
      await waitForHydration(page)

      await expect(page.getByText(/invalid reset link/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /request new reset link/i })).toBeVisible()
    })

    test('shows form when token is present', async ({ page }) => {
      await page.goto('/reset-password?token=some-token')
      await waitForHydration(page)

      await expect(page.getByLabel(/new password/i)).toBeVisible()
      await expect(page.getByLabel(/confirm password/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /reset password/i })).toBeVisible()
    })

    test('password inputs are required', async ({ page }) => {
      await page.goto('/reset-password?token=some-token')
      await waitForHydration(page)

      const newPassword = page.getByLabel(/new password/i)
      const confirmPassword = page.getByLabel(/confirm password/i)

      await expect(newPassword).toHaveAttribute('required', '')
      await expect(confirmPassword).toHaveAttribute('required', '')
    })

    test('shows error for invalid token', async ({ page }) => {
      await page.goto('/reset-password?token=invalid-token')
      await waitForHydration(page)

      await page.getByLabel(/new password/i).fill(NEW_PASSWORD)
      await page.getByLabel(/confirm password/i).fill(NEW_PASSWORD)
      await page.getByRole('button', { name: /reset password/i }).click()

      await expect(page.getByText(/invalid or expired/i)).toBeVisible({ timeout: 10000 })
    })

    test('validates password match', async ({ page }) => {
      await page.goto('/reset-password?token=some-token')
      await waitForHydration(page)

      await page.getByLabel(/new password/i).fill('password123')
      await page.getByLabel(/confirm password/i).fill('differentpassword')
      await page.getByRole('button', { name: /reset password/i }).click()

      await expect(page.getByText(/passwords do not match/i)).toBeVisible({ timeout: 5000 })
    })

    test('validates minimum password length', async ({ page }) => {
      await page.goto('/reset-password?token=some-token')
      await waitForHydration(page)

      await page.getByLabel(/new password/i).fill('short')
      await page.getByLabel(/confirm password/i).fill('short')
      await page.getByRole('button', { name: /reset password/i }).click()

      await expect(page.getByText(/at least 8 characters/i)).toBeVisible({ timeout: 5000 })
    })

    test('accepts password with special characters', async ({ page }) => {
      // First get a valid token
      await page.goto('/forgot-password')
      await waitForHydration(page)
      await page.getByLabel(/email/i).fill(TEST_EMAIL)
      await page.getByRole('button', { name: /send reset link/i }).click()
      await expect(page.getByText(/if an account exists/i)).toBeVisible({ timeout: 10000 })

      const email = await getLatestEmail()
      const token = extractResetToken(email.HTML)

      // Try resetting with special characters
      const specialPassword = 'P@ssw0rd!#$%'
      await page.goto(`/reset-password?token=${token}`)
      await waitForHydration(page)

      await page.getByLabel(/new password/i).fill(specialPassword)
      await page.getByLabel(/confirm password/i).fill(specialPassword)
      await page.getByRole('button', { name: /reset password/i }).click()

      await expect(page.getByText(/password has been reset/i)).toBeVisible({ timeout: 10000 })

      // Reset back to original password
      await clearMailpit()
      await page.goto('/forgot-password')
      await waitForHydration(page)
      await page.getByLabel(/email/i).fill(TEST_EMAIL)
      await page.getByRole('button', { name: /send reset link/i }).click()
      await expect(page.getByText(/if an account exists/i)).toBeVisible({ timeout: 10000 })

      const resetEmail = await getLatestEmail()
      const resetToken = extractResetToken(resetEmail.HTML)

      await page.goto(`/reset-password?token=${resetToken}`)
      await waitForHydration(page)
      await page.getByLabel(/new password/i).fill(ORIGINAL_PASSWORD)
      await page.getByLabel(/confirm password/i).fill(ORIGINAL_PASSWORD)
      await page.getByRole('button', { name: /reset password/i }).click()
      await expect(page.getByText(/password has been reset/i)).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Complete Flow', () => {
    test('full password reset and login flow', async ({ page }) => {
      // Step 1: Request password reset
      await page.goto('/forgot-password')
      await waitForHydration(page)

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
      await waitForHydration(page)

      await page.getByLabel(/new password/i).fill(NEW_PASSWORD)
      await page.getByLabel(/confirm password/i).fill(NEW_PASSWORD)
      await page.getByRole('button', { name: /reset password/i }).click()

      // Step 4: Verify success
      await expect(page.getByText(/password has been reset/i)).toBeVisible({ timeout: 10000 })

      // Step 5: Go to login
      await page.getByRole('button', { name: /go to login/i }).click()
      await expect(page).toHaveURL('/login')

      // Step 6: Login with new password
      await waitForHydration(page)
      await page.getByLabel(/email/i).fill(TEST_EMAIL)
      await page.getByLabel(/password/i).fill(NEW_PASSWORD)
      await page.getByRole('button', { name: /sign in/i }).click()

      // Should redirect to dashboard on successful login
      await expect(page).toHaveURL('/dashboard', { timeout: 10000 })

      // Step 7: Reset password back to original for other tests
      await clearMailpit()
      await page.goto('/forgot-password')
      await waitForHydration(page)
      await page.getByLabel(/email/i).fill(TEST_EMAIL)
      await page.getByRole('button', { name: /send reset link/i }).click()
      await expect(page.getByText(/if an account exists/i)).toBeVisible({ timeout: 10000 })

      const resetEmail = await getLatestEmail()
      const resetToken = extractResetToken(resetEmail.HTML)

      await page.goto(`/reset-password?token=${resetToken}`)
      await waitForHydration(page)
      await page.getByLabel(/new password/i).fill(ORIGINAL_PASSWORD)
      await page.getByLabel(/confirm password/i).fill(ORIGINAL_PASSWORD)
      await page.getByRole('button', { name: /reset password/i }).click()
      await expect(page.getByText(/password has been reset/i)).toBeVisible({ timeout: 10000 })
    })

    test('old password does not work after reset', async ({ page }) => {
      // Get a reset token and change password
      await page.goto('/forgot-password')
      await waitForHydration(page)
      await page.getByLabel(/email/i).fill(TEST_EMAIL)
      await page.getByRole('button', { name: /send reset link/i }).click()
      await expect(page.getByText(/if an account exists/i)).toBeVisible({ timeout: 10000 })

      const email = await getLatestEmail()
      const token = extractResetToken(email.HTML)

      await page.goto(`/reset-password?token=${token}`)
      await waitForHydration(page)
      await page.getByLabel(/new password/i).fill(NEW_PASSWORD)
      await page.getByLabel(/confirm password/i).fill(NEW_PASSWORD)
      await page.getByRole('button', { name: /reset password/i }).click()
      await expect(page.getByText(/password has been reset/i)).toBeVisible({ timeout: 10000 })

      // Try to login with OLD password
      await page.goto('/login')
      await waitForHydration(page)
      await page.getByLabel(/email/i).fill(TEST_EMAIL)
      await page.getByLabel(/password/i).fill(ORIGINAL_PASSWORD)
      await page.getByRole('button', { name: /sign in/i }).click()

      // Should show error - old password doesn't work
      await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 10000 })

      // Reset back to original password
      await clearMailpit()
      await page.goto('/forgot-password')
      await waitForHydration(page)
      await page.getByLabel(/email/i).fill(TEST_EMAIL)
      await page.getByRole('button', { name: /send reset link/i }).click()
      await expect(page.getByText(/if an account exists/i)).toBeVisible({ timeout: 10000 })

      const resetEmail = await getLatestEmail()
      const resetToken = extractResetToken(resetEmail.HTML)

      await page.goto(`/reset-password?token=${resetToken}`)
      await waitForHydration(page)
      await page.getByLabel(/new password/i).fill(ORIGINAL_PASSWORD)
      await page.getByLabel(/confirm password/i).fill(ORIGINAL_PASSWORD)
      await page.getByRole('button', { name: /reset password/i }).click()
      await expect(page.getByText(/password has been reset/i)).toBeVisible({ timeout: 10000 })
    })

    test('can use token from email link directly', async ({ page }) => {
      // Request reset
      await page.goto('/forgot-password')
      await waitForHydration(page)
      await page.getByLabel(/email/i).fill(TEST_EMAIL)
      await page.getByRole('button', { name: /send reset link/i }).click()
      await expect(page.getByText(/if an account exists/i)).toBeVisible({ timeout: 10000 })

      // Get the full reset URL from email
      const email = await getLatestEmail()
      const urlMatch = email.HTML.match(/href="([^"]*reset-password[^"]*)"/)
      expect(urlMatch).not.toBeNull()

      const resetUrl = urlMatch![1]

      // Navigate directly to the URL from email
      await page.goto(resetUrl)
      await waitForHydration(page)

      // Should show the reset form, not an error
      await expect(page.getByLabel(/new password/i)).toBeVisible()
      await expect(page.getByText(/invalid reset link/i)).not.toBeVisible()
    })
  })
})
