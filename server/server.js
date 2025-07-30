const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const examRoutes = require('./routes/examRoutes');
const registrationRoutes = require('./routes/registrationsRoutes');
const scheduleRoutes = require('./routes/schedulesRoutes');
const userRoutes = require('./routes/usersRoutes');
const notificationRoutes = require('./routes/notificationsRoutes');
const examAssignmentRoutes = require('./routes/examAssignmentRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
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

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/exam-assignments', examAssignmentRoutes);

app.get('/api/test', (req, res) => {
  res.json({ message: 'Test route working' });
});

app.get('/api/debug/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods),
      });
    } else if (middleware.name === 'router' && middleware.handle.stack) {
      const prefix = middleware.regexp.source.replace(/\\\//g, '/').replace(/^\/\^|\/\.\*\$/g, '');
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: `${prefix}${handler.route.path}`,
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

const onlineUsers = new Map();

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  const role = socket.handshake.query.role;

  if (!userId || !role || !['teacher', 'student', 'admin'].includes(role)) {
    console.warn(`[Socket.IO] Invalid connection attempt: ${socket.id}`, { userId, role });
    socket.disconnect(true);
    return;
  }

  console.log(`[Socket.IO] Client connected: ${socket.id}, user: ${userId} (${role})`);
  onlineUsers.set(userId, { socketId: socket.id, role, username: null, full_name: null });

  socket.join(`user-${userId}`);
  socket.join(role);
  console.log(`[Socket.IO] User ${userId} (${role}) joined rooms: user-${userId}, ${role}`);

  socket.on('user-login', (userData) => {
    console.log(`[Socket.IO] 'user-login' event received for: ${userData.username || userData.userId} (Role: ${userData.role})`);

    onlineUsers.set(userData.userId, {
      socketId: socket.id,
      role: userData.role,
      username: userData.username || null,
      full_name: userData.full_name || null,
    });

    socket.broadcast.emit('user-login', {
      message: `${userData.username || userData.userId} đã đăng nhập!`,
      userId: userData.userId,
      role: userData.role,
      username: userData.username,
      full_name: userData.full_name,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}, user: ${userId}. Reason: ${reason}`);
    onlineUsers.delete(userId);
    socket.broadcast.emit('user-logout', {
      userId: userId,
      message: `User ${userId} has logged out or disconnected.`,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('error', (err) => {
    console.error(`[Socket.IO] Socket error for ${socket.id}:`, err);
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ message: 'Có lỗi xảy ra!', error: err.message });
});

app.use('*', (req, res) => {
  console.log(`404 Not Found for ${req.method} ${req.url}`);
  res.status(404).json({ message: 'API không tồn tại' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server chạy: http://localhost:${PORT}`);
});

module.exports = app;