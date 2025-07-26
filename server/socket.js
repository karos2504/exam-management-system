const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
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

  console.log(`User ${userId} (${role}) connected with socket ID: ${socket.id}`);
  userRoles.set(userId, role);
  socket.join(`user:${userId}`);
  socket.join(role);

  socket.on('join-room', ({ userId, role }) => {
    socket.join(`user:${userId}`);
    socket.join(role);
    console.log(`User ${userId} joined rooms: user:${userId}, ${role}`);
  });

  socket.on('notification-created', (data) => {
    const { type, content, user_ids } = data;
    const notificationData = {
      type,
      content,
      user_ids: user_ids || [],
      currentUserId: userId,
    };

    console.log('Notification created:', notificationData);

    if (notificationData.user_ids.length > 0) {
      notificationData.user_ids.forEach((id) => {
        const userRole = userRoles.get(id);
        if (['teacher', 'student'].includes(userRole)) {
          io.to(`user:${id}`).emit('notification-created', notificationData);
          console.log(`Sent notification to user:${id}`);
        }
      });
    } else {
      io.to('teacher').to('student').emit('notification-created', notificationData);
      console.log('Sent notification to all teachers and students');
    }
  });

  socket.on('disconnect', () => {
    userRoles.delete(userId);
    console.log(`User ${userId} disconnected`);
  });
});

server.listen(5000, () => {
  console.log('Socket.IO server running on port 5000');
});