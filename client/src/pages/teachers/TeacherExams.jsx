import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Check, X, FileText } from 'lucide-react';
import Button from '../../components/UI/Button';
import Badge from '../../components/UI/Badge';
import socket from '../../services/socketService';

const TeacherExams = () => {
    const { user } = useAuth();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedExam, setSelectedExam] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [assignments, setAssignments] = useState([]);

    useEffect(() => {
        if (!user || !user.id || !user.role) {
            console.error('Invalid user data:', user);
            toast.error('Vui lòng đăng nhập lại');
            return;
        }

        console.log('TeacherExams: User data:', user);
        socket.connect({ id: user.id, role: user.role });
        fetchExams();

        socket.onNotificationReceived((data) => {
            console.log('Received notification:', data);
            if (data.type === 'assignment') {
                fetchExams();
                toast.success('Thông báo phân công: ' + data.content);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [user]);

    const fetchExams = async () => {
        setLoading(true);
        try {
            const res = await api.get('/exams');
            setExams(res.data.exams || []);
        } catch (err) {
            console.error('Error fetching exams:', err);
            toast.error(err.response?.data?.message || 'Lỗi tải danh sách kỳ thi');
        } finally {
            setLoading(false);
        }
    };

    const fetchExamDetails = async (examId) => {
        try {
            const res = await api.get(`/exams/${examId}`);
            setSelectedExam(res.data.exam);
            setRegistrations(res.data.registrations || []);
            setAssignments(res.data.assignments || []);
        } catch (err) {
            console.error('Error fetching exam details:', err);
            toast.error(err.response?.data?.message || 'Lỗi tải chi tiết kỳ thi');
        }
    };

    const handleAcceptAssignment = async (assignmentId) => {
        try {
            await api.put(`/exams/assign/${assignmentId}/accept`);
            toast.success('Chấp nhận phân công thành công');
            fetchExams();
        } catch (err) {
            console.error('Error accepting assignment:', err);
            toast.error(err.response?.data?.message || 'Lỗi chấp nhận phân công');
        }
    };

    const handleDeclineAssignment = async (assignmentId) => {
        if (!window.confirm('Xác nhận từ chối phân công?')) return;
        try {
            await api.put(`/exams/assign/${assignmentId}/decline`);
            toast.success('Từ chối phân công thành công');
            fetchExams();
        } catch (err) {
            console.error('Error declining assignment:', err);
            toast.error(err.response?.data?.message || 'Lỗi từ chối phân công');
        }
    };

    const handleConfirmRegistration = async (registrationId) => {
        try {
            await api.put(`/registrations/confirm/${registrationId}`);
            toast.success('Xác nhận đăng ký thành công');
            fetchExamDetails(selectedExam.id);
        } catch (err) {
            console.error('Error confirming registration:', err);
            toast.error(err.response?.data?.message || 'Lỗi xác nhận đăng ký');
        }
    };

    const handleRejectRegistration = async (registrationId) => {
        if (!window.confirm('Xác nhận từ chối đăng ký?')) return;
        try {
            await api.put(`/registrations/reject/${registrationId}`);
            toast.success('Từ chối đăng ký thành công');
            fetchExamDetails(selectedExam.id);
        } catch (err) {
            console.error('Error rejecting registration:', err);
            toast.error(err.response?.data?.message || 'Lỗi từ chối đăng ký');
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Quản lý kỳ thi</h1>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : (
                <>
                    <div className="card">
                        <div className="card-body">
                            <h2 className="text-xl font-semibold mb-4">Danh sách kỳ thi được phân công</h2>
                            {exams.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã kỳ thi</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên kỳ thi</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Môn học</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số đăng ký</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {exams.map((exam) => (
                                                <tr key={exam.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exam.code}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exam.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exam.subject_name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exam.registration_count}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <Button
                                                            variant="primary"
                                                            onClick={() => fetchExamDetails(exam.id)}
                                                        >
                                                            <FileText className="h-4 w-4 mr-2" /> Xem chi tiết
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-center text-gray-500">Chưa có kỳ thi nào được phân công.</p>
                            )}
                        </div>
                    </div>

                    {selectedExam && (
                        <div className="card">
                            <div className="card-body">
                                <h2 className="text-xl font-semibold mb-4">Chi tiết kỳ thi: {selectedExam.name}</h2>
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-lg font-medium">Phân công</h3>
                                        {assignments.length > 0 ? (
                                            <ul className="space-y-2">
                                                {assignments.map((assignment) => (
                                                    <li key={assignment.id} className="flex items-center justify-between">
                                                        <span>{assignment.teacher_name} - Trạng thái: <Badge variant={assignment.status === 'accepted' ? 'success' : assignment.status === 'declined' ? 'danger' : 'warning'}>{assignment.status}</Badge></span>
                                                        {assignment.teacher_id === user.id && assignment.status === 'assigned' && (
                                                            <div className="flex space-x-2">
                                                                <Button
                                                                    variant="success"
                                                                    onClick={() => handleAcceptAssignment(assignment.id)}
                                                                >
                                                                    <Check className="h-4 w-4" /> Chấp nhận
                                                                </Button>
                                                                <Button
                                                                    variant="danger"
                                                                    onClick={() => handleDeclineAssignment(assignment.id)}
                                                                >
                                                                    <X className="h-4 w-4" /> Từ chối
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p>Chưa có phân công.</p>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-medium">Danh sách đăng ký</h3>
                                        {registrations.length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Học sinh</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {registrations.map((reg) => (
                                                            <tr key={reg.id}>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reg.student_name}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reg.student_email}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                    <Badge variant={reg.status === 'approved' ? 'success' : reg.status === 'rejected' ? 'danger' : 'warning'}>
                                                                        {reg.status === 'approved' ? 'Đã xác nhận' : reg.status === 'rejected' ? 'Đã từ chối' : 'Đang chờ'}
                                                                    </Badge>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                                    {reg.status === 'pending' && (
                                                                        <div className="flex space-x-2">
                                                                            <Button
                                                                                variant="success"
                                                                                onClick={() => handleConfirmRegistration(reg.id)}
                                                                            >
                                                                                <Check className="h-4 w-4" /> Xác nhận
                                                                            </Button>
                                                                            <Button
                                                                                variant="danger"
                                                                                onClick={() => handleRejectRegistration(reg.id)}
                                                                            >
                                                                                <X className="h-4 w-4" /> Từ chối
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p>Chưa có học sinh đăng ký.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default TeacherExams;