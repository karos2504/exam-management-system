import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import socketService from '../../services/socketService'; // Import socketService
import { Calendar, MapPin, Clock, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/UI/Button';
import Modal from '../../components/UI/Modal';
import Loading from '../../components/UI/Loading';
import Badge from '../../components/UI/Badge';

const MyRegistrations = () => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.id || !user.role) {
      console.error('[MyRegistrations] Invalid user data:', user);
      toast.error('Vui lòng đăng nhập lại');
      setLoading(false);
      return;
    }

    fetchRegistrations();

    // Set up socket listeners
    socketService.connect({ id: user.id, role: user.role });

    socketService.onNotificationReceived((data) => {
      console.log('[MyRegistrations] Received notification:', data);
      if (data.type === 'registration' && data.user_id === user.id) {
        toast.success(data.content);
        fetchRegistrations(); // Refresh registrations on status change
      }
    });

    return () => {
      socketService.off('notification-created', socketService.onNotificationReceived);
      socketService.disconnect();
    };
  }, [user]);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/registrations/my-registrations');
      console.log('[MyRegistrations] Fetched registrations:', response.data.registrations);
      setRegistrations(response.data.registrations || []);
    } catch (error) {
      console.error('[MyRegistrations] Error fetching registrations:', error.response?.data || error);
      toast.error(error.response?.data?.message || 'Lỗi khi tải danh sách đăng ký');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRegistration = async (registrationId) => {
    if (window.confirm('Bạn có chắc muốn hủy đăng ký kỳ thi này?')) {
      try {
        await api.delete(`/registrations/${registrationId}`);
        toast.success('Hủy đăng ký thành công');
        fetchRegistrations();
      } catch (error) {
        console.error('[MyRegistrations] Error canceling registration:', error.response?.data || error);
        toast.error(error.response?.data?.message || 'Lỗi khi hủy đăng ký');
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge text="Chờ xác nhận" type="warning" />;
      case 'approved':
        return <Badge text="Đã xác nhận" type="success" />;
      case 'rejected':
        return <Badge text="Đã từ chối" type="error" />;
      case 'cancelled':
        return <Badge text="Đã hủy" type="default" />;
      default:
        return null;
    }
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return 'Chưa có lịch thi';
    const date = new Date(dateTime);
    if (isNaN(date.getTime())) {
      return 'Thời gian không hợp lệ';
    }
    return date.toLocaleString('vi-VN');
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Đăng ký của tôi</h1>
        <p className="mt-1 text-sm text-gray-500">
          Quản lý các kỳ thi bạn đã đăng ký
        </p>
      </div>

      {/* Registrations List */}
      <div className="card">
        <div className="card-body">
          {registrations.length > 0 ? (
            <div className="space-y-4">
              {registrations.map((registration) => (
                <div key={registration.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {registration.exam_name}
                        </h3>
                        {getStatusBadge(registration.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Môn thi: {registration.subject_name}
                      </p>

                      {/* Display room and time ONLY IF STATUS IS 'approved' */}
                      {registration.status === 'approved' && (
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2" />
                            Phòng thi: {registration.room || 'Chưa có lịch thi'}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="h-4 w-4 mr-2" />
                            Thời gian: {formatDateTime(registration.start_time)}
                          </div>
                        </div>
                      )}

                      {registration.status === 'rejected' && registration.rejection_reason && (
                        <div className="mt-2 text-sm text-red-600">
                          Lý do từ chối: {registration.rejection_reason}
                        </div>
                      )}

                      <div className="mt-3 text-xs text-gray-500">
                        Đăng ký lúc: {formatDateTime(registration.registered_at)}
                      </div>
                    </div>

                    <div className="ml-4">
                      {registration.status === 'pending' && (
                        <Button
                          onClick={() => handleCancelRegistration(registration.id)}
                          variant="danger"
                          size="sm"
                        >
                          Hủy đăng ký
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Chưa có đăng ký nào
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Bạn chưa đăng ký kỳ thi nào.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyRegistrations;