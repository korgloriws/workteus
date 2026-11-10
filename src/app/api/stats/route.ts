import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { services, taskStatusEvents, tasks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { jsonOk } from "@/lib/api";

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

  const baseWhere = serviceId
    ? and(isNull(tasks.deletedAt), eq(tasks.serviceId, Number(serviceId)))
    : isNull(tasks.deletedAt);

  const byStatus = await db
    .select({
      status: tasks.status,
      count: sql<number>`count(*)`,
    })
    .from(tasks)
    .where(baseWhere)
    .groupBy(tasks.status);

  const byPriority = await db
    .select({
      priority: tasks.priority,
      count: sql<number>`count(*)`,
    })
    .from(tasks)
    .where(baseWhere)
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
    .where(isNull(tasks.deletedAt))
    .groupBy(tasks.serviceId, services.name, services.color);

  const completedOverTime = await db
    .select({
      day: sql<string>`substr(${tasks.completedAt}, 1, 10)`,
      count: sql<number>`count(*)`,
    })
    .from(tasks)
    .where(
      and(
        baseWhere,
        eq(tasks.status, "concluido"),
        sql`${tasks.completedAt} IS NOT NULL`,
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
    .where(and(baseWhere, eq(tasks.status, "desistido")))
    .groupBy(sql`substr(${tasks.updatedAt}, 1, 10)`)
    .orderBy(sql`substr(${tasks.updatedAt}, 1, 10)`);

  const pauseEvents = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(taskStatusEvents)
    .innerJoin(tasks, eq(taskStatusEvents.taskId, tasks.id))
    .where(
      and(
        eq(taskStatusEvents.toStatus, "pausado"),
        isNull(tasks.deletedAt),
        serviceId ? eq(tasks.serviceId, Number(serviceId)) : sql`1=1`,
      ),
    );

  const deleted = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(tasks)
    .where(
      and(
        sql`${tasks.deletedAt} IS NOT NULL`,
        serviceId ? eq(tasks.serviceId, Number(serviceId)) : sql`1=1`,
      ),
    );

  return jsonOk({
    byStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
    byPriority: byPriority.map((r) => ({ priority: r.priority, count: Number(r.count) })),
    byService: byService.map((r) => ({
      serviceId: r.serviceId,
      serviceName: r.serviceName,
      color: r.color,
      count: Number(r.count),
    })),
    completedOverTime: completedOverTime.map((r) => ({
      day: r.day,
      count: Number(r.count),
    })),
    abandonments: abandonments.map((r) => ({ day: r.day, count: Number(r.count) })),
    pauseCount: Number(pauseEvents[0]?.count ?? 0),
    deletedCount: Number(deleted[0]?.count ?? 0),
  });
}
