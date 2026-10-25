# BÁO CÁO KIỂM TOÁN TÀI LIỆU GỐC BAO_CAO_TASK_TRACKER.docx (DOCX AUDIT REPORT)

> **Căn cứ**: File `BAO_CAO_TASK_TRACKER.docx` (Dung lượng: 2.490.926 bytes, 1.564 đoạn văn, 4 hình nhúng, 15 bảng biểu).  
> **Người thực hiện kiểm toán**: Senior Business Analyst & Software Architect.  
> **Bản sao lưu an toàn**: `BAO_CAO_TASK_TRACKER_ORIGINAL_BACKUP.docx` (Đã sao lưu ngày 25/10/2026).

---

## 1. CẤU TRÚC TÀI LIỆU HIỆN TẠI

Báo cáo được tổ chức khoa học, gồm trang bìa, mục lục tự động và 2 chương nội dung chính cùng phần Kết luận và Tài liệu tham khảo:

```text
TRANG TIÊU ĐỀ: Đề tài Hệ thống Quản lý Công việc Cá nhân/Nhóm (Task Tracker)
MỤC LỤC
CHƯƠNG 1. PHÂN TÍCH, THIẾT KẾ VÀ XÂY DỰNG HỆ THỐNG TASK TRACKER
  1.1. Giới thiệu đề tài (Mục tiêu, phạm vi và quy ước trình bày)
  1.2. Phân tích yêu cầu hệ thống
    1.2.1. Yêu cầu chức năng (Bảng 1.1: FR01 - FR12)
    1.2.2. Yêu cầu phi chức năng (Bảng 1.2: NFR01 - NFR07)
  1.3. Phân tích kiến trúc hệ thống
    1.3.1. Kiến trúc tổng thể (Hình 1.1, Bảng 1.3: Phạm vi truy cập)
    1.3.2. Công nghệ sử dụng (Bảng 1.4: Node.js, Postgres, Nginx, Prometheus, Alloy, Loki)
  1.4. Thiết kế cơ sở dữ liệu
    1.4.1. Mục tiêu thiết kế
    1.4.2. Các bảng dữ liệu chính (Hình 1.2 ERD, Bảng 1.5 - 1.11, Đoạn mã 1.1 - 1.3)
    1.4.3. Quản trị cơ sở dữ liệu bằng pgAdmin (Hình 1.3 [Chỗ giữ ảnh])
  1.5. Xây dựng các chức năng chính
    1.5.1. Giao diện người dùng (Hình 1.4 - 1.7 [Chỗ giữ ảnh])
    1.5.2. Xử lý nghiệp vụ phía máy chủ (Bảng 1.12 API, Đoạn mã 1.4)
    1.5.3. Quy trình quản lý công việc (Hình 1.8, Bảng 1.13, Đoạn mã 1.5)
CHƯƠNG 2. TRIỂN KHAI, GIÁM SÁT VÀ ĐÁNH GIÁ HỆ THỐNG
  2.1. Triển khai hệ thống bằng Docker Compose
    2.1.1. Tổ chức các dịch vụ (Cấu trúc thư mục, Bảng 2.1, Đoạn mã 2.2 - 2.4, Bảng 2.2, Hình 2.1 [Chỗ giữ ảnh])
    2.1.2. Cấu hình Nginx và HTTPS (Đoạn mã 2.5, Bảng 2.3, Hình 2.2 - 2.3 [Chỗ giữ ảnh])
  2.2. Quản lý mã nguồn bằng GitHub (Đoạn mã 2.7 - 2.9, Hình 2.4 [Chỗ giữ ảnh])
  2.3. Giám sát hoạt động hệ thống
    2.3.1. Prometheus và cAdvisor (Đoạn mã 2.10 - 2.11, Bảng 2.4, Hình 2.5 [Chỗ giữ ảnh])
    2.3.2. Grafana (Đoạn mã 2.12, Bảng 2.5, Hình 2.6 [Chỗ giữ ảnh])
  2.4. Thu thập và quản lý nhật ký hệ thống (Đoạn mã 2.13 - 2.14, Bảng 2.6 LogQL, Hình 2.7 - 2.8 [Chỗ giữ ảnh])
  2.5. Các biện pháp bảo mật và hardening (Bảng 2.7: 11 biện pháp, Đoạn mã 2.15 - 2.17)
  2.6. Kiểm thử và đánh giá hệ thống (Bảng 2.8: 19 Test Cases TC01 - TC19, Đoạn mã 2.18)
  2.7. Khó khăn, hạn chế và hướng phát triển (Bảng 2.9, Mục 2.7.2 - 2.7.3)
KẾT LUẬN (Bảng 3.1: Tổng hợp mức độ xác minh)
TÀI LIỆU THAM KHẢO (19 nguồn chính thức)
```

