import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const db = new Database(path.join(root, "data", "workteus.db"));

const colors = [
  ["fazenda", "#1a1a1a"],
  ["iprevicon", "#3b4a63"],
  ["pessoal", "#a58b5c"],
];

const stmt = db.prepare("UPDATE services SET color = ? WHERE slug = ?");
for (const [slug, color] of colors) stmt.run(color, slug);

console.log(db.prepare("SELECT name, color FROM services").all());
db.close();
