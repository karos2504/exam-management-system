import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import Loading from '../components/UI/Loading';
import Toast from '../components/UI/Toast';
import Badge from '../components/UI/Badge';

const AdminNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ user_ids: '', type: 'system', content: '' });
  const [error, setError] = useState('');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
    } catch (err) {
      setError('Lỗi tải danh sách thông báo');
    }
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, []);

  const openModal = (noti = null) => {
    setEditing(noti);
    setForm(noti ? { ...noti, user_ids: noti.user_id } : { user_ids: '', type: 'system', content: '' });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); setError(''); };
  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/notifications/${editing.id}`, form);
      } else {
        let user_ids = form.user_ids.split(',').map(s => s.trim()).filter(Boolean);
        await api.post('/notifications', { ...form, user_ids: user_ids.length ? user_ids : undefined });
      }
      fetchNotifications();
      closeModal();
    } catch (err) {
      setError('Lỗi lưu thông báo');
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Xác nhận xóa thông báo?')) return;
    try {
      await api.delete(`/notifications/${id}`);
      fetchNotifications();
    } catch (err) {
      setError('Lỗi xóa thông báo');
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Quản lý thông báo</h2>
      <Button onClick={() => openModal()}>Thêm thông báo</Button>
      {loading ? <Loading /> : (
        <table className="w-full border">
          <thead>
            <tr>
              <th>Người nhận</th><th>Loại</th><th>Nội dung</th><th>Đã đọc</th><th>Thời gian</th><th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map(n => (
              <tr key={n.id} className="border-t">
                <td>{n.user_id}</td>
                <td>{n.type}</td>
                <td>{n.content}</td>
                <td>{n.is_read ? <Badge variant="success">Đã đọc</Badge> : <Badge variant="danger">Chưa đọc</Badge>}</td>
                <td>{n.created_at && n.created_at.slice(0, 19).replace('T', ' ')}</td>
                <td>
                  <Button variant="info" onClick={() => openModal(n)}>Sửa</Button>
                  <Button variant="danger" onClick={() => handleDelete(n.id)}>Xóa</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editing ? 'Sửa thông báo' : 'Thêm thông báo'}
        onSubmit={handleSubmit}
        submitText={editing ? 'Lưu' : 'Thêm'}
      >
        <form onSubmit={handleSubmit}>
          <input className="border p-2 w-full mb-2" name="user_ids" placeholder="ID người nhận (cách nhau dấu phẩy, để trống gửi toàn hệ thống)" value={form.user_ids} onChange={handleChange} />
          <select className="border p-2 w-full mb-2" name="type" value={form.type} onChange={handleChange} required>
            <option value="system">System</option>
            <option value="registration">Registration</option>
            <option value="reminder">Reminder</option>
            <option value="result">Result</option>
            <option value="assignment">Assignment</option>
            <option value="other">Other</option>
          </select>
          <textarea className="border p-2 w-full mb-2" name="content" placeholder="Nội dung" value={form.content} onChange={handleChange} required />
          {error && <Toast variant="danger">{error}</Toast>}
        </form>
      </Modal>
    </div>
  );
};

export default AdminNotifications; 