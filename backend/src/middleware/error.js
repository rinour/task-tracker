// ==============================================================================
// backend/src/middleware/error.js: Xử lý lỗi tập trung & Structured JSON Logging
// ==============================================================================

function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || (err.code === '23505' ? 409 : err.code === '23514' ? 400 : 500);
  let message = err.message || 'Đã xảy ra lỗi máy chủ nội bộ';

  // Chuyển đổi mã lỗi PostgreSQL sang thông báo thân thiện
  if (err.code === '23505') {
    message = 'Dữ liệu đã tồn tại trong hệ thống (trùng lặp)';
  } else if (err.code === '23503') {
    message = 'Dữ liệu tham chiếu không tồn tại hoặc đã bị khóa ràng buộc';
  } else if (err.code === '23514') {
    message = 'Dữ liệu không thỏa mãn ràng buộc nghiệp vụ (CHECK constraint: ' + (err.constraint || 'chk_done_completed') + ')';
  }

  // Structured Logging theo định dạng JSON cho Alloy & Loki
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: statusCode >= 500 ? 'error' : 'warn',
    status: statusCode,
    method: req.method,
    path: req.originalUrl || req.url,
    message: err.message,
    ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
  };

  // Bảo đảm KHÔNG ghi mật khẩu, JWT hoặc bí mật vào nhật ký
  if (req.body) {
    const sanitizedBody = { ...req.body };
    delete sanitizedBody.password;
    delete sanitizedBody.password_hash;
    delete sanitizedBody.old_password;
    delete sanitizedBody.new_password;
    delete sanitizedBody.token;
    logEntry.body = sanitizedBody;
  }

  console.log(JSON.stringify(logEntry));

  // Trả về cho client không chứa stack trace
  res.status(statusCode).json({
    error: message,
    code: err.code || undefined,
  });
}

module.exports = errorHandler;
