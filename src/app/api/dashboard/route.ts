import { ensureSchema } from "@/db/ensure";
import { requireUser } from "@/lib/auth";
import { jsonOk } from "@/lib/api";
import { getDashboard } from "@/lib/tasks";

export const runtime = "nodejs";

export async function GET() {
  ensureSchema();
  try {
    await requireUser();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const data = await getDashboard();
  return jsonOk(data);
}
