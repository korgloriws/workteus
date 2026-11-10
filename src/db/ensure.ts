import { sqlite } from "./index";

export function ensureSchema() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#1a1a1a',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      code TEXT NOT NULL UNIQUE,
      sequence INTEGER NOT NULL,
      period_key TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'a_fazer',
      priority TEXT NOT NULL DEFAULT 'media',
      blocked_by TEXT,
      due_date TEXT,
      completed_at TEXT,
      notes TEXT NOT NULL DEFAULT '',
      link TEXT,
      abandon_reason TEXT,
      deleted_at TEXT,
      delete_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      content TEXT NOT NULL DEFAULT '',
      done INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_status_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS view_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL UNIQUE REFERENCES services(id) ON DELETE CASCADE,
      view_mode TEXT NOT NULL DEFAULT 'lista',
      period_mode TEXT NOT NULL DEFAULT 'mes',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_service ON tasks(service_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_period ON tasks(period_key);
    CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_events_task ON task_status_events(task_id);
    CREATE INDEX IF NOT EXISTS idx_steps_task ON task_steps(task_id);
  `);
}
