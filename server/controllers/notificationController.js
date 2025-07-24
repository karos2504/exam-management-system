const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Lấy danh sách thông báo
exports.getAllNotifications = async (req, res) => {
  try {
    const { user_id, type } = req.query;
    let sql = 'SELECT * FROM notifications WHERE 1=1';
    const params = [];
    if (user_id) { sql += ' AND user_id=?'; params.push(user_id); }
    if (type) { sql += ' AND type=?'; params.push(type); }
    sql += ' ORDER BY created_at DESC';
    const [notifications] = await db.query(sql, params);
    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách thông báo', error: err.message });
  }
};

// Lấy chi tiết thông báo
exports.getNotificationById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM notifications WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
    res.json({ success: true, notification: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi lấy thông báo', error: err.message });
  }
};

// Gửi thông báo (1 user/nhiều user/toàn hệ thống)
exports.createNotification = async (req, res) => {
  try {
    const { user_ids, type, content } = req.body;
    if (!type || !content) return res.status(400).json({ success: false, message: 'Thiếu type hoặc content' });
    let ids = user_ids;
    if (!ids) {
      // Gửi toàn hệ thống
      const [users] = await db.query('SELECT id FROM users');
      ids = users.map(u => u.id);
    }
    for (const user_id of ids) {
      await db.query('INSERT INTO notifications (id, user_id, type, content, is_read) VALUES (?, ?, ?, ?, 0)', [uuidv4(), user_id, type, content]);
    }
    res.json({ success: true, message: 'Gửi thông báo thành công', count: ids.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi gửi thông báo', error: err.message });
  }
};

// Sửa thông báo
exports.updateNotification = async (req, res) => {
  try {
    const { type, content, is_read } = req.body;
    await db.query('UPDATE notifications SET type=?, content=?, is_read=? WHERE id=?', [type, content, is_read, req.params.id]);
    res.json({ success: true, message: 'Cập nhật thông báo thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật thông báo', error: err.message });
  }
};

// Xóa thông báo
exports.deleteNotification = async (req, res) => {
  try {
    await db.query('DELETE FROM notifications WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Xóa thông báo thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi xóa thông báo', error: err.message });
  }
}; 