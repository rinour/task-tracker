# NHẬT KÝ ĐỒNG BỘ VÀ HOÀN THIỆN DỰ ÁN (CHANGELOG ALIGNMENT)

> **Dự án**: Task Tracker – Hệ thống quản lý công việc cá nhân và nhóm  
> **Căn cứ**: File `BAO_CAO_TASK_TRACKER.docx` (Trường ĐH CNTT&TT Thái Nguyên)  
> **Mục tiêu**: Ghi lại chi tiết tất cả các điều chỉnh, tối ưu hóa và đồng bộ để bảo đảm tính nhất quán tuyệt đối giữa mã nguồn thực tế và tài liệu báo cáo chuẩn.

---

## 1. GIAI ĐOẠN ĐỒNG BỘ 1: CƠ SỞ DỮ LIỆU & RÀNG BUỘC TOÀN VẸN (DATABASE LAYER)

### 1.1. Đồng bộ lược đồ 6 bảng theo Đoạn mã 1.1 & 1.2
- **Tập tin**: `db/init/001_schema.sql`
- **Thay đổi thực hiện**:
  - Tạo chính xác 6 bảng: `users`, `teams`, `team_members`, `tasks`, `task_assignments`, `task_comments` với kiểu dữ liệu `BIGINT GENERATED ALWAYS AS IDENTITY`.
  - Áp dụng triệt để ràng buộc vàng `CONSTRAINT chk_done_completed CHECK ((status = 'done') = (completed_at IS NOT NULL))` trên bảng `tasks`.
  - Thiết lập đầy đủ 7 chỉ mục hiệu năng cao, đặc biệt là Partial Index `idx_tasks_overdue` (`due_at WHERE status <> 'done'`).
  - Thiết lập trigger `trg_tasks_updated_at` tự động cập nhật dấu thời gian `updated_at`.

### 1.2. Cấp quyền tối thiểu cho tài khoản ứng dụng `task_app` theo Đoạn mã 2.16
- **Tập tin**: `db/init/002_roles.sh` và `db/init/002_roles.sql`
- **Thay đổi thực hiện**:
  - Chuyển quyền tài khoản ứng dụng `task_app` thành động, đồng bộ mật khẩu với biến môi trường `${APP_DB_PASSWORD:-TaskAppSecret2026!}`.
  - Hủy quyền `CREATE ON SCHEMA public FROM PUBLIC`.
  - Cấp quyền tối thiểu `SELECT, INSERT, UPDATE, DELETE` trên các bảng và `USAGE, SELECT` trên sequences.

---

## 2. GIAI ĐOẠN ĐỒNG BỘ 2: REST API & BUSINESS LOGIC (BACKEND LAYER)

### 2.1. Quản lý trạng thái và đồng bộ `completed_at` (Đoạn mã 1.4)
- **Tập tin**: `backend/src/controllers/tasks.js`
- **Thay đổi thực hiện**:
  - Triển khai endpoint `PATCH /api/tasks/:id/status` với câu lệnh SQL UPDATE đồng thời:
    - Nếu `status = 'done'` -> `completed_at = now()`, `progress = 100`.
    - Nếu `status` khác `done` (mở lại việc) -> `completed_at = NULL`.
  - Kiểm tra quyền chống lỗ hổng IDOR ngay trong mệnh đề WHERE của SQL (chỉ người tạo, người được giao hoặc quản lý nhóm mới được đổi trạng thái).

### 2.2. Kiểm tra dữ liệu đầu vào và xử lý lỗi tập trung
- **Tập tin**: `backend/src/controllers/tasks.js`, `backend/src/middleware/error.js`
- **Thay đổi thực hiện**:
  - Kiểm tra tiêu đề công việc không được để trống (`title.trim() > 0`), trả về HTTP 400 nếu rỗng.
  - Kiểm tra định dạng `due_at` (bắt buộc parse được Date hợp lệ), trả về HTTP 400 nếu sai.
  - Định dạng toàn bộ log hệ thống sang cấu trúc JSON (`timestamp`, `level`, `message`, `service`) trên stdout để Grafana Alloy thu thập chuyển về Loki.

