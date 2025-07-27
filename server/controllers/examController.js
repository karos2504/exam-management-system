const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid'); // Make sure you have 'uuid' installed: npm install uuid
const pool = require('../config/database'); // Your database connection pool

const examController = {
  async createExam(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { role, id: userId } = req.user || {};
      if (!['teacher', 'admin'].includes(role)) {
        return res.status(403).json({ message: 'Chỉ teacher hoặc admin được tạo kỳ thi' });
      }

      const {
        code, name, description, subject_code, subject_name,
        exam_type, semester, duration_minutes
      } = req.body;

      const [existing] = await pool.execute('SELECT id FROM exams WHERE code = ?', [code]);
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Mã kỳ thi đã tồn tại' });
      }

      const newId = uuidv4(); // Generates a standard string UUID (e.g., "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx")
      await pool.execute(
        `INSERT INTO exams (id, code, name, description, subject_code, subject_name,
           exam_type, semester, duration_minutes, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId, code, name, description || null,
          subject_code, subject_name, exam_type || null,
          semester || null, duration_minutes, userId
        ]
      );

      // Explicitly cast ID and created_by to CHAR(36) to ensure they are returned as strings
      const [createdExam] = await pool.execute(
        `SELECT CAST(id AS CHAR(36)) AS id, code, name, description, subject_code, subject_name,
           exam_type, semester, duration_minutes, CAST(created_by AS CHAR(36)) AS created_by, created_at
           FROM exams WHERE id = ?`,
        [newId]
      );

      if (req.io) {
        req.io.emit('exam-created', createdExam[0]);
        console.log('Emitted exam-created:', createdExam[0]);
      }

      res.status(201).json({
        message: 'Tạo kỳ thi thành công',
        exam: createdExam[0],
      });
    } catch (err) {
      console.error('Lỗi tạo kỳ thi:', err);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  async getAllExams(req, res) {
    try {
      const { role, id: userId } = req.user || {}; // userId should be a string UUID
      let query = `
         SELECT CAST(e.id AS CHAR(36)) AS id, e.code, e.name, e.description, e.subject_code, e.subject_name,
                e.exam_type, e.semester, e.duration_minutes, CAST(e.created_by AS CHAR(36)) AS created_by, e.created_at,
                u.full_name AS creator_name,
                COUNT(r.id) AS registration_count
         FROM exams e
         LEFT JOIN users u ON e.created_by = u.id
         LEFT JOIN exam_registrations r ON e.id = r.exam_id
      `;
      const params = [];

      // Logic to filter exams for teachers to only show those they are assigned and accepted for.
      if (role === 'teacher') {
        // Ensure that these joins and WHERE clauses handle UUIDs correctly based on DB type
        query += ` JOIN exam_assignments ea ON e.id = ea.exam_id
                   WHERE ea.teacher_id = ? AND ea.status = 'accepted' `;
        params.push(userId);
      }

      query += ` GROUP BY e.id ORDER BY e.created_at DESC`;

      const [exams] = await pool.execute(query, params);

      res.json({ exams });
    } catch (err) {
      console.error('Lỗi lấy danh sách kỳ thi:', err);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  async getExamById(req, res) {
    try {
      const { id } = req.params; // ID from URL is already a string UUID
      const { role, id: userId } = req.user || {}; // userId should be a string UUID

      // Cast all UUIDs to CHAR(36) in the SELECT statement
      const [exams] = await pool.execute(`
         SELECT CAST(e.id AS CHAR(36)) AS id, e.code, e.name, e.description, e.subject_code, e.subject_name,
                e.exam_type, e.semester, e.duration_minutes, CAST(e.created_by AS CHAR(36)) AS created_by, e.created_at,
                u.full_name AS creator_name
         FROM exams e
         LEFT JOIN users u ON e.created_by = u.id
         WHERE e.id = ?
      `, [id]);

      if (exams.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
      }

      // Teachers can only view exams they created or are assigned to and accepted
      // userId and exams[0].created_by should both be string UUIDs for comparison
      if (role === 'teacher' && exams[0].created_by !== userId) {
        const [assignments] = await pool.execute(
          `SELECT CAST(id AS CHAR(36)) AS id FROM exam_assignments WHERE exam_id = ? AND teacher_id = ? AND status = 'accepted'`,
          [id, userId]
        );
        if (assignments.length === 0) {
          return res.status(403).json({ message: 'Không có quyền truy cập kỳ thi này' });
        }
      }

      // Ensure all IDs are cast to CHAR(36) in subsequent SELECTs for related data
      const [schedules] = await pool.execute(
        `SELECT CAST(id AS CHAR(36)) AS id, CAST(exam_id AS CHAR(36)) AS exam_id, start_time, end_time, location, notes FROM schedules WHERE exam_id = ? ORDER BY start_time`,
        [id]
      );

      const [registrations] = await pool.execute(`
         SELECT CAST(r.id AS CHAR(36)) AS id, CAST(r.exam_id AS CHAR(36)) AS exam_id, CAST(r.student_id AS CHAR(36)) AS student_id, r.registered_at,
                u.full_name AS student_name, u.email AS student_email
         FROM exam_registrations r
         LEFT JOIN users u ON r.student_id = u.id
         WHERE r.exam_id = ?
         ORDER BY r.registered_at
      `, [id]);

      const [assignments] = await pool.execute(`
         SELECT CAST(ea.id AS CHAR(36)) AS id, CAST(ea.exam_id AS CHAR(36)) AS exam_id, CAST(ea.teacher_id AS CHAR(36)) AS teacher_id, CAST(ea.assigned_by AS CHAR(36)) AS assigned_by, ea.status, ea.notes, ea.assigned_at,
                u.full_name AS teacher_name, u.email AS teacher_email
         FROM exam_assignments ea
         LEFT JOIN users u ON ea.teacher_id = u.id
         WHERE ea.exam_id = ?
      `, [id]);

      res.json({
        exam: exams[0],
        schedules,
        registrations,
        assignments,
      });
    } catch (err) {
      console.error('Lỗi lấy thông tin kỳ thi:', err);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  async updateExam(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params; // ID from URL is already a string UUID
      const { code, name, description, subject_code, subject_name, exam_type, semester, duration_minutes } = req.body;

      // Cast ID and created_by to CHAR(36) when selecting to ensure proper string comparison
      const [exams] = await pool.execute('SELECT CAST(id AS CHAR(36)) AS id, code, CAST(created_by AS CHAR(36)) AS created_by FROM exams WHERE id = ?', [id]);
      if (exams.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
      }

      const exam = exams[0];
      const { role, id: userId } = req.user || {};
      if (exam.created_by !== userId && role !== 'admin') {
        return res.status(403).json({ message: 'Không có quyền sửa kỳ thi này' });
      }

      if (code !== exam.code) {
        const [exists] = await pool.execute(
          'SELECT id FROM exams WHERE code = ? AND id != ?', [code, id]
        );
        if (exists.length > 0) {
          return res.status(400).json({ message: 'Mã kỳ thi đã tồn tại' });
        }
      }

      await pool.execute(
        `UPDATE exams SET code = ?, name = ?, description = ?, subject_code = ?,
           subject_name = ?, exam_type = ?, semester = ?, duration_minutes = ?
           WHERE id = ?`,
        [code, name, description || null, subject_code, subject_name,
          exam_type || null, semester || null, duration_minutes, id]
      );

      // Cast ID and created_by to CHAR(36) when selecting updated exam
      const [updated] = await pool.execute(
        `SELECT CAST(id AS CHAR(36)) AS id, code, name, description, subject_code, subject_name,
           exam_type, semester, duration_minutes, CAST(created_by AS CHAR(36)) AS created_by, created_at FROM exams WHERE id = ?`,
        [id]
      );

      if (req.io) {
        req.io.emit('exam-updated', updated[0]);
        console.log('Emitted exam-updated:', updated[0]);
      }

      res.json({
        message: 'Cập nhật kỳ thi thành công',
        exam: updated[0],
      });
    } catch (err) {
      console.error('Lỗi cập nhật kỳ thi:', err);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  async deleteExam(req, res) {
    try {
      const { id } = req.params; // ID from URL is already a string UUID

      // Cast ID and created_by to CHAR(36) when selecting
      const [exams] = await pool.execute('SELECT CAST(id AS CHAR(36)) AS id, CAST(created_by AS CHAR(36)) AS created_by, name FROM exams WHERE id = ?', [id]);
      if (exams.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
      }

      const { role, id: userId } = req.user || {};
      if (exams[0].created_by !== userId && role !== 'admin') {
        return res.status(403).json({ message: 'Không có quyền xóa kỳ thi này' });
      }

      // Start a transaction for cascading deletes
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // Delete related data first due to foreign key constraints
        await connection.execute('DELETE FROM schedules WHERE exam_id = ?', [id]);
        await connection.execute('DELETE FROM exam_registrations WHERE exam_id = ?', [id]);
        await connection.execute('DELETE FROM exam_assignments WHERE exam_id = ?', [id]);
        await connection.execute('DELETE FROM exams WHERE id = ?', [id]);

        await connection.commit();
      } catch (transactionError) {
        await connection.rollback();
        throw transactionError; // Re-throw to be caught by the outer catch block
      } finally {
        connection.release();
      }

      if (req.io) {
        req.io.emit('exam-deleted', { id: id, name: exams[0].name });
        console.log('Emitted exam-deleted:', { id });
      }

      res.json({ message: 'Xóa kỳ thi thành công' });
    } catch (err) {
      console.error('Lỗi xóa kỳ thi:', err);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  async assignTeacher(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // exam_id and teacher_id should be string UUIDs from the frontend/validation
      const { exam_id, teacher_id, notes } = req.body;
      const { id: assigned_by } = req.user; // assigned_by should be a string UUID

      const [exams] = await pool.execute('SELECT id FROM exams WHERE id = ?', [exam_id]);
      if (exams.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
      }

      const [teachers] = await pool.execute('SELECT id FROM users WHERE id = ? AND role = "teacher"', [teacher_id]);
      if (teachers.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy giáo viên' });
      }

      const [existing] = await pool.execute(
        'SELECT id FROM exam_assignments WHERE exam_id = ? AND teacher_id = ?',
        [exam_id, teacher_id]
      );
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Giáo viên đã được phân công cho kỳ thi này' });
      }

      const assignmentId = uuidv4(); // Generate a valid UUID string
      await pool.execute(
        'INSERT INTO exam_assignments (id, exam_id, teacher_id, assigned_by, status, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [assignmentId, exam_id, teacher_id, assigned_by, 'assigned', notes || null]
      );

      const [exam] = await pool.execute('SELECT name FROM exams WHERE id = ?', [exam_id]);
      const notificationId = uuidv4(); // Generate a valid UUID string
      await pool.execute(
        'INSERT INTO notifications (id, user_id, type, content, exam_id, created_at, is_read) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
        [notificationId, teacher_id, 'assignment', `Bạn được phân công phụ trách kỳ thi "${exam[0].name}".`, exam_id, 0] // 0 for false
      );

      if (req.io) {
        const notification = {
          id: notificationId,
          user_id: teacher_id,
          type: 'assignment',
          content: `Bạn được phân công phụ trách kỳ thi "${exam[0].name}".`,
          exam_id,
          created_at: new Date().toISOString(), // Use current time for consistency
          is_read: false,
        };
        req.io.to(`user-${teacher_id}`).emit('notification-created', notification);
        console.log(`Sent notification ${notification.id} to user-${teacher_id}`);
      }

      res.status(201).json({ message: 'Phân công giáo viên thành công', assignmentId });
    } catch (err) {
      console.error('Lỗi phân công giáo viên:', err);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  async acceptAssignment(req, res) {
    try {
      const { assignment_id } = req.params; // ID from URL is already a string UUID
      const { id: teacher_id } = req.user; // teacher_id should be a string UUID

      // Cast all UUIDs to CHAR(36) when selecting
      const [assignments] = await pool.execute(
        'SELECT CAST(id AS CHAR(36)) AS id, CAST(exam_id AS CHAR(36)) AS exam_id, CAST(teacher_id AS CHAR(36)) AS teacher_id, CAST(assigned_by AS CHAR(36)) AS assigned_by, status FROM exam_assignments WHERE id = ? AND teacher_id = ?',
        [assignment_id, teacher_id]
      );
      if (assignments.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy phân công' });
      }

      if (assignments[0].status === 'accepted') {
        return res.status(400).json({ message: 'Phân công đã được chấp nhận trước đó' });
      }

      await pool.execute(
        'UPDATE exam_assignments SET status = ? WHERE id = ?',
        ['accepted', assignment_id]
      );

      const [exam] = await pool.execute(
        'SELECT name FROM exams WHERE id = ?',
        [assignments[0].exam_id]
      );

      const notificationId = uuidv4(); // Generate a valid UUID string
      await pool.execute(
        'INSERT INTO notifications (id, user_id, type, content, exam_id, created_at, is_read) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
        [notificationId, teacher_id, 'assignment_status', `Bạn đã chấp nhận phân công kỳ thi "${exam[0].name}".`, assignments[0].exam_id, 0]
      );

      if (req.io) {
        const notification = {
          id: notificationId,
          user_id: teacher_id,
          type: 'assignment_status',
          content: `Bạn đã chấp nhận phân công kỳ thi "${exam[0].name}".`,
          exam_id: assignments[0].exam_id,
          created_at: new Date().toISOString(),
          is_read: false,
        };
        req.io.to(`user-${teacher_id}`).emit('notification-created', notification);
        console.log(`Sent notification ${notification.id} to user-${teacher_id}`);

        // Notify the admin who assigned this
        const [adminUser] = await pool.execute('SELECT CAST(id AS CHAR(36)) AS id FROM users WHERE id = ? AND role = "admin"', [assignments[0].assigned_by]);
        if (adminUser.length > 0) {
          const adminNotificationId = uuidv4(); // Generate a valid UUID string
          const adminNotification = {
            id: adminNotificationId,
            user_id: assignments[0].assigned_by,
            type: 'assignment_status',
            content: `Giáo viên đã chấp nhận phân công kỳ thi "${exam[0].name}".`,
            exam_id: assignments[0].exam_id,
            created_at: new Date().toISOString(),
            is_read: false,
          };
          await pool.execute(
            'INSERT INTO notifications (id, user_id, type, content, exam_id, created_at, is_read) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
            [adminNotificationId, assignments[0].assigned_by, 'assignment_status', `Giáo viên đã chấp nhận phân công kỳ thi "${exam[0].name}".`, assignments[0].exam_id, 0]
          );
          req.io.to(`user-${assignments[0].assigned_by}`).emit('notification-created', adminNotification);
          console.log(`Sent notification ${adminNotification.id} to admin user-${assignments[0].assigned_by}`);
        }
      }

      res.json({ message: 'Chấp nhận phân công thành công' });
    } catch (err) {
      console.error('Lỗi chấp nhận phân công:', err);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  async declineAssignment(req, res) {
    try {
      const { assignment_id } = req.params; // ID from URL is already a string UUID
      const { id: teacher_id } = req.user; // teacher_id should be a string UUID

      // Cast all UUIDs to CHAR(36) when selecting
      const [assignments] = await pool.execute(
        'SELECT CAST(id AS CHAR(36)) AS id, CAST(exam_id AS CHAR(36)) AS exam_id, CAST(teacher_id AS CHAR(36)) AS teacher_id, CAST(assigned_by AS CHAR(36)) AS assigned_by, status FROM exam_assignments WHERE id = ? AND teacher_id = ?',
        [assignment_id, teacher_id]
      );
      if (assignments.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy phân công' });
      }

      if (assignments[0].status === 'declined') {
        return res.status(400).json({ message: 'Phân công đã bị từ chối trước đó' });
      }

      await pool.execute(
        'UPDATE exam_assignments SET status = ? WHERE id = ?',
        ['declined', assignment_id]
      );

      const [exam] = await pool.execute(
        'SELECT name FROM exams WHERE id = ?',
        [assignments[0].exam_id]
      );

      const notificationId = uuidv4(); // Generate a valid UUID string
      await pool.execute(
        'INSERT INTO notifications (id, user_id, type, content, exam_id, created_at, is_read) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
        [notificationId, teacher_id, 'assignment_status', `Bạn đã từ chối phân công kỳ thi "${exam[0].name}".`, assignments[0].exam_id, 0]
      );

      if (req.io) {
        const notification = {
          id: notificationId,
          user_id: teacher_id,
          type: 'assignment_status',
          content: `Bạn đã từ chối phân công kỳ thi "${exam[0].name}".`,
          exam_id: assignments[0].exam_id,
          created_at: new Date().toISOString(),
          is_read: false,
        };
        req.io.to(`user-${teacher_id}`).emit('notification-created', notification);
        console.log(`Sent notification ${notification.id} to user-${teacher_id}`);

        // Notify the admin who assigned this
        const [adminUser] = await pool.execute('SELECT CAST(id AS CHAR(36)) AS id FROM users WHERE id = ? AND role = "admin"', [assignments[0].assigned_by]);
        if (adminUser.length > 0) {
          const adminNotificationId = uuidv4(); // Generate a valid UUID string
          const adminNotification = {
            id: adminNotificationId,
            user_id: assignments[0].assigned_by,
            type: 'assignment_status',
            content: `Giáo viên đã từ chối phân công kỳ thi "${exam[0].name}".`,
            exam_id: assignments[0].exam_id,
            created_at: new Date().toISOString(),
            is_read: false,
          };
          await pool.execute(
            'INSERT INTO notifications (id, user_id, type, content, exam_id, created_at, is_read) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
            [adminNotificationId, assignments[0].assigned_by, 'assignment_status', `Giáo viên đã từ chối phân công kỳ thi "${exam[0].name}".`, assignments[0].exam_id, 0]
          );
          req.io.to(`user-${assignments[0].assigned_by}`).emit('notification-created', adminNotification);
          console.log(`Sent notification ${adminNotification.id} to admin user-${assignments[0].assigned_by}`);
        }
      }

      res.json({ message: 'Từ chối phân công thành công' });
    } catch (err) {
      console.error('Lỗi từ chối phân công:', err);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },
};

module.exports = examController;