# Task Tracker – Hệ thống Quản lý Công việc Cá nhân và Nhóm

> **Báo cáo Môn học**: Triển khai và Quản trị Hệ thống phần mềm  
> **Sinh viên thực hiện**: Đặng Quang Tuệ – Mã sinh viên: DTC245200193 – Lớp: CNTT K23A  
> **Giảng viên hướng dẫn**: ThS. Nguyễn Anh Chuyên  
> **Trường Đại học Công nghệ Thông tin và Truyền thông – Đại học Thái Nguyên**

---

## 1. Giới thiệu dự án

**Task Tracker** là nền tảng web hoàn chỉnh phục vụ việc lập kế hoạch, theo dõi tiến độ và cộng tác quản lý công việc dành cho cá nhân và nhóm. Hệ thống tập trung hóa ba yếu tố cốt lõi:
1. **Nội dung công việc (Task)**: Tiêu đề, mô tả, mức độ ưu tiên (`low`, `medium`, `high`), tiến độ (`0% – 100%`).
2. **Thời hạn (Deadline)**: Thiết lập mốc thời gian hoàn thành theo chuẩn `TIMESTAMPTZ`, tự động cảnh báo công việc quá hạn (`due_at < now() AND status <> 'done'`).
3. **Trạng thái thực hiện**: Ba trạng thái chuẩn hóa: `todo` (Chờ làm), `in_progress` (Đang làm), `done` (Đã hoàn thành) với ràng buộc toàn vẹn cơ sở dữ liệu (`chk_done_completed`).

Dự án được xây dựng và đóng gói theo chuẩn DevOps hiện đại, tích hợp giám sát tài nguyên chuỗi thời gian (**Prometheus**, **cAdvisor**, **Grafana**) và quản lý nhật ký tập trung (**Grafana Alloy**, **Loki**).

---

## 2. Ngăn xếp công nghệ bắt buộc

| Thành phần | Công nghệ | Phiên bản | Vai trò & Đặc điểm |
| :--- | :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, JavaScript thuần | ES6+ | Giao diện hiện đại, responsive, không phụ thuộc framework nặng, gọi REST API qua fetch. |
| **Backend** | Node.js & Express | Node 22/24 | RESTful API, xác thực JWT trong cookie HttpOnly, kiểm soát phân quyền (RBAC/IDOR), thu thập metrics. |
| **Database** | PostgreSQL | 16-alpine | Cơ sở dữ liệu quan hệ, ràng buộc `CHECK`, `TIMESTAMPTZ`, chỉ mục tối ưu, trigger tự động cập nhật thời gian. |
| **DB Admin** | pgAdmin 4 | 8.12 | Giao diện quản trị, thực thi truy vấn SQL và kiểm tra dữ liệu trực quan qua web. |
| **Reverse Proxy** | Nginx | 1.27-alpine | Reverse proxy, kết thúc HTTPS, security headers, rate limiting (10 req/s), ẩn version. |
| **Containerization**| Docker & Docker Compose | v2+ | Đóng gói toàn bộ 9 dịch vụ với 2 mạng nội bộ cô lập (`app_net`, `mon_net`). |
| **Metrics Monitoring**| Prometheus & cAdvisor | v2.54 / v0.49 | Thu thập metrics hệ thống, tài nguyên container và ứng dụng Node.js qua `prom-client`. |
| **Dashboard** | Grafana | 11.2.0 | Trực quan hóa metrics, theo dõi CPU, RAM, Latency và Explore nhật ký LogQL. |
| **Log Management**| Grafana Alloy & Loki | v1.4 / v3.1 | Thu thập log container qua Docker socket, lưu trữ chỉ mục nhãn và truy vấn bằng LogQL. |
| **Version Control**| Git & GitHub | Git 2.x | Quản lý mã nguồn, lịch sử commit rõ ràng, không lưu secret. |

---

## 3. Kiến trúc hệ thống

