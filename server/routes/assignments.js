const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/examAssignmentController');
const { auth, authorize } = require('../middleware/auth');

router.use(auth, authorize('admin'));

router.get('/', assignmentController.getAllAssignments);
router.get('/:id', assignmentController.getAssignmentById);
router.post('/', assignmentController.createAssignment);
router.put('/:id', assignmentController.updateAssignment);
router.delete('/:id', assignmentController.deleteAssignment);
router.get('/available/teachers', assignmentController.getAvailableTeachers);

module.exports = router; 