const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const examRoutes = require('./routes/exams');
const registrationRoutes = require('./routes/registrations');
const scheduleRoutes = require('./routes/schedules');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/schedules', scheduleRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Server đang hoạt động',
    timestamp: new Date().toISOString()
  });
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join room based on user role
  socket.on('join-room', (userData) => {
    socket.join(`user-${userData.id}`);
    if (userData.role === 'admin' || userData.role === 'teacher') {
      socket.join('admin-room');
    }
    console.log(`User ${userData.name} joined room`);
  });

  // Handle exam updates
  socket.on('exam-updated', (data) => {
    io.to('admin-room').emit('exam-updated', data);
  });

  // Handle registration updates
  socket.on('registration-updated', (data) => {
    io.to('admin-room').emit('registration-updated', data);
    io.to(`user-${data.user_id}`).emit('registration-updated', data);
  });

  // Handle schedule updates
  socket.on('schedule-updated', (data) => {
    io.to('admin-room').emit('schedule-updated', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Có lỗi xảy ra!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'API không tồn tại' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server đang chạy trên port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = { app, io }; 