Hệ thống được thiết kế theo mô hình nhiều lớp (Multi-tier Architecture):
```
                       [ Trình duyệt Người dùng ]
                                  │
                          (Cổng 80/443 HTTPS)
                                  ▼
                         ┌─────────────────┐
                         │   Nginx Proxy   │ (Điểm truy cập duy nhất)
                         └────────┬────────┘
             ┌────────────────────┴────────────────────┐
             │ (Phục vụ tĩnh /)                        │ (Chuyển tiếp /api/)
             ▼                                         ▼
   ┌───────────────────┐                     ┌───────────────────┐
   │ Frontend (HTML/JS)│                     │  Backend Express  │ (Cổng 3000 nội bộ)
   └───────────────────┘                     └─────────┬─────────┘
                                                       │ (pg connection)
                                                       ▼
                                             ┌───────────────────┐
                                             │    PostgreSQL     │ (Cổng 5432 nội bộ)
                                             └─────────▲─────────┘
                                                       │
                                             ┌─────────┴─────────┐
                                             │     pgAdmin 4     │ (127.0.0.1:5050)
                                             └───────────────────┘

 ─── LUỒNG GIÁM SÁT & NHẬT KÝ (Mạng mon_net) ──────────────────────────────────
   [ Backend /metrics ]  ──►  [ Prometheus:9090 ]  ──►  [ Grafana:3001 ]
   [ cAdvisor:8080    ]  ──►          ▲                       ▲
                                      │                       │ (LogQL)
   [ Docker Socket    ]  ──►  [ Grafana Alloy ]   ──►  [ Loki:3100 ]
```

### Phân tách mạng an toàn:
- **`app_net`**: Chỉ gồm `nginx`, `backend`, `postgres`, `pgadmin`. PostgreSQL không công khai cổng ra máy chủ host.
- **`mon_net`**: Gồm `prometheus`, `cadvisor`, `grafana`, `loki`, `alloy` và `backend` (chỉ để scrape endpoint `/metrics`).

---

## 4. Cấu trúc thư mục dự án

```text
task-tracker/
├── docker-compose.yml              # Khai báo triển khai 9 dịch vụ container
├── .env.example                    # Tệp mẫu cấu hình biến môi trường
├── .env                            # Tệp biến môi trường thực tế (đã đưa vào .gitignore)
├── .gitignore                      # Loại bỏ node_modules, keys, certificates, secrets
├── README.md                       # Tài liệu hướng dẫn chi tiết
│
├── backend/                        # Ứng dụng Backend REST API
│   ├── Dockerfile                  # Đóng gói Node.js 22 alpine, non-root user
│   ├── package.json                # Định nghĩa thư viện (express, pg, bcryptjs, prom-client...)
│   └── src/
│       ├── config/db.js            # Kết nối PostgreSQL Pool & In-memory Fallback Engine
│       ├── middleware/
│       │   ├── auth.js             # Middleware xác thực JWT HttpOnly cookie / Bearer
│       │   ├── error.js            # Xử lý lỗi tập trung & Structured JSON Logging
│       │   └── metrics.js          # Thu thập metrics cho Prometheus qua prom-client
│       ├── controllers/            # Nghiệp vụ: auth, tasks, teams, stats, comments, users
│       ├── routes/                 # Định tuyến API: /auth, /tasks, /teams, /stats, /users
│       └── server.js               # Khởi động Express Server
│
├── frontend/                       # Giao diện người dùng thuần
│   ├── index.html                  # Khung giao diện HTML5 chuẩn SEO, modal, responsive
│   ├── css/style.css               # Hệ thống design tokens, bố cục Sidebar, Kanban, Badges
│   └── js/
│       ├── api.js                  # Lớp Client kết nối REST API tập trung
│       └── app.js                  # Quản lý trạng thái, DOM, kéo thả Kanban, sự kiện
│
├── db/init/                        # Kịch bản khởi tạo cơ sở dữ liệu PostgreSQL
│   ├── 001_schema.sql              # DDL 6 bảng: users, teams, team_members, tasks, task_assignments, task_comments
│   ├── 002_roles.sql               # Phân quyền tối thiểu cho role ứng dụng task_app
│   └── 003_seed.sql                # Dữ liệu thử nghiệm ban đầu (tài khoản demo, việc mẫu)
│
├── nginx/                          # Cấu hình Web Server & Reverse Proxy
│   ├── default.conf                # ProxyPass, HTTPS 443, redirect 301, chặn /metrics, rate-limit
│   └── certs/                      # Chứng chỉ SSL tự ký (server.key, server.crt)
│
├── prometheus/
│   └── prometheus.yml              # Cấu hình targets scrape: prometheus, cadvisor, backend
│
├── grafana/provisioning/
│   ├── datasources/datasources.yml # Nguồn dữ liệu tự động cho Prometheus và Loki
│   └── dashboards/                 # Dashboard theo dõi CPU, RAM, Request Rate, Latency
│       ├── dashboards.yml
│       └── task_tracker_dashboard.json
│
├── loki/
│   └── loki-config.yml             # Cấu hình lưu trữ log TSDB một nút
│
├── alloy/
│   └── config.alloy                # Cấu hình Grafana Alloy đọc Docker log đẩy về Loki
│
└── tests/                          # Bộ kiểm thử tự động
    ├── runner.js                   # Trình chạy kiểm thử tích hợp 19 test cases
    └── test_results.json           # Kết quả kiểm thử thực tế định dạng JSON
```

