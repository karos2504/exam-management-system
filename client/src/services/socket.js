import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  /**
   * Connects to the Socket.IO server. Returns a Promise that resolves when connected
   * or rejects on error.
   * @param {object} userData - Object containing user's id and role.
   * @param {string} userData.id - User's unique ID.
   * @param {string} userData.role - User's role ('admin', 'teacher', 'student').
   * @returns {Promise<Socket>} A promise that resolves with the socket instance.
   */
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

      // Ensure VITE_API_BASE_URL is correctly set in your .env file
      const socketServerUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      this.socket = io(socketServerUrl, {
        transports: ['websocket'],
        autoConnect: true, // Will attempt to connect immediately
        query: {
          userId: userData.id,
          role: userData.role,
        },
      });

      this.socket.on('connect', () => {
        console.log('SocketService: Connected with ID', this.socket.id);
        this.isConnected = true;
        // Emit 'join-room' once successfully connected to ensure rooms are joined
        this.joinRoom(userData);
        resolve(this.socket); // Resolve the promise on successful connection
      });

      this.socket.on('disconnect', (reason) => {
        console.log('SocketService: Disconnected. Reason:', reason);
        this.isConnected = false;
      });

      this.socket.on('connect_error', (err) => {
        console.error('SocketService: Connection error:', err.message);
        this.isConnected = false;
        reject(err); // Reject the promise on connection error
      });

      // Consider adding a generic error listener for other unhandled errors
      this.socket.on('error', (err) => {
        console.error('SocketService: Generic socket error:', err);
      });

      // Optional: Set a timeout for connection attempt.
      // This can be useful as a fallback, but 'connect_error' is usually sufficient.
      // setTimeout(() => {
      //   if (!this.isConnected) {
      //     console.warn('Socket connection timed out after 10 seconds.');
      //     // Potentially reject here if 'connect_error' hasn't fired
      //     // reject(new Error('Socket connection timed out'));
      //   }
      // }, 10000);
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
    // This method is now called internally by `connect()` after successful connection.
    // It can still be called manually if needed for rejoining rooms for some reason.
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

  // --- Emit methods ---
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

  // --- Listener methods ---
  onExamRegistrationCountUpdated(cb) {
    if (this.socket) this.socket.on('exam-registration-count-updated', cb);
    else console.warn('SocketService: Socket not initialized, cannot set onExamRegistrationCountUpdated listener.');
  }

  onNotificationReceived(cb) {
    if (this.socket) this.socket.on('notification-created', cb);
    else console.warn('SocketService: Socket not initialized, cannot set onNotificationReceived listener.');
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

  // --- NEW LISTENER METHODS FOR ASSIGNMENTS ---
  onAssignmentCreated(cb) {
    if (this.socket) this.socket.on('assignment-created', cb);
    else console.warn('SocketService: Socket not initialized, cannot set onAssignmentCreated listener.');
  }

  onAssignmentStatusUpdated(cb) {
    if (this.socket) this.socket.on('assignment-status-updated', cb);
    else console.warn('SocketService: Socket not initialized, cannot set onAssignmentStatusUpdated listener.');
  }

  // Generic off method for cleaning up listeners
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