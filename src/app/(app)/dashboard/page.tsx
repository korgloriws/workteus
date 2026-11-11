"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { addMonths, format, subMonths } from "date-fns";
import { api } from "@/lib/client";
import {
  DEFAULT_STICKY_COLOR,
  normalizeStickyColor,
  STATUS_LABELS,
  stickyGlueFor,
  type TaskStatus,
} from "@/lib/types";
import {
  formatDisplayDate,
  formatDisplayDateTime,
  formatPeriodKeyLabel,
  getPeriodRange,
  isCarriedOverTask,
  periodKeyFromDate,
} from "@/lib/dates";
import type { TaskItem } from "@/components/tasks/TaskViews";

type Dashboard = {
  monthKey: string;
  isCurrentMonth: boolean;
  overdue: TaskItem[];
  dueToday: TaskItem[];
  paused: TaskItem[];
  inProgress: TaskItem[];
  recentDone: TaskItem[];
  counts: {
    open: number;
    overdue: number;
    paused: number;
    doneMonth: number;
  };
};

function stickyStatusClass(task: TaskItem) {
  if (task.status === "concluido") return "sticky-done";
  if (task.status === "desistido") return "sticky-gone";
  return "";
}

function StickyPreview({
  task,
  viewPeriodKey,
}: {
  task: TaskItem;
  viewPeriodKey?: string;
}) {
  const color = normalizeStickyColor(task.color || DEFAULT_STICKY_COLOR);
  const carried = isCarriedOverTask(task.periodKey, viewPeriodKey);
  return (
    <Link
      href={`/services?id=${task.serviceId || ""}`}
      className="dash-sticky-link"
      aria-label={`Abrir ${task.title}`}
    >
      <article
        className={`sticky-card ${stickyStatusClass(task)}${carried ? " sticky-carried" : ""}`}
        style={
          {
            "--sticky-face": color,
            "--sticky-glue": stickyGlueFor(color),
          } as CSSProperties
        }
      >
        <div className="sticky-glue" aria-hidden />
        <div className="sticky-body">
          <div className="sticky-top">
            <span className="sticky-code">{task.code}</span>
            <span className={`status-${task.status}`}>
              {STATUS_LABELS[task.status as TaskStatus]}
            </span>
          </div>
          <h3 className="sticky-title">{task.title}</h3>
          <div className="sticky-tags">
            {task.serviceName ? (
              <span
                className="sticky-service"
                style={{ ["--folder-accent" as string]: task.serviceColor || "var(--gold)" }}
              >
                {task.serviceName}
              </span>
            ) : null}
            {carried ? (
              <span className="sticky-carry-tag">
                Não é deste mês · {formatPeriodKeyLabel(task.periodKey)}
              </span>
            ) : null}
          </div>
          {task.notes ? <p className="sticky-meta">{task.notes.slice(0, 90)}</p> : null}
          <div className="sticky-foot">
            <span className="dash-sticky-meta">
              {task.status === "concluido" && task.completedAt
                ? `Concluído ${formatDisplayDateTime(task.completedAt)}`
                : formatDisplayDate(task.dueDate)}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function Section({
  title,
  items,
  empty,
  viewPeriodKey,
}: {
  title: string;
  items: TaskItem[];
  empty: string;
  viewPeriodKey?: string;
}) {
  return (
    <section className="panel" style={{ marginTop: 0 }}>
      <div className="panel-pad" style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="dash-section-head" style={{ marginBottom: 0 }}>
          <strong>{title}</strong>
          <span className="muted">
            {items.length} post-it{items.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      {!items.length ? (
        <p className="muted panel-pad">{empty}</p>
      ) : (
        <div className="panel-pad" style={{ paddingTop: "0.85rem" }}>
          <div className="sticky-board" style={{ marginTop: 0 }}>
            {items.map((task) => (
              <StickyPreview key={task.id} task={task} viewPeriodKey={viewPeriodKey} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const [reference, setReference] = useState(() => new Date());
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const monthLabel = useMemo(
    () => getPeriodRange("mes", reference).label,
    [reference],
  );
  const isCurrentMonth = periodKeyFromDate(reference) === periodKeyFromDate();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        ref: format(reference, "yyyy-MM-dd"),
      });
      const rows = await api<Dashboard>(`/api/dashboard?${params}`);
      setData(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [reference]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  return (
    <div className="desk-page">
      <div className="page-header">
        <div>
          <h1 className="hero-title">Folha de hoje</h1>
          <p className="desk-copy">
            Mesa de {monthLabel} — o do mês e o que ainda está aberto de antes.
          </p>
        </div>
        <div className="page-header-actions">
          <div className="period-nav">
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setReference((d) => subMonths(d, 1))}
              aria-label="Mês anterior"
            >
              ←
            </button>
            <span className="muted period-label">{monthLabel}</span>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setReference((d) => addMonths(d, 1))}
              aria-label="Próximo mês"
            >
              →
            </button>
          </div>
          {!isCurrentMonth ? (
            <button
              type="button"
              className="btn secondary sm"
              onClick={() => setReference(new Date())}
            >
              Este mês
            </button>
          ) : null}
          <Link href="/services" className="btn page-header-cta">
            Abrir pastas
          </Link>
        </div>
      </div>

      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}

      {loading && !data ? (
        <p className="desk-copy">Abrindo a folha do mês…</p>
      ) : data ? (
        <>
          <div className="grid-stats" style={{ marginTop: "1.25rem" }}>
            <div className="stat-card">
              <span className="muted">Abertas</span>
              <strong>{data.counts.open}</strong>
            </div>
            <div className="stat-card">
              <span className="muted">Atrasadas</span>
              <strong>{data.counts.overdue}</strong>
            </div>
            <div className="stat-card">
              <span className="muted">Pausadas</span>
              <strong>{data.counts.paused}</strong>
            </div>
            <div className="stat-card">
              <span className="muted">Concluídas no mês</span>
              <strong>{data.counts.doneMonth}</strong>
            </div>
          </div>

          <div className="dash-board">
            <Section
              title="Atrasadas no bloco"
              items={data.overdue}
              empty="Nada atrasado neste mês."
              viewPeriodKey={data.monthKey}
            />
            <Section
              title={data.isCurrentMonth ? "Marcadas para hoje" : "Com prazo neste mês"}
              items={data.dueToday}
              empty={
                data.isCurrentMonth ? "Sem alvo para hoje." : "Nenhum prazo neste mês."
              }
              viewPeriodKey={data.monthKey}
            />
            <Section
              title="Em andamento"
              items={data.inProgress}
              empty="Nada em andamento."
              viewPeriodKey={data.monthKey}
            />
            <Section
              title="Pausadas / aguardando"
              items={data.paused}
              empty="Nenhuma pausa."
              viewPeriodKey={data.monthKey}
            />
            <Section
              title="Carimbadas como concluídas"
              items={data.recentDone}
              empty="Ainda sem conclusões neste mês."
              viewPeriodKey={data.monthKey}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