---

## 2. CÁC CHỦ ĐỀ ĐÃ ĐƯỢC MÔ TẢ ĐẦY ĐỦ VÀ CHÍNH XÁC

1. **Mô hình nghiệp vụ & Quy tắc dữ liệu**:
   - Ràng buộc toàn vẹn `chk_done_completed` bảo đảm tính nhất quán toán học giữa trạng thái `done` và thời điểm `completed_at`.
   - Phân biệt rõ việc cá nhân và việc nhóm dựa trên `tasks.team_id IS NULL`.
   - Quan hệ phân công nhiều người phụ trách qua bảng trung gian `task_assignments`.
2. **Kiến trúc hệ thống 3 lớp phân tách rõ ràng**:
   - Client -> Nginx (Reverse Proxy & TLS) -> Backend Node.js/Express -> PostgreSQL.
   - Luồng giám sát độc lập: cAdvisor/Prometheus -> Grafana; Alloy -> Loki -> Grafana.
   - Phân chia 2 mạng nội bộ: `app_net` và `mon_net`, cô lập hoàn toàn cơ sở dữ liệu `postgres` không công khai cổng ra bên ngoài.
3. **Bộ test cases Bảng 2.8**:
   - 19 ca kiểm thử thiết kế rất chặt chẽ, bao phủ từ xác thực, CRUD, constraint, IDOR, SQL injection, đến các yêu cầu vận hành (HTTPS redirect, block `/metrics`, Prometheus targets, JSON logging).

---

## 3. CÁC THIẾU SÓT, ĐIỂM CHƯA ĐỦ THÔNG TIN VÀ CẦN HOÀN THIỆN

Qua kiểm tra toàn văn `document.xml`, có tổng cộng **37 điểm giữ chỗ `[BỔ SUNG ...]`** cần được xử lý:

### 3.1. Các điểm thiếu dữ liệu thực tế (Placeholders)
1. **12 Vị trí ảnh chụp màn hình thực tế**:
   - `Hình 1.3`: Giao diện pgAdmin kết nối database `task_tracker` hiển thị 6 bảng.
   - `Hình 1.4`: Màn hình đăng nhập qua Nginx HTTPS.
   - `Hình 1.5`: Màn hình trang tổng quan (Dashboard) với số liệu thống kê thật.
   - `Hình 1.6`: Màn hình danh sách công việc và biểu mẫu tạo/sửa.
   - `Hình 1.7`: Màn hình quản lý nhóm làm việc và thành viên.
   - `Hình 2.1`: Trạng thái các container qua lệnh `docker compose ps`.
   - `Hình 2.2`: Truy cập HTTPS có biểu tượng bảo mật / chứng chỉ SSL.
   - `Hình 2.3`: Kết quả `curl -kI https://localhost` hiển thị security headers.
   - `Hình 2.4`: Trang chủ repository dự án trên GitHub.
   - `Hình 2.5`: Trang Prometheus Status -> Targets hiển thị các job UP.
   - `Hình 2.6`: Dashboard giám sát trên Grafana.
   - `Hình 2.7` & `Hình 2.8`: Grafana Explore truy vấn LogQL với Loki.
