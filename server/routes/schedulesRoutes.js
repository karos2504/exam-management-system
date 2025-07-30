const express = require('express');
const { body } = require('express-validator');
const scheduleController = require('../controllers/scheduleController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const scheduleValidation = [
  body('exam_id')
    .notEmpty()
    .withMessage('Kỳ thi không được để trống')
    .isUUID()
    .withMessage('ID kỳ thi không hợp lệ'),
  body('room')
    .notEmpty()
    .withMessage('Phòng thi không được để trống')
    .isLength({ max: 50 })
    .withMessage('Phòng thi tối đa 50 ký tự'),
  body('start_time')
    .notEmpty()
    .withMessage('Thời gian bắt đầu không được để trống')
    .isISO8601()
    .withMessage('Thời gian bắt đầu không hợp lệ'),
  body('end_time')
    .notEmpty()
    .withMessage('Thời gian kết thúc không được để trống')
    .isISO8601()
    .withMessage('Thời gian kết thúc không hợp lệ')
    .custom((end_time, { req }) => {
      const start = new Date(req.body.start_time);
      const end = new Date(end_time);
      if (end <= start) {
        throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu');
      }
      return true;
    }),
];

// Routes - All routes require authentication
router.use(auth);

// Get all schedules (all roles, primarily for admins)
router.get('/', scheduleController.getAllSchedules);

// Get role-specific schedules (teachers: accepted assignments, students: approved registrations)
router.get('/my-schedules', scheduleController.getMySchedules);

// Get schedules by exam (all roles)
router.get('/exam/:exam_id', scheduleController.getSchedulesByExam);

// Check schedule conflict (all roles)
router.get('/check-conflict', scheduleController.checkScheduleConflict);

// Create new schedule (teacher, admin only)
router.post('/', authorize('teacher', 'admin'), scheduleValidation, scheduleController.createSchedule);

// Update schedule (teacher, admin only)
router.put('/:id', authorize('teacher', 'admin'), scheduleValidation, scheduleController.updateSchedule);

// Delete schedule (teacher, admin only)
router.delete('/:id', authorize('teacher', 'admin'), scheduleController.deleteSchedule);

module.exports = router;