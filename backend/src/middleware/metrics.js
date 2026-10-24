// ==============================================================================
// backend/src/middleware/metrics.js: Tích hợp Prometheus metrics qua prom-client
// ==============================================================================

const client = require('prom-client');

// Khởi tạo thu thập metrics mặc định của tiến trình Node.js
client.collectDefaultMetrics({ prefix: 'node_' });

// Đo thời gian xử lý yêu cầu HTTP
const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Thời gian xử lý yêu cầu HTTP tính bằng giây',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

// Đo tổng số lượng yêu cầu HTTP
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Tổng số lượng yêu cầu HTTP đã xử lý',
  labelNames: ['method', 'route', 'status_code'],
});

function metricsMiddleware(req, res, next) {
  const end = httpRequestDurationSeconds.startTimer();
  res.on('finish', () => {
    const route = req.route ? req.route.path : req.baseUrl + (req.path || '');
    const labels = {
      method: req.method,
      route: route || req.path,
      status_code: res.statusCode,
    };
    end(labels);
    httpRequestsTotal.inc(labels);
  });
  next();
}

async function metricsHandler(req, res) {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
}

module.exports = {
  metricsMiddleware,
  metricsHandler,
  client,
};
