-- ==============================================================================
-- 003_seed.sql: Dữ liệu mẫu khởi tạo cho Task Tracker
-- Mật khẩu mặc định:
-- Admin: admin@gmail.com / Mk123!
-- User:  quan.nm@gmail.com / Mk123!
-- User:  hoang.nh@gmail.com / Mk123!
-- User:  lan.ht@gmail.com / Mk123!
-- ==============================================================================

-- 1. Người dùng mẫu
INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES
('admin@gmail.com', '$2a$10$EJaLB43l8XJ4FiYi4aa6B.U1kyyK7SIHTcXOSujSi5wZj/etthgZy', 'Quản trị viên Hệ thống', 'admin', TRUE),
('quan.nm@gmail.com', '$2a$10$EJaLB43l8XJ4FiYi4aa6B.U1kyyK7SIHTcXOSujSi5wZj/etthgZy', 'Nguyễn Minh Quân', 'member', TRUE),
('hoang.nh@gmail.com', '$2a$10$EJaLB43l8XJ4FiYi4aa6B.U1kyyK7SIHTcXOSujSi5wZj/etthgZy', 'Nguyễn Huy Hoàng', 'member', TRUE),
('lan.ht@gmail.com', '$2a$10$EJaLB43l8XJ4FiYi4aa6B.U1kyyK7SIHTcXOSujSi5wZj/etthgZy', 'Hoàng Thị Lan', 'member', TRUE)
ON CONFLICT (email) DO NOTHING;

-- 2. Nhóm làm việc mẫu
INSERT INTO teams (name, description, owner_id)
SELECT 'Đội ngũ Phát triển Web & Mobile', 'Phụ trách các dự án nền tảng web React/Vue/Node và ứng dụng di động', u.id
FROM users u WHERE u.email = 'quan.nm@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO teams (name, description, owner_id)
SELECT 'Đội ngũ Vận hành & DevOps', 'Triển khai hạ tầng Docker, giám sát Prometheus, Grafana và bảo mật', u.id
FROM users u WHERE u.email = 'admin@gmail.com'
ON CONFLICT DO NOTHING;

-- 3. Thành viên nhóm
INSERT INTO team_members (team_id, user_id, member_role)
SELECT t.id, u.id, 'owner'
FROM teams t, users u
WHERE t.name = 'Đội ngũ Phát triển Web & Mobile' AND u.email = 'quan.nm@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO team_members (team_id, user_id, member_role)
SELECT t.id, u.id, 'manager'
FROM teams t, users u
WHERE t.name = 'Đội ngũ Phát triển Web & Mobile' AND u.email = 'hoang.nh@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO team_members (team_id, user_id, member_role)
SELECT t.id, u.id, 'member'
FROM teams t, users u
WHERE t.name = 'Đội ngũ Phát triển Web & Mobile' AND u.email = 'lan.ht@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO team_members (team_id, user_id, member_role)
SELECT t.id, u.id, 'owner'
FROM teams t, users u
WHERE t.name = 'Đội ngũ Vận hành & DevOps' AND u.email = 'admin@gmail.com'
ON CONFLICT DO NOTHING;

-- 4. Công việc mẫu
-- Công việc 1: Quá hạn (Overdue)
INSERT INTO tasks (title, description, status, priority, progress, due_at, completed_at, created_by, team_id)
SELECT 'Kiểm toán bảo mật cấu hình Nginx và TLS', 
       'Đánh giá cấu hình HTTPS, HSTS, các HTTP Security Headers và kiểm tra lỗ hổng cấu hình máy chủ web.',
       'in_progress', 'high', 45, now() - INTERVAL '2 days', NULL, u.id, t.id
FROM users u, teams t
WHERE u.email = 'quan.nm@gmail.com' AND t.name = 'Đội ngũ Vận hành & DevOps';

-- Công việc 2: Sắp đến hạn (To Do, high priority)
INSERT INTO tasks (title, description, status, priority, progress, due_at, completed_at, created_by, team_id)
SELECT 'Xây dựng giao diện Bảng Kanban kéo thả', 
       'Hoàn thiện hiển thị 3 cột To Do, In Progress, Done theo phong cách hiện đại, hỗ trợ chuyển trạng thái mượt mà.',
       'todo', 'high', 10, now() + INTERVAL '1 day', NULL, u.id, t.id
