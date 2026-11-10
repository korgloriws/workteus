"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DEFAULT_STICKY_COLOR,
  normalizeStickyColor,
  STICKY_COLORS,
  STATUS_LABELS,
  stickyGlueFor,
  type TaskStatus,
} from "@/lib/types";
import {
  carryOriginLabel,
  formatDisplayDate,
  formatPeriodKeyLabel,
  isCarriedOverTask,
} from "@/lib/dates";
import { Portal } from "@/components/Portal";
import { useIsMobile } from "@/lib/useMediaQuery";
import { StickyColorSheet } from "./StickyColorSheet";
import { TaskActionsSheet } from "./TaskActionsSheet";

export type TaskItem = {
  id: number;
  serviceId?: number;
  code: string;
  periodKey?: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  blockedBy?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  notes?: string;
  color?: string | null;
  link?: string | null;
  serviceName?: string | null;
  serviceColor?: string | null;
  stepsTotal?: number;
  stepsDone?: number;
};

type Handlers = {
  onStatus: (task: TaskItem, to: TaskStatus) => void;
  onEdit: (task: TaskItem) => void;
  onDelete: (task: TaskItem) => void;
  onSteps: (task: TaskItem) => void;
  onNotes: (task: TaskItem, notes: string) => void;
  onColor: (task: TaskItem, color: string) => void;
};

function stickyStatusClass(task: TaskItem) {
  if (task.status === "concluido") return "sticky-done";
  if (task.status === "desistido") return "sticky-gone";
  return "";
}

function StepsHint({ task }: { task: TaskItem }) {
  const total = Number(task.stepsTotal || 0);
  const done = Number(task.stepsDone || 0);
  if (!total) return null;
  return (
    <span className="sticky-steps">
      {done}/{total} etapas
    </span>
  );
}

function StickyCard({
  task,
  isMobile,
  showService,
  viewPeriodKey,
  onOpenSheet,
  onOpenColor,
  ...handlers
}: {
  task: TaskItem;
  isMobile: boolean;
  showService?: boolean;
  viewPeriodKey?: string;
  onOpenSheet: (task: TaskItem) => void;
  onOpenColor: (task: TaskItem) => void;
} & Handlers) {
  const color = normalizeStickyColor(task.color || DEFAULT_STICKY_COLOR);
  const [notes, setNotes] = useState(task.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const carriedOver = isCarriedOverTask(task.periodKey, viewPeriodKey);

  useEffect(() => {
    setNotes(task.notes || "");
  }, [task.notes, task.id]);

  async function commitNotes() {
    const next = notes.trimEnd();
    if (next === (task.notes || "")) return;
    setSavingNotes(true);
    try {
      await handlers.onNotes(task, next);
    } finally {
      setSavingNotes(false);
    }
  }

  return (
    <article
      className={`sticky-card ${stickyStatusClass(task)}${carriedOver ? " sticky-carried" : ""}`}
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

        <button
          type="button"
          className="sticky-title-btn"
          onClick={() => (isMobile ? onOpenSheet(task) : handlers.onEdit(task))}
        >
          <h3 className="sticky-title">{task.title}</h3>
        </button>

        <div className="sticky-tags">
          {showService && task.serviceName ? (
            <span
              className="sticky-service"
              style={{ ["--folder-accent" as string]: task.serviceColor || "var(--gold)" }}
            >
              {task.serviceName}
            </span>
          ) : null}
          {carriedOver ? (
            <span
              className="sticky-carry-tag"
              title={`Origem ${task.periodKey} — ainda aberta, não é deste mês`}
            >
              Não é deste mês · {formatPeriodKeyLabel(task.periodKey)}
            </span>
          ) : null}
        </div>

        {task.blockedBy ? (
          <p className="sticky-meta">Aguardando: {task.blockedBy}</p>
        ) : null}

        <label className="sticky-notes-label">
          <span className="visually-hidden">Notas</span>
          <textarea
            className="sticky-notes"
            value={notes}
            rows={3}
            placeholder="Escrever no post-it…"
            disabled={savingNotes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={commitNotes}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setNotes(task.notes || "");
                (e.target as HTMLTextAreaElement).blur();
              }
            }}
          />
        </label>

        <div className="sticky-foot">
          <span>{formatDisplayDate(task.dueDate)}</span>
          <StepsHint task={task} />
        </div>
      </div>

      <div className="sticky-toolbar">
        <button type="button" className="btn ghost sm" onClick={() => onOpenSheet(task)}>
          Status
        </button>
        <button type="button" className="btn ghost sm" onClick={() => handlers.onSteps(task)}>
          Etapas
        </button>
        <button type="button" className="btn ghost sm" onClick={() => onOpenColor(task)}>
          Cor
        </button>
        {isMobile ? null : (
          <>
            <button type="button" className="btn ghost sm" onClick={() => handlers.onEdit(task)}>
              Ficha
            </button>
            <button type="button" className="btn ghost sm" onClick={() => handlers.onDelete(task)}>
              Excluir
            </button>
          </>
        )}
      </div>
    </article>
  );
}

