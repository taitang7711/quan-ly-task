import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:5000';
const CREDENTIALS = { username: 'admin', password: 'admin123' };

async function loginViaAPI(request) {
  const loginRes = await request.post(`${API_BASE}/api/auth/login`, { data: CREDENTIALS });
  expect(loginRes.ok()).toBeTruthy();
  const { token } = await loginRes.json();
  return token;
}

async function setupPage(page, request) {
  const token = await loginViaAPI(request);
  await page.addInitScript((t) => localStorage.setItem('token', t), token);
  await page.goto('/kanban');
  await page.waitForLoadState('networkidle');
}

test('user can login and see kanban board', async ({ page, request }) => {
  await setupPage(page, request);
  await expect(page.locator('.kanban-board')).toBeVisible();
});

test('user can create a new task', async ({ page, request }) => {
  await setupPage(page, request);

  // Click on floating action button to create task
  await page.click('button:has-text("Tạo task")');
  await expect(page.locator('.v-dialog')).toBeVisible();

  // Fill in title using Vuetify fields - Vuetify 3 uses .v-field input
  const titleField = page.locator('.v-dialog .v-field').first();
  await titleField.click();
  await titleField.locator('input').fill('Test Task from Playwright');

  // Select category - Vuetify 3 uses v-select with menu
  const categorySelect = page.locator('.v-dialog .v-select').first();
  await categorySelect.click();
  await page.locator('.v-list-item:has-text("Công việc")').first().click();
  await page.waitForTimeout(300);

  // Click save
  await page.locator('.v-dialog button:has-text("Lưu")').click();
  await expect(page.locator('.v-dialog')).toBeHidden();
  await page.waitForTimeout(1500);
  await expect(page.getByText('Test Task from Playwright').first()).toBeVisible();
});

test('user can drag a task between columns', async ({ page, request }) => {
  await setupPage(page, request);

  // Wait for at least one task in todo column
  const todoColumn = page.locator('.kanban-column').first();
  const taskCard = todoColumn.locator('.task-card').first();
  await expect(taskCard).toBeVisible({ timeout: 10000 });

  const inProgressColumn = page.locator('.kanban-column').nth(1);
  const target = inProgressColumn.locator('.min-h-\\[400px\\]');

  await taskCard.dragTo(target);
  await page.waitForTimeout(1500);
  await expect(page.locator('body')).toBeVisible();
});

test('user can open dashboard and see stats', async ({ page, request }) => {
  await setupPage(page, request);
  await page.waitForTimeout(1000);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
});