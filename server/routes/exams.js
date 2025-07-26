const express = require('express');
const { body } = require('express-validator');
const examController = require('../controllers/examController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const examValidation = [
  body('code')
    .notEmpty()
    .withMessage('Mã kỳ thi không được để trống')
    .isLength({ max: 20 })
    .withMessage('Mã kỳ thi tối đa 20 ký tự'),
  body('name')
    .notEmpty()
    .withMessage('Tên kỳ thi không được để trống')
    .isLength({ max: 100 })
    .withMessage('Tên kỳ thi tối đa 100 ký tự'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Mô tả tối đa 1000 ký tự'),
  body('subject_code')
    .notEmpty()
    .withMessage('Mã học phần không được để trống')
    .isLength({ max: 20 })
    .withMessage('Mã học phần tối đa 20 ký tự'),
  body('subject_name')
    .notEmpty()
    .withMessage('Tên học phần không được để trống')
    .isLength({ max: 100 })
    .withMessage('Tên học phần tối đa 100 ký tự'),
  body('exam_type')
    .optional()
    .isIn(['Trắc nghiệm', 'Tự luận', 'Trắc nghiệm + Tự luận'])
    .withMessage('Hình thức thi không hợp lệ'),
  body('semester')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Học kỳ tối đa 20 ký tự'),
  body('duration_minutes')
    .notEmpty()
    .withMessage('Thời gian thi không được để trống')
    .isInt({ min: 1 })
    .withMessage('Thời gian thi phải là số nguyên dương'),
];

// Routes - All routes require authentication
router.use(auth);

// Get all exams (all roles)
router.get('/', examController.getAllExams);

// Get exam by ID (all roles)
router.get('/:id', examController.getExamById);

// Create new exam (teacher, admin only)
router.post('/', authorize('teacher', 'admin'), examValidation, examController.createExam);

// Update exam (creator or admin only)
router.put('/:id', authorize('teacher', 'admin'), examValidation, examController.updateExam);

// Delete exam (creator or admin only)
router.delete('/:id', authorize('teacher', 'admin'), examController.deleteExam);

module.exports = router;