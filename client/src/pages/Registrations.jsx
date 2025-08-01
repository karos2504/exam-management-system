import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { CheckCircle, XCircle, Users, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import Loading from '../components/UI/Loading';
import Badge from '../components/UI/Badge';

const Registrations = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [currentRegistrationToReject, setCurrentRegistrationToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingRegistration, setViewingRegistration] = useState(null);

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      fetchRegistrations(selectedExam);
    } else {
      setRegistrations([]);
      setLoading(false);
    }
  }, [selectedExam]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await api.get('/exams');
      const fetchedExams = response.data.exams || [];
      setExams(fetchedExams);
      if (fetchedExams.length > 0) {
        setSelectedExam(fetchedExams[0].id);
      } else {
        setSelectedExam('');
        toast.error('Bạn không được phân công hoặc tạo kỳ thi nào.');
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách kỳ thi: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async (examId) => {
    setLoading(true);
    try {
      const response = await api.get(`/registrations/exam/${examId}`);
      setRegistrations(response.data.registrations || []);
    } catch (error) {
      const message = error.response?.status === 403
        ? 'Bạn không có quyền xem đăng ký của kỳ thi này.'
        : 'Lỗi khi tải danh sách đăng ký: ' + (error.response?.data?.message || error.message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRegistrationStatus = async (registrationId, newStatus, reason = null) => {
    try {
      const payload = newStatus === 'rejected' ? { rejection_reason: reason } : {};
      await api.put(`/registrations/${newStatus === 'approved' ? 'confirm' : 'reject'}/${registrationId}`, payload);
      toast.success(`Cập nhật trạng thái thành công: ${newStatus === 'approved' ? 'Đã xác nhận' : 'Đã từ chối'}`);
      fetchRegistrations(selectedExam);
      setShowRejectModal(false);
      setCurrentRegistrationToReject(null);
      setRejectionReason('');
    } catch (error) {
      const message = error.response?.status === 403
        ? 'Bạn không có quyền cập nhật trạng thái đăng ký này.'
        : `Lỗi khi cập nhật trạng thái: ${error.response?.data?.message || error.message}`;
      toast.error(message);
    }
  };

  const openRejectModal = (registration) => {
    setCurrentRegistrationToReject(registration);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const confirmReject = () => {
    if (currentRegistrationToReject) {
      handleUpdateRegistrationStatus(currentRegistrationToReject.id, 'rejected', rejectionReason);
    }
  };

  const handleViewRegistration = (registration) => {
    setViewingRegistration(registration);
    setShowViewModal(true);
  };

  const getStatusBadge = (status) => {
    let badgeText = '';
    let variant = 'default';

    switch (status) {
      case 'pending':
        badgeText = 'Chờ xác nhận';
        variant = 'warning';
        break;
      case 'approved':
        badgeText = 'Đã xác nhận';
        variant = 'success';
        break;
      case 'rejected':
        badgeText = 'Đã từ chối';
        variant = 'destructive';
        break;
      case 'cancelled':
        badgeText = 'Đã hủy';
        variant = 'default';
        break;
      default:
        badgeText = 'Không rõ';
        variant = 'default';
    }
    return <Badge type={variant} text={badgeText} />;
  };

  const formatDateTime = (dateTime) => {
    return dateTime ? new Date(dateTime).toLocaleString('vi-VN') : 'N/A';
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý đăng ký</h1>
        <p className="mt-1 text-sm text-gray-500">
          Xem và xác nhận đăng ký thi của học sinh.
        </p>
      </div>

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
            <p className="text-sm text-gray-500">Bạn chưa được phân công hoặc tạo kỳ thi nào.</p>
          )}
        </div>
      </div>

      {selectedExam && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Danh sách đăng ký {exams.find(e => e.id === selectedExam)?.name || ''}
            </h3>
          </div>
          <div className="card-body">
            {loading ? (
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
                            <Button
                              variant="info"
                              onClick={() => handleViewRegistration(registration)}
                              title="Xem chi tiết"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {registration.status === 'pending' && (
                              <>
                                <Button
                                  variant="success"
                                  onClick={() => handleUpdateRegistrationStatus(registration.id, 'approved')}
                                  title="Xác nhận đăng ký"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="danger"
                                  onClick={() => openRejectModal(registration)}
                                  title="Từ chối đăng ký"
                                >
                                  <XCircle className="h-4 w-4" />
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
      )}

      {showViewModal && (
        <Modal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title={`Chi tiết đăng ký: ${viewingRegistration?.student_name || ''}`}
        >
          {viewingRegistration ? (
            <div className="space-y-3 text-sm text-gray-700">
              <p><strong>Học sinh:</strong> {viewingRegistration.student_name}</p>
              <p><strong>Email:</strong> {viewingRegistration.student_email}</p>
              <p><strong>Kỳ thi:</strong> {exams.find(e => e.id === viewingRegistration.exam_id)?.name || 'N/A'}</p>
              <p><strong>Học phần:</strong> {exams.find(e => e.id === viewingRegistration.exam_id)?.subject_name || 'N/A'}</p>
              <p><strong>Trạng thái:</strong> {getStatusBadge(viewingRegistration.status)}</p>
              <p><strong>Thời gian đăng ký:</strong> {formatDateTime(viewingRegistration.registered_at)}</p>
              {viewingRegistration.status === 'rejected' && (
                <p><strong>Lý do từ chối:</strong> {viewingRegistration.rejection_reason || 'Không có'}</p>
              )}
            </div>
          ) : (
            <p>Không có dữ liệu để hiển thị.</p>
          )}
        </Modal>
      )}

      {showRejectModal && (
        <Modal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          title="Từ chối đăng ký"
        >
          <p className="mb-4">
            Bạn có chắc chắn muốn từ chối đăng ký của <strong>{currentRegistrationToReject?.student_name}</strong> cho kỳ thi <strong>{exams.find(e => e.id === selectedExam)?.name}</strong> không?
          </p>
          <div className="mb-4">
            <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 mb-1">Lý do từ chối (Tùy chọn):</label>
            <textarea
              id="rejectionReason"
              rows="3"
              className="input-field w-full"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Nhập lý do từ chối..."
            ></textarea>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowRejectModal(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={confirmReject}
            >
              Xác nhận từ chối
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Registrations;