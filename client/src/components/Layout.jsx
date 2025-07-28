import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, BookOpen, Calendar, Users, Settings, LogOut, Menu, X, User, Bell, Briefcase } from 'lucide-react';
import socket from '../services/socket';
import toast from 'react-hot-toast';
import api from '../services/api';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  // Effect to close sidebar on route change (for mobile)
  useEffect(() => {
    setSidebarOpen(false); // Close sidebar whenever the route changes
  }, [location.pathname]);

  useEffect(() => {
    if (user && ['teacher', 'student'].includes(user.role) && user.id) {
      const fetchNotificationCount = async () => {
        try {
          const response = await api.get('/notifications/unread-count');
          setNotificationCount(response.data.count || 0);
        } catch (err) {
          console.error('Error fetching notification count:', err);
          // toast.error('Không thể tải số lượng thông báo'); // Removed to avoid excessive toasts
        }
      };

      fetchNotificationCount();

      socket.onNotificationReceived((notification) => {
        // Check if the notification is for all users (user_ids is empty) or for this specific user
        if (!notification.user_ids || notification.user_ids.length === 0 || notification.user_ids.includes(user.id)) {
          setNotificationCount((prev) => prev + 1);
          toast.success(notification.content, {
            icon: '🔔',
            position: 'top-right',
          });
        }
      });

      // Clean up socket listener on component unmount or user change
      return () => {
        // It's generally better to remove specific listeners if possible,
        // but for a clean slate on unmount, removeAllListeners can be used carefully.
        // If other components use socket.on, this might affect them.
        // A more robust approach might be to store listener functions and remove them by reference.
        socket.removeAllListeners();
      };
    }
  }, [user]); // Re-run if user object changes

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Kỳ thi', href: '/exams', icon: BookOpen },
    { name: 'Lịch thi', href: '/schedules', icon: Calendar },
    // Conditional rendering for 'Đăng ký của tôi' vs 'Quản lý đăng ký'
    ...(user?.role === 'student'
      ? [{ name: 'Đăng ký của tôi', href: '/my-registrations', icon: Users }]
      : user?.role === 'teacher' || user?.role === 'admin'
        ? [{ name: 'Quản lý đăng ký', href: '/registrations', icon: Users }]
        : []),
    // Show 'Thông báo' link only if not admin, as admin has a separate 'Quản lý thông báo'
    ...(user?.role !== 'admin' ? [{ name: 'Thông báo', href: '/notifications', icon: Bell }] : []),
  ];

  const isActive = (href) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'} transition-opacity duration-300 ease-in-out`}
        aria-hidden={!sidebarOpen}
      >
        {sidebarOpen && <div className="fixed inset-0 bg-gray-900 bg-opacity-75" onClick={() => setSidebarOpen(false)} />}

        <div
          className={`fixed inset-y-0 left-0 w-64 flex flex-col bg-white transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <div className="flex h-16 items-center justify-between px-4 bg-gradient-to-r from-blue-500 to-blue-600">
            {/* START FIX: Made title clickable for mobile sidebar */}
            <Link
              to="/"
              className="text-xl font-bold text-white"
              onClick={(e) => {
                setSidebarOpen(false); // Close sidebar
                if (location.pathname === '/') {
                  e.preventDefault(); // Prevent default Link navigation if already on dashboard
                  window.location.reload(); // Force full page reload
                }
              }}
            >
              Exam Management
            </Link>
            {/* END FIX */}
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-md text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Close sidebar"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4 bg-white">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive(item.href) ? 'bg-blue-100 text-blue-900' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-900'
                    }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
            {user && user.role === 'admin' && (
              <>
                <Link
                  to="/admin/users"
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive('/admin/users') ? 'bg-blue-100 text-blue-900' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-900'
                    }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Users className="mr-3 h-5 w-5" />
                  Quản lý người dùng
                </Link>
                <Link
                  to="/admin/notifications"
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive('/admin/notifications') ? 'bg-blue-100 text-blue-900' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-900'
                    }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Bell className="mr-3 h-5 w-5" />
                  Quản lý thông báo
                </Link>
                <Link
                  to="/admin/assignments"
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive('/admin/assignments') ? 'bg-blue-100 text-blue-900' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-900'
                    }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Briefcase className="mr-3 h-5 w-5" />
                  Quản lý phân công
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white shadow-lg">
          <div className="flex h-16 items-center px-4 bg-gradient-to-r from-blue-500 to-blue-600">
            {/* START FIX: Made title clickable for desktop sidebar */}
            <Link
              to="/"
              className="text-xl font-bold text-white"
              onClick={(e) => {
                if (location.pathname === '/') {
                  e.preventDefault(); // Prevent default Link navigation if already on dashboard
                  window.location.reload(); // Force full page reload
                }
              }}
            >
              Exam Management
            </Link>
            {/* END FIX */}
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive(item.href) ? 'bg-blue-100 text-blue-900' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-900'
                    }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
            {user && user.role === 'admin' && (
              <>
                <Link
                  to="/admin/users"
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive('/admin/users') ? 'bg-blue-100 text-blue-900' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-900'
                    }`}
                >
                  <Users className="mr-3 h-5 w-5" />
                  Quản lý người dùng
                </Link>
                <Link
                  to="/admin/notifications"
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive('/admin/notifications') ? 'bg-blue-100 text-blue-900' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-900'
                    }`}
                >
                  <Bell className="mr-3 h-5 w-5" />
                  Quản lý thông báo
                </Link>
                <Link
                  to="/admin/assignments"
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive('/admin/assignments') ? 'bg-blue-100 text-blue-900' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-900'
                    }`}
                >
                  <Briefcase className="mr-3 h-5 w-5" />
                  Quản lý phân công
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Main content area */}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          {/* Hamburger menu button for mobile */}
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden hover:text-blue-600 transition-colors duration-200"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1" /> {/* Spacer */}
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {user && ['teacher', 'student'].includes(user.role) && (
                <button
                  type="button"
                  className="relative text-gray-500 hover:text-blue-600 transition-colors duration-200"
                  onClick={() => navigate('/notifications')}
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                      {notificationCount}
                    </span>
                  )}
                </button>
              )}
              <div className="flex items-center gap-x-2">
                <User className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium text-gray-900">{user?.full_name || 'N/A'}</span>
                <span className="text-xs text-gray-500">({user?.role || 'N/A'})</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-x-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors duration-200"
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            </div>
          </div>
        </div>

        <main className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>

      {/* Inline styles can be moved to a CSS file for better organization */}
      <style>
        {`
                    :root {
                        --primary-blue: #00A3E0;
                        --hover-blue: #0086B3;
                        --active-blue: #E6F3FA;
                        --bg-light: #F8FAFC;
                        --text-dark: #1F2A44;
                    }

                    body {
                        font-family: 'Inter', sans-serif;
                    }

                    .bg-blue-100 {
                        background-color: var(--active-blue);
                    }

                    .text-blue-900 {
                        color: var(--hover-blue);
                    }

                    .hover\\:bg-blue-50:hover {
                        background-color: #F1F9FD;
                    }

                    .hover\\:text-blue-900:hover {
                        color: var(--hover-blue);
                    }

                    .bg-red-600 {
                        background-color: #DC2626;
                    }
                `}
      </style>
    </div>
  );
};

export default Layout;