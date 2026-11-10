import { ensureSchema } from "@/db/ensure";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import { createTask, listTasks } from "@/lib/tasks";
import type { PeriodMode, Priority, TaskStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  ensureSchema();
  try {
    await requireUser();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId");
  const periodMode = searchParams.get("periodMode") as PeriodMode | null;
  const q = searchParams.get("q") || undefined;
  const status = (searchParams.get("status") as TaskStatus | "abertos" | "todos" | null) || "todos";
  const ref = searchParams.get("ref");
  const includeDeleted = searchParams.get("includeDeleted") === "1";

  const rows = await listTasks({
    serviceId: serviceId ? Number(serviceId) : undefined,
    periodMode: periodMode || undefined,
    reference: ref ? new Date(ref) : new Date(),
    q,
    status,
    includeDeleted,
  });

  return jsonOk(rows);
}

export async function POST(request: Request) {
  ensureSchema();
  try {
    await requireUser();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const body = await parseBody<{
    serviceId?: number;
    title?: string;
    description?: string;
    priority?: Priority;
    blockedBy?: string | null;
    dueDate?: string | null;
    notes?: string;
    color?: string;
    link?: string | null;
  }>(request);

  if (!body.serviceId || !body.title?.trim()) {
    return jsonError("serviceId e title são obrigatórios");
  }

  try {
    const task = await createTask({
      serviceId: body.serviceId,
      title: body.title,
      description: body.description,
      priority: body.priority,
      blockedBy: body.blockedBy,
      dueDate: body.dueDate,
      notes: body.notes,
      color: body.color,
      link: body.link,
    });
    return jsonOk(task, 201);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Erro ao criar tarefa", 400);
  }
}
