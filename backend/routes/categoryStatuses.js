const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/category-statuses?category_id=1 - List statuses for a category
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category_id } = req.query;
    if (!category_id) {
      return res.status(400).json({ error: 'category_id is required' });
    }
    const [statuses] = await pool.query(
      'SELECT * FROM category_statuses WHERE category_id = ? ORDER BY sort_order',
      [category_id]
    );
    res.json({ statuses });
  } catch (err) {
    console.error('Get category statuses error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/category-statuses - Create new status
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { category_id, name, color, sort_order } = req.body;
    if (!category_id || !name) {
      return res.status(400).json({ error: 'category_id and name are required' });
    }

    const [maxOrder] = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM category_statuses WHERE category_id = ?',
      [category_id]
    );

    const [result] = await pool.query(
      'INSERT INTO category_statuses (category_id, name, color, sort_order) VALUES (?, ?, ?, ?)',
      [category_id, name, color || '#1E3C72', sort_order ?? maxOrder[0].next_order]
    );

    const [newStatus] = await pool.query('SELECT * FROM category_statuses WHERE id = ?', [result.insertId]);

    if (req.io) {
      req.io.emit('category_status_created', newStatus[0]);
    }

    res.status(201).json({ status: newStatus[0] });
  } catch (err) {
    console.error('Create category status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/category-statuses/:id - Update status
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, sort_order } = req.body;

    const [existing] = await pool.query('SELECT * FROM category_statuses WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Category status not found' });
    }

    await pool.query(
      'UPDATE category_statuses SET name = ?, color = ?, sort_order = ? WHERE id = ?',
      [
        name ?? existing[0].name,
        color ?? existing[0].color,
        sort_order ?? existing[0].sort_order,
        id
      ]
    );

    const [updated] = await pool.query('SELECT * FROM category_statuses WHERE id = ?', [id]);

    if (req.io) {
      req.io.emit('category_status_updated', updated[0]);
    }

    res.json({ status: updated[0] });
  } catch (err) {
    console.error('Update category status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/category-statuses/:id - Delete status
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT cs.*, cs.category_id FROM category_statuses cs WHERE cs.id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Category status not found' });
    }

    // Get the first remaining status for this category to reassign tasks
    const [firstStatus] = await pool.query(
      'SELECT * FROM category_statuses WHERE category_id = ? AND id != ? ORDER BY sort_order LIMIT 1',
      [existing[0].category_id, id]
    );

    // Reassign tasks with this status to the first available status
    const fallbackStatus = firstStatus[0]?.name || 'todo';
    await pool.query('UPDATE tasks SET status = ? WHERE status = ? AND category_id = ?',
      [fallbackStatus, existing[0].name, existing[0].category_id]);

    await pool.query('DELETE FROM category_statuses WHERE id = ?', [id]);

    if (req.io) {
      req.io.emit('category_status_deleted', { id: parseInt(id), category_id: existing[0].category_id });
    }

    res.json({ message: 'Category status deleted successfully' });
  } catch (err) {
    console.error('Delete category status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
