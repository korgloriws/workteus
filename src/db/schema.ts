import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const services = sqliteTable("services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  code: text("code").notNull().unique(),
  color: text("color").notNull().default("#1a1a1a"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  serviceId: integer("service_id")
    .notNull()
    .references(() => services.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  sequence: integer("sequence").notNull(),
  periodKey: text("period_key").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("a_fazer"),
  priority: text("priority").notNull().default("media"),
  blockedBy: text("blocked_by"),
  dueDate: text("due_date"),
  completedAt: text("completed_at"),
  notes: text("notes").notNull().default(""),
  link: text("link"),
  abandonReason: text("abandon_reason"),
  deletedAt: text("deleted_at"),
  deleteReason: text("delete_reason"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const taskSteps = sqliteTable("task_steps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  content: text("content").notNull().default(""),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const taskStatusEvents = sqliteTable("task_status_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  reason: text("reason"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const viewPreferences = sqliteTable("view_preferences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  serviceId: integer("service_id")
    .notNull()
    .references(() => services.id, { onDelete: "cascade" })
    .unique(),
  viewMode: text("view_mode").notNull().default("lista"),
  periodMode: text("period_mode").notNull().default("mes"),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type User = typeof users.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskStep = typeof taskSteps.$inferSelect;
export type TaskStatusEvent = typeof taskStatusEvents.$inferSelect;
export type ViewPreference = typeof viewPreferences.$inferSelect;
