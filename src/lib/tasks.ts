import { and, asc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { services, taskStatusEvents, tasks } from "@/db/schema";
import { nextTaskCode } from "./codes";
import { canTransition } from "./status";
import type { PeriodMode, Priority, TaskStatus } from "./types";
import { normalizeStickyColor } from "./types";
import {
  getPeriodRange,
  nowLocalString,
  periodKeyFromDate,
  todayString,
  toDateString,
} from "./dates";

const OPEN_STATUSES_SQL = sql`${tasks.status} IN ('a_fazer','em_andamento','pausado','pulado')`;

export async function listTasks(opts: {
  serviceId?: number;
  periodMode?: PeriodMode;
  reference?: Date;
  q?: string;
  includeDeleted?: boolean;
  status?: TaskStatus | "abertos" | "todos";
}) {
  const conditions = [];
  const reference = opts.reference ?? new Date();

  if (!opts.includeDeleted) {
    conditions.push(isNull(tasks.deletedAt));
  }

  if (opts.serviceId) {
    conditions.push(eq(tasks.serviceId, opts.serviceId));
  }

  if (opts.periodMode === "mes") {
    // Lista do mês: tudo do periodKey + o que ainda não fechou de meses anteriores.
    // Concluído / desistido NÃO arrastam — ficam só no mês de origem.
    // Abertas (a_fazer, em_andamento, pausado, pulado) seguem mês a mês até resolver.
    const monthKey = periodKeyFromDate(reference);
    conditions.push(
      or(
        eq(tasks.periodKey, monthKey),
        and(sql`${tasks.periodKey} < ${monthKey}`, OPEN_STATUSES_SQL)!,
      )!,
    );
  } else if (opts.periodMode) {
    const range = getPeriodRange(opts.periodMode, reference);
    const start = toDateString(range.start);
    const end = toDateString(range.end);
    conditions.push(
      or(
        and(gte(tasks.createdAt, start), lte(tasks.createdAt, `${end}T23:59:59`)),
        and(gte(tasks.dueDate, start), lte(tasks.dueDate, end)),
        and(gte(tasks.completedAt, start), lte(tasks.completedAt, `${end}T23:59:59`)),
        eq(tasks.periodKey, start.slice(0, 7)),
      )!,
    );
  }

  if (opts.status && opts.status !== "todos") {
    if (opts.status === "abertos") {
      conditions.push(OPEN_STATUSES_SQL);
    } else {
      conditions.push(eq(tasks.status, opts.status));
    }
  }

  if (opts.q?.trim()) {
    const like = `%${opts.q.trim()}%`;
    conditions.push(
      or(
        sql`${tasks.title} LIKE ${like}`,
        sql`${tasks.code} LIKE ${like}`,
        sql`${tasks.notes} LIKE ${like}`,
        sql`${tasks.blockedBy} LIKE ${like}`,
        sql`exists (select 1 from task_steps where task_id = ${tasks.id} and content like ${like})`,
      )!,
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  return db
    .select({
      id: tasks.id,
      serviceId: tasks.serviceId,
      code: tasks.code,
      sequence: tasks.sequence,
      periodKey: tasks.periodKey,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      blockedBy: tasks.blockedBy,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      notes: tasks.notes,
      color: tasks.color,
      link: tasks.link,
      abandonReason: tasks.abandonReason,
      deletedAt: tasks.deletedAt,
      deleteReason: tasks.deleteReason,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      serviceName: services.name,
      serviceColor: services.color,
      serviceCode: services.code,
      stepsTotal: sql<number>`(select count(*) from task_steps where task_id = ${tasks.id})`,
      stepsDone: sql<number>`(select count(*) from task_steps where task_id = ${tasks.id} and done = 1)`,
    })
    .from(tasks)
    .leftJoin(services, eq(tasks.serviceId, services.id))
    .where(where)
    // Fila: ativas (protocolo/createdAt); pausado/pulado no fim (queue_bump_at);
    // concluídas/desistidas depois.
    .orderBy(
      sql`CASE ${tasks.status}
        WHEN 'em_andamento' THEN 0
        WHEN 'a_fazer' THEN 1
        WHEN 'pausado' THEN 2
        WHEN 'pulado' THEN 2
        WHEN 'concluido' THEN 3
        WHEN 'desistido' THEN 4
        ELSE 5
      END`,
      // Arrastadas de outro mês sobem; não usar literal numérico no ORDER BY
      ...(opts.periodMode === "mes"
        ? [
            sql`CASE WHEN ${tasks.periodKey} = ${periodKeyFromDate(reference)} THEN 1 ELSE 0 END`,
          ]
        : []),
      // Ativas: ordem de protocolo. Pausado/pulado: quem foi parado por último fica no fim.
      sql`CASE
        WHEN ${tasks.status} IN ('pausado', 'pulado')
          THEN COALESCE(${tasks.queueBumpAt}, ${tasks.updatedAt}, ${tasks.createdAt})
        ELSE ${tasks.createdAt}
      END`,
      asc(tasks.id),
    );
}

export async function createTask(input: {
  serviceId: number;
  title: string;
  description?: string;
  priority?: Priority;
  blockedBy?: string | null;
  dueDate?: string | null;
  notes?: string;
  color?: string;
  link?: string | null;
}) {
  const [service] = await db
    .select()
    .from(services)
    .where(eq(services.id, input.serviceId))
    .limit(1);
  if (!service) throw new Error("Serviço não encontrado");

  const { code, sequence, periodKey } = await nextTaskCode(service.code, service.id);

  const [task] = await db
    .insert(tasks)
    .values({
      serviceId: service.id,
      code,
      sequence,
      periodKey,
      title: input.title.trim(),
      description: input.description?.trim() || "",
      priority: input.priority || "media",
      blockedBy: input.blockedBy || null,
      dueDate: input.dueDate || null,
      notes: input.notes?.trim() || "",
      color: normalizeStickyColor(input.color),
      link: input.link || null,
      status: "a_fazer",
    })
    .returning();

  await db.insert(taskStatusEvents).values({
    taskId: task.id,
    fromStatus: null,
    toStatus: "a_fazer",
    reason: "Criação",
    createdAt: nowLocalString(),
  });

  return task;
}

export async function updateTask(
  id: number,
  input: Partial<{
    title: string;
    description: string;
    priority: Priority;
    blockedBy: string | null;
    dueDate: string | null;
    notes: string;
    color: string;
    link: string | null;
    serviceId: number;
  }>,
) {
  const [existing] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!existing || existing.deletedAt) throw new Error("Tarefa não encontrada");

  const [updated] = await db
    .update(tasks)
    .set({
      ...("title" in input ? { title: input.title!.trim() } : {}),
      ...("description" in input ? { description: input.description?.trim() || "" } : {}),
      ...("priority" in input ? { priority: input.priority! } : {}),
      ...("blockedBy" in input ? { blockedBy: input.blockedBy ?? null } : {}),
      ...("dueDate" in input ? { dueDate: input.dueDate ?? null } : {}),
      ...("notes" in input ? { notes: input.notes?.trim() || "" } : {}),
      ...("color" in input ? { color: normalizeStickyColor(input.color) } : {}),
      ...("link" in input ? { link: input.link ?? null } : {}),
      ...("serviceId" in input ? { serviceId: input.serviceId! } : {}),
      updatedAt: sql`(datetime('now'))`,
    })
    .where(eq(tasks.id, id))
    .returning();

  return updated;
}

export async function changeTaskStatus(
  id: number,
  toStatus: TaskStatus,
  reason?: string | null,
) {
  const [existing] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!existing || existing.deletedAt) throw new Error("Tarefa não encontrada");

  const from = existing.status as TaskStatus;
  if (!canTransition(from, toStatus)) {
    throw new Error(`Transição inválida: ${from} → ${toStatus}`);
  }

  const at = nowLocalString();
  const patch: Record<string, unknown> = {
    status: toStatus,
    updatedAt: at,
  };

  if (toStatus === "concluido") {
    patch.completedAt = at;
  } else if (from === "concluido") {
    patch.completedAt = null;
  }

  if (toStatus === "desistido") {
    patch.abandonReason = reason || null;
  }

  // Pausar/pular: vai pro fim da fila. Retomar/avançar: volta ao protocolo (createdAt).
  if (toStatus === "pausado" || toStatus === "pulado") {
    patch.queueBumpAt = at;
  } else if (
    toStatus === "a_fazer" ||
    toStatus === "em_andamento" ||
    toStatus === "concluido" ||
    toStatus === "desistido"
  ) {
    patch.queueBumpAt = null;
  }

  if (toStatus === "pausado" && reason) {
    // reason goes to event; blockedBy can also be set by client separately
  }

  const [updated] = await db.update(tasks).set(patch).where(eq(tasks.id, id)).returning();

  await db.insert(taskStatusEvents).values({
    taskId: id,
    fromStatus: from,
    toStatus,
    reason: reason || null,
    createdAt: at,
  });

  return updated;
}

export async function softDeleteTask(id: number, reason?: string | null) {
  const [existing] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!existing || existing.deletedAt) throw new Error("Tarefa não encontrada");

  const at = nowLocalString();
  const [updated] = await db
    .update(tasks)
    .set({
      deletedAt: at,
      deleteReason: reason || null,
      updatedAt: at,
    })
    .where(eq(tasks.id, id))
    .returning();

  await db.insert(taskStatusEvents).values({
    taskId: id,
    fromStatus: existing.status,
    toStatus: "desistido",
    reason: reason ? `Excluído: ${reason}` : "Excluído",
    createdAt: at,
  });

  return updated;
}

