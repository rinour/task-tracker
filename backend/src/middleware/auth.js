// ==============================================================================
// backend/src/middleware/auth.js: Middleware xác thực và phân quyền JWT
// ==============================================================================

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'TaskTrackerSecretKey2026SuperSecure!';

function extractToken(req) {
  // 1. Kiểm tra cookie HttpOnly
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  // 2. Kiểm tra header Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Yêu cầu đăng nhập để truy cập tài nguyên này' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Phiên làm việc không hợp lệ hoặc đã hết hạn' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Bạn không có quyền quản trị viên' });
    }
  });
}

function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      // Bỏ qua lỗi nếu token không hợp lệ ở optional
    }
  }
  next();
}

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth,
  generateToken,
  JWT_SECRET,
};
