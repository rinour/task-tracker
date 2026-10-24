-- ==============================================================================
-- 001_schema.sql: Lược đồ cơ sở dữ liệu Task Tracker
-- Khớp hoàn toàn với Báo cáo Triển khai và Quản trị Hệ thống phần mềm
-- ==============================================================================

-- 1. Bảng users
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,   -- chỉ lưu chuỗi băm
  full_name     VARCHAR(120) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'member'
                CHECK (role IN ('admin', 'member')),
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 2. Bảng teams
CREATE TABLE IF NOT EXISTS teams (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  description TEXT,
  owner_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Bảng team_members
CREATE TABLE IF NOT EXISTS team_members (
  team_id     BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_role VARCHAR(20) NOT NULL DEFAULT 'member'
              CHECK (member_role IN ('owner', 'manager', 'member')),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

-- 4. Bảng tasks
CREATE TABLE IF NOT EXISTS tasks (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title        VARCHAR(200) NOT NULL CHECK (length(btrim(title)) > 0),
  description  TEXT,
  status       VARCHAR(20) NOT NULL DEFAULT 'todo'
               CHECK (status IN ('todo', 'in_progress', 'done')),
  priority     VARCHAR(20) NOT NULL DEFAULT 'medium'
               CHECK (priority IN ('low', 'medium', 'high')),
  progress     SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  due_at       TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by   BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  team_id      BIGINT REFERENCES teams(id) ON DELETE CASCADE, -- NULL = cá nhân
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- completed_at có giá trị khi và chỉ khi công việc đã Done
  CONSTRAINT chk_done_completed
    CHECK ((status = 'done') = (completed_at IS NOT NULL))
);

-- 5. Bảng task_assignments
CREATE TABLE IF NOT EXISTS task_assignments (
  task_id     BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

-- 6. Bảng task_comments
CREATE TABLE IF NOT EXISTS task_comments (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id    BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  content    TEXT NOT NULL CHECK (length(btrim(content)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Các chỉ mục tối ưu truy vấn
CREATE INDEX IF NOT EXISTS idx_tasks_status_due     ON tasks (status, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_team_id        ON tasks (team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by     ON tasks (created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_overdue        ON tasks (due_at) WHERE status <> 'done';
CREATE INDEX IF NOT EXISTS idx_assignments_user     ON task_assignments (user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user    ON team_members (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_task_time   ON task_comments (task_id, created_at);

-- Tự động cập nhật trường updated_at khi UPDATE tasks
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
