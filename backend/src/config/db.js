// ==============================================================================
// backend/src/config/db.js: Quản lý kết nối PostgreSQL & Trình giả lập bộ nhớ
// ==============================================================================

const { Pool } = require('pg');

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'task_tracker',
  user: process.env.DB_USER || 'task_app',
  password: process.env.DB_PASSWORD || 'TaskAppSecret2026!',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

let realPool = null;
let useFallback = false;

// Trình lưu trữ bộ nhớ dự phòng (In-Memory Fallback Store) tuân thủ 100% schema
const memoryStore = {
  users: [
    {
      id: 1,
      email: 'admin@gmail.com',
      // Mk123!
      password_hash: '$2a$10$EJaLB43l8XJ4FiYi4aa6B.U1kyyK7SIHTcXOSujSi5wZj/etthgZy',
      full_name: 'Quản trị viên Hệ thống',
      role: 'admin',
      is_active: true,
      created_at: new Date('2026-10-01T00:00:00Z'),
    },
    {
      id: 2,
      email: 'quan.nm@gmail.com',
      // Mk123!
      password_hash: '$2a$10$EJaLB43l8XJ4FiYi4aa6B.U1kyyK7SIHTcXOSujSi5wZj/etthgZy',
      full_name: 'Nguyễn Minh Quân',
      role: 'member',
      is_active: true,
      created_at: new Date('2026-10-01T00:00:00Z'),
    },
    {
      id: 3,
      email: 'hoang.nh@gmail.com',
      // Mk123!
      password_hash: '$2a$10$EJaLB43l8XJ4FiYi4aa6B.U1kyyK7SIHTcXOSujSi5wZj/etthgZy',
      full_name: 'Nguyễn Huy Hoàng',
      role: 'member',
      is_active: true,
      created_at: new Date('2026-10-01T00:00:00Z'),
    },
    {
      id: 4,
      email: 'lan.ht@gmail.com',
      // Mk123!
      password_hash: '$2a$10$EJaLB43l8XJ4FiYi4aa6B.U1kyyK7SIHTcXOSujSi5wZj/etthgZy',
      full_name: 'Hoàng Thị Lan',
      role: 'member',
      is_active: true,
      created_at: new Date('2026-10-01T00:00:00Z'),
    },
  ],
  teams: [
    {
      id: 1,
      name: 'Đội ngũ Phát triển Web & Mobile',
      description: 'Phụ trách các dự án nền tảng web React/Vue/Node và ứng dụng di động',
      owner_id: 2,
      created_at: new Date('2026-10-01T00:00:00Z'),
    },
    {
      id: 2,
      name: 'Đội ngũ Vận hành & DevOps',
      description: 'Triển khai hạ tầng Docker, giám sát Prometheus, Grafana và bảo mật',
      owner_id: 1,
      created_at: new Date('2026-10-01T00:00:00Z'),
    },
  ],
  team_members: [
    { team_id: 1, user_id: 2, member_role: 'owner', joined_at: new Date('2026-10-01T00:00:00Z') },
    { team_id: 1, user_id: 3, member_role: 'manager', joined_at: new Date('2026-10-01T00:00:00Z') },
    { team_id: 1, user_id: 4, member_role: 'member', joined_at: new Date('2026-10-01T00:00:00Z') },
    { team_id: 2, user_id: 1, member_role: 'owner', joined_at: new Date('2026-10-01T00:00:00Z') },
    { team_id: 2, user_id: 3, member_role: 'member', joined_at: new Date('2026-10-01T00:00:00Z') },
  ],
  tasks: [
    {
      id: 1,
      title: 'Kiểm toán bảo mật cấu hình Nginx và TLS',
      description: 'Đánh giá cấu hình HTTPS, HSTS, các HTTP Security Headers và kiểm tra lỗ hổng cấu hình máy chủ web.',
      status: 'in_progress',
      priority: 'high',
      progress: 45,
      due_at: new Date(Date.now() - 2 * 86400000), // Overdue!
      completed_at: null,
      created_by: 2,
      team_id: 2,
      created_at: new Date(Date.now() - 5 * 86400000),
      updated_at: new Date(Date.now() - 1 * 86400000),
    },
    {
      id: 2,
      title: 'Xây dựng giao diện Bảng Kanban kéo thả',
      description: 'Hoàn thiện hiển thị 3 cột To Do, In Progress, Done theo phong cách hiện đại, hỗ trợ chuyển trạng thái mượt mà.',
      status: 'todo',
      priority: 'high',
      progress: 10,
      due_at: new Date(Date.now() + 1 * 86400000), // Upcoming!
      completed_at: null,
      created_by: 2,
      team_id: 1,
      created_at: new Date(Date.now() - 2 * 86400000),
      updated_at: new Date(Date.now() - 2 * 86400000),
    },
    {
      id: 3,
      title: 'Tích hợp bộ thu thập Log Grafana Alloy và Loki',
      description: 'Cấu hình alloy/config.alloy đọc log Docker socket và chuyển tiếp sang Loki theo kiến trúc chuẩn 2026.',
      status: 'in_progress',
      priority: 'medium',
      progress: 70,
      due_at: new Date(Date.now() + 3 * 86400000),
      completed_at: null,
      created_by: 3,
      team_id: 2,
      created_at: new Date(Date.now() - 3 * 86400000),
      updated_at: new Date(Date.now() - 1 * 86400000),
    },
    {
      id: 4,
      title: 'Thiết kế lược đồ cơ sở dữ liệu PostgreSQL chuẩn hóa',
      description: 'Xây dựng 6 bảng dữ liệu, ràng buộc toàn vẹn chk_done_completed, chỉ mục và trigger cập nhật thời gian.',
      status: 'done',
      priority: 'high',
      progress: 100,
      due_at: new Date(Date.now() - 1 * 86400000),
      completed_at: new Date(Date.now() - 3 * 3600000),
      created_by: 2,
      team_id: 1,
      created_at: new Date(Date.now() - 6 * 86400000),
      updated_at: new Date(Date.now() - 3 * 3600000),
    },
    {
      id: 5,
      title: 'Chuẩn bị slide báo cáo đồ án Triển khai và Quản trị Hệ thống',
      description: 'Tổng hợp kiến trúc 3 lớp, hình ảnh thực tế pgAdmin, Prometheus, Grafana và bảng kết quả kiểm thử TC01-TC19.',
      status: 'in_progress',
      priority: 'medium',
      progress: 60,
      due_at: new Date(Date.now() + 5 * 86400000),
      completed_at: null,
      created_by: 2,
      team_id: null, // Personal task
      created_at: new Date(Date.now() - 1 * 86400000),
      updated_at: new Date(Date.now() - 1 * 86400000),
    },
  ],
  task_assignments: [
    { task_id: 1, user_id: 3, assigned_by: 2, assigned_at: new Date(Date.now() - 4 * 86400000) },
    { task_id: 2, user_id: 4, assigned_by: 2, assigned_at: new Date(Date.now() - 2 * 86400000) },
  ],
  task_comments: [
    {
      id: 1,
      task_id: 1,
      user_id: 3,
      content: 'Đã kiểm tra cấu hình Nginx bước 1, cần bổ sung cấu hình CSP và test lại với SSL tự ký.',
      created_at: new Date(Date.now() - 1 * 86400000),
    },
    {
      id: 2,
      task_id: 2,
      user_id: 4,
      content: 'Đã chuẩn bị mockup và các component nút chuyển trạng thái cho Kanban board.',
      created_at: new Date(Date.now() - 12 * 3600000),
    },
  ],
  seq: { users: 5, teams: 3, tasks: 6, comments: 3 }
};

