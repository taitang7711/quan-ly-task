const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category_id } = req.query;
    let query = `
      SELECT t.*, c.name as category_name, c.color as category_color,
             s.name as subcategory_name
      FROM todos t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN subcategories s ON t.subcategory_id = s.id
      WHERE t.user_id = ?
    `;
    const params = [req.user.id];

    if (category_id) {
      query += ' AND t.category_id = ?';
      params.push(category_id);
    }

    query += ' ORDER BY t.sort_order ASC, t.created_at DESC';

    const [todos] = await pool.query(query, params);
    res.json({ todos });
  } catch (err) {
    console.error('Get todos error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, category_id, subcategory_id } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const [maxOrder] = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM todos WHERE user_id = ?',
      [req.user.id]
    );

    const [result] = await pool.query(
      'INSERT INTO todos (user_id, title, category_id, subcategory_id, sort_order) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, title.trim(), category_id || null, subcategory_id || null, maxOrder[0].next_order]
    );

    const [newTodo] = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color,
              s.name as subcategory_name
       FROM todos t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN subcategories s ON t.subcategory_id = s.id
       WHERE t.id = ?`,
      [result.insertId]
    );
    res.status(201).json({ todo: newTodo[0] });
  } catch (err) {
    console.error('Create todo error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, is_done, sort_order, category_id, subcategory_id } = req.body;

    const [existing] = await pool.query('SELECT * FROM todos WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    await pool.query(
      'UPDATE todos SET title = ?, is_done = ?, sort_order = ?, category_id = ?, subcategory_id = ? WHERE id = ? AND user_id = ?',
      [
        title ?? existing[0].title,
        is_done ?? existing[0].is_done,
        sort_order ?? existing[0].sort_order,
        category_id !== undefined ? category_id : existing[0].category_id,
        subcategory_id !== undefined ? subcategory_id : existing[0].subcategory_id,
        id,
        req.user.id
      ]
    );

    const [updated] = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color,
              s.name as subcategory_name
       FROM todos t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN subcategories s ON t.subcategory_id = s.id
       WHERE t.id = ?`,
      [id]
    );
    res.json({ todo: updated[0] });
  } catch (err) {
    console.error('Update todo error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM todos WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json({ message: 'Todo deleted successfully' });
  } catch (err) {
    console.error('Delete todo error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
