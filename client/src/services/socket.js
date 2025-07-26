import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect(userData = {}) {
    if (!userData.id || !userData.role || this.isConnected) {
      console.warn('Socket connection skipped: Invalid userData or already connected', userData);
      return;
    }

    this.socket = io('http://localhost:5000', {
      transports: ['websocket'],
      autoConnect: true,
      query: {
        userId: userData.id,
        role: userData.role,
      },
    });

    this.socket.on('connect', () => {
      console.log('Connected:', this.socket.id);
      this.isConnected = true;
      this.joinRoom(userData);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
      this.isConnected = false;
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  joinRoom(userData) {
    if (this.socket && this.isConnected && userData.id) {
      this.socket.emit('join-room', {
        userId: userData.id,
        role: userData.role,
      });
      console.log(`Joining rooms: user-${userData.id}, ${userData.role}`);
    }
  }

  emitExamUpdate(data) {
    if (this.isConnected) this.socket.emit('exam-updated', data);
  }

  emitRegistrationUpdate(data) {
    if (this.isConnected) this.socket.emit('registration-updated', data);
  }

  emitScheduleUpdate(data) {
    if (this.isConnected) this.socket.emit('schedule-updated', data);
  }

  emitNotification(data) {
    if (this.isConnected) this.socket.emit('notification-created', data);
  }

  onNotificationReceived(cb) {
    if (this.socket) this.socket.on('notification-created', cb);
  }

  onExamUpdate(cb) {
    if (this.socket) this.socket.on('exam-updated', cb);
  }

  onRegistrationUpdate(cb) {
    if (this.socket) this.socket.on('registration-updated', cb);
  }

  onScheduleUpdate(cb) {
    if (this.socket) this.socket.on('schedule-updated', cb);
  }

  removeAllListeners() {
    if (this.socket) this.socket.removeAllListeners();
  }
}

export default new SocketService();