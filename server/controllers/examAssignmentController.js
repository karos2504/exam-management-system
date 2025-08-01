const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

exports.getAllAssignments = async (req, res) => {
  try {
    const [assignments] = await db.query(`
      SELECT CAST(a.id AS CHAR(36)) AS id, CAST(a.exam_id AS CHAR(36)) AS exam_id, CAST(a.teacher_id AS CHAR(36)) AS teacher_id, 
             CAST(a.assigned_by AS CHAR(36)) AS assigned_by, a.status, a.notes, a.assigned_at,
             e.name AS exam_name, e.subject_code, e.subject_name, t.full_name AS teacher_name, ad.full_name AS assigned_by_name
      FROM exam_assignments a
      LEFT JOIN exams e ON a.exam_id = e.id
      LEFT JOIN users t ON a.teacher_id = t.id
      LEFT JOIN users ad ON a.assigned_by = ad.id
      ORDER BY a.assigned_at DESC
    `);
    res.json({ success: true, assignments });
  } catch (err) {
    console.error('Lỗi lấy danh sách phân công:', err);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách phân công', error: err.message });
  }
};

exports.getMyAssignments = async (req, res) => {
  try {
    const { id: teacher_id } = req.user;
    const [assignments] = await db.query(`
      SELECT CAST(a.id AS CHAR(36)) AS id, CAST(a.exam_id AS CHAR(36)) AS exam_id, CAST(a.teacher_id AS CHAR(36)) AS teacher_id, 
             CAST(a.assigned_by AS CHAR(36)) AS assigned_by, a.status, a.notes, a.assigned_at,
             e.name AS exam_name, e.subject_code, e.subject_name, t.full_name AS teacher_name, ad.full_name AS assigned_by_name
      FROM exam_assignments a
      LEFT JOIN exams e ON a.exam_id = e.id
      LEFT JOIN users t ON a.teacher_id = t.id
      LEFT JOIN users ad ON a.assigned_by = ad.id
      WHERE a.teacher_id = ?
      ORDER BY a.assigned_at DESC
    `, [teacher_id]);
    res.json({ success: true, assignments });
  } catch (err) {
    console.error('Lỗi lấy danh sách phân công của giáo viên:', err);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách phân công của giáo viên', error: err.message });
  }
};

exports.getAssignmentById = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT CAST(a.id AS CHAR(36)) AS id, CAST(a.exam_id AS CHAR(36)) AS exam_id, CAST(a.teacher_id AS CHAR(36)) AS teacher_id, 
             CAST(a.assigned_by AS CHAR(36)) AS assigned_by, a.status, a.notes, a.assigned_at,
             e.name AS exam_name, e.subject_code, e.subject_name, t.full_name AS teacher_name, ad.full_name AS assigned_by_name
      FROM exam_assignments a
      LEFT JOIN exams e ON a.exam_id = e.id
      LEFT JOIN users t ON a.teacher_id = t.id
      LEFT JOIN users ad ON a.assigned_by = ad.id
      WHERE a.id = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy phân công' });
    res.json({ success: true, assignment: rows[0] });
  } catch (err) {
    console.error('Lỗi lấy phân công:', err);
    res.status(500).json({ success: false, message: 'Lỗi lấy phân công', error: err.message });
  }
};

