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
