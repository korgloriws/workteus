"use client";

import { FormEvent, useEffect, useState } from "react";
import { Portal } from "@/components/Portal";
import { api } from "@/lib/client";
import { exportReport } from "@/lib/reportExport";
import type { ReportFormat, ReportPayload } from "@/lib/reports";
import type { PeriodMode, TaskStatus } from "@/lib/types";
import { PERIOD_MODES } from "@/lib/types";

type Service = { id: number; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  initialServiceId?: string;
};

const FORMATS: { id: ReportFormat; label: string }[] = [
  { id: "pdf", label: "PDF" },
  { id: "xlsx", label: "Excel" },
  { id: "csv", label: "CSV" },
  { id: "txt", label: "TXT" },
];

export function ReportWizard({ open, onClose, initialServiceId = "" }: Props) {
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [periodMode, setPeriodMode] = useState<PeriodMode | "tudo">("mes");
  const [status, setStatus] = useState<TaskStatus | "abertos" | "todos">("todos");
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeSteps, setIncludeSteps] = useState(true);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setServiceId(initialServiceId);
    setError("");
    api<Service[]>("/api/services").then(setServices).catch(console.error);
  }, [open, initialServiceId]);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const report = await api<ReportPayload>("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          serviceId: serviceId ? Number(serviceId) : null,
          periodMode,
          status,
          includeCharts,
          includeSteps,
          includeDeleted,
          reference: new Date().toISOString().slice(0, 10),
        }),
      });
      exportReport(report, format);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao gerar relatório");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Portal>
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet sheet-up report-wizard" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <strong>Gerar relatório</strong>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            Escolha o recorte e o formato. O arquivo baixa no dispositivo.
          </p>
        </div>

        <div className="report-wizard-body">
          <div className="field">
            <label>Pastas / empregos</label>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">Todas as pastas</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="report-wizard-grid">
            <div className="field">
              <label>Período</label>
              <select
                value={periodMode}
                onChange={(e) => setPeriodMode(e.target.value as PeriodMode | "tudo")}
              >
                <option value="tudo">Todo o histórico</option>
                {PERIOD_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Status</label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as TaskStatus | "abertos" | "todos")
                }
              >
                <option value="todos">Todos</option>
                <option value="abertos">Abertos</option>
                <option value="a_fazer">A fazer</option>
                <option value="em_andamento">Em andamento</option>
                <option value="pausado">Pausado</option>
                <option value="pulado">Pulado</option>
                <option value="concluido">Concluído</option>
                <option value="desistido">Desistido</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>Formato</label>
            <div className="format-chips">
              {FORMATS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`btn sm ${format === item.id ? "" : "secondary"}`}
                  onClick={() => setFormat(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="report-options">
            <label className="check-row">
              <input
                type="checkbox"
                checked={includeCharts}
                onChange={(e) => setIncludeCharts(e.target.checked)}
              />
              <span>Incluir gráficos / resumo visual</span>
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={includeSteps}
                onChange={(e) => setIncludeSteps(e.target.checked)}
              />
              <span>Incluir etapas das demandas</span>
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => setIncludeDeleted(e.target.checked)}
              />
              <span>Incluir excluídas</span>
            </label>
          </div>

          {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
        </div>

        <div className="report-wizard-actions">
          <button type="button" className="btn secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Gerando…" : "Gerar e baixar"}
          </button>
        </div>
      </form>
    </div>
    </Portal>
  );
}
