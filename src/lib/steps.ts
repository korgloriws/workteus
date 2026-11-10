import { and, asc, eq, max, sql } from "drizzle-orm";
import { db } from "@/db";
import { taskSteps, tasks } from "@/db/schema";

export async function listSteps(taskId: number) {
  return db
    .select()
    .from(taskSteps)
    .where(eq(taskSteps.taskId, taskId))
    .orderBy(asc(taskSteps.sortOrder), asc(taskSteps.id));
}

export async function createStep(taskId: number, content: string) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task || task.deletedAt) throw new Error("Tarefa não encontrada");

  const [row] = await db
    .select({ maxOrder: max(taskSteps.sortOrder) })
    .from(taskSteps)
    .where(eq(taskSteps.taskId, taskId));

  const sortOrder = (row?.maxOrder ?? 0) + 1;

  const [step] = await db
    .insert(taskSteps)
    .values({
      taskId,
      content: content.trim(),
      done: false,
      sortOrder,
    })
    .returning();

  return step;
}

export async function updateStep(
  taskId: number,
  stepId: number,
  input: Partial<{ content: string; done: boolean; sortOrder: number }>,
) {
  const [existing] = await db
    .select()
    .from(taskSteps)
    .where(and(eq(taskSteps.id, stepId), eq(taskSteps.taskId, taskId)))
    .limit(1);
  if (!existing) throw new Error("Etapa não encontrada");

  const [updated] = await db
    .update(taskSteps)
    .set({
      ...("content" in input ? { content: input.content?.trim() || "" } : {}),
      ...("done" in input ? { done: Boolean(input.done) } : {}),
      ...("sortOrder" in input ? { sortOrder: input.sortOrder! } : {}),
      updatedAt: sql`(datetime('now'))`,
    })
    .where(eq(taskSteps.id, stepId))
    .returning();

  return updated;
}

export async function deleteStep(taskId: number, stepId: number) {
  const [existing] = await db
    .select()
    .from(taskSteps)
    .where(and(eq(taskSteps.id, stepId), eq(taskSteps.taskId, taskId)))
    .limit(1);
  if (!existing) throw new Error("Etapa não encontrada");

  await db.delete(taskSteps).where(eq(taskSteps.id, stepId));
  return { ok: true };
}