2. **19 Ca kiểm thử trong Bảng 2.8 (TC01 đến TC19)**:
   - Cột "Kết quả thực tế" đều đang để `[BỔ SUNG]`.
   - Cột "Trạng thái" đều đang ghi "Chưa kiểm thử".
   *(Trong khi đó, trên hệ thống thực tế ta đã chạy kiểm thử tự động đạt 100% 19/19 ca)*.
3. **URL GitHub Repository**:
   - Mục 2.2 và Bảng 3.1 đang để `[BỔ SUNG URL REPOSITORY GITHUB CỦA ĐỀ TÀI]`.
4. **Bảng 3.1 (Tổng hợp mức độ xác minh)**:
   - Hạng mục triển khai, kiểm thử, hardening đều đang ghi `[BỔ SUNG...]` hoặc "Chưa kiểm thử".
5. **Tài liệu tham khảo**:
   - Dòng cuối đang ghi `[BỔ SUNG – ghi ngày kiểm tra thực tế từng liên kết trước khi nộp]`.

---

## 4. CÁC MÂU THUẪN VÀ ĐIỂM KHÓ KHĂN KỸ THUẬT PHÁT HIỆN

1. **Email xác thực của pgAdmin 4**:
   - *Tài liệu*: `.env.example` Đoạn mã 2.4 và Compose đề xuất email `admin@tasktracker.local`.
   - *Vấn đề thực tế*: pgAdmin 4 v8.12+ tích hợp thư viện kiểm tra email Python chuẩn RFC, từ chối định dạng domain `.local`. Container sẽ khởi động lại liên tục (crashloop) với lỗi `'admin@tasktracker.local' does not appear to be a valid email address`.
   - *Khắc phục*: Cần chuẩn hóa sang tên miền hợp lệ như `admin@tasktracker.com`.
2. **Healthcheck localhost trong môi trường Docker Container Alpine**:
   - *Tài liệu*: Đoạn mã 2.2 cấu hình `wget -qO- http://localhost:3000/api/health`.
   - *Vấn đề thực tế*: Trong image Alpine với Node.js 22, `localhost` phân giải ưu tiên IPv6 `::1`, trong khi Node.js `app.listen(3000, '0.0.0.0')` chỉ lắng nghe IPv4, dẫn đến lỗi `Connection refused` làm backend bị coi là `unhealthy` và Nginx không khởi động được.
   - *Khắc phục*: Thay `localhost` bằng `127.0.0.1` (`wget -qO- http://127.0.0.1:3000/api/health`).
3. **Đồng bộ mật khẩu tài khoản CSDL `task_app`**:
   - *Tài liệu*: Đoạn mã 2.16 ghi cứng `CREATE ROLE task_app LOGIN PASSWORD '<DAT_MAT_KHAU_MANH>'`, trong khi Docker Compose truyền biến `APP_DB_PASSWORD`.
   - *Khắc phục*: Tạo script entrypoint `002_roles.sh` để đọc biến `${APP_DB_PASSWORD}` động, tránh lệch mật khẩu giữa file `.env` và script SQL init.
4. **Quy định mật khẩu Admin ban đầu**:
   - Tài liệu chưa nêu rõ mật khẩu khởi tạo của các tài khoản demo (Admin, PM, Tech Lead, Dev) trong CSDL mẫu, gây khó khăn cho việc nghiệm thu ban đầu.

---

## 5. THÀNH PHẦN CHƯA THỂ ĐỌC HOẶC TỰ ĐỘNG THAY THẾ TRONG DOCX
- **Các ảnh chụp thực tế**: Agent không thể tự ý bịa ảnh giả hoặc tự động upload ảnh lên GitHub của người dùng nếu người dùng chưa cung cấp repository cá nhân.
- **Tài khoản cá nhân**: Thông tin cá nhân như URL GitHub của sinh viên Đặng Quang Tuệ cần người dùng cung cấp hoặc cấu hình theo ý muốn.
