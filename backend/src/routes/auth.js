// ==============================================================================
// backend/src/routes/auth.js: Tuyến đường xác thực và tài khoản
// ==============================================================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/logout', requireAuth, authController.logout);
router.post('/register', authController.register);
router.get('/me', requireAuth, authController.me);
router.put('/profile', requireAuth, authController.updateProfile);
router.put('/change-password', requireAuth, authController.changePassword);

module.exports = router;
