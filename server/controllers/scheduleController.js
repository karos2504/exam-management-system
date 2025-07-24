const { validationResult } = require('express-validator');
const pool = require('../config/database');

const scheduleController = {
  // Tạo lịch thi mới
  async createSchedule(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { exam_id, room, start_time, end_time } = req.body;

      // Kiểm tra kỳ thi tồn tại
      const [exams] = await pool.execute(
        'SELECT * FROM exams WHERE id = ?',
        [exam_id]
      );

      if (exams.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
      }

      // Kiểm tra trùng lặp lịch thi
      const [conflictingSchedules] = await pool.execute(`
        SELECT * FROM schedules 
        WHERE room = ? AND exam_id != ?
        AND (
          (start_time <= ? AND end_time > ?) OR
          (start_time < ? AND end_time >= ?) OR
          (start_time >= ? AND end_time <= ?)
        )
      `, [room, exam_id, start_time, start_time, end_time, end_time, start_time, end_time]);

      if (conflictingSchedules.length > 0) {
        return res.status(400).json({ 
          message: 'Phòng thi đã được sử dụng trong khoảng thời gian này',
          conflicting_schedules: conflictingSchedules
        });
      }

      // Tạo lịch thi mới
      const [result] = await pool.execute(
        'INSERT INTO schedules (exam_id, room, start_time, end_time) VALUES (?, ?, ?, ?)',
        [exam_id, room, start_time, end_time]
      );

      res.status(201).json({
        message: 'Tạo lịch thi thành công',
        schedule: {
          id: result.insertId,
          exam_id,
          room,
          start_time,
          end_time
        }
      });
    } catch (error) {
      console.error('Lỗi tạo lịch thi:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // Lấy danh sách lịch thi
  async getAllSchedules(req, res) {
    try {
      const [schedules] = await pool.execute(`
        SELECT s.*, e.name as exam_name, e.subject_code, e.subject_name, u.full_name as creator_name
        FROM schedules s
        LEFT JOIN exams e ON s.exam_id = e.id
        LEFT JOIN users u ON e.created_by = u.id
        ORDER BY s.start_time ASC
      `);

      res.json({ schedules });
    } catch (error) {
      console.error('Lỗi lấy danh sách lịch thi:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // Lấy lịch thi theo kỳ thi
  async getSchedulesByExam(req, res) {
    try {
      const { exam_id } = req.params;

      const [schedules] = await pool.execute(`
        SELECT s.*, e.name as exam_name, e.subject_code, e.subject_name
        FROM schedules s
        LEFT JOIN exams e ON s.exam_id = e.id
        WHERE s.exam_id = ?
        ORDER BY s.start_time ASC
      `, [exam_id]);

      res.json({ schedules });
    } catch (error) {
      console.error('Lỗi lấy lịch thi theo kỳ thi:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // Cập nhật lịch thi
  async updateSchedule(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { room, start_time, end_time } = req.body;

      // Kiểm tra lịch thi tồn tại
      const [schedules] = await pool.execute(
        'SELECT * FROM schedules WHERE id = ?',
        [id]
      );

      if (schedules.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy lịch thi' });
      }

      // Kiểm tra trùng lặp lịch thi (loại trừ lịch thi hiện tại)
      const [conflictingSchedules] = await pool.execute(`
        SELECT * FROM schedules 
        WHERE room = ? AND id != ?
        AND (
          (start_time <= ? AND end_time > ?) OR
          (start_time < ? AND end_time >= ?) OR
          (start_time >= ? AND end_time <= ?)
        )
      `, [room, id, start_time, start_time, end_time, end_time, start_time, end_time]);

      if (conflictingSchedules.length > 0) {
        return res.status(400).json({ 
          message: 'Phòng thi đã được sử dụng trong khoảng thời gian này',
          conflicting_schedules: conflictingSchedules
        });
      }

      // Cập nhật lịch thi
      await pool.execute(
        'UPDATE schedules SET room = ?, start_time = ?, end_time = ? WHERE id = ?',
        [room, start_time, end_time, id]
      );

      res.json({ message: 'Cập nhật lịch thi thành công' });
    } catch (error) {
      console.error('Lỗi cập nhật lịch thi:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // Xóa lịch thi
  async deleteSchedule(req, res) {
    try {
      const { id } = req.params;

      // Kiểm tra lịch thi tồn tại
      const [schedules] = await pool.execute(
        'SELECT * FROM schedules WHERE id = ?',
        [id]
      );

      if (schedules.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy lịch thi' });
      }

      // Xóa lịch thi
      await pool.execute('DELETE FROM schedules WHERE id = ?', [id]);

      res.json({ message: 'Xóa lịch thi thành công' });
    } catch (error) {
      console.error('Lỗi xóa lịch thi:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // Kiểm tra trùng lặp lịch thi
  async checkScheduleConflict(req, res) {
    try {
      const { room, start_time, end_time, exclude_id } = req.query;

      let query = `
        SELECT s.*, e.name as exam_name, e.subject_code, e.subject_name
        FROM schedules s
        LEFT JOIN exams e ON s.exam_id = e.id
        WHERE s.room = ?
        AND (
          (s.start_time <= ? AND s.end_time > ?) OR
          (s.start_time < ? AND s.end_time >= ?) OR
          (s.start_time >= ? AND s.end_time <= ?)
        )
      `;

      let params = [room, start_time, start_time, end_time, end_time, start_time, end_time];

      if (exclude_id) {
        query += ' AND s.id != ?';
        params.push(exclude_id);
      }

      const [conflicts] = await pool.execute(query, params);

      res.json({ 
        has_conflict: conflicts.length > 0,
        conflicts 
      });
    } catch (error) {
      console.error('Lỗi kiểm tra trùng lặp lịch thi:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }
};

module.exports = scheduleController; 