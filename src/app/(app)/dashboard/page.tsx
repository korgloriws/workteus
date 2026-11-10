"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import {
  DEFAULT_STICKY_COLOR,
  normalizeStickyColor,
  STATUS_LABELS,
  stickyGlueFor,
  type TaskStatus,
} from "@/lib/types";
import { formatDisplayDate } from "@/lib/dates";
import type { TaskItem } from "@/components/tasks/TaskViews";

type Dashboard = {
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

function StickyPreview({ task }: { task: TaskItem }) {
  const color = normalizeStickyColor(task.color || DEFAULT_STICKY_COLOR);
  return (
    <Link
      href={`/services?id=${task.serviceId || ""}`}
      className="dash-sticky-link"
      aria-label={`Abrir ${task.title}`}
    >
      <article
        className={`sticky-card ${stickyStatusClass(task)}`}
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
          {task.notes ? <p className="sticky-meta">{task.notes.slice(0, 90)}</p> : null}
          <div className="sticky-foot">
            <span className="dash-sticky-meta">
              {task.serviceName || "Pasta"} · {formatDisplayDate(task.dueDate)}
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
}: {
  title: string;
  items: TaskItem[];
  empty: string;
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
              <StickyPreview key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Dashboard>("/api/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="desk-page">
      <div className="page-header">
        <div>
          <h1 className="hero-title">Folha de hoje</h1>
          <p className="desk-copy">O que está em cima da mesa agora, em todas as pastas.</p>
        </div>
        <Link href="/services" className="btn page-header-cta">
          Abrir pastas
        </Link>
      </div>

      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}

      {data ? (
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
            <Section title="Atrasadas no bloco" items={data.overdue} empty="Nada atrasado nesta folha." />
            <Section title="Marcadas para hoje" items={data.dueToday} empty="Sem alvo para hoje." />
            <Section title="Em andamento" items={data.inProgress} empty="Nada em andamento." />
            <Section title="Pausadas / aguardando" items={data.paused} empty="Nenhuma pausa." />
            <Section
              title="Carimbadas como concluídas"
              items={data.recentDone}
              empty="Ainda sem conclusões."
            />
          </div>
        </>
      ) : (
        <p className="desk-copy">Abrindo a folha do dia…</p>
      )}
    </div>
  );
}
