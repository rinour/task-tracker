// ==============================================================================
// backend/src/controllers/statController.js: Báo cáo Thống kê & Số liệu
// ==============================================================================

const db = require('../config/db');

async function getSummary(req, res, next) {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const { team_id } = req.query;

    // Lấy toàn bộ công việc người dùng được phép truy cập
    const { rows } = await db.query(
      `SELECT t.*, tm.name AS team_name
       FROM tasks t
       LEFT JOIN teams tm ON t.team_id = tm.id
       WHERE ($1 = TRUE 
          OR t.created_by = $2 
          OR t.id IN (SELECT task_id FROM task_assignments WHERE user_id = $2)
          OR t.team_id IN (SELECT team_id FROM team_members WHERE user_id = $2)
       )
       AND ($3::bigint IS NULL OR t.team_id = $3::bigint)`,
      [isAdmin, userId, team_id ? Number(team_id) : null]
    );

    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const total = rows.length;
    let todo = 0;
    let in_progress = 0;
    let done = 0;
    let overdue = 0;
    let upcoming = 0;
    let high_priority = 0;
    let medium_priority = 0;
    let low_priority = 0;

    const overdueList = [];
    const upcomingList = [];

    rows.forEach(task => {
      if (task.status === 'todo') todo++;
      else if (task.status === 'in_progress') in_progress++;
      else if (task.status === 'done') done++;

      if (task.priority === 'high') high_priority++;
      else if (task.priority === 'medium') medium_priority++;
      else if (task.priority === 'low') low_priority++;

      if (task.status !== 'done' && task.due_at) {
        const dueDate = new Date(task.due_at);
        if (dueDate < now) {
          overdue++;
          overdueList.push(task);
        } else if (dueDate <= next7Days) {
          upcoming++;
          upcomingList.push(task);
        }
      }
    });

    // Sắp xếp các công việc sắp đến hạn và quá hạn
    upcomingList.sort((a, b) => new Date(a.due_at) - new Date(b.due_at));
    overdueList.sort((a, b) => new Date(a.due_at) - new Date(b.due_at));

    const completion_rate = total > 0 ? Math.round((done / total) * 100) : 0;

    res.json({
      total,
      todo,
      in_progress,
      done,
      overdue,
      upcoming,
      completion_rate,
      priority_breakdown: {
        high: high_priority,
        medium: medium_priority,
        low: low_priority,
      },
      upcoming_tasks: upcomingList.slice(0, 5),
      overdue_tasks: overdueList.slice(0, 5),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSummary,
};
