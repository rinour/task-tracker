// ==============================================================================
// backend/src/controllers/taskController.js: Quản lý Công việc & Nghiệp vụ
// ==============================================================================

const db = require('../config/db');

// Lấy danh sách công việc có lọc, tìm kiếm và phân quyền
async function getTasks(req, res, next) {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const { status, assignee, team_id, due_from, due_to, q, overdue, personal_only, sort_by, order } = req.query;

    // Lấy danh sách nhiệm vụ từ database hoặc fallback
    const { rows } = await db.query(
      `SELECT t.*, 
              tm.name AS team_name,
              u.full_name AS creator_name,
              COALESCE(
                json_agg(
                  json_build_object('id', a_u.id, 'full_name', a_u.full_name, 'email', a_u.email)
                ) FILTER (WHERE a_u.id IS NOT NULL), '[]'
              ) AS assignees
       FROM tasks t
       LEFT JOIN teams tm ON t.team_id = tm.id
       LEFT JOIN users u ON t.created_by = u.id
       LEFT JOIN task_assignments ta ON t.id = ta.task_id
       LEFT JOIN users a_u ON ta.user_id = a_u.id
       WHERE ($1 = TRUE 
          OR t.created_by = $2 
          OR t.id IN (SELECT task_id FROM task_assignments WHERE user_id = $2)
          OR t.team_id IN (SELECT team_id FROM team_members WHERE user_id = $2)
       )
       GROUP BY t.id, tm.name, u.full_name
       ORDER BY t.created_at DESC`,
      [isAdmin, userId]
    );

    let filtered = rows;

    // Bộ lọc theo trạng thái
    if (status) {
      filtered = filtered.filter(t => t.status === status);
    }

    // Bộ lọc công việc cá nhân
    if (personal_only === 'true' || personal_only === true) {
      filtered = filtered.filter(t => t.team_id === null || t.team_id === undefined);
    }

    // Bộ lọc theo nhóm
    if (team_id) {
      filtered = filtered.filter(t => String(t.team_id) === String(team_id));
    }

    // Bộ lọc theo người được giao
    if (assignee) {
      filtered = filtered.filter(t => {
        if (!t.assignees) return false;
        return t.assignees.some(a => String(a.id) === String(assignee));
      });
    }

    // Bộ lọc quá hạn: due_at < now() và status <> 'done'
    if (overdue === 'true' || overdue === true) {
      const now = new Date();
      filtered = filtered.filter(t => t.status !== 'done' && t.due_at && new Date(t.due_at) < now);
    }

    // Bộ lọc khoảng thời hạn
    if (due_from) {
      const from = new Date(due_from);
      filtered = filtered.filter(t => t.due_at && new Date(t.due_at) >= from);
    }
    if (due_to) {
      const to = new Date(due_to);
      filtered = filtered.filter(t => t.due_at && new Date(t.due_at) <= to);
    }

    // Tìm kiếm từ khóa theo tiêu đề
    if (q && q.trim().length > 0) {
      const keyword = q.trim().toLowerCase();
      filtered = filtered.filter(t => t.title.toLowerCase().includes(keyword) || (t.description && t.description.toLowerCase().includes(keyword)));
    }

    // Sắp xếp
    const sortField = ['due_at', 'priority', 'created_at', 'progress'].includes(sort_by) ? sort_by : 'created_at';
    const isAsc = (order || '').toLowerCase() === 'asc';

    filtered.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'priority') {
        const pOrder = { high: 3, medium: 2, low: 1 };
        valA = pOrder[valA] || 0;
        valB = pOrder[valB] || 0;
      } else if (valA instanceof Date || typeof valA === 'string') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      }

      if (valA < valB) return isAsc ? -1 : 1;
      if (valA > valB) return isAsc ? 1 : -1;
      return 0;
    });

    res.json(filtered);
  } catch (err) {
    next(err);
  }
}