---

## 5. Danh mục tài khoản thử nghiệm (Demo Accounts)

Tất cả mật khẩu đã được băm an toàn bằng thuật toán **bcrypt** (salt rounds = 10):

| Vai trò | Họ và tên | Email đăng nhập | Mật khẩu mặc định | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| **Quản trị viên** | Quản trị viên Hệ thống | `admin@gmail.com` | `Mk123!` | Toàn quyền xem mọi công việc, khóa/mở tài khoản |
| **Project Manager** | Nguyễn Minh Quân | `quan.nm@gmail.com` | `Mk123!` | Trưởng nhóm Phát triển Web & Mobile |
| **Tech Lead** | Nguyễn Huy Hoàng | `hoang.nh@gmail.com` | `Mk123!` | Quản lý kỹ thuật và DevOps |
| **Frontend Dev** | Hoàng Thị Lan | `lan.ht@gmail.com` | `Mk123!` | Thành viên lập trình giao diện |

> 💡 *Trên giao diện đăng nhập có sẵn các nút bấm 1-click để điền nhanh thông tin tài khoản demo.*

---

## 6. Hướng dẫn cài đặt và khởi chạy

### Cách 1: Triển khai hoàn chỉnh bằng Docker Compose (Khuyên dùng)

1. **Chuẩn bị file cấu hình môi trường**:
   ```bash
   cp .env.example .env
   ```
2. **Kiểm tra cú pháp cấu hình Compose**:
   ```bash
   docker compose config --quiet
   ```
3. **Khởi chạy toàn bộ 9 container**:
   ```bash
   docker compose up -d --build
   ```
4. **Kiểm tra trạng thái sức khỏe các dịch vụ**:
   ```bash
   docker compose ps
   ```
5. **Xem log vận hành khi cần**:
   ```bash
   docker compose logs -f backend
   ```
6. **Dừng hệ thống**:
   ```bash
   docker compose down
   # Thêm cờ -v nếu muốn xóa trắng dữ liệu volume để khởi tạo lại từ đầu:
   # docker compose down -v
   ```

---

### Cách 2: Chạy chế độ phát triển độc lập (Standalone Development Mode)

Nếu máy tính chưa bật Docker Daemon, ứng dụng hỗ trợ cơ chế chạy trực tiếp với Node.js:

1. **Di chuyển vào thư mục backend và cài đặt thư viện**:
   ```bash
   cd backend
   npm install
   ```
2. **Khởi chạy máy chủ Backend**:
   ```bash
   npm start
   # Hoặc chế độ tự động reload khi sửa mã:
   # npm run dev
   ```
3. **Truy cập ứng dụng**:
   Mở trình duyệt tại địa chỉ: **`http://localhost:3000`**  
   *Máy chủ Express tự động phục vụ các tệp tĩnh Frontend và kết nối REST API.*

---

## 7. Địa chỉ và cổng truy cập các dịch vụ

| Dịch vụ | URL truy cập | Quyền truy cập | Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| **Ứng dụng Task Tracker** | **`https://localhost`** (hoặc `http://localhost:3000` dev) | Công khai | Giao diện làm việc chính cho người dùng |
| **pgAdmin 4** | **`http://127.0.0.1:5050`** | `admin@tasktracker.local` / `ChangeMePgAdminPassword2026!` | Quản trị CSDL PostgreSQL qua web |
| **Prometheus** | **`http://127.0.0.1:9090`** | Quản trị viên (localhost) | Kiểm tra targets UP/DOWN, câu truy vấn PromQL |
| **Grafana** | **`http://127.0.0.1:3001`** | `admin` / `ChangeMeGrafanaPassword2026!` | Xem Dashboard hiệu năng hệ thống & LogQL |
| **API Healthcheck** | **`http://localhost:3000/api/health`** | Nội bộ / Nginx | Kiểm tra tình trạng sẵn sàng của backend |
| **Prometheus Metrics**| **`http://localhost:3000/metrics`** | Chỉ mạng nội bộ (Nginx chặn 404) | Cung cấp chuỗi thời gian cho Prometheus |

