"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addMonths, format, subMonths } from "date-fns";
import { api } from "@/lib/client";
import type { PeriodMode, TaskStatus, ViewMode } from "@/lib/types";
import { PERIOD_MODES } from "@/lib/types";
import { getPeriodRange } from "@/lib/dates";
import { useIsMobile } from "@/lib/useMediaQuery";
import { Portal } from "@/components/Portal";
import { QuickCapture } from "./QuickCapture";
import { ReasonModal } from "./ReasonModal";
import { TaskFormModal, type TaskFormValues } from "./TaskFormModal";
import { TaskStepsModal } from "./TaskStepsModal";
import {
  TaskCalendarView,
  TaskListView,
  TaskTableView,
  type TaskItem,
} from "./TaskViews";

type Service = {
  id: number;
  name: string;
  color: string;
  code: string;
};

type Pref = {
  viewMode: ViewMode;
  periodMode: PeriodMode;
};

export function ServiceWorkspace({
  initialServiceId,
}: {
  initialServiceId?: number;
}) {
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState<number | undefined>(initialServiceId);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [pref, setPref] = useState<Pref>({ viewMode: "lista", periodMode: "mes" });
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("abertos");
  const [reference, setReference] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaskItem | null>(null);
  const [reasonOpen, setReasonOpen] = useState<{
    mode: "desistido" | "delete" | "pausado";
    task: TaskItem;
    to?: TaskStatus;
  } | null>(null);
  const [stepsTask, setStepsTask] = useState<TaskItem | null>(null);
  const [serviceForm, setServiceForm] = useState<{
    open: boolean;
    mode: "create" | "edit";
    name: string;
    color: string;
  }>({
    open: false,
    mode: "create",
    name: "",
    color: "#1a1a1a",
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isMobile = useIsMobile();

  const periodLabel = useMemo(
    () => getPeriodRange(pref.periodMode, reference).label,
    [pref.periodMode, reference],
  );

  const loadServices = useCallback(async () => {
    const rows = await api<Service[]>("/api/services");
    setServices(rows);
    if (!serviceId && rows[0]) setServiceId(rows[0].id);
  }, [serviceId]);

  const loadPref = useCallback(async (sid: number) => {
    const p = await api<Pref>(`/api/preferences/${sid}`);
    setPref({
      viewMode: (p.viewMode as ViewMode) || "lista",
      periodMode: (p.periodMode as PeriodMode) || "mes",
    });
  }, []);

  const loadTasks = useCallback(async () => {
    if (!serviceId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        serviceId: String(serviceId),
        periodMode: pref.periodMode,
        ref: format(reference, "yyyy-MM-dd"),
        status: statusFilter,
      });
      if (q.trim()) params.set("q", q.trim());
      const rows = await api<TaskItem[]>(`/api/tasks?${params}`);
      setTasks(rows);
    } finally {
      setLoading(false);
    }
  }, [serviceId, pref.periodMode, reference, statusFilter, q]);

  useEffect(() => {
    loadServices().catch(console.error);
  }, [loadServices]);

  useEffect(() => {
    if (!serviceId) return;
    loadPref(serviceId).catch(console.error);
  }, [serviceId, loadPref]);

  useEffect(() => {
    loadTasks().catch(console.error);
  }, [loadTasks]);

  async function savePref(next: Partial<Pref>) {
    if (!serviceId) return;
    const merged = { ...pref, ...next };
    setPref(merged);
    await api(`/api/preferences/${serviceId}`, {
      method: "PUT",
      body: JSON.stringify(merged),
    });
  }

  async function createOrUpdate(values: TaskFormValues) {
    if (editing) {
      await api(`/api/tasks/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: values.title,
          description: values.description,
          priority: values.priority,
          blockedBy: values.blockedBy || null,
          dueDate: values.dueDate || null,
          notes: values.notes,
          color: values.color,
          link: values.link || null,
        }),
      });
    } else {
      await api("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          serviceId,
          title: values.title,
          description: values.description,
          priority: values.priority,
          blockedBy: values.blockedBy || null,
          dueDate: values.dueDate || null,
          notes: values.notes,
          color: values.color,
          link: values.link || null,
        }),
      });
    }
    setEditing(null);
    await loadTasks();
  }

  async function quickCapture(title: string) {
    if (!serviceId) return;
    await api("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ serviceId, title }),
    });
    await loadTasks();
  }

  async function handleNotes(task: TaskItem, notes: string) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, notes } : t)));
    await api(`/api/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ notes }),
    });
  }

  async function handleColor(task: TaskItem, color: string) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, color } : t)));
    await api(`/api/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ color }),
    });
  }

  async function handleStatus(task: TaskItem, to: TaskStatus) {
    if (to === "desistido" || to === "pausado") {
      setReasonOpen({ mode: to, task, to });
      return;
    }
    await api(`/api/tasks/${task.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: to }),
    });
    await loadTasks();
  }

  async function confirmReason(reason: string) {
    if (!reasonOpen) return;
    if (reasonOpen.mode === "delete") {
      await api(`/api/tasks/${reasonOpen.task.id}`, {
        method: "DELETE",
        body: JSON.stringify({ reason }),
      });
    } else {
      await api(`/api/tasks/${reasonOpen.task.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: reasonOpen.to,
          reason,
          blockedBy:
            reasonOpen.mode === "pausado" && reason
              ? reason
              : reasonOpen.task.blockedBy,
        }),
      });
    }
    await loadTasks();
  }

  async function saveService() {
    if (serviceForm.mode === "edit" && serviceId) {
      await api(`/api/services/${serviceId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: serviceForm.name, color: serviceForm.color }),
      });
    } else {
      await api("/api/services", {
        method: "POST",
        body: JSON.stringify({ name: serviceForm.name, color: serviceForm.color }),
      });
    }
    setServiceForm({ open: false, mode: "create", name: "", color: "#1a1a1a" });
    await loadServices();
  }

  async function deleteService() {
    if (!serviceId) return;
    if (!confirm("Excluir este serviço e todas as tarefas?")) return;
    await api(`/api/services/${serviceId}`, { method: "DELETE" });
    setServiceId(undefined);
    await loadServices();
  }

  const handlers = {
    onStatus: handleStatus,
    onEdit: (task: TaskItem) => {
      setEditing(task);
      setFormOpen(true);
    },
    onDelete: (task: TaskItem) => setReasonOpen({ mode: "delete", task }),
    onSteps: (task: TaskItem) => setStepsTask(task),
    onNotes: handleNotes,
    onColor: handleColor,
  };

  const viewButtons = (
    <>
      {(
        [
          ["lista", "notas"],
          ["tabela", "lista"],
          ["calendario", "agenda"],
        ] as const
      ).map(([mode, label]) => (
        <button
          key={mode}
          type="button"
          className={`btn sm ${pref.viewMode === mode ? "" : "secondary"}`}
          onClick={() => savePref({ viewMode: mode })}
        >
          {label}
        </button>
      ))}
    </>
  );

  const filterControls = (
    <>
      {PERIOD_MODES.map((mode) => (
        <button
          key={mode}
          type="button"
          className={`btn sm ${pref.periodMode === mode ? "" : "secondary"}`}
          onClick={() => savePref({ periodMode: mode })}
        >
          {mode}
        </button>
      ))}
      <div className="period-nav">
        <button type="button" className="btn ghost sm" onClick={() => setReference(subMonths(reference, 1))}>
          ←
        </button>
        <span className="muted period-label">{periodLabel}</span>
        <button type="button" className="btn ghost sm" onClick={() => setReference(addMonths(reference, 1))}>
          →
        </button>
      </div>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="abertos">Abertos</option>
        <option value="todos">Todos</option>
        <option value="a_fazer">A fazer</option>
        <option value="em_andamento">Em andamento</option>
        <option value="pausado">Pausado</option>
        <option value="pulado">Pulado</option>
        <option value="concluido">Concluído</option>
        <option value="desistido">Desistido</option>
      </select>
      <input
        className="search-input"
        placeholder="Buscar…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
    </>
  );

  return (
    <div className="desk-page">
      <div className="page-header">
        <div>
          <h1 className="hero-title">Pastas de trabalho</h1>
          <p className="desk-copy">
            Cada demanda é um post-it na pasta — anote rápido e organize depois.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn secondary"
            onClick={() => setServiceForm({ open: true, mode: "create", name: "", color: "#1a1a1a" })}
          >
            Nova pasta
          </button>
          <button
            type="button"
            className="btn secondary"
            disabled={!serviceId}
            onClick={() => {
              const current = services.find((s) => s.id === serviceId);
              if (!current) return;
              setServiceForm({
                open: true,
                mode: "edit",
                name: current.name,
                color: current.color,
              });
            }}
          >
            Editar pasta
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            disabled={!serviceId}
          >
            Ficha completa
          </button>
        </div>
      </div>

      <div className="service-tabs">
        {services.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`service-tab ${serviceId === s.id ? "active" : ""}`}
            style={
              serviceId === s.id
                ? { boxShadow: `inset 0 -3px 0 ${s.color}` }
                : { borderTop: `3px solid ${s.color}` }
            }
            onClick={() => setServiceId(s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <QuickCapture disabled={!serviceId} onCapture={quickCapture} />

      <div className="toolbar">
        <div className="toolbar-views">{viewButtons}</div>
        {isMobile ? (
          <button type="button" className="btn secondary sm" onClick={() => setFiltersOpen(true)}>
            Filtros
          </button>
        ) : (
          <>
            <span className="toolbar-sep" />
            {filterControls}
          </>
        )}
      </div>

      {filtersOpen ? (
        <Portal>
          <div className="sheet-backdrop" onClick={() => setFiltersOpen(false)}>
            <div className="sheet sheet-up" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-handle" />
              <div className="sheet-head">
                <strong>Filtros</strong>
                <p className="muted" style={{ margin: "0.25rem 0 0" }}>
                  Período, status e busca da pasta
                </p>
              </div>
              <div className="sheet-filters">{filterControls}</div>
              <button type="button" className="btn sheet-action" onClick={() => setFiltersOpen(false)}>
                Aplicar
              </button>
            </div>
          </div>
        </Portal>
      ) : null}

      {loading ? (
        <p className="desk-copy">Folheando a pasta…</p>
      ) : pref.viewMode === "tabela" ? (
        <TaskTableView tasks={tasks} {...handlers} />
      ) : pref.viewMode === "calendario" ? (
        <TaskCalendarView tasks={tasks} reference={reference} {...handlers} />
      ) : (
        <TaskListView tasks={tasks} {...handlers} />
      )}

      <TaskFormModal
        key={editing ? `edit-${editing.id}` : `new-${formOpen}`}
        open={formOpen}
        title={editing ? "Editar demanda" : "Nova demanda"}
        initial={
          editing
            ? {
                title: editing.title,
                description: editing.description || "",
                priority: (editing.priority as TaskFormValues["priority"]) || "media",
                blockedBy: editing.blockedBy || "",
                dueDate: editing.dueDate || "",
                notes: editing.notes || "",
                color: editing.color || "",
                link: editing.link || "",
              }
            : undefined
        }
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={createOrUpdate}
      />

      <ReasonModal
        open={!!reasonOpen}
        title={
          reasonOpen?.mode === "delete"
            ? "Excluir demanda"
            : reasonOpen?.mode === "pausado"
              ? "Pausar demanda"
              : "Desistir da demanda"
        }
        confirmLabel={reasonOpen?.mode === "delete" ? "Excluir" : "Confirmar"}
        onClose={() => setReasonOpen(null)}
        onConfirm={confirmReason}
      />

      {stepsTask ? (
        <TaskStepsModal
          open
          taskId={stepsTask.id}
          taskCode={stepsTask.code}
          taskTitle={stepsTask.title}
          onClose={() => setStepsTask(null)}
          onChanged={() => loadTasks().catch(console.error)}
        />
      ) : null}

      {serviceForm.open ? (
        <Portal>
          <div
            className="sheet-backdrop"
            onClick={() => setServiceForm((s) => ({ ...s, open: false }))}
          >
            <form
              className="sheet sheet-up form-sheet form-sheet-compact"
              onClick={(e) => e.stopPropagation()}
              onSubmit={async (e) => {
                e.preventDefault();
                await saveService();
              }}
            >
              <div className="sheet-handle" />
              <div className="sheet-head">
                <strong>{serviceForm.mode === "edit" ? "Editar pasta" : "Nova pasta"}</strong>
              </div>
              <div className="form-sheet-body">
                <div className="field">
                  <label>Nome</label>
                  <input
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm((s) => ({ ...s, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label>Cor</label>
                  <input
                    type="color"
                    value={serviceForm.color}
                    onChange={(e) => setServiceForm((s) => ({ ...s, color: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-sheet-actions">
                {serviceForm.mode === "edit" ? (
                  <button
                    type="button"
                    className="btn danger sheet-action"
                    onClick={async () => {
                      setServiceForm((s) => ({ ...s, open: false }));
                      await deleteService();
                    }}
                  >
                    Excluir pasta
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn secondary sheet-action"
                  onClick={() => setServiceForm((s) => ({ ...s, open: false }))}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn sheet-action">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </Portal>
      ) : null}
    </div>
  );
}