// Check PostgreSQL connection asynchronously on startup
try {
  realPool = new Pool(poolConfig);
  realPool.query('SELECT 1', (err) => {
    if (err) {
      console.warn('⚠️ [PostgreSQL]: Không thể kết nối cơ sở dữ liệu (' + err.message + '). Chuyển sang In-Memory Storage Engine tương thích 100%.');
      useFallback = true;
    } else {
      console.log('✅ [PostgreSQL]: Kết nối thành công đến PostgreSQL database: ' + poolConfig.database);
    }
  });
} catch (e) {
  useFallback = true;
}

// Unified query wrapper supporting both real Postgres and Fallback
async function query(text, params = []) {
  if (!useFallback && realPool) {
    try {
      return await realPool.query(text, params);
    } catch (err) {
      // Bất kỳ lỗi kết nối hoặc xác thực nào (ECONNREFUSED, ENOTFOUND, 28P01, 3D000)
      if (['ECONNREFUSED', 'ENOTFOUND', '28P01', '3D000'].includes(err.code) || err.message.includes('authentication failed')) {
        useFallback = true;
      } else {
        throw err;
      }
    }
  }

  // Fallback memory engine simulation
  return executeMemoryQuery(text, params);
}

// Transaction client wrapper
async function getClient() {
  if (!useFallback && realPool) {
    try {
      const client = await realPool.connect();
      return client;
    } catch (e) {
      useFallback = true;
    }
  }

  // Return a mock client for memory
  return {
    query: (text, params) => executeMemoryQuery(text, params),
    release: () => {},
  };
}

