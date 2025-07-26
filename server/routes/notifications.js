const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { auth, authorize } = require('../middleware/auth');

console.log('Registering notification routes...');

// Admin-only routes
router.use('/admin', auth, authorize('admin'), [
  router.get('/', notificationController.getAllNotifications),
  router.get('/:id', notificationController.getNotificationById),
  router.post('/', notificationController.createNotification),
  router.put('/:id', notificationController.updateNotification),
  router.delete('/:id', notificationController.deleteNotification),
]);

// Teacher and student routes
router.get('/unread-count', auth, authorize(['teacher', 'student']), (req, res, next) => {
  console.log('Hit GET /api/notifications/unread-count');
  notificationController.getUnreadCount(req, res, next);
});
router.get('/user', auth, authorize(['teacher', 'student']), (req, res, next) => {
  console.log('Hit GET /api/notifications/user');
  notificationController.getUserNotifications(req, res, next);
});
router.patch('/:id/mark-read', auth, authorize(['teacher', 'student']), (req, res, next) => {
  console.log('Hit PATCH /api/notifications/:id/mark-read');
  notificationController.markAsRead(req, res, next);
});

module.exports = router;