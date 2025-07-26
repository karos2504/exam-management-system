import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import Loading from '../components/UI/Loading';
import toast from 'react-hot-toast';
import Badge from '../components/UI/Badge';
import { Plus, Edit, Trash2 } from 'lucide-react';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ username: '', full_name: '', email: '', password: '', phone: '', role: 'student', avatar_url: '' });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data.users || []);
    } catch (err) {
      toast.error('Lỗi tải danh sách user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openModal = (user = null) => {
    setEditingUser(user);
    setForm(user ? { ...user, password: '' } : { username: '', full_name: '', email: '', password: '', phone: '', role: 'student', avatar_url: '' });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingUser(null); };

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, form);
        toast.success('Cập nhật user thành công');
      } else {
        await api.post('/users', form);
        toast.success('Thêm user thành công');
      }
      fetchUsers();
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi lưu user');
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Xác nhận xóa user?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Xóa user thành công');
      fetchUsers();
    } catch (err) {
      toast.error('Lỗi xóa user');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h1>
          <p className="mt-1 text-sm text-gray-500">Quản lý thông tin người dùng trong hệ thống</p>
        </div>
        <Button variant="primary" onClick={() => openModal()}>
          <Plus className="h-4 w-4 mr-2" /> Thêm người dùng
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : users.length > 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Họ tên</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số điện thoại</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vai trò</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avatar</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.full_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.phone}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={u.role === 'admin' ? 'danger' : u.role === 'teacher' ? 'warning' : 'success'}>
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.avatar_url && <img src={u.avatar_url} alt="avatar" className="w-8 h-8 rounded-full" />}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button variant="info" onClick={() => openModal(u)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="danger" onClick={() => handleDelete(u.id)}><Trash2 className="h-4 w-4" /></Button>
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
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Chưa có người dùng</h3>
          <p className="mt-1 text-sm text-gray-500">Bắt đầu thêm người dùng đầu tiên.</p>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingUser ? 'Sửa người dùng' : 'Thêm người dùng'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input
              className="input-field mt-1"
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              required
              disabled={!!editingUser}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Họ tên</label>
            <input
              className="input-field mt-1"
              name="full_name"
              placeholder="Họ tên"
              value={form.full_name}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              className="input-field mt-1"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
            <input
              className="input-field mt-1"
              name="phone"
              placeholder="Số điện thoại"
              value={form.phone}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Avatar URL</label>
            <input
              className="input-field mt-1"
              name="avatar_url"
              placeholder="Avatar URL"
              value={form.avatar_url}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Vai trò</label>
            <select
              className="input-field mt-1"
              name="role"
              value={form.role}
              onChange={handleChange}
              required
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {!editingUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
              <input
                className="input-field mt-1"
                name="password"
                type="password"
                placeholder="Mật khẩu"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>
          )}
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={closeModal}>Hủy</Button>
            <Button variant="primary">{editingUser ? 'Cập nhật' : 'Thêm'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminUsers;