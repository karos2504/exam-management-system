import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import socketService from '../../services/socketService';
import toast from 'react-hot-toast';
import { Eye, CheckCircle, XCircle, Calendar } from 'lucide-react';
import Button from '../../components/UI/Button';
import Modal from '../../components/UI/Modal';
import Loading from '../../components/UI/Loading';
import Badge from '../../components/UI/Badge';

const MyAssignments = () => {
    const { user, loading: authLoading } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [schedules, setSchedules] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (!user || user.role !== 'teacher') return;

        const fetchData = async () => {
            try {
                setLoading(true);
                const [assignmentsRes, schedulesRes] = await Promise.all([
                    api.get('/exam-assignments/my-assignments'),
                    api.get('/schedules/my-schedules'),
                ]);
                setAssignments(assignmentsRes.data.assignments || []);
                setSchedules(schedulesRes.data.schedules.reduce((acc, schedule) => ({
                    ...acc,
                    [schedule.exam_id]: schedule,
                }), {}));
            } catch (err) {
                console.error('[MyAssignments] Error fetching data:', err);
                toast.error(err.response?.data?.message || 'Lỗi khi tải dữ liệu');
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        socketService.onNotificationReceived((notification) => {
            if (notification.type === 'assignment' || notification.type === 'assignment_status') {
                console.log('[MyAssignments] Received notification:', notification);
                fetchData();
                toast.success(notification.content);
            }
        });

        return () => {
            socketService.off('notification-created', socketService.onNotificationReceived);
        };
    }, [user]);

    const handleAccept = async (assignmentId) => {
        try {
            await api.put(`/exam-assignments/assign/${assignmentId}/accept`);
            toast.success('Chấp nhận phân công thành công');
            const [assignmentsRes, schedulesRes] = await Promise.all([
                api.get('/exam-assignments/my-assignments'),
                api.get('/schedules/my-schedules'),
            ]);
            setAssignments(assignmentsRes.data.assignments || []);
            setSchedules(schedulesRes.data.schedules.reduce((acc, schedule) => ({
                ...acc,
                [schedule.exam_id]: schedule,
            }), {}));
        } catch (err) {
            console.error('[MyAssignments] Error accepting assignment:', err);
            toast.error(err.response?.data?.message || 'Lỗi khi chấp nhận phân công');
        }
    };

    const handleDecline = async (assignmentId) => {
        try {
            await api.put(`/exam-assignments/assign/${assignmentId}/decline`);
            toast.success('Từ chối phân công thành công');
            const [assignmentsRes, schedulesRes] = await Promise.all([
                api.get('/exam-assignments/my-assignments'),
                api.get('/schedules/my-schedules'),
            ]);
            setAssignments(assignmentsRes.data.assignments || []);
            setSchedules(schedulesRes.data.schedules.reduce((acc, schedule) => ({
                ...acc,
                [schedule.exam_id]: schedule,
            }), {}));
        } catch (err) {
            console.error('[MyAssignments] Error declining assignment:', err);
            toast.error(err.response?.data?.message || 'Lỗi khi từ chối phân công');
        }
    };

    const handleViewAssignment = (assignment) => {
        setSelectedAssignment(assignment);
        setShowModal(true);
    };

    const formatDateTime = (dateTime) => {
        if (!dateTime) return '';
        return new Date(dateTime).toLocaleString('vi-VN', {
            dateStyle: 'short',
            timeStyle: 'short',
        });
    };

    if (authLoading || loading) {
        return <Loading />;
    }

    if (!user || user.role !== 'teacher') {
        return (
            <div className="space-y-6">
                <div className="text-center py-8">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Không có quyền truy cập</h3>
                    <p className="mt-1 text-sm text-gray-500">Chỉ giáo viên được phép truy cập trang này.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Phân công của tôi</h1>
                    <p className="mt-1 text-sm text-gray-500">Quản lý các phân công giám sát kỳ thi</p>
                </div>
            </div>

            <div className="card">
                <div className="card-body">
                    {assignments.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 sm:table-fixed">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kỳ thi</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phòng thi</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian bắt đầu</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian kết thúc</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {assignments.map((assignment) => {
                                        const schedule = schedules[assignment.exam_id];
                                        return (
                                            <tr key={assignment.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{assignment.exam_name}</div>
                                                    <div className="text-sm text-gray-500">{assignment.subject_name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{schedule ? schedule.room : 'Chưa có lịch thi'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{schedule ? formatDateTime(schedule.start_time) : '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{schedule ? formatDateTime(schedule.end_time) : '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <Badge type={assignment.status === 'accepted' ? 'success' : assignment.status === 'declined' ? 'danger' : 'warning'}
                                                        text={assignment.status === 'accepted' ? 'Đã chấp nhận' : assignment.status === 'declined' ? 'Đã từ chối' : 'Đã phân công'}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex space-x-2">
                                                        <Button variant="info" onClick={() => handleViewAssignment(assignment)}>
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        {assignment.status === 'assigned' && (
                                                            <>
                                                                <Button variant="success" onClick={() => handleAccept(assignment.id)}>
                                                                    <CheckCircle className="h-4 w-4" />
                                                                </Button>
                                                                <Button variant="danger" onClick={() => handleDecline(assignment.id)}>
                                                                    <XCircle className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">Chưa có phân công</h3>
                            <p className="mt-1 text-sm text-gray-500">Hiện tại bạn chưa có phân công giám sát nào.</p>
                        </div>
                    )}
                </div>
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Chi tiết phân công"
            >
                {selectedAssignment ? (
                    <div className="space-y-3 text-sm text-gray-700">
                        <p><strong>Kỳ thi:</strong> {selectedAssignment.exam_name}</p>
                        <p><strong>Học phần:</strong> {selectedAssignment.subject_name}</p>
                        <p><strong>Phòng thi:</strong> {schedules[selectedAssignment.exam_id]?.room || 'Chưa có lịch thi'}</p>
                        <p><strong>Thời gian bắt đầu:</strong> {schedules[selectedAssignment.exam_id] ? formatDateTime(schedules[selectedAssignment.exam_id].start_time) : '-'}</p>
                        <p><strong>Thời gian kết thúc:</strong> {schedules[selectedAssignment.exam_id] ? formatDateTime(schedules[selectedAssignment.exam_id].end_time) : '-'}</p>
                        <p><strong>Trạng thái:</strong> {selectedAssignment.status === 'accepted' ? 'Đã chấp nhận' : selectedAssignment.status === 'declined' ? 'Đã từ chối' : 'Đã phân công'}</p>
                        <p><strong>Ghi chú:</strong> {selectedAssignment.notes || 'Không có'}</p>
                    </div>
                ) : (
                    <p>Không có dữ liệu.</p>
                )}
            </Modal>
        </div>
    );
};

export default MyAssignments;