const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { auth, authorize } = require('../middleware/auth');

console.log('Registering notification routes...');

router.get('/unread-count', auth, authorize('teacher', 'student'), (req, res, next) => {
  console.log(`Hit GET /api/notifications/unread-count for user:`, {
    id: req.user?.id || 'undefined',
    role: req.user?.role || 'undefined',
  });
  notificationController.getUnreadCount(req, res, next);
});

router.get('/', auth, authorize('teacher', 'student'), (req, res, next) => {
  console.log(`Hit GET /api/notifications/user for user:`, {
    id: req.user?.id || 'undefined',
    role: req.user?.role || 'undefined',
  });
  notificationController.getUserNotifications(req, res, next);
});

router.patch('/:id/mark-read', auth, authorize('teacher', 'student'), (req, res, next) => {
  console.log(`Hit PATCH /api/notifications/:id/mark-read for user:`, {
    id: req.user?.id || 'undefined',
    role: req.user?.role || 'undefined',
    notificationId: req.params.id,
  });
  notificationController.markAsRead(req, res, next);
});

router.get('/admin', auth, authorize('admin'), (req, res, next) => {
  console.log(`Hit GET /api/notifications/admin for user:`, {
    id: req.user?.id || 'undefined',
    role: req.user?.role || 'undefined',
  });
  if (!req.user || !req.user.id) {
    console.log(`Access denied for /api/notifications/admin: Invalid user`, { user: req.user });
    return res.status(403).json({ message: 'Không đủ quyền' });
  }
  notificationController.getAllNotifications(req, res, next);
});

router.post('/admin', auth, authorize('admin'), (req, res, next) => {
  console.log(`Hit POST /api/notifications/admin for user:`, {
    id: req.user?.id || 'undefined',
    role: req.user?.role || 'undefined',
    payload: req.body,
  });
  notificationController.createNotification(req, res, next);
});

router.get('/admin/:id', auth, authorize('admin'), (req, res, next) => {
  console.log(`Hit GET /api/notifications/admin/:id for user:`, {
    id: req.user?.id || 'undefined',
    role: req.user?.role || 'undefined',
    notificationId: req.params.id,
  });
  notificationController.getNotificationById(req, res, next);
});

router.put('/admin/:id', auth, authorize('admin'), (req, res, next) => {
  console.log(`Hit PUT /api/notifications/admin/:id for user:`, {
    id: req.user?.id || 'undefined',
    role: req.user?.role || 'undefined',
    notificationId: req.params.id,
    payload: req.body,
  });
  notificationController.updateNotification(req, res, next);
});

router.delete('/admin/:id', auth, authorize('admin'), (req, res, next) => {
  console.log(`Hit DELETE /api/notifications/admin/:id for user:`, {
    id: req.user?.id || 'undefined',
    role: req.user?.role || 'undefined',
    notificationId: req.params.id,
  });
  notificationController.deleteNotification(req, res, next);
});

module.exports = router;