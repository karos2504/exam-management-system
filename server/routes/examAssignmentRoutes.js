const express = require('express');
const { body, param } = require('express-validator');
const assignmentController = require('../controllers/examAssignmentController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

const assignmentValidation = [
    body('exam_id').isUUID().withMessage('ID kỳ thi không hợp lệ'),
    body('teacher_id').isUUID().withMessage('ID giáo viên không hợp lệ'),
    body('notes').optional().isLength({ max: 1000 }).withMessage('Ghi chú tối đa 1000 ký tự'),
];

router.use(auth);

router.get('/', authorize('admin'), assignmentController.getAllAssignments);
router.get('/my-assignments', authorize('teacher'), assignmentController.getMyAssignments);
router.get('/:id', authorize('admin'), param('id').isUUID().withMessage('ID phân công không hợp lệ'), assignmentController.getAssignmentById);
router.post('/', authorize('admin'), assignmentValidation, assignmentController.createAssignment);
router.put('/:id', authorize('admin'), param('id').isUUID().withMessage('ID phân công không hợp lệ'), assignmentValidation, assignmentController.updateAssignment);
router.delete('/:id', authorize('admin'), param('id').isUUID().withMessage('ID phân công không hợp lệ'), assignmentController.deleteAssignment);
router.get('/available/teachers', authorize('admin'), assignmentController.getAvailableTeachers);
router.put('/assign/:assignment_id/accept', authorize('teacher'), param('assignment_id').isUUID().withMessage('ID phân công không hợp lệ'), assignmentController.acceptAssignment);
router.put('/assign/:assignment_id/decline', authorize('teacher'), param('assignment_id').isUUID().withMessage('ID phân công không hợp lệ'), assignmentController.declineAssignment);

module.exports = router;