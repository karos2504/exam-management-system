const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Lấy tất cả phân công
exports.getAllAssignments = async (req, res) => {
  try {
    const [assignments] = await db.query(`
      SELECT a.*, e.name as exam_name, e.subject_code, e.subject_name, t.full_name as teacher_name, ad.full_name as assigned_by_name
      FROM exam_assignments a
      LEFT JOIN exams e ON a.exam_id = e.id
      LEFT JOIN users t ON a.teacher_id = t.id
      LEFT JOIN users ad ON a.assigned_by = ad.id
      ORDER BY a.assigned_at DESC
    `);
    res.json({ success: true, assignments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách phân công', error: err.message });
  }
};

// Lấy chi tiết phân công
exports.getAssignmentById = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.*, e.name as exam_name, e.subject_code, e.subject_name, t.full_name as teacher_name, ad.full_name as assigned_by_name
      FROM exam_assignments a
      LEFT JOIN exams e ON a.exam_id = e.id
      LEFT JOIN users t ON a.teacher_id = t.id
      LEFT JOIN users ad ON a.assigned_by = ad.id
      WHERE a.id = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy phân công' });
    res.json({ success: true, assignment: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi lấy phân công', error: err.message });
  }
};

// Tạo phân công mới
exports.createAssignment = async (req, res) => {
  try {
    const { exam_id, teacher_id, notes } = req.body;
    if (!exam_id || !teacher_id) return res.status(400).json({ success: false, message: 'Thiếu exam_id hoặc teacher_id' });
    const id = uuidv4();
    const assigned_by = req.user.id;
    await db.query('INSERT INTO exam_assignments (id, exam_id, teacher_id, assigned_by, notes) VALUES (?, ?, ?, ?, ?)', [id, exam_id, teacher_id, assigned_by, notes]);
    res.json({ success: true, message: 'Tạo phân công thành công', id });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tạo phân công', error: err.message });
  }
};

// Sửa phân công
exports.updateAssignment = async (req, res) => {
  try {
    const { status, notes } = req.body;
    await db.query('UPDATE exam_assignments SET status=?, notes=? WHERE id=?', [status, notes, req.params.id]);
    res.json({ success: true, message: 'Cập nhật phân công thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật phân công', error: err.message });
  }
};

// Xóa phân công
exports.deleteAssignment = async (req, res) => {
  try {
    await db.query('DELETE FROM exam_assignments WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Xóa phân công thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi xóa phân công', error: err.message });
  }
};

// Lấy danh sách giáo viên chưa được phân công cho 1 kỳ thi
exports.getAvailableTeachers = async (req, res) => {
  try {
    const { exam_id } = req.query;
    if (!exam_id) return res.status(400).json({ success: false, message: 'Thiếu exam_id' });
    const [assigned] = await db.query('SELECT teacher_id FROM exam_assignments WHERE exam_id=?', [exam_id]);
    const assignedIds = assigned.map(a => a.teacher_id);
    let sql = 'SELECT id, full_name FROM users WHERE role="teacher"';
    if (assignedIds.length > 0) {
      sql += ' AND id NOT IN (' + assignedIds.map(() => '?').join(',') + ')';
    }
    const [teachers] = await db.query(sql, assignedIds);
    res.json({ success: true, teachers });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi lấy giáo viên', error: err.message });
  }
}; 