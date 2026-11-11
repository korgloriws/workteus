import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { services, stickyNotes, taskStatusEvents, tasks } from "@/db/schema";
import {
  formatPeriodKeyLabel,
  getPeriodRange,
  periodKeyFromDate,
  toDateString,
} from "./dates";

const OPEN_SQL = sql`${tasks.status} IN ('a_fazer','em_andamento','pausado','pulado')`;

function monthKeysAround(reference: Date, monthsBack = 11) {
  const keys: string[] = [];
  const y = reference.getFullYear();
  const m = reference.getMonth(); // 0-11
  for (let i = monthsBack; i >= 0; i--) {
    const d = new Date(y, m - i, 1);
    keys.push(periodKeyFromDate(d));
  }
  return keys;
}

export async function getStats(opts?: { serviceId?: number; reference?: Date }) {
  const reference = opts?.reference ?? new Date();
  const serviceId = opts?.serviceId;
  const monthKey = periodKeyFromDate(reference);
  const currentMonthKey = periodKeyFromDate();
  const range = getPeriodRange("mes", reference);
  const monthStart = toDateString(range.start);
  const monthEnd = toDateString(range.end);
  const monthLabel = range.label;

  const notDeleted = isNull(tasks.deletedAt);
  const serviceClause = serviceId ? eq(tasks.serviceId, serviceId) : sql`1=1`;

  // Mesma lógica das pastas: do mês + abertas arrastadas
  const monthScope = and(
    notDeleted,
    serviceClause,
    or(eq(tasks.periodKey, monthKey), and(sql`${tasks.periodKey} < ${monthKey}`, OPEN_SQL)),
  );

  const ofMonthScope = and(notDeleted, serviceClause, eq(tasks.periodKey, monthKey));

  const byStatus = await db
    .select({ status: tasks.status, count: sql<number>`count(*)` })
    .from(tasks)
    .where(monthScope)
    .groupBy(tasks.status);

  const byPriority = await db
    .select({ priority: tasks.priority, count: sql<number>`count(*)` })
    .from(tasks)
    .where(monthScope)
    .groupBy(tasks.priority);

  const byService = await db
    .select({
      serviceId: tasks.serviceId,
      serviceName: services.name,
      color: services.color,
      count: sql<number>`count(*)`,
    })
    .from(tasks)
    .leftJoin(services, eq(tasks.serviceId, services.id))
    .where(monthScope)
    .groupBy(tasks.serviceId, services.name, services.color);

  const completedInMonth = await db
    .select({
      day: sql<string>`substr(${tasks.completedAt}, 1, 10)`,
      count: sql<number>`count(*)`,
    })
    .from(tasks)
    .where(
      and(
        notDeleted,
        serviceClause,
        eq(tasks.status, "concluido"),
        sql`${tasks.completedAt} IS NOT NULL`,
        gte(sql`substr(${tasks.completedAt}, 1, 10)`, monthStart),
        lte(sql`substr(${tasks.completedAt}, 1, 10)`, monthEnd),
      ),
    )
    .groupBy(sql`substr(${tasks.completedAt}, 1, 10)`)
    .orderBy(sql`substr(${tasks.completedAt}, 1, 10)`);

  const abandonments = await db
    .select({
      day: sql<string>`substr(${tasks.updatedAt}, 1, 10)`,
      count: sql<number>`count(*)`,
    })
    .from(tasks)
    .where(
      and(
        notDeleted,
        serviceClause,
        eq(tasks.status, "desistido"),
        eq(tasks.periodKey, monthKey),
      ),
    )
    .groupBy(sql`substr(${tasks.updatedAt}, 1, 10)`)
    .orderBy(sql`substr(${tasks.updatedAt}, 1, 10)`);

  const pauseEvents = await db
    .select({ count: sql<number>`count(*)` })
    .from(taskStatusEvents)
    .innerJoin(tasks, eq(taskStatusEvents.taskId, tasks.id))
    .where(
      and(
        eq(taskStatusEvents.toStatus, "pausado"),
        notDeleted,
        serviceClause,
        gte(sql`substr(${taskStatusEvents.createdAt}, 1, 10)`, monthStart),
        lte(sql`substr(${taskStatusEvents.createdAt}, 1, 10)`, monthEnd),
      ),
    );

  const deleted = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(
      and(
        sql`${tasks.deletedAt} IS NOT NULL`,
        serviceClause,
        gte(sql`substr(${tasks.deletedAt}, 1, 10)`, monthStart),
        lte(sql`substr(${tasks.deletedAt}, 1, 10)`, monthEnd),
      ),
    );

  const summaryRows = await db
    .select({
      total: sql<number>`count(*)`,
      ofMonth: sql<number>`sum(case when ${tasks.periodKey} = ${monthKey} then 1 else 0 end)`,
      carryIn: sql<number>`sum(case when ${tasks.periodKey} < ${monthKey} then 1 else 0 end)`,
      open: sql<number>`sum(case when ${tasks.status} in ('a_fazer','em_andamento','pausado','pulado') then 1 else 0 end)`,
      completed: sql<number>`sum(case when ${tasks.status} = 'concluido' then 1 else 0 end)`,
      abandoned: sql<number>`sum(case when ${tasks.status} = 'desistido' then 1 else 0 end)`,
      paused: sql<number>`sum(case when ${tasks.status} = 'pausado' then 1 else 0 end)`,
      skipped: sql<number>`sum(case when ${tasks.status} = 'pulado' then 1 else 0 end)`,
      inProgress: sql<number>`sum(case when ${tasks.status} = 'em_andamento' then 1 else 0 end)`,
    })
    .from(tasks)
    .where(monthScope);

  const ofMonthDone = await db
    .select({
      completed: sql<number>`sum(case when ${tasks.status} = 'concluido' then 1 else 0 end)`,
      total: sql<number>`count(*)`,
    })
    .from(tasks)
    .where(ofMonthScope);

  const s = summaryRows[0];
  const ofMonthTotal = Number(ofMonthDone[0]?.total ?? 0);
  const ofMonthCompleted = Number(ofMonthDone[0]?.completed ?? 0);
  const completionRate =
    ofMonthTotal > 0 ? Math.round((ofMonthCompleted / ofMonthTotal) * 100) : 0;

  // Demanda por mês (últimos 12) — tamanho da fila criada em cada period_key
  const keys = monthKeysAround(reference, 11);
  const firstKey = keys[0];
  const demandRows = await db
    .select({
      month: tasks.periodKey,
      created: sql<number>`count(*)`,
      completed: sql<number>`sum(case when ${tasks.status} = 'concluido' then 1 else 0 end)`,
      open: sql<number>`sum(case when ${tasks.status} in ('a_fazer','em_andamento','pausado','pulado') then 1 else 0 end)`,
      abandoned: sql<number>`sum(case when ${tasks.status} = 'desistido' then 1 else 0 end)`,
    })
    .from(tasks)
    .where(
      and(
        notDeleted,
        serviceClause,
        gte(tasks.periodKey, firstKey),
        lte(tasks.periodKey, monthKey),
      ),
    )
    .groupBy(tasks.periodKey)
    .orderBy(tasks.periodKey);

  const demandMap = new Map(
    demandRows.map((r) => [
      r.month,
      {
        created: Number(r.created),
        completed: Number(r.completed),
        open: Number(r.open),
        abandoned: Number(r.abandoned),
      },
    ]),
  );

  const notesByMonthRows = await db
    .select({
      month: sql<string>`substr(${stickyNotes.createdAt}, 1, 7)`,
      count: sql<number>`count(*)`,
    })
    .from(stickyNotes)
    .where(
      and(
        isNull(stickyNotes.archivedAt),
        gte(sql`substr(${stickyNotes.createdAt}, 1, 7)`, firstKey),
        lte(sql`substr(${stickyNotes.createdAt}, 1, 7)`, monthKey),
      ),
    )
    .groupBy(sql`substr(${stickyNotes.createdAt}, 1, 7)`);

  const notesMap = new Map(notesByMonthRows.map((r) => [r.month, Number(r.count)]));

  const demandByMonth = keys.map((month) => {
    const row = demandMap.get(month) || { created: 0, completed: 0, open: 0, abandoned: 0 };
    return {
      month,
      label: formatPeriodKeyLabel(month),
      created: row.created,
      completed: row.completed,
      open: row.open,
      abandoned: row.abandoned,
      notes: notesMap.get(month) || 0,
    };
  });

  const notesInMonth = notesMap.get(monthKey) || 0;

  return {
    monthKey,
    monthLabel,
    isCurrentMonth: monthKey === currentMonthKey,
    summary: {
      total: Number(s?.total ?? 0),
      ofMonth: Number(s?.ofMonth ?? 0),
      carryIn: Number(s?.carryIn ?? 0),
      open: Number(s?.open ?? 0),
      completed: Number(s?.completed ?? 0),
      abandoned: Number(s?.abandoned ?? 0),
      paused: Number(s?.paused ?? 0),
      skipped: Number(s?.skipped ?? 0),
      inProgress: Number(s?.inProgress ?? 0),
      completionRate,
      notesInMonth,
      pauseEvents: Number(pauseEvents[0]?.count ?? 0),
      deletedCount: Number(deleted[0]?.count ?? 0),
    },
    byStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
    byPriority: byPriority.map((r) => ({ priority: r.priority, count: Number(r.count) })),
    byService: byService.map((r) => ({
      serviceId: r.serviceId,
      serviceName: r.serviceName,
      color: r.color,
      count: Number(r.count),
    })),
    demandByMonth,
    completedOverTime: completedInMonth.map((r) => ({
      day: r.day,
      count: Number(r.count),
    })),
    abandonments: abandonments.map((r) => ({ day: r.day, count: Number(r.count) })),
    pauseCount: Number(pauseEvents[0]?.count ?? 0),
    deletedCount: Number(deleted[0]?.count ?? 0),
  };
}