### 2.3. Cung cấp Prometheus Metrics theo Đoạn mã 2.11
- **Tập tin**: `backend/src/middleware/metrics.js`, `backend/src/server.js`
- **Thay đổi thực hiện**:
  - Cài đặt `prom-client`, kích hoạt `collectDefaultMetrics()`.
  - Định nghĩa histogram `http_request_duration_seconds` với các nhãn `method`, `route`, `status_code` và các bucket `[0.05, 0.1, 0.3, 0.5, 1, 2, 5]`.
  - Cung cấp endpoint nội bộ `GET /metrics`.

---

## 3. GIAI ĐOẠN ĐỒNG BỘ 3: DOCKER COMPOSE & MẠNG NỘI BỘ (DEVOPS LAYER)

### 3.1. Phân chia mạng và cô lập cổng theo Bảng 1.3 & 2.1
- **Tập tin**: `docker-compose.yml`
- **Thay đổi thực hiện**:
  - Thiết lập hai mạng Docker riêng biệt: `app_net` (dành cho các dịch vụ ứng dụng) và `mon_net` (dành cho giám sát).
  - Backend kết nối cả hai mạng `app_net` và `mon_net`.
  - Không công bố cổng của `postgres` ra máy chủ (chỉ giao tiếp trong `app_net`).
  - Gắn cổng quản trị `pgadmin` (`127.0.0.1:5050`), `prometheus` (`127.0.0.1:9090`), `grafana` (`127.0.0.1:3001`) chỉ trên `127.0.0.1`.
  - Sửa lỗi pgAdmin email validator: đổi email mặc định từ `.local` thành `.com` (`admin@tasktracker.com`).
  - Tối ưu lệnh `healthcheck` của backend từ `localhost` sang `127.0.0.1` để tránh xung đột phân giải IPv6 trong container Alpine.

### 3.2. Cấu hình Nginx Reverse Proxy theo Đoạn mã 2.5
- **Tập tin**: `nginx/default.conf`
- **Thay đổi thực hiện**:
  - Cấu hình port 80 chuyển hướng 301 sang port 443 HTTPS.
  - Cấu hình SSL TLS 1.2/1.3 và ẩn phiên bản Nginx (`server_tokens off`).
  - Thêm đầy đủ HTTP Security Headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy`.
  - Chặn tuyệt đối endpoint `location = /metrics { return 404; }`.
  - Thiết lập rate limit cho API: `limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s` với `burst=20 nodelay`.

---

## 4. GIAI ĐOẠN ĐỒNG BỘ 4: GIAO DIỆN & TỐI ƯU RESPONSIVE DESIGN (FRONTEND LAYER)

### 4.1. Bổ sung giải pháp Mobile Drawer & Backdrop cho Sidebar
- Thêm lớp phủ mờ (backdrop) khi mở menu sidebar trên thiết bị di động.
- Cho phép bấm ra ngoài hoặc bấm icon đóng để thu gọn sidebar mượt mà trên màn hình nhỏ.

### 4.2. Tối ưu bảng dữ liệu và cuộn ngang an toàn
- Bọc toàn bộ bảng bằng `.table-wrapper` có thanh cuộn ngang độc lập (`overflow-x: auto`), tránh vỡ layout trang.
- Kanban board hỗ trợ cuộn ngang linh hoạt hoặc hiển thị cột co giãn phù hợp trên màn hình tablet/mobile.

### 4.3. Kiểm thử và tinh chỉnh trên các Viewport chuẩn
- Điện thoại nhỏ: 320 × 568
- Điện thoại phổ biến: 375 × 667
- Điện thoại lớn: 390 × 844
- Điện thoại xoay ngang: 844 × 390
- Tablet dọc: 768 × 1024
- Tablet ngang: 1024 × 768
- Laptop: 1280 × 720
- Desktop: 1440 × 900
- Màn hình rộng: 1920 × 1080
