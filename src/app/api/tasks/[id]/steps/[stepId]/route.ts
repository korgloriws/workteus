import { ensureSchema } from "@/db/ensure";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import { deleteStep, updateStep } from "@/lib/steps";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; stepId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  ensureSchema();
  try {
    await requireUser();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const { id, stepId } = await ctx.params;
  const body = await parseBody<{ content?: string; done?: boolean; sortOrder?: number }>(request);

  try {
    const step = await updateStep(Number(id), Number(stepId), body);
    return jsonOk(step);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Erro ao atualizar etapa", 400);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  ensureSchema();
  try {
    await requireUser();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const { id, stepId } = await ctx.params;
  try {
    await deleteStep(Number(id), Number(stepId));
    return jsonOk({ ok: true });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Erro ao excluir etapa", 400);
  }
}