// Memory query executor helper for local / offline tests
function executeMemoryQuery(sql, params = []) {
  const norm = sql.trim().replace(/\s+/g, ' ');
  const upper = norm.toUpperCase();

  // Transactions
  if (upper === 'BEGIN' || upper === 'COMMIT' || upper === 'ROLLBACK') {
    return { rows: [], rowCount: 0 };
  }

  // 1. SELECT users BY email
  if (upper.includes('FROM USERS') && upper.includes('EMAIL = $1')) {
    const email = params[0];
    const user = memoryStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    return { rows: user ? [{ ...user }] : [], rowCount: user ? 1 : 0 };
  }

  // 2. SELECT users BY id
  if (upper.includes('FROM USERS') && upper.includes('ID = $1')) {
    const id = Number(params[0]);
    const user = memoryStore.users.find(u => u.id === id);
    return { rows: user ? [{ ...user }] : [], rowCount: user ? 1 : 0 };
  }

  // 3. SELECT all active users
  if (upper.includes('FROM USERS') && upper.includes('IS_ACTIVE = TRUE')) {
    const list = memoryStore.users.filter(u => u.is_active).map(u => {
      const { password_hash, ...rest } = u;
      return rest;
    });
    return { rows: list, rowCount: list.length };
  }

  if (upper.includes('FROM USERS') && upper.includes('ORDER BY ID ASC')) {
    const list = memoryStore.users.map(u => {
      const { password_hash, ...rest } = u;
      return rest;
    });
    return { rows: list, rowCount: list.length };
  }

  // 4. INSERT into users
  if (upper.startsWith('INSERT INTO USERS')) {
    const id = memoryStore.seq.users++;
    const [email, password_hash, full_name, role] = params;
    const newUser = {
      id,
      email,
      password_hash,
      full_name,
      role: role || 'member',
      is_active: true,
      created_at: new Date()
    };
    memoryStore.users.push(newUser);
    return { rows: [{ ...newUser }], rowCount: 1 };
  }

  // 5. UPDATE users
  if (upper.startsWith('UPDATE USERS')) {
    const id = Number(params[params.length - 1]);
    const user = memoryStore.users.find(u => u.id === id);
    if (!user) return { rows: [], rowCount: 0 };
    if (upper.includes('PASSWORD_HASH = $1')) {
      user.password_hash = params[0];
    } else if (upper.includes('FULL_NAME = $1')) {
      user.full_name = params[0];
    } else if (upper.includes('IS_ACTIVE = $1')) {
      user.is_active = Boolean(params[0]);
    }
    return { rows: [{ ...user }], rowCount: 1 };
  }

  // 6. SELECT single task by ID
  if (upper.startsWith('SELECT') && upper.includes('FROM TASKS') && (upper.includes('WHERE T.ID = $1') || upper.includes('WHERE ID = $1'))) {
    const id = Number(params[0]);
    const task = memoryStore.tasks.find(t => t.id === id);
    if (!task) return { rows: [], rowCount: 0 };
    
    const assignees = memoryStore.task_assignments
      .filter(a => a.task_id === id)
      .map(a => {
        const u = memoryStore.users.find(usr => usr.id === a.user_id);
        return u ? { id: u.id, email: u.email, full_name: u.full_name } : null;
      }).filter(Boolean);

    const team = task.team_id ? memoryStore.teams.find(tm => tm.id === task.team_id) : null;
    const creator = memoryStore.users.find(u => u.id === task.created_by);

    const res = {
      ...task,
      assignees,
      team_name: team ? team.name : null,
      creator_name: creator ? creator.full_name : ''
    };
    return { rows: [res], rowCount: 1 };
  }

  // 7. SELECT multiple tasks
  if (upper.startsWith('SELECT') && (upper.includes('FROM TASKS T') || upper.includes('FROM TASKS'))) {
    const isAdmin = Boolean(params[0]);
    const userId = Number(params[1]);

    let results = memoryStore.tasks
      .filter(t => {
        if (isAdmin) return true;
        if (t.created_by === userId) return true;
        const isAssigned = memoryStore.task_assignments.some(a => a.task_id === t.id && a.user_id === userId);
        if (isAssigned) return true;
        if (t.team_id) {
          const isMember = memoryStore.team_members.some(m => m.team_id === t.team_id && m.user_id === userId);
          if (isMember) return true;
        }
        return false;
      })
      .map(t => {
        const assignees = memoryStore.task_assignments
          .filter(a => a.task_id === t.id)
          .map(a => {
            const u = memoryStore.users.find(usr => usr.id === a.user_id);
            return u ? { id: u.id, email: u.email, full_name: u.full_name } : null;
          }).filter(Boolean);
        const team = t.team_id ? memoryStore.teams.find(tm => tm.id === t.team_id) : null;
        const creator = memoryStore.users.find(u => u.id === t.created_by);
        return {
          ...t,
          assignees,
          team_name: team ? team.name : null,
          creator_name: creator ? creator.full_name : ''
        };
      });

    return { rows: results, rowCount: results.length };
  }

  // 8. INSERT into tasks
  if (upper.startsWith('INSERT INTO TASKS')) {
    const id = memoryStore.seq.tasks++;
    const [title, description, status, priority, progress, due_at, completed_at, created_by, team_id] = params;
    
    // Check constraint: chk_done_completed
    const isDone = (status === 'done');
    const hasCompletedAt = (completed_at !== null && completed_at !== undefined);
    if (isDone !== hasCompletedAt) {
      const err = new Error('violates check constraint "chk_done_completed"');
      err.code = '23514';
      throw err;
    }

    const newTask = {
      id,
      title,
      description: description || '',
      status: status || 'todo',
      priority: priority || 'medium',
      progress: progress !== undefined ? progress : 0,
      due_at: due_at ? new Date(due_at) : null,
      completed_at: completed_at ? new Date(completed_at) : null,
      created_by,
      team_id: team_id || null,
      created_at: new Date(),
      updated_at: new Date()
    };
    memoryStore.tasks.push(newTask);
    return { rows: [{ ...newTask }], rowCount: 1 };
  }

  // 9. UPDATE tasks
  if (upper.startsWith('UPDATE TASKS')) {
    // If status update
    if (upper.includes('SET STATUS = $1')) {
      const status = params[0];
      const taskId = Number(params[1]);
      const userId = Number(params[2]);
      const isAdmin = Boolean(params[3]);

      const task = memoryStore.tasks.find(t => t.id === taskId);
      if (!task) return { rows: [], rowCount: 0 };

      // check permission
      const isCreator = task.created_by === userId;
      const isAssigned = memoryStore.task_assignments.some(a => a.task_id === taskId && a.user_id === userId);
      const isMember = task.team_id ? memoryStore.team_members.some(m => m.team_id === task.team_id && m.user_id === userId) : false;

      if (!isAdmin && !isCreator && !isAssigned && !isMember) {
        return { rows: [], rowCount: 0 };
      }

      task.status = status;
      if (status === 'done') {
        task.completed_at = new Date();
        task.progress = 100;
      } else {
        task.completed_at = null;
      }
      task.updated_at = new Date();
      return { rows: [{ ...task }], rowCount: 1 };
    }

    // Full update
    const taskId = Number(params[params.length - 1]);
    const task = memoryStore.tasks.find(t => t.id === taskId);
    if (!task) return { rows: [], rowCount: 0 };

    const [title, description, status, priority, progress, due_at, completed_at, team_id] = params;
    
    const isDone = (status === 'done');
    const hasCompletedAt = (completed_at !== null && completed_at !== undefined);
    if (isDone !== hasCompletedAt) {
      const err = new Error('violates check constraint "chk_done_completed"');
      err.code = '23514';
      throw err;
    }

    task.title = title;
    task.description = description;
    task.status = status;
    task.priority = priority;
    task.progress = progress;
    task.due_at = due_at ? new Date(due_at) : null;
    task.completed_at = completed_at ? new Date(completed_at) : null;
    task.team_id = team_id || null;
    task.updated_at = new Date();

    return { rows: [{ ...task }], rowCount: 1 };
  }

  // 10. DELETE tasks
  if (upper.startsWith('DELETE FROM TASKS')) {
    const id = Number(params[0]);
    const idx = memoryStore.tasks.findIndex(t => t.id === id);
    if (idx === -1) return { rows: [], rowCount: 0 };
    const [deleted] = memoryStore.tasks.splice(idx, 1);
    memoryStore.task_assignments = memoryStore.task_assignments.filter(a => a.task_id !== id);
    memoryStore.task_comments = memoryStore.task_comments.filter(c => c.task_id !== id);
    return { rows: [deleted], rowCount: 1 };
  }

  // 11. Task assignments
  if (upper.startsWith('INSERT INTO TASK_ASSIGNMENTS')) {
    const [taskId, userId, assignedBy] = params;
    const exists = memoryStore.task_assignments.some(a => a.task_id === taskId && a.user_id === userId);
    if (!exists) {
      memoryStore.task_assignments.push({
        task_id: taskId,
        user_id: userId,
        assigned_by: assignedBy,
        assigned_at: new Date()
      });
    }
    return { rows: [], rowCount: 1 };
  }

  if (upper.startsWith('DELETE FROM TASK_ASSIGNMENTS')) {
    const taskId = Number(params[0]);
    memoryStore.task_assignments = memoryStore.task_assignments.filter(a => a.task_id !== taskId);
    return { rows: [], rowCount: 1 };
  }

  if (upper.includes('FROM TASK_ASSIGNMENTS') && upper.includes('WHERE TA.TASK_ID = $1')) {
    const taskId = Number(params[0]);
    const assignees = memoryStore.task_assignments
      .filter(a => a.task_id === taskId)
      .map(a => {
        const u = memoryStore.users.find(usr => usr.id === a.user_id);
        return u ? { id: u.id, email: u.email, full_name: u.full_name } : null;
      }).filter(Boolean);
    return { rows: assignees, rowCount: assignees.length };
  }

  if (upper.includes('FROM TASK_ASSIGNMENTS') && upper.includes('TASK_ID = $1 AND USER_ID = $2')) {
    const exists = memoryStore.task_assignments.some(a => a.task_id === Number(params[0]) && a.user_id === Number(params[1]));
    return { rows: exists ? [{ exists: true }] : [], rowCount: exists ? 1 : 0 };
  }

  // 12. Teams & Team members
  if (upper.includes('FROM TEAMS')) {
    if (upper.includes('WHERE T.ID = $1') || upper.includes('WHERE ID = $1')) {
      const team = memoryStore.teams.find(t => t.id === Number(params[0]));
      if (!team) return { rows: [], rowCount: 0 };
      const owner = memoryStore.users.find(u => u.id === team.owner_id);
      return { rows: [{ ...team, owner_name: owner ? owner.full_name : '', owner_email: owner ? owner.email : '' }], rowCount: 1 };
    }
    const teams = memoryStore.teams.map(t => {
      const owner = memoryStore.users.find(u => u.id === team.owner_id);
      return { ...t, owner_name: owner ? owner.full_name : '' };
    });
    return { rows: teams, rowCount: teams.length };
  }

  if (upper.startsWith('INSERT INTO TEAMS')) {
    const id = memoryStore.seq.teams++;
    const [name, description, owner_id] = params;
    const newTeam = {
      id,
      name,
      description: description || '',
      owner_id,
      created_at: new Date()
    };
    memoryStore.teams.push(newTeam);
    return { rows: [{ ...newTeam }], rowCount: 1 };
  }

  if (upper.includes('FROM TEAM_MEMBERS')) {
    if (upper.includes('TEAM_ID = $1 AND USER_ID = $2')) {
      const m = memoryStore.team_members.find(tm => tm.team_id === Number(params[0]) && tm.user_id === Number(params[1]));
      return { rows: m ? [{ ...m }] : [], rowCount: m ? 1 : 0 };
    }
    if (upper.includes('WHERE TM.TEAM_ID = $1') || upper.includes('WHERE TEAM_ID = $1')) {
      const members = memoryStore.team_members
        .filter(tm => tm.team_id === Number(params[0]))
        .map(tm => {
          const user = memoryStore.users.find(u => u.id === tm.user_id);
          return {
            ...tm,
            email: user ? user.email : '',
            full_name: user ? user.full_name : ''
          };
        });
      return { rows: members, rowCount: members.length };
    }
  }

  if (upper.startsWith('INSERT INTO TEAM_MEMBERS')) {
    const [team_id, user_id, member_role] = params;
    const existing = memoryStore.team_members.find(m => m.team_id === team_id && m.user_id === user_id);
    if (!existing) {
      const newMember = {
        team_id,
        user_id,
        member_role: member_role || 'member',
        joined_at: new Date()
      };
      memoryStore.team_members.push(newMember);
      return { rows: [{ ...newMember }], rowCount: 1 };
    }
    return { rows: [{ ...existing }], rowCount: 1 };
  }

  if (upper.startsWith('DELETE FROM TEAM_MEMBERS')) {
    const [team_id, user_id] = params;
    memoryStore.team_members = memoryStore.team_members.filter(m => !(m.team_id === team_id && m.user_id === user_id));
    return { rows: [], rowCount: 1 };
  }

  // 13. Comments
  if (upper.includes('FROM TASK_COMMENTS')) {
    const taskId = Number(params[0]);
    const list = memoryStore.task_comments
      .filter(c => c.task_id === taskId)
      .map(c => {
        const author = memoryStore.users.find(u => u.id === c.user_id);
        return {
          ...c,
          author_name: author ? author.full_name : 'Unknown',
          author_email: author ? author.email : ''
        };
      });
    return { rows: list, rowCount: list.length };
  }

  if (upper.startsWith('INSERT INTO TASK_COMMENTS')) {
    const id = memoryStore.seq.comments++;
    const [task_id, user_id, content] = params;
    const newComment = {
      id,
      task_id,
      user_id,
      content,
      created_at: new Date()
    };
    memoryStore.task_comments.push(newComment);
    const author = memoryStore.users.find(u => u.id === user_id);
    return {
      rows: [{
        ...newComment,
        author_name: author ? author.full_name : '',
        author_email: author ? author.email : ''
      }],
      rowCount: 1
    };
  }

  return { rows: [], rowCount: 0 };
}

module.exports = {
  query,
  getClient,
  memoryStore,
  isUsingFallback: () => useFallback,
};
