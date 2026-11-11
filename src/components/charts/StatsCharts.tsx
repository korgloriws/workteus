"use client";

import { useEffect, useMemo, useState } from "react";
import { addMonths, format, subMonths } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ReportWizard } from "@/components/reports/ReportWizard";
import { api } from "@/lib/client";
import { getPeriodRange, periodKeyFromDate } from "@/lib/dates";
import { useTheme } from "@/lib/theme";
import { STATUS_LABELS, type TaskStatus } from "@/lib/types";
import { useIsMobile } from "@/lib/useMediaQuery";

type Stats = {
  monthKey: string;
  monthLabel: string;
  isCurrentMonth: boolean;
  summary: {
    total: number;
    ofMonth: number;
    carryIn: number;
    open: number;
    completed: number;
    abandoned: number;
    paused: number;
    skipped: number;
    inProgress: number;
    completionRate: number;
    notesInMonth: number;
    pauseEvents: number;
    deletedCount: number;
  };
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  byService: { serviceId: number; serviceName: string | null; color: string | null; count: number }[];
  demandByMonth: {
    month: string;
    label: string;
    created: number;
    completed: number;
    open: number;
    abandoned: number;
    notes: number;
  }[];
  completedOverTime: { day: string; count: number }[];
  abandonments: { day: string; count: number }[];
  pauseCount: number;
  deletedCount: number;
};

type Service = { id: number; name: string };

const STATUS_COLORS_LIGHT: Record<string, string> = {
  a_fazer: "#8a8a84",
  em_andamento: "#3b4a63",
  pausado: "#9a6700",
  pulado: "#6b5b95",
  concluido: "#3f6f5a",
  desistido: "#b42318",
};

const STATUS_COLORS_DARK: Record<string, string> = {
  a_fazer: "#b0aaa2",
  em_andamento: "#9db0d0",
  pausado: "#e0b15a",
  pulado: "#b5a6e0",
  concluido: "#7dba95",
  desistido: "#f07167",
};

