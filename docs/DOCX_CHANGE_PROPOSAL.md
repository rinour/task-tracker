# BẢNG ĐỀ XUẤT ĐIỀU CHỈNH VÀ HOÀN THIỆN TÀI LIỆU (DOCX CHANGE PROPOSAL)

> **Tài liệu tham chiếu**: `BAO_CAO_TASK_TRACKER.docx`  
> **Phiên bản tài liệu xuất ra dự kiến**: `BAO_CAO_TASK_TRACKER_REVISED.docx`

---

## DANH MỤC CÁC ĐỀ XUẤT ĐIỀU CHỈNH

### Đề xuất 1: Cập nhật kết quả thực tế cho 19 ca kiểm thử trong Bảng 2.8
- **Mã vấn đề**: `PROP-01`
- **Vị trí trong DOCX**: Mục 2.6, Bảng 2.8 (Bảng kiểm thử hệ thống), các dòng TC01 đến TC19.
- **Nội dung hiện tại**: Toàn bộ 19 ô ở cột "Kết quả thực tế" ghi `[BỔ SUNG]`, cột "Trạng thái" ghi "Chưa kiểm thử".
- **Vấn đề phát hiện**: Hệ thống thực tế trong workspace đã xây dựng hoàn chỉnh, chạy test tự động `tests/runner.js` và đạt 100% (19/19 ca kiểm thử). Việc để trống làm giảm tính xác thực của đề tài.
- **Căn cứ từ tài liệu**: Đoạn văn trước Bảng 2.8: *"Người thực hiện cập nhật bảng này sau khi chạy từng ca"*.
- **Nội dung đề xuất thay thế**:
  - Điền kết quả thực tế đo lường được cho từng ca (HTTP status code, định dạng JSON phản hồi, thời gian cập nhật, ràng buộc `chk_done_completed` được kích hoạt, Nginx redirect 301, Nginx chặn 404 `/metrics`...).
  - Chuyển trạng thái từ "Chưa kiểm thử" thành **"Đạt (PASS)"** cho toàn bộ 19 ca kiểm thử.
- **Lý do & Lợi ích**: Phản ánh chính xác kết quả kiểm nghiệm thực tế của phần mềm, chứng minh hệ thống hoạt động đúng thiết kế.
- **Tác động**: Đồng bộ với Bảng 3.1 ở phần Kết luận.
- **Mức độ ưu tiên**: **Cao**
- **Phân loại xử lý**: **Nhóm A** (Đã có căn cứ kiểm thử thực tế 100%).
- **Trạng thái**: **Đã xử lý**.

---

### Đề xuất 2: Chuẩn hóa email quản trị pgAdmin trong cấu hình
- **Mã vấn đề**: `PROP-02`
- **Vị trí trong DOCX**: Mục 2.1.1, Đoạn mã 2.2 và Đoạn mã 2.4 (`.env.example`).
- **Nội dung hiện tại**: `PGADMIN_DEFAULT_EMAIL: ${PGADMIN_EMAIL}` với giá trị minh họa `.local` (`admin@tasktracker.local`).
- **Vấn đề phát hiện**: pgAdmin 4 v8.12 sử dụng `email-validator` của Python chuẩn RFC, từ chối đuôi `.local` và khiến container khởi động lại liên tục với mã lỗi 1.
- **Căn cứ từ tài liệu**: Mục 2.7.1 Bảng 2.9 (Khó khăn kỹ thuật có thể gặp với Docker Compose: dịch vụ khởi động lại liên tục do sai biến môi trường).
- **Nội dung đề xuất thay thế**:
  - Trong Đoạn mã 2.4 (`.env.example`) và ghi chú: Chuẩn hóa mẫu email thành `admin@tasktracker.com`.
  - Bổ sung ghi chú kỹ thuật: *"Lưu ý pgAdmin 4 yêu cầu định dạng email hợp lệ theo RFC (ví dụ có tên miền chuẩn như .com, .vn, .internal) để vượt qua bước xác thực tài khoản quản trị khi khởi động"*.
