const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const pool = require('../config/database');

const authController = {
  // Đăng ký người dùng mới
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, password, role } = req.body;

      // Kiểm tra email đã tồn tại
      const [existingUsers] = await pool.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({ message: 'Email đã tồn tại' });
      }

      // Mã hóa mật khẩu
      const hashedPassword = await bcrypt.hash(password, 10);

      // Tạo người dùng mới
      const [result] = await pool.execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, role]
      );

      res.status(201).json({
        message: 'Đăng ký thành công',
        user: {
          id: result.insertId,
          name,
          email,
          role
        }
      });
    } catch (error) {
      console.error('Lỗi đăng ký:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // Đăng nhập
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Tìm người dùng theo email
      const [users] = await pool.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
      }

      const user = users[0];

      // Kiểm tra mật khẩu
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
      }

      // Tạo JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Đăng nhập thành công',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // Lấy thông tin người dùng hiện tại
  async getProfile(req, res) {
    try {
      const [users] = await pool.execute(
        'SELECT id, name, email, role FROM users WHERE id = ?',
        [req.user.id]
      );

      if (users.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng' });
      }

      res.json({ user: users[0] });
    } catch (error) {
      console.error('Lỗi lấy thông tin profile:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }
};

module.exports = authController; 