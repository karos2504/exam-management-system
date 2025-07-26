const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const examRoutes = require('./routes/exams');
const registrationRoutes = require('./routes/registrations');
const scheduleRoutes = require('./routes/schedules');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const assignmentRoutes = require('./routes/assignments');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/assignments', assignmentRoutes);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test route working' });
});

// Debug registered routes
app.get('/api/debug/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods),
      });
    } else if (middleware.name === 'router' && middleware.handle.stack) {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: middleware.regexp.source + handler.route.path,
            methods: Object.keys(handler.route.methods),
          });
        }
      });
    }
  });
  res.json({ routes });
});

app.get('/api/health', (req, res) => {
  res.json({
    message: 'Server đang hoạt động',
    timestamp: new Date().toISOString(),
  });
});

const userRoles = new Map();

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  const role = socket.handshake.query.role;

  if (!userId || !role || !['teacher', 'student', 'admin'].includes(role)) {
    console.warn('Invalid connection attempt:', { userId, role });
    socket.disconnect(true);
    return;
  }

  console.log(`Client connected: ${socket.id}, user: ${userId} (${role})`);
  userRoles.set(userId, role);
  socket.join(`user-${userId}`);
  socket.join(role);

  socket.on('join-room', ({ userId, role }) => {
    if (userId && role) {
      socket.join(`user-${userId}`);
      socket.join(role);
      console.log(`User ${userId} (${role}) joined rooms: user-${userId}, ${role}`);
    }
  });

  socket.on('exam-updated', (data) => {
    io.to('admin').emit('exam-updated', data);
    console.log('Emitted exam-updated:', data);
  });

  socket.on('registration-updated', (data) => {
    io.to('admin').emit('registration-updated', data);
    io.to(`user-${data.user_id}`).emit('registration-updated', data);
    console.log('Emitted registration-updated:', data);
  });

  socket.on('schedule-updated', (data) => {
    io.to('admin').emit('schedule-updated', data);
    console.log('Emitted schedule-updated:', data);
  });

  socket.on('notification-created', (data) => {
    const { id, type, content, user_ids } = data;
    if (!user_ids || user_ids.length === 0) {
      io.to('teacher').to('student').emit('notification-created', data);
      console.log(`Sent notification ${id} to all teachers and students`);
    } else {
      user_ids.forEach((user_id) => {
        const userRole = userRoles.get(user_id);
        if (['teacher', 'student'].includes(userRole)) {
          io.to(`user-${user_id}`).emit('notification-created', data);
          console.log(`Sent notification ${id} to user-${user_id}`);
        }
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}, user: ${userId}`);
    userRoles.delete(userId);
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Có lỗi xảy ra!' });
});

app.use('*', (req, res) => {
  console.log(`404 for ${req.method} ${req.url}`);
  res.status(404).json({ message: 'API không tồn tại' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server chạy: http://localhost:${PORT}`);
});

module.exports = app;