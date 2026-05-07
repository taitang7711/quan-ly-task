import { test, expect } from '@playwright/test';

test('user can login and see kanban board', async ({ page, request }) => {
  // Login via API to get token
  const loginRes = await request.post('http://localhost:3000/api/auth/login', {
    data: { username: 'admin', password: 'admin123' }
  });
  expect(loginRes.ok()).toBeTruthy();
  const { token, user } = await loginRes.json();
  await page.addInitScript((t) => {
    localStorage.setItem('token', t);
  }, token);
  await page.goto('/kanban');
  await expect(page.locator('.kanban-board')).toBeVisible();
});

test('user can create a new task', async ({ page, request }) => {
  // Login via API
  const loginRes = await request.post('http://localhost:3000/api/auth/login', {
    data: { username: 'admin', password: 'admin123' }
  });
  expect(loginRes.ok()).toBeTruthy();
  const { token } = await loginRes.json();
  await page.addInitScript((t) => {
    localStorage.setItem('token', t);
  }, token);
  await page.goto('/kanban');

  // Click on floating action button to create task
  await page.click('.fixed.bottom-4.right-4');
  await expect(page.locator('.v-dialog')).toBeVisible();
  await page.fill('input[label="Tiêu đề"]', 'Test Task from Playwright');
  await page.selectOption('select[label="Danh mục"]', { label: 'Công việc' });
  await page.click('button:has-text("Lưu")');
  await expect(page.locator('.v-dialog')).toBeHidden();
  await page.waitForTimeout(1000);
  await expect(page.getByText('Test Task from Playwright')).toBeVisible();
});

test('user can drag a task between columns', async ({ page, request }) => {
  // Login via API
  const loginRes = await request.post('http://localhost:3000/api/auth/login', {
    data: { username: 'admin', password: 'admin123' }
  });
  expect(loginRes.ok()).toBeTruthy();
  const { token } = await loginRes.json();
  await page.addInitScript((t) => {
    localStorage.setItem('token', t);
  }, token);
  await page.goto('/kanban');

  // Wait for at least one task in todo column
  const todoColumn = page.locator('.kanban-column:first-child');
  const taskCard = todoColumn.locator('.task-card').first();
  await expect(taskCard).toBeVisible();

  const inProgressColumn = page.locator('.kanban-column:nth-child(2)');
  const target = inProgressColumn.locator('.min-h-\\[500px\\]');

  await taskCard.dragTo(target);
  await page.waitForTimeout(1000);
  await expect(page.locator('body')).toBeVisible();
});

test('user can open dashboard and see stats', async ({ page, request }) => {
  // Login via API
  const loginRes = await request.post('http://localhost:3000/api/auth/login', {
    data: { username: 'admin', password: 'admin123' }
  });
  expect(loginRes.ok()).toBeTruthy();
  const { token } = await loginRes.json();
  await page.addInitScript((t) => {
    localStorage.setItem('token', t);
  }, token);
  await page.goto('/kanban');
  await page.click('a:has-text("Dashboard")');
  await expect(page).toHaveURL('/');
  await expect(page.locator('canvas').first()).toBeVisible();
});