// ==============================================================================
// frontend/js/app.js: Logic tương tác ứng dụng Task Tracker (Vanilla JS)
// ==============================================================================

const state = {
  currentUser: null,
  currentView: 'dashboard',
  tasks: [],
  teams: [],
  users: [],
  stats: null,
  activeTaskId: null,
  activeTeamId: null,
  itemToDelete: null, // { type: 'task'|'team'|'member', id, extraId }
  filters: {
    status: '',
    priority: '',
    team_id: '',
    assignee: '',
    q: '',
    overdue: false,
    personal_only: false,
    sort_by: 'created_at',
    order: 'desc',
  },
};

// Khởi chạy ứng dụng
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await checkAuthAndInit();
});

// Kiểm tra phiên đăng nhập và tải dữ liệu khởi tạo
async function checkAuthAndInit() {
  try {
    const user = await api.getMe();
    state.currentUser = user;
    updateUserUI();
    hideAuthModal();
    await loadInitialData();
    navigateTo('dashboard');
    startHealthCheck();
  } catch (err) {
    console.log('Chưa đăng nhập hoặc phiên hết hạn:', err.message);
    showAuthModal();
  }
}

// Tải dữ liệu toàn cục (Người dùng, Nhóm, Thống kê)
async function loadInitialData() {
  try {
    const [teams, users, stats] = await Promise.all([
      api.getTeams().catch(() => []),
      api.getUsers().catch(() => []),
      api.getStats().catch(() => null),
    ]);
    state.teams = teams;
    state.users = users;
    state.stats = stats;
    updateSidebarBadges();
    populateSelectDropdowns();
  } catch (e) {
    console.error('Lỗi tải dữ liệu khởi tạo:', e);
  }
}

// Cập nhật thông tin người dùng trên Sidebar
function updateUserUI() {
  if (!state.currentUser) return;
  const { full_name, email, role } = state.currentUser;
  document.getElementById('user-display-name').textContent = full_name;
  document.getElementById('user-display-role').textContent = role === 'admin' ? 'Quản trị viên' : 'Thành viên';
  
  const initials = full_name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(-2)
    .join('')
    .toUpperCase() || 'TT';
  document.getElementById('user-avatar-initials').textContent = initials;

  // Hiển thị phần quản trị nếu là admin
  const adminElements = document.querySelectorAll('.admin-section');
  adminElements.forEach(el => {
    if (role === 'admin') el.classList.remove('hidden');
    else el.classList.add('hidden');
  });
}

// Cập nhật các badge số lượng trên Sidebar
function updateSidebarBadges() {
  if (!state.stats) return;
  document.getElementById('sidebar-overdue-count').textContent = state.stats.overdue || 0;
  document.getElementById('sidebar-upcoming-count').textContent = state.stats.upcoming || 0;
}

// Điền các dropdown nhóm và thành viên
function populateSelectDropdowns() {
  // 1. Task Team Select
  const taskTeamSelect = document.getElementById('task-team-id');
  taskTeamSelect.innerHTML = '<option value="">-- Công việc cá nhân (Không gán nhóm) --</option>';
  state.teams.forEach(t => {
    taskTeamSelect.innerHTML += `<option value="${t.id}">${escapeHtml(t.name)}</option>`;
  });

  // 2. Task Assignees Select
  const taskAssigneesSelect = document.getElementById('task-assignees');
  taskAssigneesSelect.innerHTML = '';
  state.users.forEach(u => {
    taskAssigneesSelect.innerHTML += `<option value="${u.id}">${escapeHtml(u.full_name)} (${escapeHtml(u.email)})</option>`;
  });

  // 3. Team Member Add Select
  const newMemberSelect = document.getElementById('select-new-member');
  if (newMemberSelect) {
    newMemberSelect.innerHTML = '<option value="">-- Chọn tài khoản --</option>';
    state.users.forEach(u => {
      newMemberSelect.innerHTML += `<option value="${u.id}">${escapeHtml(u.full_name)} (${escapeHtml(u.email)})</option>`;
    });
  }
}

