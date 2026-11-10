import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { NextResponse } from "next/server";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { users } from "@/db/schema";

export const COOKIE_NAME = "workteus_session";
const SESSION_DAYS = 30;

function secretKey() {
  const secret = process.env.AUTH_SECRET || "workteus-dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

/** Em HTTP (IP:porta na VPS) o cookie Secure é ignorado pelo browser. */
function cookieSecure() {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  return false;
}

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: cookieSecure(),
    path: "/",
    maxAge,
  };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(userId: number, username: string) {
  return new SignJWT({ sub: String(userId), username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

export async function createSession(userId: number, username: string) {
  const token = await createSessionToken(userId, username);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, sessionCookieOptions(SESSION_DAYS * 24 * 60 * 60));
}

export function attachSessionCookie(
  response: NextResponse,
  token: string,
) {
  response.cookies.set(
    COOKIE_NAME,
    token,
    sessionCookieOptions(SESSION_DAYS * 24 * 60 * 60),
  );
  return response;
}

export async function destroySession() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", sessionCookieOptions(0));
}

export async function getSessionUser() {
  ensureSchema();
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    const userId = Number(payload.sub);
    if (!userId) return null;
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return null;
    return { id: user.id, username: user.username };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}
