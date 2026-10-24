// ==============================================================================
// backend/src/routes/stats.js: Tuyến đường báo cáo thống kê
// ==============================================================================

const express = require('express');
const router = express.Router();
const statController = require('../controllers/statController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/summary', statController.getSummary);

module.exports = router;
