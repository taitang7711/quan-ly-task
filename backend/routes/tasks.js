const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');

function generateHash() {
  return 'TASK-' + crypto.randomBytes(2).toString('hex').toUpperCase();
}

// GET /api/tasks - Get all tasks with filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category_id, subcategory_id, status, priority, assignee_id, search } = req.query;

    let query = `
      SELECT t.*,
             u.username as assignee_name,
             c.name as category_name,
             c.color as category_color,
             s.name as subcategory_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN subcategories s ON t.subcategory_id = s.id
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
    if (priority) {
      query += ' AND t.priority = ?';
      params.push(priority);
    }
    if (assignee_id) {
      query += ' AND t.assignee_id = ?';
      params.push(assignee_id);
    }
    if (search) {
      query += ' AND (t.title LIKE ? OR t.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY t.board_position, t.updated_at DESC';

    const [tasks] = await pool.query(query, params);

    // Group tasks by status for Kanban (dynamic)
    const kanban = {};
    tasks.forEach(task => {
      const key = task.status || 'todo';
      if (!kanban[key]) kanban[key] = [];
      kanban[key].push(task);
    });

    // Also fetch category statuses for the frontend
    let categoryStatuses = [];
    if (category_id) {
      const [statuses] = await pool.query(
        'SELECT * FROM category_statuses WHERE category_id = ? ORDER BY sort_order',
        [category_id]
      );
      categoryStatuses = statuses;
    }

    res.json({ tasks, kanban, categoryStatuses });
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tasks/:id - Get single task with comments
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [tasks] = await pool.query(
      `SELECT t.*,
              u.username as assignee_name,
              c.name as category_name,
              c.color as category_color,
              s.name as subcategory_name
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN subcategories s ON t.subcategory_id = s.id
       WHERE t.id = ?`,
      [id]
    );

    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = tasks[0];

    // Get comments
    const [comments] = await pool.query(
      `SELECT tc.*, u.username, u.avatar_url
       FROM task_comments tc
       LEFT JOIN users u ON tc.user_id = u.id
       WHERE tc.task_id = ?
       ORDER BY tc.created_at ASC`,
      [id]
    );
    task.comments = comments;

    // Get subtasks
    const [subtasks] = await pool.query(
      `SELECT t.*, u.username as assignee_name
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.parent_task_id = ?
       ORDER BY t.created_at ASC`,
      [id]
    );
    task.subtasks = subtasks;

    res.json({ task });
  } catch (err) {
    console.error('Get task error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks - Create new task
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title, description, category_id, subcategory_id,
      status, priority, assignee_id, due_date,
      estimated_hours, parent_task_id
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    // Generate unique hash_task
    let hash_task = generateHash();
    let retry = 0;
    while (retry < 5) {
      const [existing] = await pool.query('SELECT id FROM tasks WHERE hash_task = ?', [hash_task]);
      if (existing.length === 0) break;
      hash_task = generateHash();
      retry++;
    }

    // Get max board position for status
    const [maxPos] = await pool.query(
      'SELECT COALESCE(MAX(board_position), -1) as max_pos FROM tasks WHERE status = ?',
      [status || 'todo']
    );

    const [result] = await pool.query(
      `INSERT INTO tasks
       (hash_task, title, description, category_id, subcategory_id, status, priority,
        assignee_id, due_date, estimated_hours, parent_task_id, board_position, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        hash_task,
        title,
        description || null,
        category_id || null,
        subcategory_id || null,
        status || 'todo',
        priority || 'medium',
        assignee_id || null,
        due_date || null,
        estimated_hours || null,
        parent_task_id || null,
        maxPos[0].max_pos + 1,
        req.user.id
      ]
    );

    const [newTask] = await pool.query(
      `SELECT t.*, u.username as assignee_name, c.name as category_name, c.color as category_color
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`,
      [result.insertId]
    );

    if (req.io) {
      req.io.emit('task_created', newTask[0]);
    }

    res.status(201).json({ task: newTask[0] });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = [
      'title', 'description', 'category_id', 'subcategory_id',
      'status', 'priority', 'assignee_id', 'due_date',
      'estimated_hours', 'actual_hours', 'board_position',
      'start_time', 'end_time', 'estimated_duration', 'actual_duration',
      'timer_status', 'timer_started_at', 'total_paused_seconds'
    ];

    const [existing] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
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
    await pool.query(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.query(
      `SELECT t.*, u.username as assignee_name, c.name as category_name, c.color as category_color,
              s.name as subcategory_name
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN subcategories s ON t.subcategory_id = s.id
       WHERE t.id = ?`,
      [id]
    );

    if (req.io) {
      req.io.emit('task_updated', updated[0]);
    }

    res.json({ task: updated[0] });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/tasks/:id/move - Move task to different status (Kanban drag)
router.patch('/:id/move', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, board_position } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const [existing] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await pool.query(
      'UPDATE tasks SET status = ?, board_position = ? WHERE id = ?',
      [status, board_position || 0, id]
    );

    const [updated] = await pool.query(
      `SELECT t.*, u.username as assignee_name, c.name as category_name
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`,
      [id]
    );

    if (req.io) {
      req.io.emit('task_moved', updated[0]);
    }

    res.json({ task: updated[0] });
  } catch (err) {
    console.error('Move task error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await pool.query('DELETE FROM tasks WHERE id = ?', [id]);

    if (req.io) {
      req.io.emit('task_deleted', { id: parseInt(id) });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks/:id/comments - Add comment to task
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, is_ai } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const [existing] = await pool.query('SELECT id FROM tasks WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const [result] = await pool.query(
      'INSERT INTO task_comments (task_id, user_id, content, is_ai) VALUES (?, ?, ?, ?)',
      [id, req.user.id, content, is_ai || false]
    );

    const [comment] = await pool.query(
      `SELECT tc.*, u.username, u.avatar_url
       FROM task_comments tc
       LEFT JOIN users u ON tc.user_id = u.id
       WHERE tc.id = ?`,
      [result.insertId]
    );

    if (req.io) {
      req.io.emit('comment_added', { task_id: parseInt(id), comment: comment[0] });
    }

    res.status(201).json({ comment: comment[0] });
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tasks/stats/summary - Task statistics for dashboard
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const [totalByStatus] = await pool.query(
      'SELECT status, COUNT(*) as count FROM tasks GROUP BY status'
    );

    const [totalByPriority] = await pool.query(
      'SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority'
    );

    const [totalByCategory] = await pool.query(
      `SELECT c.name, COUNT(t.id) as count
       FROM categories c
       LEFT JOIN tasks t ON t.category_id = c.id
       GROUP BY c.id, c.name`
    );

    const [overdue] = await pool.query(
      "SELECT COUNT(*) as count FROM tasks WHERE due_date < NOW() AND status != 'Hoàn thành'"
    );

    const [total] = await pool.query('SELECT COUNT(*) as count FROM tasks');

    res.json({
      total_tasks: total[0].count,
      overdue_tasks: overdue[0].count,
      by_status: totalByStatus,
      by_priority: totalByPriority,
      by_category: totalByCategory
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Timer endpoints

// POST /api/tasks/:id/timer/start - Start timer
router.post('/:id/timer/start', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date();
    await pool.query(
      'UPDATE tasks SET timer_status = ?, timer_started_at = ?, start_time = COALESCE(start_time, ?) WHERE id = ?',
      ['running', now, now, id]
    );
    const [updated] = await pool.query('SELECT id, hash_task, timer_status, timer_started_at, total_paused_seconds, start_time FROM tasks WHERE id = ?', [id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Task not found' });
    if (req.io) req.io.emit('task_updated', updated[0]);
    res.json({ task: updated[0] });
  } catch (err) {
    console.error('Start timer error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks/:id/timer/pause - Pause timer
router.post('/:id/timer/pause', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [task] = await pool.query('SELECT timer_started_at, total_paused_seconds FROM tasks WHERE id = ?', [id]);
    if (task.length === 0) return res.status(404).json({ error: 'Task not found' });
    const elapsed = Math.floor((new Date() - new Date(task[0].timer_started_at)) / 1000);
    const totalPaused = (task[0].total_paused_seconds || 0) + elapsed;
    await pool.query(
      'UPDATE tasks SET timer_status = ?, total_paused_seconds = ?, timer_started_at = NULL WHERE id = ?',
      ['paused', totalPaused, id]
    );
    const [updated] = await pool.query('SELECT id, hash_task, timer_status, timer_started_at, total_paused_seconds FROM tasks WHERE id = ?', [id]);
    if (req.io) req.io.emit('task_updated', updated[0]);
    res.json({ task: updated[0] });
  } catch (err) {
    console.error('Pause timer error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks/:id/timer/resume - Resume timer
router.post('/:id/timer/resume', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date();
    await pool.query(
      'UPDATE tasks SET timer_status = ?, timer_started_at = ? WHERE id = ?',
      ['running', now, id]
    );
    const [updated] = await pool.query('SELECT id, hash_task, timer_status, timer_started_at, total_paused_seconds FROM tasks WHERE id = ?', [id]);
    if (req.io) req.io.emit('task_updated', updated[0]);
    res.json({ task: updated[0] });
  } catch (err) {
    console.error('Resume timer error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks/:id/timer/stop - Stop timer and record actual_duration
router.post('/:id/timer/stop', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [task] = await pool.query('SELECT timer_status, timer_started_at, total_paused_seconds FROM tasks WHERE id = ?', [id]);
    if (task.length === 0) return res.status(404).json({ error: 'Task not found' });
    const now = new Date();
    let totalSeconds = task[0].total_paused_seconds || 0;
    if (task[0].timer_status === 'running' && task[0].timer_started_at) {
      totalSeconds += Math.floor((now - new Date(task[0].timer_started_at)) / 1000);
    }
    const actualMinutes = Math.round(totalSeconds / 60);
    const actualHours = (actualMinutes / 60).toFixed(1);
    await pool.query(
      'UPDATE tasks SET timer_status = ?, timer_started_at = NULL, total_paused_seconds = 0, actual_duration = ?, actual_hours = ?, end_time = ? WHERE id = ?',
      ['stopped', actualMinutes, actualHours, now, id]
    );
    const [updated] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
    if (req.io) req.io.emit('task_updated', updated[0]);
    res.json({ task: updated[0], duration_minutes: actualMinutes });
  } catch (err) {
    console.error('Stop timer error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;