const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// Lấy danh sách user
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, username, full_name, email, phone, role, avatar_url, created_at FROM users');
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách user', error: err.message });
  }
};

// Lấy chi tiết user
exports.getUserById = async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, username, full_name, email, phone, role, avatar_url, created_at FROM users WHERE id = ?', [req.params.id]);
    if (!users.length) return res.status(404).json({ success: false, message: 'Không tìm thấy user' });
    res.json({ success: true, user: users[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi lấy thông tin user', error: err.message });
  }
};

// Tạo user mới
exports.createUser = async (req, res) => {
  try {
    const { username, full_name, email, password, phone, role, avatar_url } = req.body;
    if (!username || !full_name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }
    const id = uuidv4();
    const password_hash = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO users (id, username, full_name, email, password_hash, phone, role, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, username, full_name, email, password_hash, phone, role, avatar_url]);
    res.json({ success: true, message: 'Tạo user thành công', id });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tạo user', error: err.message });
  }
};

// Sửa user
exports.updateUser = async (req, res) => {
  try {
    const { full_name, email, phone, role, avatar_url } = req.body;
    const { id } = req.params;
    await db.query('UPDATE users SET full_name=?, email=?, phone=?, role=?, avatar_url=? WHERE id=?', [full_name, email, phone, role, avatar_url, id]);
    res.json({ success: true, message: 'Cập nhật user thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật user', error: err.message });
  }
};

// Xóa user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM users WHERE id=?', [id]);
    res.json({ success: true, message: 'Xóa user thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi xóa user', error: err.message });
  }
}; 