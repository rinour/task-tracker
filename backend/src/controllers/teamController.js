// ==============================================================================
// backend/src/controllers/teamController.js: Quản lý Nhóm và Thành viên
// ==============================================================================

const db = require('../config/db');

// Lấy danh sách nhóm người dùng tham gia
async function getTeams(req, res, next) {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const { rows } = await db.query(
      `SELECT t.*, 
              u.full_name AS owner_name,
              tm.member_role AS my_role,
              (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) AS member_count
       FROM teams t
       JOIN users u ON t.owner_id = u.id
       LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.user_id = $1
       WHERE $2 = TRUE OR tm.user_id IS NOT NULL
       ORDER BY t.created_at DESC`,
      [userId, isAdmin]
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// Lấy chi tiết nhóm và danh sách thành viên
async function getTeamById(req, res, next) {
  try {
    const teamId = Number(req.params.id);
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const teamRes = await db.query(
      `SELECT t.*, u.full_name AS owner_name, u.email AS owner_email
       FROM teams t
       JOIN users u ON t.owner_id = u.id
       WHERE t.id = $1`,
      [teamId]
    );

    if (teamRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhóm' });
    }

    const team = teamRes.rows[0];

    // Kiểm tra quyền: chỉ thành viên hoặc admin mới xem được
    const myRoleRes = await db.query(
      'SELECT member_role FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, userId]
    );

    if (!isAdmin && myRoleRes.rows.length === 0) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập nhóm này' });
    }

    team.my_role = myRoleRes.rows[0] ? myRoleRes.rows[0].member_role : (isAdmin ? 'admin' : null);

    // Lấy thành viên
    const membersRes = await db.query(
      `SELECT tm.user_id, tm.member_role, tm.joined_at, u.full_name, u.email
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = $1
       ORDER BY CASE tm.member_role WHEN 'owner' THEN 1 WHEN 'manager' THEN 2 ELSE 3 END, tm.joined_at ASC`,
      [teamId]
    );
    team.members = membersRes.rows;

    res.json(team);
  } catch (err) {
    next(err);
  }
}

// Tạo nhóm mới (Transaction: tạo nhóm và gán quyền owner)
async function createTeam(req, res, next) {
  const client = await db.getClient();
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Tên nhóm không được để trống' });
    }

    await client.query('BEGIN');

    const insertTeamSql = `
      INSERT INTO teams (name, description, owner_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const teamResult = await client.query(insertTeamSql, [
      name.trim(),
      description || '',
      req.user.id,
    ]);

    const newTeam = teamResult.rows[0];

    // Gán người tạo làm owner trong bảng team_members
    await client.query(
      'INSERT INTO team_members (team_id, user_id, member_role) VALUES ($1, $2, $3)',
      [newTeam.id, req.user.id, 'owner']
    );

    await client.query('COMMIT');
    newTeam.my_role = 'owner';
    newTeam.member_count = 1;
    res.status(201).json(newTeam);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client.release) client.release();
  }
}

// Cập nhật thông tin nhóm
async function updateTeam(req, res, next) {
  try {
    const teamId = Number(req.params.id);
    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Tên nhóm không được để trống' });
    }

    // Kiểm tra quyền (chỉ owner hoặc manager)
    const roleCheck = await db.query(
      'SELECT member_role FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, req.user.id]
    );
    const isAuthorized = req.user.role === 'admin' || 
      (roleCheck.rows.length > 0 && ['owner', 'manager'].includes(roleCheck.rows[0].member_role));

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Chỉ chủ nhóm hoặc quản lý mới có quyền sửa nhóm' });
    }

    const { rows } = await db.query(
      'UPDATE teams SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name.trim(), description || '', teamId]
    );

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// Thêm thành viên vào nhóm
async function addMember(req, res, next) {
  try {
    const teamId = Number(req.params.id);
    const { user_id, member_role } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'Vui lòng chọn thành viên' });
    }

    const role = member_role || 'member';
    if (!['manager', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Vai trò chỉ có thể là manager hoặc member' });
    }

    // Kiểm tra quyền thêm (owner hoặc manager)
    const perm = await db.query(
      'SELECT member_role FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, req.user.id]
    );
    const canAdd = req.user.role === 'admin' ||
      (perm.rows.length > 0 && ['owner', 'manager'].includes(perm.rows[0].member_role));

    if (!canAdd) {
      return res.status(403).json({ error: 'Chỉ chủ nhóm hoặc quản lý mới có quyền thêm thành viên' });
    }

    // Kiểm tra thành viên đã có trong nhóm chưa
    const checkMem = await db.query(
      'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, Number(user_id)]
    );
    if (checkMem.rows.length > 0) {
      return res.status(409).json({ error: 'Người dùng này đã là thành viên của nhóm' });
    }

    await db.query(
      'INSERT INTO team_members (team_id, user_id, member_role) VALUES ($1, $2, $3)',
      [teamId, Number(user_id), role]
    );

    res.status(201).json({ message: 'Đã thêm thành viên thành công' });
  } catch (err) {
    next(err);
  }
}

// Cập nhật vai trò thành viên
async function updateMemberRole(req, res, next) {
  try {
    const teamId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);
    const { member_role } = req.body;

    if (!['owner', 'manager', 'member'].includes(member_role)) {
      return res.status(400).json({ error: 'Vai trò không hợp lệ' });
    }

    // Chỉ owner của nhóm hoặc admin mới có quyền đổi vai trò
    const ownerCheck = await db.query('SELECT owner_id FROM teams WHERE id = $1', [teamId]);
    if (ownerCheck.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy nhóm' });

    if (req.user.role !== 'admin' && ownerCheck.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Chỉ chủ nhóm mới có quyền thay đổi vai trò' });
    }

    await db.query(
      'UPDATE team_members SET member_role = $1 WHERE team_id = $2 AND user_id = $3',
      [member_role, teamId, targetUserId]
    );

    res.json({ message: 'Cập nhật vai trò thành công' });
  } catch (err) {
    next(err);
  }
}

// Xóa thành viên khỏi nhóm
async function removeMember(req, res, next) {
  try {
    const teamId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);

    // Không được xóa owner
    const teamCheck = await db.query('SELECT owner_id FROM teams WHERE id = $1', [teamId]);
    if (teamCheck.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy nhóm' });
    if (teamCheck.rows[0].owner_id === targetUserId) {
      return res.status(400).json({ error: 'Không thể xóa chủ nhóm ra khỏi nhóm' });
    }

    // Kiểm tra quyền (chủ nhóm, quản lý, hoặc tự rời nhóm)
    const isSelf = (req.user.id === targetUserId);
    const roleCheck = await db.query(
      'SELECT member_role FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, req.user.id]
    );
    const canRemove = req.user.role === 'admin' || isSelf ||
      (roleCheck.rows.length > 0 && ['owner', 'manager'].includes(roleCheck.rows[0].member_role));

    if (!canRemove) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa thành viên này' });
    }

    await db.query('DELETE FROM team_members WHERE team_id = $1 AND user_id = $2', [teamId, targetUserId]);
    res.json({ message: 'Đã xóa thành viên khỏi nhóm' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  addMember,
  updateMemberRole,
  removeMember,
};
