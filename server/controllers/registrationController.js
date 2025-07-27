const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database'); // Make sure this path is correct

const registrationController = {
  async registerForExam(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { exam_id } = req.body;
      const student_id = req.user.id; // Assuming user ID is available from auth middleware

      // 1. Check if exam exists
      const [exams] = await pool.execute('SELECT * FROM exams WHERE id = ?', [exam_id]);
      if (exams.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
      }

      // 2. Check for existing registration for this student and exam
      const [existingRegistrations] = await pool.execute(
        'SELECT * FROM exam_registrations WHERE student_id = ? AND exam_id = ? AND status IN ("pending", "approved")',
        [student_id, exam_id]
      );
      if (existingRegistrations.length > 0) {
        return res.status(400).json({ message: 'Bạn đã đăng ký kỳ thi này rồi' });
      }

      // 3. Insert new registration
      const registrationId = uuidv4();
      await pool.execute(
        'INSERT INTO exam_registrations (id, student_id, exam_id, status) VALUES (?, ?, ?, ?)',
        [registrationId, student_id, exam_id, 'pending'] // Set initial status to pending
      );

      // 4. Update exam's registration count (if you have a count column in exams table)
      // Or simply count from exam_registrations
      // This is a simplified example; in a real app, you might have a trigger or a more robust counter.
      const [countResult] = await pool.execute(
        'SELECT COUNT(*) AS registration_count FROM exam_registrations WHERE exam_id = ? AND status IN ("pending", "approved")',
        [exam_id]
      );
      const updatedRegistrationCount = countResult[0].registration_count;

      // 5. Create notification for the student
      const studentNotificationId = uuidv4();
      const notificationContent = `Đăng ký kỳ thi "${exams[0].name}" thành công. Vui lòng chờ xác nhận.`;
      await pool.execute(
        'INSERT INTO notifications (id, user_id, type, content, exam_id) VALUES (?, ?, ?, ?, ?)',
        [studentNotificationId, student_id, 'registration', notificationContent, exam_id]
      );

      // 6. Emit Socket.IO events
      if (req.io) {
        // Notify the specific student about their registration status
        req.io.to(`user-${student_id}`).emit('notification-created', {
          id: studentNotificationId,
          user_id: student_id,
          type: 'registration',
          content: notificationContent,
          exam_id: exam_id,
          created_at: new Date().toISOString(),
          is_read: false,
        });
        console.log(`Sent notification ${studentNotificationId} to user-${student_id}`);

        // Broadcast the updated registration count to all relevant clients
        req.io.emit('exam-registration-count-updated', {
          examId: exam_id,
          newCount: updatedRegistrationCount,
          studentId: student_id, // Optional: for debugging or specific UI logic
        });
        console.log(`Emitted exam-registration-count-updated for exam ${exam_id}: new count ${updatedRegistrationCount}`);
      }

      // 7. Send API response
      res.status(201).json({
        message: 'Đăng ký kỳ thi thành công',
        registration: {
          id: registrationId,
          student_id,
          exam_id,
          status: 'pending',
        },
        // Optionally, you can return the updated count here as well
        exam_registration_count: updatedRegistrationCount
      });

    } catch (error) {
      console.error('Lỗi đăng ký thi:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  async cancelRegistration(req, res) {
    try {
      const { exam_id } = req.params;
      const student_id = req.user.id;

      const [registrations] = await pool.execute(
        'SELECT * FROM exam_registrations WHERE student_id = ? AND exam_id = ? AND status IN ("pending", "approved")',
        [student_id, exam_id]
      );
      if (registrations.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy đăng ký hoạt động để hủy' });
      }

      await pool.execute(
        'UPDATE exam_registrations SET status = ? WHERE student_id = ? AND exam_id = ?',
        ['cancelled', student_id, exam_id]
      );

      // Recalculate count after cancellation
      const [countResult] = await pool.execute(
        'SELECT COUNT(*) AS registration_count FROM exam_registrations WHERE exam_id = ? AND status IN ("pending", "approved")',
        [exam_id]
      );
      const updatedRegistrationCount = countResult[0].registration_count;

      const [exam] = await pool.execute('SELECT name FROM exams WHERE id = ?', [exam_id]);
      const notificationContent = `Đã hủy đăng ký kỳ thi "${exam[0].name}" thành công.`;
      await pool.execute(
        'INSERT INTO notifications (id, user_id, type, content, exam_id) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), student_id, 'registration', notificationContent, exam_id]
      );

      if (req.io) {
        req.io.to(`user-${student_id}`).emit('notification-created', {
          id: uuidv4(),
          user_id: student_id,
          type: 'registration',
          content: notificationContent,
          exam_id: exam_id,
          created_at: new Date().toISOString(),
          is_read: false,
        });
        console.log(`Sent notification to user-${student_id} for cancellation`);

        // Broadcast the updated registration count after cancellation
        req.io.emit('exam-registration-count-updated', {
          examId: exam_id,
          newCount: updatedRegistrationCount,
          studentId: student_id,
        });
        console.log(`Emitted exam-registration-count-updated for exam ${exam_id} after cancellation: new count ${updatedRegistrationCount}`);
      }

      res.json({ message: 'Hủy đăng ký thành công', exam_registration_count: updatedRegistrationCount });
    } catch (error) {
      console.error('Lỗi hủy đăng ký:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  async getUserRegistrations(req, res) {
    try {
      const student_id = req.user.id;

      const [registrations] = await pool.execute(`
        SELECT r.*, e.name AS exam_name, e.subject_code, e.subject_name, s.room, s.start_time, s.end_time
        FROM exam_registrations r
        LEFT JOIN exams e ON r.exam_id = e.id
        LEFT JOIN schedules s ON e.id = s.exam_id -- Assuming schedules are linked to exams
        WHERE r.student_id = ? AND r.status IN ('pending', 'approved')
        ORDER BY r.registered_at DESC
      `, [student_id]);

      if (registrations.length === 0) {
        return res.json({ registrations: [], message: 'Bạn chưa đăng ký kỳ thi nào.' });
      }

      res.json({ registrations });
    } catch (error) {
      console.error('Lỗi lấy danh sách đăng ký:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  async confirmRegistration(req, res) {
    try {
      const { registration_id } = req.params;
      const { role, id: userId } = req.user;

      const [registrations] = await pool.execute(
        'SELECT r.*, e.name AS exam_name, e.id AS exam_id FROM exam_registrations r JOIN exams e ON r.exam_id = e.id WHERE r.id = ?',
        [registration_id]
      );
      if (registrations.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy đăng ký' });
      }
      const registration = registrations[0];

      // Authorization check for teacher
      if (role === 'teacher') {
        const [assignments] = await pool.execute(
          'SELECT * FROM exam_assignments WHERE exam_id = ? AND teacher_id = ? AND status = "accepted"',
          [registration.exam_id, userId]
        );
        if (assignments.length === 0) {
          return res.status(403).json({ message: 'Không có quyền xác nhận đăng ký này' });
        }
      }

      await pool.execute(
        'UPDATE exam_registrations SET status = ? WHERE id = ?',
        ['approved', registration_id]
      );

      // Recalculate count after approval
      const [countResult] = await pool.execute(
        'SELECT COUNT(*) AS registration_count FROM exam_registrations WHERE exam_id = ? AND status IN ("pending", "approved")',
        [registration.exam_id]
      );
      const updatedRegistrationCount = countResult[0].registration_count;


      const notificationContent = `Đăng ký kỳ thi "${registration.exam_name}" của bạn đã được xác nhận.`;
      await pool.execute(
        'INSERT INTO notifications (id, user_id, type, content, exam_id) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), registration.student_id, 'registration', notificationContent, registration.exam_id]
      );

      if (req.io) {
        req.io.to(`user-${registration.student_id}`).emit('notification-created', {
          id: uuidv4(),
          user_id: registration.student_id,
          type: 'registration',
          content: notificationContent,
          exam_id: registration.exam_id,
          created_at: new Date().toISOString(),
          is_read: false,
        });
        console.log(`Sent confirmation notification to user-${registration.student_id}`);

        // Broadcast updated count after approval
        req.io.emit('exam-registration-count-updated', {
          examId: registration.exam_id,
          newCount: updatedRegistrationCount,
          studentId: registration.student_id, // Inform who was confirmed
          statusChange: 'approved'
        });
      }

      res.json({ message: 'Xác nhận đăng ký thành công', exam_registration_count: updatedRegistrationCount });
    } catch (error) {
      console.error('Lỗi xác nhận đăng ký:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  async rejectRegistration(req, res) {
    try {
      const { registration_id } = req.params;
      const { role, id: userId } = req.user;

      const [registrations] = await pool.execute(
        'SELECT r.*, e.name AS exam_name, e.id AS exam_id FROM exam_registrations r JOIN exams e ON r.exam_id = e.id WHERE r.id = ?',
        [registration_id]
      );
      if (registrations.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy đăng ký' });
      }
      const registration = registrations[0];

      // Authorization check for teacher
      if (role === 'teacher') {
        const [assignments] = await pool.execute(
          'SELECT * FROM exam_assignments WHERE exam_id = ? AND teacher_id = ? AND status = "accepted"',
          [registration.exam_id, userId]
        );
        if (assignments.length === 0) {
          return res.status(403).json({ message: 'Không có quyền từ chối đăng ký này' });
        }
      }

      await pool.execute(
        'UPDATE exam_registrations SET status = ? WHERE id = ?',
        ['rejected', registration_id]
      );

      // Recalculate count after rejection
      const [countResult] = await pool.execute(
        'SELECT COUNT(*) AS registration_count FROM exam_registrations WHERE exam_id = ? AND status IN ("pending", "approved")',
        [registration.exam_id]
      );
      const updatedRegistrationCount = countResult[0].registration_count;

      const notificationContent = `Đăng ký kỳ thi "${registration.exam_name}" của bạn đã bị từ chối.`;
      await pool.execute(
        'INSERT INTO notifications (id, user_id, type, content, exam_id) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), registration.student_id, 'registration', notificationContent, registration.exam_id]
      );

      if (req.io) {
        req.io.to(`user-${registration.student_id}`).emit('notification-created', {
          id: uuidv4(),
          user_id: registration.student_id,
          type: 'registration',
          content: notificationContent,
          exam_id: registration.exam_id,
          created_at: new Date().toISOString(),
          is_read: false,
        });
        console.log(`Sent rejection notification to user-${registration.student_id}`);

        // Broadcast updated count after rejection
        req.io.emit('exam-registration-count-updated', {
          examId: registration.exam_id,
          newCount: updatedRegistrationCount,
          studentId: registration.student_id, // Inform who was rejected
          statusChange: 'rejected'
        });
      }

      res.json({ message: 'Từ chối đăng ký thành công', exam_registration_count: updatedRegistrationCount });
    } catch (error) {
      console.error('Lỗi từ chối đăng ký:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  async getExamRegistrations(req, res) {
    try {
      const { exam_id } = req.params;
      const { role, id: userId } = req.user;

      if (role === 'teacher') {
        const [assignments] = await pool.execute(
          'SELECT * FROM exam_assignments WHERE exam_id = ? AND teacher_id = ? AND status = "accepted"',
          [exam_id, userId]
        );
        if (assignments.length === 0) {
          return res.status(403).json({ message: 'Không có quyền xem đăng ký của kỳ thi này' });
        }
      }

      const [registrations] = await pool.execute(`
        SELECT r.*, u.full_name AS student_name, u.email AS student_email
        FROM exam_registrations r
        LEFT JOIN users u ON r.student_id = u.id
        WHERE r.exam_id = ?
        ORDER BY r.registered_at
      `, [exam_id]);

      res.json({ registrations });
    } catch (error) {
      console.error('Lỗi lấy danh sách đăng ký kỳ thi:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },
};

module.exports = registrationController;