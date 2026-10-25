# CẨM NANG HƯỚNG DẪN THAO TÁC THỦ CÔNG HOÀN THIỆN ĐỒ ÁN (MANUAL ACTION GUIDE)

> **Mục tiêu**: Hướng dẫn chi tiết từng bước cho người thực hiện đề tài (dành cho người dùng) để chụp ảnh minh chứng thực tế, cấu hình kho GitHub và hoàn tất báo cáo nộp môn học.  
> **Áp dụng cho**: Sinh viên Đặng Quang Tuệ – Đề tài Task Tracker.

---

## 1. DANH SÁCH 12 ẢNH CHỤP MINH CHỨNG THỰC TẾ CẦN CHÈN VÀO BÁO CÁO

Hệ thống Task Tracker đã được triển khai sẵn sàng và đang chạy trong Docker Desktop trên máy tính của bạn. Bạn chỉ cần mở trình duyệt và chụp lại theo hướng dẫn dưới đây:

### 📸 Ảnh 1: Hình 1.3 – Giao diện quản trị PostgreSQL bằng pgAdmin
- **Mã việc**: `ACT-01`
- **Mục tiêu**: Chụp cây đối tượng CSDL `task_tracker` hiển thị đủ 6 bảng.
- **Vì sao Agent không thể tự làm**: Agent không thể chụp màn hình giao diện hệ điều hành của bạn.
- **Công cụ / Website cần mở**: Mở trình duyệt truy cập: `http://127.0.0.1:5050`
- **Các bước thực hiện**:
  1. Đăng nhập với email `admin@tasktracker.com`, mật khẩu `ChangeMePgAdminPassword2026!`.
  2. Ở cây thư mục bên trái: Chọn **Servers** -> **task_tracker_pg** (hoặc Add Server: Host `postgres`, User `task_owner`, Password `ChangeMeStrongPassword2026!`).
  3. Mở rộng: `Databases` -> `task_tracker` -> `Schemas` -> `public` -> `Tables`.
  4. Bạn sẽ thấy 6 bảng: `task_assignments`, `task_comments`, `tasks`, `team_members`, `teams`, `users`.
  5. Nhấn phím `Windows + Shift + S` để chụp vùng màn hình này.
  6. Mở file Word, dán ảnh vào vị trí **Hình 1.3**.

---

