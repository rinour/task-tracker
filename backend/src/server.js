// ==============================================================================
// backend/src/server.js: Máy chủ REST API Task Tracker (Node.js & Express)
// ==============================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { metricsMiddleware, metricsHandler } = require('./middleware/metrics');
const errorHandler = require('./middleware/error');
const db = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const teamRoutes = require('./routes/teams');
const statRoutes = require('./routes/stats');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

// Cấu hình Middleware cơ bản
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Middleware ghi nhận metrics cho Prometheus
app.use(metricsMiddleware);

// Endpoint Healthcheck (dành cho Docker và kiểm tra tình trạng hệ thống)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'task-tracker-backend',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: db.isUsingFallback() ? 'in-memory-fallback' : 'postgresql-connected',
  });
});

// Endpoint Metrics (dành cho Prometheus thu thập chuỗi thời gian)
app.get('/metrics', metricsHandler);

// Đăng ký các Route nghiệp vụ
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/stats', statRoutes);
app.use('/api/users', userRoutes);

const path = require('path');

// Phục vụ tệp tĩnh Frontend khi chạy độc lập không qua Nginx
app.use(express.static(path.join(__dirname, '../../frontend')));

// Middleware xử lý lỗi tập trung
app.use(errorHandler);

// Khởi động lắng nghe cổng
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [Backend]: Task Tracker API đang lắng nghe tại cổng http://0.0.0.0:${PORT}`);
  });
}

module.exports = app;
