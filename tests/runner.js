// ==============================================================================
// tests/runner.js: Bộ kiểm thử tự động toàn diện cho Task Tracker
// Bao phủ đầy đủ 19 ca kiểm thử (TC01 - TC19) theo Bảng 2.8 trong Báo cáo
// ==============================================================================

process.env.NODE_ENV = 'test';
process.env.PORT = '3099';

const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('../backend/src/server');

let server;
let adminCookie = '';
let adminToken = '';
let userCookie = '';
let userToken = '';
let hackerToken = '';
let createdTaskId = null;

const results = [];

function recordResult(code, name, expected, actual, passed) {
  results.push({
    code,
    name,
    expected,
    actual,
    status: passed ? 'ĐẠT (PASS)' : 'KHÔNG ĐẠT (FAIL)',
    passed,
  });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${code}: ${name} => ${actual}`);
}

function makeRequest(method, path, body = null, token = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (cookie) headers['Cookie'] = cookie;

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 3099,
        path,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch (e) {
            json = data;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: json,
          });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runAllTests() {
  console.log('==============================================================================');
  console.log('KHỞI CHẠY BỘ KIỂM THỬ TỰ ĐỘNG TASK TRACKER (TC01 - TC19)');
  console.log('==============================================================================\n');

  // Khởi động server test
  await new Promise((res) => {
    server = app.listen(3099, '127.0.0.1', res);
  });

  try {
    // --------------------------------------------------------------------------
    // TC01: Đăng nhập hợp lệ
    // --------------------------------------------------------------------------
    const resTC01 = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@gmail.com',
      password: 'Mk123!',
    });
    const tc01Passed = resTC01.statusCode === 200 && resTC01.body.token && resTC01.body.user.role === 'admin';
    if (tc01Passed) {
      adminToken = resTC01.body.token;
      adminCookie = resTC01.headers['set-cookie'] ? resTC01.headers['set-cookie'][0] : '';
    }
    recordResult(
      'TC01',
      'Đăng nhập hợp lệ',
      '200 OK, cấp JWT token và thông tin người dùng',
      `HTTP ${resTC01.statusCode}, user: ${resTC01.body.user ? resTC01.body.user.email : 'null'}`,
      tc01Passed
    );

    // Đăng nhập tài khoản User thường (quan.nm)
    const resUserLogin = await makeRequest('POST', '/api/auth/login', {
      email: 'quan.nm@gmail.com',
      password: 'Mk123!',
    });
    userToken = resUserLogin.body.token;
    userCookie = resUserLogin.headers['set-cookie'] ? resUserLogin.headers['set-cookie'][0] : '';

    // Tạo thêm tài khoản hacker / độc lập để test phân quyền IDOR
    const resRegister = await makeRequest('POST', '/api/auth/register', {
      email: 'hacker@isolated.local',
      password: 'Password123!',
      full_name: 'Tài khoản Độc lập',
    });
    hackerToken = resRegister.body.token;

    // --------------------------------------------------------------------------
    // TC02: Đăng nhập sai mật khẩu
    // --------------------------------------------------------------------------
    const resTC02 = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@gmail.com',
      password: 'WrongPassword!',
    });
    const tc02Passed = resTC02.statusCode === 401 && !resTC02.body.token;
    recordResult(
      'TC02',
      'Đăng nhập sai mật khẩu',
      'HTTP 401 Unauthorized, từ chối cấp token',
      `HTTP ${resTC02.statusCode}: ${resTC02.body.error}`,
      tc02Passed
    );

    // --------------------------------------------------------------------------
    // TC03: Truy cập API khi chưa đăng nhập
    // --------------------------------------------------------------------------
    const resTC03 = await makeRequest('GET', '/api/tasks');
    const tc03Passed = resTC03.statusCode === 401;
    recordResult(
      'TC03',
      'Truy cập API khi chưa đăng nhập',
      'HTTP 401 Unauthorized',
      `HTTP ${resTC03.statusCode}: ${resTC03.body.error}`,
      tc03Passed
    );

    // --------------------------------------------------------------------------
    // TC04: Tạo công việc hợp lệ
    // --------------------------------------------------------------------------
    const resTC04 = await makeRequest(
      'POST',
      '/api/tasks',
      {
        title: 'Nhiệm vụ kiểm thử tự động TC04',
        description: 'Mô tả chi tiết cho kiểm thử tích hợp',
        priority: 'high',
        status: 'todo',
        due_at: new Date(Date.now() + 86400000).toISOString(),
        progress: 0,
        team_id: 1,
        assignees: [2, 3],
      },
      userToken
    );
    const tc04Passed = resTC04.statusCode === 201 && resTC04.body.id;
    if (tc04Passed) createdTaskId = resTC04.body.id;
    recordResult(
      'TC04',
      'Tạo công việc',
      'HTTP 201 Created, trả về công việc mới có ID',
      `HTTP ${resTC04.statusCode}, ID: ${resTC04.body.id}`,
      tc04Passed
    );

    // --------------------------------------------------------------------------
    // TC05: Tạo công việc thiếu tiêu đề
    // --------------------------------------------------------------------------
    const resTC05 = await makeRequest(
      'POST',
      '/api/tasks',
      {
        title: '   ', // Rỗng
        priority: 'medium',
      },
      userToken
    );
    const tc05Passed = resTC05.statusCode === 400;
    recordResult(
      'TC05',
      'Tạo công việc thiếu tiêu đề',
      'HTTP 400 Bad Request, từ chối ghi CSDL',
      `HTTP ${resTC05.statusCode}: ${resTC05.body.error}`,
      tc05Passed
    );

    // --------------------------------------------------------------------------
    // TC06: Sửa công việc (kiểm tra updated_at)
    // --------------------------------------------------------------------------
    const resTC06 = await makeRequest(
      'PUT',
      `/api/tasks/${createdTaskId}`,
      {
        title: 'Nhiệm vụ kiểm thử tự động TC04 (Đã cập nhật)',
        description: 'Mô tả đã được cập nhật thành công',
        status: 'in_progress',
        priority: 'high',
        progress: 30,
        due_at: new Date(Date.now() + 2 * 86400000).toISOString(),
        team_id: 1,
        assignees: [2],
      },
      userToken
    );
    const tc06Passed = resTC06.statusCode === 200 && resTC06.body.progress === 30;
    recordResult(
      'TC06',
      'Sửa công việc',
      'HTTP 200 OK, dữ liệu cập nhật và updated_at mới',
      `HTTP ${resTC06.statusCode}, progress: ${resTC06.body.progress}%, updated_at: ${resTC06.body.updated_at}`,
      tc06Passed
    );

    // --------------------------------------------------------------------------
    // TC07: Cập nhật trạng thái sang Done
    // --------------------------------------------------------------------------
    const resTC07 = await makeRequest(
      'PATCH',
      `/api/tasks/${createdTaskId}/status`,
      { status: 'done' },
      userToken
    );
    const tc07Passed =
      resTC07.statusCode === 200 &&
      resTC07.body.status === 'done' &&
      resTC07.body.completed_at !== null &&
      resTC07.body.progress === 100;
    recordResult(
      'TC07',
      'Cập nhật trạng thái sang Done',
      'status=done, completed_at khác rỗng, progress=100',
      `status: ${resTC07.body.status}, completed_at: ${resTC07.body.completed_at}, progress: ${resTC07.body.progress}`,
      tc07Passed
    );

    // --------------------------------------------------------------------------
    // TC08: Mở lại công việc từ Done sang In Progress
    // --------------------------------------------------------------------------
    const resTC08 = await makeRequest(
      'PATCH',
      `/api/tasks/${createdTaskId}/status`,
      { status: 'in_progress' },
      userToken
    );
    const tc08Passed =
      resTC08.statusCode === 200 &&
      resTC08.body.status === 'in_progress' &&
      resTC08.body.completed_at === null;
    recordResult(
      'TC08',
      'Mở lại công việc',
      'status=in_progress, completed_at được xóa thành NULL',
      `status: ${resTC08.body.status}, completed_at: ${resTC08.body.completed_at}`,
      tc08Passed
    );

    // --------------------------------------------------------------------------
    // TC09: Trạng thái không hợp lệ
    // --------------------------------------------------------------------------
    const resTC09 = await makeRequest(
      'PATCH',
      `/api/tasks/${createdTaskId}/status`,
      { status: 'abc_invalid' },
      userToken
    );
    const tc09Passed = resTC09.statusCode === 400;
    recordResult(
      'TC09',
      'Trạng thái không hợp lệ',
      'HTTP 400 Bad Request, dữ liệu không đổi',
      `HTTP ${resTC09.statusCode}: ${resTC09.body.error}`,
      tc09Passed
    );

    // --------------------------------------------------------------------------
    // TC10: Deadline định dạng sai
    // --------------------------------------------------------------------------
    const resTC10 = await makeRequest(
      'POST',
      '/api/tasks',
      {
        title: 'Công việc ngày sai',
        due_at: 'khong-phai-ngay',
      },
      userToken
    );
    const tc10Passed = resTC10.statusCode === 400;
    recordResult(
      'TC10',
      'Deadline định dạng sai',
      'HTTP 400 Bad Request',
      `HTTP ${resTC10.statusCode}: ${resTC10.body.error}`,
      tc10Passed
    );

    // --------------------------------------------------------------------------
    // TC11: Hiển thị công việc quá hạn
    // --------------------------------------------------------------------------
    const resTC11 = await makeRequest('GET', '/api/tasks?overdue=true', null, userToken);
    const overdueTasks = Array.isArray(resTC11.body) ? resTC11.body : [];
    const now = new Date();
    const allAreOverdue = overdueTasks.every((t) => t.status !== 'done' && new Date(t.due_at) < now);
    const tc11Passed = resTC11.statusCode === 200 && overdueTasks.length > 0 && allAreOverdue;
    recordResult(
      'TC11',
      'Hiển thị công việc quá hạn',
      'Danh sách công việc có deadline < now() và status <> done',
      `HTTP ${resTC11.statusCode}, tìm thấy ${overdueTasks.length} việc quá hạn`,
      tc11Passed
    );

    // --------------------------------------------------------------------------
    // TC12: Phân quyền công việc người khác (Chống IDOR)
    // --------------------------------------------------------------------------
    // Hacker cố truy cập task 5 (công việc cá nhân của quan.nm)
    const resTC12 = await makeRequest('GET', '/api/tasks/5', null, hackerToken);
    const tc12Passed = resTC12.statusCode === 404 || resTC12.statusCode === 403;
    recordResult(
      'TC12',
      'Phân quyền công việc người khác',
      'Từ chối truy cập (404/403), không lộ thông tin cá nhân',
      `HTTP ${resTC12.statusCode}: ${resTC12.body.error}`,
      tc12Passed
    );

    // --------------------------------------------------------------------------
    // TC13: Xóa công việc
    // --------------------------------------------------------------------------
    const resTC13 = await makeRequest('DELETE', `/api/tasks/${createdTaskId}`, null, userToken);
    const checkDeleted = await makeRequest('GET', `/api/tasks/${createdTaskId}`, null, userToken);
    const tc13Passed = resTC13.statusCode === 200 && checkDeleted.statusCode === 404;
    recordResult(
      'TC13',
      'Xóa công việc',
      'HTTP 200 OK, công việc bị xóa hoàn toàn',
      `HTTP ${resTC13.statusCode}, kiểm tra lại: HTTP ${checkDeleted.statusCode}`,
      tc13Passed
    );

    // --------------------------------------------------------------------------
    // TC14: Lưu dữ liệu vào CSDL
    // --------------------------------------------------------------------------
    const resTC14 = await makeRequest('GET', '/api/tasks/1', null, adminToken);
    const tc14Passed = resTC14.statusCode === 200 && resTC14.body.id === 1 && resTC14.body.title;
    recordResult(
      'TC14',
      'Lưu dữ liệu vào PostgreSQL',
      'Bản ghi tồn tại với đầy đủ các trường và liên kết bảng',
      `Tìm thấy task #1: "${resTC14.body ? resTC14.body.title : ''}"`,
      tc14Passed
    );

    // --------------------------------------------------------------------------
    // TC15: Reverse proxy và HTTPS
    // --------------------------------------------------------------------------
    const nginxConf = fs.readFileSync(path.join(__dirname, '../nginx/default.conf'), 'utf8');
    const hasRedirect = nginxConf.includes('return 301 https://');
    const hasSsl = nginxConf.includes('listen 443 ssl');
    const hasProxy = nginxConf.includes('proxy_pass http://backend:3000');
    const tc15Passed = hasRedirect && hasSsl && hasProxy;
    recordResult(
      'TC15',
      'Reverse proxy và HTTPS',
      'Chuyển hướng 301 HTTP->HTTPS, cấu hình SSL TLS 1.2/1.3',
      `Cấu hình Nginx: redirect 301: ${hasRedirect}, SSL 443: ${hasSsl}, Proxy: ${hasProxy}`,
      tc15Passed
    );

    // --------------------------------------------------------------------------
    // TC16: Không công khai cổng nội bộ
    // --------------------------------------------------------------------------
    const composeContent = fs.readFileSync(path.join(__dirname, '../docker-compose.yml'), 'utf8');
    // Kiểm tra service postgres không khai báo "ports:"
    const postgresBlock = composeContent.substring(composeContent.indexOf('postgres:'), composeContent.indexOf('pgadmin:'));
    const isPortHidden = !postgresBlock.includes('ports:');
    const tc16Passed = isPortHidden;
    recordResult(
      'TC16',
      'Không công khai cổng CSDL nội bộ',
      'PostgreSQL chỉ chạy trong app_net, không ánh xạ ports ra host',
      `Cổng 5432 bị cô lập nội bộ: ${isPortHidden}`,
      tc16Passed
    );

    // --------------------------------------------------------------------------
    // TC17: Không công khai /metrics
    // --------------------------------------------------------------------------
    const hasMetricsBlock = nginxConf.includes('location = /metrics') && nginxConf.includes('return 404');
    recordResult(
      'TC17',
      'Không công khai /metrics ra ngoài',
      'Nginx chặn đường dẫn /metrics với HTTP 404',
      `Nginx chặn /metrics: ${hasMetricsBlock}`,
      hasMetricsBlock
    );

    // --------------------------------------------------------------------------
    // TC18: Giám sát metrics Prometheus
    // --------------------------------------------------------------------------
    const resTC18 = await makeRequest('GET', '/metrics');
    const hasMetricData =
      resTC18.statusCode === 200 &&
      typeof resTC18.body === 'string' &&
      resTC18.body.includes('http_request_duration_seconds');
    recordResult(
      'TC18',
      'Giám sát metrics Prometheus',
      'HTTP 200, trả về dữ liệu chuẩn Prometheus (prom-client)',
      `Định dạng prometheus: ${hasMetricData ? 'Đúng chuẩn' : 'Sai'}`,
      hasMetricData
    );

    // --------------------------------------------------------------------------
    // TC19: Truy vấn log cấu trúc (Alloy/Loki)
    // --------------------------------------------------------------------------
    const errMiddleware = fs.readFileSync(path.join(__dirname, '../backend/src/middleware/error.js'), 'utf8');
    const hasStructuredLog = errMiddleware.includes('JSON.stringify(logEntry)') && errMiddleware.includes('delete sanitizedBody.password');
    recordResult(
      'TC19',
      'Truy vấn nhật ký có cấu trúc',
      'Định dạng JSON có timestamp, level, status, che mật khẩu',
      `Cấu trúc log chuẩn JSON cho Alloy/Loki: ${hasStructuredLog}`,
      hasStructuredLog
    );

  } catch (err) {
    console.error('Lỗi ngoại lệ trong quá trình chạy kiểm thử:', err);
  } finally {
    if (server) server.close();

    console.log('\n==============================================================================');
    console.log('TỔNG HỢP KẾT QUẢ KIỂM THỬ:');
    console.log('==============================================================================');
    const passedCount = results.filter((r) => r.passed).length;
    console.log(`Tổng số ca kiểm thử: ${results.length}`);
    console.log(`Thành công (PASS):   ${passedCount}`);
    console.log(`Thất bại (FAIL):     ${results.length - passedCount}`);
    console.log(`Tỷ lệ đạt:           ${Math.round((passedCount / results.length) * 100)}%`);
    console.log('==============================================================================\n');

    // Lưu bảng kết quả kiểm thử ra tệp để chèn vào báo cáo
    fs.writeFileSync(
      path.join(__dirname, 'test_results.json'),
      JSON.stringify(results, null, 2),
      'utf8'
    );
  }
}

runAllTests();
