import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { users } from "@/db/schema";
import {
  attachSessionCookie,
  createSessionToken,
  verifyPassword,
} from "@/lib/auth";
import { parseBody } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  ensureSchema();
  const body = await parseBody<{ username?: string; password?: string }>(request);
  if (!body.username || !body.password) {
    return NextResponse.json(
      { error: "Usuário e senha são obrigatórios" },
      { status: 400 },
    );
  }

  const [user] = await db.select().from(users).where(eq(users.username, body.username)).limit(1);
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const token = await createSessionToken(user.id, user.username);
  const response = NextResponse.json({
    id: user.id,
    username: user.username,
  });
  attachSessionCookie(response, token);
  return response;
}
