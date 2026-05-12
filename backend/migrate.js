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
      status ENUM('todo','in_progress','review','done') DEFAULT 'todo',
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

    `CREATE TABLE IF NOT EXISTS todos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      is_done BOOLEAN DEFAULT FALSE,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

  await connection.end();
  console.log('\n✅ Migration completed successfully!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});