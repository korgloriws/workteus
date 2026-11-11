import { ensureSchema } from "@/db/ensure";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import { createStickyNote, listStickyNotes } from "@/lib/notes";

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
  const q = searchParams.get("q") || undefined;
  const scope = searchParams.get("scope") === "archived" ? "archived" : "active";

  try {
    const rows = await listStickyNotes({ q, scope });
    return jsonOk(rows);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Erro ao listar notas", 500);
  }
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
    title?: string;
    body?: string;
    color?: string;
    pinned?: boolean;
    sensitive?: boolean;
  }>(request);

  try {
    const row = await createStickyNote(body);
    return jsonOk(row, 201);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Erro ao criar nota", 400);
  }
}
