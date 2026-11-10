"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Portal } from "@/components/Portal";
import { api } from "@/lib/client";

export type TaskStep = {
  id: number;
  taskId: number;
  content: string;
  done: boolean;
  sortOrder: number;
};

type Props = {
  open: boolean;
  taskId: number;
  taskCode: string;
  taskTitle: string;
  onClose: () => void;
  onChanged?: () => void;
};

export function TaskStepsModal({
  open,
  taskId,
  taskCode,
  taskTitle,
  onClose,
  onChanged,
}: Props) {
  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await api<TaskStep[]>(`/api/tasks/${taskId}/steps`);
      setSteps(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar etapas");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (open) load().catch(console.error);
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  async function addStep(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    await api(`/api/tasks/${taskId}/steps`, {
      method: "POST",
      body: JSON.stringify({ content: draft }),
    });
    setDraft("");
    await load();
    onChanged?.();
  }

  async function toggleDone(step: TaskStep) {
    await api(`/api/tasks/${taskId}/steps/${step.id}`, {
      method: "PATCH",
      body: JSON.stringify({ done: !step.done }),
    });
    await load();
    onChanged?.();
  }

  async function saveEdit(stepId: number) {
    await api(`/api/tasks/${taskId}/steps/${stepId}`, {
      method: "PATCH",
      body: JSON.stringify({ content: editingText }),
    });
    setEditingId(null);
    setEditingText("");
    await load();
    onChanged?.();
  }

  async function removeStep(stepId: number) {
    await api(`/api/tasks/${taskId}/steps/${stepId}`, { method: "DELETE" });
    await load();
    onChanged?.();
  }

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Portal>
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet sheet-up steps-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Etapas"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="steps-sheet-head">
          <div className="steps-sheet-title">
            <strong>Etapas</strong>
            <p className="muted">
              {taskCode} · {taskTitle}
            </p>
          </div>
          <button type="button" className="btn secondary sm" onClick={onClose}>
            Fechar
          </button>
        </div>

        <p className="muted steps-sheet-hint">
          Texto livre por etapa. {doneCount}/{steps.length} feitas.
        </p>

        {error ? <p style={{ color: "var(--danger)", margin: "0 0 0.5rem" }}>{error}</p> : null}

        <div className="steps-sheet-body">
          {loading && !steps.length ? <p className="muted">Carregando…</p> : null}
          {!steps.length && !loading ? (
            <p className="muted">Nenhuma etapa ainda. Escreva a primeira abaixo.</p>
          ) : (
            <div className="steps-list">
              {steps.map((step, index) => (
                <div key={step.id} className={`step-item ${step.done ? "done" : ""}`}>
                  <button
                    type="button"
                    className={`step-check ${step.done ? "checked" : ""}`}
                    aria-label={step.done ? "Desmarcar etapa" : "Concluir etapa"}
                    onClick={() => toggleDone(step)}
                  >
                    {step.done ? "✓" : ""}
                  </button>
                  <div className="step-body">
                    <div className="muted step-index">Etapa {index + 1}</div>
                    {editingId === step.id ? (
                      <textarea
                        rows={3}
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <div className="step-content">{step.content}</div>
                    )}
                    <div className="task-actions step-actions">
                      {editingId === step.id ? (
                        <>
                          <button type="button" className="btn sm" onClick={() => saveEdit(step.id)}>
                            Salvar
                          </button>
                          <button
                            type="button"
                            className="btn secondary sm"
                            onClick={() => {
                              setEditingId(null);
                              setEditingText("");
                            }}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn ghost sm"
                            onClick={() => {
                              setEditingId(step.id);
                              setEditingText(step.content);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn danger sm"
                            onClick={() => removeStep(step.id)}
                          >
                            Excluir
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <form className="steps-sheet-footer" onSubmit={addStep}>
          <div className="field">
            <label>Nova etapa</label>
            <textarea
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ex.: aguardar retorno / validar planilha…"
            />
          </div>
          <button type="submit" className="btn sheet-action" disabled={!draft.trim()}>
            Adicionar etapa
          </button>
        </form>
      </div>
    </div>
    </Portal>
  );
}
