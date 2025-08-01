const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');

const registrationController = {
  async registerForExam(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { exam_id } = req.body;
      const student_id = req.user.id;

      const [exams] = await pool.execute('SELECT id, name FROM exams WHERE id = ?', [exam_id]);
      if (exams.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
      }

      const [existingRegistrations] = await pool.execute(
        'SELECT id FROM exam_registrations WHERE student_id = ? AND exam_id = ? AND status IN ("pending", "approved")',
        [student_id, exam_id]
      );
      if (existingRegistrations.length > 0) {
        return res.status(400).json({ message: 'Bạn đã đăng ký kỳ thi này rồi' });
      }

      const registrationId = uuidv4();
      await pool.execute(
        'INSERT INTO exam_registrations (id, student_id, exam_id, status, registered_at) VALUES (?, ?, ?, ?, NOW())',
        [registrationId, student_id, exam_id, 'pending']
      );

      const [countResult] = await pool.execute(
        'SELECT COUNT(*) AS registration_count FROM exam_registrations WHERE exam_id = ? AND status IN ("pending", "approved")',
        [exam_id]
      );
      const updatedRegistrationCount = countResult[0].registration_count;

      const studentNotificationId = uuidv4();
      const notificationContent = `Đăng ký kỳ thi "${exams[0].name}" thành công. Vui lòng chờ xác nhận.`;
      await pool.execute(
        'INSERT INTO notifications (id, user_id, type, content, exam_id, created_at, is_read) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
        [studentNotificationId, student_id, 'registration', notificationContent, exam_id, 0]
      );

      if (req.io) {
        req.io.to(`user-${student_id}`).emit('notification-created', {
          id: studentNotificationId,
          user_id: student_id,
          type: 'registration',
          content: notificationContent,
          exam_id,
          created_at: new Date().toISOString(),
          is_read: false,
        });
        console.log(`Sent notification ${studentNotificationId} to user-${student_id}`);

        req.io.emit('exam-registration-count-updated', {
          examId: exam_id,
          newCount: updatedRegistrationCount,
          studentId: student_id,
        });
        console.log(`Emitted exam-registration-count-updated for exam ${exam_id}: new count ${updatedRegistrationCount}`);
      }

      res.status(201).json({
        message: 'Đăng ký kỳ thi thành công',
        registration: { id: registrationId, student_id, exam_id, status: 'pending' },
        exam_registration_count: updatedRegistrationCount,
      });
    } catch (error) {
      console.error('Lỗi đăng ký thi:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  },

  async cancelRegistration(req, res) {
    try {
      const { registration_id } = req.params;
      const student_id = req.user.id;

      const [registrations] = await pool.execute(
        'SELECT r.*, e.name AS exam_name FROM exam_registrations r JOIN exams e ON r.exam_id = e.id WHERE r.id = ? AND r.student_id = ? AND r.status IN ("pending", "approved")',
        [registration_id, student_id]
      );
      if (registrations.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy đăng ký hoạt động để hủy' });
      }

      const registration = registrations[0];
      const exam_id = registration.exam_id;

      await pool.execute(
        'UPDATE exam_registrations SET status = ? WHERE id = ?',
        ['cancelled', registration_id]
      );

      const [countResult] = await pool.execute(
        'SELECT COUNT(*) AS registration_count FROM exam_registrations WHERE exam_id = ? AND status IN ("pending", "approved")',
        [exam_id]
      );
      const updatedRegistrationCount = countResult[0].registration_count;

      const notificationContent = `Đã hủy đăng ký kỳ thi "${registration.exam_name}" thành công.`;
      const notificationId = uuidv4();
      await pool.execute(
        'INSERT INTO notifications (id, user_id, type, content, exam_id, created_at, is_read) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
        [notificationId, student_id, 'registration', notificationContent, exam_id, 0]
      );

      if (req.io) {
        req.io.to(`user-${student_id}`).emit('notification-created', {
          id: notificationId,
          user_id: student_id,
          type: 'registration',
          content: notificationContent,
          exam_id,
          created_at: new Date().toISOString(),
          is_read: false,
        });
        console.log(`Sent notification ${notificationId} to user-${student_id} for cancellation`);

        req.io.emit('exam-registration-count-updated', {
          examId: exam_id,
          newCount: updatedRegistrationCount,
          studentId: student_id,
        });
        console.log(`Emitted exam-registration-count-updated for exam ${exam_id}: new count ${updatedRegistrationCount}`);
      }

      res.json({ message: 'Hủy đăng ký thành công', exam_registration_count: updatedRegistrationCount });
    } catch (error) {
      console.error('Lỗi hủy đăng ký:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  },

  async getUserRegistrations(req, res) {
    try {
      const student_id = req.user.id;

      const [registrations] = await pool.execute(`
        SELECT r.id, r.exam_id, r.student_id, r.status, r.registered_at, r.rejection_reason,
               e.name AS exam_name, e.subject_code, e.subject_name,
               s.room, s.start_time, s.end_time
        FROM exam_registrations r
        LEFT JOIN exams e ON r.exam_id = e.id
        LEFT JOIN schedules s ON e.id = s.exam_id
        WHERE r.student_id = ?
        ORDER BY r.registered_at DESC
      `, [student_id]);

      res.json({ registrations });
    } catch (error) {
      console.error('Lỗi lấy danh sách đăng ký:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  },

  async confirmRegistration(req, res) {
    try {
      const { registration_id } = req.params;
      const { role, id: userId } = req.user;

      const [registrations] = await pool.execute(
        'SELECT r.*, e.name AS exam_name, e.id AS exam_id, e.created_by FROM exam_registrations r JOIN exams e ON r.exam_id = e.id WHERE r.id = ?',
        [registration_id]
      );
      if (registrations.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy đăng ký' });
      }
      const registration = registrations[0];

      if (role === 'teacher') {
        const [assignments] = await pool.execute(
          'SELECT id FROM exam_assignments WHERE exam_id = ? AND teacher_id = ? AND status = "accepted"',
          [registration.exam_id, userId]
        );
        if (assignments.length === 0 && registration.created_by !== userId) {
          return res.status(403).json({ message: 'Không có quyền xác nhận đăng ký này' });
        }
      }

      await pool.execute(
        'UPDATE exam_registrations SET status = ?, updated_at = NOW() WHERE id = ?',
        ['approved', registration_id]
      );

      const [countResult] = await pool.execute(
        'SELECT COUNT(*) AS registration_count FROM exam_registrations WHERE exam_id = ? AND status IN ("pending", "approved")',
        [registration.exam_id]
      );
      const updatedRegistrationCount = countResult[0].registration_count;

      const notificationContent = `Đăng ký kỳ thi "${registration.exam_name}" của bạn đã được xác nhận.`;
      const notificationId = uuidv4();
      await pool.execute(
        'INSERT INTO notifications (id, user_id, type, content, exam_id, created_at, is_read) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
        [notificationId, registration.student_id, 'registration', notificationContent, registration.exam_id, 0]
      );

      if (req.io) {
        req.io.to(`user-${registration.student_id}`).emit('notification-created', {
          id: notificationId,
          user_id: registration.student_id,
          type: 'registration',
          content: notificationContent,
          exam_id: registration.exam_id,
          created_at: new Date().toISOString(),
          is_read: false,
        });
        console.log(`Sent confirmation notification ${notificationId} to user-${registration.student_id}`);

        req.io.emit('exam-registration-count-updated', {
          examId: registration.exam_id,
          newCount: updatedRegistrationCount,
          studentId: registration.student_id,
          statusChange: 'approved',
        });
      }

      res.json({ message: 'Xác nhận đăng ký thành công', exam_registration_count: updatedRegistrationCount });
    } catch (error) {
      console.error('Lỗi xác nhận đăng ký:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  },

  async rejectRegistration(req, res) {
    try {
      const { registration_id } = req.params;
      const { rejection_reason } = req.body;
      const { role, id: userId } = req.user;

      const [registrations] = await pool.execute(
        'SELECT r.*, e.name AS exam_name, e.id AS exam_id, e.created_by FROM exam_registrations r JOIN exams e ON r.exam_id = e.id WHERE r.id = ?',
        [registration_id]
      );
      if (registrations.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy đăng ký' });
      }
      const registration = registrations[0];

      if (role === 'teacher') {
        const [assignments] = await pool.execute(
          'SELECT id FROM exam_assignments WHERE exam_id = ? AND teacher_id = ? AND status = "accepted"',
          [registration.exam_id, userId]
        );
        if (assignments.length === 0 && registration.created_by !== userId) {
          return res.status(403).json({ message: 'Không có quyền từ chối đăng ký này' });
        }
      }

      await pool.execute(
        'UPDATE exam_registrations SET status = ?, rejection_reason = ?, updated_at = NOW() WHERE id = ?',
        ['rejected', rejection_reason || null, registration_id]
      );

      const [countResult] = await pool.execute(
        'SELECT COUNT(*) AS registration_count FROM exam_registrations WHERE exam_id = ? AND status IN ("pending", "approved")',
        [registration.exam_id]
      );
      const updatedRegistrationCount = countResult[0].registration_count;

      const notificationContent = `Đăng ký kỳ thi "${registration.exam_name}" của bạn đã bị từ chối.${rejection_reason ? ` Lý do: ${rejection_reason}` : ''}`;
      const notificationId = uuidv4();
      await pool.execute(
        'INSERT INTO notifications (id, user_id, type, content, exam_id, created_at, is_read) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
        [notificationId, registration.student_id, 'registration', notificationContent, registration.exam_id, 0]
      );

      if (req.io) {
        req.io.to(`user-${registration.student_id}`).emit('notification-created', {
          id: notificationId,
          user_id: registration.student_id,
          type: 'registration',
          content: notificationContent,
          exam_id: registration.exam_id,
          created_at: new Date().toISOString(),
          is_read: false,
        });
        console.log(`Sent rejection notification ${notificationId} to user-${registration.student_id}`);

        req.io.emit('exam-registration-count-updated', {
          examId: registration.exam_id,
          newCount: updatedRegistrationCount,
          studentId: registration.student_id,
          statusChange: 'rejected',
        });
      }

      res.json({ message: 'Từ chối đăng ký thành công', exam_registration_count: updatedRegistrationCount });
    } catch (error) {
      console.error('Lỗi từ chối đăng ký:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  },

  async getExamRegistrations(req, res) {
    try {
      const { exam_id } = req.params;
      const { role, id: userId } = req.user;

      if (role === 'teacher') {
        const [assignments] = await pool.execute(
          'SELECT id FROM exam_assignments WHERE exam_id = ? AND teacher_id = ? AND status = "accepted"',
          [exam_id, userId]
        );
        const [exam] = await pool.execute(
          'SELECT id, created_by FROM exams WHERE id = ?',
          [exam_id]
        );
        if (assignments.length === 0 && (!exam[0] || exam[0].created_by !== userId)) {
          console.log(`Access denied for teacher ${userId} on exam ${exam_id}. Assignments: ${assignments.length}, Exam Creator: ${exam[0]?.created_by}`);
          return res.status(403).json({ message: 'Không có quyền xem đăng ký của kỳ thi này' });
        }
      }

      const [registrations] = await pool.execute(`
        SELECT r.id, r.exam_id, r.student_id, r.status, r.registered_at, r.rejection_reason,
               u.full_name AS student_name, u.email AS student_email
        FROM exam_registrations r
        LEFT JOIN users u ON r.student_id = u.id
        WHERE r.exam_id = ?
        ORDER BY r.registered_at
      `, [exam_id]);

      res.json({ registrations });
    } catch (error) {
      console.error('Lỗi lấy danh sách đăng ký kỳ thi:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  },
};

module.exports = registrationController;