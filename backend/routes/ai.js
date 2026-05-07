const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// Simulated AI responses (replace with actual OpenAI/Claude API calls in production)
function generateAISuggestion(prompt, context) {
  const responses = {
    breakdown: {
      suggestion: 'Dựa trên phân tích, tôi đề xuất chia công việc này thành các bước nhỏ:\n1. Phân tích yêu cầu (2h)\n2. Thiết kế giải pháp (3h)\n3. Triển khai (5h)\n4. Kiểm thử (2h)\n5. Hoàn thiện tài liệu (1h)',
      estimated_total_hours: 13,
      subtasks: [
        'Phân tích yêu cầu',
        'Thiết kế giải pháp',
        'Triển khai',
        'Kiểm thử',
        'Hoàn thiện tài liệu'
      ]
    },
    priority: {
      suggestion: 'Sau khi phân tích deadline và mức độ ảnh hưởng, tôi đề xuất đặt độ ưu tiên là CAO vì:\n- Deadline gần (dưới 3 ngày)\n- Ảnh hưởng đến nhiều task khác\n- Có tính chất blocking',
      recommended_priority: 'high',
      reasoning: 'Deadline gần và có tính chất blocking'
    },
    suggest: {
      suggestion: '📊 Phân tích task của bạn:\n\n✅ Điểm mạnh: Mô tả rõ ràng, có người phụ trách\n⚠️ Cần cải thiện: \n- Nên thêm sub-tasks để dễ theo dõi\n- Cân nhắc thêm deadline cụ thể\n- Có thể cần thêm người review\n\n💡 Gợi ý: Hãy chia nhỏ task và gán người review để đảm bảo chất lượng.',
      recommendations: [
        'Thêm sub-tasks',
        'Đặt deadline cụ thể',
        'Gán người review'
      ]
    },
    blocker: {
      suggestion: '🚨 Task này đã ở trạng thái "In Progress" khá lâu. Phân tích cho thấy:\n\nNguyên nhân có thể:\n1. Thiếu thông tin đầu vào\n2. Phụ thuộc vào task khác\n3. Khối lượng công việc lớn hơn dự kiến\n\nĐề xuất:\n- Tổ chức quick sync 15 phút với team\n- Xem xét chia nhỏ task\n- Cân nhắc thêm người hỗ trợ',
      is_blocked: true,
      suggested_actions: [
        'Tổ chức quick sync',
        'Chia nhỏ task',
        'Thêm người hỗ trợ'
      ]
    },
    general: {
      suggestion: 'Tôi đã phân tích task của bạn. Đây là một task quan trọng. Tôi khuyên bạn nên:\n1. Xác định rõ mục tiêu đầu ra\n2. Đặt timeline cụ thể\n3. Theo dõi tiến độ hàng ngày\n4. Cập nhật trạng thái thường xuyên',
      tips: [
        'Xác định mục tiêu rõ ràng',
        'Đặt timeline',
        'Theo dõi hàng ngày',
        'Cập nhật thường xuyên'
      ]
    }
  };

  return responses[context] || responses.general;
}

// POST /api/ai/task-breakdown - AI phân rã công việc
router.post('/task-breakdown', authenticateToken, async (req, res) => {
  try {
    const { task_id, description } = req.body;

    // In production, call OpenAI/Claude API here
    const aiResponse = generateAISuggestion(description, 'breakdown');

    // Save AI interaction
    await pool.query(
      'INSERT INTO ai_interactions (user_id, task_id, prompt, response, type) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, task_id || null, description || 'Task breakdown request', JSON.stringify(aiResponse), 'breakdown']
    );

    // If task_id provided, add AI comment and update suggestions
    if (task_id) {
      await pool.query(
        'INSERT INTO task_comments (task_id, user_id, content, is_ai) VALUES (?, ?, ?, ?)',
        [task_id, req.user.id, '🤖 AI: ' + aiResponse.suggestion, true]
      );
      await pool.query(
        'UPDATE tasks SET ai_suggestions = ? WHERE id = ?',
        [JSON.stringify(aiResponse), task_id]
      );
    }

    res.json({ result: aiResponse });
  } catch (err) {
    console.error('AI breakdown error:', err);
    res.status(500).json({ error: 'AI service error' });
  }
});

