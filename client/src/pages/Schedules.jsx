import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { scheduleAPI, examAPI } from '../services/api';
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const Schedules = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    exam_id: '',
    room: '',
    start_time: '',
    end_time: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [schedulesRes, examsRes] = await Promise.all([
        scheduleAPI.getAll(),
        examAPI.getAll()
      ]);
      setSchedules(schedulesRes.data.schedules);
      setExams(examsRes.data.exams);
    } catch (error) {
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSchedule) {
        await scheduleAPI.update(editingSchedule.id, formData);
        toast.success('Cập nhật lịch thi thành công');
      } else {
        await scheduleAPI.create(formData);
        toast.success('Tạo lịch thi thành công');
      }
      setShowModal(false);
      setEditingSchedule(null);
      setFormData({ exam_id: '', room: '', start_time: '', end_time: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      exam_id: schedule.exam_id,
      room: schedule.room,
      start_time: schedule.start_time.slice(0, 16),
      end_time: schedule.end_time.slice(0, 16)
    });
    setShowModal(true);
  };

  const handleDelete = async (scheduleId) => {
    if (window.confirm('Bạn có chắc muốn xóa lịch thi này?')) {
      try {
        await scheduleAPI.delete(scheduleId);
        toast.success('Xóa lịch thi thành công');
        fetchData();
      } catch (error) {
        toast.error('Lỗi khi xóa lịch thi');
      }
    }
  };

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('vi-VN');
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
          <h1 className="text-2xl font-bold text-gray-900">Quản lý lịch thi</h1>
          <p className="mt-1 text-sm text-gray-500">
            Xếp lịch và quản lý thời gian thi
          </p>
        </div>
        {(user?.role === 'teacher' || user?.role === 'admin') && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Tạo lịch thi
          </button>
        )}
      </div>

      {/* Schedules List */}
      <div className="card">
        <div className="card-body">
          {schedules.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kỳ thi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phòng thi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thời gian bắt đầu
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thời gian kết thúc
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {schedules.map((schedule) => (
                    <tr key={schedule.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {schedule.exam_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {schedule.subject}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{schedule.room}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDateTime(schedule.start_time)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDateTime(schedule.end_time)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {(user?.role === 'teacher' || user?.role === 'admin') && (
                            <>
                              <button
                                onClick={() => handleEdit(schedule)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(schedule.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
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
              <p className="mt-1 text-sm text-gray-500">
                Bắt đầu tạo lịch thi đầu tiên.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingSchedule ? 'Sửa lịch thi' : 'Tạo lịch thi mới'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Kỳ thi
                  </label>
                  <select
                    value={formData.exam_id}
                    onChange={(e) => setFormData({ ...formData, exam_id: e.target.value })}
                    className="input-field mt-1"
                    required
                  >
                    <option value="">Chọn kỳ thi</option>
                    {exams.map((exam) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.name} - {exam.subject}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phòng thi
                  </label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="input-field mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Thời gian bắt đầu
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="input-field mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Thời gian kết thúc
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="input-field mt-1"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingSchedule(null);
                      setFormData({ exam_id: '', room: '', start_time: '', end_time: '' });
                    }}
                    className="btn-secondary"
                  >
                    Hủy
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingSchedule ? 'Cập nhật' : 'Tạo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedules; 