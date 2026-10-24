// ==============================================================================
// backend/src/controllers/commentController.js: Quản lý Bình luận Công việc
// ==============================================================================

const db = require('../config/db');

async function getComments(req, res, next) {
  try {
    const taskId = Number(req.params.id);

    // Kiểm tra quyền truy cập công việc trước khi lấy bình luận
    const taskCheck = await db.query('SELECT created_by, team_id FROM tasks WHERE id = $1', [taskId]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy công việc' });
    }

    const { rows } = await db.query(
      `SELECT c.*, u.full_name AS author_name, u.email AS author_email
       FROM task_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.task_id = $1
       ORDER BY c.created_at ASC`,
      [taskId]
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function createComment(req, res, next) {
  try {
    const taskId = Number(req.params.id);
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Nội dung bình luận không được để trống' });
    }

    // Kiểm tra công việc tồn tại
    const taskCheck = await db.query('SELECT created_by, team_id FROM tasks WHERE id = $1', [taskId]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy công việc' });
    }

    const { rows } = await db.query(
      `INSERT INTO task_comments (task_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [taskId, req.user.id, content.trim()]
    );

    const comment = rows[0];
    comment.author_name = req.user.full_name;
    comment.author_email = req.user.email;

    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getComments,
  createComment,
};
