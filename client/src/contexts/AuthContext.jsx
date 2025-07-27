import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import socketService from '../services/socket';
import toast from 'react-hot-toast'; // Assuming you use react-hot-toast for notifications

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
          const response = await api.get('/auth/profile');
          const profileUser = response.data.user || response.data;

          if (isMounted) {
            setUser(profileUser);
            localStorage.setItem('user', JSON.stringify(profileUser));

            if (['teacher', 'student', 'admin'].includes(profileUser.role)) {
              try {
                // AWAIT the socket connection
                await socketService.connect({ id: profileUser.id, role: profileUser.role });
                // ONLY call joinRoom after connection is confirmed
                socketService.joinRoom({ id: profileUser.id, role: profileUser.role });
              } catch (socketError) {
                console.error('❌ [AuthProvider] Socket connection failed:', socketError);
                toast.error('Không thể kết nối đến máy chủ thông báo.');
                // Decide if you want to log out or just warn here
                // For now, it will just warn and continue with auth
              }
            } else {
              socketService.disconnect();
            }
          }
        } catch (error) {
          console.error('❌ [AuthProvider] Failed to get profile, logging out:', error);
          if (isMounted) {
            logout();
            toast.error('Phiên đăng nhập hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.');
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
      // This ensures socket is disconnected if AuthProvider unmounts for any reason
      // (e.g., app closure, but often not on route changes if it wraps the whole app).
      // logout() also explicitly disconnects.
      socketService.disconnect();
    };
  }, [token]);

  const login = async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { token: newToken } = response.data; // userData will be fetched by useEffect

      localStorage.setItem('token', newToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setToken(newToken); // This triggers the useEffect to fetch profile and connect socket
      toast.success('Đăng nhập thành công!');

      return { success: true };
    } catch (error) {
      console.error('Login failed:', error.response?.data?.message || error.message);
      toast.error(error.response?.data?.message || 'Đăng nhập thất bại');
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
      toast.error(error.response?.data?.message || 'Đăng ký thất bại');
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
    socketService.disconnect(); // Ensure immediate socket disconnect on explicit logout
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