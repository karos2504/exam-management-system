const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');

const notificationController = {
  async getAllNotifications(req, res, next) {
    try {
      const [notifications] = await pool.execute(`
        SELECT n.*, u.full_name AS recipient_name
        FROM notifications n
        LEFT JOIN users u ON n.user_id = u.id
        ORDER BY n.created_at DESC
      `);
      res.json({ success: true, notifications });
    } catch (err) {
      console.error('Error fetching all notifications:', err);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  async createNotification(req, res, next) {
    try {
      const { type, content, user_ids, exam_id } = req.body;
      const notifications = [];

      if (user_ids && user_ids.length > 0) {
        for (const user_id of user_ids) {
          const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [user_id]);
          if (users.length === 0) continue;

          const notificationId = uuidv4();
          await pool.execute(
            'INSERT INTO notifications (id, user_id, type, content, exam_id) VALUES (?, ?, ?, ?, ?)',
            [notificationId, user_id, type, content, exam_id || null]
          );
          notifications.push({ id: notificationId, user_id, type, content, exam_id, created_at: new Date(), is_read: false });
        }
      } else {
        const notificationId = uuidv4();
        await pool.execute(
          'INSERT INTO notifications (id, user_id, type, content, exam_id) VALUES (?, NULL, ?, ?, ?)',
          [notificationId, type, content, exam_id || null]
        );
        notifications.push({ id: notificationId, user_id: null, type, content, exam_id, created_at: new Date(), is_read: false });
      }

      if (req.io) {
        notifications.forEach((notification) => {
          if (notification.user_id) {
            req.io.to(`user-${notification.user_id}`).emit('notification-created', notification);
            console.log(`Sent notification ${notification.id} to user-${notification.user_id}`);
          } else {
            req.io.to('teacher').to('student').emit('notification-created', notification);
            console.log(`Sent notification ${notification.id} to all teachers and students`);
          }
        });
      }

      res.status(201).json({ success: true, message: 'Tạo thông báo thành công', notifications });
    } catch (err) {
      console.error('Error creating notification:', err);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  async getUserNotifications(req, res, next) {
    try {
      const user_id = req.user.id;
      const [notifications] = await pool.execute(
        `SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC`,
        [user_id]
      );
      res.json({ success: true, notifications });
    } catch (err) {
      console.error('Error fetching user notifications:', err);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  async getNotificationById(req, res, next) {
    try {
      const { id } = req.params;
      const [notifications] = await pool.execute(
        'SELECT * FROM notifications WHERE id = ?',
        [id]
      );
      if (notifications.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy thông báo' });
      }
      res.json({ success: true, notification: notifications[0] });
    } catch (err) {
      console.error('Error fetching notification:', err);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  async updateNotification(req, res, next) {
    try {
      const { id } = req.params;
      const { type, content, user_id, exam_id } = req.body;

      const [notifications] = await pool.execute(
        'SELECT * FROM notifications WHERE id = ?',
        [id]
      );
      if (notifications.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy thông báo' });
      }

      await pool.execute(
        'UPDATE notifications SET type = ?, content = ?, user_id = ?, exam_id = ? WHERE id = ?',
        [type, content, user_id || null, exam_id || null, id]
      );

      const [updated] = await pool.execute('SELECT * FROM notifications WHERE id = ?', [id]);

      if (req.io) {
        if (updated[0].user_id) {
          req.io.to(`user-${updated[0].user_id}`).emit('notification-created', updated[0]);
          console.log(`Sent updated notification ${id} to user-${updated[0].user_id}`);
        } else {
          req.io.to('teacher').to('student').emit('notification-created', updated[0]);
          console.log(`Sent updated notification ${id} to all teachers and students`);
        }
      }

      res.json({ success: true, message: 'Cập nhật thông báo thành công', notification: updated[0] });
    } catch (err) {
      console.error('Error updating notification:', err);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  async deleteNotification(req, res, next) {
    try {
      const { id } = req.params;

      const [notifications] = await pool.execute('SELECT * FROM notifications WHERE id = ?', [id]);
      if (notifications.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy thông báo' });
      }

      await pool.execute('DELETE FROM notifications WHERE id = ?', [id]);

      res.json({ success: true, message: 'Xóa thông báo thành công' });
    } catch (err) {
      console.error('Error deleting notification:', err);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  async markAsRead(req, res, next) {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      const [notifications] = await pool.execute(
        'SELECT * FROM notifications WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
        [id, user_id]
      );
      if (notifications.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy thông báo hoặc không có quyền' });
      }

      await pool.execute(
        'UPDATE notifications SET is_read = ? WHERE id = ?',
        [true, id]
      );

      res.json({ success: true, message: 'Đánh dấu thông báo đã đọc' });
    } catch (err) {
      console.error('Error marking notification as read:', err);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  async getUnreadCount(req, res, next) {
    try {
      const user_id = req.user.id;
      const [result] = await pool.execute(
        'SELECT COUNT(*) AS count FROM notifications WHERE (user_id = ? OR user_id IS NULL) AND is_read = ?',
        [user_id, false]
      );
      res.json({ success: true, count: result[0].count });
    } catch (err) {
      console.error('Error fetching unread count:', err);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },
};

module.exports = notificationController;