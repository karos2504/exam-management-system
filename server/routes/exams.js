const express = require('express');
const { body } = require('express-validator');
const examController = require('../controllers/examController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const examValidation = [
  body('name').notEmpty().withMessage('Tên kỳ thi không được để trống'),
  body('subject').notEmpty().withMessage('Môn thi không được để trống')
];

// Routes - Tất cả routes đều cần xác thực
router.use(auth);

// Lấy danh sách kỳ thi (tất cả roles)
router.get('/', examController.getAllExams);

// Lấy thông tin chi tiết kỳ thi (tất cả roles)
router.get('/:id', examController.getExamById);

// Tạo kỳ thi mới (chỉ teacher, admin)
router.post('/', authorize('teacher', 'admin'), examValidation, examController.createExam);

// Cập nhật kỳ thi (chỉ người tạo hoặc admin)
router.put('/:id', authorize('teacher', 'admin'), examValidation, examController.updateExam);

// Xóa kỳ thi (chỉ người tạo hoặc admin)
router.delete('/:id', authorize('teacher', 'admin'), examController.deleteExam);

module.exports = router; 