FROM users u, teams t
WHERE u.email = 'quan.nm@gmail.com' AND t.name = 'Đội ngũ Phát triển Web & Mobile';

-- Công việc 3: Đang thực hiện (In Progress, medium priority)
INSERT INTO tasks (title, description, status, priority, progress, due_at, completed_at, created_by, team_id)
SELECT 'Tích hợp bộ thu thập Log Grafana Alloy và Loki', 
       'Cấu hình alloy/config.alloy đọc log Docker socket và chuyển tiếp sang Loki theo kiến trúc chuẩn 2026.',
       'in_progress', 'medium', 70, now() + INTERVAL '3 days', NULL, u.id, t.id
FROM users u, teams t
WHERE u.email = 'hoang.nh@gmail.com' AND t.name = 'Đội ngũ Vận hành & DevOps';

-- Công việc 4: Đã hoàn thành (Done, thỏa mãn chk_done_completed)
INSERT INTO tasks (title, description, status, priority, progress, due_at, completed_at, created_by, team_id)
SELECT 'Thiết kế lược đồ cơ sở dữ liệu PostgreSQL chuẩn hóa', 
       'Xây dựng 6 bảng dữ liệu, ràng buộc toàn vẹn chk_done_completed, chỉ mục và trigger cập nhật thời gian.',
       'done', 'high', 100, now() - INTERVAL '1 day', now() - INTERVAL '3 hours', u.id, t.id
FROM users u, teams t
WHERE u.email = 'quan.nm@gmail.com' AND t.name = 'Đội ngũ Phát triển Web & Mobile';

-- Công việc 5: Công việc cá nhân (Personal Task, team_id = NULL)
INSERT INTO tasks (title, description, status, priority, progress, due_at, completed_at, created_by, team_id)
SELECT 'Chuẩn bị slide báo cáo đồ án Triển khai và Quản trị Hệ thống', 
       'Tổng hợp kiến trúc 3 lớp, hình ảnh thực tế pgAdmin, Prometheus, Grafana và bảng kết quả kiểm thử TC01-TC19.',
       'in_progress', 'medium', 60, now() + INTERVAL '5 days', NULL, u.id, NULL
FROM users u
WHERE u.email = 'quan.nm@gmail.com';

-- 5. Phân công công việc (task_assignments)
INSERT INTO task_assignments (task_id, user_id, assigned_by)
SELECT t.id, u_assignee.id, u_creator.id
FROM tasks t, users u_assignee, users u_creator
WHERE t.title LIKE 'Kiểm toán bảo mật%' 
  AND u_assignee.email = 'hoang.nh@gmail.com'
  AND u_creator.email = 'quan.nm@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO task_assignments (task_id, user_id, assigned_by)
SELECT t.id, u_assignee.id, u_creator.id
FROM tasks t, users u_assignee, users u_creator
WHERE t.title LIKE 'Xây dựng giao diện Bảng Kanban%' 
  AND u_assignee.email = 'lan.ht@gmail.com'
  AND u_creator.email = 'quan.nm@gmail.com'
ON CONFLICT DO NOTHING;

-- 6. Bình luận công việc (task_comments)
INSERT INTO task_comments (task_id, user_id, content)
SELECT t.id, u.id, 'Đã kiểm tra cấu hình Nginx bước 1, cần bổ sung cấu hình CSP và test lại với SSL tự ký.'
FROM tasks t, users u
WHERE t.title LIKE 'Kiểm toán bảo mật%' AND u.email = 'hoang.nh@gmail.com';

INSERT INTO task_comments (task_id, user_id, content)
SELECT t.id, u.id, 'Đã chuẩn bị mockup và các component nút chuyển trạng thái cho Kanban board.'
FROM tasks t, users u
WHERE t.title LIKE 'Xây dựng giao diện Bảng Kanban%' AND u.email = 'lan.ht@gmail.com';
