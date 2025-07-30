import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import socketService from '../services/socketService';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    let isMounted = true;

    const authenticateAndConnectSocket = async () => {
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          console.log('[AuthProvider] Fetching user profile with token:', token);
          const response = await api.get('/auth/profile');
          console.log('[AuthProvider] Profile response:', response.data);
          const profileUser = response.data.user || response.data;

          if (isMounted) {
            setUser(profileUser);
            localStorage.setItem('user', JSON.stringify(profileUser));

            if (['teacher', 'student', 'admin'].includes(profileUser.role)) {
              try {
                await socketService.connect({
                  id: profileUser.id,
                  role: profileUser.role,
                  username: profileUser.username,
                  full_name: profileUser.full_name,
                });
                // Set up socket listeners after connection
                socketService.onUserLogin((data) => {
                  console.log('A user just logged in (from Socket.IO broadcast):', data);
                  toast.info(`${data.username || `User ${data.userId}`} (${data.role}) just logged in!`);
                });
                console.log('[AuthProvider] Socket connected for user:', profileUser.id);
              } catch (socketError) {
                console.error('❌ [AuthProvider] Socket connection failed:', socketError);
                toast.error('Không thể kết nối đến máy chủ thông báo.');
              }
            } else {
              socketService.disconnect();
            }
          }
        } catch (error) {
          console.error('❌ [AuthProvider] Failed to get profile, logging out:', error);
          if (isMounted) {
            logout();
            toast.error('Phiên đăng nhập hết hạn hoặc không hợp lệ.');
          }
        }
      } else {
        if (isMounted) {
          setUser(null);
          localStorage.removeItem('user');
          socketService.disconnect();
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    authenticateAndConnectSocket();

    return () => {
      isMounted = false;
      socketService.off('user-login');
      socketService.disconnect();
    };
  }, [token]);

  const login = async (credentials) => {
    try {
      console.log('[AuthProvider] Starting login with credentials:', credentials);
      const response = await api.post('/auth/login', credentials);
      console.log('[AuthProvider] Login API response:', response.data);

      if (response.status !== 200 || !response.data.token || !response.data.user) {
        console.error('[AuthProvider] Invalid login response:', response.data);
        throw new Error(response.data.message || 'Invalid login response from server');
      }

      const { token: newToken, user: userDataFromLogin } = response.data;
      console.log('[AuthProvider] Setting token and user:', { newToken, userDataFromLogin });

      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userDataFromLogin));
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setToken(newToken);
      setUser(userDataFromLogin);

      if (['teacher', 'student', 'admin'].includes(userDataFromLogin.role)) {
        try {
          await socketService.connect({
            id: userDataFromLogin.id,
            role: userDataFromLogin.role,
            username: userDataFromLogin.username,
            full_name: userDataFromLogin.full_name,
          });
          console.log('[AuthProvider] Socket connected successfully for user:', userDataFromLogin.id);
        } catch (socketError) {
          console.error('❌ [AuthProvider] Socket connection failed after login:', socketError);
          toast.error('Không thể kết nối đến máy chủ thông báo.');
        }
      }

      console.log('[AuthProvider] Login successful, triggering success toast');
      toast.success('Đăng nhập thành công!');
      return { success: true };
    } catch (error) {
      console.error('[AuthProvider] Login failed:', error.response?.data?.message || error.message);
      toast.error(error.response?.data?.message || 'Đăng nhập thất bại', {
        id: 'login-error',
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Đăng nhập thất bại',
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      toast.success('Đăng ký thành công!');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Registration failed:', error.response?.data?.message || error.message);
      toast.error(error.response?.data?.message || 'Đăng ký thất bại', {
        id: 'register-error',
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Đăng ký thất bại',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
    socketService.disconnect();
    toast.success('Đăng xuất thành công!');
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};