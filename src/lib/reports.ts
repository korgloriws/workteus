import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { services, taskStatusEvents, taskSteps, tasks } from "@/db/schema";
import { getPeriodRange } from "./dates";
import { listTasks } from "./tasks";
import { PRIORITY_LABELS, STATUS_LABELS, type PeriodMode, type TaskStatus } from "./types";

export type ReportFormat = "txt" | "pdf" | "csv" | "xlsx";

export type ReportFilters = {
  serviceId?: number | null;
  periodMode?: PeriodMode | "tudo";
  reference?: string;
  status?: TaskStatus | "abertos" | "todos";
  includeCharts?: boolean;
  includeSteps?: boolean;
  includeDeleted?: boolean;
};

export type ReportPayload = {
  generatedAt: string;
  filters: {
    serviceId: number | null;
    serviceName: string;
    periodMode: PeriodMode | "tudo";
    periodLabel: string;
    status: string;
    includeCharts: boolean;
    includeSteps: boolean;
    includeDeleted: boolean;
  };
  summary: {
    total: number;
    byStatus: { status: string; label: string; count: number }[];
    byPriority: { priority: string; label: string; count: number }[];
    byService: { serviceId: number; serviceName: string; count: number }[];
    pauseCount: number;
    deletedCount: number;
    completedCount: number;
    abandonedCount: number;
  };
  tasks: Array<{
    code: string;
    title: string;
    serviceName: string;
    status: string;
    statusLabel: string;
    priority: string;
    priorityLabel: string;
    dueDate: string;
    completedAt: string;
    blockedBy: string;
    notes: string;
    stepsTotal: number;
    stepsDone: number;
    createdAt: string;
    abandonReason: string;
  }>;
  steps: Array<{
    taskCode: string;
    taskTitle: string;
    content: string;
    done: boolean;
    sortOrder: number;
  }>;
};

function countBy<T extends string>(rows: { key: T }[]) {
  const map = new Map<T, number>();
  for (const row of rows) {
    map.set(row.key, (map.get(row.key) || 0) + 1);
  }
  return [...map.entries()].map(([key, count]) => ({ key, count }));
}

export async function buildReport(filters: ReportFilters): Promise<ReportPayload> {
  ensureSchema();

  const periodMode = filters.periodMode || "mes";
  const reference = filters.reference ? new Date(filters.reference) : new Date();
  const status = filters.status || "todos";
  const includeCharts = Boolean(filters.includeCharts);
  const includeSteps = filters.includeSteps !== false;
  const includeDeleted = Boolean(filters.includeDeleted);
  const serviceId = filters.serviceId || null;

  let serviceName = "Todas as pastas";
  if (serviceId) {
    const [service] = await db
      .select()
      .from(services)
      .where(eq(services.id, serviceId))
      .limit(1);
    serviceName = service?.name || `Pasta #${serviceId}`;
  }

  const periodLabel =
    periodMode === "tudo"
      ? "Todo o histórico"
      : getPeriodRange(periodMode, reference).label;

  const taskRows = await listTasks({
    serviceId: serviceId || undefined,
    periodMode: periodMode === "tudo" ? undefined : periodMode,
    reference,
    status,
    includeDeleted,
  });

  const byStatus = countBy(taskRows.map((t) => ({ key: t.status }))).map((row) => ({
    status: row.key,
    label: STATUS_LABELS[row.key as TaskStatus] || row.key,
    count: row.count,
  }));

  const byPriority = countBy(taskRows.map((t) => ({ key: t.priority }))).map((row) => ({
    priority: row.key,
    label: PRIORITY_LABELS[row.key as keyof typeof PRIORITY_LABELS] || row.key,
    count: row.count,
  }));

  const byServiceMap = new Map<number, { serviceName: string; count: number }>();
  for (const task of taskRows) {
    const id = task.serviceId;
    const current = byServiceMap.get(id) || {
      serviceName: task.serviceName || "—",
      count: 0,
    };
    current.count += 1;
    byServiceMap.set(id, current);
  }

  const taskIds = taskRows.map((t) => t.id);
  let pauseCount = 0;
  if (taskIds.length) {
    const [pauseRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(taskStatusEvents)
      .where(
        and(
          eq(taskStatusEvents.toStatus, "pausado"),
          inArray(taskStatusEvents.taskId, taskIds),
        ),
      );
    pauseCount = Number(pauseRow?.count || 0);
  }

  const deletedCount = taskRows.filter((t) => t.deletedAt).length;
  const completedCount = taskRows.filter((t) => t.status === "concluido").length;
  const abandonedCount = taskRows.filter((t) => t.status === "desistido").length;

  const steps: ReportPayload["steps"] = [];
  if (includeSteps && taskIds.length) {
    const stepRows = await db
      .select({
        taskCode: tasks.code,
        taskTitle: tasks.title,
        content: taskSteps.content,
        done: taskSteps.done,
        sortOrder: taskSteps.sortOrder,
      })
      .from(taskSteps)
      .innerJoin(tasks, eq(taskSteps.taskId, tasks.id))
      .where(inArray(taskSteps.taskId, taskIds))
      .orderBy(asc(tasks.code), asc(taskSteps.sortOrder), asc(taskSteps.id));

    for (const step of stepRows) {
      steps.push({
        taskCode: step.taskCode,
        taskTitle: step.taskTitle,
        content: step.content,
        done: Boolean(step.done),
        sortOrder: step.sortOrder,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    filters: {
      serviceId,
      serviceName,
      periodMode,
      periodLabel,
      status,
      includeCharts,
      includeSteps,
      includeDeleted,
    },
    summary: {
      total: taskRows.length,
      byStatus,
      byPriority,
      byService: [...byServiceMap.entries()].map(([id, value]) => ({
        serviceId: id,
        serviceName: value.serviceName,
        count: value.count,
      })),
      pauseCount,
      deletedCount,
      completedCount,
      abandonedCount,
    },
    tasks: taskRows.map((t) => ({
      code: t.code,
      title: t.title,
      serviceName: t.serviceName || "—",
      status: t.status,
      statusLabel: STATUS_LABELS[t.status as TaskStatus] || t.status,
      priority: t.priority,
      priorityLabel: PRIORITY_LABELS[t.priority as keyof typeof PRIORITY_LABELS] || t.priority,
      dueDate: t.dueDate || "",
      completedAt: t.completedAt || "",
      blockedBy: t.blockedBy || "",
      notes: t.notes || "",
      stepsTotal: Number(t.stepsTotal || 0),
      stepsDone: Number(t.stepsDone || 0),
      createdAt: t.createdAt,
      abandonReason: t.abandonReason || "",
    })),
    steps,
  };
}
