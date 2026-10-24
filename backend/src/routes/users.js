// ==============================================================================
// backend/src/routes/users.js: Tuyến đường người dùng và quản trị viên
// ==============================================================================

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', userController.getUsers);
router.get('/admin/all', requireAdmin, userController.getAllUsersAdmin);
router.patch('/admin/:id/status', requireAdmin, userController.toggleUserStatus);

module.exports = router;
