"use client";

import { FormEvent, useEffect, useState } from "react";
import { Portal } from "@/components/Portal";
import {
  DEFAULT_STICKY_COLOR,
  normalizeStickyColor,
  STICKY_COLORS,
  type Priority,
} from "@/lib/types";

export type TaskFormValues = {
  title: string;
  description: string;
  priority: Priority;
  blockedBy: string;
  dueDate: string;
  notes: string;
  color: string;
  link: string;
  serviceId?: number;
};

type Props = {
  open: boolean;
  title: string;
  services?: { id: number; name: string }[];
  initial?: Partial<TaskFormValues>;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => Promise<void>;
};

const empty: TaskFormValues = {
  title: "",
  description: "",
  priority: "media",
  blockedBy: "",
  dueDate: "",
  notes: "",
  color: DEFAULT_STICKY_COLOR,
  link: "",
};

export function TaskFormModal({ open, title, services, initial, onClose, onSubmit }: Props) {
  const [values, setValues] = useState<TaskFormValues>({
    ...empty,
    ...initial,
    color: normalizeStickyColor(initial?.color || empty.color),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onSubmit(values);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Portal>
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet sheet-up form-sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="sheet-handle" />
        <div className="sheet-head">
          <strong>{title}</strong>
          <p className="muted" style={{ margin: "0.25rem 0 0" }}>
            Ficha completa da demanda
          </p>
        </div>

        <div className="form-sheet-body">
          {services ? (
            <div className="field">
              <label>Serviço</label>
              <select
                value={values.serviceId || services[0]?.id || ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, serviceId: Number(e.target.value) }))
                }
                required
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="field">
            <label>Título</label>
            <input
              value={values.title}
              onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
              required
            />
          </div>
          <div className="field">
            <label>Descrição</label>
            <textarea
              rows={2}
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
            />
          </div>
          <div className="form-grid-2">
            <div className="field">
              <label>Prioridade</label>
              <select
                value={values.priority}
                onChange={(e) =>
                  setValues((v) => ({ ...v, priority: e.target.value as Priority }))
                }
              >
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>
            <div className="field">
              <label>Data alvo</label>
              <input
                type="date"
                value={values.dueDate}
                onChange={(e) => setValues((v) => ({ ...v, dueDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="field">
            <label>Aguardando / bloqueio</label>
            <input
              value={values.blockedBy}
              onChange={(e) => setValues((v) => ({ ...v, blockedBy: e.target.value }))}
              placeholder="Ex.: retorno do RH"
            />
          </div>
          <div className="field">
            <label>Notas do post-it</label>
            <textarea
              rows={4}
              value={values.notes}
              onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
              placeholder="Anotações livres — o que caberia no papel…"
            />
          </div>
          <div className="field">
            <label>Cor do post-it</label>
            <div className="sticky-colors form-sticky-colors">
              {STICKY_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`sticky-color-dot ${values.color === c.value ? "active" : ""}`}
                  style={{ background: c.value }}
                  title={c.label}
                  aria-label={c.label}
                  aria-pressed={values.color === c.value}
                  onClick={() => setValues((v) => ({ ...v, color: c.value }))}
                />
              ))}
            </div>
          </div>
          <div className="field">
            <label>Link</label>
            <input
              value={values.link}
              onChange={(e) => setValues((v) => ({ ...v, link: e.target.value }))}
              placeholder="https://..."
            />
          </div>
          {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
        </div>

        <div className="form-sheet-actions">
          <button type="button" className="btn secondary sheet-action" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn sheet-action" disabled={loading}>
            {loading ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </div>
    </Portal>
  );
}
