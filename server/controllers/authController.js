const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const authController = {
  // Đăng ký người dùng mới
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, full_name, email, password, role, phone, avatar_url } = req.body;

      // Kiểm tra username hoặc email đã tồn tại
      const [existingUsers] = await pool.execute(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        [username, email]
      );
      if (existingUsers.length > 0) {
        return res.status(400).json({ message: 'Username hoặc email đã tồn tại' });
      }

      // Mã hóa mật khẩu
      const password_hash = await bcrypt.hash(password, 10);
      const id = uuidv4();

      // Tạo người dùng mới
      await pool.execute(
        'INSERT INTO users (id, username, full_name, email, password_hash, phone, role, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, username, full_name, email, password_hash, phone, role, avatar_url]
      );

      res.status(201).json({
        message: 'Đăng ký thành công',
        user: {
          id,
          username,
          full_name,
          email,
          role,
          phone,
          avatar_url
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

      // Cho phép nhận identifier, username hoặc email
      const identifier = req.body.identifier || req.body.username || req.body.email;
      const password = req.body.password;
      if (!identifier || !password) {
        return res.status(400).json({ message: 'Thiếu tài khoản hoặc mật khẩu' });
      }

      // Tìm người dùng theo username hoặc email
      const [users] = await pool.execute(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [identifier, identifier]
      );

      if (users.length === 0) {
        return res.status(401).json({ message: 'Tài khoản hoặc mật khẩu không đúng' });
      }

      const user = users[0];
      if (!user.password_hash) {
        return res.status(401).json({ message: 'Tài khoản hoặc mật khẩu không đúng' });
      }

      // Kiểm tra mật khẩu
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Tài khoản hoặc mật khẩu không đúng' });
      }

      // Tạo JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'secret-key',
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Đăng nhập thành công',
        token,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatar_url: user.avatar_url
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
        'SELECT id, username, full_name, email, role, phone, avatar_url FROM users WHERE id = ?',
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