### 📸 Ảnh 2: Hình 1.4 – Giao diện trang đăng nhập Task Tracker
- **Mã việc**: `ACT-02`
- **Website cần mở**: [https://localhost](https://localhost)
- **Các bước thực hiện**:
  1. Truy cập [https://localhost](https://localhost) (nếu chưa đăng nhập, hộp thoại đăng nhập hiện ra).
  2. Bấm nút "🔑 Admin" để hệ thống tự điền tài khoản `admin@tasktracker.local`.
  3. Chụp lại màn hình đăng nhập (nhấn `Windows + Shift + S`).
  4. Dán vào vị trí **Hình 1.4** trong Word.

---

### 📸 Ảnh 3: Hình 1.5 – Giao diện trang tổng quan (Dashboard)
- **Mã việc**: `ACT-03`
- **Website cần mở**: [https://localhost](https://localhost)
- **Các bước thực hiện**:
  1. Đăng nhập tài khoản Admin hoặc PM.
  2. Màn hình "Tổng quan hệ thống" hiển thị 4 thẻ KPI: Tổng công việc, Chờ thực hiện, Đang thực hiện, Đã hoàn thành, kèm danh sách công việc sắp đến hạn.
  3. Chụp lại toàn bộ giao diện dashboard này.
  4. Dán vào vị trí **Hình 1.5**.

---

### 📸 Ảnh 4: Hình 1.6 – Danh sách công việc và Form tạo/sửa
- **Mã việc**: `ACT-04`
- **Website cần mở**: [https://localhost](https://localhost)
- **Các bước thực hiện**:
  1. Vào menu "Tất cả công việc" hoặc "Bảng Kanban".
  2. Bấm nút màu tím "+ Tạo công việc" ở góc phải để mở cửa sổ modal tạo công việc.
  3. Chụp lại màn hình danh sách cùng modal đang mở (có các trường: Tiêu đề, Deadline, Độ ưu tiên, Nhóm, Người phụ trách).
  4. Dán vào vị trí **Hình 1.6**.

---

### 📸 Ảnh 5: Hình 1.7 – Giao diện quản lý nhóm làm việc
- **Mã việc**: `ACT-05`
- **Website cần mở**: [https://localhost](https://localhost)
- **Các bước thực hiện**:
  1. Bấm vào menu "Nhóm làm việc" ở thanh điều hướng bên trái.
  2. Nhấn vào một nhóm (ví dụ: "Đội ngũ Phát triển Web & Mobile").
  3. Bấm "Xem thành viên" để mở danh sách thành viên và các vai trò (Owner, Manager, Member).
  4. Chụp lại màn hình và dán vào vị trí **Hình 1.7**.

---

### 📸 Ảnh 6: Hình 2.1 – Trạng thái các container trong Docker Compose
- **Mã việc**: `ACT-06`
- **Công cụ**: PowerShell hoặc Command Prompt
- **Các bước thực hiện**:
  1. Mở PowerShell trong thư mục dự án (`D:\project\Task Tracker`).
  2. Chạy lệnh:
     ```powershell
     docker compose ps
     ```
  3. Màn hình in ra danh sách 9 container (`nginx`, `backend`, `postgres`, `pgadmin`, `prometheus`, `grafana`, `cadvisor`, `alloy`, `loki`) đều ở trạng thái `Up / healthy`.
  4. Chụp lại cửa sổ PowerShell này và dán vào vị trí **Hình 2.1**.

---

### 📸 Ảnh 7: Hình 2.2 – Truy cập HTTPS và biểu tượng chứng chỉ
- **Mã việc**: `ACT-07`
- **Website**: [https://localhost](https://localhost)
- **Các bước thực hiện**:
  1. Mở trình duyệt Chrome/Edge tại [https://localhost](https://localhost).
  2. Bấm vào biểu tượng ổ khóa / cảnh báo bảo mật trên thanh địa chỉ URL của trình duyệt để hiển thị chi tiết kết nối HTTPS TLS.
  3. Chụp lại thanh địa chỉ và dán vào vị trí **Hình 2.2**.

---

### 📸 Ảnh 8: Hình 2.3 – Kiểm tra HTTP Security Headers với curl
- **Mã việc**: `ACT-08`
- **Công cụ**: PowerShell
- **Các bước thực hiện**:
  1. Mở PowerShell và chạy lệnh:
     ```powershell
     curl.exe -kI https://localhost
     ```
  2. Kết quả in ra: `HTTP/1.1 200 OK`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy...` và không có thông tin phiên bản Nginx.
  3. Chụp lại màn hình terminal và dán vào vị trí **Hình 2.3**.

---

### 📸 Ảnh 9: Hình 2.4 – Kho mã nguồn GitHub của đề tài
- **Mã việc**: `ACT-09`
- **Website**: Mở trang repository GitHub của bạn
- **Các bước thực hiện**:
  1. Mở repository GitHub mà bạn đã đẩy mã nguồn lên (ví dụ: `https://github.com/<tên-bạn>/task-tracker`).
  2. Chụp lại trang chủ GitHub thể hiện danh sách file và các commit.
  3. Dán vào vị trí **Hình 2.4**.

---

### 📸 Ảnh 10: Hình 2.5 – Trạng thái các Target trên Prometheus
- **Mã việc**: `ACT-10`
- **Website**: [http://127.0.0.1:9090/targets](http://127.0.0.1:9090/targets)
- **Các bước thực hiện**:
  1. Mở trình duyệt vào [http://127.0.0.1:9090/targets](http://127.0.0.1:9090/targets).
  2. Kiểm tra thấy 3 job `prometheus`, `cadvisor`, `task_tracker_backend` đều có trạng thái màu xanh lá **UP (1/1)**.
  3. Chụp lại màn hình này và dán vào vị trí **Hình 2.5**.

---

### 📸 Ảnh 11: Hình 2.6 – Giao diện Dashboard trên Grafana
- **Mã việc**: `ACT-11`
- **Website**: [http://127.0.0.1:3001](http://127.0.0.1:3001)
- **Các bước thực hiện**:
  1. Đăng nhập Grafana với tài khoản `admin` / `ChangeMeGrafanaPassword2026!`.
  2. Vào mục **Dashboards** -> Chọn **Task Tracker System & Resource Monitoring**.
  3. Các biểu đồ CPU, RAM theo container, tốc độ request và độ trễ phản hồi hiển thị biểu đồ đẹp mắt.
  4. Chụp lại màn hình Dashboard này và dán vào vị trí **Hình 2.6**.

---

### 📸 Ảnh 12: Hình 2.7 & 2.8 – Truy vấn nhật ký LogQL trong Grafana Explore
- **Mã việc**: `ACT-12`
- **Website**: [http://127.0.0.1:3001/explore](http://127.0.0.1:3001/explore)
- **Các bước thực hiện**:
  1. Vào menu **Explore** bên trái Grafana, chọn data source là **Loki**.
  2. Nhập câu truy vấn:
     ```logql
     {container="task_tracker_backend"}
     ```
     -> Bấm Run Query -> Chụp ảnh làm **Hình 2.7**.
  3. Nhập câu truy vấn lọc lỗi:
     ```logql
     {container="task_tracker_backend"} |= "error"
     ```
     -> Bấm Run Query -> Chụp ảnh làm **Hình 2.8**.

---

## 2. HƯỚNG DẪN CẤP NHẬT KHO MÃ NGUỒN GITHUB CỦA BẠN

Nếu bạn chưa đẩy code lên GitHub, hãy làm theo 4 lệnh đơn giản sau trong PowerShell:
```powershell
# 1. Đặt URL repository của bạn (thay username bằng tên tài khoản GitHub thật)
git remote add origin https://github.com/<your-username>/task-tracker.git

# 2. Đổi tên nhánh chính thành main
git branch -M main

# 3. Đẩy toàn bộ mã nguồn lên GitHub
git push -u origin main
```
Sau đó, chỉ cần sao chép liên kết GitHub đó và dán vào vị trí `[BỔ SUNG URL REPOSITORY GITHUB CỦA ĐỀ TÀI]` trong file Word.
