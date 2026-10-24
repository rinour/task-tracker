// ==============================================================================
// backend/src/controllers/authController.js: Nghiệp vụ Xác thực & Người dùng
// ==============================================================================

const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { generateToken } = require('../middleware/auth');

// Đăng nhập
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ email và mật khẩu' });
    }

    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Tài khoản của bạn đã bị vô hiệu hóa' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });
    }

    const token = generateToken(user);

    // Lưu JWT trong HttpOnly cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 giờ
    });

    res.json({
      message: 'Đăng nhập thành công',
      token, // Trả kèm token để hỗ trợ cả client dùng Bearer header
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Đăng xuất
async function logout(req, res, next) {
  try {
    res.clearCookie('token');
    res.json({ message: 'Đăng xuất thành công' });
  } catch (err) {
    next(err);
  }
}

// Lấy thông tin tài khoản hiện tại
async function me(req, res, next) {
  try {
    const { rows } = await db.query(
      'SELECT id, email, full_name, role, is_active, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin người dùng' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// Cập nhật hồ sơ cá nhân
async function updateProfile(req, res, next) {
  try {
    const { full_name } = req.body;
    if (!full_name || full_name.trim().length === 0) {
      return res.status(400).json({ error: 'Họ và tên không được để trống' });
    }

    const { rows } = await db.query(
      'UPDATE users SET full_name = $1 WHERE id = $2 RETURNING id, email, full_name, role',
      [full_name.trim(), req.user.id]
    );
    res.json({ message: 'Cập nhật thông tin thành công', user: rows[0] });
  } catch (err) {
    next(err);
  }
}

// Đổi mật khẩu
async function changePassword(req, res, next) {
  try {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'Vui lòng cung cấp mật khẩu cũ và mật khẩu mới' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có tối thiểu 6 ký tự' });
    }

    const { rows } = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Người dùng không tồn tại' });
    }

    const isMatch = await bcrypt.compare(old_password, rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Mật khẩu cũ không chính xác' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    next(err);
  }
}

// Đăng ký tài khoản mới
async function register(req, res, next) {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ email, mật khẩu và họ tên' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có tối thiểu 6 ký tự' });
    }

    const check = await db.query('SELECT id FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (check.rows.length > 0) {
      return res.status(409).json({ error: 'Email này đã được sử dụng' });
    }

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role',
      [email.trim().toLowerCase(), hash, full_name.trim(), 'member']
    );

    const user = rows[0];
    const token = generateToken(user);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: 'Đăng ký tài khoản thành công',
      token,
      user,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  logout,
  me,
  updateProfile,
  changePassword,
  register,
};
