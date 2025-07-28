const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import các định tuyến API
const authRoutes = require('./routes/authRoutes');
const examRoutes = require('./routes/examRoutes');
const registrationRoutes = require('./routes/registrationsRoutes');
const scheduleRoutes = require('./routes/schedulesRoutes');
const userRoutes = require('./routes/usersRoutes');
const notificationRoutes = require('./routes/notificationsRoutes');
const examAssignmentRoutes = require('./routes/examAssignmentRoutes'); // <-- ĐÃ SỬ DỤNG TÊN ĐỒNG BỘ

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Đảm bảo cho các request API
  },
});

// Middleware để gắn đối tượng io vào req, giúp các controller có thể sử dụng Socket.IO
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Cấu hình CORS cho Express
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Middleware xử lý JSON và URL-encoded body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware log request
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Định tuyến API
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/exam-assignments', examAssignmentRoutes); // <-- ĐÃ CẬP NHẬT ĐƯỜNG DẪN API ĐỂ ĐỒNG BỘ

// Route kiểm tra cơ bản
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test route working' });
});

// Route hiển thị tất cả các route đã đăng ký (hữu ích cho debug)
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

// Route kiểm tra sức khỏe của server
app.get('/api/health', (req, res) => {
  res.json({
    message: 'Server đang hoạt động',
    timestamp: new Date().toISOString(),
  });
});

// Map để lưu trữ vai trò của người dùng (có thể dùng Redis hoặc database cho ứng dụng lớn hơn)
const userRoles = new Map();

// Xử lý kết nối Socket.IO
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  const role = socket.handshake.query.role;

  // Kiểm tra thông tin kết nối hợp lệ
  if (!userId || !role || !['teacher', 'student', 'admin'].includes(role)) {
    console.warn('Invalid connection attempt (Socket.IO):', { userId, role });
    socket.disconnect(true);
    return;
  }

  console.log(`Client connected: ${socket.id}, user: ${userId} (${role})`);
  userRoles.set(userId, role); // Lưu trữ vai trò của user
  socket.join(`user-${userId}`); // Tạo phòng riêng cho từng người dùng
  socket.join(role); // Tạo phòng cho từng vai trò (admin, teacher, student)

  socket.on('join-room', ({ userId, role }) => {
    if (userId && role) {
      socket.join(`user-${userId}`);
      socket.join(role);
      console.log(`User ${userId} (${role}) joined rooms: user-${userId}, ${role}`);
    }
  });

  // Các sự kiện Socket.IO được phát từ client (nếu có) và re-emit lại bởi server
  socket.on('exam-updated', (data) => {
    io.to('admin').emit('exam-updated', data);
    io.to('teacher').emit('exam-updated', data);
    io.to('student').emit('exam-updated', data);
    console.log('Emitted exam-updated:', data);
  });

  socket.on('registration-updated', (data) => {
    io.to('admin').emit('registration-updated', data);
    if (data.user_id) {
      io.to(`user-${data.user_id}`).emit('registration-updated', data);
    }
    console.log('Emitted registration-updated:', data);
  });

  socket.on('schedule-updated', (data) => {
    io.to('admin').emit('schedule-updated', data);
    io.to('teacher').emit('schedule-updated', data);
    io.to('student').emit('schedule-updated', data);
    console.log('Emitted schedule-updated:', data);
  });

  socket.on('notification-created', (data) => {
    const { id, type, content, user_ids } = data;
    if (!user_ids || user_ids.length === 0) {
      // Nếu không có user_ids cụ thể, gửi cho tất cả giáo viên và sinh viên (hoặc tất cả trừ admin)
      io.to('teacher').to('student').emit('notification-created', data);
      console.log(`Sent notification ${id} to all teachers and students`);
    } else {
      // Gửi cho từng user cụ thể
      user_ids.forEach((user_id) => {
        const userRole = userRoles.get(user_id);
        // Chỉ gửi nếu user đang online và vai trò hợp lệ
        if (['teacher', 'student', 'admin'].includes(userRole)) { // Admin cũng có thể nhận notification
          io.to(`user-${user_id}`).emit('notification-created', data);
          console.log(`Sent notification ${id} to user-${user_id}`);
        }
      });
    }
  });

  // Xử lý khi client ngắt kết nối
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}, user: ${userId}`);
    userRoles.delete(userId); // Xóa khỏi map khi ngắt kết nối
  });
});

// Middleware xử lý lỗi tập trung
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ message: 'Có lỗi xảy ra!', error: err.message });
});

// Middleware xử lý route không tìm thấy (404 Not Found)
app.use('*', (req, res) => {
  console.log(`404 Not Found for ${req.method} ${req.url}`);
  res.status(404).json({ message: 'API không tồn tại' });
});

// Khởi động server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server chạy: http://localhost:${PORT}`);
});

module.exports = app;