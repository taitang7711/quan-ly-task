const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/categories - List all categories with subcategories
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [categories] = await pool.query(
      'SELECT * FROM categories ORDER BY sort_order'
    );

    // Get subcategories and statuses for each category
    for (let cat of categories) {
      const [subs] = await pool.query(
        'SELECT * FROM subcategories WHERE category_id = ? ORDER BY sort_order',
        [cat.id]
      );
      cat.subcategories = subs;

      const [statuses] = await pool.query(
        'SELECT * FROM category_statuses WHERE category_id = ? ORDER BY sort_order',
        [cat.id]
      );
      cat.statuses = statuses;

      // Count tasks per status for each category
      const [stats] = await pool.query(
        `SELECT status, COUNT(*) as count FROM tasks WHERE category_id = ? GROUP BY status`,
        [cat.id]
      );
      cat.task_stats = stats;
    }

    res.json({ categories });
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/categories - Create new category
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, color, sort_order } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const [result] = await pool.query(
      'INSERT INTO categories (name, color, sort_order, created_by) VALUES (?, ?, ?, ?)',
      [name, color || '#1E3C72', sort_order || 0, req.user.id]
    );

    const [newCat] = await pool.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);

    if (req.io) {
      req.io.emit('category_created', newCat[0]);
    }

    res.status(201).json({ category: newCat[0] });
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/categories/:id - Update category
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, sort_order } = req.body;

    const [existing] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await pool.query(
      'UPDATE categories SET name = ?, color = ?, sort_order = ? WHERE id = ?',
      [name || existing[0].name, color || existing[0].color, sort_order ?? existing[0].sort_order, id]
    );

    const [updated] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);

    if (req.io) {
      req.io.emit('category_updated', updated[0]);
    }

    res.json({ category: updated[0] });
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/categories/:id - Delete category
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Delete related tasks first
    await pool.query('DELETE FROM tasks WHERE category_id = ?', [id]);
    await pool.query('DELETE FROM subcategories WHERE category_id = ?', [id]);
    await pool.query('DELETE FROM categories WHERE id = ?', [id]);

    if (req.io) {
      req.io.emit('category_deleted', { id: parseInt(id) });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;