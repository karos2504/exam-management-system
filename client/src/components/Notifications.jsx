import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notifications/user');
        setNotifications(response.data.notifications);
      } catch (err) {
        console.error('Error fetching notifications:', err);
        toast.error('Không thể tải thông báo');
      }
    };
    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/mark-read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      toast.success('Đã đánh dấu là đã đọc');
    } catch (err) {
      console.error('Error marking notification as read:', err);
      toast.error('Không thể đánh dấu là đã đọc');
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Thông báo</h1>
      {notifications.length === 0 ? (
        <p>Không có thông báo nào.</p>
      ) : (
        notifications.map((n) => (
          <div key={n.id} className="border-b py-2 flex justify-between items-center">
            <div>
              <p className="font-medium">{n.content}</p>
              <p className="text-sm text-gray-500">{new Date(n.created_at).toLocaleString()}</p>
            </div>
            {!n.is_read && (
              <button
                onClick={() => markAsRead(n.id)}
                className="text-blue-600 hover:underline text-sm"
              >
                Đánh dấu là đã đọc
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default Notifications;