export function TaskListView({
  tasks,
  showService = false,
  viewPeriodKey,
  ...handlers
}: { tasks: TaskItem[]; showService?: boolean; viewPeriodKey?: string } & Handlers) {
  const isMobile = useIsMobile();
  const [sheetTask, setSheetTask] = useState<TaskItem | null>(null);
  const [colorTask, setColorTask] = useState<TaskItem | null>(null);

  if (!tasks.length) {
    return (
      <div className="empty-desk panel panel-pad">
        <p>Mesa limpa neste filtro.</p>
        <span className="muted">Anote acima — vira um post-it na pasta.</span>
      </div>
    );
  }

  return (
    <>
      <div className="sticky-board">
        {tasks.map((task) => (
          <StickyCard
            key={task.id}
            task={task}
            isMobile={isMobile}
            showService={showService}
            viewPeriodKey={viewPeriodKey}
            onOpenSheet={setSheetTask}
            onOpenColor={setColorTask}
            {...handlers}
          />
        ))}
      </div>
      <TaskActionsSheet
        open={!!sheetTask}
        task={sheetTask}
        viewPeriodKey={viewPeriodKey}
        onClose={() => setSheetTask(null)}
        onStatus={handlers.onStatus}
        onEdit={handlers.onEdit}
        onDelete={handlers.onDelete}
        onSteps={handlers.onSteps}
        onOpenColor={(task) => {
          setSheetTask(null);
          setColorTask(task);
        }}
      />
      <StickyColorSheet
        open={!!colorTask}
        task={colorTask}
        onClose={() => setColorTask(null)}
        onPick={handlers.onColor}
      />
    </>
  );
}

export function TaskTableView({
  tasks,
  viewPeriodKey,
  ...handlers
}: { tasks: TaskItem[]; viewPeriodKey?: string } & Handlers) {
  const isMobile = useIsMobile();
  const [sheetTask, setSheetTask] = useState<TaskItem | null>(null);
  const [colorTask, setColorTask] = useState<TaskItem | null>(null);

  if (!tasks.length) {
    return (
      <div className="empty-desk panel panel-pad">
        <p>Nada neste filtro.</p>
      </div>
    );
  }

  if (isMobile) {
    return <TaskListView tasks={tasks} viewPeriodKey={viewPeriodKey} {...handlers} />;
  }

  return (
    <>
      <div className="panel table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>#</th>
              <th>Título</th>
              <th>Mês</th>
              <th>Status</th>
              <th>Prioridade</th>
              <th>Etapas</th>
              <th>Alvo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const carried = isCarriedOverTask(task.periodKey, viewPeriodKey);
              return (
              <tr key={task.id} className={carried ? "row-carried" : undefined}>
                <td>{task.code}</td>
                <td>
                  <div>{task.title}</div>
                  {task.notes ? (
                    <div className="muted" style={{ fontSize: "0.8rem", marginTop: "0.2rem" }}>
                      {task.notes.slice(0, 80)}
                      {task.notes.length > 80 ? "…" : ""}
                    </div>
                  ) : null}
                </td>
                <td>
                  {carried ? (
                    <span className="carry-chip" title="Ainda aberta — veio de outro mês">
                      Não é deste mês · {formatPeriodKeyLabel(task.periodKey)}
                    </span>
                  ) : (
                    <span className="muted">{formatPeriodKeyLabel(task.periodKey) || "—"}</span>
                  )}
                </td>
                <td>
                  <span className={`status-${task.status}`}>
                    {STATUS_LABELS[task.status as TaskStatus]}
                  </span>
                </td>
                <td>{task.priority}</td>
                <td>
                  {Number(task.stepsTotal || 0)
                    ? `${task.stepsDone}/${task.stepsTotal}`
                    : "—"}
                </td>
                <td>{formatDisplayDate(task.dueDate)}</td>
                <td>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => setSheetTask(task)}
                  >
                    Ações
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <TaskActionsSheet
        open={!!sheetTask}
        task={sheetTask}
        viewPeriodKey={viewPeriodKey}
        onClose={() => setSheetTask(null)}
        onStatus={handlers.onStatus}
        onEdit={handlers.onEdit}
        onDelete={handlers.onDelete}
        onSteps={handlers.onSteps}
        onOpenColor={(task) => {
          setSheetTask(null);
          setColorTask(task);
        }}
      />
      <StickyColorSheet
        open={!!colorTask}
        task={colorTask}
        onClose={() => setColorTask(null)}
        onPick={handlers.onColor}
      />
    </>
  );
}

