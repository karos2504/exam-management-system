-- =============================
-- LMS Database Schema (MySQL, dùng UUID)
-- =============================

-- Drop existing database if it exists and create a new one to ensure a clean slate
DROP DATABASE IF EXISTS exam_management;
CREATE DATABASE IF NOT EXISTS exam_management;
USE exam_management;

-- 1. USERS: Người dùng (Admin, Teacher, Student)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role ENUM('admin', 'teacher', 'student') NOT NULL,
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_role (role),
    INDEX idx_users_email (email)
);

-- 2. COURSES: Khóa học
CREATE TABLE IF NOT EXISTS courses (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    code VARCHAR(20) NOT NULL UNIQUE,
    teacher_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_courses_code (code)
);

-- 3. COURSE_ENROLLMENTS: Đăng ký khóa học
CREATE TABLE IF NOT EXISTS course_enrollments (
    id VARCHAR(36) PRIMARY KEY,
    course_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (course_id, student_id),
    INDEX idx_enrollments_student (student_id)
);

-- 4. EXAMS: Kỳ thi
CREATE TABLE IF NOT EXISTS exams (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    subject_code VARCHAR(20) NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    exam_type VARCHAR(50),
    semester VARCHAR(20),
    duration_minutes INT NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_exams_code (code),
    INDEX idx_exams_subject (subject_code)
);

-- 5. EXAM_ASSIGNMENTS: Phân công teacher cho exam
CREATE TABLE IF NOT EXISTS exam_assignments (
    id VARCHAR(36) PRIMARY KEY,
    exam_id VARCHAR(36) NOT NULL,
    teacher_id VARCHAR(36) NOT NULL,
    assigned_by VARCHAR(36) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('assigned', 'accepted', 'declined') DEFAULT 'assigned',
    notes TEXT,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (exam_id, teacher_id),
    INDEX idx_assignments_teacher (teacher_id)
);

-- 6. SCHEDULES: Lịch thi
CREATE TABLE IF NOT EXISTS schedules (
    id VARCHAR(36) PRIMARY KEY,
    exam_id VARCHAR(36) NOT NULL,
    room VARCHAR(50) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    INDEX idx_schedules_exam (exam_id),
    INDEX idx_schedules_time (start_time)
);

-- 7. EXAM_REGISTRATIONS: Đăng ký thi
CREATE TABLE IF NOT EXISTS exam_registrations (
    id VARCHAR(36) PRIMARY KEY,
    exam_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    -- Bổ sung cột updated_at để theo dõi thời điểm thay đổi trạng thái
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (exam_id, student_id),
    INDEX idx_registrations_student (student_id)
);

-- 8. QUESTIONS: Câu hỏi
CREATE TABLE IF NOT EXISTS questions (
    id VARCHAR(36) PRIMARY KEY,
    exam_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    type ENUM('multiple_choice', 'essay') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    INDEX idx_questions_exam (exam_id)
);

-- 9. CHOICES: Đáp án trắc nghiệm
CREATE TABLE IF NOT EXISTS choices (
    id VARCHAR(36) PRIMARY KEY,
    question_id VARCHAR(36) NOT NULL,
    content VARCHAR(255) NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    INDEX idx_choices_question (question_id)
);

-- 10. SUBMISSIONS: Bài nộp
CREATE TABLE IF NOT EXISTS submissions (
    id VARCHAR(36) PRIMARY KEY,
    exam_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    score DECIMAL(5,2),
    status ENUM('submitted', 'graded', 'reviewed') DEFAULT 'submitted',
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_submissions_student (student_id),
    INDEX idx_submissions_exam (exam_id)
);

-- 11. SUBMISSION_ANSWERS: Câu trả lời của học sinh
CREATE TABLE IF NOT EXISTS submission_answers (
    id VARCHAR(36) PRIMARY KEY,
    submission_id VARCHAR(36) NOT NULL,
    question_id VARCHAR(36) NOT NULL,
    answer_text TEXT,
    choice_id VARCHAR(36),
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (choice_id) REFERENCES choices(id) ON DELETE SET NULL,
    INDEX idx_submission_answers_submission (submission_id)
);

-- 12. NOTIFICATIONS: Thông báo
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    type ENUM('registration', 'reminder', 'result', 'system', 'assignment', 'other') DEFAULT 'other',
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    exam_id VARCHAR(36),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE SET NULL,
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_type (type)
);

