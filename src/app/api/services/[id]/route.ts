import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { services } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import { serviceCodeFromName, slugify } from "@/lib/codes";

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
  const [row] = await db
    .select()
    .from(services)
    .where(eq(services.id, Number(id)))
    .limit(1);
  if (!row) return jsonError("Serviço não encontrado", 404);
  return jsonOk(row);
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
    name?: string;
    code?: string;
    color?: string;
    sortOrder?: number;
  }>(request);

  const [existing] = await db
    .select()
    .from(services)
    .where(eq(services.id, Number(id)))
    .limit(1);
  if (!existing) return jsonError("Serviço não encontrado", 404);

  const name = body.name?.trim() || existing.name;
  const patch = {
    name,
    slug: body.name ? slugify(name) : existing.slug,
    code: body.code
      ? body.code.toUpperCase().slice(0, 6)
      : body.name
        ? serviceCodeFromName(name)
        : existing.code,
    color: body.color || existing.color,
    sortOrder: body.sortOrder ?? existing.sortOrder,
    updatedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
  };

  const [row] = await db
    .update(services)
    .set(patch)
    .where(eq(services.id, Number(id)))
    .returning();

  return jsonOk(row);
}

export async function DELETE(_request: Request, ctx: Ctx) {
  ensureSchema();
  try {
    await requireUser();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const { id } = await ctx.params;
  const [existing] = await db
    .select()
    .from(services)
    .where(eq(services.id, Number(id)))
    .limit(1);
  if (!existing) return jsonError("Serviço não encontrado", 404);

  await db.delete(services).where(eq(services.id, Number(id)));
  return jsonOk({ ok: true });
}
