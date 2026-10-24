// ==============================================================================
// backend/src/controllers/userController.js: Danh sách người dùng & Quản trị tài khoản
// ==============================================================================

const db = require('../config/db');

// Lấy danh sách thành viên hoạt động để gán việc
async function getUsers(req, res, next) {
  try {
    const { rows } = await db.query(
      'SELECT id, email, full_name, role FROM users WHERE is_active = TRUE ORDER BY full_name ASC'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// Dành cho Quản trị viên: Lấy danh sách toàn bộ người dùng
async function getAllUsersAdmin(req, res, next) {
  try {
    const { rows } = await db.query(
      'SELECT id, email, full_name, role, is_active, created_at FROM users ORDER BY id ASC'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// Dành cho Quản trị viên: Kích hoạt / Vô hiệu hóa tài khoản
async function toggleUserStatus(req, res, next) {
  try {
    const targetId = Number(req.params.id);
    const { is_active } = req.body;

    if (targetId === req.user.id) {
      return res.status(400).json({ error: 'Không thể tự vô hiệu hóa tài khoản của chính mình' });
    }

    const { rows } = await db.query(
      'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, email, full_name, role, is_active',
      [is_active, targetId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    res.json({ message: 'Cập nhật trạng thái người dùng thành công', user: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUsers,
  getAllUsersAdmin,
  toggleUserStatus,
};