---
---
-- =============================
-- DỮ LIỆU MẪU CHO HỆ THỐNG LMS (Với UUID hợp lệ đã được kiểm tra cẩn thận)
-- =============================
---

-- UUIDs hợp lệ đã được tạo mới và kiểm tra độ dài chính xác
-- Đảm bảo chữ số đầu tiên của nhóm thứ 3 là '4' và nhóm thứ 4 là '8', '9', 'A', 'B'

SET @admin_uuid = 'e7a5b3d9-2c6f-4a8e-8b1d-0c2f3a4b5d6e';
SET @teacher1_uuid = '1f9c8b7a-3e5d-4f0c-9a2b-3c4d5e6f7a8b';
SET @teacher2_uuid = 'a0e9d8c7-6b5a-4f4d-8e3c-2b1a0d9e8f7c';
SET @teacher3_uuid = '4d5e6f7a-8b9c-4012-a3b4-c5d6e7f8a9b0';
SET @teacher4_uuid = '8c7b6a5d-4e3f-4123-90ab-cdef12345678';
SET @teacher5_uuid = 'f2e1d0c9-b8a7-4965-8d4c-3b2a10987654';
SET @student1_uuid = '7a6b5c4d-3e2f-4109-8765-4321fedcba98';
SET @student2_uuid = '2b1c0d9e-8f7a-4234-a5b6-c7d8e9f0a1b2';
SET @student3_uuid = '6e5d4c3b-2a10-4876-b543-21fedcba9876';

SET @course1_uuid = '0f1e2d3c-4b5a-4678-9d0e-1f2a3b4c5d6e';
SET @course2_uuid = '5c4b3a2d-1e0f-4321-8765-4321fedcba09';

SET @enroll1_uuid = '9a8b7c6d-5e4f-4012-a3b4-c5d6e7f8a901';
SET @enroll2_uuid = '3d2c1b0a-9e8f-4456-b789-0123456789ab';
SET @enroll3_uuid = '8f7e6d5c-4b3a-4901-8234-56789abcdef0';
SET @enroll4_uuid = 'c2b1a0d9-e8f7-4654-a321-0fedcba98765';

SET @exam1_uuid = '7a6b5c4d-3e2f-4109-8765-4321fedcba12';
SET @exam2_uuid = '2b1c0d9e-8f7a-4234-a5b6-c7d8e9f0a134';
SET @exam3_uuid = '6e5d4c3b-2a10-4876-b543-21fedcba9856';
SET @exam4_uuid = '0f1e2d3c-4b5a-4678-9d0e-1f2a3b4c5d78';
SET @exam5_uuid = '5c4b3a2d-1e0f-4321-8765-4321fedcba90';
SET @exam6_uuid = '9a8b7c6d-5e4f-4012-a3b4-c5d6e7f8a923';
SET @exam7_uuid = '3d2c1b0a-9e8f-4456-b789-0123456789cd';
SET @exam8_uuid = '8f7e6d5c-4b3a-4901-8234-56789abcdef1';

SET @assign1_uuid = 'c2b1a0d9-e8f7-4654-a321-0fedcba98767';
SET @assign2_uuid = '7a6b5c4d-3e2f-4109-8765-4321fedcba34';
SET @assign3_uuid = '2b1c0d9e-8f7a-4234-a5b6-c7d8e9f0a156';

SET @sched1_uuid = '6e5d4c3b-2a10-4876-b543-21fedcba9889';
SET @sched2_uuid = '0f1e2d3c-4b5a-4678-9d0e-1f2a3b4c5d90';
SET @sched3_uuid = '5c4b3a2d-1e0f-4321-8765-4321fedcba01';

SET @reg1_uuid = '9a8b7c6d-5e4f-4012-a3b4-c5d6e7f8a945';
SET @reg2_uuid = '3d2c1b0a-9e8f-4456-b789-0123456789ef';
SET @reg3_uuid = '8f7e6d5c-4b3a-4901-8234-56789abcdef2';
SET @reg4_uuid = 'c2b1a0d9-e8f7-4654-a321-0fedcba98789';
SET @reg5_uuid = '7a6b5c4d-3e2f-4109-8765-4321fedcba67';
SET @reg6_uuid = '2b1c0d9e-8f7a-4234-a5b6-c7d8e9f0a189';

