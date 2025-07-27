import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import Badge from '../components/UI/Badge';
import Select from 'react-select';
import socket from '../services/socket';
import { useAuth } from '../contexts/AuthContext';

const AdminNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ user_ids: [], type: 'system', content: '' });

  useEffect(() => {
    if (!user || !user.id || !user.role) {
      console.error('Invalid user data for socket connection:', user);
      toast.error('Vui lòng đăng nhập lại');
      return;
    }

    console.log('AdminNotifications: User data:', user);
    socket.connect({ id: user.id, role: user.role });
    fetchNotifications();
    fetchUsers();

    socket.onNotificationReceived((data) => {
      console.log('Received notification:', data);
      setNotifications((prev) => [data, ...prev]);
      toast.success('Thông báo mới: ' + data.content);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      console.log('Fetching notifications with token:', localStorage.getItem('token'));
      const res = await api.get('/notifications/admin');
      const data = Array.isArray(res.data) ? res.data : res.data.notifications || [];
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      toast.error(err.response?.data?.message || 'Lỗi tải danh sách thông báo');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      console.log('Fetching users with token:', localStorage.getItem('token'));
      const res = await api.get('/users');
      const data = Array.isArray(res.data) ? res.data : res.data.users || [];
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error(err.response?.data?.message || 'Lỗi tải danh sách người dùng');
    }
  };

  const openModal = (noti = null) => {
    setEditing(noti);
    if (noti) {
      const recipientUser = users.find((u) => u.id === noti.user_id);
      setForm({
        type: noti.type,
        content: noti.content,
        user_ids: recipientUser
          ? [{ value: recipientUser.id, label: recipientUser.name }]
          : [],
      });
    } else {
      setForm({ user_ids: [], type: 'system', content: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm({ user_ids: [], type: 'system', content: '' });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      type: form.type,
      content: form.content,
      user_ids: form.user_ids.map((u) => u.value),
    };

    try {
      let filteredUserIds = payload.user_ids.length > 0
        ? payload.user_ids.filter((id) => {
            const user = users.find((u) => u.id === id);
            return user && (
              form.type === 'assignment'
                ? user.role === 'teacher' // Only teachers for assignments
                : ['teacher', 'student'].includes(user.role) // Teachers and students for others
            );
          })
        : form.type === 'assignment'
          ? users
              .filter((u) => u.role === 'teacher') // Only teachers for assignments
              .map((u) => u.id)
          : users
              .filter((u) => ['teacher', 'student'].includes(u.role)) // All teachers and students
              .map((u) => u.id);

      const sendPayload =
        filteredUserIds.length > 0
          ? { ...payload, user_ids: filteredUserIds }
          : { ...payload, user_ids: undefined };

      console.log('Sending notification payload:', sendPayload);
      if (editing) {
        await api.delete(`/notifications/admin/${editing.id}`);
        await api.post('/notifications/admin', sendPayload);
        toast.success('Cập nhật thông báo thành công');
      } else {
        await api.post('/notifications/admin', sendPayload);
        toast.success('Thêm thông báo thành công');
      }

      socket.emitNotification({
        type: payload.type,
        content: payload.content,
        user_ids: filteredUserIds.length > 0 ? filteredUserIds : [],
      });

      fetchNotifications();
      closeModal();
    } catch (err) {
      console.error('Error saving notification:', err);
      toast.error(err.response?.data?.message || 'Lỗi lưu thông báo');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xác nhận xóa thông báo?')) return;
    try {
      await api.delete(`/notifications/admin/${id}`);
      toast.success('Xóa thông báo thành công');
      fetchNotifications();
    } catch (err) {
      console.error('Error deleting notification:', err);
      toast.error(err.response?.data?.message || 'Lỗi xóa thông báo');
    }
  };

  const groupedUserOptions = [
    {
      label: 'Giáo viên',
      options: users
        .filter((u) => u.role === 'teacher')
        .map((u) => ({ value: u.id, label: u.name || `GV #${u.id}` })),
    },
    {
      label: 'Học sinh',
      options: users
        .filter((u) => u.role === 'student')
        .map((u) => ({ value: u.id, label: u.name || `HS #${u.id}` })),
    },
  ];

  const renderUserLabel = (id) => {
    const user = users.find((u) => u.id === id);
    return user ? user.name : `User #${id}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý thông báo</h1>
          <p className="mt-1 text-sm text-gray-500">Quản lý thông báo trong hệ thống</p>
        </div>
        <Button variant="primary" onClick={() => openModal()}>
          <Plus className="h-4 w-4 mr-2" /> Thêm thông báo
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : notifications.length > 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người nhận</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nội dung</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đã đọc</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {notifications.map((n) => (
                    <tr key={n.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {n.user_id ? renderUserLabel(n.user_id) : 'Tất cả'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{n.type}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{n.content}</td>
                      <td className="px-6 py-4">
                        <Badge variant={n.is_read ? 'success' : 'danger'}>
                          {n.is_read ? 'Đã đọc' : 'Chưa đọc'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {n.created_at?.slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button variant="info" onClick={() => openModal(n)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="danger" onClick={() => handleDelete(n.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <h3 className="mt-2 text-sm font-medium text-gray-900">Chưa có thông báo</h3>
          <p className="mt-1 text-sm text-gray-500">Bắt đầu thêm thông báo đầu tiên.</p>
        </div>
      )}

      <Modal isOpen={showModal} onClose={closeModal} title={editing ? 'Sửa thông báo' : 'Thêm thông báo'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Người nhận</label>
            <Select
              isMulti
              options={groupedUserOptions}
              value={form.user_ids}
              onChange={(val) => setForm({ ...form, user_ids: val })}
              placeholder="Chọn người nhận hoặc để trống để gửi toàn hệ thống"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Loại thông báo</label>
            <select
              className="input-field mt-1"
              name="type"
              value={form.type}
              onChange={handleChange}
              required
            >
              <option value="system">System</option>
              <option value="registration">Registration</option>
              <option value="reminder">Reminder</option>
              <option value="result">Result</option>
              <option value="assignment">Assignment</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nội dung</label>
            <textarea
              className="input-field mt-1"
              name="content"
              placeholder="Nội dung"
              value={form.content}
              onChange={handleChange}
              required
            />
          </div>
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={closeModal}>Hủy</Button>
            <Button variant="primary">{editing ? 'Cập nhật' : 'Thêm'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminNotifications;