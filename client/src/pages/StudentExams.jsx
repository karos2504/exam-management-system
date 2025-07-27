import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FileText } from 'lucide-react';
import Button from '../components/UI/Button';
import Badge from '../components/UI/Badge';
import socket from '../services/socket';

const StudentExams = () => {
    const { user } = useAuth();
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!user || !user.id || !user.role) {
            console.error('Invalid user data:', user);
            toast.error('Vui lòng đăng nhập lại');
            setLoading(false); // Stop loading if user data is invalid
            return;
        }

        console.log('StudentExams: User data:', user);
        socket.connect({ id: user.id, role: user.role });
        fetchRegistrations();

        // Listen for general notifications (e.g., about registration status changes)
        socket.onNotificationReceived((data) => {
            console.log('Received notification:', data);
            // Assuming 'registration' type notifications directly relate to the student's registrations
            if (data.type === 'registration_status' || data.type === 'registration') { // Added 'registration_status' type
                fetchRegistrations(); // Re-fetch registrations to update status
                toast.success('Thông báo đăng ký: ' + data.content);
            }
        });

        // Listen for exam-related updates (e.g., exam creation, update, deletion)
        socket.on('exam-created', (newExam) => {
            console.log('Exam created via socket:', newExam);
            // Optionally, if new exams can be directly relevant to student registrations (e.g., if a new exam is open for registration)
            // You might want to re-fetch *available* exams, not necessarily registered ones.
            // For now, only re-fetching registrations on direct registration updates.
        });

        socket.on('exam-updated', (updatedExam) => {
            console.log('Exam updated via socket:', updatedExam);
            // If an updated exam affects a student's registration, refresh.
            // Check if any of the student's registered exams match the updated exam ID.
            if (registrations.some(reg => reg.exam_id === updatedExam.id)) {
                fetchRegistrations();
            }
        });

        socket.on('exam-deleted', (deletedExam) => {
            console.log('Exam deleted via socket:', deletedExam);
            // If a deleted exam affects a student's registration, refresh.
            if (registrations.some(reg => reg.exam_id === deletedExam.id)) {
                fetchRegistrations();
                toast.success(`Kỳ thi "${deletedExam.name || 'một kỳ thi'}" đã bị hủy.`); // Add name if available
            }
        });


        return () => {
            socket.off('notification-received'); // Clean up specific listener
            socket.off('exam-created');
            socket.off('exam-updated');
            socket.off('exam-deleted');
            socket.disconnect();
        };
    }, [user, registrations]); // Added 'registrations' to dependency array for socket.on handlers to see latest state

    const fetchRegistrations = async () => {
        setLoading(true);
        try {
            const res = await api.get('/registrations/my-registrations');
            // Ensure that if no registrations, it's an empty array, not null/undefined
            setRegistrations(res.data.registrations || []);
            // Set message based on backend response or default if array is empty
            if (res.data.registrations && res.data.registrations.length === 0) {
                setMessage(res.data.message || 'Chưa có kỳ thi nào được đăng ký.');
            } else {
                setMessage(''); // Clear message if there are registrations
            }
        } catch (err) {
            console.error('Error fetching registrations:', err);
            toast.error(err.response?.data?.message || 'Lỗi tải danh sách đăng ký');
            setMessage(err.response?.data?.message || 'Lỗi tải danh sách đăng ký.'); // Set error message
        } finally {
            setLoading(false);
        }
    };

    const handleCancelRegistration = async (examId) => {
        if (!window.confirm('Xác nhận hủy đăng ký kỳ thi?')) return;
        try {
            await api.delete(`/registrations/${examId}`);
            toast.success('Hủy đăng ký thành công');
            fetchRegistrations();
        } catch (err) {
            console.error('Error canceling registration:', err);
            toast.error(err.response?.data?.message || 'Lỗi hủy đăng ký');
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Danh sách kỳ thi đã đăng ký</h1>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : registrations.length > 0 ? (
                <div className="card">
                    <div className="card-body">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kỳ thi</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Môn học</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phòng thi</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {registrations.map((reg) => (
                                        <tr key={reg.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reg.exam_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reg.subject_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reg.room || 'Chưa có'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {reg.start_time
                                                    ? `${new Date(reg.start_time).toLocaleString('vi-VN')} - ${new Date(reg.end_time).toLocaleString('vi-VN')}`
                                                    : 'Chưa có lịch thi'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <Badge variant={reg.status === 'approved' ? 'success' : 'warning'}>
                                                    {reg.status === 'approved' ? 'Đã xác nhận' : 'Đang chờ'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                {reg.status === 'pending' && (
                                                    <Button
                                                        variant="danger"
                                                        onClick={() => handleCancelRegistration(reg.exam_id)}
                                                    >
                                                        Hủy đăng ký
                                                    </Button>
                                                )}
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
                    <h3 className="mt-2 text-sm font-medium text-gray-900">{message || 'Chưa có kỳ thi nào được đăng ký.'}</h3>
                    <p className="mt-1 text-sm text-gray-500">Hãy đăng ký kỳ thi để xem lịch thi.</p>
                </div>
            )}
        </div>
    );
};

export default StudentExams;