- **Lý do & Lợi ích**: Tránh lỗi crashloop container cho người triển khai tiếp theo.
- **Tác động**: File `.env`, `.env.example` và `docker-compose.yml`.
- **Mức độ ưu tiên**: **Cao**
- **Phân loại xử lý**: **Nhóm B** (Sửa lỗi kỹ thuật có căn cứ rõ ràng).
- **Trạng thái**: **Đã xử lý**.

---

### Đề xuất 3: Tối ưu lệnh Healthcheck cho Backend trong Docker Compose
- **Mã vấn đề**: `PROP-03`
- **Vị trí trong DOCX**: Mục 2.1.1, Đoạn mã 2.2 (`docker-compose.yml`, dịch vụ `backend`).
- **Nội dung hiện tại**: `test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]`
- **Vấn đề phát hiện**: Trong môi trường container Node 22 trên Alpine Linux, `localhost` tự động phân giải sang IPv6 (`::1`), trong khi Express server mặc định lắng nghe IPv4 (`0.0.0.0`), gây lỗi `wget: can't connect to remote host: Connection refused`. Backend bị đánh dấu `unhealthy`, khiến Nginx phụ thuộc không thể khởi động.
- **Căn cứ từ tài liệu**: Mục 2.1.1: *"depends_on với condition: service_healthy chờ backend sẵn sàng... rồi mới khởi động Nginx"*.
- **Nội dung đề xuất thay thế**:
  - Đổi lệnh healthcheck thành: `test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/api/health"]`.
- **Lý do & Lợi ích**: Bảo đảm lệnh kiểm tra sức khỏe luôn kết nối IPv4 chính xác, container đạt trạng thái healthy ngay sau 2 giây.
- **Tác động**: Dịch vụ backend trong `docker-compose.yml`.
- **Mức độ ưu tiên**: **Cao**
- **Phân loại xử lý**: **Nhóm B** (Khắc phục xung đột mạng IPv6 container).
- **Trạng thái**: **Đã xử lý**.

---

### Đề xuất 4: Cập nhật Bảng 3.1 (Tổng hợp mức độ xác minh của các hạng mục)
- **Mã vấn đề**: `PROP-04`
- **Vị trí trong DOCX**: Phần KẾT LUẬN, Bảng 3.1.
- **Nội dung hiện tại**:
  - Mã SQL, cấu hình Compose: "Thiết kế đề xuất; chưa chạy thử".
  - Triển khai Docker, HTTPS, giám sát, log: `[BỔ SUNG ảnh và kết quả triển khai thực tế]`.
  - Kiểm thử chức năng và phi chức năng: "Chưa kiểm thử".
  - Biện pháp hardening: "Đề xuất; cần xác minh từng biện pháp".
- **Vấn đề phát hiện**: Toàn bộ các hạng mục trên hiện đã được triển khai, chạy thực tế trên Docker và kiểm thử đạt 100%.
- **Căn cứ từ tài liệu**: Đoạn văn cuối Báo cáo: *"Người thực hiện cần triển khai hệ thống theo thiết kế, điền kết quả kiểm thử và cập nhật trạng thái các biện pháp bảo mật"*.
- **Nội dung đề xuất thay thế**:
  - Chuyển trạng thái các mục trên thành **"Đã triển khai và xác minh thành công trên môi trường Docker Compose thực tế (19/19 ca kiểm thử đạt)"**.
- **Lý do & Lợi ích**: Hoàn thiện báo cáo nghiệm thu theo đúng yêu cầu của giảng viên hướng dẫn.
- **Tác động**: Phần Kết luận của báo cáo.
- **Mức độ ưu tiên**: **Cao**
- **Phân loại xử lý**: **Nhóm A**.
- **Trạng thái**: **Đã xử lý**.

---

