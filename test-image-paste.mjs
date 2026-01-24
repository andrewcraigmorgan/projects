import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

// Login via API first then use the token
console.log('Logging in...');
const loginRes = await page.request.post('http://localhost:3000/api/auth/login', {
  data: { email: 'admin@admin.com', password: 'admin123' }
});
const { data: { token, user } } = await loginRes.json();
const organizationId = user.organizations[0];

// Get a task to edit
const tasksRes = await page.request.get(`http://localhost:3000/api/tasks?projectId=6974e388ba4020ac9cb835bb&limit=1`, {
  headers: { Authorization: `Bearer ${token}` }
});
const tasksData = await tasksRes.json();
const task = tasksData.data?.tasks?.[0];

if (!task) {
  console.error('No task found!');
  await browser.close();
  process.exit(1);
}

console.log(`Using task: ${task.title} (${task.id})`);

// Visit login page and set token
await page.goto('http://localhost:3000/login');
await page.evaluate((t) => localStorage.setItem('auth_token', t), token);

// Navigate to dashboard first to set auth
console.log('Setting up auth...');
await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(1000);

// Now navigate to the task detail page
const taskUrl = `http://localhost:3000/projects/6974e388ba4020ac9cb835bb/tasks/${task.id}`;
console.log(`Navigating to task: ${taskUrl}`);
await page.goto(taskUrl, { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(2000);

console.log(`Current URL: ${page.url()}`);

// Take initial screenshot
await page.screenshot({ path: '/tmp/task-before-paste.png' });
console.log('Screenshot: /tmp/task-before-paste.png');

// Click the "Add description" or "Edit" button to show the editor
console.log('Clicking edit description button...');
const editBtn = await page.$('button:has-text("Add description"), button:has-text("Edit")');
if (editBtn) {
  await editBtn.click();
  await page.waitForTimeout(1000);
}

// Find the description editor and click to focus
console.log('Looking for description editor...');
const editor = await page.$('.rich-text-editor .ProseMirror');
if (editor) {
  await editor.click();
  await page.waitForTimeout(500);

  // Simulate pasting HTML with an external image
  // We'll use clipboard API to set HTML content
  const htmlWithImage = `
    <p>Test paste with external image:</p>
    <img src="https://via.placeholder.com/300x200/4F46E5/FFFFFF?text=Test+Image" alt="Test">
    <p>End of paste</p>
  `;

  console.log('Pasting HTML with external image...');

  // Use page.evaluate to paste content
  await page.evaluate(async (html) => {
    const editor = document.querySelector('.rich-text-editor .ProseMirror');
    if (editor) {
      editor.focus();

      // Create a paste event with HTML data
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/html', html);

      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: clipboardData
      });

      editor.dispatchEvent(pasteEvent);
    }
  }, htmlWithImage);

  // Wait for the proxy to process
  console.log('Waiting for image proxy...');
  await page.waitForTimeout(5000);

  // Take screenshot after paste
  await page.screenshot({ path: '/tmp/task-after-paste.png' });
  console.log('Screenshot: /tmp/task-after-paste.png');

  // Check the editor content
  const content = await page.evaluate(() => {
    const editor = document.querySelector('.rich-text-editor .ProseMirror');
    return editor?.innerHTML || '';
  });

  console.log('\nEditor content after paste:');
  console.log(content.substring(0, 500) + '...');

  if (content.includes('/api/attachments/')) {
    console.log('\n✓ SUCCESS: Image was proxied and stored locally!');
  } else if (content.includes('placeholder.com')) {
    console.log('\n✗ FAIL: External image URL still present');
  } else if (content.includes('Image could not be loaded')) {
    console.log('\n⚠ PARTIAL: Image proxy failed, showing placeholder');
  } else {
    console.log('\n? UNKNOWN: Check the screenshot');
  }
} else {
  console.log('Could not find editor');
}

console.log('\nBrowser will stay open for 30 seconds for manual inspection...');
await page.waitForTimeout(30000);

await browser.close();
console.log('Done!');
