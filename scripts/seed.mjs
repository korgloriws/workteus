import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dataDir = path.join(root, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, "workteus.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

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
    color TEXT NOT NULL DEFAULT '#0f766e',
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
`);

const username = process.env.ADMIN_USER;
const password = process.env.ADMIN_PASSWORD;

if (!username || !password) {
  console.error("Defina ADMIN_USER e ADMIN_PASSWORD no ambiente/.env antes do seed.");
  process.exit(1);
}

const existing = sqlite.prepare("SELECT id FROM users WHERE username = ?").get(username);

if (!existing) {
  const hash = bcrypt.hashSync(password, 10);
  sqlite.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(username, hash);
  console.log(`Usuário criado: ${username}`);
} else {
  console.log(`Usuário já existe: ${username}`);
}

const seeds = [
  { name: "Fazenda", slug: "fazenda", code: "FAZ", color: "#1a1a1a", sort: 1 },
  { name: "Iprevicon", slug: "iprevicon", code: "IPR", color: "#3b4a63", sort: 2 },
  { name: "Pessoal", slug: "pessoal", code: "PES", color: "#a58b5c", sort: 3 },
];

const updateColors = sqlite.prepare(`UPDATE services SET color = ? WHERE slug = ?`);
for (const s of seeds) {
  updateColors.run(s.color, s.slug);
}

const insertService = sqlite.prepare(
  `INSERT OR IGNORE INTO services (name, slug, code, color, sort_order) VALUES (?, ?, ?, ?, ?)`,
);
const insertPref = sqlite.prepare(
  `INSERT OR IGNORE INTO view_preferences (service_id, view_mode, period_mode)
   VALUES ((SELECT id FROM services WHERE slug = ?), 'lista', 'mes')`,
);

for (const s of seeds) {
  insertService.run(s.name, s.slug, s.code, s.color, s.sort);
  insertPref.run(s.slug);
}

console.log("Seed concluído:", dbPath);
sqlite.close();
