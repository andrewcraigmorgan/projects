import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 375, height: 812 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
});

const page = await context.newPage();

// Login via API first then use the token
console.log('Logging in...');
const loginRes = await page.request.post('http://localhost:3000/api/auth/login', {
  data: { email: 'admin@admin.com', password: 'admin123' }
});
const { data: { token, user } } = await loginRes.json();
const organizationId = user.organizations[0];

// Get the project with tasks
const projectsRes = await page.request.get(`http://localhost:3000/api/projects?organizationId=${organizationId}`, {
  headers: { Authorization: `Bearer ${token}` }
});
const projectsData = await projectsRes.json();
const project = projectsData.data?.projects?.[0];

if (!project) {
  console.error('No project found!');
  await browser.close();
  process.exit(1);
}

console.log(`Using project: ${project.name}`);

// Visit login page and set token
await page.goto('http://localhost:3000/login');
await page.evaluate((t) => localStorage.setItem('auth_token', t), token);

// Test the dashboard
console.log('Testing dashboard...');
await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(1000);
await page.screenshot({ path: '/tmp/mobile-dashboard.png' });
console.log('  Screenshot: /tmp/mobile-dashboard.png');

// Open sidebar
console.log('Testing sidebar...');
const menuBtn = await page.$('button[aria-label="Open menu"]');
if (menuBtn) {
  await menuBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/mobile-sidebar-open.png' });
  console.log('  Screenshot: /tmp/mobile-sidebar-open.png');

  // Close sidebar by clicking overlay or close button
  const closeBtn = await page.$('button[aria-label="Close sidebar"]');
  if (closeBtn) await closeBtn.click();
  await page.waitForTimeout(300);
}

// Navigate to projects list
console.log('Testing projects list...');
await page.goto('http://localhost:3000/projects', { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/mobile-projects-list.png' });
console.log('  Screenshot: /tmp/mobile-projects-list.png');

// Navigate to the project with tasks - List view
console.log(`Navigating to project: ${project.id}`);
await page.goto(`http://localhost:3000/projects/${project.id}`, { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: '/tmp/mobile-task-list.png' });
console.log('  Screenshot: /tmp/mobile-task-list.png');

// Switch to board view using title attribute
console.log('Testing board view...');
const boardBtn = await page.$('button[title="Board view"]');
if (boardBtn) {
  await boardBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/mobile-task-board.png' });
  console.log('  Screenshot: /tmp/mobile-task-board.png');
}

// Click on a task to test modal - find any clickable task element
console.log('Testing task modal...');
// Tasks have cursor-pointer class and contain the task title
const taskItem = await page.$('.cursor-pointer:has(.font-medium)');
if (taskItem) {
  await taskItem.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/mobile-task-modal.png' });
  console.log('  Screenshot: /tmp/mobile-task-modal.png');
}

await browser.close();
console.log('Done!');