---

## 8. Danh mục REST API chính

| Phương thức | Tuyến đường (Endpoint) | Điều kiện quyền | Chức năng nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Công khai | Đăng nhập tài khoản, cấp cookie JWT HttpOnly |
| `POST` | `/api/auth/logout` | Đã đăng nhập | Đăng xuất, xóa bỏ cookie phiên làm việc |
| `GET` | `/api/auth/me` | Đã đăng nhập | Lấy thông tin hồ sơ người dùng đang đăng nhập |
| `PUT` | `/api/auth/profile` | Đã đăng nhập | Cập nhật họ và tên |
| `PUT` | `/api/auth/change-password` | Đã đăng nhập | Đổi mật khẩu tài khoản |
| `GET` | `/api/tasks` | Đã đăng nhập | Lấy danh sách việc (lọc `status`, `team`, `q`, `overdue`, `due_from`...) |
| `POST` | `/api/tasks` | Đã đăng nhập | Tạo công việc mới (Transaction gồm cả phân công `assignees`) |
| `GET` | `/api/tasks/:id` | Quyền truy cập task | Lấy chi tiết công việc, người phụ trách và bình luận |
| `PUT` | `/api/tasks/:id` | Creator/Manager/Admin | Cập nhật thông tin công việc và người phụ trách |
| `PATCH`| `/api/tasks/:id/status`| Người được giao/Tạo | Chuyển trạng thái nhanh (`todo`, `in_progress`, `done`) |
| `DELETE`| `/api/tasks/:id` | Creator/Owner/Admin | Xóa công việc (tự động xóa cascade phân công, bình luận) |
| `GET` | `/api/stats/summary` | Đã đăng nhập | Thống kê số lượng theo trạng thái, quá hạn, sắp đến hạn |
| `GET` | `/api/teams` | Đã đăng nhập | Danh sách các nhóm người dùng đang tham gia |
| `POST` | `/api/teams` | Đã đăng nhập | Tạo nhóm mới (người tạo tự động nhận vai trò `owner`) |
| `GET` | `/api/teams/:id` | Thành viên nhóm | Chi tiết nhóm và danh sách thành viên |
| `POST` | `/api/teams/:id/members`| Owner/Manager | Thêm thành viên vào nhóm và gán vai trò |
| `DELETE`| `/api/teams/:id/members/:userId` | Owner/Manager | Xóa thành viên khỏi nhóm |
| `POST` | `/api/tasks/:id/comments`| Thành viên task | Gửi bình luận trao đổi tiến độ |
| `GET` | `/api/health` | Không yêu cầu | Healthcheck cho Docker container |
| `GET` | `/metrics` | Mạng nội bộ | Dữ liệu đo lường định dạng Prometheus |

---

## 9. Kết quả kiểm thử tự động (Bảng 2.8)

