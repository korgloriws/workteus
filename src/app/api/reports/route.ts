import { ensureSchema } from "@/db/ensure";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import { buildReport, type ReportFilters } from "@/lib/reports";
import type { PeriodMode, TaskStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  ensureSchema();
  try {
    await requireUser();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const body = await parseBody<{
    serviceId?: number | null;
    periodMode?: PeriodMode | "tudo";
    reference?: string;
    status?: TaskStatus | "abertos" | "todos";
    includeCharts?: boolean;
    includeSteps?: boolean;
    includeDeleted?: boolean;
  }>(request);

  const filters: ReportFilters = {
    serviceId: body.serviceId ?? null,
    periodMode: body.periodMode || "mes",
    reference: body.reference,
    status: body.status || "todos",
    includeCharts: Boolean(body.includeCharts),
    includeSteps: body.includeSteps !== false,
    includeDeleted: Boolean(body.includeDeleted),
  };

  try {
    const report = await buildReport(filters);
    return jsonOk(report);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Erro ao montar relatório", 400);
  }
}
