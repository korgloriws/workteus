import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeJwt } from "jose";

const PUBLIC = ["/login", "/manifest.webmanifest", "/sw.js"];

/**
 * Middleware só confere presença/expiração do cookie.
 * A assinatura JWT é validada no Node (layout/API) com o AUTH_SECRET de runtime —
 * no Edge o secret do build pode divergir do secret do container e bloquear o login
 * sem mensagem de erro.
 */
function hasUsableSession(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const payload = decodeJwt(token);
    if (payload.exp && payload.exp * 1000 < Date.now()) return false;
    return Boolean(payload.sub);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/favicon.ico" ||
    PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`) || pathname === p)
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth/login") || pathname.startsWith("/api/auth/logout")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("workteus_session")?.value;
  const ok = hasUsableSession(token);

  if (!ok) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (pathname === "/login") {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname === "/" ? "/dashboard" : pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
