# Hệ thống Quản lý Đăng ký & Xếp lịch Thi

Hệ thống quản lý đăng ký, xếp lịch thi và kiểm tra thời gian thực cho trường học hoặc trung tâm đào tạo.

## 🚀 Tính năng chính

### 👥 Phân quyền người dùng
- **Student**: Đăng ký/hủy thi, xem lịch thi, quản lý đăng ký cá nhân
- **Teacher**: Tạo/sửa/xóa kỳ thi, xếp lịch thi, xác nhận đăng ký
- **Admin**: Tất cả quyền + quản lý hệ thống

### 📚 Quản lý kỳ thi
- Tạo, sửa, xóa kỳ thi
- Xem danh sách kỳ thi với số lượng đăng ký
- Chi tiết kỳ thi với lịch thi và danh sách đăng ký

### 📅 Xếp lịch thi
- Tạo lịch thi với phòng, thời gian
- Kiểm tra trùng lặp lịch thi tự động
- Tối ưu hóa lịch thi

### 📝 Đăng ký thi
- Học sinh đăng ký kỳ thi
- Hủy đăng ký
- Xác nhận đăng ký (teacher/admin)
- Theo dõi trạng thái đăng ký

### 🔔 Thông báo realtime
- Thông báo xác nhận đăng ký
- Nhắc lịch thi
- Cập nhật realtime qua WebSocket

### 📊 Dashboard
- Thống kê tổng quan
- Kỳ thi gần đây
- Thao tác nhanh

## 🛠️ Công nghệ sử dụng

### Backend
- **Node.js** + **Express.js**
- **MySQL** (chuẩn 3NF)
- **Socket.IO** (realtime)
- **JWT** (authentication)
- **bcryptjs** (mã hóa mật khẩu)

### Frontend
- **React.js** + **Vite**
- **Tailwind CSS** (styling)
- **React Router** (routing)
- **Socket.IO Client** (realtime)
- **React Hook Form** (form handling)
- **React Hot Toast** (notifications)

## 📁 Cấu trúc dự án

```
exam-management-system/
├── schema.sql                 # Database schema
├── server/                    # Backend
│   ├── package.json
│   ├── server.js             # Main server file
│   ├── config/
│   │   └── database.js       # Database connection
│   ├── middleware/
│   │   └── auth.js          # Authentication middleware
│   ├── controllers/          # Business logic
│   │   ├── authController.js
│   │   ├── examController.js
│   │   ├── registrationController.js
│   │   └── scheduleController.js
│   └── routes/              # API routes
│       ├── auth.js
│       ├── exams.js
│       ├── registrations.js
│       └── schedules.js
└── client/                   # Frontend
    ├── package.json
    ├── index.html
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── index.css
    │   ├── components/       # React components
    │   │   ├── Layout.jsx
    │   │   └── LoginForm.jsx
    │   ├── pages/           # Page components
    │   │   ├── Dashboard.jsx
    │   │   ├── Exams.jsx
    │   │   ├── Schedules.jsx
    │   │   ├── MyRegistrations.jsx
    │   │   └── Registrations.jsx
    │   ├── context/         # React context
    │   │   └── AuthContext.jsx
    │   └── services/        # API services
    │       ├── api.js
    │       └── socket.js
    └── tailwind.config.js
```

## 🚀 Cài đặt và chạy

### 1. Clone dự án
```bash
git clone <repository-url>
cd exam-management-system
```

### 2. Cài đặt database
```bash
# Windows
setup-database.bat

# Hoặc thủ công:
mysql -u root -p < setup-database.sql
```

### 3. Cài đặt Backend
```bash
cd server
npm install

# File .env sẽ được tạo tự động khi chạy start.bat
```

### 4. Cài đặt Frontend
```bash
cd client
npm install
```

### 5. Chạy hệ thống
```bash
# Terminal 1 - Backend (port 5000)
cd server
npm run dev

# Terminal 2 - Frontend (port 3000)
cd client
npm run dev
```

## 🔧 Cấu hình

### Backend (.env)
```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=exam_management
DB_PORT=3306

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

## 📱 Sử dụng hệ thống

### 1. Đăng ký tài khoản
- Truy cập: `http://localhost:3000/register`
- Chọn vai trò: Student, Teacher, hoặc Admin

### 2. Đăng nhập
- Truy cập: `http://localhost:3000/login`
- Sử dụng email và mật khẩu đã đăng ký

### 3. Sử dụng theo vai trò

#### Student
- Xem danh sách kỳ thi
- Đăng ký/hủy đăng ký thi
- Xem lịch thi
- Quản lý đăng ký cá nhân

#### Teacher/Admin
- Tạo, sửa, xóa kỳ thi
- Xếp lịch thi
- Xác nhận đăng ký của học sinh
- Xem thống kê

## 🔒 Bảo mật

- **Authentication**: JWT token
- **Authorization**: Role-based access control
- **Password**: bcryptjs hashing
- **CORS**: Cross-origin resource sharing
- **Validation**: Input validation và sanitization

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/profile` - Lấy thông tin profile

### Exams
- `GET /api/exams` - Lấy danh sách kỳ thi
- `POST /api/exams` - Tạo kỳ thi (teacher/admin)
- `PUT /api/exams/:id` - Sửa kỳ thi
- `DELETE /api/exams/:id` - Xóa kỳ thi

### Registrations
- `POST /api/registrations` - Đăng ký thi (student)
- `DELETE /api/registrations/:exam_id` - Hủy đăng ký
- `GET /api/registrations/my-registrations` - Đăng ký của tôi
- `PUT /api/registrations/confirm/:id` - Xác nhận đăng ký

### Schedules
- `GET /api/schedules` - Lấy danh sách lịch thi
- `POST /api/schedules` - Tạo lịch thi
- `PUT /api/schedules/:id` - Sửa lịch thi
- `DELETE /api/schedules/:id` - Xóa lịch thi

## 🐛 Troubleshooting

### Lỗi kết nối database
- Kiểm tra thông tin database trong `.env`
- Đảm bảo MySQL đang chạy
- Kiểm tra quyền truy cập database

### Lỗi CORS
- Kiểm tra `CORS_ORIGIN` trong `.env`
- Đảm bảo frontend và backend chạy đúng port

### Lỗi WebSocket
- Kiểm tra kết nối Socket.IO
- Đảm bảo backend đang chạy

## 📈 Tính năng nâng cao

### Đã hoàn thành
- ✅ Authentication & Authorization
- ✅ CRUD operations cho tất cả entities
- ✅ Realtime updates với WebSocket
- ✅ Responsive UI với Tailwind CSS
- ✅ Form validation
- ✅ Error handling
- ✅ Loading states

### Có thể mở rộng
- 📧 Email notifications
- 📱 Mobile app
- 📊 Advanced analytics
- 🔍 Search và filter
- 📄 Export reports
- 🔔 Push notifications

## 🤝 Đóng góp

1. Fork dự án
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 📄 License

Dự án này được phát hành dưới MIT License.

## 📞 Liên hệ

Nếu có câu hỏi hoặc góp ý, vui lòng tạo issue hoặc liên hệ trực tiếp. 