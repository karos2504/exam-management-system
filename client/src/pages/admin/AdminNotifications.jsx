import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/UI/Button';
import Modal from '../../components/UI/Modal';
import Badge from '../../components/UI/Badge';
import Select from 'react-select';
import socket from '../../services/socketService'; // Import the socket service
import { useAuth } from '../../contexts/AuthContext';

const AdminNotifications = () => {
  const { user } = useAuth(); // Get user from AuthContext
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ user_ids: [], type: 'system', content: '', exam_id: '' });

  // Use this useEffect for data fetching and attaching/detaching specific socket listeners
  useEffect(() => {
    // Only proceed if user data is available (meaning AuthContext has authenticated)
    if (!user || !user.id || !user.role) {
      console.warn('AdminNotifications: User data not available. Skipping fetches and socket listeners.');
      // You might want to redirect to login or show a "please log in" message here
      return;
    }

    console.log('AdminNotifications: User data available for fetching:', user);

    // Fetch initial data
    fetchNotifications();
    fetchUsers();
    fetchExams();

    // Set up socket listener specific to this component
    const handleNewNotification = (data) => {
      console.log('Received notification in AdminNotifications:', data);
      setNotifications((prev) => [data, ...prev]);
      toast.success('Thông báo mới: ' + data.content);
    };

    // Attach listener only if the socket instance exists and is connected
    // The connection is handled by AuthContext, so we just check its state here.
    if (socket.socket && socket.isConnected) {
      socket.onNotificationReceived(handleNewNotification);
    } else {
      console.warn('Socket not active in AdminNotifications when attempting to attach listener. It might connect shortly.');
      // This warning might appear briefly if AuthContext is still initializing the socket.
      // In most cases, it will connect quickly.
    }

    // Cleanup function: remove this component's specific socket listener
    return () => {
      if (socket.socket) {
        socket.off('notification-created', handleNewNotification);
      }
    };
  }, [user]); // Re-run this effect when the 'user' object from AuthContext changes

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

  const fetchExams = async () => {
    try {
      const res = await api.get('/exams');
      const data = Array.isArray(res.data.exams) ? res.data.exams : [];
      setExams(data);
    } catch (err) {
      console.error('Error fetching exams:', err);
      toast.error(err.response?.data?.message || 'Lỗi tải danh sách kỳ thi');
    }
  };

  const openModal = (noti = null) => {
    setEditing(noti);
    if (noti) {
      // Find the specific user(s) for the notification if user_id is present
      const recipientUsers = noti.user_id
        ? users.filter(u => u.id === noti.user_id).map((u) => ({ value: u.id, label: u.full_name || u.username }))
        : [];
      setForm({
        type: noti.type,
        content: noti.content,
        user_ids: recipientUsers,
        exam_id: noti.exam_id || '',
      });
    } else {
      setForm({ user_ids: [], type: 'system', content: '', exam_id: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm({ user_ids: [], type: 'system', content: '', exam_id: '' });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      type: form.type,
      content: form.content,
      // Map selected user_ids to their values. If no users selected, send an empty array.
      user_ids: form.user_ids.map((u) => u.value),
      exam_id: form.exam_id || undefined, // Send undefined if empty string
    };

    try {
      console.log('Sending notification payload to API:', payload);
      let response;
      if (editing) {
        // Assuming your backend handles updates either via PUT/PATCH or delete+create
        // If your backend has a PUT/PATCH, use that instead of delete+create for actual updates
        // For now, keeping your existing delete then create logic:
        await api.delete(`/notifications/admin/${editing.id}`);
        response = await api.post('/notifications/admin', payload);
        toast.success('Cập nhật thông báo thành công');
      } else {
        response = await api.post('/notifications/admin', payload);
        toast.success('Thêm thông báo thành công');
      }

      // Emit to Socket.IO for real-time update
      // The backend Socket.IO server should handle the actual fan-out to specific rooms.
      socket.emitNotification({
        type: payload.type,
        content: payload.content,
        user_ids: payload.user_ids, // Send the IDs chosen by the admin
        exam_id: payload.exam_id,
        // Include the ID of the notification if your backend returns it on creation
        // and you want to ensure the received notification has it for proper rendering/updates
        id: response.data.notification?.id || Math.random().toString(36).substring(2, 15), // Fallback if ID isn't returned
        created_at: new Date().toISOString(), // Or get from response if backend returns
        is_read: false, // New notifications are initially unread
      });

      fetchNotifications(); // Re-fetch to update the list from the database
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
      fetchNotifications(); // Re-fetch to update the list
    } catch (err) {
      console.error('Error deleting notification:', err);
      toast.error(err.response?.data?.message || 'Lỗi xóa thông báo');
    }
  };

  // Improved user options for the Select component
  const groupedUserOptions = [
    {
      label: 'Giáo viên',
      options: users
        .filter((u) => u.role === 'teacher')
        .map((u) => ({ value: u.id, label: u.full_name || u.username || `GV #${u.id}` })),
    },
    {
      label: 'Học sinh',
      options: users
        .filter((u) => u.role === 'student')
        .map((u) => ({ value: u.id, label: u.full_name || u.username || `HS #${u.id}` })),
    },
    {
      label: 'Quản trị viên',
      options: users
        .filter((u) => u.role === 'admin')
        .map((u) => ({ value: u.id, label: u.full_name || u.username || `Admin #${u.id}` })),
    },
  ];

  const examOptions = exams.map((exam) => ({
    value: exam.id,
    label: `${exam.name} (${exam.code})`,
  }));

  const renderUserLabel = (id) => {
    const foundUser = users.find((u) => u.id === id);
    return foundUser ? (foundUser.full_name || foundUser.username || `User #${id}`) : `User #${id}`;
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kỳ thi</th>
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
                        {n.user_id ? renderUserLabel(n.user_id) : 'Tất cả (Hệ thống)'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{n.type}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {n.exam_id ? exams.find((e) => e.id === n.exam_id)?.name || 'N/A' : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{n.content}</td>
                      <td className="px-6 py-4">
                        <Badge type={n.is_read ? 'success' : 'danger'}
                          text={n.is_read ? 'Đã đọc' : 'Chưa đọc'}
                        />
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
            <label className="block text-sm font-medium text-gray-700">Kỳ thi (nếu có)</label>
            <Select
              options={examOptions}
              value={examOptions.find((option) => option.value === form.exam_id) || null}
              onChange={(val) => setForm({ ...form, exam_id: val ? val.value : '' })}
              placeholder="Chọn kỳ thi (tùy chọn)"
              isClearable
            />
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