import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:5000';
const CREDENTIALS = { username: 'admin', password: 'admin123' };

let authToken = '';
let createdTaskId = null;
let createdCategoryId = null;
let createdSubcategoryId = null;

test.describe.configure({ mode: 'serial' });

async function loginViaAPI(request) {
  const loginRes = await request.post(`${API_BASE}/api/auth/login`, { data: CREDENTIALS });
  expect(loginRes.ok()).toBeTruthy();
  const body = await loginRes.json();
  authToken = body.token;
  return body.token;
}

async function setupPage(page, request) {
  const token = await loginViaAPI(request);
  await page.addInitScript((t) => localStorage.setItem('token', t), token);
  await page.goto('/kanban');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
}

test.describe('1. Authentication', () => {
  test('1.1 Login page loads correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1:has-text("Task Manager")')).toBeVisible();
    await expect(page.locator('text=Đăng nhập để tiếp tục')).toBeVisible();
    await expect(page.locator('button:has-text("Đăng nhập")')).toBeVisible();
  });

  test('1.2 Login via API succeeds', async ({ request }) => {
    const token = await loginViaAPI(request);
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
  });

  test('1.3 Login via UI works', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Tên đăng nhập').fill('admin');
    await page.getByLabel('Mật khẩu').fill('admin123');
    await page.locator('button:has-text("Đăng nhập")').click();
    await page.waitForURL(/\/kanban|\//);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.appbar, .v-app-bar')).toBeVisible();
  });

  test('1.4 Logout works', async ({ page, request }) => {
    const token = await loginViaAPI(request);
    await page.addInitScript((t) => localStorage.setItem('token', t), token);
    await page.goto('/kanban');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.locator('.profile-btn').click();
    await page.waitForTimeout(500);
    await page.locator('.v-menu .v-list-item').last().click();
    await page.waitForURL('/login');
    await expect(page.locator('button:has-text("Đăng nhập")')).toBeVisible();
  });
});

