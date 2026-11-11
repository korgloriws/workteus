import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PeriodMode } from "./types";

export function periodKeyFromDate(date = new Date()): string {
  return format(date, "yyyy-MM");
}

/** Ex.: 2026-10 → "out/2026" */
export function formatPeriodKeyLabel(periodKey?: string | null): string {
  if (!periodKey || !/^\d{4}-\d{2}$/.test(periodKey)) return periodKey || "";
  try {
    return format(parseISO(`${periodKey}-01T12:00:00`), "MMM/yyyy", { locale: ptBR });
  } catch {
    return periodKey;
  }
}

/** Tarefa aberta cujo periodKey é de outro mês que o mês em tela. */
export function isCarriedOverTask(
  taskPeriodKey?: string | null,
  viewPeriodKey?: string | null,
): boolean {
  return !!viewPeriodKey && !!taskPeriodKey && taskPeriodKey !== viewPeriodKey;
}

/** Texto curto da origem: "De out/2026" */
export function carryOriginLabel(periodKey?: string | null): string {
  const label = formatPeriodKeyLabel(periodKey);
  return label ? `De ${label}` : "De outro mês";
}

export function getPeriodRange(
  mode: PeriodMode,
  reference = new Date(),
): { start: Date; end: Date; label: string } {
  switch (mode) {
    case "dia":
      return {
        start: startOfDay(reference),
        end: endOfDay(reference),
        label: format(reference, "dd/MM/yyyy", { locale: ptBR }),
      };
    case "semana":
      return {
        start: startOfWeek(reference, { weekStartsOn: 1 }),
        end: endOfWeek(reference, { weekStartsOn: 1 }),
        label: `${format(startOfWeek(reference, { weekStartsOn: 1 }), "dd/MM", { locale: ptBR })} – ${format(endOfWeek(reference, { weekStartsOn: 1 }), "dd/MM/yyyy", { locale: ptBR })}`,
      };
    case "ano":
      return {
        start: startOfYear(reference),
        end: endOfYear(reference),
        label: format(reference, "yyyy"),
      };
    case "mes":
    default:
      return {
        start: startOfMonth(reference),
        end: endOfMonth(reference),
        label: format(reference, "MMMM yyyy", { locale: ptBR }),
      };
  }
}

export function toDateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatDisplayDate(value?: string | null): string {
  if (!value) return "—";
  try {
    const normalized =
      value.length === 10
        ? `${value}T12:00:00`
        : value.includes("T")
          ? value
          : value.replace(" ", "T");
    return format(parseISO(normalized), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return value;
  }
}

/** Ex.: 2026-11-11 14:30:00 → "11/11/2026 14:30" */
export function formatDisplayDateTime(value?: string | null): string {
  if (!value) return "—";
  try {
    const normalized = value.includes("T") ? value : value.replace(" ", "T");
    return format(parseISO(normalized), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return value;
  }
}

/** Timestamp local no formato do SQLite (sem timezone). */
export function nowLocalString(date = new Date()): string {
  return format(date, "yyyy-MM-dd HH:mm:ss");
}

export function todayString(): string {
  return toDateString(new Date());
}
