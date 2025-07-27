import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import socketService from '../services/socket';

const AuthContext = createContext();

export const useAuth = () => {
  const contexts = useContext(AuthContext);
  if (!contexts) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return contexts;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('token');
      const savedUser = JSON.parse(localStorage.getItem('user') || 'null');

      if (savedToken && savedUser && isMounted) {
        console.log('🌟 [AuthProvider] Saved token:', savedToken);
        console.log('🌟 [AuthProvider] Saved user:', savedUser);

        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
          const response = await api.get('/auth/profile');
          const profileUser = response.data.user || response.data;

          if (isMounted) {
            setUser(profileUser);
            setToken(savedToken);

            if (['teacher', 'student', 'admin'].includes(profileUser.role)) {
              socketService.connect({ id: profileUser.id, role: profileUser.role });
              socketService.joinRoom({ id: profileUser.id, role: profileUser.role });
            }
          }
        } catch (error) {
          console.error('❌ [AuthProvider] Failed to get profile:', error);
          if (isMounted) {
            logout();
          }
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      socketService.disconnect();
    };
  }, []);

  const login = async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { token: newToken, user: userData } = response.data;

      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setToken(newToken);
      setUser(userData);

      if (['teacher', 'student', 'admin'].includes(userData.role)) {
        socketService.connect({ id: userData.id, role: userData.role });
        socketService.joinRoom({ id: userData.id, role: userData.role });
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Đăng nhập thất bại',
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return { success: true, data: response.data };
    } catch (error) {
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