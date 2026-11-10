import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { taskStatusEvents, tasks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import { softDeleteTask, updateTask } from "@/lib/tasks";
import type { Priority } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  ensureSchema();
  try {
    await requireUser();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const { id } = await ctx.params;
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, Number(id)))
    .limit(1);
  if (!task) return jsonError("Tarefa não encontrada", 404);

  const events = await db
    .select()
    .from(taskStatusEvents)
    .where(eq(taskStatusEvents.taskId, Number(id)))
    .orderBy(asc(taskStatusEvents.createdAt));

  return jsonOk({ ...task, events });
}

export async function PATCH(request: Request, ctx: Ctx) {
  ensureSchema();
  try {
    await requireUser();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const { id } = await ctx.params;
  const body = await parseBody<{
    title?: string;
    description?: string;
    priority?: Priority;
    blockedBy?: string | null;
    dueDate?: string | null;
    notes?: string;
    link?: string | null;
    serviceId?: number;
  }>(request);

  try {
    const updated = await updateTask(Number(id), body);
    return jsonOk(updated);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Erro ao atualizar", 400);
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  ensureSchema();
  try {
    await requireUser();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const { id } = await ctx.params;
  const body = await parseBody<{ reason?: string }>(request).catch(() => ({ reason: undefined }));

  try {
    const updated = await softDeleteTask(Number(id), body.reason);
    return jsonOk(updated);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Erro ao excluir", 400);
  }
}
