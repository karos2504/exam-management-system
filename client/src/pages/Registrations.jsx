import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { CheckCircle, XCircle, Users, Eye, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import Loading from '../components/UI/Loading';
import Toast from '../components/UI/Toast';
import Badge from '../components/UI/Badge'; // Make sure this import is present

const Registrations = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  // State for potential modal for rejection/cancellation details
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [currentRegistrationToReject, setCurrentRegistrationToReject] = useState(null);

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      fetchRegistrations(selectedExam);
    }
  }, [selectedExam]);

  const fetchExams = async () => {
    try {
      const response = await api.get('/exams');
      setExams(response.data.exams);
      if (response.data.exams.length > 0) {
        setSelectedExam(response.data.exams[0].id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách kỳ thi.');
      setLoading(false);
    }
  };

  const fetchRegistrations = async (examId) => {
    setLoading(true);
    try {
      const response = await api.get(`/registrations/exam/${examId}`);
      setRegistrations(response.data.registrations);
    } catch (error) {
      toast.error('Lỗi khi tải danh sách đăng ký.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRegistrationStatus = async (registrationId, newStatus) => {
    try {
      await api.put(`/registrations/${registrationId}/status`, { status: newStatus });
      toast.success(`Cập nhật trạng thái thành công: ${newStatus === 'approved' ? 'Đã xác nhận' : newStatus === 'rejected' ? 'Đã từ chối' : 'Đã hủy'}`);
      fetchRegistrations(selectedExam);
    } catch (error) {
      toast.error(`Lỗi khi cập nhật trạng thái: ${error.response?.data?.message || error.message}`);
    }
  };

  // --- START OF THE CRUCIAL CHANGE ---
  const getStatusBadge = (status) => {
    let badgeText = '';
    let badgeType = 'default'; // default to gray if no match

    switch (status) {
      case 'pending':
        badgeText = 'Chờ xác nhận';
        badgeType = 'warning'; // Maps to yellow in your Badge component
        break;
      case 'approved':
        badgeText = 'Đã xác nhận';
        badgeType = 'success'; // Maps to green in your Badge component
        break;
      case 'rejected':
        badgeText = 'Đã từ chối';
        badgeType = 'error'; // Maps to red in your Badge component
        break;
      case 'cancelled':
        badgeText = 'Đã hủy';
        badgeType = 'default'; // Or 'info' if you want a blueish tint
        break;
      default:
        badgeText = 'Không rõ';
        badgeType = 'default';
    }

    // Now correctly pass props to your Badge component
    return <Badge text={badgeText} type={badgeType} />;
  };
  // --- END OF THE CRUCIAL CHANGE ---


  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('vi-VN');
  };

  if (loading && exams.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toast />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý đăng ký</h1>
        <p className="mt-1 text-sm text-gray-500">
          Xem và xác nhận đăng ký thi của học sinh.
        </p>
      </div>

      {/* Exam Selector */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Chọn kỳ thi
          </h3>
        </div>
        <div className="card-body">
          {exams.length > 0 ? (
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="input-field"
            >
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name} - {exam.subject_name} ({exam.registration_count || 0} đăng ký)
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-gray-500">Không có kỳ thi nào để hiển thị.</p>
          )}
        </div>
      </div>

      {/* Registrations List */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Danh sách đăng ký {selectedExam ? `cho kỳ thi ${exams.find(e => e.id === selectedExam)?.name}` : ''}
          </h3>
        </div>
        <div className="card-body">
          {loading && selectedExam ? (
            <Loading />
          ) : registrations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Học sinh
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thời gian đăng ký
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {registrations.map((registration) => (
                    <tr key={registration.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {registration.student_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {registration.student_email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(registration.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDateTime(registration.registered_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {registration.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateRegistrationStatus(registration.id, 'approved')}
                                className="text-green-600 hover:text-green-900"
                                title="Xác nhận đăng ký"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleUpdateRegistrationStatus(registration.id, 'rejected')}
                                className="text-red-600 hover:text-red-900"
                                title="Từ chối đăng ký"
                              >
                                <XCircle className="h-4 w-4" />
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
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Chưa có đăng ký nào
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Chưa có học sinh nào đăng ký kỳ thi này.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Registrations;