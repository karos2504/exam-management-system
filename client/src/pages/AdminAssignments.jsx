import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import Loading from '../components/UI/Loading';
import Badge from '../components/UI/Badge';

const AdminAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ exam_id: '', teacher_id: '', notes: '' });
  const [exams, setExams] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/assignments');
      setAssignments(res.data.assignments || []);
    } catch (err) {
      toast.error('Lỗi tải danh sách phân công');
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      const res = await api.get('/exams');
      setExams(res.data.exams || []);
    } catch (err) {
      toast.error('Lỗi tải danh sách kỳ thi');
    }
  };

  const fetchTeachers = async (exam_id) => {
    try {
      const res = await api.get('/assignments/available/teachers', { params: { exam_id } });
      setTeachers(res.data.teachers || []);
    } catch (err) {
      toast.error('Lỗi tải danh sách giáo viên');
    }
  };

  useEffect(() => { fetchAssignments(); fetchExams(); }, []);

  const openModal = (assignment = null) => {
    setEditing(assignment);
    setForm(assignment ? { ...assignment } : { exam_id: '', teacher_id: '', notes: '' });
    setShowModal(true);
    if (!assignment) setTeachers([]);
    if (assignment && assignment.exam_id) fetchTeachers(assignment.exam_id);
  };

  const closeModal = () => { setShowModal(false); setEditing(null); };

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === 'exam_id') fetchTeachers(e.target.value);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/assignments/${editing.id}`, form);
        toast.success('Cập nhật phân công thành công');
      } else {
        await api.post('/assignments', form);
        toast.success('Thêm phân công thành công');
      }
      fetchAssignments();
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi lưu phân công');
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Xác nhận xóa phân công?')) return;
    try {
      await api.delete(`/assignments/${id}`);
      toast.success('Xóa phân công thành công');
      fetchAssignments();
    } catch (err) {
      toast.error('Lỗi xóa phân công');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý phân công giáo viên</h1>
          <p className="mt-1 text-sm text-gray-500">Quản lý phân công giáo viên cho các kỳ thi</p>
        </div>
        <Button variant="primary" onClick={() => openModal()}>
          <Plus className="h-4 w-4 mr-2" /> Thêm phân công
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : assignments.length > 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kỳ thi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giáo viên</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người phân công</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ghi chú</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignments.map(a => (
                    <tr key={a.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{a.exam_name} ({a.subject_code})</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{a.teacher_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{a.assigned_by_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{a.notes}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={a.status === 'active' ? 'success' : 'warning'}>{a.status}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {a.assigned_at && a.assigned_at.slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button variant="info" onClick={() => openModal(a)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="danger" onClick={() => handleDelete(a.id)}><Trash2 className="h-4 w-4" /></Button>
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">Chưa có phân công</h3>
          <p className="mt-1 text-sm text-gray-500">Bắt đầu thêm phân công đầu tiên.</p>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editing ? 'Sửa phân công' : 'Thêm phân công'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Kỳ thi</label>
            <select
              className="input-field mt-1"
              name="exam_id"
              value={form.exam_id}
              onChange={handleChange}
              required
              disabled={!!editing}
            >
              <option value="">-- Chọn kỳ thi --</option>
              {exams.map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.subject_code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Giáo viên</label>
            <select
              className="input-field mt-1"
              name="teacher_id"
              value={form.teacher_id}
              onChange={handleChange}
              required
            >
              <option value="">-- Chọn giáo viên --</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Ghi chú</label>
            <input
              className="input-field mt-1"
              name="notes"
              placeholder="Ghi chú"
              value={form.notes}
              onChange={handleChange}
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

export default AdminAssignments;