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

  const username = body.username.trim();
  const password = body.password;
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const token = await createSessionToken(user.id, user.username);
  const response = NextResponse.json({
    ok: true,
    id: user.id,
    username: user.username,
  });
  attachSessionCookie(response, token);
  // Garante que proxies/browsers não cacheiem a resposta com Set-Cookie
  response.headers.set("Cache-Control", "no-store");
  return response;
}
