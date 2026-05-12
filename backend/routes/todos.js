const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');

function generateHash() {
  return 'TODO-' + crypto.randomBytes(2).toString('hex').toUpperCase();
}

// GET /api/todos - Get all todos with optional filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category_id, subcategory_id, status, search } = req.query;
    let query = `
      SELECT t.*, c.name as category_name, c.color as category_color,
             s.name as subcategory_name, u.username as assignee_name
      FROM todos t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN subcategories s ON t.subcategory_id = s.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (category_id) {
      query += ' AND t.category_id = ?';
      params.push(category_id);
    }
    if (subcategory_id) {
      query += ' AND t.subcategory_id = ?';
      params.push(subcategory_id);
    }
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (t.title LIKE ? OR t.description LIKE ? OR t.hash_task LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY t.sort_order ASC, t.created_at DESC';

    const [todos] = await pool.query(query, params);
    res.json({ todos });
  } catch (err) {
    console.error('Get todos error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/todos/:id - Get single todo with comments
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [todos] = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color,
              s.name as subcategory_name, u.username as assignee_name
       FROM todos t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN subcategories s ON t.subcategory_id = s.id
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.id = ?`,
      [id]
    );
    if (todos.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    const todo = todos[0];
    const [comments] = await pool.query(
      `SELECT tc.*, u.username, u.avatar_url
       FROM todo_comments tc
       LEFT JOIN users u ON tc.user_id = u.id
       WHERE tc.todo_id = ?
       ORDER BY tc.created_at ASC`,
      [id]
    );
    todo.comments = comments;
    res.json({ todo });
  } catch (err) {
    console.error('Get todo error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/todos - Create new todo
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, category_id, subcategory_id, status, priority, assignee_id, due_date, estimated_hours } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    let hash_task = generateHash();
    let retry = 0;
    while (retry < 5) {
      const [existing] = await pool.query('SELECT id FROM todos WHERE hash_task = ?', [hash_task]);
      if (existing.length === 0) break;
      hash_task = generateHash();
      retry++;
    }

    const [maxOrder] = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM todos WHERE user_id = ?',
      [req.user.id]
    );

    const [result] = await pool.query(
      `INSERT INTO todos (hash_task, user_id, title, description, category_id, subcategory_id,
        status, priority, assignee_id, due_date, estimated_hours, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        hash_task, req.user.id, title.trim(), description || null,
        category_id || null, subcategory_id || null,
        status || 'Cần làm', priority || 'medium',
        assignee_id || null, due_date || null, estimated_hours || null,
        maxOrder[0].next_order
      ]
    );

    const [newTodo] = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color,
              s.name as subcategory_name, u.username as assignee_name
       FROM todos t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN subcategories s ON t.subcategory_id = s.id
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.id = ?`,
      [result.insertId]
    );

    if (req.io) {
      req.io.emit('todo_created', newTodo[0]);
    }

    res.status(201).json({ todo: newTodo[0] });
  } catch (err) {
    console.error('Create todo error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/todos/:id - Update todo
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = [
      'title', 'description', 'is_done', 'sort_order', 'category_id', 'subcategory_id',
      'status', 'priority', 'assignee_id', 'due_date',
      'estimated_hours', 'actual_hours', 'board_position',
      'start_time', 'end_time', 'estimated_duration', 'actual_duration',
      'timer_status', 'timer_started_at', 'total_paused_seconds'
    ];

    const [existing] = await pool.query('SELECT * FROM todos WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const updates = [];
    const params = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    await pool.query(`UPDATE todos SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color,
              s.name as subcategory_name, u.username as assignee_name
       FROM todos t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN subcategories s ON t.subcategory_id = s.id
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.id = ?`,
      [id]
    );

    if (req.io) {
      req.io.emit('todo_updated', updated[0]);
    }

    res.json({ todo: updated[0] });
  } catch (err) {
    console.error('Update todo error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/todos/:id/move - Move todo to different status (Kanban drag)
router.patch('/:id/move', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, board_position } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const [existing] = await pool.query('SELECT * FROM todos WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const isDone = status === 'Hoàn thành';
    await pool.query(
      'UPDATE todos SET status = ?, is_done = ?, board_position = ? WHERE id = ?',
      [status, isDone ? 1 : 0, board_position || 0, id]
    );

    const [updated] = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color,
              s.name as subcategory_name, u.username as assignee_name
       FROM todos t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN subcategories s ON t.subcategory_id = s.id
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.id = ?`,
      [id]
    );

    if (req.io) {
      req.io.emit('todo_moved', updated[0]);
    }

    res.json({ todo: updated[0] });
  } catch (err) {
    console.error('Move todo error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/todos/:id - Delete todo
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM todos WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    if (req.io) {
      req.io.emit('todo_deleted', { id: parseInt(id) });
    }

    res.json({ message: 'Todo deleted successfully' });
  } catch (err) {
    console.error('Delete todo error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/todos/:id/comments - Add comment to todo
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, is_ai } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const [existing] = await pool.query('SELECT id FROM todos WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const [result] = await pool.query(
      'INSERT INTO todo_comments (todo_id, user_id, content, is_ai) VALUES (?, ?, ?, ?)',
      [id, req.user.id, content, is_ai || false]
    );

    const [comment] = await pool.query(
      `SELECT tc.*, u.username, u.avatar_url
       FROM todo_comments tc
       LEFT JOIN users u ON tc.user_id = u.id
       WHERE tc.id = ?`,
      [result.insertId]
    );

    if (req.io) {
      req.io.emit('todo_comment_added', { todo_id: parseInt(id), comment: comment[0] });
    }

    res.status(201).json({ comment: comment[0] });
  } catch (err) {
    console.error('Add todo comment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Timer endpoints

// POST /api/todos/:id/timer/start - Start timer
router.post('/:id/timer/start', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date();
    await pool.query(
      'UPDATE todos SET timer_status = ?, timer_started_at = ?, start_time = COALESCE(start_time, ?) WHERE id = ?',
      ['running', now, now, id]
    );
    const [updated] = await pool.query('SELECT id, hash_task, timer_status, timer_started_at, total_paused_seconds, start_time FROM todos WHERE id = ?', [id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Todo not found' });
    if (req.io) req.io.emit('todo_updated', updated[0]);
    res.json({ todo: updated[0] });
  } catch (err) {
    console.error('Start timer error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/todos/:id/timer/pause - Pause timer
router.post('/:id/timer/pause', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [todo] = await pool.query('SELECT timer_started_at, total_paused_seconds FROM todos WHERE id = ?', [id]);
    if (todo.length === 0) return res.status(404).json({ error: 'Todo not found' });
    const elapsed = Math.floor((new Date() - new Date(todo[0].timer_started_at)) / 1000);
    const totalPaused = (todo[0].total_paused_seconds || 0) + elapsed;
    await pool.query(
      'UPDATE todos SET timer_status = ?, total_paused_seconds = ?, timer_started_at = NULL WHERE id = ?',
      ['paused', totalPaused, id]
    );
    const [updated] = await pool.query('SELECT id, hash_task, timer_status, timer_started_at, total_paused_seconds FROM todos WHERE id = ?', [id]);
    if (req.io) req.io.emit('todo_updated', updated[0]);
    res.json({ todo: updated[0] });
  } catch (err) {
    console.error('Pause timer error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/todos/:id/timer/resume - Resume timer
router.post('/:id/timer/resume', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date();
    await pool.query(
      'UPDATE todos SET timer_status = ?, timer_started_at = ? WHERE id = ?',
      ['running', now, id]
    );
    const [updated] = await pool.query('SELECT id, hash_task, timer_status, timer_started_at, total_paused_seconds FROM todos WHERE id = ?', [id]);
    if (req.io) req.io.emit('todo_updated', updated[0]);
    res.json({ todo: updated[0] });
  } catch (err) {
    console.error('Resume timer error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/todos/:id/timer/stop - Stop timer and record actual_duration
router.post('/:id/timer/stop', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [todo] = await pool.query('SELECT timer_status, timer_started_at, total_paused_seconds FROM todos WHERE id = ?', [id]);
    if (todo.length === 0) return res.status(404).json({ error: 'Todo not found' });
    const now = new Date();
    let totalSeconds = todo[0].total_paused_seconds || 0;
    if (todo[0].timer_status === 'running' && todo[0].timer_started_at) {
      totalSeconds += Math.floor((now - new Date(todo[0].timer_started_at)) / 1000);
    }
    const actualMinutes = Math.round(totalSeconds / 60);
    const actualHours = (actualMinutes / 60).toFixed(1);
    await pool.query(
      'UPDATE todos SET timer_status = ?, timer_started_at = NULL, total_paused_seconds = 0, actual_duration = ?, actual_hours = ?, end_time = ? WHERE id = ?',
      ['stopped', actualMinutes, actualHours, now, id]
    );
    const [updated] = await pool.query('SELECT * FROM todos WHERE id = ?', [id]);
    if (req.io) req.io.emit('todo_updated', updated[0]);
    res.json({ todo: updated[0], duration_minutes: actualMinutes });
  } catch (err) {
    console.error('Stop timer error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;