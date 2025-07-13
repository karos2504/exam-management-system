CREATE DATABASE IF NOT EXISTS exam_management;
USE exam_management;

-- Tạo bảng users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'teacher', 'admin') NOT NULL
);

-- Tạo bảng exams
CREATE TABLE IF NOT EXISTS exams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tạo bảng schedules
CREATE TABLE IF NOT EXISTS schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_id INT NOT NULL,
    room VARCHAR(50) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    FOREIGN KEY (exam_id) REFERENCES exams(id)
);

-- Tạo bảng registrations
CREATE TABLE IF NOT EXISTS registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    exam_id INT NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (exam_id) REFERENCES exams(id),
    UNIQUE KEY unique_registration (user_id, exam_id)
);

-- Tạo bảng notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    type ENUM('reminder', 'confirmation', 'other') NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Thêm dữ liệu demo
INSERT INTO users (name, email, password, role) VALUES
('Admin User', 'admin@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('Teacher 1', 'teacher1@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher'),
('Teacher 2', 'teacher2@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher'),
('Student 1', 'student1@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student'),
('Student 2', 'student2@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student'),
('Student 3', 'student3@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student');

INSERT INTO exams (name, subject, created_by) VALUES
('Kỳ thi cuối kỳ Toán', 'Toán học', 2),
('Kỳ thi cuối kỳ Văn', 'Ngữ văn', 2),
('Kỳ thi cuối kỳ Anh', 'Tiếng Anh', 3),
('Kỳ thi giữa kỳ Lý', 'Vật lý', 2),
('Kỳ thi cuối kỳ Hóa', 'Hóa học', 3);

INSERT INTO schedules (exam_id, room, start_time, end_time) VALUES
(1, 'Phòng A101', '2024-01-15 08:00:00', '2024-01-15 10:00:00'),
(1, 'Phòng A102', '2024-01-15 08:00:00', '2024-01-15 10:00:00'),
(2, 'Phòng B201', '2024-01-16 14:00:00', '2024-01-16 16:00:00'),
(3, 'Phòng C301', '2024-01-17 09:00:00', '2024-01-17 11:00:00'),
(4, 'Phòng A103', '2024-01-18 13:00:00', '2024-01-18 15:00:00'),
(5, 'Phòng B202', '2024-01-19 08:00:00', '2024-01-19 10:00:00');

INSERT INTO registrations (user_id, exam_id, status) VALUES
(4, 1, 'confirmed'),
(5, 1, 'pending'),
(6, 1, 'confirmed'),
(4, 2, 'confirmed'),
(5, 2, 'cancelled'),
(6, 3, 'pending'),
(4, 4, 'confirmed'),
(5, 4, 'confirmed'),
(6, 5, 'pending');

INSERT INTO notifications (user_id, message, type) VALUES
(4, 'Đăng ký kỳ thi "Kỳ thi cuối kỳ Toán" thành công. Vui lòng chờ xác nhận.', 'confirmation'),
(4, 'Đăng ký kỳ thi "Kỳ thi cuối kỳ Toán" đã được xác nhận.', 'confirmation'),
(5, 'Đăng ký kỳ thi "Kỳ thi cuối kỳ Toán" thành công. Vui lòng chờ xác nhận.', 'confirmation'),
(6, 'Đăng ký kỳ thi "Kỳ thi cuối kỳ Toán" thành công. Vui lòng chờ xác nhận.', 'confirmation'),
(6, 'Đăng ký kỳ thi "Kỳ thi cuối kỳ Toán" đã được xác nhận.', 'confirmation'),
(4, 'Đăng ký kỳ thi "Kỳ thi cuối kỳ Văn" thành công. Vui lòng chờ xác nhận.', 'confirmation'),
(4, 'Đăng ký kỳ thi "Kỳ thi cuối kỳ Văn" đã được xác nhận.', 'confirmation'),
(5, 'Đã hủy đăng ký kỳ thi thành công.', 'other'),
(6, 'Đăng ký kỳ thi "Kỳ thi cuối kỳ Anh" thành công. Vui lòng chờ xác nhận.', 'confirmation'),
(4, 'Đăng ký kỳ thi "Kỳ thi giữa kỳ Lý" thành công. Vui lòng chờ xác nhận.', 'confirmation'),
(4, 'Đăng ký kỳ thi "Kỳ thi giữa kỳ Lý" đã được xác nhận.', 'confirmation'),
(5, 'Đăng ký kỳ thi "Kỳ thi giữa kỳ Lý" thành công. Vui lòng chờ xác nhận.', 'confirmation'),
(5, 'Đăng ký kỳ thi "Kỳ thi giữa kỳ Lý" đã được xác nhận.', 'confirmation'),
(6, 'Đăng ký kỳ thi "Kỳ thi cuối kỳ Hóa" thành công. Vui lòng chờ xác nhận.', 'confirmation');