# ĐẶC TẢ YÊU CẦU CHUẨN HỆ THỐNG TASK TRACKER (REQUIREMENTS BASELINE)

> **Căn cứ pháp lý & kỹ thuật**: Trích xuất trực tiếp từ tài liệu gốc `BAO_CAO_TASK_TRACKER.docx` (Báo cáo môn Triển khai và Quản trị Hệ thống Phần mềm - Đề tài: Hệ thống quản lý công việc cá nhân/nhóm - Sinh viên: Đặng Quang Tuệ, MSV: DTC245200193, Lớp: CNTT K23A, GVHD: Nguyễn Anh Chuyên - Đại học Công nghệ Thông tin và Truyền thông Thái Nguyên, 15/10/2026).

---

## 1. MỤC TIÊU VÀ PHẠM VI DỰ ÁN

- **Mục tiêu cốt lõi**: Tập trung hóa ba thông tin thiết yếu của quản trị công việc gồm: **Nội dung công việc (task)**, **Thời hạn hoàn thành (deadline)** và **Trạng thái thực hiện (status)**.
- **Phạm vi nghiệp vụ**: Hỗ trợ quản lý công việc cá nhân (không thuộc nhóm) và công việc nhóm (nhiều thành viên, phân công nhiều người, phân vai trò).
- **Phạm vi kỹ thuật & vận hành**:
  - Không chỉ xây dựng ứng dụng web đơn thuần mà quản trị trọn vẹn toàn bộ vòng đời vận hành:
  - Quản lý mã nguồn với Git và GitHub (quy ước commit, gitignore bí mật).
  - Đóng gói và triển khai tự động hóa bằng Docker Compose với 9 container dịch vụ.
  - Reverse Proxy an toàn với Nginx (HTTPS TLS 1.2/1.3, HTTP-to-HTTPS redirect 301, chặn `/metrics` ra ngoài, rate limit, HTTP security headers).
  - Cơ sở dữ liệu quan hệ PostgreSQL 16 chuẩn hóa với ràng buộc toàn vẹn dữ liệu chặt chẽ (`chk_done_completed`), quản trị trực quan qua pgAdmin 4.
  - Giám sát số liệu chuỗi thời gian bằng Prometheus v2.54.1 & cAdvisor v0.49.1; bảng điều khiển trực quan Grafana 11.2.0.
  - Thu thập nhật ký tập trung từ Docker socket bằng Grafana Alloy v1.4.2 (thay thế Promtail đã EOL) và lưu trữ truy vấn qua Grafana Loki 3.1.0 với LogQL.
  - Thực hiện các biện pháp làm cứng hệ thống (Hardening) và xác minh 19 ca kiểm thử (TC01 - TC19).

---

## 2. DANH MỤC YÊU CẦU CHỨC NĂNG (FUNCTIONAL REQUIREMENTS - BẢNG 1.1)

| Mã | Tên chức năng | Mô tả chi tiết theo tài liệu gốc | Phân loại |
| :--- | :--- | :--- | :--- |
| **FR01** | Đăng nhập, đăng xuất, xác thực | Người dùng đăng nhập bằng email và mật khẩu; hệ thống cấp phiên làm việc (JWT trong HttpOnly cookie) và kiểm tra phiên ở mọi API cần bảo vệ. | **Bắt buộc** |
| **FR02** | Quản lý thông tin người dùng | Xem và cập nhật hồ sơ cá nhân (họ tên, mật khẩu); quản trị viên tạo hoặc vô hiệu hóa tài khoản (`is_active`). | **Bắt buộc** |
| **FR03** | Tạo, xem, sửa, xóa công việc | Thao tác CRUD trên công việc gồm tiêu đề, mô tả, thời hạn, trạng thái, mức ưu tiên, tiến độ. | **Bắt buộc** |
| **FR04** | Gán người phụ trách | Chỉ định một hoặc nhiều thành viên chịu trách nhiệm cho công việc (bảng quan hệ nhiều-nhiều `task_assignments`). | **Bắt buộc** |
| **FR05** | Thiết lập deadline | Đặt và chỉnh sửa thời hạn hoàn thành, lưu trữ kiểu `TIMESTAMPTZ` kèm múi giờ. | **Bắt buộc** |
| **FR06** | Quản lý trạng thái | Ba trạng thái hợp lệ: `todo` (To Do), `in_progress` (In Progress), `done` (Done); cho phép chuyển trạng thái nhanh. | **Bắt buộc** |
| **FR07** | Công việc cá nhân & công việc nhóm | Phân biệt qua `tasks.team_id`: giá trị `NULL` là công việc cá nhân của người tạo; có `team_id` là công việc thuộc nhóm. | **Bắt buộc** |
| **FR08** | Lọc và tìm kiếm | Lọc theo trạng thái, người phụ trách, khoảng thời hạn (`due_from`, `due_to`), nhóm (`team`); tìm kiếm từ khóa trong tiêu đề (`q`). | **Bắt buộc** |
| **FR09** | Mức độ ưu tiên và tiến độ | Gắn mức ưu tiên (`low`, `medium`, `high`) và phần trăm hoàn thành (0–100%). | Mở rộng |
| **FR10** | Quản lý nhóm và phân quyền | Tạo nhóm, thêm/xóa thành viên, phân vai trò trong nhóm (`owner`, `manager`, `member`). | Mở rộng |
| **FR11** | Công việc quá hạn và thống kê | Xác định công việc quá hạn (`due_at < now() AND status <> 'done'`); thống kê số lượng theo trạng thái. | Mở rộng |
| **FR12** | Bình luận công việc | Thành viên trao đổi trực tiếp trên từng công việc thông qua bảng `task_comments`. | Mở rộng |

