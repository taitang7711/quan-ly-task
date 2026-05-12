const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const [todos] = await pool.query(
      'SELECT * FROM todos WHERE user_id = ? ORDER BY sort_order ASC, created_at DESC',
      [req.user.id]
    );
    res.json({ todos });
  } catch (err) {
    console.error('Get todos error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const [maxOrder] = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM todos WHERE user_id = ?',
      [req.user.id]
    );

    const [result] = await pool.query(
      'INSERT INTO todos (user_id, title, sort_order) VALUES (?, ?, ?)',
      [req.user.id, title.trim(), maxOrder[0].next_order]
    );

    const [newTodo] = await pool.query('SELECT * FROM todos WHERE id = ?', [result.insertId]);
    res.status(201).json({ todo: newTodo[0] });
  } catch (err) {
    console.error('Create todo error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, is_done, sort_order } = req.body;

    const [existing] = await pool.query('SELECT * FROM todos WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    await pool.query(
      'UPDATE todos SET title = ?, is_done = ?, sort_order = ? WHERE id = ? AND user_id = ?',
      [
        title ?? existing[0].title,
        is_done ?? existing[0].is_done,
        sort_order ?? existing[0].sort_order,
        id,
        req.user.id
      ]
    );

    const [updated] = await pool.query('SELECT * FROM todos WHERE id = ?', [id]);
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
