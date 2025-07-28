import React, { useEffect, useState, useCallback } from 'react';
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
  const [availableTeachers, setAvailableTeachers] = useState([]);

  // Hàm fetchAssignments được bao bọc bởi useCallback để tránh tạo lại hàm không cần thiết
  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      // Đã sửa: Thay đổi endpoint từ '/assignments' thành '/exam-assignments'
      const res = await api.get('/exam-assignments');
      setAssignments(res.data.assignments || []);
    } catch (err) {
      toast.error('Lỗi tải danh sách phân công');
      console.error('Lỗi tải danh sách phân công:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExams = useCallback(async () => {
    try {
      const res = await api.get('/exams');
      setExams(res.data.exams || []);
    } catch (err) {
      toast.error('Lỗi tải danh sách kỳ thi');
      console.error('Lỗi tải danh sách kỳ thi:', err);
    }
  }, []);

  // Hàm fetchAvailableTeachers để lấy giáo viên CHƯA được phân công
  const fetchAvailableTeachers = useCallback(async (examId) => {
    if (!examId) {
      setAvailableTeachers([]);
      return;
    }
    try {
      // Đã sửa: Thay đổi endpoint từ '/assignments/available/teachers' thành '/exam-assignments/available/teachers'
      const res = await api.get('/exam-assignments/available/teachers', { params: { exam_id: examId } });
      setAvailableTeachers(res.data.teachers || []);
    } catch (err) {
      toast.error('Lỗi tải danh sách giáo viên khả dụng');
      console.error('Lỗi tải danh sách giáo viên khả dụng:', err);
      setAvailableTeachers([]);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
    fetchExams();
  }, [fetchAssignments, fetchExams]);

  // Xử lý khi mở modal
  const openModal = (assignment = null) => {
    setEditing(assignment);
    setForm(assignment ? { ...assignment } : { exam_id: '', teacher_id: '', notes: '' });
    setShowModal(true);

    if (assignment) {
      fetchAvailableTeachers(assignment.exam_id);
    } else {
      setAvailableTeachers([]);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm({ exam_id: '', teacher_id: '', notes: '' }); // Reset form khi đóng
    setAvailableTeachers([]); // Reset teachers khi đóng modal
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prevForm => ({ ...prevForm, [name]: value }));

    if (name === 'exam_id') {
      fetchAvailableTeachers(value); // Fetch available teachers khi thay đổi exam_id
      // Reset teacher_id nếu exam_id thay đổi và không ở chế độ chỉnh sửa
      if (!editing) {
        setForm(prevForm => ({ ...prevForm, teacher_id: '' }));
      }
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (editing) {
        // Đã sửa: Thay đổi endpoint từ '/assignments/:id' thành '/exam-assignments/:id'
        await api.put(`/exam-assignments/${editing.id}`, form);
        toast.success('Cập nhật phân công thành công');
      } else {
        // Đã sửa: Thay đổi endpoint từ '/assignments' thành '/exam-assignments'
        await api.post('/exam-assignments', form);
        toast.success('Thêm phân công thành công');
      }
      fetchAssignments(); // Refresh danh sách sau khi thêm/sửa
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi lưu phân công');
      console.error('Lỗi lưu phân công:', err);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phân công này không?')) return;
    try {
      // Đã sửa: Thay đổi endpoint từ '/assignments/:id' thành '/exam-assignments/:id'
      await api.delete(`/exam-assignments/${id}`);
      toast.success('Xóa phân công thành công');
      fetchAssignments(); // Refresh danh sách sau khi xóa
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi xóa phân công');
      console.error('Lỗi xóa phân công:', err);
    }
  };

  // Hàm để chuyển đổi trạng thái hiển thị của Badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'assigned':
        return <Badge type="info" text="Đã phân công" />;
      case 'accepted':
        return <Badge type="success" text="Đã chấp nhận" />;
      case 'declined':
        return <Badge type="danger" text="Đã từ chối" />;
      default:
        return <Badge type="secondary" text="Không xác định" />;
    }
  };

  // Hàm định dạng ngày giờ
  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(date);
    } catch (e) {
      console.error("Lỗi định dạng ngày giờ:", e);
      return isoString.slice(0, 19).replace('T', ' ');
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
        <Loading />
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
                      <td className="px-6 py-4 text-sm text-gray-900">{a.notes || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(a.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(a.assigned_at)}
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
            <label htmlFor="exam_id" className="block text-sm font-medium text-gray-700">Kỳ thi</label>
            <select
              id="exam_id"
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
            <label htmlFor="teacher_id" className="block text-sm font-medium text-gray-700">Giáo viên</label>
            <select
              id="teacher_id"
              className="input-field mt-1"
              name="teacher_id"
              value={form.teacher_id}
              onChange={handleChange}
              required
            >
              <option value="">-- Chọn giáo viên --</option>
              {/* Khi chỉnh sửa, đảm bảo giáo viên hiện tại vẫn hiển thị */}
              {editing && !availableTeachers.find(t => t.id === form.teacher_id) && form.teacher_id && (
                <option key={form.teacher_id} value={form.teacher_id}>
                  {editing.teacher_name} (Hiện tại)
                </option>
              )}
              {availableTeachers.map(t => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
            {form.exam_id && availableTeachers.length === 0 && !editing && (
              <p className="mt-2 text-sm text-gray-500">Không có giáo viên khả dụng cho kỳ thi này. Có thể tất cả đã được phân công hoặc không có giáo viên nào.</p>
            )}
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Ghi chú</label>
            <textarea
              id="notes"
              className="input-field mt-1"
              name="notes"
              placeholder="Ghi chú"
              value={form.notes}
              onChange={handleChange}
              rows="3"
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