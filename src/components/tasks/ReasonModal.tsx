"use client";

import { FormEvent, useEffect, useState } from "react";
import { Portal } from "@/components/Portal";

type Props = {
  open: boolean;
  title: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
};

export function ReasonModal({
  open,
  title,
  confirmLabel = "Confirmar",
  onClose,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm(reason);
      setReason("");
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Portal>
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet sheet-up form-sheet form-sheet-compact"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <div className="sheet-handle" />
        <div className="sheet-head">
          <strong>{title}</strong>
        </div>
        <div className="form-sheet-body">
          <div className="field">
            <label>Motivo (opcional)</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: dependência cancelada / fora de escopo"
            />
          </div>
        </div>
        <div className="form-sheet-actions">
          <button type="button" className="btn secondary sheet-action" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn danger sheet-action" disabled={loading}>
            {loading ? "…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
    </Portal>
  );
}
