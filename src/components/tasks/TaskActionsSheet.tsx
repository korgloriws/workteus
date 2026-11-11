"use client";

import { useEffect } from "react";
import { Portal } from "@/components/Portal";
import { STATUS_ACTIONS } from "@/lib/status";
import { formatDisplayDateTime, formatPeriodKeyLabel, isCarriedOverTask } from "@/lib/dates";
import { STATUS_LABELS, type TaskStatus } from "@/lib/types";
import type { TaskItem } from "./TaskViews";
import { StatusHistory } from "./StatusHistory";

type Props = {
  open: boolean;
  task: TaskItem | null;
  viewPeriodKey?: string;
  onClose: () => void;
  onStatus: (task: TaskItem, to: TaskStatus) => void;
  onEdit: (task: TaskItem) => void;
  onDelete: (task: TaskItem) => void;
  onSteps: (task: TaskItem) => void;
  onOpenColor?: (task: TaskItem) => void;
};

export function TaskActionsSheet({
  open,
  task,
  viewPeriodKey,
  onClose,
  onStatus,
  onEdit,
  onDelete,
  onSteps,
  onOpenColor,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !task) return null;

  const actions = STATUS_ACTIONS[task.status as TaskStatus] || [];
  const carried = isCarriedOverTask(task.periodKey, viewPeriodKey);

  return (
    <Portal>
      <div className="sheet-backdrop" onClick={onClose}>
        <div className="sheet sheet-up" onClick={(e) => e.stopPropagation()}>
          <div className="sheet-handle" />
          <div className="sheet-head">
            <strong>{task.code}</strong>
            <p className="muted" style={{ margin: "0.25rem 0 0" }}>
              {task.title}
            </p>
            <div className="sheet-head-meta">
              <span className={`status-${task.status}`}>
                {STATUS_LABELS[task.status as TaskStatus]}
              </span>
              {carried ? (
                <span className="carry-chip" title="Ainda aberta — veio de outro mês">
                  Não é deste mês · {formatPeriodKeyLabel(task.periodKey)}
                </span>
              ) : null}
            </div>
            {task.completedAt ? (
              <p className="muted" style={{ margin: "0.45rem 0 0" }}>
                Concluída em {formatDisplayDateTime(task.completedAt)}
              </p>
            ) : null}
          </div>

          <div className="sheet-status-history">
            <strong className="sheet-status-history-title">Histórico</strong>
            <StatusHistory taskId={task.id} />
          </div>

          <div className="sheet-actions">
            {actions.map((a) => (
              <button
                key={a.to}
                type="button"
                className="btn secondary sheet-action"
                onClick={() => {
                  onStatus(task, a.to);
                  onClose();
                }}
              >
                {a.label}
              </button>
            ))}
            <button
              type="button"
              className="btn secondary sheet-action"
              onClick={() => {
                onSteps(task);
                onClose();
              }}
            >
              Etapas
            </button>
            {onOpenColor ? (
              <button
                type="button"
                className="btn secondary sheet-action"
                onClick={() => onOpenColor(task)}
              >
                Cor
              </button>
            ) : null}
            <button
              type="button"
              className="btn secondary sheet-action"
              onClick={() => {
                onEdit(task);
                onClose();
              }}
            >
              Editar
            </button>
            <button
              type="button"
              className="btn danger sheet-action"
              onClick={() => {
                onDelete(task);
                onClose();
              }}
            >
              Excluir
            </button>
            <button type="button" className="btn ghost sheet-action" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
