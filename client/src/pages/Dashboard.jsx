import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  BookOpen,
  Calendar,
  Users,
  Clock,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import Loading from '../components/UI/Loading';
import Toast from '../components/UI/Toast';
import Badge from '../components/UI/Badge';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalExams: 0,
    totalSchedules: 0,
    totalRegistrations: 0,
    upcomingExams: 0,
  });
  const [recentExams, setRecentExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [examsRes, schedulesRes, registrationsRes] = await Promise.all([
          api.get('/exams'),
          api.get('/schedules'),
          user?.role === 'student'
            ? api.get('/registrations/my-registrations')
            : Promise.resolve({ data: { registrations: [] } })
        ]);

        const exams = examsRes.data.exams;
        const schedules = schedulesRes.data.schedules;
        let registrations = [];
        if (user?.role === 'student') {
          registrations = registrationsRes.data.registrations;
        } else {
          // Tính tổng đăng ký từ exams
          registrations = exams.reduce((sum, e) => sum + (e.registration_count || 0), 0);
        }

        // Tính toán thống kê
        const upcomingExams = schedules.filter(schedule =>
          new Date(schedule.start_time) > new Date()
        ).length;

        setStats({
          totalExams: exams.length,
          totalSchedules: schedules.length,
          totalRegistrations: user?.role === 'student' ? registrations.length : registrations,
          upcomingExams,
        });

        // Lấy 5 kỳ thi gần đây
        setRecentExams(exams.slice(0, 5));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center">
          <div className={`flex-shrink-0 p-3 rounded-md ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="text-lg font-medium text-gray-900">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Chào mừng {user?.name}! Đây là tổng quan hệ thống.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng kỳ thi"
          value={stats.totalExams}
          icon={BookOpen}
          color="bg-blue-500"
        />
        <StatCard
          title="Lịch thi"
          value={stats.totalSchedules}
          icon={Calendar}
          color="bg-green-500"
        />
        <StatCard
          title={user?.role === 'student' ? 'Đăng ký của tôi' : 'Tổng đăng ký'}
          value={stats.totalRegistrations}
          icon={Users}
          color="bg-purple-500"
        />
        <StatCard
          title="Kỳ thi sắp tới"
          value={stats.upcomingExams}
          icon={Clock}
          color="bg-orange-500"
        />
      </div>

      {/* Recent Exams */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Kỳ thi gần đây
          </h3>
        </div>
        <div className="card-body">
          {recentExams.length > 0 ? (
            <div className="space-y-4">
              {recentExams.map((exam) => (
                <div key={exam.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{exam.name}</h4>
                    <p className="text-sm text-gray-500">{exam.subject}</p>
                    <p className="text-xs text-gray-400">
                      Tạo bởi: {exam.creator_name}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {exam.registration_count} đăng ký
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Chưa có kỳ thi</h3>
              <p className="mt-1 text-sm text-gray-500">
                Bắt đầu tạo kỳ thi đầu tiên.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 