import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import Loading from '../components/UI/Loading';
import Toast from '../components/UI/Toast';
import Badge from '../components/UI/Badge';

const Exams = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [formData, setFormData] = useState({ name: '', subject: '' });

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const response = await api.get('/exams');
      setExams(response.data.exams);
    } catch (error) {
      toast.error('Lỗi khi tải danh sách kỳ thi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingExam) {
        await api.put(`/exams/${editingExam.id}`, formData);
        toast.success('Cập nhật kỳ thi thành công');
      } else {
        await api.post('/exams', formData);
        toast.success('Tạo kỳ thi thành công');
      }
      setShowModal(false);
      setEditingExam(null);
      setFormData({ name: '', subject: '' });
      fetchExams();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleEdit = (exam) => {
    setEditingExam(exam);
    setFormData({ name: exam.name, subject: exam.subject });
    setShowModal(true);
  };

  const handleDelete = async (examId) => {
    if (window.confirm('Bạn có chắc muốn xóa kỳ thi này?')) {
      try {
        await api.delete(`/exams/${examId}`);
        toast.success('Xóa kỳ thi thành công');
        fetchExams();
      } catch (error) {
        toast.error('Lỗi khi xóa kỳ thi');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý kỳ thi</h1>
          <p className="mt-1 text-sm text-gray-500">
            Tạo và quản lý các kỳ thi trong hệ thống
          </p>
        </div>
        {(user?.role === 'teacher' || user?.role === 'admin') && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo kỳ thi
          </Button>
        )}
      </div>

      {/* Exams List */}
      <div className="card">
        <div className="card-body">
          {exams.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tên kỳ thi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Môn thi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Người tạo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Số đăng ký
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {exams.map((exam) => (
                    <tr key={exam.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {exam.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{exam.subject}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {exam.creator_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="success">{exam.registration_count}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button variant="link" onClick={() => handleEdit(exam)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(user?.role === 'teacher' || user?.role === 'admin') && (
                            <>
                              <Button variant="link" onClick={() => handleEdit(exam)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="link" onClick={() => handleDelete(exam.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Chưa có kỳ thi</h3>
              <p className="mt-1 text-sm text-gray-500">
                Bắt đầu tạo kỳ thi đầu tiên.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingExam(null);
          setFormData({ name: '', subject: '' });
        }}
        title={editingExam ? 'Sửa kỳ thi' : 'Tạo kỳ thi mới'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tên kỳ thi
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field mt-1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Môn thi
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="input-field mt-1"
              required
            />
          </div>
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => {
              setShowModal(false);
              setEditingExam(null);
              setFormData({ name: '', subject: '' });
            }}>
              Hủy
            </Button>
            <Button variant="primary">
              {editingExam ? 'Cập nhật' : 'Tạo'}
            </Button>
          </div>
        </form>
      </Modal>
      <Toast />
    </div>
  );
};

export default Exams; 