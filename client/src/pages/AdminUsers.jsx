import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import Loading from '../components/UI/Loading';
import Toast from '../components/UI/Toast';
import Badge from '../components/UI/Badge';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ username: '', full_name: '', email: '', password: '', phone: '', role: 'student', avatar_url: '' });
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data.users || []);
    } catch (err) {
      setError('Lỗi tải danh sách user');
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const openModal = (user = null) => {
    setEditingUser(user);
    setForm(user ? { ...user, password: '' } : { username: '', full_name: '', email: '', password: '', phone: '', role: 'student', avatar_url: '' });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingUser(null); setError(''); };

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(`/api/users/${editingUser.id}`, form);
      } else {
        await axios.post('/api/users', form);
      }
      fetchUsers();
      closeModal();
    } catch (err) {
      setError('Lỗi lưu user');
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Xác nhận xóa user?')) return;
    try {
      await axios.delete(`/api/users/${id}`);
      fetchUsers();
    } catch (err) {
      setError('Lỗi xóa user');
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Quản lý người dùng</h2>
      <Button onClick={() => openModal()}>Thêm user</Button>
      {loading ? <Loading /> : (
        <table className="w-full border">
          <thead>
            <tr>
              <th>Username</th><th>Họ tên</th><th>Email</th><th>Phone</th><th>Role</th><th>Avatar</th><th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t">
                <td>{u.username}</td>
                <td>{u.full_name}</td>
                <td>{u.email}</td>
                <td>{u.phone}</td>
                <td>{u.role}</td>
                <td>{u.avatar_url && <img src={u.avatar_url} alt="avatar" className="w-8 h-8 rounded-full" />}</td>
                <td>
                  <Button onClick={() => openModal(u)}>Sửa</Button>
                  <Button onClick={() => handleDelete(u.id)}>Xóa</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingUser ? 'Sửa user' : 'Thêm user'}
        onSubmit={handleSubmit}
        submitText={editingUser ? 'Lưu' : 'Thêm'}
        error={error}
      >
        <input className="border p-2 w-full mb-2" name="username" placeholder="Username" value={form.username} onChange={handleChange} required disabled={!!editingUser} />
        <input className="border p-2 w-full mb-2" name="full_name" placeholder="Họ tên" value={form.full_name} onChange={handleChange} required />
        <input className="border p-2 w-full mb-2" name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
        <input className="border p-2 w-full mb-2" name="phone" placeholder="Số điện thoại" value={form.phone} onChange={handleChange} />
        <input className="border p-2 w-full mb-2" name="avatar_url" placeholder="Avatar URL" value={form.avatar_url} onChange={handleChange} />
        <select className="border p-2 w-full mb-2" name="role" value={form.role} onChange={handleChange} required>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
        {!editingUser && <input className="border p-2 w-full mb-2" name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />}
      </Modal>
      <Toast error={error} />
    </div>
  );
};

export default AdminUsers; 