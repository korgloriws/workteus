import type { TaskStatus } from "./types";

const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  a_fazer: ["em_andamento", "concluido", "pulado", "desistido"],
  em_andamento: ["concluido", "pausado", "pulado", "desistido"],
  pausado: ["em_andamento", "concluido", "desistido"],
  pulado: ["a_fazer", "em_andamento", "concluido", "desistido"],
  concluido: ["a_fazer", "em_andamento"],
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
    { label: "Concluir", to: "concluido" },
    { label: "Pular", to: "pulado" },
    { label: "Desistir", to: "desistido" },
  ],
  em_andamento: [
    { label: "Concluir", to: "concluido" },
    { label: "Pausar", to: "pausado" },
    { label: "Pular", to: "pulado" },
    { label: "Desistir", to: "desistido" },
  ],
  pausado: [
    { label: "Retomar", to: "em_andamento" },
    { label: "Concluir", to: "concluido" },
    { label: "Desistir", to: "desistido" },
  ],
  pulado: [
    { label: "Retornar", to: "a_fazer" },
    { label: "Iniciar", to: "em_andamento" },
    { label: "Concluir", to: "concluido" },
    { label: "Desistir", to: "desistido" },
  ],
  concluido: [
    { label: "Retomar", to: "a_fazer" },
    { label: "Em andamento", to: "em_andamento" },
  ],
  desistido: [{ label: "Retomar", to: "a_fazer" }],
};
