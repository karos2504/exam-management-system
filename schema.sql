-- =============================
-- LMS Database Schema (MySQL, dùng UUID)
-- =============================

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
    exam_id VARCHAR( 36) NOT NULL,
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_type (type)
);

-- =============================
-- DỮ LIỆU MẪU CHO HỆ THỐNG LMS
-- =============================

-- USERS
INSERT INTO users (id, username, password_hash, email, full_name, phone, role, avatar_url)
VALUES
  ('admin-uuid', 'admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@gmail.com', 'Quản Trị Viên', '0123456789', 'admin', NULL),
  ('teacher-1', 'teacher1', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher1@gmail.com', 'Nguyễn Văn A', '0987654321', 'teacher', NULL),
  ('teacher-2', 'teacher2', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher2@gmail.com', 'Trần Thị B', '0911222333', 'teacher', NULL),
  ('teacher-3', 'teacher3', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher3@gmail.com', 'Lê Văn C', '0922333444', 'teacher', NULL),
  ('teacher-4', 'teacher4', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher4@gmail.com', 'Phạm Thị D', '0933444555', 'teacher', NULL),
  ('teacher-5', 'teacher5', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher5@gmail.com', 'Hoàng Văn E', '0944555666', 'teacher', NULL),
  ('student-1', 'student1', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student1@gmail.com', 'Lê Văn C', '0900111222', 'student', NULL),
  ('student-2', 'student2', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student2@gmail.com', 'Phạm Thị D', '0900333444', 'student', NULL),
  ('student-3', 'student3', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student3@gmail.com', 'Hoàng Văn E', '0900555666', 'student', NULL);

-- COURSES
INSERT INTO courses (id, name, description, code, teacher_id)
VALUES
  ('course-1', 'Toán 12', 'Toán học lớp 12', 'MATH12', 'teacher-1'),
  ('course-2', 'Văn 12', 'Ngữ văn lớp 12', 'LIT12', 'teacher-2');

-- COURSE_ENROLLMENTS
INSERT INTO course_enrollments (id, course_id, student_id)
VALUES
  ('enroll-1', 'course-1', 'student-1'),
  ('enroll-2', 'course-1', 'student-2'),
  ('enroll-3', 'course-2', 'student-2'),
  ('enroll-4', 'course-2', 'student-3');

-- EXAMS
INSERT INTO exams (id, code, name, description, subject_code, subject_name, exam_type, semester, duration_minutes, created_by)
VALUES
  ('exam-1', 'EXAM-MATH12', 'Thi cuối kỳ Toán', 'Thi cuối kỳ môn Toán', 'MATH12', 'Toán 12', 'Trắc nghiệm', 'HK2', 120, 'admin-uuid'),
  ('exam-2', 'EXAM-LIT12', 'Thi cuối kỳ Văn', 'Thi cuối kỳ môn Văn', 'LIT12', 'Văn 12', 'Tự luận', 'HK2', 120, 'admin-uuid'),
  ('exam-3', 'EXAM-PHYSICS', 'Thi cuối kỳ Vật lý', 'Thi cuối kỳ môn Vật lý', 'PHY12', 'Vật lý 12', 'Trắc nghiệm + Tự luận', 'HK2', 90, 'admin-uuid'),
  ('exam-4', 'EXAM-CHEMISTRY', 'Thi cuối kỳ Hóa học', 'Thi cuối kỳ môn Hóa học', 'CHEM12', 'Hóa học 12', 'Trắc nghiệm', 'HK2', 90, 'admin-uuid'),
  ('exam-5', 'EXAM-BIOLOGY', 'Thi cuối kỳ Sinh học', 'Thi cuối kỳ môn Sinh học', 'BIO12', 'Sinh học 12', 'Trắc nghiệm + Tự luận', 'HK2', 90, 'admin-uuid'),
  ('exam-6', 'EXAM-HISTORY', 'Thi cuối kỳ Lịch sử', 'Thi cuối kỳ môn Lịch sử', 'HIST12', 'Lịch sử 12', 'Tự luận', 'HK2', 90, 'admin-uuid'),
  ('exam-7', 'EXAM-GEOGRAPHY', 'Thi cuối kỳ Địa lý', 'Thi cuối kỳ môn Địa lý', 'GEO12', 'Địa lý 12', 'Trắc nghiệm + Tự luận', 'HK2', 90, 'admin-uuid'),
  ('exam-8', 'EXAM-ENGLISH', 'Thi cuối kỳ Tiếng Anh', 'Thi cuối kỳ môn Tiếng Anh', 'ENG12', 'Tiếng Anh 12', 'Trắc nghiệm + Tự luận', 'HK2', 90, 'admin-uuid');

-- EXAM_ASSIGNMENTS
INSERT INTO exam_assignments (id, exam_id, teacher_id, assigned_by, status, notes)
VALUES
  ('assign-1', 'exam-1', 'teacher-1', 'admin-uuid', 'accepted', 'Phân công cho giáo viên Toán'),
  ('assign-2', 'exam-2', 'teacher-2', 'admin-uuid', 'accepted', 'Phân công cho giáo viên Văn'),
  ('assign-3', 'exam-3', 'teacher-1', 'admin-uuid', 'assigned', 'Phân công cho giáo viên Toán (có thể dạy Vật lý)');

-- SCHEDULES
INSERT INTO schedules (id, exam_id, room, start_time, end_time)
VALUES
  ('sched-1', 'exam-1', 'A101', '2024-06-20 08:00:00', '2024-06-20 10:00:00'),
  ('sched-2', 'exam-2', 'B202', '2024-06-21 08:00:00', '2024-06-21 10:00:00'),
  ('sched-3', 'exam-3', 'C303', '2024-06-22 08:00:00', '2024-06-22 09:30:00');

-- EXAM_REGISTRATIONS
INSERT INTO exam_registrations (id, exam_id, student_id, status)
VALUES
  ('reg-1', 'exam-1', 'student-1', 'approved'),
  ('reg-2', 'exam-1', 'student-2', 'approved'),
  ('reg-3', 'exam-2', 'student-2', 'approved'),
  ('reg-4', 'exam-2', 'student-3', 'pending'),
  ('reg-5', 'exam-3', 'student-1', 'approved'),
  ('reg-6', 'exam-3', 'student-3', 'approved');

-- NOTIFICATIONS
INSERT INTO notifications (id, user_id, type, content, is_read)
VALUES
  ('noti-1', 'student-1', 'registration', 'Bạn đã đăng ký thành công kỳ thi Toán.', 0),
  ('noti-2', 'student-2', 'registration', 'Bạn đã đăng ký thành công kỳ thi Toán.', 0),
  ('noti-3', 'student-2', 'registration', 'Bạn đã đăng ký thành công kỳ thi Văn.', 0),
  ('noti-4', 'student-3', 'registration', 'Bạn đã đăng ký kỳ thi Văn, chờ xác nhận.', 0),
  ('noti-5', 'teacher-1', 'assignment', 'Bạn được phân công phụ trách kỳ thi Toán.', 0),
  ('noti-6', 'teacher-2', 'assignment', 'Bạn được phân công phụ trách kỳ thi Văn.', 0),
  ('noti-7', 'teacher-1', 'assignment', 'Bạn được phân công phụ trách kỳ thi Vật lý.', 0),
  ('noti-8', NULL, 'system', 'Hệ thống bảo trì định kỳ vào 01:00 ngày 27/07/2025.', 0),
  ('noti-9', NULL, 'system', 'Cập nhật lịch thi mới cho HK2.', 0);