export function TaskCalendarView({
  tasks,
  reference = new Date(),
  viewPeriodKey,
  ...handlers
}: { tasks: TaskItem[]; reference?: Date; viewPeriodKey?: string } & Handlers) {
  const isMobile = useIsMobile();
  const [sheetTask, setSheetTask] = useState<TaskItem | null>(null);
  const [colorTask, setColorTask] = useState<TaskItem | null>(null);
  const [dayModal, setDayModal] = useState<{ key: string; items: TaskItem[] } | null>(null);

  const monthStart = startOfMonth(reference);
  const monthEnd = endOfMonth(reference);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const byDay = new Map<string, TaskItem[]>();
  for (const task of tasks) {
    const key = task.dueDate || (task.completedAt ? String(task.completedAt).slice(0, 10) : null);
    if (!key) continue;
    const list = byDay.get(key) || [];
    list.push(task);
    byDay.set(key, list);
  }

  const undated = tasks.filter((t) => !t.dueDate && !t.completedAt);

  return (
    <>
      <div className="panel panel-pad">
        <div className="calendar-heading">
          {format(reference, "MMMM yyyy", { locale: ptBR })}
        </div>

        {isMobile ? (
          <div className="agenda-list">
            {days
              .filter((day) => isSameMonth(day, reference))
              .map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const items = byDay.get(key) || [];
                return (
                  <button
                    key={key}
                    type="button"
                    className="agenda-day"
                    onClick={() => setDayModal({ key, items })}
                  >
                    <div className="agenda-day-label">
                      <strong>{format(day, "dd")}</strong>
                      <span className="muted">{format(day, "EEE", { locale: ptBR })}</span>
                    </div>
                    <div className="agenda-day-summary">
                      {items.length
                        ? `${items.length} nota${items.length > 1 ? "s" : ""}`
                        : "Livre"}
                    </div>
                  </button>
                );
              })}
          </div>
        ) : (
          <>
            <div className="calendar-grid calendar-weekdays">
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                <div key={d} className="muted calendar-weekday">
                  {d}
                </div>
              ))}
            </div>
            <div className="calendar-grid">
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const items = byDay.get(key) || [];
                return (
                  <div
                    key={key}
                    className="calendar-cell"
                    style={{ opacity: isSameMonth(day, reference) ? 1 : 0.45 }}
                  >
                    <div className="day">{format(day, "d")}</div>
                    {items.slice(0, 3).map((t) => {
                      const carried = isCarriedOverTask(t.periodKey, viewPeriodKey);
                      return (
                      <button
                        key={t.id}
                        type="button"
                        className={`calendar-item${carried ? " calendar-item-carried" : ""}`}
                        title={
                          carried
                            ? `${t.title} · ${carryOriginLabel(t.periodKey)}`
                            : t.title
                        }
                        onClick={() => handlers.onEdit(t)}
                      >
                        {carried ? `↩ ${t.title}` : t.title}
                      </button>
                      );
                    })}
                    {items.length > 3 ? (
                      <button
                        type="button"
                        className="muted calendar-more"
                        onClick={() => setDayModal({ key, items })}
                      >
                        +{items.length - 3}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {undated.length ? (
          <div style={{ marginTop: "1rem" }}>
            <p className="muted" style={{ marginBottom: "0.65rem" }}>
              Sem data — post-its soltos na mesa
            </p>
            <TaskListView tasks={undated} viewPeriodKey={viewPeriodKey} {...handlers} />
          </div>
        ) : null}
      </div>

      {dayModal ? (
        <Portal>
          <div className="sheet-backdrop" onClick={() => setDayModal(null)}>
            <div className="sheet sheet-up" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-handle" />
              <div className="sheet-head">
                <strong>
                  {format(new Date(`${dayModal.key}T12:00:00`), "dd/MM/yyyy", { locale: ptBR })}
                </strong>
              </div>
              <div className="sheet-list">
                {dayModal.items.length ? (
                  dayModal.items.map((task) => {
                    const carried = isCarriedOverTask(task.periodKey, viewPeriodKey);
                    return (
                    <button
                      key={task.id}
                      type="button"
                      className="sheet-list-item"
                      onClick={() => {
                        setDayModal(null);
                        if (isMobile) setSheetTask(task);
                        else handlers.onEdit(task);
                      }}
                    >
                      <strong>{task.code}</strong>
                      <span>{task.title}</span>
                      {carried ? (
                        <span className="carry-chip">{carryOriginLabel(task.periodKey)}</span>
                      ) : null}
                    </button>
                    );
                  })
                ) : (
                  <p className="muted">Nada neste dia.</p>
                )}
              </div>
              <button type="button" className="btn ghost sheet-action" onClick={() => setDayModal(null)}>
                Fechar
              </button>
            </div>
          </div>
        </Portal>
      ) : null}

      <TaskActionsSheet
        open={!!sheetTask}
        task={sheetTask}
        viewPeriodKey={viewPeriodKey}
        onClose={() => setSheetTask(null)}
        onStatus={handlers.onStatus}
        onEdit={handlers.onEdit}
        onDelete={handlers.onDelete}
        onSteps={handlers.onSteps}
        onOpenColor={(task) => {
          setSheetTask(null);
          setColorTask(task);
        }}
      />
      <StickyColorSheet
        open={!!colorTask}
        task={colorTask}
        onClose={() => setColorTask(null)}
        onPick={handlers.onColor}
      />
    </>
  );
}
