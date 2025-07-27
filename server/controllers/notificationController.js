const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  getUnreadCount: async (req, res) => {
    try {
      console.log(`Executing getUnreadCount for user: ${req.user.id}`);
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
      console.log(`Executing getUserNotifications for user: ${req.user.id}`, { sql, params });
      const [notifications] = await db.query(sql, params);
      res.json({ success: true, notifications });
    } catch (err) {
      console.error('Error fetching user notifications:', err);
      res.status(500).json({ success: false, message: 'Lỗi lấy danh sách thông báo', error: err.message });
    }
  },

  getAllNotifications: async (req, res) => {
    try {
      console.log(`Executing getAllNotifications for user: ${req.user.id}`);
      const [notifications] = await db.query('SELECT * FROM notifications ORDER BY created_at DESC');
      res.json({ success: true, notifications });
    } catch (err) {
      console.error('Error fetching all notifications:', err);
      res.status(500).json({ success: false, message: 'Lỗi lấy danh sách thông báo', error: err.message });
    }
  },

  createNotification: async (req, res) => {
    try {
      const { type, content, user_ids } = req.body;
      if (!type || !content) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
      }
      const notifications = [];
      if (user_ids && user_ids.length > 0) {
        for (const user_id of user_ids) {
          const [rows] = await db.query('SELECT id FROM users WHERE id = ? AND role IN (?, ?)', [user_id, 'teacher', 'student']);
          if (rows.length === 0) {
            console.warn(`Invalid user_id: ${user_id}`);
            continue;
          }
          const notification = {
            id: uuidv4(),
            type,
            content,
            user_id,
            created_at: new Date(),
            is_read: false,
          };
          await db.query('INSERT INTO notifications SET ?', notification);
          notifications.push(notification);
          console.log(`Created notification ${notification.id} for user-${user_id}`);
          req.io.to(`user-${user_id}`).emit('notification-created', notification);
        }
      } else {
        const notification = {
          id: uuidv4(),
          type,
          content,
          user_id: null,
          created_at: new Date(),
          is_read: false,
        };
        await db.query('INSERT INTO notifications SET ?', notification);
        notifications.push(notification);
        console.log(`Created notification ${notification.id} for all users`);
        req.io.to('teacher').to('student').emit('notification-created', notification);
      }
      res.json({ success: true, notifications });
    } catch (err) {
      console.error('Error creating notification:', err);
      res.status(500).json({ success: false, message: 'Lỗi tạo thông báo', error: err.message });
    }
  },

  getNotificationById: async (req, res) => {
    try {
      const { id } = req.params;
      const [notifications] = await db.query('SELECT * FROM notifications WHERE id = ?', [id]);
      if (notifications.length === 0) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
      }
      res.json({ success: true, notification: notifications[0] });
    } catch (err) {
      console.error('Error fetching notification:', err);
      res.status(500).json({ success: false, message: 'Lỗi lấy thông báo', error: err.message });
    }
  },

  updateNotification: async (req, res) => {
    try {
      const { id } = req.params;
      const { type, content, user_id } = req.body;
      const [notifications] = await db.query('SELECT * FROM notifications WHERE id = ?', [id]);
      if (notifications.length === 0) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
      }
      const updates = { type, content, user_id };
      await db.query('UPDATE notifications SET ? WHERE id = ?', [updates, id]);
      const [updated] = await db.query('SELECT * FROM notifications WHERE id = ?', [id]);
      res.json({ success: true, notification: updated[0] });
    } catch (err) {
      console.error('Error updating notification:', err);
      res.status(500).json({ success: false, message: 'Lỗi cập nhật thông báo', error: err.message });
    }
  },

  deleteNotification: async (req, res) => {
    try {
      const { id } = req.params;
      const [notifications] = await db.query('SELECT * FROM notifications WHERE id = ?', [id]);
      if (notifications.length === 0) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
      }
      await db.query('DELETE FROM notifications WHERE id = ?', [id]);
      res.json({ success: true, message: 'Xóa thông báo thành công' });
    } catch (err) {
      console.error('Error deleting notification:', err);
      res.status(500).json({ success: false, message: 'Lỗi xóa thông báo', error: err.message });
    }
  },

  markAsRead: async (req, res) => {
    try {
      const { id } = req.params;
      const [notifications] = await db.query('SELECT * FROM notifications WHERE id = ? AND (user_id = ? OR user_id IS NULL)', [id, req.user.id]);
      if (notifications.length === 0) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
      }
      await db.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
      res.json({ success: true, message: 'Đánh dấu đã đọc thành công' });
    } catch (err) {
      console.error('Error marking notification as read:', err);
      res.status(500).json({ success: false, message: 'Lỗi đánh dấu đã đọc', error: err.message });
    }
  },
};