// Điều hướng trang nội bộ
async function navigateTo(viewName, filterParams = {}) {
  state.currentView = viewName;

  // Cập nhật active class cho sidebar nav
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
    if (btn.dataset.view === viewName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Đóng sidebar trên mobile
  document.getElementById('sidebar').classList.remove('open');
  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) overlay.classList.remove('active');

  const container = document.getElementById('view-container');
  container.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined empty-state-icon" style="animation:spin 1s infinite linear">sync</span><div class="empty-state-text">Đang tải dữ liệu...</div></div>';

  try {
    switch (viewName) {
      case 'dashboard':
        await renderDashboard();
        break;
      case 'my-tasks':
        await renderTaskList('Công việc của tôi', { assignee: state.currentUser.id, ...filterParams });
        break;
      case 'all-tasks':
        await renderTaskList('Tất cả công việc', filterParams);
        break;
      case 'kanban':
        await renderKanban();
        break;
      case 'overdue':
        await renderTaskList('Công việc quá hạn', { overdue: true, ...filterParams });
        break;
      case 'upcoming':
        await renderTaskList('Công việc sắp đến hạn', { ...filterParams });
        break;
      case 'teams':
        await renderTeams();
        break;
      case 'reports':
        await renderReports();
        break;
      case 'admin-users':
        await renderAdminUsers();
        break;
      default:
        await renderDashboard();
    }
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-symbols-outlined empty-state-icon" style="color:var(--error);">error</span>
        <div class="empty-state-text">Không thể tải nội dung: ${escapeHtml(err.message)}</div>
        <button class="btn btn-secondary btn-sm" onclick="navigateTo('${viewName}')">Thử lại</button>
      </div>
    `;
  }
}

// ==============================================================================
// 1. GIAO DIỆN DASHBOARD (TỔNG QUAN)
// ==============================================================================
async function renderDashboard() {
  const container = document.getElementById('view-container');
  const [stats, tasks] = await Promise.all([
    api.getStats(),
    api.getTasks({ sort_by: 'created_at', order: 'desc' }),
  ]);
  state.stats = stats;
  state.tasks = tasks;
  updateSidebarBadges();

  const total = stats.total || 0;
  const todo = stats.todo || 0;
  const inProgress = stats.in_progress || 0;
  const done = stats.done || 0;
  const overdue = stats.overdue || 0;
  const completionRate = stats.completion_rate || 0;

  const html = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Tổng quan hệ thống</h1>
        <p class="page-description">Theo dõi tiến độ, hiệu suất và điều phối công việc của bạn.</p>
      </div>
      <div style="display:flex; gap:0.5rem;">
        <button class="btn btn-primary" onclick="openCreateTaskModal()">
          <span class="material-symbols-outlined" style="font-size: 18px;">add</span>
          <span>Tạo công việc</span>
        </button>
      </div>
    </div>

    <!-- 4 KPI Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">TỔNG CÔNG VIỆC</span>
          <div class="stat-icon-wrapper blue">
            <span class="material-symbols-outlined" style="font-size: 20px;">assignment</span>
          </div>
        </div>
        <div class="stat-value">${total}</div>
        <div class="stat-footer">
          <span class="material-symbols-outlined" style="font-size: 14px; color:var(--primary);">check</span>
          <span>Toàn bộ nhiệm vụ trong phạm vi</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">CHỜ THỰC HIỆN</span>
          <div class="stat-icon-wrapper amber">
            <span class="material-symbols-outlined" style="font-size: 20px;">inbox</span>
          </div>
        </div>
        <div class="stat-value">${todo}</div>
        <div class="stat-footer">
          <span class="badge badge-medium">To Do</span>
          <span>Công việc chưa bắt đầu</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">ĐANG THỰC HIỆN</span>
          <div class="stat-icon-wrapper purple">
            <span class="material-symbols-outlined" style="font-size: 20px;">autorenew</span>
          </div>
        </div>
        <div class="stat-value">${inProgress}</div>
        <div class="stat-footer">
          <span class="badge badge-in_progress">In Progress</span>
          <span>Đang xử lý tích cực</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">ĐÃ HOÀN THÀNH</span>
          <div class="stat-icon-wrapper green">
            <span class="material-symbols-outlined" style="font-size: 20px;">task_alt</span>
          </div>
        </div>
        <div class="stat-value">${done}</div>
        <div class="stat-footer">
          <span class="badge badge-done">Done: ${completionRate}%</span>
        </div>
      </div>
    </div>

    <!-- Middle Section: Overdue Alert & Progress -->
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:1.25rem; margin-bottom:1.5rem;">
      <!-- Overdue Box -->
      <div class="card" style="margin-bottom:0;">
        <div class="card-header" style="background:#fff5f5;">
          <div class="card-title" style="color:var(--error);">
            <span class="material-symbols-outlined">warning</span>
            <span>Cảnh báo công việc quá hạn (${overdue})</span>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="navigateTo('overdue')">Xem tất cả</button>
        </div>
        <div class="card-body" style="padding: 0.75rem 1rem;">
          ${renderOverdueListSnippet(stats.overdue_tasks)}
        </div>
      </div>

      <!-- Upcoming Box -->
      <div class="card" style="margin-bottom:0;">
        <div class="card-header">
          <div class="card-title">
            <span class="material-symbols-outlined" style="color:var(--primary);">schedule</span>
            <span>Sắp đến hạn trong 7 ngày (${stats.upcoming || 0})</span>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="navigateTo('upcoming')">Chi tiết</button>
        </div>
        <div class="card-body" style="padding: 0.75rem 1rem;">
          ${renderUpcomingListSnippet(stats.upcoming_tasks)}
        </div>
      </div>
    </div>

    <!-- Recent Tasks Table Card -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <span class="material-symbols-outlined">history</span>
          <span>Công việc cập nhật gần đây</span>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="navigateTo('all-tasks')">Xem toàn bộ</button>
      </div>
      <div class="card-body" style="padding:0;">
        ${renderTableHtml(tasks.slice(0, 8))}
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function renderOverdueListSnippet(tasks = []) {
  if (!tasks || tasks.length === 0) {
    return '<div style="padding:1.5rem; text-align:center; color:var(--text-muted); font-size:0.875rem;">Tuyệt vời! Không có công việc nào bị quá hạn.</div>';
  }
  return tasks.map(t => `
    <div style="display:flex; align-items:center; justify-content:space-between; padding:0.6rem 0; border-bottom:1px solid var(--surface-border-subtle); gap:0.5rem;">
      <div style="min-width:0; flex:1;">
        <div style="font-weight:600; font-size:0.85rem; color:var(--text-primary); cursor:pointer;" onclick="viewTaskDetail(${t.id})">${escapeHtml(t.title)}</div>
        <div style="font-size:0.75rem; color:var(--error); margin-top:2px;">
          Hạn chót: ${formatDate(t.due_at)} (${t.team_name || 'Cá nhân'})
        </div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="quickChangeStatus(${t.id}, 'done')">Xong</button>
    </div>
  `).join('');
}

function renderUpcomingListSnippet(tasks = []) {
  if (!tasks || tasks.length === 0) {
    return '<div style="padding:1.5rem; text-align:center; color:var(--text-muted); font-size:0.875rem;">Không có công việc nào đến hạn trong 7 ngày tới.</div>';
  }
  return tasks.map(t => `
    <div style="display:flex; align-items:center; justify-content:space-between; padding:0.6rem 0; border-bottom:1px solid var(--surface-border-subtle); gap:0.5rem;">
      <div style="min-width:0; flex:1;">
        <div style="font-weight:600; font-size:0.85rem; color:var(--text-primary); cursor:pointer;" onclick="viewTaskDetail(${t.id})">${escapeHtml(t.title)}</div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
          Đến hạn: ${formatDate(t.due_at)} • ${getPriorityBadge(t.priority)}
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="viewTaskDetail(${t.id})">Xem</button>
    </div>
  `).join('');
}

// ==============================================================================
// 2. GIAO DIỆN DANH SÁCH CÔNG VIỆC (TABLE VIEW VỚI BỘ LỌC)
// ==============================================================================
async function renderTaskList(title, filterOptions = {}) {
  const container = document.getElementById('view-container');
  const mergedFilters = { ...state.filters, ...filterOptions };
  const tasks = await api.getTasks(mergedFilters);
  state.tasks = tasks;

  const html = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${escapeHtml(title)}</h1>
        <p class="page-description">Tìm kiếm, lọc trạng thái, nhóm và cập nhật tiến độ công việc.</p>
      </div>
      <button class="btn btn-primary" onclick="openCreateTaskModal()">
        <span class="material-symbols-outlined" style="font-size: 18px;">add</span>
        <span>Tạo công việc</span>
      </button>
    </div>

    <!-- Filter Toolbar -->
    <div class="filter-bar">
      <div class="filter-group">
        <label class="filter-label">Trạng thái:</label>
        <select class="select-input" id="filter-status" onchange="applyFilters()">
          <option value="">Tất cả</option>
          <option value="todo" ${mergedFilters.status === 'todo' ? 'selected' : ''}>To Do</option>
          <option value="in_progress" ${mergedFilters.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
          <option value="done" ${mergedFilters.status === 'done' ? 'selected' : ''}>Done</option>
        </select>
      </div>

      <div class="filter-group">
        <label class="filter-label">Mức ưu tiên:</label>
        <select class="select-input" id="filter-priority" onchange="applyFilters()">
          <option value="">Tất cả</option>
          <option value="high" ${mergedFilters.priority === 'high' ? 'selected' : ''}>Cao (High)</option>
          <option value="medium" ${mergedFilters.priority === 'medium' ? 'selected' : ''}>Trung bình (Medium)</option>
          <option value="low" ${mergedFilters.priority === 'low' ? 'selected' : ''}>Thấp (Low)</option>
        </select>
      </div>

      <div class="filter-group">
        <label class="filter-label">Nhóm:</label>
        <select class="select-input" id="filter-team" onchange="applyFilters()">
          <option value="">Tất cả nhóm</option>
          ${state.teams.map(t => `<option value="${t.id}" ${String(mergedFilters.team_id) === String(t.id) ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('')}
        </select>
      </div>

      <div class="filter-group">
        <label class="filter-label">Sắp xếp:</label>
        <select class="select-input" id="filter-sort" onchange="applyFilters()">
          <option value="created_at" ${mergedFilters.sort_by === 'created_at' ? 'selected' : ''}>Ngày tạo</option>
          <option value="due_at" ${mergedFilters.sort_by === 'due_at' ? 'selected' : ''}>Hạn chót</option>
          <option value="priority" ${mergedFilters.sort_by === 'priority' ? 'selected' : ''}>Mức ưu tiên</option>
          <option value="progress" ${mergedFilters.sort_by === 'progress' ? 'selected' : ''}>Tiến độ</option>
        </select>
      </div>

      <div class="filter-group" style="margin-left:auto;">
        <button class="btn btn-secondary btn-sm" onclick="resetFilters()">
          <span class="material-symbols-outlined" style="font-size:16px;">restart_alt</span>
          <span>Đặt lại</span>
        </button>
      </div>
    </div>

    <!-- Tasks Table -->
    <div class="card">
      <div class="card-body" style="padding:0;">
        ${renderTableHtml(tasks)}
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function renderTableHtml(tasks = []) {
  if (tasks.length === 0) {
    return `
      <div class="empty-state">
        <span class="material-symbols-outlined empty-state-icon">assignment_late</span>
        <div class="empty-state-text">Không tìm thấy công việc nào phù hợp</div>
        <button class="btn btn-primary btn-sm" onclick="openCreateTaskModal()">Tạo công việc ngay</button>
      </div>
    `;
  }

  const now = new Date();

  return `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Tiêu đề &amp; Mô tả</th>
            <th>Trạng thái</th>
            <th>Ưu tiên</th>
            <th>Tiến độ</th>
            <th>Thời hạn (Deadline)</th>
            <th>Nhóm</th>
            <th>Phụ trách</th>
            <th style="text-align:right;">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          ${tasks.map(t => {
            const isOverdue = t.status !== 'done' && t.due_at && new Date(t.due_at) < now;
            return `
              <tr class="${isOverdue ? 'row-overdue' : ''}">
                <td>
                  <span class="task-title-cell" style="cursor:pointer;" onclick="viewTaskDetail(${t.id})">
                    ${escapeHtml(t.title)}
                  </span>
                  <span class="task-desc-sub">${escapeHtml(t.description || 'Không có mô tả chi tiết')}</span>
                </td>
                <td>${getStatusBadge(t.status)}</td>
                <td>${getPriorityBadge(t.priority)}</td>
                <td>
                  <div class="progress-bar-container">
                    <div class="progress-bar-fill ${t.status === 'done' ? 'done' : ''}" style="width: ${t.progress || 0}%"></div>
                  </div>
                  <span style="font-size:0.75rem; font-weight:600;">${t.progress || 0}%</span>
                </td>
                <td>
                  <div style="font-size:0.8rem; font-weight:500; ${isOverdue ? 'color:var(--error); font-weight:700;' : ''}">
                    ${formatDate(t.due_at)}
                  </div>
                  ${isOverdue ? '<span class="badge badge-overdue" style="font-size:0.65rem; margin-top:2px;">Quá hạn</span>' : ''}
                </td>
                <td>
                  <span style="font-size:0.8rem; color:var(--text-secondary);">
                    ${escapeHtml(t.team_name || 'Cá nhân')}
                  </span>
                </td>
                <td>
                  <div style="display:flex; align-items:center; gap:0.25rem;">
                    ${renderAssigneesSnippet(t.assignees)}
                  </div>
                </td>
                <td style="text-align:right;">
                  <button class="btn btn-secondary btn-sm" onclick="viewTaskDetail(${t.id})" title="Xem chi tiết">
                    <span class="material-symbols-outlined" style="font-size:16px;">visibility</span>
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick="openEditTaskModal(${t.id})" title="Chỉnh sửa">
                    <span class="material-symbols-outlined" style="font-size:16px;">edit</span>
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="confirmDeleteTask(${t.id}, '${escapeHtml(t.title)}')" title="Xóa">
                    <span class="material-symbols-outlined" style="font-size:16px;">delete</span>
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderAssigneesSnippet(assignees = []) {
  if (!assignees || assignees.length === 0) {
    return '<span style="font-size:0.75rem; color:var(--text-muted);">-</span>';
  }
  return assignees.slice(0, 3).map(a => {
    const initials = (a.full_name || 'U').split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
    return `
      <div class="avatar" style="width:26px; height:26px; font-size:0.65rem;" title="${escapeHtml(a.full_name || a.email)}">
        ${initials}
      </div>
    `;
  }).join('') + (assignees.length > 3 ? `<span style="font-size:0.7rem; color:var(--text-muted);">+${assignees.length - 3}</span>` : '');
}

// Áp dụng bộ lọc
function applyFilters() {
  state.filters.status = document.getElementById('filter-status').value;
  state.filters.priority = document.getElementById('filter-priority').value;
  state.filters.team_id = document.getElementById('filter-team').value;
  state.filters.sort_by = document.getElementById('filter-sort').value;
  navigateTo(state.currentView, state.filters);
}

function resetFilters() {
  state.filters = {
    status: '',
    priority: '',
    team_id: '',
    assignee: '',
    q: '',
    overdue: false,
    personal_only: false,
    sort_by: 'created_at',
    order: 'desc',
  };
  navigateTo(state.currentView);
}

// ==============================================================================
// 3. GIAO DIỆN BẢNG KANBAN (3 CỘT KÉO THẢ & CHUYỂN TRẠNG THÁI)
// ==============================================================================
async function renderKanban() {
  const container = document.getElementById('view-container');
  const tasks = await api.getTasks({ sort_by: 'created_at', order: 'desc' });
  state.tasks = tasks;

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const doneTasks = tasks.filter(t => t.status === 'done');

  const html = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Bảng Kanban</h1>
        <p class="page-description">Trực quan hóa luồng công việc 3 cột: To Do, In Progress và Done.</p>
      </div>
      <button class="btn btn-primary" onclick="openCreateTaskModal()">
        <span class="material-symbols-outlined" style="font-size: 18px;">add</span>
        <span>Tạo công việc</span>
      </button>
    </div>

    <div class="kanban-board">
      <!-- Cột 1: To Do -->
      <div class="kanban-col" ondragover="handleDragOver(event)" ondrop="handleDrop(event, 'todo')">
        <div class="kanban-col-header todo">
          <div class="kanban-title">
            <span class="material-symbols-outlined" style="font-size:18px; color:#64748b;">radio_button_unchecked</span>
            <span>Chờ thực hiện</span>
          </div>
          <span class="kanban-count">${todoTasks.length}</span>
        </div>
        <div class="kanban-cards">
          ${todoTasks.map(t => renderKanbanCard(t)).join('')}
        </div>
      </div>

      <!-- Cột 2: In Progress -->
      <div class="kanban-col" ondragover="handleDragOver(event)" ondrop="handleDrop(event, 'in_progress')">
        <div class="kanban-col-header in_progress">
          <div class="kanban-title">
            <span class="material-symbols-outlined" style="font-size:18px; color:#0284c7;">hourglass_top</span>
            <span>Đang thực hiện</span>
          </div>
          <span class="kanban-count">${inProgressTasks.length}</span>
        </div>
        <div class="kanban-cards">
          ${inProgressTasks.map(t => renderKanbanCard(t)).join('')}
        </div>
      </div>

      <!-- Cột 3: Done -->
      <div class="kanban-col" ondragover="handleDragOver(event)" ondrop="handleDrop(event, 'done')">
        <div class="kanban-col-header done">
          <div class="kanban-title">
            <span class="material-symbols-outlined" style="font-size:18px; color:#16a34a;">check_circle</span>
            <span>Đã hoàn thành</span>
          </div>
          <span class="kanban-count">${doneTasks.length}</span>
        </div>
        <div class="kanban-cards">
          ${doneTasks.map(t => renderKanbanCard(t)).join('')}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function renderKanbanCard(task) {
  const isOverdue = task.status !== 'done' && task.due_at && new Date(task.due_at) < new Date();

  return `
    <div class="kanban-card ${isOverdue ? 'is-overdue' : ''}" draggable="true" ondragstart="handleDragStart(event, ${task.id})">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:0.7rem; color:var(--text-muted); font-weight:600;">#${task.id} • ${escapeHtml(task.team_name || 'Cá nhân')}</span>
        ${getPriorityBadge(task.priority)}
      </div>

      <div class="kanban-card-title" onclick="viewTaskDetail(${task.id})" style="cursor:pointer;">
        ${escapeHtml(task.title)}
      </div>

      <div class="kanban-card-meta">
        <div style="display:flex; align-items:center; gap:0.25rem; ${isOverdue ? 'color:var(--error); font-weight:700;' : ''}">
          <span class="material-symbols-outlined" style="font-size:14px;">calendar_today</span>
          <span>${formatDate(task.due_at)}</span>
        </div>
        <div style="font-weight:600; color:var(--text-secondary);">${task.progress || 0}%</div>
      </div>

      <!-- Quick Move Buttons -->
      <div class="kanban-card-actions">
        ${task.status !== 'todo' ? `
          <button class="btn btn-secondary btn-sm" style="padding:0.2rem 0.4rem; font-size:0.7rem;" onclick="quickChangeStatus(${task.id}, '${task.status === 'done' ? 'in_progress' : 'todo'}')" title="Lùi trạng thái">
            ◀
          </button>
        ` : ''}
        
        <div style="flex:1;"></div>

        ${task.status !== 'done' ? `
          <button class="btn btn-primary btn-sm" style="padding:0.2rem 0.5rem; font-size:0.7rem;" onclick="quickChangeStatus(${task.id}, '${task.status === 'todo' ? 'in_progress' : 'done'}')" title="Tiến trạng thái">
            ${task.status === 'todo' ? 'Làm ▶' : 'Xong ✔'}
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

// Drag & drop handlers
let draggedTaskId = null;

function handleDragStart(e, taskId) {
  draggedTaskId = taskId;
  e.dataTransfer.setData('text/plain', taskId);
}

function handleDragOver(e) {
  e.preventDefault();
}

async function handleDrop(e, targetStatus) {
  e.preventDefault();
  if (!draggedTaskId) return;
  try {
    await api.updateTaskStatus(draggedTaskId, targetStatus);
    showToast(`Đã chuyển công việc sang "${targetStatus}"`, 'success');
    await renderKanban();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    draggedTaskId = null;
  }
}

// ==============================================================================
// 4. GIAO DIỆN QUẢN LÝ NHÓM (TEAMS & MEMBERS)
// ==============================================================================
async function renderTeams() {
  const container = document.getElementById('view-container');
  const teams = await api.getTeams();
  state.teams = teams;

  const html = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Nhóm làm việc</h1>
        <p class="page-description">Quản lý đội ngũ, phân quyền thành viên và phân bổ công việc.</p>
      </div>
      <button class="btn btn-primary" onclick="openCreateTeamModal()">
        <span class="material-symbols-outlined" style="font-size: 18px;">add</span>
        <span>Tạo nhóm mới</span>
      </button>
    </div>

    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:1.25rem;">
      ${teams.map(t => `
        <div class="card" style="margin-bottom:0;">
          <div class="card-header">
            <div class="card-title">
              <span class="material-symbols-outlined" style="color:var(--primary);">groups</span>
              <span>${escapeHtml(t.name)}</span>
            </div>
            <span class="badge ${t.my_role === 'owner' ? 'badge-high' : 'badge-in_progress'}">
              ${t.my_role || 'member'}
            </span>
          </div>
          <div class="card-body">
            <p style="font-size:0.85rem; color:var(--text-secondary); line-height:1.5; margin-bottom:1rem; min-height:40px;">
              ${escapeHtml(t.description || 'Chưa có mô tả cho nhóm này.')}
            </p>
            <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.8rem; color:var(--text-muted); border-top:1px solid var(--surface-border-subtle); padding-top:0.75rem;">
              <div>Chủ nhóm: <strong>${escapeHtml(t.owner_name || 'Admin')}</strong></div>
              <div><strong>${t.member_count || 1}</strong> thành viên</div>
            </div>
          </div>
          <div class="modal-footer" style="padding:0.75rem 1.25rem;">
            <button class="btn btn-secondary btn-sm" onclick="viewTeamMembers(${t.id})">
              <span class="material-symbols-outlined" style="font-size:16px;">person_add</span>
              <span>Thành viên</span>
            </button>
            <button class="btn btn-primary btn-sm" onclick="navigateTo('all-tasks', { team_id: ${t.id} })">
              <span>Xem việc nhóm</span>
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  container.innerHTML = html;
}

// Xem chi tiết thành viên nhóm
async function viewTeamMembers(teamId) {
  state.activeTeamId = teamId;
  const team = await api.getTeam(teamId);
  document.getElementById('team-members-title').textContent = `Thành viên nhóm: ${team.name}`;
  
  const tbody = document.getElementById('team-members-tbody');
  tbody.innerHTML = (team.members || []).map(m => `
    <tr>
      <td>
        <div style="font-weight:600; color:var(--text-primary);">${escapeHtml(m.full_name)}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(m.email)}</div>
      </td>
      <td>
        <span class="badge ${m.member_role === 'owner' ? 'badge-high' : m.member_role === 'manager' ? 'badge-medium' : 'badge-todo'}">
          ${m.member_role}
        </span>
      </td>
      <td>${formatDate(m.joined_at, false)}</td>
      <td>
        ${m.member_role !== 'owner' ? `
          <button class="btn btn-danger btn-sm" onclick="removeMemberFromTeam(${teamId}, ${m.user_id})">
            <span class="material-symbols-outlined" style="font-size:14px;">person_remove</span>
          </button>
        ` : '<span style="font-size:0.75rem; color:var(--text-muted);">Chủ nhóm</span>'}
      </td>
    </tr>
  `).join('');

  // Ẩn/Hiện form thêm thành viên nếu là owner/manager/admin
  const canManage = state.currentUser.role === 'admin' || ['owner', 'manager'].includes(team.my_role);
  document.getElementById('add-member-container').style.display = canManage ? 'block' : 'none';

  openModal('modal-team-members');
}

async function removeMemberFromTeam(teamId, userId) {
  if (!confirm('Bạn có chắc chắn muốn xóa thành viên này khỏi nhóm?')) return;
  try {
    await api.removeTeamMember(teamId, userId);
    showToast('Đã xóa thành viên khỏi nhóm', 'success');
    await viewTeamMembers(teamId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==============================================================================
// 5. BÁO CÁO & TIẾN ĐỘ CHI TIẾT (REPORTS)
// ==============================================================================
async function renderReports() {
  const container = document.getElementById('view-container');
  const stats = await api.getStats();

  const total = stats.total || 0;
  const done = stats.done || 0;
  const inProgress = stats.in_progress || 0;
  const todo = stats.todo || 0;
  const overdue = stats.overdue || 0;
  const p = stats.priority_breakdown || { high: 0, medium: 0, low: 0 };

  const html = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Báo cáo &amp; Thống kê</h1>
        <p class="page-description">Số liệu thực nghiệm kiểm thử đồ án lấy trực tiếp từ PostgreSQL.</p>
      </div>
      <button class="btn btn-secondary" onclick="renderReports()">
        <span class="material-symbols-outlined" style="font-size:18px;">refresh</span>
        <span>Làm mới số liệu</span>
      </button>
    </div>

    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:1.25rem;">
      <!-- Card: Phân bổ trạng thái -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Phân bổ trạng thái công việc</div>
        </div>
        <div class="card-body">
          <div style="display:flex; flex-direction:column; gap:1rem;">
            <div>
              <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem; font-size:0.85rem;">
                <span>Hoàn thành (Done)</span>
                <strong>${done} (${total ? Math.round(done/total*100) : 0}%)</strong>
              </div>
              <div class="progress-bar-container" style="width:100%; height:8px;">
                <div class="progress-bar-fill done" style="width:${total ? Math.round(done/total*100) : 0}%"></div>
              </div>
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem; font-size:0.85rem;">
                <span>Đang thực hiện (In Progress)</span>
                <strong>${inProgress} (${total ? Math.round(inProgress/total*100) : 0}%)</strong>
              </div>
              <div class="progress-bar-container" style="width:100%; height:8px;">
                <div class="progress-bar-fill" style="width:${total ? Math.round(inProgress/total*100) : 0}%"></div>
              </div>
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem; font-size:0.85rem;">
                <span>Chờ thực hiện (To Do)</span>
                <strong>${todo} (${total ? Math.round(todo/total*100) : 0}%)</strong>
              </div>
              <div class="progress-bar-container" style="width:100%; height:8px;">
                <div class="progress-bar-fill" style="background:#94a3b8; width:${total ? Math.round(todo/total*100) : 0}%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Card: Mức độ ưu tiên -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Mức độ ưu tiên</div>
        </div>
        <div class="card-body">
          <div style="display:flex; flex-direction:column; gap:0.75rem; font-size:0.875rem;">
            <div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem; background:var(--priority-high-bg); border-radius:var(--radius-md);">
              <span>Ưu tiên Cao (High)</span>
              <strong>${p.high}</strong>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem; background:var(--priority-medium-bg); border-radius:var(--radius-md);">
              <span>Ưu tiên Trung bình (Medium)</span>
              <strong>${p.medium}</strong>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem; background:var(--priority-low-bg); border-radius:var(--radius-md);">
              <span>Ưu tiên Thấp (Low)</span>
              <strong>${p.low}</strong>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem; background:var(--error-bg); border-radius:var(--radius-md); color:var(--error);">
              <span>Công việc quá hạn (Overdue)</span>
              <strong>${overdue}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// ==============================================================================
// 6. GIAO DIỆN QUẢN TRỊ VIÊN (ADMIN USERS)
// ==============================================================================
async function renderAdminUsers() {
  const container = document.getElementById('view-container');
  const users = await api.getAdminUsers();

  const html = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Quản trị người dùng &amp; Tài khoản</h1>
        <p class="page-description">Vô hiệu hóa hoặc kích hoạt tài khoản hệ thống (Admin only).</p>
      </div>
    </div>

    <div class="card">
      <div class="card-body" style="padding:0;">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Họ và tên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th style="text-align:right;">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td>#${u.id}</td>
                  <td><strong>${escapeHtml(u.full_name)}</strong></td>
                  <td>${escapeHtml(u.email)}</td>
                  <td>
                    <span class="badge ${u.role === 'admin' ? 'badge-high' : 'badge-in_progress'}">
                      ${u.role}
                    </span>
                  </td>
                  <td>
                    <span class="badge ${u.is_active ? 'badge-done' : 'badge-overdue'}">
                      ${u.is_active ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td>${formatDate(u.created_at, false)}</td>
                  <td style="text-align:right;">
                    ${u.id !== state.currentUser.id ? `
                      <button class="btn ${u.is_active ? 'btn-danger' : 'btn-primary'} btn-sm" onclick="toggleUserStatus(${u.id}, ${!u.is_active})">
                        ${u.is_active ? 'Khóa tài khoản' : 'Kích hoạt'}
                      </button>
                    ` : '<span style="font-size:0.75rem; color:var(--text-muted);">(Bạn)</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

async function toggleUserStatus(userId, isActive) {
  try {
    await api.toggleUserStatus(userId, isActive);
    showToast('Cập nhật trạng thái người dùng thành công', 'success');
    await renderAdminUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==============================================================================
// 7. MODALS VÀ THAO TÁC CÔNG VIỆC
// ==============================================================================
function openCreateTaskModal() {
  document.getElementById('task-modal-title').textContent = 'Tạo công việc mới';
  document.getElementById('form-task').reset();
  document.getElementById('task-id').value = '';
  document.getElementById('task-progress').value = '0';
  document.getElementById('task-status').value = 'todo';
  document.getElementById('task-priority').value = 'medium';
  openModal('modal-task-form');
}

async function openEditTaskModal(taskId) {
  try {
    const task = await api.getTask(taskId);
    document.getElementById('task-modal-title').textContent = 'Chỉnh sửa công việc';
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-desc').value = task.description || '';
    document.getElementById('task-status').value = task.status;
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('task-progress').value = task.progress || 0;
    document.getElementById('task-team-id').value = task.team_id || '';

    if (task.due_at) {
      const d = new Date(task.due_at);
      const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      document.getElementById('task-due-at').value = iso;
    } else {
      document.getElementById('task-due-at').value = '';
    }

    // Assignees multi-select
    const select = document.getElementById('task-assignees');
    const assignedIds = (task.assignees || []).map(a => String(a.id));
    Array.from(select.options).forEach(opt => {
      opt.selected = assignedIds.includes(opt.value);
    });

    openModal('modal-task-form');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleTaskFormSubmit(e) {
  e.preventDefault();
  const taskId = document.getElementById('task-id').value;
  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-desc').value.trim();
  const status = document.getElementById('task-status').value;
  const priority = document.getElementById('task-priority').value;
  const progress = Number(document.getElementById('task-progress').value);
  const due_at = document.getElementById('task-due-at').value || null;
  const team_id = document.getElementById('task-team-id').value || null;

  const assigneesSelect = document.getElementById('task-assignees');
  const assignees = Array.from(assigneesSelect.selectedOptions).map(opt => Number(opt.value));

  const payload = { title, description, status, priority, progress, due_at, team_id, assignees };

  try {
    if (taskId) {
      await api.updateTask(taskId, payload);
      showToast('Cập nhật công việc thành công', 'success');
    } else {
      await api.createTask(payload);
      showToast('Tạo công việc mới thành công', 'success');
    }
    closeModal('modal-task-form');
    await loadInitialData();
    navigateTo(state.currentView);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Xem chi tiết công việc
async function viewTaskDetail(taskId) {
  state.activeTaskId = taskId;
  try {
    const task = await api.getTask(taskId);
    document.getElementById('detail-task-title').textContent = task.title;
    document.getElementById('detail-task-desc').textContent = task.description || 'Không có mô tả chi tiết.';
    document.getElementById('detail-creator').textContent = task.creator_name || 'Hệ thống';
    document.getElementById('detail-team').textContent = task.team_name || 'Công việc cá nhân';
    document.getElementById('detail-due').textContent = formatDate(task.due_at);
    document.getElementById('detail-completed').textContent = task.completed_at ? formatDate(task.completed_at) : 'Chưa hoàn thành';
    document.getElementById('detail-progress-val').textContent = `${task.progress || 0}%`;

    document.getElementById('detail-task-badges').innerHTML = `
      ${getStatusBadge(task.status)}
      ${getPriorityBadge(task.priority)}
    `;

    const assigneesText = (task.assignees || []).map(a => a.full_name).join(', ') || 'Chưa gán';
    document.getElementById('detail-assignees').textContent = assigneesText;

    // Comments
    renderCommentsList(task.comments || []);

    // Buttons actions
    document.getElementById('btn-detail-edit').onclick = () => {
      closeModal('modal-task-detail');
      openEditTaskModal(taskId);
    };
    document.getElementById('btn-detail-delete').onclick = () => {
      closeModal('modal-task-detail');
      confirmDeleteTask(taskId, task.title);
    };

    // Quick status buttons
    document.getElementById('btn-quick-todo').onclick = () => quickChangeStatus(taskId, 'todo', true);
    document.getElementById('btn-quick-progress').onclick = () => quickChangeStatus(taskId, 'in_progress', true);
    document.getElementById('btn-quick-done').onclick = () => quickChangeStatus(taskId, 'done', true);

    openModal('modal-task-detail');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderCommentsList(comments = []) {
  const container = document.getElementById('detail-comments-list');
  if (comments.length === 0) {
    container.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding:0.5rem;">Chưa có bình luận nào. Hãy bắt đầu trao đổi!</div>';
    return;
  }
  container.innerHTML = comments.map(c => `
    <div style="background:var(--surface-alt); padding:0.5rem 0.75rem; border-radius:var(--radius-sm); font-size:0.825rem;">
      <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
        <strong>${escapeHtml(c.author_name || 'Thành viên')}</strong>
        <span style="font-size:0.7rem; color:var(--text-muted);">${formatDate(c.created_at)}</span>
      </div>
      <div style="color:var(--text-primary); line-height:1.4;">${escapeHtml(c.content)}</div>
    </div>
  `).join('');
}

async function handleCommentSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('comment-input');
  const content = input.value.trim();
  if (!content || !state.activeTaskId) return;

  try {
    await api.createComment(state.activeTaskId, content);
    input.value = '';
    const comments = await api.getComments(state.activeTaskId);
    renderCommentsList(comments);
    showToast('Đã gửi bình luận', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function quickChangeStatus(taskId, newStatus, refreshDetail = false) {
  try {
    await api.updateTaskStatus(taskId, newStatus);
    showToast(`Đã chuyển trạng thái sang "${newStatus}"`, 'success');
    await loadInitialData();
    if (refreshDetail) {
      await viewTaskDetail(taskId);
    }
    navigateTo(state.currentView);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function confirmDeleteTask(taskId, title) {
  state.itemToDelete = { type: 'task', id: taskId };
  document.getElementById('delete-confirm-message').textContent = `Bạn có chắc chắn muốn xóa công việc "${title}"? Toàn bộ phân công và bình luận liên quan sẽ bị xóa vĩnh viễn.`;
  openModal('modal-confirm-delete');
}

async function executeDelete() {
  if (!state.itemToDelete) return;
  const { type, id } = state.itemToDelete;
  try {
    if (type === 'task') {
      await api.deleteTask(id);
      showToast('Đã xóa công việc thành công', 'success');
    }
    closeModal('modal-confirm-delete');
    await loadInitialData();
    navigateTo(state.currentView);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    state.itemToDelete = null;
  }
}

// ==============================================================================
// 8. TEAMS & MODALS LOGIC
// ==============================================================================
function openCreateTeamModal() {
  document.getElementById('team-modal-title').textContent = 'Tạo nhóm làm việc mới';
  document.getElementById('form-team').reset();
  document.getElementById('team-id').value = '';
  openModal('modal-team-form');
}

async function handleTeamFormSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('team-name').value.trim();
  const description = document.getElementById('team-desc').value.trim();
  try {
    await api.createTeam(name, description);
    showToast('Tạo nhóm mới thành công', 'success');
    closeModal('modal-team-form');
    await loadInitialData();
    navigateTo('teams');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleAddMemberSubmit(e) {
  e.preventDefault();
  const userId = document.getElementById('select-new-member').value;
  const role = document.getElementById('select-member-role').value;
  if (!userId || !state.activeTeamId) return;

  try {
    await api.addTeamMember(state.activeTeamId, Number(userId), role);
    showToast('Đã thêm thành viên vào nhóm', 'success');
    document.getElementById('form-add-member').reset();
    await viewTeamMembers(state.activeTeamId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==============================================================================
// 9. PROFILE & AUTHENTICATION
// ==============================================================================
function openProfileModal() {
  if (!state.currentUser) return;
  document.getElementById('profile-email').value = state.currentUser.email;
  document.getElementById('profile-fullname').value = state.currentUser.full_name;
  openModal('modal-profile');
}

async function handleProfileSubmit(e) {
  e.preventDefault();
  const fullName = document.getElementById('profile-fullname').value.trim();
  try {
    const res = await api.updateProfile(fullName);
    state.currentUser.full_name = fullName;
    updateUserUI();
    showToast('Cập nhật họ tên thành công', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleChangePasswordSubmit(e) {
  e.preventDefault();
  const oldPwd = document.getElementById('pwd-old').value;
  const newPwd = document.getElementById('pwd-new').value;
  try {
    await api.changePassword(oldPwd, newPwd);
    showToast('Đổi mật khẩu thành công', 'success');
    document.getElementById('form-change-pwd').reset();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showAuthModal() {
  document.getElementById('modal-auth').classList.add('active');
}

function hideAuthModal() {
  document.getElementById('modal-auth').classList.remove('active');
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const alertBox = document.getElementById('auth-error-alert');
  alertBox.style.display = 'none';

  try {
    const data = await api.login(email, password);
    state.currentUser = data.user;
    updateUserUI();
    hideAuthModal();
    showToast(`Chào mừng trở lại, ${data.user.full_name}!`, 'success');
    await loadInitialData();
    navigateTo('dashboard');
  } catch (err) {
    alertBox.textContent = err.message || 'Đăng nhập thất bại';
    alertBox.style.display = 'block';
  }
}

async function handleLogout() {
  try {
    await api.logout();
    state.currentUser = null;
    showToast('Đã đăng xuất khỏi hệ thống', 'info');
    showAuthModal();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Quick fill buttons for demo testing
function setupDemoAccountButtons() {
  document.getElementById('btn-fill-admin').onclick = () => {
    document.getElementById('auth-email').value = 'admin@tasktracker.local';
    document.getElementById('auth-password').value = 'Admin@123456';
  };
  document.getElementById('btn-fill-pm').onclick = () => {
    document.getElementById('auth-email').value = 'quan.nm@tasktracker.local';
    document.getElementById('auth-password').value = 'User@123456';
  };
  document.getElementById('btn-fill-tech').onclick = () => {
    document.getElementById('auth-email').value = 'hoang.nh@tasktracker.local';
    document.getElementById('auth-password').value = 'User@123456';
  };
}

// ==============================================================================
// 10. TIỆN ÍCH HỆ THỐNG (TOASTS, HELPERS, EVENT LISTENERS)
// ==============================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconName = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';
  toast.innerHTML = `
    <span class="material-symbols-outlined" style="font-size:20px;">${iconName}</span>
    <span style="flex:1;">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function getStatusBadge(status) {
  switch (status) {
    case 'todo': return '<span class="badge badge-todo">To Do</span>';
    case 'in_progress': return '<span class="badge badge-in_progress">In Progress</span>';
    case 'done': return '<span class="badge badge-done">Done</span>';
    default: return `<span class="badge">${escapeHtml(status)}</span>`;
  }
}

function getPriorityBadge(priority) {
  switch (priority) {
    case 'high': return '<span class="badge badge-high">Cao</span>';
    case 'medium': return '<span class="badge badge-medium">Trung bình</span>';
    case 'low': return '<span class="badge badge-low">Thấp</span>';
    default: return `<span class="badge">${escapeHtml(priority)}</span>`;
  }
}

function formatDate(dateStr, includeTime = true) {
  if (!dateStr) return 'Không có hạn';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  if (!includeTime) return `${day}/${month}/${year}`;

  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${mins} ${day}/${month}/${year}`;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function startHealthCheck() {
  const check = async () => {
    try {
      const res = await api.checkHealth();
      document.getElementById('health-text').textContent = 'Online';
      document.getElementById('backend-health-pill').style.background = '#e0f2fe';
      document.getElementById('backend-health-pill').style.color = '#0369a1';
    } catch (e) {
      document.getElementById('health-text').textContent = 'Offline';
      document.getElementById('backend-health-pill').style.background = '#fee2e2';
      document.getElementById('backend-health-pill').style.color = '#ef4444';
    }
  };
  check();
  setInterval(check, 30000);
}

function setupEventListeners() {
  // Navigation clicks
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view) navigateTo(view);
    });
  });

  // Mobile menu & drawer overlay
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const closeSidebar = () => {
    sidebar.classList.remove('open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
  };
  const toggleSidebar = () => {
    sidebar.classList.toggle('open');
    if (sidebarOverlay) {
      if (sidebar.classList.contains('open')) sidebarOverlay.classList.add('active');
      else sidebarOverlay.classList.remove('active');
    }
  };

  const menuBtn = document.getElementById('btn-mobile-menu');
  if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);

  const closeSidebarBtn = document.getElementById('btn-close-sidebar');
  if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);

  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

  // Global search shortcut [Ctrl + K]
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('global-search').focus();
    }
  });

  document.getElementById('global-search').addEventListener('input', (e) => {
    const q = e.target.value;
    state.filters.q = q;
    if (state.currentView === 'all-tasks' || state.currentView === 'my-tasks') {
      applyFilters();
    }
  });

  // Top header button
  document.getElementById('btn-open-create-task').addEventListener('click', openCreateTaskModal);
  document.getElementById('btn-profile-settings').addEventListener('click', openProfileModal);
  document.getElementById('btn-logout').addEventListener('click', handleLogout);

  // Forms
  document.getElementById('form-task').addEventListener('submit', handleTaskFormSubmit);
  document.getElementById('form-team').addEventListener('submit', handleTeamFormSubmit);
  document.getElementById('form-add-member').addEventListener('submit', handleAddMemberSubmit);
  document.getElementById('form-comment').addEventListener('submit', handleCommentSubmit);
  document.getElementById('form-profile').addEventListener('submit', handleProfileSubmit);
  document.getElementById('form-change-pwd').addEventListener('submit', handleChangePasswordSubmit);
  document.getElementById('form-auth-login').addEventListener('submit', handleLoginSubmit);

  // Delete modal
  document.getElementById('btn-do-delete').addEventListener('click', executeDelete);

  // Modal close buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close-modal');
      closeModal(modalId);
    });
  });

  // Close modal when clicking backdrop
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal && modal.id !== 'modal-auth') {
        modal.classList.remove('active');
      }
    });
  });

  setupDemoAccountButtons();
}
