const express = require('express');
const { body } = require('express-validator');
const registrationController = require('../controllers/registrationController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registrationValidation = [
  body('exam_id').isInt().withMessage('ID kỳ thi không hợp lệ')
];

// Routes - Tất cả routes đều cần xác thực
router.use(auth);

// Đăng ký thi (chỉ student)
router.post('/', authorize('student'), registrationValidation, registrationController.registerForExam);

// Hủy đăng ký thi (chỉ student)
router.delete('/:exam_id', authorize('student'), registrationController.cancelRegistration);

// Lấy danh sách đăng ký của người dùng (tất cả roles)
router.get('/my-registrations', registrationController.getUserRegistrations);

// Lấy danh sách đăng ký cho kỳ thi (chỉ teacher, admin)
router.get('/exam/:exam_id', authorize('teacher', 'admin'), registrationController.getExamRegistrations);

// Xác nhận đăng ký (chỉ teacher, admin)
router.put('/confirm/:registration_id', authorize('teacher', 'admin'), registrationController.confirmRegistration);

module.exports = router; 