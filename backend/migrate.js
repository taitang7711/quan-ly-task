const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '192.168.0.110',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'vinhtai1511'
  });

  console.log('Connected to MySQL server');

  // Create database if not exists
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'task_manager'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query(`USE \`${process.env.DB_NAME || 'task_manager'}\``);
  console.log('Database selected:', process.env.DB_NAME || 'task_manager');

  // Create tables
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin','manager','member') DEFAULT 'member',
      avatar_url VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(7) DEFAULT '#1E3C72',
      sort_order INT DEFAULT 0,
      created_by INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS subcategories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      category_id INT NOT NULL,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT DEFAULT NULL,
      category_id INT DEFAULT NULL,
      subcategory_id INT DEFAULT NULL,
      status VARCHAR(50) DEFAULT 'todo',
      priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
      assignee_id INT DEFAULT NULL,
      due_date DATETIME DEFAULT NULL,
      estimated_hours DECIMAL(5,1) DEFAULT NULL,
      actual_hours DECIMAL(5,1) DEFAULT NULL,
      parent_task_id INT DEFAULT NULL,
      ai_suggestions JSON DEFAULT NULL,
      board_position INT DEFAULT 0,
      created_by INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL,
      FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS task_comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      task_id INT NOT NULL,
      user_id INT DEFAULT NULL,
      content TEXT NOT NULL,
      is_ai BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS ai_interactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT DEFAULT NULL,
      task_id INT DEFAULT NULL,
      prompt TEXT,
      response JSON DEFAULT NULL,
      type ENUM('breakdown','priority','suggest','blocker','general','summarize','report_summary') DEFAULT 'general',
      model_used VARCHAR(100) DEFAULT NULL,
      latency_ms INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS ai_config (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL COMMENT 'NULL for global default, otherwise user-specific config',
      provider VARCHAR(50) NOT NULL DEFAULT 'openai',
      model_name VARCHAR(100) NOT NULL DEFAULT 'gpt-3.5-turbo',
      api_key_encrypted VARCHAR(500) NOT NULL DEFAULT '',
      base_url VARCHAR(255) NULL,
      temperature DECIMAL(2,1) DEFAULT 0.7,
      max_tokens INT DEFAULT 1000,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_config (user_id)
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS category_statuses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(7) DEFAULT '#1E3C72',
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS todos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      is_done BOOLEAN DEFAULT FALSE,
      category_id INT DEFAULT NULL,
      subcategory_id INT DEFAULT NULL,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT DEFAULT NULL,
      week_start DATE NOT NULL,
      week_end DATE NOT NULL,
      total_tasks INT DEFAULT 0,
      completed_tasks INT DEFAULT 0,
      overdue_tasks INT DEFAULT 0,
      ai_summary TEXT DEFAULT NULL,
      file_path VARCHAR(255) DEFAULT NULL,
      sent_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB`,

  ];

  for (const tableSQL of tables) {
    await connection.query(tableSQL);
    console.log('  ✓ Table created');
  }

  // Seed data: default admin user (password: admin123)
  const bcrypt = require('bcryptjs');
  const existingAdmin = await connection.query('SELECT id FROM users WHERE username = ?', ['admin']);
  if (existingAdmin[0].length === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await connection.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['admin', 'admin@taskmanager.com', hash, 'admin']
    );
    console.log('  ✓ Default admin user created (admin / admin123)');
  }

  // Seed default categories
  const existingCat = await connection.query('SELECT COUNT(*) as count FROM categories');
  if (existingCat[0][0].count === 0) {
    const cats = [
      ['Công việc', '#1E3C72', 1],
      ['Cá nhân', '#2E86C1', 2],
      ['Khẩn cấp', '#E74C3C', 3],
      ['Học tập', '#27AE60', 4]
    ];
    for (const [name, color, order] of cats) {
      await connection.query('INSERT INTO categories (name, color, sort_order) VALUES (?, ?, ?)', [name, color, order]);
    }
    console.log('  ✓ Default categories seeded');
  }

  // --- Migration for existing databases ---

  // Alter todos table to add category_id and subcategory_id
  try {
    await connection.query(
      'ALTER TABLE todos ADD COLUMN category_id INT DEFAULT NULL AFTER is_done'
    );
    console.log('  ✓ Added category_id to todos');
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      'ALTER TABLE todos ADD COLUMN subcategory_id INT DEFAULT NULL AFTER category_id'
    );
    console.log('  ✓ Added subcategory_id to todos');
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      'ALTER TABLE todos ADD FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL'
    );
  } catch (e) {
    if (!e.message.includes('Duplicate foreign key') && !e.message.includes('errno: 1065')) throw e;
  }
  try {
    await connection.query(
      'ALTER TABLE todos ADD FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL'
    );
  } catch (e) {
    if (!e.message.includes('Duplicate foreign key') && !e.message.includes('errno: 1065')) throw e;
  }

  // Alter tasks table: change status from ENUM to VARCHAR
  try {
    await connection.query("ALTER TABLE tasks MODIFY COLUMN status VARCHAR(50) DEFAULT 'Cần làm'");
    console.log('  ✓ Changed tasks.status to VARCHAR(50)');
  } catch (e) {
    if (!e.message.includes('Duplicate')) throw e;
  }

  // Migrate existing tasks from old ENUM values to new display names
  await connection.query("UPDATE tasks SET status = 'Cần làm' WHERE status = 'todo'");
  await connection.query("UPDATE tasks SET status = 'Đang làm' WHERE status = 'in_progress'");
  await connection.query("UPDATE tasks SET status = 'Xem lại' WHERE status = 'review'");
  await connection.query("UPDATE tasks SET status = 'Hoàn thành' WHERE status = 'done'");
  console.log('  ✓ Migrated old task statuses to new display names');

  // Seed default statuses for each category if empty
  const existingStatuses = await connection.query('SELECT COUNT(*) as count FROM category_statuses');
  if (existingStatuses[0][0].count === 0) {
    const cats = await connection.query('SELECT id FROM categories');
    const defaultStatuses = [
      ['Cần làm', '#1E3C72', 1],
      ['Đang làm', '#2A5298', 2],
      ['Xem lại', '#5DADE2', 3],
      ['Hoàn thành', '#10B981', 4]
    ];
    for (const cat of cats[0]) {
      for (const [name, color, order] of defaultStatuses) {
        await connection.query(
          'INSERT INTO category_statuses (category_id, name, color, sort_order) VALUES (?, ?, ?, ?)',
          [cat.id, name, color, order]
        );
      }
    }
    console.log('  ✓ Default statuses seeded for each category');
  }

  // Seed default subcategories
  const existingSub = await connection.query('SELECT COUNT(*) as count FROM subcategories');
  if (existingSub[0][0].count === 0) {
    const subs = [
      ['Frontend', 1, 1],
      ['Backend', 1, 2],
      ['Thiết kế', 1, 3],
      ['Họp hành', 1, 4],
      ['Sức khỏe', 2, 1],
      ['Gia đình', 2, 2],
      ['Sở thích', 2, 3],
      ['Bug khẩn', 3, 1],
      ['Deadline gấp', 3, 2],
      ['Khóa học', 4, 1],
      ['Chứng chỉ', 4, 2]
    ];
    for (const [name, catId, order] of subs) {
      await connection.query('INSERT INTO subcategories (name, category_id, sort_order) VALUES (?, ?, ?)', [name, catId, order]);
    }
    console.log('  ✓ Default subcategories seeded');
  }

  // --- Migration v2: Add hash_task, time tracking, timer fields ---

  // Tasks: add hash_task
  try {
    await connection.query(
      'ALTER TABLE tasks ADD COLUMN hash_task VARCHAR(20) DEFAULT NULL AFTER id'
    );
    console.log('  ✓ Added hash_task to tasks');
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      'ALTER TABLE tasks ADD UNIQUE INDEX idx_hash_task (hash_task)'
    );
  } catch (e) {
    if (!e.message.includes('Duplicate')) throw e;
  }

  // Tasks: add time tracking fields
  try {
    await connection.query(
      'ALTER TABLE tasks ADD COLUMN start_time DATETIME DEFAULT NULL AFTER actual_hours'
    );
    console.log('  ✓ Added start_time to tasks');
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      'ALTER TABLE tasks ADD COLUMN end_time DATETIME DEFAULT NULL AFTER start_time'
    );
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      'ALTER TABLE tasks ADD COLUMN estimated_duration INT DEFAULT NULL AFTER end_time COMMENT "Estimated duration in minutes"'
    );
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      'ALTER TABLE tasks ADD COLUMN actual_duration INT DEFAULT NULL AFTER estimated_duration COMMENT "Actual duration in minutes"'
    );
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      'ALTER TABLE tasks ADD COLUMN timer_status ENUM("running","paused","stopped") DEFAULT NULL AFTER actual_duration'
    );
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      'ALTER TABLE tasks ADD COLUMN timer_started_at DATETIME DEFAULT NULL AFTER timer_status'
    );
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      'ALTER TABLE tasks ADD COLUMN total_paused_seconds INT DEFAULT 0 AFTER timer_started_at'
    );
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }

  // Todos: add hash_task
  try {
    await connection.query(
      'ALTER TABLE todos ADD COLUMN hash_task VARCHAR(20) DEFAULT NULL AFTER id'
    );
    console.log('  ✓ Added hash_task to todos');
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      'ALTER TABLE todos ADD UNIQUE INDEX idx_todo_hash_task (hash_task)'
    );
  } catch (e) {
    if (!e.message.includes('Duplicate')) throw e;
  }

  // Todos: add status, priority, assignee, due_date, time tracking, description
  try {
    await connection.query(
      "ALTER TABLE todos ADD COLUMN description TEXT DEFAULT NULL AFTER title"
    );
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      "ALTER TABLE todos ADD COLUMN status VARCHAR(50) DEFAULT 'Cần làm' AFTER description"
    );
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      "ALTER TABLE todos ADD COLUMN priority ENUM('low','medium','high','urgent') DEFAULT 'medium' AFTER status"
    );
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      'ALTER TABLE todos ADD COLUMN assignee_id INT DEFAULT NULL AFTER priority'
    );
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      'ALTER TABLE todos ADD COLUMN due_date DATETIME DEFAULT NULL AFTER assignee_id'
    );
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      'ALTER TABLE todos ADD COLUMN estimated_hours DECIMAL(5,1) DEFAULT NULL AFTER due_date'
    );
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      'ALTER TABLE todos ADD COLUMN actual_hours DECIMAL(5,1) DEFAULT NULL AFTER estimated_hours'
    );
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      'ALTER TABLE todos ADD COLUMN start_time DATETIME DEFAULT NULL AFTER actual_hours'
    );
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      'ALTER TABLE todos ADD COLUMN end_time DATETIME DEFAULT NULL AFTER start_time'
    );
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      'ALTER TABLE todos ADD COLUMN estimated_duration INT DEFAULT NULL AFTER end_time'
    );
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      'ALTER TABLE todos ADD COLUMN actual_duration INT DEFAULT NULL AFTER estimated_duration'
    );
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      'ALTER TABLE todos ADD COLUMN timer_status ENUM("running","paused","stopped") DEFAULT NULL AFTER actual_duration'
    );
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      'ALTER TABLE todos ADD COLUMN timer_started_at DATETIME DEFAULT NULL AFTER timer_status'
    );
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      'ALTER TABLE todos ADD COLUMN total_paused_seconds INT DEFAULT 0 AFTER timer_started_at'
    );
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }

  // Todos: add comment support (todo_comments table)
  try {
    await connection.query(
      `CREATE TABLE IF NOT EXISTS todo_comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        todo_id INT NOT NULL,
        user_id INT DEFAULT NULL,
        content TEXT NOT NULL,
        is_ai BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB`
    );
    console.log('  ✓ Created todo_comments table');
  } catch (e) {
    if (!e.message.includes('Duplicate')) throw e;
  }

  // Todos: add FK for assignee
  try {
    await connection.query(
      'ALTER TABLE todos ADD FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL'
    );
  } catch (e) {
    if (!e.message.includes('Duplicate foreign key') && !e.message.includes('errno: 1065')) throw e;
  }

  // Subcategories: add parent_subcategory_id, icon, color for nesting
  try {
    await connection.query(
      'ALTER TABLE subcategories ADD COLUMN parent_subcategory_id INT DEFAULT NULL AFTER category_id'
    );
    console.log('  ✓ Added parent_subcategory_id to subcategories');
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      'ALTER TABLE subcategories ADD COLUMN icon VARCHAR(50) DEFAULT "mdi-folder-outline" AFTER parent_subcategory_id'
    );
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await connection.query(
      "ALTER TABLE subcategories ADD COLUMN color VARCHAR(7) DEFAULT '#1E3C72' AFTER icon"
    );
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }

  // Generate hash_task for existing tasks and todos
  const crypto = require('crypto');
  const [existingTasks] = await connection.query('SELECT id FROM tasks WHERE hash_task IS NULL');
  for (const t of existingTasks) {
    const hash = 'TASK-' + crypto.randomBytes(2).toString('hex').toUpperCase();
    await connection.query('UPDATE tasks SET hash_task = ? WHERE id = ?', [hash, t.id]);
  }
  if (existingTasks.length > 0) console.log(`  ✓ Generated hash_task for ${existingTasks.length} existing tasks`);

  const [existingTodos] = await connection.query('SELECT id FROM todos WHERE hash_task IS NULL');
  for (const t of existingTodos) {
    const hash = 'TODO-' + crypto.randomBytes(2).toString('hex').toUpperCase();
    await connection.query('UPDATE todos SET hash_task = ? WHERE id = ?', [hash, t.id]);
  }
  if (existingTodos.length > 0) console.log(`  ✓ Generated hash_task for ${existingTodos.length} existing todos`);

  await connection.end();
  console.log('\n✅ Migration completed successfully!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});