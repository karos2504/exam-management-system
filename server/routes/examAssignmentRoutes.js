const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/examAssignmentController'); // Đảm bảo đúng đường dẫn
const { auth, authorize } = require('../middleware/auth'); // Đảm bảo đúng đường dẫn

router.get('/', auth, authorize('admin'), assignmentController.getAllAssignments);
router.get('/:id', auth, authorize('admin'), assignmentController.getAssignmentById);
router.post('/', auth, authorize('admin'), assignmentController.createAssignment);
router.put('/:id', auth, authorize('admin'), assignmentController.updateAssignment);
router.delete('/:id', auth, authorize('admin'), assignmentController.deleteAssignment);
router.get('/available/teachers', auth, authorize('admin'), assignmentController.getAvailableTeachers);

module.exports = router;