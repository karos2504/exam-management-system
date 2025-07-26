const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  getAllNotifications: async (req, res) => {
    try {
      const { user_id, type } = req.query;
      let sql = 'SELECT * FROM notifications WHERE 1=1';
      const params = [];

      if (user_id) {
        sql += ' AND (user_id = ? OR user_id IS NULL)';
        params.push(user_id);
      }

      if (type) {
        sql += ' AND type = ?';
        params.push(type);
      }

      sql += ' ORDER BY created_at DESC';

      const [notifications] = await db.query(sql, params);
      res.json({ success: true, notifications });
    } catch (err) {
      console.error('Error fetching notifications:', err);
      res.status(500).json({ success: false, message: 'Lỗi lấy danh sách thông báo', error: err.message });
    }
  },

  getNotificationById: async (req, res) => {
    try {
      const [rows] = await db.query('SELECT * FROM notifications WHERE id = ?', [req.params.id]);
      if (!rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
      res.json({ success: true, notification: rows[0] });
    } catch (err) {
      console.error('Error fetching notification:', err);
      res.status(500).json({ success: false, message: 'Lỗi lấy thông báo', error: err.message });
    }
  },

  createNotification: async (req, res) => {
    try {
      const { user_ids, type, content } = req.body;
      if (!type || !content) {
        return res.status(400).json({ success: false, message: 'Thiếu type hoặc content' });
      }

      const notificationId = uuidv4();
      if (!user_ids || user_ids.length === 0) {
        await db.query(
          'INSERT INTO notifications (id, user_id, type, content, is_read, created_at) VALUES (?, NULL, ?, ?, 0, NOW())',
          [notificationId, type, content]
        );
        req.io.to('teacher').to('student').emit('notification-created', {
          id: notificationId,
          type,
          content,
          user_ids: [],
          created_at: new Date().toISOString(),
        });
        console.log(`Created system-wide notification: ${notificationId}`);
        return res.json({ success: true, message: 'Gửi thông báo toàn hệ thống thành công', count: 'all', notificationId });
      }

      const count = user_ids.length;
      for (const user_id of user_ids) {
        const id = uuidv4();
        await db.query(
          'INSERT INTO notifications (id, user_id, type, content, is_read, created_at) VALUES (?, ?, ?, ?, 0, NOW())',
          [id, user_id, type, content]
        );
        req.io.to(`user-${user_id}`).emit('notification-created', {
          id,
          type,
          content,
          user_ids: [user_id],
          created_at: new Date().toISOString(),
        });
        console.log(`Created notification ${id} for user-${user_id}`);
      }

      res.json({ success: true, message: 'Gửi thông báo thành công', count, notificationId });
    } catch (err) {
      console.error('Error creating notification:', err);
      res.status(500).json({ success: false, message: 'Lỗi gửi thông báo', error: err.message });
    }
  },

  updateNotification: async (req, res) => {
    try {
      const { type, content, is_read } = req.body;
      const [result] = await db.query(
        'UPDATE notifications SET type = ?, content = ?, is_read = ? WHERE id = ?',
        [type, content, is_read, req.params.id]
      );
      if (result.affectedRows === 0)
        return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
      res.json({ success: true, message: 'Cập nhật thông báo thành công' });
    } catch (err) {
      console.error('Error updating notification:', err);
      res.status(500).json({ success: false, message: 'Lỗi cập nhật thông báo', error: err.message });
    }
  },

  deleteNotification: async (req, res) => {
    try {
      const [result] = await db.query('DELETE FROM notifications WHERE id = ?', [req.params.id]);
      if (result.affectedRows === 0)
        return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
      res.json({ success: true, message: 'Xóa thông báo thành công' });
    } catch (err) {
      console.error('Error deleting notification:', err);
      res.status(500).json({ success: false, message: 'Lỗi xóa thông báo', error: err.message });
    }
  },

  getUnreadCount: async (req, res) => {
    try {
      console.log(`Handling GET /api/notifications/unread-count for user ${req.user.id}`);
      const [rows] = await db.query(
        'SELECT COUNT(*) as count FROM notifications WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0',
        [req.user.id]
      );
      console.log(`Unread count for user ${req.user.id}: ${rows[0].count}`);
      res.json({ success: true, count: rows[0].count });
    } catch (err) {
      console.error('Error fetching unread count:', err);
      res.status(500).json({ success: false, message: 'Lỗi lấy số lượng thông báo chưa đọc', error: err.message });
    }
  },

  getUserNotifications: async (req, res) => {
    try {
      const { type } = req.query;
      let sql = 'SELECT * FROM notifications WHERE (user_id = ? OR user_id IS NULL)';
      const params = [req.user.id];

      if (type) {
        sql += ' AND type = ?';
        params.push(type);
      }

      sql += ' ORDER BY created_at DESC';

      console.log(`Fetching notifications for user ${req.user.id}`);
      const [notifications] = await db.query(sql, params);
      res.json({ success: true, notifications });
    } catch (err) {
      console.error('Error fetching user notifications:', err);
      res.status(500).json({ success: false, message: 'Lỗi lấy danh sách thông báo', error: err.message });
    }
  },

  markAsRead: async (req, res) => {
    try {
      const [result] = await db.query(
        'UPDATE notifications SET is_read = 1 WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
        [req.params.id, req.user.id]
      );
      if (result.affectedRows === 0)
        return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo hoặc không có quyền' });
      res.json({ success: true, message: 'Đã đánh dấu thông báo là đã đọc' });
    } catch (err) {
      console.error('Error marking notification as read:', err);
      res.status(500).json({ success: false, message: 'Lỗi đánh dấu thông báo', error: err.message });
    }
  },
};