export async function getDashboard(reference = new Date()) {
  const today = todayString();
  const monthKey = periodKeyFromDate(reference);
  const currentMonthKey = periodKeyFromDate();
  const isCurrentMonth = monthKey === currentMonthKey;
  const range = getPeriodRange("mes", reference);
  const monthStart = toDateString(range.start);
  const monthEnd = toDateString(range.end);

  // Mesma lógica das pastas: mês escolhido + abertas arrastadas de antes
  const all = await listTasks({
    includeDeleted: false,
    periodMode: "mes",
    reference,
  });

  const openStatuses = new Set(["a_fazer", "em_andamento", "pausado", "pulado"]);

  const overdue = all.filter(
    (t) => t.dueDate && t.dueDate < today && openStatuses.has(t.status),
  );
  // No mês atual: alvo de hoje. Em outros meses: abertas com prazo naquele mês.
  const dueToday = isCurrentMonth
    ? all.filter((t) => t.dueDate === today && openStatuses.has(t.status))
    : all.filter(
        (t) =>
          t.dueDate &&
          t.dueDate >= monthStart &&
          t.dueDate <= monthEnd &&
          openStatuses.has(t.status),
      );
  const paused = all.filter((t) => t.status === "pausado");
  const inProgress = all.filter((t) => t.status === "em_andamento");
  const recentDone = all
    .filter((t) => t.status === "concluido" && t.completedAt)
    .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)))
    .slice(0, 8);

  return {
    monthKey,
    isCurrentMonth,
    overdue,
    dueToday,
    paused,
    inProgress,
    recentDone,
    counts: {
      open: all.filter((t) => openStatuses.has(t.status)).length,
      overdue: overdue.length,
      paused: paused.length,
      doneMonth: all.filter(
        (t) =>
          t.status === "concluido" &&
          t.completedAt &&
          String(t.completedAt).startsWith(monthKey),
      ).length,
    },
  };
}
