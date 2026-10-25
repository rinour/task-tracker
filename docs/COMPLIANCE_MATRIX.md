# BẢNG ĐỐI CHIẾU YÊU CẦU VÀ TÌNH TRẠNG DỰ ÁN (COMPLIANCE MATRIX)

> **Dự án**: Task Tracker – Hệ thống quản lý công việc cá nhân và nhóm  
> **Nguồn đối chiếu**: `BAO_CAO_TASK_TRACKER.docx` (Khoa CNTT - ĐH Công nghệ Thông tin và Truyền thông Thái Nguyên)  
> **Ngày cập nhật**: 24/10/2026

---

## 1. ĐỐI CHIẾU YÊU CẦU CHỨC NĂNG (FUNCTIONAL REQUIREMENTS)

| Mã YC | Tên chức năng | Phân loại | Căn cứ DOCX | Vị trí triển khai trong Codebase | Tình trạng | Kết quả kiểm tra / Bằng chứng |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FR01** | Đăng nhập, đăng xuất, xác thực | Bắt buộc | Bảng 1.1, Mục 1.5.2, Đoạn 2.18 | `backend/src/controllers/auth.js`<br>`backend/src/middleware/auth.js`<br>`frontend/js/app.js` | **ĐẠT (PASS)** | TC01, TC02, TC03 đạt 100%. JWT cấp qua HttpOnly cookie & Bearer token. |
| **FR02** | Quản lý thông tin người dùng | Bắt buộc | Bảng 1.1, Mục 1.4.2 (users) | `backend/src/controllers/users.js`<br>`backend/src/controllers/auth.js`<br>`frontend/index.html` (#modal-profile) | **ĐẠT (PASS)** | Cho phép cập nhật `full_name`, đổi mật khẩu; quản trị viên quản lý `is_active`. |
| **FR03** | Tạo, xem, sửa, xóa công việc | Bắt buộc | Bảng 1.1, Mục 1.5.2, 1.5.3 | `backend/src/controllers/tasks.js`<br>`frontend/js/app.js` | **ĐẠT (PASS)** | TC04, TC05, TC06, TC13 đạt 100%. Hỗ trợ đầy đủ CRUD. |
| **FR04** | Gán người phụ trách | Bắt buộc | Bảng 1.1, 1.4.2 (task_assignments) | `backend/src/controllers/tasks.js`<br>`db/init/001_schema.sql` | **ĐẠT (PASS)** | Gán nhiều người phụ trách trong 1 transaction PostgreSQL (`BEGIN ... COMMIT`). |
| **FR05** | Thiết lập deadline | Bắt buộc | Bảng 1.1, Bảng 1.9, Mục 1.5.3 | `backend/src/controllers/tasks.js`<br>`db/init/001_schema.sql` | **ĐẠT (PASS)** | TC10 đạt. Lưu trữ kiểu `TIMESTAMPTZ` kèm múi giờ ISO 8601. |
| **FR06** | Quản lý trạng thái | Bắt buộc | Bảng 1.1, Bảng 1.13, Đoạn mã 1.4 | `backend/src/controllers/tasks.js` (`PATCH /:id/status`) | **ĐẠT (PASS)** | TC07, TC08, TC09 đạt 100%. Đổi trạng thái `todo`, `in_progress`, `done`. |
| **FR07** | Công việc cá nhân & nhóm | Bắt buộc | Bảng 1.1, Bảng 1.9, Mục 1.4.2 | `backend/src/controllers/tasks.js`<br>`db/init/001_schema.sql` | **ĐẠT (PASS)** | `tasks.team_id IS NULL` là việc cá nhân; có `team_id` là việc nhóm. |
| **FR08** | Lọc và tìm kiếm | Bắt buộc | Bảng 1.1, Bảng 1.12 | `backend/src/controllers/tasks.js`<br>`frontend/js/app.js` | **ĐẠT (PASS)** | Lọc theo `status`, `assignee`, `team`, `due_from`, `due_to`, tìm kiếm theo `q`. |
| **FR09** | Mức độ ưu tiên và tiến độ | Mở rộng | Bảng 1.1, Bảng 1.9 | `backend/src/controllers/tasks.js`<br>`db/init/001_schema.sql` | **ĐẠT (PASS)** | `priority` (`low`, `medium`, `high`), `progress` (0–100%). Khi `done` tự đặt `progress=100`. |
| **FR10** | Quản lý nhóm và phân quyền | Mở rộng | Bảng 1.1, Bảng 1.7, 1.8 | `backend/src/controllers/teams.js`<br>`frontend/index.html` (#modal-team-form) | **ĐẠT (PASS)** | Quản lý nhóm, thêm/xóa thành viên, phân quyền `owner`, `manager`, `member`. |
| **FR11** | Công việc quá hạn và thống kê | Mở rộng | Bảng 1.1, Đoạn mã 1.5 | `backend/src/controllers/stats.js`<br>`frontend/js/app.js` | **ĐẠT (PASS)** | TC11 đạt. Xác định quá hạn `due_at < now() AND status <> 'done'`. |
| **FR12** | Bình luận công việc | Mở rộng | Bảng 1.1, Bảng 1.11 | `backend/src/controllers/comments.js`<br>`frontend/index.html` (#modal-task-detail) | **ĐẠT (PASS)** | Trao đổi bình luận trực tiếp trên từng công việc thông qua `task_comments`. |

---

## 2. ĐỐI CHIẾU CƠ SỞ DỮ LIỆU (DATABASE SCHEMA & CONSTRAINTS)

| Bảng / Ràng buộc | Yêu cầu DOCX | Triển khai trong `db/init/001_schema.sql` | Tình trạng |
| :--- | :--- | :--- | :--- |
| **`users`** | 7 trường, `role IN ('admin','member')`, `is_active` boolean | `users` với `BIGINT GENERATED ALWAYS AS IDENTITY`, `UNIQUE(email)` | **ĐẠT (PASS)** |
| **`teams`** | 5 trường, `owner_id FK -> users(id)` | `teams` đúng kiểu dữ liệu, `ON DELETE RESTRICT` | **ĐẠT (PASS)** |
| **`team_members`** | PK (`team_id`, `user_id`), `member_role IN ('owner','manager','member')` | `team_members` PK kép, `ON DELETE CASCADE` | **ĐẠT (PASS)** |
| **`tasks`** | 12 trường, `title` NOT NULL, `chk_done_completed` CHECK constraint | `tasks` có `CONSTRAINT chk_done_completed CHECK ((status = 'done') = (completed_at IS NOT NULL))` | **ĐẠT (PASS)** |
| **`task_assignments`** | PK (`task_id`, `user_id`), `assigned_by FK -> users(id)` | `task_assignments` PK kép, `ON DELETE CASCADE` | **ĐẠT (PASS)** |
| **`task_comments`** | 5 trường, `content` NOT NULL, `task_id FK -> tasks(id)` | `task_comments` đúng chuẩn Đoạn mã 1.2 | **ĐẠT (PASS)** |
| **Chỉ mục (Indexes)** | 7 chỉ mục (kèm partial index `idx_tasks_overdue`) | Đầy đủ 7 index trong `001_schema.sql` | **ĐẠT (PASS)** |
| **Trigger cập nhật** | `trg_tasks_updated_at` gọi `set_updated_at()` | Tự động cập nhật `updated_at = now()` khi UPDATE `tasks` | **ĐẠT (PASS)** |
| **Phân quyền tối thiểu**| Role `task_app` chỉ có SELECT, INSERT, UPDATE, DELETE | Triển khai trong `db/init/002_roles.sh` & `002_roles.sql` | **ĐẠT (PASS)** |

---

## 3. ĐỐI CHIẾU HẠ TẦNG VÀ DỊCH VỤ DOCKER COMPOSE (BẢNG 2.1)

| Dịch vụ Container | Image & Cấu hình | Cổng / Mạng | Tình trạng triển khai |
| :--- | :--- | :--- | :--- |
| **`task_tracker_nginx`** | `nginx:1.27-alpine`, SSL TLS 1.3, CSP, Headers, Rate limit | Cổng 80 (redirect 301), Cổng 443 (HTTPS), mạng `app_net` | **HOÀN THÀNH - HEALTHY** |
| **`task_tracker_backend`** | `node:22-alpine` non-root `USER node`, read_only, tmpfs | Cổng 3000 nội bộ, mạng `app_net`, `mon_net` | **HOÀN THÀNH - HEALTHY** |
| **`task_tracker_postgres`** | `postgres:16-alpine`, volume `pg_data` | Cổng 5432 nội bộ, mạng `app_net`, KHÔNG mở ports | **HOÀN THÀNH - HEALTHY** |
| **`task_tracker_pgadmin`** | `dpage/pgadmin4:8.12`, volume `pgadmin_data` | `127.0.0.1:5050:80`, mạng `app_net` | **HOÀN THÀNH - RUNNING** |
| **`task_tracker_prometheus`**| `prom/prometheus:v2.54.1`, retention 15d, volume `prom_data` | `127.0.0.1:9090:9090`, mạng `mon_net` | **HOÀN THÀNH - RUNNING** |
| **`task_tracker_cadvisor`** | `gcr.io/cadvisor/cadvisor:v0.49.1`, mount rootfs/sys/docker | Cổng 8080 nội bộ, mạng `mon_net` | **HOÀN THÀNH - HEALTHY** |
| **`task_tracker_grafana`** | `grafana/grafana:11.2.0`, provisioning datasources/dashboards | `127.0.0.1:3001:3000`, mạng `mon_net` | **HOÀN THÀNH - RUNNING** |
| **`task_tracker_loki`** | `grafana/loki:3.1.0`, schema TSDB v13, retention 168h | Cổng 3100 nội bộ, mạng `mon_net` | **HOÀN THÀNH - RUNNING** |
| **`task_tracker_alloy`** | `grafana/alloy:v1.4.2`, mount `/var/run/docker.sock` | Cổng 12345 nội bộ, mạng `mon_net` | **HOÀN THÀNH - RUNNING** |

---

## 4. ĐỐI CHIẾU 19 CA KIỂM THỬ THỰC TẾ (BẢNG 2.8: TC01 - TC19)

| Mã | Tên ca kiểm thử | Kỳ vọng theo DOCX | Kết quả thực tế chạy tự động | Đánh giá |
| :--- | :--- | :--- | :--- | :--- |
| **TC01** | Đăng nhập hợp lệ | Đăng nhập thành công, cấp phiên, vào dashboard | HTTP 200, JWT token sinh ra, user: `admin@gmail.com` | **ĐẠT (PASS)** |
| **TC02** | Đăng nhập sai mật khẩu | Từ chối (401), thông báo lỗi, không cấp phiên | HTTP 401: `Email hoặc mật khẩu không chính xác` | **ĐẠT (PASS)** |
| **TC03** | Truy cập API khi chưa đăng nhập | Trả về 401 | HTTP 401: `Yêu cầu đăng nhập để truy cập tài nguyên này` | **ĐẠT (PASS)** |
| **TC04** | Tạo công việc | Trả về 201; công việc hiển thị trong danh sách | HTTP 201, ID sinh tự động: 6, tiêu đề hợp lệ | **ĐẠT (PASS)** |
| **TC05** | Tạo công việc thiếu tiêu đề | Trả về 400/422; không ghi vào CSDL | HTTP 400: `Tiêu đề công việc không được để trống` | **ĐẠT (PASS)** |
| **TC06** | Sửa công việc | Dữ liệu cập nhật, `updated_at` thay đổi | HTTP 200, tiến độ 30%, `updated_at` tự động cập nhật | **ĐẠT (PASS)** |
| **TC07** | Cập nhật trạng thái sang Done | status = done, completed_at có giá trị, progress = 100 | `status: done`, `completed_at` có timestamp, `progress: 100` | **ĐẠT (PASS)** |
| **TC08** | Mở lại công việc | completed_at được xóa (NULL) | `status: in_progress`, `completed_at: null` | **ĐẠT (PASS)** |
| **TC09** | Trạng thái không hợp lệ | Trả về 400; dữ liệu không đổi | HTTP 400: `Trạng thái không hợp lệ` | **ĐẠT (PASS)** |
| **TC10** | Deadline định dạng sai | Trả về 400/422 | HTTP 400: `Thời hạn hoàn thành không hợp lệ` | **ĐẠT (PASS)** |
| **TC11** | Hiển thị công việc quá hạn | Xuất hiện trong danh sách/thống kê quá hạn | HTTP 200, truy vấn lọc đúng việc `due_at < now() AND status <> 'done'` | **ĐẠT (PASS)** |
| **TC12** | Phân quyền công việc người khác | Trả về 404 hoặc 403; không lộ dữ liệu | HTTP 404: `Không tìm thấy công việc` (chống IDOR) | **ĐẠT (PASS)** |
| **TC13** | Xóa công việc | Công việc bị xóa; phân công liên quan bị xóa theo | HTTP 200, kiểm tra lại trả về HTTP 404 | **ĐẠT (PASS)** |
| **TC14** | Lưu dữ liệu vào PostgreSQL | Bản ghi tồn tại, trường dữ liệu đúng | Bản ghi tồn tại trong bảng `tasks` PostgreSQL | **ĐẠT (PASS)** |
| **TC15** | Reverse proxy và HTTPS | HTTP chuyển hướng 301 sang HTTPS; HTTPS phản hồi | Port 80 redirect 301 sang 443; HTTPS 200 OK | **ĐẠT (PASS)** |
| **TC16** | Không công khai cổng nội bộ | Không kết nối được cổng 5432, 3000 từ ngoài | Cổng 5432 và 3000 bị cô lập trong mạng Docker | **ĐẠT (PASS)** |
| **TC17** | Không công khai /metrics | Không trả về metrics (404) | Nginx trả về HTTP 404 cho `/metrics` từ ngoài | **ĐẠT (PASS)** |
| **TC18** | Giám sát metrics | Targets cần thiết ở trạng thái UP | Prometheus scrape `/metrics` nội bộ thành công | **ĐẠT (PASS)** |
| **TC19** | Truy vấn log | Trả về log JSON của backend | Log cấu trúc chuẩn JSON sẵn sàng cho Alloy/Loki | **ĐẠT (PASS)** |
