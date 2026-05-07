const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const cron = require('node-cron');
require('dotenv').config();

// GET /api/reports - List all reports
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [reports] = await pool.query(
      `SELECT r.*, u.username
       FROM reports r
       LEFT JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC
       LIMIT 20`
    );
    res.json({ reports });
  } catch (err) {
    console.error('Get reports error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/:id - Get single report detail
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [reports] = await pool.query(
      `SELECT r.*, u.username
       FROM reports r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
      [id]
    );

    if (reports.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ report: reports[0] });
  } catch (err) {
    console.error('Get report error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/reports/generate - Generate report manually
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const report = await generateWeeklyReport(req.user.id);
    res.status(201).json({ message: 'Report generated successfully', report });
  } catch (err) {
    console.error('Generate report error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Generate report function
async function generateWeeklyReport(userId) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const weekStart = monday.toISOString().split('T')[0];
  const weekEnd = sunday.toISOString().split('T')[0];

  // Count total tasks created this week
  const [totalTasks] = await pool.query(
    'SELECT COUNT(*) as count FROM tasks WHERE created_at >= ? AND created_at <= ?',
    [weekStart, weekEnd]
  );

  // Count completed tasks
  const [completedTasks] = await pool.query(
    "SELECT COUNT(*) as count FROM tasks WHERE status = 'done' AND updated_at >= ? AND updated_at <= ?",
    [weekStart, weekEnd]
  );

  // Count overdue tasks
  const [overdueTasks] = await pool.query(
    "SELECT COUNT(*) as count FROM tasks WHERE due_date < NOW() AND status != 'done'"
  );

  // Get completed tasks list
  const [completedList] = await pool.query(
    `SELECT t.id, t.title, t.priority, c.name as category_name, u.username as assignee_name
     FROM tasks t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN users u ON t.assignee_id = u.id
     WHERE t.status = 'done' AND t.updated_at >= ? AND t.updated_at <= ?
     ORDER BY t.updated_at DESC`,
    [weekStart, weekEnd]
  );

  // Get in-progress tasks
  const [inProgressList] = await pool.query(
    `SELECT t.id, t.title, t.priority, t.status, c.name as category_name, u.username as assignee_name
     FROM tasks t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN users u ON t.assignee_id = u.id
     WHERE t.status IN ('todo', 'in_progress', 'review')
     ORDER BY t.priority DESC, t.due_date ASC`
  );

  // AI Summary (simplified)
  const completionRate = totalTasks[0].count > 0
    ? Math.round((completedTasks[0].count / totalTasks[0].count) * 100)
    : 0;

  let aiSummary = '';
  if (completionRate >= 80) {
    aiSummary = `🎉 Tuần này thật tuyệt vời! Bạn đã hoàn thành ${completionRate}% công việc. Tiếp tục phát huy nhé!`;
  } else if (completionRate >= 50) {
    aiSummary = `👍 Bạn đã hoàn thành ${completionRate}% công việc trong tuần. Còn ${inProgressList.length} task đang thực hiện, hãy ưu tiên các task có độ ưu tiên cao.`;
  } else {
    aiSummary = `📊 Bạn đã hoàn thành ${completionRate}% công việc. Còn ${overdueTasks[0].count} task quá hạn cần xử lý ngay. Hãy tập trung vào các task quan trọng trong tuần tới.`;
  }

  if (overdueTasks[0].count > 0) {
    aiSummary += `\n⚠️ Lưu ý: Có ${overdueTasks[0].count} task đã quá hạn, cần ưu tiên xử lý.`;
  }

  // Save report
  const [result] = await pool.query(
    `INSERT INTO reports (user_id, week_start, week_end, total_tasks, completed_tasks, overdue_tasks, ai_summary)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, weekStart, weekEnd, totalTasks[0].count, completedTasks[0].count, overdueTasks[0].count, aiSummary]
  );

  const [report] = await pool.query('SELECT * FROM reports WHERE id = ?', [result.insertId]);

  return {
    ...report[0],
    completed_list: completedList,
    in_progress_list: inProgressList,
    completion_rate: completionRate
  };
}

// Schedule weekend report (Saturday at 9:00 AM)
function startReportScheduler(io) {
  cron.schedule('0 9 * * 6', async () => {
    console.log('📊 Generating weekend reports...');

    try {
      const [users] = await pool.query(
        "SELECT id, email FROM users WHERE role IN ('admin', 'manager')"
      );

      for (const user of users) {
        const report = await generateWeeklyReport(user.id);
        console.log(`  ✓ Report generated for user ${user.id}: ${report.completion_rate}% completion`);

        if (io) {
          io.emit('report_generated', { user_id: user.id, report });
        }

        // Send email if configured (TODO: integrate Nodemailer)
        // await sendReportEmail(user.email, report);
      }

      console.log('✅ Weekend reports completed');
    } catch (err) {
      console.error('❌ Weekend report error:', err);
    }
  }, {
    timezone: 'Asia/Saigon'
  });

  console.log('📅 Weekend report scheduler started (every Saturday at 9:00 AM)');
}

module.exports = router;
module.exports.startReportScheduler = startReportScheduler;