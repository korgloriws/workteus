import { ensureSchema } from "@/db/ensure";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import { changeTaskStatus } from "@/lib/tasks";
import type { TaskStatus } from "@/lib/types";
import { TASK_STATUSES } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  ensureSchema();
  try {
    await requireUser();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const { id } = await ctx.params;
  const body = await parseBody<{ status?: TaskStatus; reason?: string | null; blockedBy?: string | null }>(
    request,
  );

  if (!body.status || !TASK_STATUSES.includes(body.status)) {
    return jsonError("Status inválido");
  }

  try {
    if (body.blockedBy !== undefined) {
      const { updateTask } = await import("@/lib/tasks");
      await updateTask(Number(id), { blockedBy: body.blockedBy });
    }
    const updated = await changeTaskStatus(Number(id), body.status, body.reason);
    return jsonOk(updated);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Erro ao mudar status", 400);
  }
}
