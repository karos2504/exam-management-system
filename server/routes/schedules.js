const express = require('express');
const { body } = require('express-validator');
const scheduleController = require('../controllers/scheduleController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const scheduleValidation = [
  body('exam_id').isInt().withMessage('ID kỳ thi không hợp lệ'),
  body('room').notEmpty().withMessage('Phòng thi không được để trống'),
  body('start_time').isISO8601().withMessage('Thời gian bắt đầu không hợp lệ'),
  body('end_time').isISO8601().withMessage('Thời gian kết thúc không hợp lệ')
];

// Routes - Tất cả routes đều cần xác thực
router.use(auth);

// Lấy danh sách lịch thi (tất cả roles)
router.get('/', scheduleController.getAllSchedules);

// Lấy lịch thi theo kỳ thi (tất cả roles)
router.get('/exam/:exam_id', scheduleController.getSchedulesByExam);

// Kiểm tra trùng lặp lịch thi (tất cả roles)
router.get('/check-conflict', scheduleController.checkScheduleConflict);

// Tạo lịch thi mới (chỉ teacher, admin)
router.post('/', authorize('teacher', 'admin'), scheduleValidation, scheduleController.createSchedule);

// Cập nhật lịch thi (chỉ teacher, admin)
router.put('/:id', authorize('teacher', 'admin'), scheduleValidation, scheduleController.updateSchedule);

// Xóa lịch thi (chỉ teacher, admin)
router.delete('/:id', authorize('teacher', 'admin'), scheduleController.deleteSchedule);

module.exports = router; 