const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');

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

      const [existing] = await pool.execute(
        'SELECT id FROM exams WHERE code = ?', [code]
      );
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Mã kỳ thi đã tồn tại' });
      }

      const newId = uuidv4();
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

      const [createdExam] = await pool.execute(
        'SELECT * FROM exams WHERE id = ?', [newId]
      );

      // ⚡ TODO: nếu bạn có io => io.emit('examUpdate', createdExam[0]);

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
      const [exams] = await pool.execute(`
        SELECT e.id, e.code, e.name, e.description, e.subject_code, e.subject_name, 
               e.exam_type, e.semester, e.duration_minutes, e.created_by, e.created_at,
               u.full_name AS creator_name,
               COUNT(r.id) AS registration_count
        FROM exams e
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN exam_registrations r ON e.id = r.exam_id
        GROUP BY e.id
        ORDER BY e.created_at DESC
      `);

      res.json({ exams });

    } catch (err) {
      console.error('Lỗi lấy danh sách kỳ thi:', err);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  async getExamById(req, res) {
    try {
      const { id } = req.params;

      const [exams] = await pool.execute(`
        SELECT e.*, u.full_name AS creator_name
        FROM exams e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.id = ?
      `, [id]);

      if (exams.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
      }

      const [schedules] = await pool.execute(
        `SELECT * FROM schedules WHERE exam_id = ? ORDER BY start_time`,
        [id]
      );

      const [registrations] = await pool.execute(`
        SELECT r.*, u.full_name AS student_name, u.email AS student_email
        FROM exam_registrations r
        LEFT JOIN users u ON r.student_id = u.id
        WHERE r.exam_id = ?
        ORDER BY r.registered_at
      `, [id]);

      res.json({
        exam: exams[0],
        schedules,
        registrations,
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

      const { id } = req.params;
      const { code, name, description, subject_code, subject_name, exam_type, semester, duration_minutes } = req.body;

      const [exams] = await pool.execute(
        'SELECT * FROM exams WHERE id = ?', [id]
      );
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

      const [updated] = await pool.execute('SELECT * FROM exams WHERE id = ?', [id]);

      // ⚡ TODO: nếu có io => io.emit('examUpdate', updated[0]);

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

      const [exams] = await pool.execute(
        'SELECT * FROM exams WHERE id = ?', [id]
      );
      if (exams.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
      }

      const { role, id: userId } = req.user || {};
      if (exams[0].created_by !== userId && role !== 'admin') {
        return res.status(403).json({ message: 'Không có quyền xóa kỳ thi này' });
      }

      // 🗑️ Xoá liên quan:
      await pool.execute('DELETE FROM schedules WHERE exam_id = ?', [id]);
      await pool.execute('DELETE FROM exam_registrations WHERE exam_id = ?', [id]);
      await pool.execute('DELETE FROM exams WHERE id = ?', [id]);

      // ⚡ TODO: nếu có io => io.emit('examDeleted', { id });

      res.json({ message: 'Xóa kỳ thi thành công' });

    } catch (err) {
      console.error('Lỗi xóa kỳ thi:', err);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },
};

module.exports = examController;
