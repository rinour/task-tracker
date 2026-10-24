// ==============================================================================
// backend/src/routes/tasks.js: Tuyến đường quản lý công việc và bình luận
// ==============================================================================

const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const commentController = require('../controllers/commentController');
const { requireAuth } = require('../middleware/auth');

// Bảo vệ toàn bộ endpoint bằng middleware xác thực
router.use(requireAuth);

router.get('/', taskController.getTasks);
router.post('/', taskController.createTask);
router.get('/:id', taskController.getTaskById);
router.put('/:id', taskController.updateTask);
router.patch('/:id/status', taskController.updateTaskStatus);
router.delete('/:id', taskController.deleteTask);

// Bình luận công việc
router.get('/:id/comments', commentController.getComments);
router.post('/:id/comments', commentController.createComment);

module.exports = router;
