import { and, asc, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { stickyNotes } from "@/db/schema";
import { normalizeStickyColor } from "./types";
import { nowLocalString } from "./dates";

export async function listStickyNotes(opts?: {
  q?: string;
  scope?: "active" | "archived";
}) {
  const scope = opts?.scope || "active";
  const conditions = [
    scope === "archived" ? isNotNull(stickyNotes.archivedAt) : isNull(stickyNotes.archivedAt),
  ];
  if (opts?.q?.trim()) {
    const like = `%${opts.q.trim()}%`;
    conditions.push(
      sql`(${stickyNotes.title} LIKE ${like} OR ${stickyNotes.body} LIKE ${like})`,
    );
  }
  const where = and(...conditions);

  return db
    .select()
    .from(stickyNotes)
    .where(where)
    .orderBy(
      desc(stickyNotes.pinned),
      asc(stickyNotes.sortOrder),
      desc(stickyNotes.updatedAt),
      desc(stickyNotes.id),
    );
}

export async function createStickyNote(input: {
  title?: string;
  body?: string;
  color?: string;
  pinned?: boolean;
  sensitive?: boolean;
}) {
  const title = (input.title || "").trim();
  const body = input.body || "";
  const plain = body
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!title && !plain) throw new Error("Escreva algo no post-it");

  const sensitive = Boolean(input.sensitive);
  // Em sigilo o título NÃO herda o corpo (evita vazar senha no topo)
  const safeTitle = title || (sensitive ? "Sigilo" : "Nota");

  const maxSort = await db
    .select({ m: sql<number>`coalesce(max(${stickyNotes.sortOrder}), 0)` })
    .from(stickyNotes);
  const sortOrder = Number(maxSort[0]?.m || 0) + 1;
  const at = nowLocalString();

  const [row] = await db
    .insert(stickyNotes)
    .values({
      title: safeTitle,
      body: plain ? body : title,
      color: normalizeStickyColor(input.color),
      pinned: Boolean(input.pinned),
      sensitive,
      sortOrder,
      createdAt: at,
      updatedAt: at,
    })
    .returning();

  return row;
}

export async function updateStickyNote(
  id: number,
  input: Partial<{
    title: string;
    body: string;
    color: string;
    pinned: boolean;
    sensitive: boolean;
    sortOrder: number;
  }>,
) {
  const [existing] = await db
    .select()
    .from(stickyNotes)
    .where(eq(stickyNotes.id, id))
    .limit(1);
  if (!existing) throw new Error("Nota não encontrada");

  const [row] = await db
    .update(stickyNotes)
    .set({
      ...("title" in input ? { title: input.title!.trim() || existing.title } : {}),
      ...("body" in input ? { body: input.body ?? "" } : {}),
      ...("color" in input ? { color: normalizeStickyColor(input.color) } : {}),
      ...("pinned" in input ? { pinned: Boolean(input.pinned) } : {}),
      ...("sensitive" in input ? { sensitive: Boolean(input.sensitive) } : {}),
      ...("sortOrder" in input ? { sortOrder: input.sortOrder! } : {}),
      updatedAt: nowLocalString(),
    })
    .where(eq(stickyNotes.id, id))
    .returning();

  return row;
}

export async function archiveStickyNote(id: number) {
  const [existing] = await db
    .select()
    .from(stickyNotes)
    .where(eq(stickyNotes.id, id))
    .limit(1);
  if (!existing || existing.archivedAt) throw new Error("Nota não encontrada");

  const [row] = await db
    .update(stickyNotes)
    .set({
      archivedAt: nowLocalString(),
      updatedAt: nowLocalString(),
    })
    .where(eq(stickyNotes.id, id))
    .returning();

  return row;
}

export async function restoreStickyNote(id: number) {
  const [existing] = await db
    .select()
    .from(stickyNotes)
    .where(eq(stickyNotes.id, id))
    .limit(1);
  if (!existing || !existing.archivedAt) throw new Error("Nota arquivada não encontrada");

  const [row] = await db
    .update(stickyNotes)
    .set({
      archivedAt: null,
      updatedAt: nowLocalString(),
    })
    .where(eq(stickyNotes.id, id))
    .returning();

  return row;
}

export async function deleteStickyNote(id: number) {
  const [existing] = await db
    .select()
    .from(stickyNotes)
    .where(eq(stickyNotes.id, id))
    .limit(1);
  if (!existing) throw new Error("Nota não encontrada");

  await db.delete(stickyNotes).where(eq(stickyNotes.id, id));
  return { ok: true as const, id };
}
