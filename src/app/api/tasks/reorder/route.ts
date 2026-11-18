import { ensureSchema } from "@/db/ensure";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import { reorderTasks } from "@/lib/tasks";

export const runtime = "nodejs";

export async function POST(request: Request) {
  ensureSchema();
  try {
    await requireUser();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const body = await parseBody<{ orderedIds?: number[] }>(request);
  const orderedIds = Array.isArray(body.orderedIds)
    ? body.orderedIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
    : [];

  if (orderedIds.length < 2) {
    return jsonError("Informe ao menos 2 demandas para reordenar", 400);
  }

  try {
    const result = await reorderTasks(orderedIds);
    return jsonOk(result);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Erro ao reordenar", 400);
  }
}
