export const TASK_STATUSES = [
  "a_fazer",
  "em_andamento",
  "pausado",
  "pulado",
  "concluido",
  "desistido",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITIES = ["alta", "media", "baixa"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const VIEW_MODES = ["lista", "tabela", "calendario"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export const PERIOD_MODES = ["dia", "semana", "mes", "ano"] as const;
export type PeriodMode = (typeof PERIOD_MODES)[number];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  pausado: "Pausado",
  pulado: "Pulado",
  concluido: "Concluído",
  desistido: "Desistido",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

/** Paleta clássica de post-its de escritório */
export const STICKY_COLORS = [
  { id: "amarelo", value: "#fff4a3", glue: "#f0e48a", label: "Amarelo" },
  { id: "azul", value: "#d7e8f8", glue: "#c5d8eb", label: "Azul" },
  { id: "rosa", value: "#f8d5d0", glue: "#eac0ba", label: "Rosa" },
  { id: "verde", value: "#dcecd8", glue: "#c9dfc4", label: "Verde" },
  { id: "laranja", value: "#ffe0b2", glue: "#f0c890", label: "Laranja" },
  { id: "lilas", value: "#e6d5f0", glue: "#d4c0e4", label: "Lilás" },
  { id: "branco", value: "#f5f2ea", glue: "#e5e0d4", label: "Branco" },
] as const;

export type StickyColorValue = (typeof STICKY_COLORS)[number]["value"];

export const DEFAULT_STICKY_COLOR = STICKY_COLORS[0].value;

export function stickyGlueFor(color: string | null | undefined) {
  const found = STICKY_COLORS.find(
    (c) => c.value.toLowerCase() === String(color || "").toLowerCase(),
  );
  return found?.glue || STICKY_COLORS[0].glue;
}

export function normalizeStickyColor(color: string | null | undefined) {
  const found = STICKY_COLORS.find(
    (c) => c.value.toLowerCase() === String(color || "").toLowerCase(),
  );
  return found?.value || DEFAULT_STICKY_COLOR;
}
