const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/subcategories - List all subcategories (optionally filter by category_id or parent)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category_id, parent_subcategory_id } = req.query;
    let query = 'SELECT * FROM subcategories';
    const params = [];

    const conditions = [];
    if (category_id) {
      conditions.push('category_id = ?');
      params.push(category_id);
    }
    if (parent_subcategory_id !== undefined) {
      if (parent_subcategory_id === 'null' || parent_subcategory_id === '') {
        conditions.push('parent_subcategory_id IS NULL');
      } else {
        conditions.push('parent_subcategory_id = ?');
        params.push(parent_subcategory_id);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY sort_order';
    const [subcategories] = await pool.query(query, params);
    res.json({ subcategories });
  } catch (err) {
    console.error('Get subcategories error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/subcategories - Create new subcategory
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, category_id, parent_subcategory_id, icon, color, sort_order } = req.body;

    if (!name || !category_id) {
      return res.status(400).json({ error: 'Name and category_id are required' });
    }

    const [cat] = await pool.query('SELECT id FROM categories WHERE id = ?', [category_id]);
    if (cat.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const [result] = await pool.query(
      'INSERT INTO subcategories (name, category_id, parent_subcategory_id, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [name, category_id, parent_subcategory_id || null, icon || 'mdi-folder-outline', color || '#1E3C72', sort_order || 0]
    );

    const [newSub] = await pool.query('SELECT * FROM subcategories WHERE id = ?', [result.insertId]);

    if (req.io) {
      req.io.emit('subcategory_created', newSub[0]);
    }

    res.status(201).json({ subcategory: newSub[0] });
  } catch (err) {
    console.error('Create subcategory error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/subcategories/:id - Update subcategory
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sort_order, category_id, parent_subcategory_id, icon, color } = req.body;

    const [existing] = await pool.query('SELECT * FROM subcategories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    await pool.query(
      'UPDATE subcategories SET name = ?, sort_order = ?, category_id = ?, parent_subcategory_id = ?, icon = ?, color = ? WHERE id = ?',
      [
        name ?? existing[0].name,
        sort_order ?? existing[0].sort_order,
        category_id ?? existing[0].category_id,
        parent_subcategory_id !== undefined ? parent_subcategory_id : existing[0].parent_subcategory_id,
        icon ?? existing[0].icon,
        color ?? existing[0].color,
        id
      ]
    );

    const [updated] = await pool.query('SELECT * FROM subcategories WHERE id = ?', [id]);

    if (req.io) {
      req.io.emit('subcategory_updated', updated[0]);
    }

    res.json({ subcategory: updated[0] });
  } catch (err) {
    console.error('Update subcategory error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/subcategories/:id - Delete subcategory (also re-parent children)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM subcategories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    // Re-parent children to parent of deleted subcategory
    await pool.query(
      'UPDATE subcategories SET parent_subcategory_id = ? WHERE parent_subcategory_id = ?',
      [existing[0].parent_subcategory_id, id]
    );

    await pool.query('UPDATE tasks SET subcategory_id = NULL WHERE subcategory_id = ?', [id]);
    await pool.query('UPDATE todos SET subcategory_id = NULL WHERE subcategory_id = ?', [id]);
    await pool.query('DELETE FROM subcategories WHERE id = ?', [id]);

    if (req.io) {
      req.io.emit('subcategory_deleted', { id: parseInt(id) });
    }

    res.json({ message: 'Subcategory deleted successfully' });
  } catch (err) {
    console.error('Delete subcategory error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;