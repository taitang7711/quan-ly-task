const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const subcategoryRoutes = require('./routes/subcategories');
const taskRoutes = require('./routes/tasks');
const aiRoutes = require('./routes/ai');
const reportRoutes = require('./routes/reports');
const todoRoutes = require('./routes/todos');
const categoryStatusRoutes = require('./routes/categoryStatuses');
const { startReportScheduler } = require('./routes/reports');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:8080', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subcategoryRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/category-statuses', categoryStatusRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('join', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`👤 User ${userId} joined their room`);
    }
  });

  socket.on('task_moved', (data) => {
    socket.broadcast.emit('task_updated', data);
  });

  socket.on('task_changed', (data) => {
    socket.broadcast.emit('task_changed', data);
  });

  socket.on('comment_added', (data) => {
    socket.broadcast.emit('comment_added', data);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Start report scheduler (only once)
if (process.env.NODE_ENV !== 'test') {
  startReportScheduler(io);
}

const PORT = process.env.PORT || 5000;
// Only listen if not in test mode
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Socket.io ready for connections`);
  });
}

module.exports = { app, server, io };