SET @noti1_uuid = '6e5d4c3b-2a10-4876-b543-21fedcba9801';
SET @noti2_uuid = '0f1e2d3c-4b5a-4678-9d0e-1f2a3b4c5d12';
SET @noti3_uuid = '5c4b3a2d-1e0f-4321-8765-4321fedcba34';
SET @noti4_uuid = '9a8b7c6d-5e4f-4012-a3b4-c5d6e7f8a967';
SET @noti5_uuid = '3d2c1b0a-9e8f-4456-b789-0123456789ab';
SET @noti6_uuid = '8f7e6d5c-4b3a-4901-8234-56789abcdef3';
SET @noti7_uuid = 'c2b1a0d9-e8f7-4654-a321-0fedcba98701';
SET @noti8_uuid = '7a6b5c4d-3e2f-4109-8765-4321fedcba23';
SET @noti9_uuid = '2b1c0d9e-8f7a-4234-a5b6-c7d8e9f0a145';


-- USERS
INSERT INTO users (id, username, password_hash, email, full_name, phone, role, avatar_url)
VALUES
    (@admin_uuid, 'admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@gmail.com', 'Quản Trị Viên', '0123456789', 'admin', NULL),
    (@teacher1_uuid, 'teacher1', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher1@gmail.com', 'Nguyễn Văn A', '0987654321', 'teacher', NULL),
    (@teacher2_uuid, 'teacher2', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher2@gmail.com', 'Trần Thị B', '0911222333', 'teacher', NULL),
    (@teacher3_uuid, 'teacher3', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher3@gmail.com', 'Lê Văn C', '0922333444', 'teacher', NULL),
    (@teacher4_uuid, 'teacher4', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher4@gmail.com', 'Phạm Thị D', '0933444555', 'teacher', NULL),
    (@teacher5_uuid, 'teacher5', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher5@gmail.com', 'Hoàng Văn E', '0944555666', 'teacher', NULL),
    (@student1_uuid, 'student1', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student1@gmail.com', 'Lê Văn C', '0900111222', 'student', NULL),
    (@student2_uuid, 'student2', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student2@gmail.com', 'Phạm Thị D', '0900333444', 'student', NULL),
    (@student3_uuid, 'student3', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student3@gmail.com', 'Hoàng Văn E', '0900555666', 'student', NULL);

-- COURSES
INSERT INTO courses (id, name, description, code, teacher_id)
VALUES
    (@course1_uuid, 'Toán 12', 'Toán học lớp 12', 'MATH12', @teacher1_uuid),
    (@course2_uuid, 'Văn 12', 'Ngữ văn lớp 12', 'LIT12', @teacher2_uuid);

-- COURSE_ENROLLMENTS
INSERT INTO course_enrollments (id, course_id, student_id)
VALUES
    (@enroll1_uuid, @course1_uuid, @student1_uuid),
    (@enroll2_uuid, @course1_uuid, @student2_uuid),
    (@enroll3_uuid, @course2_uuid, @student2_uuid),
    (@enroll4_uuid, @course2_uuid, @student3_uuid);

-- EXAMS
INSERT INTO exams (id, code, name, description, subject_code, subject_name, exam_type, semester, duration_minutes, created_by)
VALUES
    (@exam1_uuid, 'EXAM-MATH12', 'Thi cuối kỳ Toán', 'Thi cuối kỳ môn Toán', 'MATH12', 'Toán 12', 'Trắc nghiệm', 'HK2', 120, @admin_uuid),
    (@exam2_uuid, 'EXAM-LIT12', 'Thi cuối kỳ Văn', 'Thi cuối kỳ môn Văn', 'LIT12', 'Văn 12', 'Tự luận', 'HK2', 120, @admin_uuid),
    (@exam3_uuid, 'EXAM-PHYSICS', 'Thi cuối kỳ Vật lý', 'Thi cuối kỳ môn Vật lý', 'PHY12', 'Vật lý 12', 'Trắc nghiệm + Tự luận', 'HK2', 90, @admin_uuid),
    (@exam4_uuid, 'EXAM-CHEMISTRY', 'Thi cuối kỳ Hóa học', 'Thi cuối kỳ môn Hóa học', 'CHEM12', 'Hóa học 12', 'Trắc nghiệm', 'HK2', 90, @admin_uuid),
    (@exam5_uuid, 'EXAM-BIOLOGY', 'Thi cuối kỳ Sinh học', 'Thi cuối kỳ môn Sinh học', 'BIO12', 'Sinh học 12', 'Trắc nghiệm + Tự luận', 'HK2', 90, @admin_uuid),
    (@exam6_uuid, 'EXAM-HISTORY', 'Thi cuối kỳ Lịch sử', 'Thi cuối kỳ môn Lịch sử', 'HIST12', 'Lịch sử 12', 'Tự luận', 'HK2', 90, @admin_uuid),
    (@exam7_uuid, 'EXAM-GEOGRAPHY', 'Thi cuối kỳ Địa lý', 'Thi cuối kỳ môn Địa lý', 'GEO12', 'Địa lý 12', 'Trắc nghiệm + Tự luận', 'HK2', 90, @admin_uuid),
    (@exam8_uuid, 'EXAM-ENGLISH', 'Thi cuối kỳ Tiếng Anh', 'Thi cuối kỳ môn Tiếng Anh', 'ENG12', 'Tiếng Anh 12', 'Trắc nghiệm + Tự luận', 'HK2', 90, @admin_uuid);

-- EXAM_ASSIGNMENTS
INSERT INTO exam_assignments (id, exam_id, teacher_id, assigned_by, status, notes)
VALUES
    (@assign1_uuid, @exam1_uuid, @teacher1_uuid, @admin_uuid, 'accepted', 'Phân công cho giáo viên Toán'),
    (@assign2_uuid, @exam2_uuid, @teacher2_uuid, @admin_uuid, 'accepted', 'Phân công cho giáo viên Văn'),
    (@assign3_uuid, @exam3_uuid, @teacher1_uuid, @admin_uuid, 'assigned', 'Phân công cho giáo viên Toán (có thể dạy Vật lý)');

-- SCHEDULES
INSERT INTO schedules (id, exam_id, room, start_time, end_time)
VALUES
    (@sched1_uuid, @exam1_uuid, 'A101', '2025-07-20 08:00:00', '2025-07-20 10:00:00'),
    (@sched2_uuid, @exam2_uuid, 'B202', '2025-07-21 08:00:00', '2025-07-21 10:00:00'),
    (@sched3_uuid, @exam3_uuid, 'C303', '2025-07-22 08:00:00', '2025-07-22 09:30:00');

-- EXAM_REGISTRATIONS
-- Lưu ý: Cột updated_at sẽ tự động cập nhật khi trạng thái thay đổi
INSERT INTO exam_registrations (id, exam_id, student_id, registered_at, status)
VALUES
    (@reg1_uuid, @exam1_uuid, @student1_uuid, '2025-07-15 10:00:00', 'approved'),
    (@reg2_uuid, @exam1_uuid, @student2_uuid, '2025-07-15 10:05:00', 'approved'),
    (@reg3_uuid, @exam2_uuid, @student2_uuid, '2025-07-16 11:00:00', 'approved'),
    (@reg4_uuid, @exam2_uuid, @student3_uuid, '2025-07-16 11:10:00', 'pending'),
    (@reg5_uuid, @exam3_uuid, @student1_uuid, '2025-07-17 09:00:00', 'approved'),
    (@reg6_uuid, @exam3_uuid, @student3_uuid, '2025-07-17 09:15:00', 'approved');

-- NOTIFICATIONS
INSERT INTO notifications (id, user_id, type, content, is_read, exam_id)
VALUES
    (@noti1_uuid, @student1_uuid, 'registration', 'Bạn đã đăng ký thành công kỳ thi Toán.', 0, @exam1_uuid),
    (@noti2_uuid, @student2_uuid, 'registration', 'Bạn đã đăng ký thành công kỳ thi Toán.', 0, @exam1_uuid),
    (@noti3_uuid, @student2_uuid, 'registration', 'Bạn đã đăng ký thành công kỳ thi Văn.', 0, @exam2_uuid),
    (@noti4_uuid, @student3_uuid, 'registration', 'Bạn đã đăng ký kỳ thi Văn, chờ xác nhận.', 0, @exam2_uuid),
    (@noti5_uuid, @teacher1_uuid, 'assignment', 'Bạn được phân công phụ trách kỳ thi Toán.', 0, @exam1_uuid),
    (@noti6_uuid, @teacher2_uuid, 'assignment', 'Bạn được phân công phụ trách kỳ thi Văn.', 0, @exam2_uuid),
    (@noti7_uuid, @teacher1_uuid, 'assignment', 'Bạn được phân công phụ trách kỳ thi Vật lý.', 0, @exam3_uuid),
    (@noti8_uuid, NULL, 'system', 'Hệ thống bảo trì định kỳ vào 01:00 ngày 27/07/2025.', 0, NULL),
    (@noti9_uuid, NULL, 'system', 'Cập nhật lịch thi mới cho HK2.', 0, NULL);