exports.createAssignment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { exam_id, teacher_id, notes } = req.body;
    const { id: assigned_by } = req.user;
    const id = uuidv4();

    const [exams] = await db.query('SELECT id, name FROM exams WHERE id = ?', [exam_id]);
    if (exams.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy kỳ thi' });
    }

    const [teachers] = await db.query('SELECT id FROM users WHERE id = ? AND role = "teacher"', [teacher_id]);
    if (teachers.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy giáo viên' });
    }

    const [existing] = await db.query(
      'SELECT id FROM exam_assignments WHERE exam_id = ? AND teacher_id = ?',
      [exam_id, teacher_id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Giáo viên đã được phân công cho kỳ thi này' });
    }

    await db.query(
      'INSERT INTO exam_assignments (id, exam_id, teacher_id, assigned_by, status, notes, assigned_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [id, exam_id, teacher_id, assigned_by, 'assigned', notes || null]
    );

    const notificationId = uuidv4();
    await db.query(
      'INSERT INTO notifications (id, user_id, type, content, exam_id, created_at, is_read) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
      [notificationId, teacher_id, 'assignment', `Bạn được phân công phụ trách kỳ thi "${exams[0].name}".`, exam_id, 0]
    );

    if (req.io) {
      const notification = {
        id: notificationId,
        user_id: teacher_id,
        type: 'assignment',
        content: `Bạn được phân công phụ trách kỳ thi "${exams[0].name}".`,
        exam_id,
        created_at: new Date().toISOString(),
        is_read: false,
      };
      req.io.to(`user-${teacher_id}`).emit('notification-created', notification);
      console.log(`Sent notification ${notification.id} to user-${teacher_id}`);
    }

    res.json({ success: true, message: 'Tạo phân công thành công', id });
  } catch (err) {
    console.error('Lỗi tạo phân công:', err);
    res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

exports.updateAssignment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { exam_id, teacher_id, notes } = req.body;
    const { id } = req.params;

    const [assignments] = await db.query('SELECT id FROM exam_assignments WHERE id = ?', [id]);
    if (assignments.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phân công' });
    }

    const [exams] = await db.query('SELECT id FROM exams WHERE id = ?', [exam_id]);
    if (exams.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy kỳ thi' });
    }

    const [teachers] = await db.query('SELECT id FROM users WHERE id = ? AND role = "teacher"', [teacher_id]);
    if (teachers.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy giáo viên' });
    }

    await db.query(
      'UPDATE exam_assignments SET exam_id = ?, teacher_id = ?, notes = ? WHERE id = ?',
      [exam_id, teacher_id, notes || null, id]
    );

    res.json({ success: true, message: 'Cập nhật phân công thành công' });
  } catch (err) {
    console.error('Lỗi cập nhật phân công:', err);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật phân công', error: err.message });
  }
};

exports.deleteAssignment = async (req, res) => {
  try {
    const [assignments] = await db.query('SELECT id FROM exam_assignments WHERE id = ?', [req.params.id]);
    if (assignments.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phân công' });
    }

    await db.query('DELETE FROM exam_assignments WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Xóa phân công thành công' });
  } catch (err) {
    console.error('Lỗi xóa phân công:', err);
    res.status(500).json({ success: false, message: 'Lỗi xóa phân công', error: err.message });
  }
};

exports.getAvailableTeachers = async (req, res) => {
  try {
    const { exam_id } = req.query;
    if (!exam_id) return res.status(400).json({ success: false, message: 'Thiếu exam_id' });
    const [assigned] = await db.query('SELECT teacher_id FROM exam_assignments WHERE exam_id = ?', [exam_id]);
    const assignedIds = assigned.map(a => a.teacher_id);
    let sql = 'SELECT CAST(id AS CHAR(36)) AS id, full_name FROM users WHERE role = "teacher"';
    const params = [];
    if (assignedIds.length > 0) {
      sql += ' AND id NOT IN (' + assignedIds.map(() => '?').join(',') + ')';
      params.push(...assignedIds);
    }
    const [teachers] = await db.query(sql, params);
    res.json({ success: true, teachers });
  } catch (err) {
    console.error('Lỗi lấy giáo viên:', err);
    res.status(500).json({ success: false, message: 'Lỗi lấy giáo viên', error: err.message });
  }
};

