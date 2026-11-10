import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { services, viewPreferences } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import { serviceCodeFromName, slugify } from "@/lib/codes";

export const runtime = "nodejs";

export async function GET() {
  ensureSchema();
  try {
    await requireUser();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const rows = await db.select().from(services).orderBy(asc(services.sortOrder), asc(services.name));
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
    name?: string;
    code?: string;
    color?: string;
    sortOrder?: number;
  }>(request);

  if (!body.name?.trim()) return jsonError("Nome é obrigatório");

  const name = body.name.trim();
  let slug = slugify(name);
  let code = (body.code || serviceCodeFromName(name)).toUpperCase().slice(0, 6);

  const existingSlug = await db.select().from(services).where(eq(services.slug, slug)).limit(1);
  if (existingSlug.length) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const existingCode = await db.select().from(services).where(eq(services.code, code)).limit(1);
  if (existingCode.length) code = `${code}${Date.now().toString(36).slice(-2)}`.slice(0, 6).toUpperCase();

  const maxSort = await db.select().from(services);
  const sortOrder = body.sortOrder ?? maxSort.length + 1;

  const [row] = await db
    .insert(services)
    .values({
      name,
      slug,
      code,
      color: body.color || "#1a1a1a",
      sortOrder,
    })
    .returning();

  await db.insert(viewPreferences).values({
    serviceId: row.id,
    viewMode: "lista",
    periodMode: "mes",
  });

  return jsonOk(row, 201);
}
