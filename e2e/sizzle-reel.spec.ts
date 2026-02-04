import { test, expect, Page } from '@playwright/test'

/**
 * Sizzle Reel — a serial walkthrough of the app's core features,
 * designed to be screen-recorded for the README.
 *
 * Run with:
 *   npx playwright test e2e/sizzle-reel.spec.ts --headed
 *
 * Record video:
 *   npx playwright test e2e/sizzle-reel.spec.ts --project sizzle-reel
 *   (videos saved to test-results/)
 */

// Slow down interactions so the recording looks natural
const PAUSE = 400 // ms between actions
const LONG_PAUSE = 800

async function waitForHydration(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(300)
}

async function pause(page: Page, ms = PAUSE) {
  await page.waitForTimeout(ms)
}

test.describe('Sizzle Reel — Feature Walkthrough', () => {
  test.describe.configure({ mode: 'serial', timeout: 60_000 })

  let page: Page

  // Shared state across tests
  let projectName: string
  let projectUrl: string

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      recordVideo: { dir: 'test-results/sizzle-reel-videos', size: { width: 1440, height: 900 } },
    })
    page = await context.newPage()
    projectName = `Demo Project ${Date.now().toString(36).slice(-4)}`
  })

  test.afterAll(async () => {
    await page.context().close() // closes page + flushes video
  })

  // ─── Scene 1: Login ───────────────────────────────────────────────
  test('Scene 1 — Login', async () => {
    await page.goto('/login')
    await waitForHydration(page)
    await pause(page, LONG_PAUSE)

    // Show the login form
    await expect(page.getByText('Sign in to your account')).toBeVisible()

    await page.getByLabel(/email/i).click()
    await page.getByLabel(/email/i).fill('admin@admin.com')
    await pause(page)

    await page.getByLabel(/password/i).click()
    await page.getByLabel(/password/i).fill('admin123')
    await pause(page)

    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/dashboard|projects/, { timeout: 15000 })
    await waitForHydration(page)
    await pause(page, LONG_PAUSE)
  })

  // ─── Scene 2: Dashboard ───────────────────────────────────────────
  test('Scene 2 — Dashboard overview', async () => {
    await page.goto('/dashboard?stay=true')
    await waitForHydration(page)
    await pause(page, LONG_PAUSE)

    // Show stat cards if they exist
    const orgCard = page.getByText('Organization', { exact: true })
    if (await orgCard.isVisible()) {
      await expect(orgCard).toBeVisible()
    }

    await pause(page, LONG_PAUSE)
  })

  // ─── Scene 3: Create a Project ────────────────────────────────────
  test('Scene 3 — Create a project', async () => {
    // Navigate to Projects
    const projectsLink = page.locator('nav[aria-label="Main navigation"]').getByRole('link', { name: /projects/i })
    await projectsLink.click()
    await waitForHydration(page)
    await pause(page, LONG_PAUSE)

    // Click "New Project"
    await page.getByRole('button', { name: /new project/i }).click()
    await pause(page)

    // Fill in the modal
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByLabel(/project name/i).fill(projectName)
    await pause(page)

    await dialog.locator('textarea').fill('A sample project showcasing all features of the app.')
    await pause(page)

    await dialog.getByRole('button', { name: /create project/i }).click()
    await waitForHydration(page)
    await pause(page, LONG_PAUSE)

    // Click into the newly created project
    const projectLink = page.getByText(projectName)
    await expect(projectLink).toBeVisible({ timeout: 5000 })
    await projectLink.click()
    await waitForHydration(page)

    // Save the URL for later
    projectUrl = page.url()
    await pause(page, LONG_PAUSE)
  })

  // ─── Scene 4: Create tasks via quick-add ──────────────────────────
  test('Scene 4 — Create tasks', async () => {
    await page.goto(projectUrl)
    await waitForHydration(page)

    // Switch to "All Tasks" preset so we can see all statuses
    const preset = page.locator('select').filter({ has: page.locator('option[value="all"]') }).first()
    if (await preset.isVisible()) {
      await preset.selectOption('all')
      await waitForHydration(page)
    }

    const taskTitles = [
      'Set up CI/CD pipeline',
      'Design landing page mockups',
      'Write API documentation',
      'Implement user authentication',
      'Add dark mode support',
    ]

    // Use the quick-add input at the bottom of the task table
    const quickAddInput = page.getByPlaceholder(/add a task/i).first()

    for (const title of taskTitles) {
      await quickAddInput.click()
      await quickAddInput.fill(title)
      await pause(page, 200)
      await page.keyboard.press('Enter')
      await waitForHydration(page)
      await pause(page, 300)
    }

    // Now update statuses and priorities on the task cards
    // Wait for all tasks to appear
    await pause(page, LONG_PAUSE)

    // Update first task to High priority
    const rows = page.locator('table[aria-label="Tasks list"] tbody tr').filter({ hasNotText: /add a task/i })
    const taskCount = await rows.count()

    const priorities = ['High', 'Medium', 'Low', 'High', 'Medium']
    const statuses = ['To Do', 'In Progress', 'To Do', 'Done', 'In Progress']

    for (let i = 0; i < Math.min(taskCount, 5); i++) {
      const row = rows.nth(i)
      // Set priority via the dropdown on the card
      const prioritySelect = row.locator('select[aria-label="Task priority"]')
      if (await prioritySelect.isVisible()) {
        await prioritySelect.selectOption({ label: priorities[i] })
        await pause(page, 150)
      }

      // Set status via the dropdown on the card
      const statusSelect = row.locator('select[aria-label="Task status"]')
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption({ label: statuses[i] })
        await pause(page, 150)
      }
    }

    await pause(page, LONG_PAUSE)
  })

  // ─── Scene 5: Board view ──────────────────────────────────────────
  test('Scene 5 — Switch to board view', async () => {
    const boardBtn = page.getByRole('button', { name: /board/i })
    if (await boardBtn.isVisible()) {
      await boardBtn.click()
      await waitForHydration(page)
      await pause(page, LONG_PAUSE)
      await pause(page, LONG_PAUSE)

      // Switch back to list
      const listBtn = page.getByRole('button', { name: /list/i })
      if (await listBtn.isVisible()) {
        await listBtn.click()
        await waitForHydration(page)
        await pause(page)
      }
    }
  })

  // ─── Scene 6: Task detail + subtasks ──────────────────────────────
  test('Scene 6 — Task detail page with subtasks', async () => {
    // Click into the first task via the table row link
    const firstTask = page.getByText('Set up CI/CD pipeline').first()
    await firstTask.click()
    await waitForHydration(page)
    await pause(page, LONG_PAUSE)

    // We should be on the task detail page
    await expect(page.getByRole('heading', { name: /Set up CI\/CD pipeline/i })).toBeVisible({ timeout: 5000 })

    // Add subtasks — click "Add subtask" to open the form, then keep reusing it
    const subtasks = [
      'Configure GitHub Actions workflow',
      'Set up staging environment',
      'Add automated test suite',
    ]

    for (const subtask of subtasks) {
      // If the form is not open, click "Add subtask" to open it
      const subtaskInput = page.locator('input[placeholder*="Subtask title"]')
      if (!(await subtaskInput.isVisible())) {
        const addSubtaskBtn = page.getByRole('button', { name: /add subtask/i })
        await addSubtaskBtn.click()
        await pause(page, 200)
      }

      await subtaskInput.fill(subtask)
      await pause(page, 200)

      // Click the Add button (not the "Add subtask" button)
      const addBtn = page.getByRole('button', { name: /^add$/i })
      await addBtn.click()
      await waitForHydration(page)
      await pause(page, 400)
    }

    // Close the subtask form if still open
    const cancelBtn = page.getByRole('button', { name: /cancel/i })
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click()
    }

    await pause(page, LONG_PAUSE)
  })

  // ─── Scene 7: Add a comment ───────────────────────────────────────
  test('Scene 7 — Add a comment', async () => {
    // Scroll to comments section
    const commentsHeading = page.locator('h3').filter({ hasText: /comments/i }).first()
    if (await commentsHeading.isVisible()) {
      await commentsHeading.scrollIntoViewIfNeeded()
    }
    await pause(page)

    // Click "Add comment"
    const addCommentBtn = page.getByRole('button', { name: /add comment/i })
    if (await addCommentBtn.isVisible()) {
      await addCommentBtn.click()
      await pause(page)

      // Type in the rich text editor (TipTap uses contenteditable div)
      const editor = page.locator('.tiptap, .ProseMirror').first()
      if (await editor.isVisible()) {
        await editor.click()
        await page.keyboard.type(
          'Looking good! The pipeline should support both staging and production deployments.',
          { delay: 15 }
        )
        await pause(page)
      }

      // Post the comment
      const postBtn = page.getByRole('button', { name: /post comment/i })
      if (await postBtn.isVisible()) {
        await postBtn.click()
        await waitForHydration(page)
        await pause(page, LONG_PAUSE)
      }
    }
  })

  // ─── Scene 8: Tags ────────────────────────────────────────────────
  test('Scene 8 — Create tags', async () => {
    // Navigate via project nav links
    const tagsLink = page.getByRole('link', { name: /^tags$/i })
    if (await tagsLink.isVisible()) {
      await tagsLink.click()
    } else {
      const url = projectUrl.replace(/\/?$/, '/tags')
      await page.goto(url)
    }
    await waitForHydration(page)
    await pause(page, LONG_PAUSE)

    const tags = ['Frontend', 'Backend', 'DevOps', 'Documentation']

    for (const tagName of tags) {
      const newTagBtn = page.getByRole('button', { name: /new tag/i }).first()
      await newTagBtn.click()
      await pause(page)

      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()

      await dialog.locator('#tag-name').fill(tagName)
      await pause(page, 200)

      // Pick a color swatch
      const swatches = dialog.locator('button.rounded-full')
      const count = await swatches.count()
      if (count > 0) {
        const idx = tags.indexOf(tagName) % count
        await swatches.nth(idx).click()
        await pause(page, 200)
      }

      await dialog.getByRole('button', { name: /create tag/i }).click()
      await waitForHydration(page)
      await pause(page, 300)
    }

    await pause(page, LONG_PAUSE)
  })

  // ─── Scene 9: Milestones ──────────────────────────────────────────
  test('Scene 9 — Create a milestone', async () => {
    const milestonesLink = page.getByRole('link', { name: /milestones/i })
    if (await milestonesLink.isVisible()) {
      await milestonesLink.click()
    } else {
      const url = projectUrl.replace(/\/?$/, '/milestones')
      await page.goto(url)
    }
    await waitForHydration(page)
    await pause(page, LONG_PAUSE)

    const newBtn = page.getByRole('button', { name: /new milestone/i }).first()
    await newBtn.click()
    await pause(page)

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.locator('input[type="text"]').fill('v1.0 Launch')
    await pause(page, 200)

    const today = new Date()
    const startDate = today.toISOString().split('T')[0]
    const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const dateInputs = dialog.locator('input[type="date"]')
    if ((await dateInputs.count()) >= 2) {
      await dateInputs.first().fill(startDate)
      await pause(page, 200)
      await dateInputs.nth(1).fill(endDate)
      await pause(page, 200)
    }

    await dialog.getByRole('button', { name: /create milestone/i }).click()
    await waitForHydration(page)
    await pause(page, LONG_PAUSE)
  })

  // ─── Scene 10: Filters & search ───────────────────────────────────
  test('Scene 10 — Filter and search tasks', async () => {
    await page.goto(projectUrl)
    await waitForHydration(page)
    await pause(page, LONG_PAUSE)

    // Switch to All Tasks to see everything
    const preset = page.locator('select').filter({ has: page.locator('option[value="all"]') }).first()
    if (await preset.isVisible()) {
      await preset.selectOption('all')
      await waitForHydration(page)
      await pause(page)
    }

    // Search for a task
    const searchInput = page.getByPlaceholder(/search tasks/i).first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('CI/CD')
      await waitForHydration(page)
      await pause(page, LONG_PAUSE)

      // Clear search
      await searchInput.clear()
      await waitForHydration(page)
      await pause(page)
    }

    await pause(page, LONG_PAUSE)
  })

  // ─── Scene 11: My Tasks ──────────────────────────────────────────
  test('Scene 11 — My Tasks view', async () => {
    const myTasksLink = page.locator('nav[aria-label="Main navigation"]').getByRole('link', { name: /my tasks/i })
    await myTasksLink.click()
    await waitForHydration(page)
    await pause(page, LONG_PAUSE)

    // Show board view if available
    const boardBtn = page.getByRole('button', { name: /board/i })
    if (await boardBtn.isVisible()) {
      await boardBtn.click()
      await waitForHydration(page)
      await pause(page, LONG_PAUSE)

      const listBtn = page.getByRole('button', { name: /list/i })
      if (await listBtn.isVisible()) {
        await listBtn.click()
        await waitForHydration(page)
        await pause(page)
      }
    }

    await pause(page, LONG_PAUSE)
  })

  // ─── Scene 12: Project members ────────────────────────────────────
  test('Scene 12 — Project members page', async () => {
    const url = projectUrl.replace(/\/?$/, '/members')
    await page.goto(url)
    await waitForHydration(page)
    await pause(page, LONG_PAUSE)
    await pause(page, LONG_PAUSE)
  })

  // ─── Scene 13: Audit log ──────────────────────────────────────────
  test('Scene 13 — Audit log', async () => {
    const url = projectUrl.replace(/\/?$/, '/audit')
    await page.goto(url)
    await waitForHydration(page)
    await pause(page, LONG_PAUSE)
    await pause(page, LONG_PAUSE)
  })

  // ─── Scene 14: Settings ───────────────────────────────────────────
  test('Scene 14 — Settings page', async () => {
    const settingsLink = page.locator('nav[aria-label="Main navigation"]').getByRole('link', { name: /settings/i })
    await settingsLink.click()
    await waitForHydration(page)
    await pause(page, LONG_PAUSE)
    await pause(page, LONG_PAUSE)
  })
})
