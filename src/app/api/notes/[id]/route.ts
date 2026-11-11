import { ensureSchema } from "@/db/ensure";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import {
  archiveStickyNote,
  deleteStickyNote,
  restoreStickyNote,
  updateStickyNote,
} from "@/lib/notes";

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
  const body = await parseBody<{
    title?: string;
    body?: string;
    color?: string;
    pinned?: boolean;
    sensitive?: boolean;
    sortOrder?: number;
    restore?: boolean;
  }>(request);

  try {
    if (body.restore) {
      const row = await restoreStickyNote(Number(id));
      return jsonOk(row);
    }
    const row = await updateStickyNote(Number(id), body);
    return jsonOk(row);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Erro ao atualizar nota", 400);
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
  const { searchParams } = new URL(request.url);
  const hard = searchParams.get("hard") === "1";

  try {
    if (hard) {
      const row = await deleteStickyNote(Number(id));
      return jsonOk(row);
    }
    const row = await archiveStickyNote(Number(id));
    return jsonOk(row);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Erro ao remover nota", 400);
  }
}
