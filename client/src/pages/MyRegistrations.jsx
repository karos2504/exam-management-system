import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Calendar, MapPin, Clock, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import Loading from '../components/UI/Loading';
import Toast from '../components/UI/Toast';
import Badge from '../components/UI/Badge';

const MyRegistrations = () => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      const response = await api.get('/registrations/my-registrations');
      setRegistrations(response.data.registrations);
    } catch (error) {
      toast.error('Lỗi khi tải danh sách đăng ký');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRegistration = async (examId) => {
    if (window.confirm('Bạn có chắc muốn hủy đăng ký kỳ thi này?')) {
      try {
        await api.delete(`/registrations/${examId}`);
        toast.success('Hủy đăng ký thành công');
        fetchRegistrations();
      } catch (error) {
        toast.error('Lỗi khi hủy đăng ký');
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Chờ xác nhận
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Đã xác nhận
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Đã hủy
          </span>
        );
      default:
        return null;
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
                        Môn thi: {registration.subject}
                      </p>
                      
                      {registration.room && registration.start_time && (
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2" />
                            Phòng thi: {registration.room}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="h-4 w-4 mr-2" />
                            Thời gian: {formatDateTime(registration.start_time)}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-3 text-xs text-gray-500">
                        Đăng ký lúc: {formatDateTime(registration.registered_at)}
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      {registration.status === 'pending' && (
                        <button
                          onClick={() => handleCancelRegistration(registration.exam_id)}
                          className="btn-danger text-sm"
                        >
                          Hủy đăng ký
                        </button>
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