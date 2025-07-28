const express = require('express');
const { body } = require('express-validator');
const registrationController = require('../controllers/registrationController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

const registrationValidation = [
  body('exam_id').isUUID().withMessage('ID kỳ thi không hợp lệ'),
];

router.use(auth);

// Student can register for an exam
router.post('/', authorize('student'), registrationValidation, registrationController.registerForExam);
// Student can cancel their registration
router.delete('/:registration_id', authorize('student'), registrationController.cancelRegistration); // CHANGED FROM :exam_id
// Student can view their own registrations
router.get('/my-registrations', authorize('student'), registrationController.getUserRegistrations);
// Teacher/Admin can view all registrations for a specific exam
router.get('/exam/:exam_id', authorize('teacher', 'admin'), registrationController.getExamRegistrations);
// Teacher/Admin can confirm a registration
router.put('/confirm/:registration_id', authorize('teacher', 'admin'), registrationController.confirmRegistration);
// Teacher/Admin can reject a registration
router.put('/reject/:registration_id', authorize('teacher', 'admin'), registrationController.rejectRegistration);

module.exports = router;