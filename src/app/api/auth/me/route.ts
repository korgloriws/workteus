import { getSessionUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureSchema } from "@/db/ensure";

export const runtime = "nodejs";

export async function GET() {
  ensureSchema();
  const user = await getSessionUser();
  if (!user) return jsonError("Não autenticado", 401);
  return jsonOk(user);
}
