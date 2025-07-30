import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect(userData = {}) {
    return new Promise((resolve, reject) => {
      if (this.isConnected && this.socket) {
        console.warn('Socket connection skipped: Already connected.');
        resolve(this.socket);
        return;
      }
      if (!userData.id || !userData.role) {
        console.warn('Socket connection skipped: Invalid userData', userData);
        reject(new Error('Invalid user data for socket connection.'));
        return;
      }

      const socketServerUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      this.socket = io(socketServerUrl, {
        transports: ['websocket'],
        autoConnect: true,
        query: {
          userId: userData.id,
          role: userData.role,
        },
      });

      this.socket.on('connect', () => {
        console.log('SocketService: Connected with ID', this.socket.id);
        this.isConnected = true;
        this.joinRoom(userData);
        resolve(this.socket);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('SocketService: Disconnected. Reason:', reason);
        this.isConnected = false;
      });

      this.socket.on('connect_error', (err) => {
        console.error('SocketService: Connection error:', err.message);
        this.isConnected = false;
        reject(err);
      });

      this.socket.on('error', (err) => {
        console.error('SocketService: Generic socket error:', err);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('SocketService: Socket disconnected.');
    }
  }

  joinRoom(userData) {
    if (this.socket && this.isConnected && userData.id && userData.role) {
      this.socket.emit('join-room', {
        userId: userData.id,
        role: userData.role,
      });
      console.log(`SocketService: Emitted 'join-room' for user-${userData.id}, ${userData.role}`);
    } else {
      console.warn('SocketService: Cannot join room. Socket not connected or invalid user data.');
    }
  }

  onUserLogin(cb) {
    if (this.socket) {
      this.socket.on('user-login', cb);
    } else {
      console.warn('SocketService: Socket not initialized, cannot set onUserLogin listener.');
    }
  }

  onNotificationReceived(cb) {
    if (this.socket) {
      this.socket.on('notification-created', cb);
    } else {
      console.warn('SocketService: Socket not initialized, cannot set onNotificationReceived listener.');
    }
  }

  // New method for notification read event
  onNotificationRead(cb) {
    if (this.socket) {
      this.socket.on('notification-read', cb);
    } else {
      console.warn('SocketService: Socket not initialized, cannot set onNotificationRead listener.');
    }
  }

  emitExamUpdate(data) {
    if (this.isConnected) this.socket.emit('exam-updated', data);
    else console.warn('SocketService: Not connected, cannot emit exam-updated.');
  }

  emitRegistrationUpdate(data) {
    if (this.isConnected) this.socket.emit('registration-updated', data);
    else console.warn('SocketService: Not connected, cannot emit registration-updated.');
  }

  emitScheduleUpdate(data) {
    if (this.isConnected) this.socket.emit('schedule-updated', data);
    else console.warn('SocketService: Not connected, cannot emit schedule-updated.');
  }

  emitNotification(data) {
    if (this.isConnected) this.socket.emit('notification-created', data);
    else console.warn('SocketService: Not connected, cannot emit notification-created.');
  }

  onExamRegistrationCountUpdated(cb) {
    if (this.socket) this.socket.on('exam-registration-count-updated', cb);
    else console.warn('SocketService: Socket not initialized, cannot set onExamRegistrationCountUpdated listener.');
  }

  onExamUpdate(cb) {
    if (this.socket) this.socket.on('exam-updated', cb);
    else console.warn('SocketService: Socket not initialized, cannot set onExamUpdate listener.');
  }

  onExamCreated(cb) {
    if (this.socket) this.socket.on('exam-created', cb);
    else console.warn('SocketService: Socket not initialized, cannot set onExamCreated listener.');
  }

  onExamDeleted(cb) {
    if (this.socket) this.socket.on('exam-deleted', cb);
    else console.warn('SocketService: Socket not initialized, cannot set onExamDeleted listener.');
  }

  onRegistrationUpdate(cb) {
    if (this.socket) this.socket.on('registration-updated', cb);
    else console.warn('SocketService: Socket not initialized, cannot set onRegistrationUpdate listener.');
  }

  onScheduleUpdate(cb) {
    if (this.socket) this.socket.on('schedule-updated', cb);
    else console.warn('SocketService: Socket not initialized, cannot set onScheduleUpdate listener.');
  }

  onAssignmentCreated(cb) {
    if (this.socket) this.socket.on('assignment-created', cb);
    else console.warn('SocketService: Socket not initialized, cannot set onAssignmentCreated listener.');
  }

  onAssignmentStatusUpdated(cb) {
    if (this.socket) this.socket.on('assignment-status-updated', cb);
    else console.warn('SocketService: Socket not initialized, cannot set onAssignmentStatusUpdated listener.');
  }

  off(eventName, cb) {
    if (this.socket) {
      this.socket.off(eventName, cb);
    } else {
      console.warn(`SocketService: Socket not initialized, cannot remove listener for ${eventName}.`);
    }
  }

  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
      console.log('SocketService: All listeners removed.');
    } else {
      console.warn('SocketService: Socket not initialized, cannot remove all listeners.');
    }
  }
}

export default new SocketService();