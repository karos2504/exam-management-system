const { validationResult } = require('express-validator');
const pool = require('../config/database');

const registrationController = {
  // Đăng ký thi
  async registerForExam(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { exam_id } = req.body;
      const student_id = req.user.id;

      // Kiểm tra kỳ thi tồn tại
      const [exams] = await pool.execute(
        'SELECT * FROM exams WHERE id = ?',
        [exam_id]
      );

      if (exams.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
      }

      // Kiểm tra đã đăng ký chưa
      const [existingRegistrations] = await pool.execute(
        'SELECT * FROM exam_registrations WHERE student_id = ? AND exam_id = ?',
        [student_id, exam_id]
      );

      if (existingRegistrations.length > 0) {
        return res.status(400).json({ message: 'Bạn đã đăng ký kỳ thi này rồi' });
      }

      // Tạo đăng ký mới
      const [result] = await pool.execute(
        'INSERT INTO exam_registrations (student_id, exam_id, status) VALUES (?, ?, ?)',
        [student_id, exam_id, 'pending']
      );

      // Tạo thông báo xác nhận
      await pool.execute(
        'INSERT INTO notifications (user_id, type, content) VALUES (?, ?, ?)',
        [student_id, 'registration', `Đăng ký kỳ thi "${exams[0].name}" thành công. Vui lòng chờ xác nhận.`]
      );

      res.status(201).json({
        message: 'Đăng ký kỳ thi thành công',
        registration: {
          id: result.insertId,
          student_id,
          exam_id,
          status: 'pending'
        }
      });
    } catch (error) {
      console.error('Lỗi đăng ký thi:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // Hủy đăng ký thi
  async cancelRegistration(req, res) {
    try {
      const { exam_id } = req.params;
      const student_id = req.user.id;

      // Kiểm tra đăng ký tồn tại
      const [registrations] = await pool.execute(
        'SELECT * FROM exam_registrations WHERE student_id = ? AND exam_id = ?',
        [student_id, exam_id]
      );

      if (registrations.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy đăng ký' });
      }

      // Cập nhật trạng thái thành cancelled
      await pool.execute(
        'UPDATE exam_registrations SET status = ? WHERE student_id = ? AND exam_id = ?',
        ['cancelled', student_id, exam_id]
      );

      // Tạo thông báo hủy đăng ký
      await pool.execute(
        'INSERT INTO notifications (user_id, type, content) VALUES (?, ?, ?)',
        [student_id, 'registration', 'Đã hủy đăng ký kỳ thi thành công.']
      );

      res.json({ message: 'Hủy đăng ký thành công' });
    } catch (error) {
      console.error('Lỗi hủy đăng ký:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // Lấy danh sách đăng ký của người dùng
  async getUserRegistrations(req, res) {
    try {
      const student_id = req.user.id;

      const [registrations] = await pool.execute(`
        SELECT r.*, e.name as exam_name, e.subject_code, e.subject_name, s.room, s.start_time, s.end_time
        FROM exam_registrations r
        LEFT JOIN exams e ON r.exam_id = e.id
        LEFT JOIN schedules s ON e.id = s.exam_id
        WHERE r.student_id = ?
        ORDER BY r.registered_at DESC
      `, [student_id]);

      res.json({ registrations });
    } catch (error) {
      console.error('Lỗi lấy danh sách đăng ký:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // Xác nhận đăng ký (cho admin/teacher)
  async confirmRegistration(req, res) {
    try {
      const { registration_id } = req.params;

      // Kiểm tra đăng ký tồn tại
      const [registrations] = await pool.execute(
        'SELECT * FROM exam_registrations WHERE id = ?',
        [registration_id]
      );

      if (registrations.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy đăng ký' });
      }

      // Cập nhật trạng thái thành approved
      await pool.execute(
        'UPDATE exam_registrations SET status = ? WHERE id = ?',
        ['approved', registration_id]
      );

      // Tạo thông báo xác nhận
      await pool.execute(
        'INSERT INTO notifications (user_id, type, content) VALUES (?, ?, ?)',
        [registrations[0].student_id, 'registration', 'Đăng ký kỳ thi đã được xác nhận.']
      );

      res.json({ message: 'Xác nhận đăng ký thành công' });
    } catch (error) {
      console.error('Lỗi xác nhận đăng ký:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // Lấy danh sách đăng ký cho kỳ thi (cho admin/teacher)
  async getExamRegistrations(req, res) {
    try {
      const { exam_id } = req.params;

      const [registrations] = await pool.execute(`
        SELECT r.*, u.full_name as student_name, u.email as student_email
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
  }
};

module.exports = registrationController; 