test.describe('2. Navigation', () => {
  test('2.1 All nav buttons visible', async ({ page, request }) => {
    await setupPage(page, request);
    const navButtons = ['Dashboard', 'Kanban', 'Báo cáo', 'AI', 'Quản lý'];
    for (const btn of navButtons) {
      await expect(page.locator(`.nav-btn:has-text("${btn}")`).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('2.2 Navigate to Dashboard', async ({ page, request }) => {
    await setupPage(page, request);
    await page.locator('.nav-btn:has-text("Dashboard")').click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
  });

  test('2.3 Navigate to Kanban', async ({ page, request }) => {
    await setupPage(page, request);
    await page.locator('.nav-btn:has-text("Kanban")').click();
    await expect(page).toHaveURL('/kanban');
    await expect(page.locator('.kanban-board')).toBeVisible();
  });

  test('2.4 Navigate to Reports', async ({ page, request }) => {
    await setupPage(page, request);
    await page.locator('.nav-btn:has-text("Báo cáo")').click();
    await expect(page).toHaveURL(/\/reports/);
    await expect(page.locator('h1:has-text("Báo cáo tuần")')).toBeVisible();
  });

  test('2.5 Navigate to AI Settings', async ({ page, request }) => {
    await setupPage(page, request);
    await page.locator('.nav-btn:has-text("AI")').click();
    await expect(page).toHaveURL('/settings');
    await expect(page.locator('h1:has-text("Cài đặt AI")')).toBeVisible();
  });

  test('2.6 Navigate to Todo List', async ({ page, request }) => {
    await setupPage(page, request);
    await page.locator('.nav-btn:has-text("Todo")').click();
    await expect(page).toHaveURL('/todos');
    await expect(page.locator('h1:has-text("Todo List")')).toBeVisible();
  });

  test('2.7 Open Category Manager', async ({ page, request }) => {
    await setupPage(page, request);
    await page.locator('.nav-btn:has-text("Quản lý")').click();
    await expect(page.locator('h2:has-text("Quản lý danh mục")')).toBeVisible();
    await page.locator('.v-dialog button:has-text("Đóng")').click();
  });
});

test.describe('3. Dashboard', () => {
  test('3.1 Stats cards are visible', async ({ page, request }) => {
    await setupPage(page, request);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const statLabels = ['Tổng số task', 'Quá hạn', 'Đang thực hiện', 'Hoàn thành'];
    for (const label of statLabels) {
      await expect(page.locator(`text=${label}`).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('3.2 Chart canvases are rendered', async ({ page, request }) => {
    await setupPage(page, request);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const canvases = page.locator('canvas');
    await expect(canvases.first()).toBeVisible({ timeout: 15000 });
    await expect(canvases.nth(1)).toBeVisible({ timeout: 15000 });
  });

  test('3.3 Upcoming tasks section visible', async ({ page, request }) => {
    await setupPage(page, request);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.locator('span:has-text("Task sắp đến hạn")')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('4. Category Management', () => {
  test('4.1 Open category manager', async ({ page, request }) => {
    await setupPage(page, request);
    await page.locator('.nav-btn:has-text("Quản lý")').click();
    await page.waitForTimeout(500);
    await expect(page.locator('h2:has-text("Quản lý danh mục")')).toBeVisible();
    await expect(page.locator('text=Thêm danh mục mới')).toBeVisible();
    await page.locator('.v-dialog button:has-text("Đóng")').click();
  });

  test('4.2 Create a new category', async ({ page, request }) => {
    await setupPage(page, request);
    await page.locator('.nav-btn:has-text("Quản lý")').click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Thêm danh mục mới")').click();
    await page.waitForTimeout(300);

    const name = `Test Category ${Date.now()}`;
    const dialogInput = page.locator('.v-dialog .v-field input').first();
    await dialogInput.fill(name);
    await page.locator('.v-dialog button:has-text("Lưu")').click();
    await page.waitForTimeout(500);
    await expect(page.locator(`text=${name}`).first()).toBeVisible({ timeout: 5000 });

    const res = await request.get(`${API_BASE}/api/categories`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const cats = await res.json();
    const createdCat = cats.categories.find(c => c.name === name);
    if (createdCat) createdCategoryId = createdCat.id;

    await page.locator('button:has-text("Đóng")').click();
  });

  test('4.3 Delete test category via API', async ({ request }) => {
    if (!createdCategoryId) return;
    const delRes = await request.delete(`${API_BASE}/api/categories/${createdCategoryId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(delRes.ok()).toBeTruthy();
    createdCategoryId = null;
  });
});

test.describe('5. Kanban Board - Tasks', () => {
  test('5.1 Kanban board renders with 4 columns', async ({ page, request }) => {
    await setupPage(page, request);
    const columns = page.locator('.kanban-column');
    await expect(columns).toHaveCount(4);
  });

  test('5.2 Category tabs are visible', async ({ page, request }) => {
    await setupPage(page, request);
    await expect(page.locator('.category-tabs').first()).toBeVisible();
  });

  test('5.3 Create a new task via UI', async ({ page, request }) => {
    await setupPage(page, request);
    await page.locator('button:has-text("Tạo task")').click();
    await expect(page.locator('.v-dialog')).toBeVisible({ timeout: 5000 });

    const taskTitle = `Test Task ${Date.now()}`;
    await page.getByLabel('Tiêu đề').fill(taskTitle);

    // Select first category from the v-select
    const firstSelect = page.locator('.v-dialog .v-select').first();
    await firstSelect.click();
    await page.waitForTimeout(500);
    // Click the first visible option in the overlay menu
    await page.locator('.v-overlay-container .v-list-item').first().click();
    await page.waitForTimeout(500);

    await page.locator('.v-dialog button:has-text("Lưu")').click();
    await page.waitForTimeout(2000);
    await expect(page.getByText(taskTitle).first()).toBeVisible({ timeout: 10000 });

    const tasksRes = await request.get(`${API_BASE}/api/tasks`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const tasksData = await tasksRes.json();
    const createdTask = tasksData.tasks.find(t => t.title === taskTitle);
    if (createdTask) createdTaskId = createdTask.id;
  });

  test('5.4 Open task modal and add comment', async ({ page, request }) => {
    if (!createdTaskId) return;
    await setupPage(page, request);
    await page.waitForTimeout(1000);

    const taskRes = await request.get(`${API_BASE}/api/tasks/${createdTaskId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const taskData = await taskRes.json();
    const taskCard = page.getByText(taskData.task.title).first();
    await taskCard.click();
    await page.waitForTimeout(500);

    await page.locator('button:has-text("Bình luận")').click();
    await page.waitForTimeout(300);

    const commentField = page.locator('.v-dialog textarea').last();
    await commentField.fill('Comment from Playwright test');
    await page.locator('button:has-text("Gửi")').click();
    await page.waitForTimeout(1000);
    await expect(page.getByText('Comment from Playwright test')).toBeVisible({ timeout: 5000 });

    await page.locator('button:has-text("Hủy")').click();
  });

  test('5.5 Request AI suggestions for task', async ({ page, request }) => {
    if (!createdTaskId) return;
    await setupPage(page, request);
    await page.waitForTimeout(1000);

    const taskRes = await request.get(`${API_BASE}/api/tasks/${createdTaskId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const taskData = await taskRes.json();
    const taskCard = page.getByText(taskData.task.title).first();
    await taskCard.click();
    await page.waitForTimeout(500);

    await page.locator('button:has-text("Gợi ý AI")').click();
    await page.waitForTimeout(300);

    const aiBtn = page.locator('button:has-text("Gợi ý từ AI")');
    if (await aiBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await aiBtn.click();
      await page.waitForTimeout(3000);
    }

    await page.locator('button:has-text("Hủy")').click();
  });

  test('5.6 Validate AI API endpoints', async ({ request }) => {
    const endpoints = [
      { url: '/api/ai/task-breakdown', data: { task_id: createdTaskId, description: 'Build login page' } },
      { url: '/api/ai/priority-suggest', data: { task_id: createdTaskId, title: 'Urgent fix', due_date: '2026-05-15' } },
      { url: '/api/ai/check-blockers', data: { task_id: createdTaskId } },
      { url: '/api/ai/general', data: { prompt: 'Hello AI' } },
    ];
    for (const ep of endpoints) {
      const res = await request.post(`${API_BASE}${ep.url}`, {
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        data: ep.data
      });
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.result).toBeTruthy();
      expect(body.result.suggestion).toBeTruthy();
    }
  });

  test('5.7 Delete test task via API', async ({ request }) => {
    if (!createdTaskId) return;
    const delRes = await request.delete(`${API_BASE}/api/tasks/${createdTaskId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(delRes.ok()).toBeTruthy();
    createdTaskId = null;
  });
});

test.describe('6. AI Features', () => {
  test('6.1 AI Chat assistant opens and responds', async ({ page, request }) => {
    await setupPage(page, request);

    const chatBtn = page.locator('button:has(.mdi-robot-outline)').first();
    await chatBtn.click();
    await page.waitForTimeout(500);
    await expect(page.locator('.chat-window')).toBeVisible({ timeout: 5000 });

    const chatInput = page.locator('.chat-input input').first();
    await chatInput.fill('Xin chào, bạn là AI gì?');
    await page.locator('.chat-window button:has(.mdi-send)').click();
    await page.waitForTimeout(3000);

    const aiMsgs = page.locator('.chat-messages .inline-block');
    await expect(aiMsgs.last()).toBeVisible({ timeout: 10000 });

    await page.locator('.chat-window button:has(.mdi-close)').click();
  });

  test('6.2 AI history available', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/ai/history`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.interactions).toBeDefined();
    expect(Array.isArray(body.interactions)).toBe(true);
  });

  test('6.3 AI Settings page renders', async ({ page, request }) => {
    await setupPage(page, request);
    await page.locator('.nav-btn:has-text("AI")').click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Cài đặt AI")')).toBeVisible();
    await expect(page.locator('text=AI Configuration')).toBeVisible();
    await expect(page.locator('text=AI Interaction History')).toBeVisible();
  });

  test('6.4 AI config save and retrieve', async ({ request }) => {
    const saveRes = await request.post(`${API_BASE}/api/ai/config`, {
      headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      data: {
        provider: 'openai',
        model_name: 'gpt-3.5-turbo',
        api_key: 'sk-test-key',
        base_url: '',
        temperature: 0.7,
        max_tokens: 1000,
        is_active: true
      }
    });
    expect(saveRes.ok()).toBeTruthy();

    const getRes = await request.get(`${API_BASE}/api/ai/config`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(getRes.ok()).toBeTruthy();
    const body = await getRes.json();
    expect(body.config).toBeTruthy();
    expect(body.config.provider).toBe('openai');
  });
});

test.describe('7. Reports', () => {
  test('7.1 Reports page loads', async ({ page, request }) => {
    await setupPage(page, request);
    await page.locator('.nav-btn:has-text("Báo cáo")').click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Báo cáo tuần")')).toBeVisible();
    await expect(page.locator('button:has-text("Tạo báo cáo")')).toBeVisible();
  });

  test('7.2 Generate and list reports via API', async ({ request }) => {
    const genRes = await request.post(`${API_BASE}/api/reports/generate`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(genRes.ok()).toBeTruthy();
    const genBody = await genRes.json();
    expect(genBody.report).toBeTruthy();

    const listRes = await request.get(`${API_BASE}/api/reports`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(listRes.ok()).toBeTruthy();
    const listBody = await listRes.json();
    expect(Array.isArray(listBody.reports)).toBe(true);
  });

  test('7.3 Generate report via UI', async ({ page, request }) => {
    await setupPage(page, request);
    await page.locator('.nav-btn:has-text("Báo cáo")').click();
    await page.waitForLoadState('networkidle');
    await page.locator('button:has-text("Tạo báo cáo")').click();
    await page.waitForTimeout(3000);
    await expect(page.locator('h1:has-text("Báo cáo tuần")')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('8. Search', () => {
  test('8.1 Search field is visible', async ({ page, request }) => {
    await setupPage(page, request);
    await expect(page.locator('input[placeholder="Tìm kiếm task..."]')).toBeVisible();
  });
});

test.describe('9. Real AI Model Test', () => {
  test('9.1 Test real AI endpoint directly', async ({ request }) => {
    const res = await request.post('http://192.168.0.102:8888/v1/chat/completions', {
      headers: {
        'Authorization': 'Bearer sk-4NZRb97UkAd5mNjgBCenC5FhIcqjEb5Bz2RX6zDNc1T851Jw',
        'Content-Type': 'application/json'
      },
      data: {
        model: 'claude-sonnet-4.6',
        messages: [{ role: 'user', content: 'bạn model gì có thinking không?' }],
        max_tokens: 128000,
        stream: false
      }
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.choices).toBeDefined();
    expect(body.choices[0].message.content).toBeTruthy();
  });

  test('9.2 Real AI through app API', async ({ request }) => {
    const configRes = await request.post(`${API_BASE}/api/ai/config`, {
      headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      data: {
        provider: 'openai_compatible',
        model_name: 'claude-sonnet-4.6',
        api_key: 'sk-4NZRb97UkAd5mNjgBCenC5FhIcqjEb5Bz2RX6zDNc1T851Jw',
        base_url: 'http://192.168.0.102:8888/v1',
        temperature: 0.7,
        max_tokens: 2000,
        is_active: true
      }
    });
    expect(configRes.ok()).toBeTruthy();

    const aiRes = await request.post(`${API_BASE}/api/ai/general`, {
      headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      data: { prompt: 'bạn model gì có thinking không?' }
    });

    if (aiRes.ok()) {
      const body = await aiRes.json();
      expect(body.result).toBeTruthy();
      expect(body.result.suggestion).toBeTruthy();
    }
  });
});

test.describe('10. User Registration', () => {
  test('10.1 Register UI renders', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('h1:has-text("Task Manager")')).toBeVisible();
    await expect(page.locator('button:has-text("Đăng ký")')).toBeVisible();
  });

  test('10.2 Register via API', async ({ request }) => {
    const testUsername = `testuser_${Date.now()}`;
    const res = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        username: testUsername,
        email: `${testUsername}@example.com`,
        password: 'test12345'
      }
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.token).toBeTruthy();
    expect(body.user.username).toBe(testUsername);
  });
});

test.describe('11. Health Check', () => {
  test('11.1 Backend health check', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
