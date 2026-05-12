const request = require('supertest');
const { app } = require('../server');
const pool = require('../config/db');

let authToken = '';
let userId = '';
let categoryId = '';
let taskId = '';
const testUsername = `testuser_${Date.now()}`;
const testEmail = `${testUsername}@example.com`;

describe('Task Manager API Tests', () => {
  beforeAll(async () => {
    // Clean any existing test data
    await pool.query('DELETE FROM users WHERE username LIKE ?', ['testuser_%']);
    await pool.query('DELETE FROM tasks WHERE title LIKE ?', ['%Test Task%']);
    await pool.query('DELETE FROM categories WHERE name LIKE ?', ['%Test Category%']);
    await pool.query('DELETE FROM todos WHERE title LIKE ?', ['%Test Todo%']);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Auth', () => {
    test('POST /api/auth/register - should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: testUsername,
          email: testEmail,
          password: 'test12345'
        });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('token');
      authToken = res.body.token;
      userId = res.body.user.id;
    });

    test('POST /api/auth/login - should login existing user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUsername,
          password: 'test12345'
        });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
    });
  });

  describe('Categories', () => {
    test('GET /api/categories - should return categories', async () => {
      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.categories)).toBe(true);
    });

    test('POST /api/categories - should create a new category', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Category',
          color: '#FF0000',
          sort_order: 99
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.category).toHaveProperty('id');
      categoryId = res.body.category.id;
    });
  });

  describe('Tasks', () => {
    test('POST /api/tasks - should create a new task', async () => {
      // Format due_date for MySQL: YYYY-MM-DD HH:MM:SS
      const dueDate = new Date('2026-12-31T23:59:59').toISOString().slice(0, 19).replace('T', ' ');
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Task',
          description: 'Test Description',
          category_id: categoryId,
          priority: 'high',
          due_date: dueDate
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.task).toHaveProperty('id');
      taskId = res.body.task.id;
    });

    test('GET /api/tasks - should list tasks', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.tasks)).toBe(true);
    });

    test('PATCH /api/tasks/:id/move - should move task to different status', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'in_progress', board_position: 0 });
      expect(res.statusCode).toBe(200);
      expect(res.body.task.status).toBe('in_progress');
    });

    test('PUT /api/tasks/:id - should update task', async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ priority: 'urgent' });
      expect(res.statusCode).toBe(200);
      expect(res.body.task.priority).toBe('urgent');
    });
  });

  describe('AI', () => {
    test('POST /api/ai/task-breakdown - should return AI breakdown', async () => {
      const res = await request(app)
        .post('/api/ai/task-breakdown')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ task_id: taskId, description: 'Build a new feature' });
      expect(res.statusCode).toBe(200);
      expect(res.body.result).toHaveProperty('suggestion');
    });

    test('POST /api/ai/priority-suggest - should return priority suggestion', async () => {
      const res = await request(app)
        .post('/api/ai/priority-suggest')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ task_id: taskId, title: 'Urgent bug fix', due_date: '2026-05-10' });
      expect(res.statusCode).toBe(200);
      expect(res.body.result).toHaveProperty('recommended_priority');
    });
  });

  describe('Reports', () => {
    test('POST /api/reports/generate - should generate a report', async () => {
      const res = await request(app)
        .post('/api/reports/generate')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toBe(201);
      expect(res.body.report).toHaveProperty('id');
    });

    test('GET /api/reports - should list reports', async () => {
      const res = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.reports)).toBe(true);
    });
  });

  describe('Todos', () => {
    let todoId = '';

    test('POST /api/todos - should create a new todo', async () => {
      const res = await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Test Todo' });
      expect(res.statusCode).toBe(201);
      expect(res.body.todo).toHaveProperty('id');
      expect(res.body.todo.title).toBe('Test Todo');
      expect(res.body.todo.is_done).toBe(0);
      todoId = res.body.todo.id;
    });

    test('GET /api/todos - should list todos', async () => {
      const res = await request(app)
        .get('/api/todos')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.todos)).toBe(true);
      expect(res.body.todos.length).toBeGreaterThanOrEqual(1);
    });

    test('PUT /api/todos/:id - should toggle todo done', async () => {
      const res = await request(app)
        .put(`/api/todos/${todoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ is_done: 1 });
      expect(res.statusCode).toBe(200);
      expect(res.body.todo.is_done).toBe(1);
    });

    test('PUT /api/todos/:id - should update todo title', async () => {
      const res = await request(app)
        .put(`/api/todos/${todoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Todo' });
      expect(res.statusCode).toBe(200);
      expect(res.body.todo.title).toBe('Updated Todo');
    });

    test('DELETE /api/todos/:id - should delete todo', async () => {
      const res = await request(app)
        .delete(`/api/todos/${todoId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('Cleanup', () => {
    test('DELETE /api/tasks/:id - should delete task', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
    });

    test('DELETE /api/categories/:id - should delete category', async () => {
      const res = await request(app)
        .delete(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
    });
  });
});