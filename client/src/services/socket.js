import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  // Modified connect method to return a Promise
  connect(userData = {}) {
    return new Promise((resolve, reject) => {
      if (this.isConnected && this.socket) {
        console.warn('Socket connection skipped: Already connected.');
        resolve(this.socket); // Resolve immediately if already connected
        return;
      }
      if (!userData.id || !userData.role) {
        console.warn('Socket connection skipped: Invalid userData', userData);
        reject(new Error('Invalid user data for socket connection.')); // Reject if invalid data
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
        console.log('Connected:', this.socket.id);
        this.isConnected = true;
        resolve(this.socket); // Resolve the promise on successful connection
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected');
        this.isConnected = false;
      });

      this.socket.on('connect_error', (err) => {
        console.error('Socket error:', err.message);
        this.isConnected = false;
        reject(err); // Reject the promise on connection error
      });

      // Optional: Set a timeout for connection attempt
      setTimeout(() => {
        if (!this.isConnected) {
          console.warn('Socket connection timed out.');
          // Don't reject here if `connect_error` is expected to handle it.
          // This is more for a fallback if no error event fires.
          // For now, let's rely on 'connect_error' or 'connect'.
        }
      }, 10000); // 10 seconds timeout
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('SocketService: Disconnected socket.');
    }
  }

  joinRoom(userData) {
    // This call should now happen ONLY after `connect()` promise resolves
    if (this.socket && this.isConnected && userData.id) {
      this.socket.emit('join-room', {
        userId: userData.id,
        role: userData.role,
      });
      console.log(`Joining rooms: user-${userData.id}, ${userData.role}`);
    } else {
      console.warn('Cannot join room: Socket not connected or invalid user data. This should not happen if called after successful connection.');
    }
  }

  // --- Emit methods ---
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

  // --- Listener methods ---
  onExamRegistrationCountUpdated(cb) {
    if (this.socket) this.socket.on('exam-registration-count-updated', cb);
  }

  onNotificationReceived(cb) {
    if (this.socket) this.socket.on('notification-created', cb);
  }

  onExamUpdate(cb) {
    if (this.socket) this.socket.on('exam-updated', cb);
  }

  onExamCreated(cb) {
    if (this.socket) this.socket.on('exam-created', cb);
  }

  onExamDeleted(cb) {
    if (this.socket) this.socket.on('exam-deleted', cb);
  }

  onRegistrationUpdate(cb) {
    if (this.socket) this.socket.on('registration-updated', cb);
  }

  onScheduleUpdate(cb) {
    if (this.socket) this.socket.on('schedule-updated', cb);
  }

  // Generic off method for cleaning up listeners
  off(eventName, cb) {
    if (this.socket) {
      this.socket.off(eventName, cb);
    }
  }

  removeAllListeners() {
    if (this.socket) this.socket.removeAllListeners();
  }
}

export default new SocketService();