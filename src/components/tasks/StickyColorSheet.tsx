"use client";

import { useEffect } from "react";
import { Portal } from "@/components/Portal";
import {
  DEFAULT_STICKY_COLOR,
  normalizeStickyColor,
  STICKY_COLORS,
} from "@/lib/types";
import type { TaskItem } from "./TaskViews";

type Props = {
  open: boolean;
  task: TaskItem | null;
  onClose: () => void;
  onPick: (task: TaskItem, color: string) => void;
};

export function StickyColorSheet({ open, task, onClose, onPick }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !task) return null;

  const current = normalizeStickyColor(task.color || DEFAULT_STICKY_COLOR);

  return (
    <Portal>
      <div className="sheet-backdrop" onClick={onClose}>
        <div className="sheet sheet-up form-sheet form-sheet-compact" onClick={(e) => e.stopPropagation()}>
          <div className="sheet-handle" />
          <div className="sheet-head">
            <strong>Cor do post-it</strong>
            <p className="muted" style={{ margin: "0.25rem 0 0" }}>
              {task.code} · {task.title}
            </p>
          </div>

          <div className="color-sheet-grid" role="group" aria-label="Cores">
            {STICKY_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`color-sheet-option ${current === c.value ? "active" : ""}`}
                onClick={() => {
                  onPick(task, c.value);
                  onClose();
                }}
              >
                <span className="color-sheet-swatch" style={{ background: c.value }} />
                <span>{c.label}</span>
              </button>
            ))}
          </div>

          <button type="button" className="btn ghost sheet-action" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </Portal>
  );
}
