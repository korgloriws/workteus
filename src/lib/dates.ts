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
    return format(parseISO(value.length === 10 ? `${value}T12:00:00` : value), "dd/MM/yyyy", {
      locale: ptBR,
    });
  } catch {
    return value;
  }
}

export function todayString(): string {
  return toDateString(new Date());
}
