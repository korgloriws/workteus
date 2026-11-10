import { ensureSchema } from "@/db/ensure";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import { createStep, listSteps } from "@/lib/steps";

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
  const steps = await listSteps(Number(id));
  return jsonOk(steps);
}

export async function POST(request: Request, ctx: Ctx) {
  ensureSchema();
  try {
    await requireUser();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const { id } = await ctx.params;
  const body = await parseBody<{ content?: string }>(request);
  if (!body.content?.trim()) return jsonError("Conteúdo da etapa é obrigatório");

  try {
    const step = await createStep(Number(id), body.content);
    return jsonOk(step, 201);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Erro ao criar etapa", 400);
  }
}
