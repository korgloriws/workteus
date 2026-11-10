import type { TaskStatus } from "./types";

const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  a_fazer: ["em_andamento", "pulado", "desistido"],
  em_andamento: ["pausado", "concluido", "desistido", "pulado"],
  pausado: ["em_andamento", "desistido"],
  pulado: ["a_fazer", "em_andamento", "desistido"],
  concluido: ["a_fazer"],
  desistido: ["a_fazer"],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return false;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function allowedTransitions(from: TaskStatus): TaskStatus[] {
  return TRANSITIONS[from] ?? [];
}

export const STATUS_ACTIONS: Partial<
  Record<TaskStatus, { label: string; to: TaskStatus }[]>
> = {
  a_fazer: [
    { label: "Iniciar", to: "em_andamento" },
    { label: "Pular", to: "pulado" },
    { label: "Desistir", to: "desistido" },
  ],
  em_andamento: [
    { label: "Pausar", to: "pausado" },
    { label: "Concluir", to: "concluido" },
    { label: "Pular", to: "pulado" },
    { label: "Desistir", to: "desistido" },
  ],
  pausado: [
    { label: "Retomar", to: "em_andamento" },
    { label: "Desistir", to: "desistido" },
  ],
  pulado: [
    { label: "Retornar", to: "a_fazer" },
    { label: "Iniciar", to: "em_andamento" },
    { label: "Desistir", to: "desistido" },
  ],
  concluido: [{ label: "Reabrir", to: "a_fazer" }],
  desistido: [{ label: "Reabrir", to: "a_fazer" }],
};