---

## 3. DANH MỤC YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS - BẢNG 1.2)

| Mã | Nhóm yêu cầu | Nội dung yêu cầu kỹ thuật | Thành phần kỹ thuật đáp ứng |
| :--- | :--- | :--- | :--- |
| **NFR01** | Bảo mật | Mật khẩu không lưu dạng văn bản thuần; dữ liệu truyền qua HTTPS; kiểm soát quyền truy cập từng công việc; hạn chế cổng công khai. | Băm bcrypt, JWT HttpOnly Cookie, Nginx HTTPS TLS, phân quyền PostgreSQL (`task_app`), mạng cô lập Docker. |
| **NFR02** | Tính ổn định | Dịch vụ khởi động đúng thứ tự, tự khởi động lại khi gặp sự cố, dữ liệu không mất khi khởi động lại container. | Docker Compose `healthcheck`, `depends_on: { condition: service_healthy }`, `restart: unless-stopped`, persistent volumes. |
| **NFR03** | Khả năng bảo trì | Mã nguồn có lịch sử thay đổi, cấu hình tách khỏi mã nguồn, có thể tái tạo môi trường nhanh chóng. | Git/GitHub, file `.env` & `.env.example`, Dockerfile non-root, Docker Compose. |
| **NFR04** | Tính nhất quán dữ liệu | Dữ liệu hợp lệ theo ràng buộc; thao tác nhiều bước được thực hiện trọn vẹn hoặc hủy toàn bộ. | Khóa ngoại, `CHECK` (`chk_done_completed`), `NOT NULL`, transaction `BEGIN ... COMMIT` trong PostgreSQL. |
| **NFR05** | Khả năng mở rộng | Có thể bổ sung chức năng và tăng tải mà không phải thiết kế lại toàn bộ hệ thống. | Backend stateless (không lưu session in-memory), tách dịch vụ container, chỉ mục CSDL đầy đủ. |
| **NFR06** | Giám sát | Theo dõi tài nguyên và sức khỏe dịch vụ, phát hiện sớm bất thường. | Prometheus scrape interval 15s, cAdvisor đo container CPU/RAM/Network, Grafana Dashboard. |
| **NFR07** | Quản lý nhật ký | Nhật ký các dịch vụ được tập trung, có thể tìm kiếm và lọc lỗi. | Grafana Alloy đọc Docker socket, đẩy Loki, truy vấn LogQL trong Grafana Explore. |

---

## 4. VAI TRÒ NGƯỜI DÙNG VÀ MA TRẬN PHÂN QUYỀN

### 4.1. Vai trò toàn hệ thống (`users.role`)
- **`admin`**: Quản trị viên hệ thống. Quản lý toàn bộ người dùng (`is_active`, tạo tài khoản), toàn quyền xem và xử lý mọi công việc/nhóm.
- **`member`**: Thành viên tiêu chuẩn. Tạo và quản lý công việc cá nhân, tham gia nhóm làm việc theo vai trò được gán.

