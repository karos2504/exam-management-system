import axios from 'axios';

const API_BASE_URL = '/api';

// Tạo instance axios với cấu hình mặc định
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor để thêm token vào header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor để xử lý response
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
};

// Exam API
export const examAPI = {
  getAll: () => api.get('/exams'),
  getById: (id) => api.get(`/exams/${id}`),
  create: (examData) => api.post('/exams', examData),
  update: (id, examData) => api.put(`/exams/${id}`, examData),
  delete: (id) => api.delete(`/exams/${id}`),
};

// Registration API
export const registrationAPI = {
  register: (examId) => api.post('/registrations', { exam_id: examId }),
  cancel: (examId) => api.delete(`/registrations/${examId}`),
  getMyRegistrations: () => api.get('/registrations/my-registrations'),
  getExamRegistrations: (examId) => api.get(`/registrations/exam/${examId}`),
  confirm: (registrationId) => api.put(`/registrations/confirm/${registrationId}`),
};

// Schedule API
export const scheduleAPI = {
  getAll: () => api.get('/schedules'),
  getByExam: (examId) => api.get(`/schedules/exam/${examId}`),
  create: (scheduleData) => api.post('/schedules', scheduleData),
  update: (id, scheduleData) => api.put(`/schedules/${id}`, scheduleData),
  delete: (id) => api.delete(`/schedules/${id}`),
  checkConflict: (params) => api.get('/schedules/check-conflict', { params }),
};

export default api; 