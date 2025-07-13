import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect() {
    if (this.socket) return;

    this.socket = io('http://localhost:5000', {
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
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
    if (this.socket && this.isConnected) {
      this.socket.emit('join-room', userData);
    }
  }

  // Listen for exam updates
  onExamUpdate(callback) {
    if (this.socket) {
      this.socket.on('exam-updated', callback);
    }
  }

  // Listen for registration updates
  onRegistrationUpdate(callback) {
    if (this.socket) {
      this.socket.on('registration-updated', callback);
    }
  }

  // Listen for schedule updates
  onScheduleUpdate(callback) {
    if (this.socket) {
      this.socket.on('schedule-updated', callback);
    }
  }

  // Emit exam update
  emitExamUpdate(data) {
    if (this.socket && this.isConnected) {
      this.socket.emit('exam-updated', data);
    }
  }

  // Emit registration update
  emitRegistrationUpdate(data) {
    if (this.socket && this.isConnected) {
      this.socket.emit('registration-updated', data);
    }
  }

  // Emit schedule update
  emitScheduleUpdate(data) {
    if (this.socket && this.isConnected) {
      this.socket.emit('schedule-updated', data);
    }
  }

  // Remove all listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

export default new SocketService(); 