Bộ kiểm thử tự động được lập trình tại [`tests/runner.js`](file:///d:/project/Task%20Tracker/tests/runner.js) và thực thi kiểm thử 100% các tiêu chí trong Báo cáo:

```bash
cd backend
npm test
```

### Bảng kết quả thực nghiệm chi tiết:

| Mã TC | Chức năng kiểm thử | Dữ liệu đầu vào | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC01** | Đăng nhập hợp lệ | Email & mật khẩu đúng (`admin@gmail.com`) | Cấp phiên làm việc, HTTP 200, trả về thông tin user | `HTTP 200, user: admin@gmail.com` | **ĐẠT (PASS)** |
| **TC02** | Đăng nhập sai mật khẩu | Mật khẩu sai | Từ chối cấp phiên, HTTP 401 | `HTTP 401: Email hoặc mật khẩu không chính xác` | **ĐẠT (PASS)** |
| **TC03** | Truy cập API chưa đăng nhập | `GET /api/tasks` không kèm token | Trả về HTTP 401 Unauthorized | `HTTP 401: Yêu cầu đăng nhập` | **ĐẠT (PASS)** |
| **TC04** | Tạo công việc | Tiêu đề, deadline, ưu tiên, phân công hợp lệ | Trả về HTTP 201 Created, tạo thành công trong DB | `HTTP 201, ID: 6` | **ĐẠT (PASS)** |
| **TC05** | Tạo công việc thiếu tiêu đề | Tiêu đề chuỗi rỗng | Trả về HTTP 400 Bad Request, từ chối ghi CSDL | `HTTP 400: Tiêu đề không được để trống` | **ĐẠT (PASS)** |
| **TC06** | Chỉnh sửa công việc | Đổi tiêu đề, deadline, cập nhật tiến độ | HTTP 200, cập nhật `updated_at` | `HTTP 200, progress: 30%, updated_at mới` | **ĐẠT (PASS)** |
| **TC07** | Đổi trạng thái sang Done | `PATCH status = 'done'` | `status=done`, `completed_at` khác rỗng, `progress=100` | `status: done, completed_at có giá trị, progress: 100` | **ĐẠT (PASS)** |
| **TC08** | Mở lại công việc | `PATCH status = 'in_progress'` từ Done | `completed_at` được xóa về NULL | `status: in_progress, completed_at: null` | **ĐẠT (PASS)** |
| **TC09** | Trạng thái không hợp lệ | `PATCH status = 'abc_invalid'` | Trả về HTTP 400, không thay đổi CSDL | `HTTP 400: Trạng thái không hợp lệ` | **ĐẠT (PASS)** |
| **TC10** | Deadline sai định dạng | `due_at = 'khong-phai-ngay'` | Trả về HTTP 400 Bad Request | `HTTP 400: Thời hạn không hợp lệ` | **ĐẠT (PASS)** |
| **TC11** | Lọc công việc quá hạn | `due_at < now() AND status <> 'done'` | Danh sách chỉ chứa công việc quá hạn | `HTTP 200, phát hiện đúng công việc quá hạn` | **ĐẠT (PASS)** |
| **TC12** | Phân quyền chống IDOR | User B truy cập việc riêng của User A | Trả về HTTP 404 (không lộ IDOR) | `HTTP 404: Không tìm thấy công việc` | **ĐẠT (PASS)** |
| **TC13** | Xóa công việc | `DELETE /api/tasks/:id` | Xóa công việc, truy vấn lại trả về 404 | `HTTP 200, kiểm tra lại: HTTP 404` | **ĐẠT (PASS)** |
| **TC14** | Lưu dữ liệu PostgreSQL | Truy vấn task #1 qua SQL | Bản ghi tồn tại với đầy đủ liên kết khóa ngoại | `Tìm thấy task #1: Kiểm toán bảo mật...` | **ĐẠT (PASS)** |
| **TC15** | Reverse proxy và HTTPS | Nginx cấu hình port 80 & 443 | Port 80 redirect 301 sang 443, bật SSL TLS 1.2/1.3 | `Redirect 301: true, SSL 443: true, Proxy: true` | **ĐẠT (PASS)** |
| **TC16** | Không công khai cổng nội bộ | Kiểm tra `ports` của `postgres` | Cổng 5432 không ánh xạ ra ngoài máy chủ | `Cổng 5432 cô lập trong app_net: true` | **ĐẠT (PASS)** |
| **TC17** | Không công khai /metrics | Yêu cầu `GET /metrics` qua Nginx | Nginx chặn đường dẫn, trả về HTTP 404 | `Nginx block location /metrics: true (404)` | **ĐẠT (PASS)** |
| **TC18** | Giám sát metrics Prometheus | Yêu cầu `GET /metrics` nội bộ | Trả về định dạng chuỗi thời gian Prometheus | `Định dạng metrics prom-client: Đúng chuẩn` | **ĐẠT (PASS)** |
| **TC19** | Nhật ký cấu trúc cho Loki | Định dạng JSON đầu ra stdout | Có timestamp, level, status, che dấu mật khẩu | `JSON structured logging che mật khẩu: true` | **ĐẠT (PASS)** |

**Kết quả tổng quát: 19/19 ca kiểm thử đạt (100% PASS).**

---

## 10. Hướng dẫn giám sát và truy vấn Log

### 10.1. Kiểm tra trạng thái Prometheus
- Mở trình duyệt: `http://127.0.0.1:9090/targets`
- Xác nhận 3 job giám sát đều ở trạng thái **UP**:
  1. `prometheus`: Tự giám sát tiến trình Prometheus.
  2. `cadvisor`: Đo lường tài nguyên CPU, RAM, mạng của các container.
  3. `task_tracker_backend`: Đo lường lưu lượng API HTTP.

### 10.2. Truy vấn LogQL trong Grafana Explore
- Truy cập Grafana: `http://127.0.0.1:3001` (Tài khoản: `admin` / `ChangeMeGrafanaPassword2026!`).
- Mở mục **Explore** (biểu tượng la bàn), chọn nguồn dữ liệu **Loki**.
- Một số câu truy vấn LogQL tiêu biểu:
  - Xem toàn bộ log của backend:
    ```logql
    {container="task_tracker_backend"}
    ```
  - Lọc các dòng log ghi nhận lỗi:
    ```logql
    {container="task_tracker_backend"} |= "error"
    ```
  - Tìm các truy vấn Nginx trả về lỗi 5xx:
    ```logql
    {container="task_tracker_nginx"} |~ " 5[0-9][0-9] "
    ```
  - Đếm số lượng log cảnh báo và lỗi trong 5 phút gần nhất:
    ```logql
    sum by (container) (count_over_time({container=~"task_tracker_.*"} |= "error" [5m]))
    ```

---

## 11. Hướng dẫn sao lưu và khôi phục PostgreSQL

### 11.1. Sao lưu cơ sở dữ liệu (Backup)
Sử dụng công cụ `pg_dump` ở định dạng custom (`-Fc`):
```bash
docker compose exec -T postgres pg_dump -U task_owner -d task_tracker -Fc > backup_$(date +%F).dump
```

### 11.2. Khôi phục cơ sở dữ liệu (Restore)
Sử dụng `pg_restore` để phục hồi lại toàn bộ cấu trúc bảng và dữ liệu:
```bash
docker compose exec -T postgres pg_restore -U task_owner -d task_tracker --clean --if-exists < backup_2026-10-24.dump
```

---

## 12. Các biện pháp an toàn và bảo mật đã triển khai

1. **Băm mật khẩu an toàn**: Sử dụng thuật toán `bcrypt` với muối ngẫu nhiên trước khi lưu vào bảng `users`. Tuyệt đối không lưu mật khẩu thuần.
2. **Bảo vệ phiên làm việc**: Mã định danh phiên JWT được lưu trữ trong Cookie với đầy đủ cờ bảo mật:
   - `HttpOnly`: Chống rò rỉ mã token qua các cuộc tấn công XSS.
   - `Secure`: Chỉ truyền qua kênh HTTPS đã mã hóa trong môi trường production.
   - `SameSite=Strict`: Ngăn chặn hoàn toàn nguy cơ tấn công CSRF từ trang web trung gian.
3. **Chống SQL Injection**: 100% các câu truy vấn cơ sở dữ liệu sử dụng tham số hóa (`$1`, `$2`...) qua thư viện `pg`.
4. **Kiểm tra quyền truy cập chống IDOR**: Backend kiểm tra quyền sở hữu ở từng tài nguyên trong câu lệnh SQL (`created_by = $userId OR is_assigned OR is_team_member`).
5. **Đặc quyền tối thiểu (Least Privilege)**: Ứng dụng Node.js kết nối cơ sở dữ liệu thông qua tài khoản `task_app` chỉ được cấp các quyền `SELECT`, `INSERT`, `UPDATE`, `DELETE`, không có quyền `CREATE` hay `DROP` bảng.
6. **Bảo vệ Container**:
   - `backend` chạy bằng tài khoản người dùng thông thường (`USER node`), không chạy dưới quyền `root`.
   - `read_only: true` và `tmpfs: ["/tmp"]` hạn chế khả năng ghi tệp trái phép vào hệ thống tệp container.
   - Tùy chọn bảo mật `no-new-privileges:true` ngăn chặn leo thang đặc quyền.
7. **HTTP Security Headers tại Nginx**:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY` (Chống Clickjacking)
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Content-Security-Policy` hợp lệ
   - `server_tokens off` (Ẩn phiên bản máy chủ Nginx)

---

## 13. Kết luận và Hướng dẫn Trình bày Đồ án

Hệ thống **Task Tracker** đã được lập trình và triển khai hoàn thiện trong không gian làm việc, đáp ứng đầy đủ yêu cầu của đề tài:
- Giao diện trực quan, bảng Kanban kéo thả, quản lý công việc và nhóm mượt mà.
- Ràng buộc toàn vẹn cơ sở dữ liệu `chk_done_completed` bảo đảm dữ liệu luôn chính xác.
- Bộ kiểm thử tự động 19/19 ca kiểm thử (TC01 - TC19) đạt tỷ lệ 100%.
- Cấu hình hạ tầng Docker Compose, Nginx, Prometheus, Grafana, Loki và Alloy đồng bộ và chuẩn xác.
