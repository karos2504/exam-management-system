// src/components/Schedules.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import socketService from '@/services/socket';
import { Plus, BookOpen, Edit, Trash2, Calendar, Eye } from 'lucide-react';
import toast from 'react-hot-toast'; // Đã có react-hot-toast
import Button from '@/components/UI/Button';
import Modal from '@/components/UI/Modal';
import Loading from '@/components/UI/Loading';
// import Toast from '@/components/UI/Toast'; // <--- XÓA DÒNG NÀY ĐI
import Badge from '@/components/UI/Badge';

const Schedules = () => {
  const { user, loading: authLoading } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [viewingSchedule, setViewingSchedule] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const [formData, setFormData] = useState({
    exam_id: '',
    room: '',
    start_time: '',
    end_time: '',
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (!authLoading) {
      fetchData();
      socketService.onScheduleUpdate((updatedSchedule) => {
        setSchedules((prev) =>
          prev.map((sched) => (sched.id === updatedSchedule.id ? updatedSchedule : sched))
        );
        toast.success(`Lịch thi ${updatedSchedule.room} đã được cập nhật`);
      });
    }
    return () => socketService.removeAllListeners();
  }, [authLoading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedulesRes, examsRes] = await Promise.all([
        api.get('/schedules'),
        api.get('/exams'),
      ]);
      setSchedules(schedulesRes.data.schedules || []);
      setExams(examsRes.data.exams || []);
    } catch (error) {
      console.error('Error fetching data:', error.response?.data || error);
      toast.error(error.response?.data?.message || 'Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const checkScheduleConflict = async () => {
    try {
      const { room, start_time, end_time } = formData;
      const exclude_id = editingSchedule ? editingSchedule.id : undefined;
      // Make sure your backend endpoint is correct here (e.g., /schedules/check-conflict)
      const response = await api.get('/schedules/check-conflict', { // Removed /api/ from path
        params: { room, start_time, end_time, exclude_id },
      });
      if (response.data.has_conflict) {
        return response.data.conflicts;
      }
      return [];
    } catch (error) {
      console.error('Error checking schedule conflict:', error.response?.data || error);
      return [];
    }
  };

  const validateForm = async () => {
    const errors = {};
    if (!formData.exam_id) errors.exam_id = 'Vui lòng chọn kỳ thi';
    if (!formData.room) errors.room = 'Phòng thi không được để trống';
    else if (formData.room.length > 50) errors.room = 'Phòng thi tối đa 50 ký tự';
    if (!formData.start_time) errors.start_time = 'Thời gian bắt đầu không được để trống';
    if (!formData.end_time) errors.end_time = 'Thời gian kết thúc không được để trống';
    if (formData.start_time && formData.end_time) {
      const start = new Date(formData.start_time);
      const end = new Date(formData.end_time);
      if (end <= start) errors.end_time = 'Thời gian kết thúc phải sau thời gian bắt đầu';
    }

    const conflicts = await checkScheduleConflict();
    if (conflicts.length > 0) {
      errors.conflict = `Phòng thi đã được sử dụng trong khoảng thời gian này: ${conflicts
        .map((c) => `${c.exam_name} (${formatDateTime(c.start_time)} - ${formatDateTime(c.end_time)})`)
        .join(', ')}`; // Format conflict times for better readability
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!(await validateForm())) {
      toast.error(formErrors.conflict || 'Vui lòng kiểm tra lại thông tin');
      return;
    }
    try {
      const payload = { ...formData };
      let response;
      if (editingSchedule) {
        // Make sure your backend endpoint is correct here (e.g., /schedules/:id)
        response = await api.put(`/schedules/${editingSchedule.id}`, payload); // Removed /api/ from path
        socketService.emitScheduleUpdate(response.data.schedule);
        toast.success('Cập nhật lịch thi thành công');
      } else {
        // Make sure your backend endpoint is correct here (e.g., /schedules)
        response = await api.post('/schedules', payload); // Removed /api/ from path
        socketService.emitScheduleUpdate(response.data.schedule);
        toast.success('Tạo lịch thi thành công');
      }
      setShowModal(false);
      setEditingSchedule(null);
      setFormData({ exam_id: '', room: '', start_time: '', end_time: '' });
      setFormErrors({});
      fetchData();
    } catch (error) {
      console.error('Error saving schedule:', error.response?.data || error);
      const errorMsg = error.response?.data?.message ||
        (error.response?.data?.errors
          ? error.response.data.errors.map((e) => e.msg).join(', ')
          : 'Có lỗi xảy ra khi lưu lịch thi');
      toast.error(errorMsg);
    }
  };

  const handleViewSchedule = (schedule) => {
    setViewingSchedule(schedule);
    setShowViewModal(true);
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      exam_id: schedule.exam_id,
      room: schedule.room,
      start_time: schedule.start_time ? schedule.start_time.slice(0, 16) : '', // Ensure start_time exists before slicing
      end_time: schedule.end_time ? schedule.end_time.slice(0, 16) : '', // Ensure end_time exists before slicing
    });
    setShowModal(true);
    setFormErrors({});
  };

  const handleDelete = async (scheduleId) => {
    if (window.confirm('Bạn có chắc muốn xóa lịch thi này?')) {
      try {
        // Make sure your backend endpoint is correct here (e.g., /schedules/:id)
        await api.delete(`/schedules/${scheduleId}`); // Removed /api/ from path
        toast.success('Xóa lịch thi thành công');
        fetchData();
      } catch (error) {
        console.error('Error deleting schedule:', error.response?.data || error);
        toast.error(error.response?.data?.message || 'Lỗi khi xóa lịch thi');
      }
    }
  };

  // Removed handleView as it was replaced by handleViewSchedule with modal
  // const handleView = (schedule) => {
  //   toast.info(`Xem chi tiết lịch thi: ${schedule.exam_name} - ${schedule.room}`);
  // };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return ''; // Handle null or undefined dateTime
    return new Date(dateTime).toLocaleString('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  if (authLoading || loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý lịch thi</h1>
          <p className="mt-1 text-sm text-gray-500">Xếp lịch và quản lý thời gian thi</p>
        </div>
        {(user?.role === 'teacher' || user?.role === 'admin') && (
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" /> Tạo lịch thi
          </Button>
        )}
      </div>

      <div className="card">
        <div className="card-body">
          {schedules.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 sm:table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kỳ thi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phòng thi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian bắt đầu</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian kết thúc</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {schedules.map((schedule) => (
                    <tr key={schedule.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{schedule.exam_name}</div>
                        <div className="text-sm text-gray-500">{schedule.subject_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{schedule.room}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDateTime(schedule.start_time)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDateTime(schedule.end_time)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button variant="info" onClick={() => handleViewSchedule(schedule)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(user?.role === 'teacher' || user?.role === 'admin') && (
                            <>
                              <Button variant="info" onClick={() => handleEdit(schedule)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="danger" onClick={() => handleDelete(schedule.id)}>
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
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Chưa có lịch thi</h3>
              <p className="mt-1 text-sm text-gray-500">Bắt đầu tạo lịch thi đầu tiên.</p>
            </div>
          )}
        </div>
      </div>
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title={`Chi tiết lịch thi`}
      >
        {viewingSchedule ? (
          <div className="space-y-3 text-sm text-gray-700">
            <p><strong>Kỳ thi:</strong> {viewingSchedule.exam_name}</p>
            <p><strong>Học phần:</strong> {viewingSchedule.subject_name}</p>
            <p><strong>Phòng thi:</strong> {viewingSchedule.room}</p>
            <p><strong>Thời gian bắt đầu:</strong> {formatDateTime(viewingSchedule.start_time)}</p>
            <p><strong>Thời gian kết thúc:</strong> {formatDateTime(viewingSchedule.end_time)}</p>
            <p><strong>Mã lịch thi:</strong> {viewingSchedule.id}</p>
          </div>
        ) : (
          <p>Không có dữ liệu.</p>
        )}
      </Modal>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingSchedule(null);
          setFormData({ exam_id: '', room: '', start_time: '', end_time: '' });
          setFormErrors({});
        }}
        title={editingSchedule ? 'Sửa lịch thi' : 'Tạo lịch thi mới'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Kỳ thi</label>
            <select
              name="exam_id"
              value={formData.exam_id}
              onChange={(e) => setFormData({ ...formData, exam_id: e.target.value })}
              className={`input-field mt-1 ${formErrors.exam_id ? 'border-red-500' : ''}`}
            >
              <option value="">Chọn kỳ thi</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name} - {exam.subject_name}
                </option>
              ))}
            </select>
            {formErrors.exam_id && <p className="text-red-500 text-sm mt-1">{formErrors.exam_id}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phòng thi</label>
            <input
              type="text"
              name="room"
              value={formData.room}
              onChange={(e) => setFormData({ ...formData, room: e.target.value })}
              className={`input-field mt-1 ${formErrors.room ? 'border-red-500' : ''}`}
              maxLength={50}
            />
            {formErrors.room && <p className="text-red-500 text-sm mt-1">{formErrors.room}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Thời gian bắt đầu</label>
            <input
              type="datetime-local"
              name="start_time"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              className={`input-field mt-1 ${formErrors.start_time ? 'border-red-500' : ''}`}
            />
            {formErrors.start_time && <p className="text-red-500 text-sm mt-1">{formErrors.start_time}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Thời gian kết thúc</label>
            <input
              type="datetime-local"
              name="end_time"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              className={`input-field mt-1 ${formErrors.end_time ? 'border-red-500' : ''}`}
            />
            {formErrors.end_time && <p className="text-red-500 text-sm mt-1">{formErrors.end_time}</p>}
          </div>
          {formErrors.conflict && <p className="text-red-500 text-sm mt-1">{formErrors.conflict}</p>}
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                setEditingSchedule(null);
                setFormData({ exam_id: '', room: '', start_time: '', end_time: '' });
                setFormErrors({});
              }}
            >
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              {editingSchedule ? 'Cập nhật' : 'Tạo'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Schedules;