### 4.2. Vai trò trong nhóm (`team_members.member_role`)
- **`owner`**: Chủ sở hữu nhóm. Quản lý thông tin nhóm, phân quyền thành viên, quản lý toàn bộ công việc của nhóm, xóa nhóm.
- **`manager`**: Quản lý nhóm. Thêm/xóa thành viên, tạo/sửa/gán công việc trong nhóm.
- **`member`**: Thành viên nhóm. Xem công việc nhóm, cập nhật trạng thái các công việc mình được giao phụ trách, bình luận.

### 4.3. Quy tắc truy cập công việc (chống IDOR ở tầng Backend SQL)
Một người dùng được phép xem/sửa công việc khi và chỉ khi:
1. Là người tạo công việc (`t.created_by = $user_id`), HOẶC
2. Được giao phụ trách công việc (`EXISTS (SELECT 1 FROM task_assignments a WHERE a.task_id = t.id AND a.user_id = $user_id)`), HOẶC
3. Là thành viên trong nhóm sở hữu công việc (`EXISTS (SELECT 1 FROM team_members m WHERE m.team_id = t.team_id AND m.user_id = $user_id)`), HOẶC
4. Có vai trò hệ thống là `admin`.

---

## 5. THIẾT KẾ CƠ SỞ DỮ LIỆU POSTGRESQL (6 BẢNG CHUẨN)

### 5.1. Bảng `users` (Bảng 1.6)
- `id`: BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
- `email`: VARCHAR(255) NOT NULL UNIQUE
- `password_hash`: VARCHAR(255) NOT NULL
- `full_name`: VARCHAR(120) NOT NULL
- `role`: VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member'))
- `is_active`: BOOLEAN NOT NULL DEFAULT TRUE
- `created_at`: TIMESTAMPTZ NOT NULL DEFAULT now()

### 5.2. Bảng `teams` (Bảng 1.7)
- `id`: BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
- `name`: VARCHAR(120) NOT NULL
- `description`: TEXT
- `owner_id`: BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT
- `created_at`: TIMESTAMPTZ NOT NULL DEFAULT now()

### 5.3. Bảng `team_members` (Bảng 1.8)
- `team_id`: BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE
- `user_id`: BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
- `member_role`: VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (member_role IN ('owner', 'manager', 'member'))
- `joined_at`: TIMESTAMPTZ NOT NULL DEFAULT now()
- PRIMARY KEY (`team_id`, `user_id`)

### 5.4. Bảng `tasks` (Bảng 1.9)
- `id`: BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
- `title`: VARCHAR(200) NOT NULL CHECK (length(btrim(title)) > 0)
- `description`: TEXT
- `status`: VARCHAR(20) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done'))
- `priority`: VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'))
- `progress`: SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100)
- `due_at`: TIMESTAMPTZ
- `completed_at`: TIMESTAMPTZ
- `created_by`: BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT
- `team_id`: BIGINT REFERENCES teams(id) ON DELETE CASCADE
- `created_at`: TIMESTAMPTZ NOT NULL DEFAULT now()
- `updated_at`: TIMESTAMPTZ NOT NULL DEFAULT now()
- **Ràng buộc vàng**: `CONSTRAINT chk_done_completed CHECK ((status = 'done') = (completed_at IS NOT NULL))`

### 5.5. Bảng `task_assignments` (Bảng 1.10)
- `task_id`: BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE
- `user_id`: BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
- `assigned_by`: BIGINT REFERENCES users(id) ON DELETE SET NULL
- `assigned_at`: TIMESTAMPTZ NOT NULL DEFAULT now()
- PRIMARY KEY (`task_id`, `user_id`)

### 5.6. Bảng `task_comments` (Bảng 1.11)
- `id`: BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
- `task_id`: BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE
- `user_id`: BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT
- `content`: TEXT NOT NULL CHECK (length(btrim(content)) > 0)
- `created_at`: TIMESTAMPTZ NOT NULL DEFAULT now()