exports.acceptAssignment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { assignment_id } = req.params;
    const { id: teacher_id } = req.user;

    const [assignments] = await db.query(
      'SELECT CAST(id AS CHAR(36)) AS id, CAST(exam_id AS CHAR(36)) AS exam_id, CAST(teacher_id AS CHAR(36)) AS teacher_id, CAST(assigned_by AS CHAR(36)) AS assigned_by, status FROM exam_assignments WHERE id = ? AND teacher_id = ?',
      [assignment_id, teacher_id]
    );
    if (assignments.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phân công hoặc không có quyền' });
    }

    if (assignments[0].status === 'accepted') {
      return res.status(400).json({ success: false, message: 'Phân công đã được chấp nhận trước đó' });
    }

    if (assignments[0].status === 'declined') {
      return res.status(400).json({ success: false, message: 'Phân công đã bị từ chối trước đó' });
    }

    await db.query(
      'UPDATE exam_assignments SET status = ?, assigned_at = NOW() WHERE id = ?',
      ['accepted', assignment_id]
    );

    const [exam] = await db.query(
      'SELECT name FROM exams WHERE id = ?',
      [assignments[0].exam_id]
    );

    const notificationId = uuidv4();
    await db.query(
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

      const [adminUser] = await db.query('SELECT CAST(id AS CHAR(36)) AS id FROM users WHERE id = ? AND role = "admin"', [assignments[0].assigned_by]);
      if (adminUser.length > 0) {
        const adminNotificationId = uuidv4();
        const adminNotification = {
          id: adminNotificationId,
          user_id: assignments[0].assigned_by,
          type: 'assignment_status',
          content: `Giáo viên đã chấp nhận phân công kỳ thi "${exam[0].name}".`,
          exam_id: assignments[0].exam_id,
          created_at: new Date().toISOString(),
          is_read: false,
        };
        await db.query(
          'INSERT INTO notifications (id, user_id, type, content, exam_id, created_at, is_read) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
          [adminNotificationId, assignments[0].assigned_by, 'assignment_status', `Giáo viên đã chấp nhận phân công kỳ thi "${exam[0].name}".`, assignments[0].exam_id, 0]
        );
        req.io.to(`user-${assignments[0].assigned_by}`).emit('notification-created', adminNotification);
        console.log(`Sent notification ${adminNotification.id} to admin user-${assignments[0].assigned_by}`);
      }
    }

    res.json({ success: true, message: 'Chấp nhận phân công thành công', assignment: { id: assignment_id, status: 'accepted' } });
  } catch (err) {
    console.error('Lỗi chấp nhận phân công:', err);
    res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

exports.declineAssignment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { assignment_id } = req.params;
    const { id: teacher_id } = req.user;

    const [assignments] = await db.query(
      'SELECT CAST(id AS CHAR(36)) AS id, CAST(exam_id AS CHAR(36)) AS exam_id, CAST(teacher_id AS CHAR(36)) AS teacher_id, CAST(assigned_by AS CHAR(36)) AS assigned_by, status FROM exam_assignments WHERE id = ? AND teacher_id = ?',
      [assignment_id, teacher_id]
    );
    if (assignments.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phân công hoặc không có quyền' });
    }

    if (assignments[0].status === 'declined') {
      return res.status(400).json({ success: false, message: 'Phân công đã bị từ chối trước đó' });
    }

    if (assignments[0].status === 'accepted') {
      return res.status(400).json({ success: false, message: 'Phân công đã được chấp nhận trước đó' });
    }

    await db.query(
      'UPDATE exam_assignments SET status = ?, assigned_at = NOW() WHERE id = ?',
      ['declined', assignment_id]
    );

    const [exam] = await db.query(
      'SELECT name FROM exams WHERE id = ?',
      [assignments[0].exam_id]
    );

    const notificationId = uuidv4();
    await db.query(
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

      const [adminUser] = await db.query('SELECT CAST(id AS CHAR(36)) AS id FROM users WHERE id = ? AND role = "admin"', [assignments[0].assigned_by]);
      if (adminUser.length > 0) {
        const adminNotificationId = uuidv4();
        const adminNotification = {
          id: adminNotificationId,
          user_id: assignments[0].assigned_by,
          type: 'assignment_status',
          content: `Giáo viên đã từ chối phân công kỳ thi "${exam[0].name}".`,
          exam_id: assignments[0].exam_id,
          created_at: new Date().toISOString(),
          is_read: false,
        };
        await db.query(
          'INSERT INTO notifications (id, user_id, type, content, exam_id, created_at, is_read) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
          [adminNotificationId, assignments[0].assigned_by, 'assignment_status', `Giáo viên đã từ chối phân công kỳ thi "${exam[0].name}".`, assignments[0].exam_id, 0]
        );
        req.io.to(`user-${assignments[0].assigned_by}`).emit('notification-created', adminNotification);
        console.log(`Sent notification ${adminNotification.id} to admin user-${assignments[0].assigned_by}`);
      }
    }

    res.json({ success: true, message: 'Từ chối phân công thành công', assignment: { id: assignment_id, status: 'declined' } });
  } catch (err) {
    console.error('Lỗi từ chối phân công:', err);
    res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

module.exports = {
  getAllAssignments: exports.getAllAssignments,
  getMyAssignments: exports.getMyAssignments,
  getAssignmentById: exports.getAssignmentById,
  createAssignment: exports.createAssignment,
  updateAssignment: exports.updateAssignment,
  deleteAssignment: exports.deleteAssignment,
  getAvailableTeachers: exports.getAvailableTeachers,
  acceptAssignment: exports.acceptAssignment,
  declineAssignment: exports.declineAssignment,
};