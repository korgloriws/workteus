"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatDisplayDateTime } from "@/lib/dates";
import { STATUS_LABELS, type TaskStatus } from "@/lib/types";

export type StatusEventItem = {
  id: number;
  fromStatus?: string | null;
  toStatus: string;
  reason?: string | null;
  createdAt: string;
};

export function StatusHistory({ taskId }: { taskId: number }) {
  const [events, setEvents] = useState<StatusEventItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setEvents(null);
    setError("");
    api<{ events?: StatusEventItem[] }>(`/api/tasks/${taskId}`)
      .then((data) => {
        if (!cancelled) setEvents(data.events || []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao carregar histórico");
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  if (error) {
    return <p className="muted status-history-empty">{error}</p>;
  }

  if (!events) {
    return <p className="muted status-history-empty">Carregando histórico…</p>;
  }

  if (!events.length) {
    return <p className="muted status-history-empty">Sem registros de status ainda.</p>;
  }

  return (
    <ol className="status-history">
      {[...events].reverse().map((ev) => {
        const toLabel = STATUS_LABELS[ev.toStatus as TaskStatus] || ev.toStatus;
        const fromLabel = ev.fromStatus
          ? STATUS_LABELS[ev.fromStatus as TaskStatus] || ev.fromStatus
          : null;
        return (
          <li key={ev.id} className="status-history-item">
            <div className="status-history-row">
              <span className={`status-${ev.toStatus}`}>{toLabel}</span>
              <time className="muted" dateTime={ev.createdAt}>
                {formatDisplayDateTime(ev.createdAt)}
              </time>
            </div>
            <p className="status-history-meta muted">
              {fromLabel ? `${fromLabel} → ${toLabel}` : toLabel}
              {ev.reason ? ` · ${ev.reason}` : ""}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
