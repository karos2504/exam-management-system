const express = require('express');
const { body, param } = require('express-validator');
const registrationController = require('../controllers/registrationController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

const registrationValidation = [
  body('exam_id').isUUID().withMessage('ID kỳ thi không hợp lệ'),
];

const rejectValidation = [
  body('rejection_reason').optional().isLength({ max: 255 }).withMessage('Lý do từ chối tối đa 255 ký tự'),
];

router.use(auth);

router.post('/', authorize('student'), registrationValidation, registrationController.registerForExam);
router.delete('/:registration_id', authorize('student'), param('registration_id').isUUID().withMessage('ID đăng ký không hợp lệ'), registrationController.cancelRegistration);
router.get('/my-registrations', authorize('student'), registrationController.getUserRegistrations);
router.get('/exam/:exam_id', authorize('teacher', 'admin'), param('exam_id').isUUID().withMessage('ID kỳ thi không hợp lệ'), registrationController.getExamRegistrations);
router.put('/confirm/:registration_id', authorize('teacher', 'admin'), param('registration_id').isUUID().withMessage('ID đăng ký không hợp lệ'), registrationController.confirmRegistration);
router.put('/reject/:registration_id', authorize('teacher', 'admin'), param('registration_id').isUUID().withMessage('ID đăng ký không hợp lệ'), rejectValidation, registrationController.rejectRegistration);

module.exports = router;