export function StatsCharts() {
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState<string>("");
  const [reference, setReference] = useState(() => new Date());
  const [reportOpen, setReportOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const statusColors = theme === "dark" ? STATUS_COLORS_DARK : STATUS_COLORS_LIGHT;
  const chartGrid = theme === "dark" ? "#333333" : "#e7e5e0";
  const chartInk = theme === "dark" ? "#f4f1ea" : "#1a1a1a";
  const chartOk = theme === "dark" ? "#7dba95" : "#3f6f5a";
  const chartDanger = theme === "dark" ? "#f07167" : "#b42318";
  const chartAccent = theme === "dark" ? "#9db0d0" : "#3b4a63";
  const chartNotes = theme === "dark" ? "#e0b15a" : "#a58b5c";

  const monthLabel = useMemo(
    () => getPeriodRange("mes", reference).label,
    [reference],
  );
  const isCurrentMonth = periodKeyFromDate(reference) === periodKeyFromDate();
  const refParam = format(reference, "yyyy-MM-dd");

  useEffect(() => {
    api<Service[]>("/api/services").then(setServices).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ ref: refParam });
    if (serviceId) params.set("serviceId", serviceId);
    api<Stats>(`/api/stats?${params}`)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [serviceId, refParam]);

  const statusData =
    stats?.byStatus.map((s) => ({
      name: STATUS_LABELS[s.status as TaskStatus] || s.status,
      value: s.count,
      status: s.status,
    })) || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="hero-title">Relatórios</h1>
          <p className="desk-copy">
            Demanda do mês {monthLabel} — volume de post-its, ritmo e comparação entre períodos.
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
          <select
            className="search-input"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            <option value="">Todas as pastas</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button type="button" className="btn" onClick={() => setReportOpen(true)}>
            Gerar relatório
          </button>
        </div>
      </div>

      {loading && !stats ? (
        <p className="desk-copy">Montando o relatório…</p>
      ) : !stats ? (
        <p className="desk-copy">Não foi possível carregar.</p>
      ) : (
        <>
          <div className="grid-stats" style={{ marginTop: "1.25rem" }}>
            <div className="stat-card">
              <span className="muted">Post-its na mesa</span>
              <strong>{stats.summary.total}</strong>
              <span className="muted stat-card-sub">
                {stats.summary.ofMonth} do mês · {stats.summary.carryIn} arrastados
              </span>
            </div>
            <div className="stat-card">
              <span className="muted">Abertos</span>
              <strong>{stats.summary.open}</strong>
              <span className="muted stat-card-sub">
                {stats.summary.inProgress} em andamento · {stats.summary.paused} pausados
              </span>
            </div>
            <div className="stat-card">
              <span className="muted">Taxa de conclusão</span>
              <strong>{stats.summary.completionRate}%</strong>
              <span className="muted stat-card-sub">
                {stats.summary.completed} concluídos na visão do mês
              </span>
            </div>
            <div className="stat-card">
              <span className="muted">Bloco de notas</span>
              <strong>{stats.summary.notesInMonth}</strong>
              <span className="muted stat-card-sub">
                {stats.summary.pauseEvents} pausas · {stats.summary.skipped} pulados
              </span>
            </div>
          </div>

          <div className="charts-grid">
            <div className="panel panel-pad chart-panel wide">
              <strong>Demanda por mês (tamanho da fila)</strong>
              <p className="muted chart-panel-copy">
                Post-its criados em cada período — compare o volume entre meses.
              </p>
              <ResponsiveContainer width="100%" height="78%">
                <BarChart data={stats.demandByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis dataKey="label" hide={isMobile} stroke={chartInk} />
                  <YAxis allowDecimals={false} width={28} stroke={chartInk} />
                  <Tooltip />
                  {!isMobile ? <Legend /> : null}
                  <Bar dataKey="created" name="Criados" fill={chartInk} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="completed" name="Concluídos" fill={chartOk} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="open" name="Ainda abertos" fill={chartAccent} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="panel panel-pad chart-panel wide">
              <strong>Bloco de post-its por mês</strong>
              <p className="muted chart-panel-copy">
                Notas do bloco (infos/senhas) criadas em cada período.
              </p>
              <ResponsiveContainer width="100%" height="78%">
                <BarChart data={stats.demandByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis dataKey="label" hide={isMobile} stroke={chartInk} />
                  <YAxis allowDecimals={false} width={28} stroke={chartInk} />
                  <Tooltip />
                  <Bar dataKey="notes" name="Notas do bloco" fill={chartNotes} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="panel panel-pad chart-panel">
              <strong>Por status (mês)</strong>
              <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={isMobile ? 70 : 90}
                    label={!isMobile}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.status} fill={statusColors[entry.status] || chartInk} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="panel panel-pad chart-panel">
              <strong>Por prioridade (mês)</strong>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={stats.byPriority}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis dataKey="priority" stroke={chartInk} />
                  <YAxis allowDecimals={false} width={28} stroke={chartInk} />
                  <Tooltip />
                  <Bar dataKey="count" fill={chartInk} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {!serviceId ? (
              <div className="panel panel-pad chart-panel">
                <strong>Por pasta (mês)</strong>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={stats.byService}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                    <XAxis dataKey="serviceName" hide={isMobile} stroke={chartInk} />
                    <YAxis allowDecimals={false} width={28} stroke={chartInk} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {stats.byService.map((entry) => (
                        <Cell key={entry.serviceId} fill={entry.color || chartInk} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : null}

            <div className="panel panel-pad chart-panel wide">
              <strong>Conclusões no mês</strong>
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={stats.completedOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis dataKey="day" hide={isMobile} stroke={chartInk} />
                  <YAxis allowDecimals={false} width={28} stroke={chartInk} />
                  <Tooltip />
                  {!isMobile ? <Legend /> : null}
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Concluídas"
                    stroke={chartOk}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="panel panel-pad chart-panel wide">
              <strong>Desistências do mês</strong>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={stats.abandonments}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis dataKey="day" hide={isMobile} stroke={chartInk} />
                  <YAxis allowDecimals={false} width={28} stroke={chartInk} />
                  <Tooltip />
                  <Bar dataKey="count" name="Desistências" fill={chartDanger} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      <ReportWizard
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        initialServiceId={serviceId}
        initialReference={refParam}
      />
    </div>
  );
}
