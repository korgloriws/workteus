import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { viewPreferences } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import { PERIOD_MODES, VIEW_MODES, type PeriodMode, type ViewMode } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ serviceId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  ensureSchema();
  try {
    await requireUser();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const { serviceId } = await ctx.params;
  const [row] = await db
    .select()
    .from(viewPreferences)
    .where(eq(viewPreferences.serviceId, Number(serviceId)))
    .limit(1);

  return jsonOk(
    row || {
      serviceId: Number(serviceId),
      viewMode: "lista",
      periodMode: "mes",
    },
  );
}

export async function PUT(request: Request, ctx: Ctx) {
  ensureSchema();
  try {
    await requireUser();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const { serviceId } = await ctx.params;
  const body = await parseBody<{ viewMode?: ViewMode; periodMode?: PeriodMode }>(request);

  if (body.viewMode && !VIEW_MODES.includes(body.viewMode)) {
    return jsonError("viewMode inválido");
  }
  if (body.periodMode && !PERIOD_MODES.includes(body.periodMode)) {
    return jsonError("periodMode inválido");
  }

  const sid = Number(serviceId);
  const [existing] = await db
    .select()
    .from(viewPreferences)
    .where(eq(viewPreferences.serviceId, sid))
    .limit(1);

  if (existing) {
    const [row] = await db
      .update(viewPreferences)
      .set({
        viewMode: body.viewMode || existing.viewMode,
        periodMode: body.periodMode || existing.periodMode,
        updatedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
      })
      .where(eq(viewPreferences.serviceId, sid))
      .returning();
    return jsonOk(row);
  }

  const [row] = await db
    .insert(viewPreferences)
    .values({
      serviceId: sid,
      viewMode: body.viewMode || "lista",
      periodMode: body.periodMode || "mes",
    })
    .returning();

  return jsonOk(row);
}
