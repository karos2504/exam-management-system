const { validationResult } = require('express-validator');
const pool = require('../config/database');

const examController = {
  // Tạo kỳ thi mới
  async createExam(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, subject_code, subject_name, exam_type, semester, duration_minutes, description } = req.body;
      const createdBy = req.user.id;

      const [result] = await pool.execute(
        'INSERT INTO exams (name, subject_code, subject_name, exam_type, semester, duration_minutes, description, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [name, subject_code, subject_name, exam_type, semester, duration_minutes, description, createdBy]
      );

      res.status(201).json({
        message: 'Tạo kỳ thi thành công',
        exam: {
          id: result.insertId,
          name,
          subject_code,
          subject_name,
          exam_type,
          semester,
          duration_minutes,
          description,
          created_by: createdBy
        }
      });
    } catch (error) {
      console.error('Lỗi tạo kỳ thi:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // Lấy danh sách tất cả kỳ thi
  async getAllExams(req, res) {
    try {
      const [exams] = await pool.execute(`
        SELECT e.*, u.full_name as creator_name, 
               COUNT(r.id) as registration_count
        FROM exams e
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN exam_registrations r ON e.id = r.exam_id
        GROUP BY e.id
        ORDER BY e.created_at DESC
      `);

      res.json({ exams });
    } catch (error) {
      console.error('Lỗi lấy danh sách kỳ thi:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // Lấy thông tin chi tiết kỳ thi
  async getExamById(req, res) {
    try {
      const { id } = req.params;

      const [exams] = await pool.execute(`
        SELECT e.*, u.full_name as creator_name
        FROM exams e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.id = ?
      `, [id]);

      if (exams.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
      }

      // Lấy danh sách lịch thi của kỳ thi này
      const [schedules] = await pool.execute(
        'SELECT * FROM schedules WHERE exam_id = ? ORDER BY start_time',
        [id]
      );

      // Lấy danh sách đăng ký
      const [registrations] = await pool.execute(`
        SELECT r.*, u.full_name as student_name, u.email as student_email
        FROM exam_registrations r
        LEFT JOIN users u ON r.student_id = u.id
        WHERE r.exam_id = ?
        ORDER BY r.registered_at
      `, [id]);

      res.json({
        exam: exams[0],
        schedules,
        registrations
      });
    } catch (error) {
      console.error('Lỗi lấy thông tin kỳ thi:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // Cập nhật kỳ thi
  async updateExam(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { name, subject_code, subject_name, exam_type, semester, duration_minutes, description } = req.body;

      // Kiểm tra kỳ thi tồn tại
      const [exams] = await pool.execute(
        'SELECT * FROM exams WHERE id = ?',
        [id]
      );

      if (exams.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
      }

      // Chỉ người tạo hoặc admin mới được sửa
      if (exams[0].created_by !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Không có quyền sửa kỳ thi này' });
      }

      await pool.execute(
        'UPDATE exams SET name = ?, subject_code = ?, subject_name = ?, exam_type = ?, semester = ?, duration_minutes = ?, description = ? WHERE id = ?',
        [name, subject_code, subject_name, exam_type, semester, duration_minutes, description, id]
      );

      res.json({ message: 'Cập nhật kỳ thi thành công' });
    } catch (error) {
      console.error('Lỗi cập nhật kỳ thi:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // Xóa kỳ thi
  async deleteExam(req, res) {
    try {
      const { id } = req.params;

      // Kiểm tra kỳ thi tồn tại
      const [exams] = await pool.execute(
        'SELECT * FROM exams WHERE id = ?',
        [id]
      );

      if (exams.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
      }

      // Chỉ người tạo hoặc admin mới được xóa
      if (exams[0].created_by !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Không có quyền xóa kỳ thi này' });
      }

      // Xóa các bản ghi liên quan trước
      await pool.execute('DELETE FROM exam_registrations WHERE exam_id = ?', [id]);
      await pool.execute('DELETE FROM schedules WHERE exam_id = ?', [id]);
      await pool.execute('DELETE FROM exams WHERE id = ?', [id]);

      res.json({ message: 'Xóa kỳ thi thành công' });
    } catch (error) {
      console.error('Lỗi xóa kỳ thi:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }
};

module.exports = examController; 