import { ensureSchema } from "@/db/ensure";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { getStats } from "@/lib/stats";

export const runtime = "nodejs";

export async function GET(request: Request) {
  ensureSchema();
  try {
    await requireUser();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId");
  const ref = searchParams.get("ref");
  const reference = ref ? new Date(`${ref}T12:00:00`) : new Date();
  if (Number.isNaN(reference.getTime())) {
    return jsonError("ref inválida");
  }

  try {
    const data = await getStats({
      serviceId: serviceId ? Number(serviceId) : undefined,
      reference,
    });
    return jsonOk(data);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Erro ao montar estatísticas", 500);
  }
}
