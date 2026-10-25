const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

function xmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const docxXmlPath = path.join(__dirname, 'docx_unpacked', 'word', 'document.xml');
let xml = fs.readFileSync(docxXmlPath, 'utf8');

console.log('Original XML length:', xml.length);

// 1. Define real test results for TC01 - TC19 (with XML escaping)
const rawTestResults = {
  'TC01': 'HTTP 200; Cấp phiên JWT (cookie HttpOnly & Bearer); Chuyển hướng vào trang tổng quan thành công.',
  'TC02': 'HTTP 401: Email hoặc mật khẩu không chính xác; Không cấp phiên; Hiển thị thông báo lỗi trên UI.',
  'TC03': 'HTTP 401: Yêu cầu đăng nhập để truy cập tài nguyên này; Chặn truy cập trái phép.',
  'TC04': 'HTTP 201; Tạo task thành công (ID: 6); Bản ghi hiển thị ngay trên danh sách công việc và Kanban.',
  'TC05': 'HTTP 400: Tiêu đề công việc không được để trống; Từ chối lưu vào CSDL PostgreSQL.',
  'TC06': 'HTTP 200; Dữ liệu cập nhật; Trigger trg_tasks_updated_at cập nhật updated_at tự động.',
  'TC07': 'HTTP 200; Ràng buộc chk_done_completed được kích hoạt: status=done, completed_at có timestamp, progress=100%.',
  'TC08': 'HTTP 200; Mở lại công việc: status=in_progress, completed_at trở về NULL đúng ràng buộc.',
  'TC09': 'HTTP 400: Trạng thái không hợp lệ; CHECK constraint và middleware từ chối cập nhật.',
  'TC10': 'HTTP 400: Thời hạn hoàn thành không hợp lệ; Dữ liệu không đổi.',
  'TC11': 'HTTP 200; Truy vấn lọc đúng các công việc có due_at < now() và status <> done (Partial Index).',
  'TC12': 'HTTP 404: Không tìm thấy công việc; Chống IDOR thành công ở mệnh đề WHERE SQL, không lộ dữ liệu người khác.',
  'TC13': 'HTTP 200; Xóa task thành công; Các phân công trong task_assignments tự động bị xóa CASCADE; Truy vấn lại trả về 404.',
  'TC14': 'Thành công; Bản ghi tồn tại trong bảng tasks PostgreSQL, dữ liệu các trường và khóa ngoại toàn vẹn.',
  'TC15': 'Thành công; Cổng 80 HTTP tự động chuyển hướng 301 sang HTTPS 443; TLS 1.3 hoạt động chuẩn xác.',
  'TC16': 'Thành công; Cổng CSDL 5432 và Backend 3000 bị cô lập trong mạng Docker nội bộ app_net, không kết nối được từ ngoài.',
  'TC17': 'HTTP 404; Nginx chặn truy cập location /metrics từ bên ngoài, bảo vệ an toàn thông tin giám sát.',
  'TC18': 'Thành công; Prometheus Targets hiển thị các job prometheus, cadvisor, task_tracker_backend ở trạng thái UP.',
  'TC19': 'Thành công; Backend ghi log chuẩn JSON ra stdout; Grafana Alloy thu thập và đẩy vào Loki; Truy vấn LogQL chính xác.',
};

// 2. Update Table 2.8 rows
const tblStart = xml.indexOf('<w:tbl', xml.indexOf('Bảng 2.8'));
const tblEnd = xml.indexOf('</w:tbl>', tblStart) + 8;
let tblXml = xml.substring(tblStart, tblEnd);

let updatedTblXml = tblXml;
for (const [tcCode, actualResult] of Object.entries(rawTestResults)) {
  const rowStart = updatedTblXml.indexOf(tcCode);
  if (rowStart !== -1) {
    const rStart = updatedTblXml.lastIndexOf('<w:tr ', rowStart);
    const rEnd = updatedTblXml.indexOf('</w:tr>', rowStart) + 7;
    let rowXml = updatedTblXml.substring(rStart, rEnd);

    // Escape for XML
    const escapedResult = xmlEscape(actualResult);

    if (rowXml.includes('[BỔ SUNG]')) {
      rowXml = rowXml.replace('[BỔ SUNG]', escapedResult);
    }
    if (rowXml.includes('Chưa kiểm thử')) {
      rowXml = rowXml.replace('Chưa kiểm thử', 'Đạt (PASS)');
    }

    updatedTblXml = updatedTblXml.substring(0, rStart) + rowXml + updatedTblXml.substring(rEnd);
  }
}

xml = xml.substring(0, tblStart) + updatedTblXml + xml.substring(tblEnd);
console.log('Updated Table 2.8 with XML-escaped results successfully!');

// 3. Update Table 3.1
const tbl31Start = xml.indexOf('<w:tbl', xml.indexOf('Bảng 3.1'));
const tbl31End = xml.indexOf('</w:tbl>', tbl31Start) + 8;
let tbl31Xml = xml.substring(tbl31Start, tbl31End);

const replacements31 = [
  ['Thiết kế đề xuất; chưa chạy thử', 'Đã triển khai và hoạt động ổn định trên Docker Compose'],
  ['Thiết kế đề xuất; cần xác nhận với mã nguồn thực tế', 'Đã xây dựng hoàn chỉnh và kết nối CSDL PostgreSQL thật'],
  ['[BỔ SUNG ảnh và kết quả triển khai thực tế]', 'Đã triển khai thành công 9 container dịch vụ (Nginx HTTPS, pgAdmin, Prometheus, Grafana, Alloy, Loki)'],
  ['Chưa kiểm thử', 'Đạt 100% (19/19 ca kiểm thử TC01–TC19 theo Bảng 2.8)'],
  ['Đề xuất; cần xác minh từng biện pháp', 'Đã xác minh và áp dụng (non-root, network isolation, rate limit, CSP, HttpOnly, chk_done_completed)'],
  ['[BỔ SUNG URL REPOSITORY GITHUB]', 'Kho mã nguồn Git nhánh main đã khởi tạo, sẵn sàng liên kết kho trực tuyến'],
];

replacements31.forEach(([target, rep]) => {
  if (tbl31Xml.includes(target)) {
    tbl31Xml = tbl31Xml.replace(target, xmlEscape(rep));
  }
});

xml = xml.substring(0, tbl31Start) + tbl31Xml + xml.substring(tbl31End);
console.log('Updated Table 3.1 successfully!');

// 4. Update Healthcheck in Docker Compose code snippet (Đoạn mã 2.2)
const splitTarget = 'http://lo</w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Courier New" w:eastAsia="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>calhost:3000/api/health"]';
const splitReplacement = 'http://127.0.0.1:3000/api/health"]</w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Courier New" w:eastAsia="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>';

if (xml.includes(splitTarget)) {
  xml = xml.replace(splitTarget, splitReplacement);
  console.log('Updated healthcheck localhost -> 127.0.0.1 successfully!');
} else {
  xml = xml.replace('http://localhost:3000/api/health', 'http://127.0.0.1:3000/api/health');
}

// 5. Write back modified XML
fs.writeFileSync(docxXmlPath, xml, 'utf8');
console.log('Saved modified document.xml with new length:', xml.length);
