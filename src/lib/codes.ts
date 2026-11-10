import { and, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { periodKeyFromDate } from "./dates";

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export function serviceCodeFromName(name: string): string {
  const parts = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);

  if (parts.length === 0) return "SRV";
  if (parts.length === 1) return parts[0].slice(0, 4);
  return parts
    .map((p) => p[0])
    .join("")
    .slice(0, 4);
}

export async function nextTaskCode(serviceCode: string, serviceId: number, date = new Date()) {
  const periodKey = periodKeyFromDate(date);
  const [row] = await db
    .select({ maxSeq: max(tasks.sequence) })
    .from(tasks)
    .where(and(eq(tasks.serviceId, serviceId), eq(tasks.periodKey, periodKey)));

  const sequence = (row?.maxSeq ?? 0) + 1;
  const padded = String(sequence).padStart(3, "0");
  const code = `${serviceCode}-${periodKey}-#${padded}`;
  return { code, sequence, periodKey };
}
