import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import socketService from '@/services/socketService';
import { Plus, BookOpen, Eye, CheckCircle, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/UI/Button';
import Modal from '@/components/UI/Modal';
import Loading from '@/components/UI/Loading';
import Badge from '@/components/UI/Badge';

const Exams = () => {
  const { user, loading: authLoading } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [viewingExam, setViewingExam] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const initialForm = {
    code: '',
    name: '',
    description: '',
    subject_code: '',
    subject_name: '',
    exam_type: '',
    semester: '',
    duration_minutes: '',
  };

  const [formData, setFormData] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});

  const [registeredExamIds, setRegisteredExamIds] = useState(new Set());

  const isValidUUID = (str) => {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(str);
  };

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      const examsResponse = await api.get('/exams');
      const fetchedExams = examsResponse.data.exams || [];
      setExams(fetchedExams);

      if (user?.role === 'student' && user?.id) {
        const registeredResponse = await api.get(`/registrations/my-registrations`);
        const registeredRegistrations = registeredResponse.data.registrations || [];
        const registeredIds = new Set(registeredRegistrations.map(reg => reg.exam_id));
        setRegisteredExamIds(registeredIds);
      } else {
        setRegisteredExamIds(new Set());
      }
    } catch (error) {
      console.error('Error fetching exams or registered exams:', error.response?.data || error);
      toast.error(error.response?.data?.message || 'Lỗi khi tải danh sách kỳ thi.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchExams();

      const handleExamCreated = (newExam) => {
        setExams((prev) => [newExam, ...prev]);
        toast.success(`Kỳ thi "${newExam.name}" đã được tạo mới!`);
      };

      const handleExamUpdated = (updatedExam) => {
        setExams((prev) =>
          prev.map((exam) => (exam.id === updatedExam.id ? updatedExam : exam))
        );
        toast.success(`Kỳ thi "${updatedExam.name}" đã được cập nhật.`);
      };

      const handleExamDeleted = ({ id, name }) => {
        setExams((prev) => prev.filter((exam) => exam.id !== id));
        toast.success(`Kỳ thi "${name || 'một kỳ thi'}" đã bị xóa.`);
      };

      const handleExamRegistrationCountUpdated = ({ examId, newCount }) => {
        setExams((prevExams) =>
          prevExams.map((exam) =>
            exam.id === examId ? { ...exam, registration_count: newCount } : exam
          )
        );
      };

      if (socketService.socket && socketService.isConnected) {
        socketService.onExamCreated(handleExamCreated);
        socketService.onExamUpdate(handleExamUpdated);
        socketService.onExamDeleted(handleExamDeleted);
        socketService.onExamRegistrationCountUpdated(handleExamRegistrationCountUpdated);
      } else {
        console.warn('Socket not active in Exams.jsx when attempting to attach listeners.');
      }

      return () => {
        if (socketService.socket) {
          socketService.off('exam-created', handleExamCreated);
          socketService.off('exam-updated', handleExamUpdated);
          socketService.off('exam-deleted', handleExamDeleted);
          socketService.off('exam-registration-count-updated', handleExamRegistrationCountUpdated);
        }
      };
    }
  }, [authLoading, fetchExams, user]);

  const validateForm = () => {
    const errors = {};
    if (!formData.code.trim()) errors.code = 'Mã kỳ thi không được để trống';
    if (!formData.name.trim()) errors.name = 'Tên kỳ thi không được để trống';
    if (!formData.subject_code.trim()) errors.subject_code = 'Mã học phần không được để trống';
    if (!formData.subject_name.trim()) errors.subject_name = 'Tên học phần không được để trống';

    const duration = parseInt(formData.duration_minutes, 10);
    if (isNaN(duration) || duration <= 0) {
      errors.duration_minutes = 'Thời gian thi phải là số nguyên dương';
    }

    if (formData.description && formData.description.length > 1000) {
      errors.description = 'Mô tả tối đa 1000 ký tự';
    }
    if (formData.exam_type && !['Trắc nghiệm', 'Tự luận', 'Trắc nghiệm + Tự luận'].includes(formData.exam_type)) {
      errors.exam_type = 'Hình thức thi không hợp lệ';
    }
    if (formData.semester && formData.semester.length > 20) {
      errors.semester = 'Học kỳ tối đa 20 ký tự';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Vui lòng kiểm tra lại thông tin');
      return;
    }
    try {
      const payload = {
        ...formData,
        duration_minutes: parseInt(formData.duration_minutes, 10),
      };

      if (editingExam) {
        await api.put(`/exams/${editingExam.id}`, payload);
        toast.success('Cập nhật kỳ thi thành công');
      } else {
        await api.post('/exams', payload);
        toast.success('Tạo kỳ thi thành công');
      }

      handleCloseModal();
      fetchExams();
    } catch (error) {
      console.error('Error saving exam:', error.response?.data || error);
      const errorMsg = error.response?.data?.message ||
        (error.response?.data?.errors
          ? error.response.data.errors.map((e) => e.msg).join(', ')
          : 'Có lỗi xảy ra khi lưu kỳ thi');
      toast.error(errorMsg);
    }
  };

  const handleRegisterForExam = async (examId) => {
    if (!user || user.role !== 'student') {
      toast.error('Bạn không có quyền đăng ký kỳ thi.');
      return;
    }
    if (registeredExamIds.has(examId)) {
      toast.info('Bạn đã đăng ký kỳ thi này rồi.');
      return;
    }

    if (!isValidUUID(examId)) {
      console.error('Registration prevented! examId is NOT a valid UUID:', examId);
      toast.error('Lỗi: ID kỳ thi không phải là UUID hợp lệ. Vui lòng tải lại trang hoặc liên hệ hỗ trợ.');
      return;
    }

    try {
      const response = await api.post('/registrations', { exam_id: examId });
      toast.success(response.data.message);
      setRegisteredExamIds((prev) => new Set(prev).add(examId));
    } catch (error) {
      console.error('Error registering for exam:', error.response?.data || error);
      const errorMsg = error.response?.data?.message ||
        (error.response?.data?.errors
          ? error.response.data.errors.map((e) => e.msg).join(', ')
          : 'Lỗi khi đăng ký kỳ thi');
      toast.error(errorMsg);
    }
  };

  const handleViewExam = (exam) => {
    setViewingExam(exam);
    setShowViewModal(true);
  };

  const handleEdit = (exam) => {
    setEditingExam(exam);
    setFormData({
      code: exam.code || '',
      name: exam.name || '',
      description: exam.description || '',
      subject_code: exam.subject_code || '',
      subject_name: exam.subject_name || '',
      exam_type: exam.exam_type || '',
      semester: exam.semester || '',
      duration_minutes: exam.duration_minutes?.toString() || '',
    });
    setShowModal(true);
    setFormErrors({});
  };

  const handleDelete = async (examId) => {
    if (window.confirm('Bạn có chắc muốn xóa kỳ thi này?')) {
      try {
        await api.delete(`/exams/${examId}`);
        toast.success('Xóa kỳ thi thành công');
        fetchExams();
      } catch (error) {
        console.error('Error deleting exam:', error.response?.data || error);
        toast.error(error.response?.data?.message || 'Lỗi khi xóa kỳ thi');
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setFormErrors({ ...formErrors, [name]: '' });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExam(null);
    setFormData(initialForm);
    setFormErrors({});
  };

  if (authLoading || loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý kỳ thi</h1>
          <p className="mt-1 text-sm text-gray-500">Xem và quản lý các kỳ thi trong hệ thống</p>
        </div>
        {user?.role === 'admin' && (
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" /> Tạo kỳ thi
          </Button>
        )}
      </div>

      <div className="card">
        <div className="card-body">
          {exams.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã kỳ thi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên kỳ thi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Học phần</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Học kỳ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian (phút)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số đăng ký</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {exams.map((exam) => (
                    <tr key={exam.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{exam.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exam.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exam.subject_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exam.semester || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exam.duration_minutes}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge type="success" text={exam.registration_count || 0} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button variant="info" onClick={() => handleViewExam(exam)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {user?.role === 'student' && (
                            registeredExamIds.has(exam.id) ? (
                              <Button variant="success" disabled>
                                <CheckCircle className="h-4 w-4 mr-1" /> Đã Đăng Ký
                              </Button>
                            ) : (
                              <Button variant="primary" onClick={() => handleRegisterForExam(exam.id)}>
                                Đăng ký
                              </Button>
                            )
                          )}
                          {user?.role === 'admin' && (
                            <>
                              <Button variant="info" onClick={() => handleEdit(exam)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="danger" onClick={() => handleDelete(exam.id)}>
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
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Chưa có kỳ thi</h3>
              <p className="mt-1 text-sm text-gray-500">
                {user?.role === 'admin' ? 'Bắt đầu tạo kỳ thi đầu tiên.' : 'Không có kỳ thi nào để hiển thị.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title={`Chi tiết kỳ thi: ${viewingExam?.name || ''}`}
      >
        {viewingExam ? (
          <div className="space-y-3 text-sm text-gray-700">
            <p><strong>Mã kỳ thi:</strong> {viewingExam.code}</p>
            <p><strong>Tên kỳ thi:</strong> {viewingExam.name}</p>
            <p><strong>Mô tả:</strong> {viewingExam.description || 'Không có'}</p>
            <p><strong>Mã học phần:</strong> {viewingExam.subject_code}</p>
            <p><strong>Tên học phần:</strong> {viewingExam.subject_name}</p>
            <p><strong>Loại kỳ thi:</strong> {viewingExam.exam_type || 'Không có'}</p>
            <p><strong>Học kỳ:</strong> {viewingExam.semester || 'Không có'}</p>
            <p><strong>Thời gian:</strong> {viewingExam.duration_minutes} phút</p>
            <p><strong>Người tạo:</strong> {viewingExam.creator_name || 'Không rõ'}</p>
            <p><strong>Thời gian tạo:</strong> {new Date(viewingExam.created_at).toLocaleString('vi-VN')}</p>
          </div>
        ) : (
          <p>Không có dữ liệu để hiển thị.</p>
        )}
      </Modal>

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingExam ? 'Sửa kỳ thi' : 'Tạo kỳ thi mới'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">Mã kỳ thi <span className="text-red-500">*</span></label>
              <input
                type="text"
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {formErrors.code && (
                <p className="mt-1 text-sm text-red-600">{formErrors.code}</p>
              )}
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Tên kỳ thi <span className="text-red-500">*</span></label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {formErrors.name && (
                <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Mô tả</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary-500 focus:border-primary-500"
              ></textarea>
              {formErrors.description && (
                <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
              )}
            </div>

            <div>
              <label htmlFor="subject_code" className="block text-sm font-medium text-gray-700">Mã học phần <span className="text-red-500">*</span></label>
              <input
                type="text"
                id="subject_code"
                name="subject_code"
                value={formData.subject_code}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {formErrors.subject_code && (
                <p className="mt-1 text-sm text-red-600">{formErrors.subject_code}</p>
              )}
            </div>

            <div>
              <label htmlFor="subject_name" className="block text-sm font-medium text-gray-700">Tên học phần <span className="text-red-500">*</span></label>
              <input
                type="text"
                id="subject_name"
                name="subject_name"
                value={formData.subject_name}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {formErrors.subject_name && (
                <p className="mt-1 text-sm text-red-600">{formErrors.subject_name}</p>
              )}
            </div>

            <div>
              <label htmlFor="exam_type" className="block text-sm font-medium text-gray-700">Loại kỳ thi</label>
              <select
                id="exam_type"
                name="exam_type"
                value={formData.exam_type}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Chọn loại kỳ thi</option>
                <option value="Trắc nghiệm">Trắc nghiệm</option>
                <option value="Tự luận">Tự luận</option>
                <option value="Trắc nghiệm + Tự luận">Trắc nghiệm + Tự luận</option>
              </select>
              {formErrors.exam_type && (
                <p className="mt-1 text-sm text-red-600">{formErrors.exam_type}</p>
              )}
            </div>

            <div>
              <label htmlFor="semester" className="block text-sm font-medium text-gray-700">Học kỳ</label>
              <input
                type="text"
                id="semester"
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {formErrors.semester && (
                <p className="mt-1 text-sm text-red-600">{formErrors.semester}</p>
              )}
            </div>

            <div>
              <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700">Thời gian thi (phút) <span className="text-red-500">*</span></label>
              <input
                type="number"
                id="duration_minutes"
                name="duration_minutes"
                value={formData.duration_minutes}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {formErrors.duration_minutes && (
                <p className="mt-1 text-sm text-red-600">{formErrors.duration_minutes}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="secondary" onClick={handleCloseModal}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              {editingExam ? 'Cập nhật' : 'Tạo'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Exams;