### 5.7. Các chỉ mục và Trigger
- `idx_tasks_status_due` ON `tasks (status, due_at)`
- `idx_tasks_team_id` ON `tasks (team_id)`
- `idx_tasks_created_by` ON `tasks (created_by)`
- `idx_tasks_overdue` ON `tasks (due_at) WHERE status <> 'done'` (Partial Index)
- `idx_assignments_user` ON `task_assignments (user_id)`
- `idx_team_members_user` ON `team_members (user_id)`
- `idx_comments_task_time` ON `task_comments (task_id, created_at)`
- Trigger `trg_tasks_updated_at` gọi hàm `set_updated_at()` cập nhật `updated_at = now()`.

---

## 6. DANH MỤC REST API (BẢNG 1.12)

1. `POST /api/auth/login`: Xác thực tài khoản, cấp JWT token qua cookie HttpOnly và Bearer.
2. `POST /api/auth/logout`: Xóa phiên làm việc.
3. `GET /api/auth/me`: Lấy thông tin tài khoản hiện tại.
4. `GET /api/tasks`: Lấy danh sách công việc được phép, hỗ trợ filter `status`, `assignee`, `team`, `due_from`, `due_to`, `q`.
5. `GET /api/tasks/:id`: Chi tiết 1 công việc kèm danh sách người phụ trách và bình luận.
6. `POST /api/tasks`: Tạo công việc mới (hỗ trợ phân công nhiều người trong transaction).
7. `PUT /api/tasks/:id`: Cập nhật toàn bộ thông tin công việc.
8. `PATCH /api/tasks/:id/status`: Đổi trạng thái nhanh (`todo`, `in_progress`, `done`). Tự động xử lý `completed_at` và `progress`.
9. `DELETE /api/tasks/:id`: Xóa công việc.
10. `GET /api/stats/summary`: Thống kê số lượng theo trạng thái và số việc quá hạn.
11. `GET /api/teams` & `POST /api/teams`: Danh sách nhóm và tạo nhóm mới.
12. `GET /api/teams/:id/members` & `POST /api/teams/:id/members`: Quản lý thành viên nhóm.
13. `GET /api/health`: Healthcheck endpoint cho Docker Compose.
14. `GET /metrics`: Prometheus metrics nội bộ (Nginx chặn 404 từ bên ngoài).

---

## 7. BẢNG TIÊU CHÍ KIỂM THỬ HỆ THỐNG (BẢNG 2.8 - TC01 ĐẾN TC19)

Mọi thay đổi trong dự án bắt buộc phải vượt qua 19 ca kiểm thử sau:
- **TC01**: Đăng nhập hợp lệ -> HTTP 200, cấp phiên, chuyển vào trang tổng quan.
- **TC02**: Đăng nhập sai mật khẩu -> HTTP 401, thông báo lỗi rõ ràng.
- **TC03**: Truy cập API khi chưa đăng nhập -> HTTP 401.
- **TC04**: Tạo công việc hợp lệ -> HTTP 201, công việc xuất hiện trong danh sách.
- **TC05**: Tạo công việc thiếu tiêu đề -> HTTP 400, từ chối ghi CSDL.
- **TC06**: Sửa công việc -> HTTP 200, `updated_at` tự động cập nhật.
- **TC07**: Cập nhật trạng thái sang `done` -> `status = done`, `completed_at` có giá trị, `progress = 100`.
- **TC08**: Mở lại công việc từ `done` -> `status = in_progress`, `completed_at = null`.
- **TC09**: Trạng thái không hợp lệ -> HTTP 400.
- **TC10**: Deadline định dạng sai -> HTTP 400.
- **TC11**: Hiển thị công việc quá hạn -> `due_at < now() AND status <> 'done'`.
- **TC12**: Phân quyền công việc người khác -> HTTP 404 (chống IDOR).
- **TC13**: Xóa công việc -> HTTP 200, phân công liên quan bị xóa cascade.
- **TC14**: Lưu dữ liệu vào PostgreSQL -> Truy vấn bảng `tasks` thấy đúng bản ghi.
- **TC15**: Reverse Proxy & HTTPS -> Port 80 redirect 301 sang 443, HTTPS phản hồi bình thường.
- **TC16**: Không công khai cổng CSDL nội bộ -> Cổng 5432 và 3000 không mở ra public.
- **TC17**: Không công khai `/metrics` -> Nginx trả về 404 khi gọi `/metrics`.
- **TC18**: Giám sát Prometheus -> Target UP, thu thập metrics thành công.
- **TC19**: Truy vấn nhật ký LogQL -> Thu thập log JSON từ container qua Alloy vào Loki.
