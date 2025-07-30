const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');

async function createSchedule(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Chỉ teacher hoặc admin được tạo lịch thi' });
    }

    const { exam_id, room, start_time, end_time } = req.body;
    const id = uuidv4();

    const [exams] = await pool.execute('SELECT id FROM exams WHERE id = ?', [exam_id]);
    if (exams.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
    }

    // For teachers, verify they are assigned to the exam and have accepted
    if (req.user.role === 'teacher') {
      const [assignments] = await pool.execute(
        'SELECT id FROM exam_assignments WHERE exam_id = ? AND teacher_id = ? AND status = ?',
        [exam_id, req.user.id, 'accepted']
      );
      if (assignments.length === 0) {
        return res.status(403).json({ message: 'Bạn không được phân công hoặc chưa chấp nhận phân công cho kỳ thi này' });
      }
    }

    const [conflictingSchedules] = await pool.execute(
      `SELECT * FROM schedules WHERE room = ?
        AND (
          (start_time <= ? AND end_time > ?) OR
          (start_time < ? AND end_time >= ?) OR
          (start_time >= ? AND end_time <= ?)
        )`,
      [room, start_time, start_time, end_time, end_time, start_time, end_time]
    );

    if (conflictingSchedules.length > 0) {
      return res.status(400).json({
        message: 'Phòng thi đã được sử dụng trong khoảng thời gian này',
        conflicting_schedules: conflictingSchedules,
      });
    }

    await pool.execute(
      'INSERT INTO schedules (id, exam_id, room, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
      [id, exam_id, room, start_time, end_time]
    );

    const [schedule] = await pool.execute(
      `SELECT s.*, e.name AS exam_name, e.subject_name
        FROM schedules s JOIN exams e ON s.exam_id = e.id
        WHERE s.id = ?`,
      [id]
    );

    req.io.to('admin-room').emit('schedule-updated', schedule[0]);
    if (req.user.role === 'teacher') {
      req.io.to(`user-${req.user.id}`).emit('schedule-updated', schedule[0]);
    }

    res.status(201).json({ message: 'Tạo lịch thi thành công', schedule: schedule[0] });
  } catch (error) {
    console.error('Lỗi tạo lịch thi:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

async function getAllSchedules(req, res) {
  try {
    const [schedules] = await pool.execute(
      `SELECT s.*, e.name AS exam_name, e.subject_name
        FROM schedules s JOIN exams e ON s.exam_id = e.id`
    );
    res.json({ schedules });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

async function getMySchedules(req, res) {
  try {
    const user_id = req.user.id;
    const role = req.user.role;
    let schedules = [];

    if (role === 'admin') {
      // Admins see all schedules
      [schedules] = await pool.execute(
        `SELECT s.*, e.name AS exam_name, e.subject_name
         FROM schedules s JOIN exams e ON s.exam_id = e.id`
      );
    } else if (role === 'teacher') {
      // Teachers see schedules for exams where they have accepted assignments
      [schedules] = await pool.execute(
        `SELECT s.*, e.name AS exam_name, e.subject_name, ea.teacher_id, ea.status AS assignment_status
         FROM schedules s
         JOIN exams e ON s.exam_id = e.id
         JOIN exam_assignments ea ON e.id = ea.exam_id
         WHERE ea.teacher_id = ? AND ea.status = 'accepted'`,
        [user_id]
      );
    } else if (role === 'student') {
      // Students see schedules for exams with approved registrations
      [schedules] = await pool.execute(
        `SELECT s.*, e.name AS exam_name, e.subject_name, r.student_id, r.status AS registration_status
         FROM schedules s
         JOIN exams e ON s.exam_id = e.id
         JOIN exam_registrations r ON e.id = r.exam_id
         WHERE r.student_id = ? AND r.status = 'approved'`,
        [user_id]
      );
    } else {
      return res.status(403).json({ message: 'Vai trò không hợp lệ' });
    }

    res.json({ schedules });
  } catch (err) {
    console.error('[getMySchedules] Error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

async function getSchedulesByExam(req, res) {
  try {
    const { exam_id } = req.params;
    const [schedules] = await pool.execute(
      `SELECT s.*, e.name AS exam_name, e.subject_name
        FROM schedules s JOIN exams e ON s.exam_id = e.id
        WHERE s.exam_id = ?`,
      [exam_id]
    );
    res.json({ schedules });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

async function updateSchedule(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Chỉ teacher hoặc admin được sửa lịch thi' });
    }

    const { id } = req.params;
    const { exam_id, room, start_time, end_time } = req.body;

    const [exists] = await pool.execute('SELECT id FROM schedules WHERE id = ?', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy lịch thi' });
    }

    const [exams] = await pool.execute('SELECT id FROM exams WHERE id = ?', [exam_id]);
    if (exams.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
    }

    // For teachers, verify they are assigned to the exam and have accepted
    if (req.user.role === 'teacher') {
      const [assignments] = await pool.execute(
        'SELECT id FROM exam_assignments WHERE exam_id = ? AND teacher_id = ? AND status = ?',
        [exam_id, req.user.id, 'accepted']
      );
      if (assignments.length === 0) {
        return res.status(403).json({ message: 'Bạn không được phân công hoặc chưa chấp nhận phân công cho kỳ thi này' });
      }
    }

    const [conflicts] = await pool.execute(
      `SELECT * FROM schedules WHERE room = ? AND id != ?
        AND (
          (start_time <= ? AND end_time > ?) OR
          (start_time < ? AND end_time >= ?) OR
          (start_time >= ? AND end_time <= ?)
        )`,
      [room, id, start_time, start_time, end_time, end_time, start_time, end_time]
    );

    if (conflicts.length > 0) {
      return res.status(400).json({ message: 'Phòng thi bị trùng lịch', conflicts });
    }

    await pool.execute(
      'UPDATE schedules SET exam_id = ?, room = ?, start_time = ?, end_time = ? WHERE id = ?',
      [exam_id, room, start_time, end_time, id]
    );

    const [updated] = await pool.execute(
      `SELECT s.*, e.name AS exam_name, e.subject_name
        FROM schedules s JOIN exams e ON s.exam_id = e.id
        WHERE s.id = ?`,
      [id]
    );

    req.io.to('admin-room').emit('schedule-updated', updated[0]);
    if (req.user.role === 'teacher') {
      req.io.to(`user-${req.user.id}`).emit('schedule-updated', updated[0]);
    }

    res.json({ message: 'Cập nhật thành công', schedule: updated[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

async function deleteSchedule(req, res) {
  try {
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Chỉ teacher hoặc admin được xóa lịch thi' });
    }

    const { id } = req.params;

    const [exists] = await pool.execute('SELECT id, exam_id FROM schedules WHERE id = ?', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy lịch thi' });
    }

    // For teachers, verify they are assigned to the exam and have accepted
    if (req.user.role === 'teacher') {
      const [assignments] = await pool.execute(
        'SELECT id FROM exam_assignments WHERE exam_id = ? AND teacher_id = ? AND status = ?',
        [exists[0].exam_id, req.user.id, 'accepted']
      );
      if (assignments.length === 0) {
        return res.status(403).json({ message: 'Bạn không được phân công hoặc chưa chấp nhận phân công cho kỳ thi này' });
      }
    }

    await pool.execute('DELETE FROM schedules WHERE id = ?', [id]);

    res.json({ message: 'Xóa lịch thi thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

async function checkScheduleConflict(req, res) {
  try {
    const { room, start_time, end_time, exclude_id } = req.query;

    let query = `
      SELECT s.*, e.name AS exam_name, e.subject_name
      FROM schedules s JOIN exams e ON s.exam_id = e.id
      WHERE s.room = ?
      AND (
        (start_time <= ? AND end_time > ?) OR
        (start_time < ? AND end_time >= ?) OR
        (start_time >= ? AND end_time <= ?)
      )`;

    const params = [room, start_time, start_time, end_time, end_time, start_time, end_time];

    if (exclude_id) {
      query += ' AND s.id != ?';
      params.push(exclude_id);
    }

    const [conflicts] = await pool.execute(query, params);

    res.json({ has_conflict: conflicts.length > 0, conflicts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

module.exports = {
  createSchedule,
  getAllSchedules,
  getMySchedules,
  getSchedulesByExam,
  updateSchedule,
  deleteSchedule,
  checkScheduleConflict,
};