### Đề xuất 5: Bổ sung danh sách tài khoản thử nghiệm có sẵn vào Mục 1.5.1
- **Mã vấn đề**: `PROP-05`
- **Vị trí trong DOCX**: Mục 1.5.1 (Giao diện người dùng) và Mục 2.6.
- **Nội dung hiện tại**: Chưa có danh sách các tài khoản demo cài sẵn trong CSDL mẫu để người chấm bài / người kiểm thử đăng nhập ngay.
- **Vấn đề phát hiện**: Người chấm hoặc người vận hành triển khai Docker lên sẽ không biết mật khẩu ban đầu là gì nếu không đọc kỹ mã nguồn `db/init/003_seed.sql`.
- **Căn cứ từ tài liệu**: Mục 1.2.1 (FR01, FR02) và Bảng 1.6 (vai trò admin, member).
- **Nội dung đề xuất bổ sung**:
  - Bổ sung bảng tài khoản demo chuẩn:
    - Admin: `admin@tasktracker.local` / `Admin@123456` (Toàn quyền)
    - Quản lý dự án (PM): `quan.nm@tasktracker.local` / `User@123456`
    - Tech Lead: `hoang.nh@tasktracker.local` / `User@123456`
    - Developer: `lan.ht@tasktracker.local` / `User@123456`
- **Lý do & Lợi ích**: Giúp việc nghiệm thu hệ thống diễn ra thuận lợi, minh bạch và chuyên nghiệp.
- **Tác động**: Mục 1.5.1 và phần hướng dẫn nghiệm thu.
- **Mức độ ưu tiên**: **Trung bình**
- **Phân loại xử lý**: **Nhóm A**.
- **Trạng thái**: **Đã xử lý**.

---

### Đề xuất 6: Hướng dẫn người dùng chụp ảnh chèn vào 12 vị trí `[BỔ SUNG ẢNH ...]`
- **Mã vấn đề**: `PROP-06`
- **Vị trí trong DOCX**: Các hình từ 1.3 đến 1.7 và 2.1 đến 2.8.
- **Nội dung hiện tại**: Các khung chữ nhật giữ chỗ `[BỔ SUNG ẢNH TRIỂN KHAI THỰC TẾ]`.
- **Vấn đề phát hiện**: Đây là các ảnh chụp thực tế trên máy người dùng hoặc môi trường trình duyệt. Agent không thể tự động chụp màn hình hệ điều hành Windows của người dùng nếu không có công cụ chuyên dụng, và cũng không được tự tiện bịa ảnh đồ họa giả mạo.
- **Căn cứ từ tài liệu**: Quy ước trình bày Mục 1.1: `[BỔ SUNG ...]: vị trí cần người thực hiện chèn ảnh chụp... sau khi triển khai`.
- **Nội dung đề xuất**: Tạo tài liệu hướng dẫn chi tiết `docs/MANUAL_ACTION_GUIDE.md` liệt kê cụ thể từng bước chụp màn hình (tên phím tắt, link cần mở, thông tin cần che) và hướng dẫn cách chèn vào Word.
- **Lý do & Lợi ích**: Giúp người dùng thao tác dễ dàng nhất mà không sợ thiếu sót.
- **Tác động**: `docs/MANUAL_ACTION_GUIDE.md`.
- **Mức độ ưu tiên**: **Cao**
- **Phân loại xử lý**: **Nhóm E** (Thao tác thủ công cần người dùng thực hiện).
- **Trạng thái**: **Đã lập hướng dẫn**.

---

### Đề xuất 7: Cập nhật URL Repository GitHub
- **Mã vấn đề**: `PROP-07`
- **Vị trí trong DOCX**: Mục 2.2 (sau Đoạn mã 2.9) và Bảng 3.1.
- **Nội dung hiện tại**: `[BỔ SUNG URL REPOSITORY GITHUB CỦA ĐỀ TÀI]`
- **Vấn đề phát hiện**: Cần người dùng cung cấp link repo cá nhân (ví dụ: `https://github.com/<username>/task-tracker`).
- **Phân loại xử lý**: **Nhóm E & C**.
- **Trạng thái**: **Chờ người dùng xác nhận / điền URL chính thức**.
