import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { users } from "@/db/schema";
import { createSession, verifyPassword } from "@/lib/auth";
import { jsonError, jsonOk, parseBody } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  ensureSchema();
  const body = await parseBody<{ username?: string; password?: string }>(request);
  if (!body.username || !body.password) {
    return jsonError("Usuário e senha são obrigatórios");
  }

  const [user] = await db.select().from(users).where(eq(users.username, body.username)).limit(1);
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    return jsonError("Credenciais inválidas", 401);
  }

  await createSession(user.id, user.username);
  return jsonOk({ id: user.id, username: user.username });
}