// POST /api/ai/priority-suggest - AI gợi ý độ ưu tiên
router.post('/priority-suggest', authenticateToken, async (req, res) => {
  try {
    const { task_id, title, due_date } = req.body;

    const aiResponse = generateAISuggestion(title, 'priority');

    await pool.query(
      'INSERT INTO ai_interactions (user_id, task_id, prompt, response, type) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, task_id || null, `Priority analysis for: ${title} (due: ${due_date})`, JSON.stringify(aiResponse), 'priority']
    );

    if (task_id) {
      await pool.query(
        'INSERT INTO task_comments (task_id, user_id, content, is_ai) VALUES (?, ?, ?, ?)',
        [task_id, req.user.id, '🤖 AI: ' + aiResponse.suggestion, true]
      );
    }

    res.json({ result: aiResponse });
  } catch (err) {
    console.error('AI priority error:', err);
    res.status(500).json({ error: 'AI service error' });
  }
});

// POST /api/ai/suggest-improvements - AI gợi ý cải thiện task
router.post('/suggest-improvements', authenticateToken, async (req, res) => {
  try {
    const { task_id } = req.body;

    let taskInfo = '';
    if (task_id) {
      const [tasks] = await pool.query(
        'SELECT * FROM tasks WHERE id = ?',
        [task_id]
      );
      if (tasks.length > 0) {
        taskInfo = `Task: ${tasks[0].title}, Status: ${tasks[0].status}, Priority: ${tasks[0].priority}`;
      }
    }

    const aiResponse = generateAISuggestion(taskInfo, 'suggest');

    await pool.query(
      'INSERT INTO ai_interactions (user_id, task_id, prompt, response, type) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, task_id || null, 'Improvement suggestions for: ' + taskInfo, JSON.stringify(aiResponse), 'suggest']
    );

    if (task_id) {
      await pool.query(
        'INSERT INTO task_comments (task_id, user_id, content, is_ai) VALUES (?, ?, ?, ?)',
        [task_id, req.user.id, '🤖 AI: ' + aiResponse.suggestion, true]
      );
      await pool.query(
        'UPDATE tasks SET ai_suggestions = ? WHERE id = ?',
        [JSON.stringify(aiResponse), task_id]
      );
    }

    res.json({ result: aiResponse });
  } catch (err) {
    console.error('AI suggest error:', err);
    res.status(500).json({ error: 'AI service error' });
  }
});

// POST /api/ai/check-blockers - AI phát hiện blocker
router.post('/check-blockers', authenticateToken, async (req, res) => {
  try {
    const { task_id } = req.body;

    if (!task_id) {
      return res.status(400).json({ error: 'Task ID is required' });
    }

    const [tasks] = await pool.query(
      "SELECT * FROM tasks WHERE id = ? AND status = 'in_progress'",
      [task_id]
    );

    if (tasks.length === 0) {
      return res.json({ result: { is_blocked: false, suggestion: 'Task không trong trạng thái bị chặn.' } });
    }

    const task = tasks[0];
    const daysInProgress = Math.floor((Date.now() - new Date(task.updated_at).getTime()) / (1000 * 60 * 60 * 24));

    const aiResponse = generateAISuggestion(task.title, 'blocker');
    aiResponse.days_in_progress = daysInProgress;
    aiResponse.task_title = task.title;

    await pool.query(
      'INSERT INTO ai_interactions (user_id, task_id, prompt, response, type) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, task_id, `Blocker check for task: ${task.title} (${daysInProgress} days in progress)`, JSON.stringify(aiResponse), 'blocker']
    );

    if (daysInProgress > 2) {
      await pool.query(
        'INSERT INTO task_comments (task_id, user_id, content, is_ai) VALUES (?, ?, ?, ?)',
        [task_id, req.user.id, '🤖 AI: ' + aiResponse.suggestion, true]
      );
    }

    res.json({ result: aiResponse });
  } catch (err) {
    console.error('AI blocker check error:', err);
    res.status(500).json({ error: 'AI service error' });
  }
});

// POST /api/ai/general - General AI assistant
router.post('/general', authenticateToken, async (req, res) => {
  try {
    const { prompt, task_id } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const aiResponse = generateAISuggestion(prompt, 'general');

    await pool.query(
      'INSERT INTO ai_interactions (user_id, task_id, prompt, response, type) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, task_id || null, prompt, JSON.stringify(aiResponse), 'general']
    );

    res.json({ result: aiResponse });
  } catch (err) {
    console.error('AI general error:', err);
    res.status(500).json({ error: 'AI service error' });
  }
});

// GET /api/ai/history - Get AI interaction history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { task_id } = req.query;
    let query = 'SELECT * FROM ai_interactions WHERE user_id = ?';
    const params = [req.user.id];

    if (task_id) {
      query += ' AND task_id = ?';
      params.push(task_id);
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const [interactions] = await pool.query(query, params);
    res.json({ interactions });
  } catch (err) {
    console.error('AI history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;