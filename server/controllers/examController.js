const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');

const examController = {
  async getAllExams(req, res) {
    try {
      const { role, id: userId } = req.user || {};
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

      if (role === 'teacher') {
        query += ` WHERE e.created_by = ? OR e.id IN (
          SELECT exam_id FROM exam_assignments WHERE teacher_id = ? AND status = 'accepted'
        )`;
        params.push(userId, userId);
      } else if (role === 'student') {
        // Students may have restricted visibility (add logic if needed)
      } else if (role !== 'admin') {
        return res.status(403).json({ message: 'Vai trò không hợp lệ' });
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
      const { id } = req.params;
      const { role, id: userId } = req.user || {};

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

      if (role === 'teacher' && exams[0].created_by !== userId) {
        const [assignments] = await pool.execute(
          `SELECT CAST(id AS CHAR(36)) AS id FROM exam_assignments WHERE exam_id = ? AND teacher_id = ? AND status = 'accepted'`,
          [id, userId]
        );
        if (assignments.length === 0) {
          return res.status(403).json({ message: 'Không có quyền truy cập kỳ thi này' });
        }
      }

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

  async createExam(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { code, name, description, subject_code, subject_name, exam_type, semester, duration_minutes } = req.body;
      const { id: created_by } = req.user;
      const id = uuidv4();

      const [exists] = await pool.execute('SELECT id FROM exams WHERE code = ?', [code]);
      if (exists.length > 0) {
        return res.status(400).json({ message: 'Mã kỳ thi đã tồn tại' });
      }

      await pool.execute(
        `INSERT INTO exams (id, code, name, description, subject_code, subject_name, exam_type, semester, duration_minutes, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [id, code, name, description || null, subject_code, subject_name, exam_type || null, semester || null, duration_minutes, created_by]
      );

      const [newExam] = await pool.execute(
        `SELECT CAST(id AS CHAR(36)) AS id, code, name, description, subject_code, subject_name,
           exam_type, semester, duration_minutes, CAST(created_by AS CHAR(36)) AS created_by, created_at
         FROM exams WHERE id = ?`,
        [id]
      );

      if (req.io) {
        req.io.emit('exam-created', newExam[0]);
        console.log('Emitted exam-created:', newExam[0]);
      }

      res.status(201).json({ message: 'Tạo kỳ thi thành công', exam: newExam[0] });
    } catch (err) {
      console.error('Lỗi tạo kỳ thi:', err);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  async updateExam(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { code, name, description, subject_code, subject_name, exam_type, semester, duration_minutes } = req.body;

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
      const { id } = req.params;

      const [exams] = await pool.execute('SELECT CAST(id AS CHAR(36)) AS id, CAST(created_by AS CHAR(36)) AS created_by, name FROM exams WHERE id = ?', [id]);
      if (exams.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
      }

      const { role, id: userId } = req.user || {};
      if (exams[0].created_by !== userId && role !== 'admin') {
        return res.status(403).json({ message: 'Không có quyền xóa kỳ thi này' });
      }

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        await connection.execute('DELETE FROM schedules WHERE exam_id = ?', [id]);
        await connection.execute('DELETE FROM exam_registrations WHERE exam_id = ?', [id]);
        await connection.execute('DELETE FROM exam_assignments WHERE exam_id = ?', [id]);
        await connection.execute('DELETE FROM exams WHERE id = ?', [id]);

        await connection.commit();
      } catch (transactionError) {
        await connection.rollback();
        throw transactionError;
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

      const { exam_id, teacher_id, status } = req.body;
      const { id: assigned_by } = req.user;
      const id = uuidv4();

      const [exams] = await pool.execute('SELECT id, name FROM exams WHERE id = ?', [exam_id]);
      if (exams.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
      }

      const [teachers] = await pool.execute('SELECT id FROM users WHERE id = ? AND role = "teacher"', [teacher_id]);
      if (teachers.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy giáo viên' });
      }

      const [existingAssignment] = await pool.execute(
        'SELECT id FROM exam_assignments WHERE exam_id = ? AND teacher_id = ?',
        [exam_id, teacher_id]
      );
      if (existingAssignment.length > 0) {
        return res.status(400).json({ message: 'Giáo viên đã được phân công cho kỳ thi này' });
      }

      await pool.execute(
        'INSERT INTO exam_assignments (id, exam_id, teacher_id, assigned_by, status, assigned_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [id, exam_id, teacher_id, assigned_by, status || 'assigned']
      );

      const notificationId = uuidv4();
      const notificationContent = `Bạn được phân công phụ trách kỳ thi ${exams[0].name}.`;
      await pool.execute(
        'INSERT INTO notifications (id, user_id, type, content, exam_id, created_at, is_read) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
        [notificationId, teacher_id, 'assignment', notificationContent, exam_id, 0]
      );

      if (req.io) {
        req.io.to(`user-${teacher_id}`).emit('notification-created', {
          id: notificationId,
          user_id: teacher_id,
          type: 'assignment',
          content: notificationContent,
          exam_id,
          created_at: new Date().toISOString(),
          is_read: false,
        });
      }

      res.status(201).json({ message: 'Phân công giáo viên thành công', assignment: { id, exam_id, teacher_id, status } });
    } catch (err) {
      console.error('Lỗi phân công giáo viên:', err);
      res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
  }
};

module.exports = examController;