// Lấy chi tiết công việc
async function getTaskById(req, res, next) {
  try {
    const taskId = Number(req.params.id);
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const { rows } = await db.query(
      `SELECT t.*, 
              tm.name AS team_name,
              u.full_name AS creator_name
       FROM tasks t
       LEFT JOIN teams tm ON t.team_id = tm.id
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = $1`,
      [taskId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy công việc' });
    }

    const task = rows[0];

    // Kiểm tra quyền truy cập (Người tạo, người được giao, thành viên nhóm, hoặc Admin)
    if (!isAdmin && task.created_by !== userId) {
      // Kiểm tra có được gán không
      const checkAssign = await db.query('SELECT 1 FROM task_assignments WHERE task_id = $1 AND user_id = $2', [taskId, userId]);
      let hasAccess = checkAssign.rows.length > 0;

      if (!hasAccess && task.team_id) {
        const checkTeam = await db.query('SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2', [task.team_id, userId]);
        hasAccess = checkTeam.rows.length > 0;
      }

      if (!hasAccess) {
        return res.status(404).json({ error: 'Không tìm thấy công việc' }); // Trả về 404 để không lộ IDOR
      }
    }

    // Lấy danh sách người phụ trách
    const assigneesRes = await db.query(
      `SELECT u.id, u.email, u.full_name
       FROM task_assignments ta
       JOIN users u ON ta.user_id = u.id
       WHERE ta.task_id = $1`,
      [taskId]
    );
    task.assignees = assigneesRes.rows;

    // Lấy danh sách bình luận
    const commentsRes = await db.query(
      `SELECT c.*, u.full_name AS author_name, u.email AS author_email
       FROM task_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.task_id = $1
       ORDER BY c.created_at ASC`,
      [taskId]
    );
    task.comments = commentsRes.rows;

    res.json(task);
  } catch (err) {
    next(err);
  }
}

// Tạo công việc mới (Giao dịch Transaction bảo đảm tính toàn vẹn)
async function createTask(req, res, next) {
  const client = await db.getClient();
  try {
    const { title, description, status, priority, progress, due_at, team_id, assignees } = req.body;

    // Kiểm tra tính hợp lệ dữ liệu
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Tiêu đề công việc không được để trống' });
    }

    const taskStatus = status || 'todo';
    if (!['todo', 'in_progress', 'done'].includes(taskStatus)) {
      return res.status(400).json({ error: 'Trạng thái công việc không hợp lệ' });
    }

    const taskPriority = priority || 'medium';
    if (!['low', 'medium', 'high'].includes(taskPriority)) {
      return res.status(400).json({ error: 'Mức độ ưu tiên không hợp lệ' });
    }

    let taskProgress = progress !== undefined ? Number(progress) : 0;
    if (isNaN(taskProgress) || taskProgress < 0 || taskProgress > 100) {
      return res.status(400).json({ error: 'Tiến độ hoàn thành phải từ 0 đến 100' });
    }

    let dueTimestamp = null;
    if (due_at) {
      const parsedDate = new Date(due_at);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Thời hạn hoàn thành không hợp lệ' });
      }
      dueTimestamp = parsedDate;
    }

    // Quy tắc ràng buộc chk_done_completed: done <=> completed_at IS NOT NULL
    let completedTimestamp = null;
    if (taskStatus === 'done') {
      completedTimestamp = new Date();
      taskProgress = 100;
    }

    // Nếu là công việc nhóm, người tạo phải thuộc nhóm đó
    const teamIdVal = team_id ? Number(team_id) : null;
    if (teamIdVal) {
      const teamCheck = await db.query(
        'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
        [teamIdVal, req.user.id]
      );
      if (teamCheck.rows.length === 0 && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Bạn không phải thành viên của nhóm được chỉ định' });
      }
    }

    // Bắt đầu Transaction
    await client.query('BEGIN');

    const insertTaskSql = `
      INSERT INTO tasks (title, description, status, priority, progress, due_at, completed_at, created_by, team_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const taskResult = await client.query(insertTaskSql, [
      title.trim(),
      description || '',
      taskStatus,
      taskPriority,
      taskProgress,
      dueTimestamp,
      completedTimestamp,
      req.user.id,
      teamIdVal,
    ]);

    const createdTask = taskResult.rows[0];

    // Gán người phụ trách nếu có
    if (Array.isArray(assignees) && assignees.length > 0) {
      for (const uid of assignees) {
        await client.query(
          'INSERT INTO task_assignments (task_id, user_id, assigned_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [createdTask.id, Number(uid), req.user.id]
        );
      }
    }

    await client.query('COMMIT');

    createdTask.assignees = assignees || [];
    res.status(201).json(createdTask);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client.release) client.release();
  }
}

// Cập nhật công việc (Toàn diện)
async function updateTask(req, res, next) {
  const client = await db.getClient();
  try {
    const taskId = Number(req.params.id);
    const { title, description, status, priority, progress, due_at, team_id, assignees } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Tiêu đề công việc không được để trống' });
    }

    const taskStatus = status || 'todo';
    if (!['todo', 'in_progress', 'done'].includes(taskStatus)) {
      return res.status(400).json({ error: 'Trạng thái công việc không hợp lệ' });
    }

    const taskPriority = priority || 'medium';
    if (!['low', 'medium', 'high'].includes(taskPriority)) {
      return res.status(400).json({ error: 'Mức độ ưu tiên không hợp lệ' });
    }

    let taskProgress = progress !== undefined ? Number(progress) : 0;
    if (isNaN(taskProgress) || taskProgress < 0 || taskProgress > 100) {
      return res.status(400).json({ error: 'Tiến độ hoàn thành phải từ 0 đến 100' });
    }

    let dueTimestamp = null;
    if (due_at) {
      const parsedDate = new Date(due_at);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Thời hạn hoàn thành không hợp lệ' });
      }
      dueTimestamp = parsedDate;
    }

    let completedTimestamp = null;
    if (taskStatus === 'done') {
      completedTimestamp = new Date();
      taskProgress = 100;
    }

    // Kiểm tra quyền chỉnh sửa
    const existCheck = await db.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (existCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy công việc' });
    }
    const oldTask = existCheck.rows[0];

    if (req.user.role !== 'admin' && oldTask.created_by !== req.user.id) {
      const isAssigned = await db.query('SELECT 1 FROM task_assignments WHERE task_id = $1 AND user_id = $2', [taskId, req.user.id]);
      let canEdit = isAssigned.rows.length > 0;
      if (!canEdit && oldTask.team_id) {
        const teamRole = await db.query('SELECT member_role FROM team_members WHERE team_id = $1 AND user_id = $2', [oldTask.team_id, req.user.id]);
        canEdit = teamRole.rows.length > 0 && ['owner', 'manager'].includes(teamRole.rows[0].member_role);
      }
      if (!canEdit) {
        return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa công việc này' });
      }
    }

    await client.query('BEGIN');

    const updateSql = `
      UPDATE tasks
      SET title = $1,
          description = $2,
          status = $3,
          priority = $4,
          progress = $5,
          due_at = $6,
          completed_at = $7,
          team_id = $8,
          updated_at = now()
      WHERE id = $9
      RETURNING *
    `;

    const { rows } = await client.query(updateSql, [
      title.trim(),
      description || '',
      taskStatus,
      taskPriority,
      taskProgress,
      dueTimestamp,
      completedTimestamp,
      team_id ? Number(team_id) : null,
      taskId,
    ]);

    // Cập nhật phân công người phụ trách
    if (Array.isArray(assignees)) {
      await client.query('DELETE FROM task_assignments WHERE task_id = $1', [taskId]);
      for (const uid of assignees) {
        await client.query(
          'INSERT INTO task_assignments (task_id, user_id, assigned_by) VALUES ($1, $2, $3)',
          [taskId, Number(uid), req.user.id]
        );
      }
    }

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client.release) client.release();
  }
}

// Cập nhật nhanh trạng thái: PATCH /api/tasks/:id/status (Đúng theo Đoạn mã 1.4 trong Báo cáo)
async function updateTaskStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!['todo', 'in_progress', 'done'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
    }

    const { rows } = await db.query(
      `UPDATE tasks t
          SET status       = $1::text,
              completed_at = CASE WHEN $1::text = 'done' THEN now() ELSE NULL END,
              progress     = CASE WHEN $1::text = 'done' THEN 100
                                  ELSE t.progress END,
              updated_at   = now()
        WHERE t.id = $2
          AND ($4 = TRUE
               OR t.created_by = $3
               OR EXISTS (SELECT 1 FROM task_assignments a
                           WHERE a.task_id = t.id AND a.user_id = $3)
               OR EXISTS (SELECT 1 FROM team_members tm
                           WHERE tm.team_id = t.team_id AND tm.user_id = $3))
      RETURNING t.*`,
      [status, req.params.id, req.user.id, req.user.role === 'admin']
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy công việc' });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// Xóa công việc
async function deleteTask(req, res, next) {
  try {
    const taskId = Number(req.params.id);
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const check = await db.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy công việc' });
    }

    const task = check.rows[0];
    if (!isAdmin && task.created_by !== userId) {
      // Nếu là công việc nhóm, chỉ owner/manager nhóm mới có quyền xóa
      let canDelete = false;
      if (task.team_id) {
        const teamRole = await db.query(
          'SELECT member_role FROM team_members WHERE team_id = $1 AND user_id = $2',
          [task.team_id, userId]
        );
        canDelete = teamRole.rows.length > 0 && ['owner', 'manager'].includes(teamRole.rows[0].member_role);
      }
      if (!canDelete) {
        return res.status(403).json({ error: 'Bạn không có quyền xóa công việc này' });
      }
    }

    await db.query('DELETE FROM tasks WHERE id = $1', [taskId]);
    res.json({ message: 'Đã xóa công việc thành công' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
};
