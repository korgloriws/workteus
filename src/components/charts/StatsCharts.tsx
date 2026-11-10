"use client";

import { useEffect, useState } from "react";
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
import { useTheme } from "@/lib/theme";
import { STATUS_LABELS, type TaskStatus } from "@/lib/types";
import { useIsMobile } from "@/lib/useMediaQuery";

type Stats = {
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  byService: { serviceId: number; serviceName: string | null; color: string | null; count: number }[];
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
  const [reportOpen, setReportOpen] = useState(false);
  const statusColors = theme === "dark" ? STATUS_COLORS_DARK : STATUS_COLORS_LIGHT;
  const chartGrid = theme === "dark" ? "#333333" : "#e7e5e0";
  const chartInk = theme === "dark" ? "#f4f1ea" : "#1a1a1a";
  const chartOk = theme === "dark" ? "#7dba95" : "#3f6f5a";
  const chartDanger = theme === "dark" ? "#f07167" : "#b42318";

  useEffect(() => {
    api<Service[]>("/api/services").then(setServices).catch(console.error);
  }, []);

  useEffect(() => {
    const q = serviceId ? `?serviceId=${serviceId}` : "";
    api<Stats>(`/api/stats${q}`).then(setStats).catch(console.error);
  }, [serviceId]);

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
            Contagem de carimbos: ritmo, pausas e desistências.
          </p>
        </div>
        <div className="page-header-actions">
          <select
            className="search-input"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            <option value="">Todos os serviços</option>
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

      {!stats ? (
        <p className="desk-copy">Montando o relatório…</p>
      ) : (
        <>
          <div className="grid-stats" style={{ marginTop: "1.25rem" }}>
            <div className="stat-card">
              <span className="muted">Pausas registradas</span>
              <strong>{stats.pauseCount}</strong>
            </div>
            <div className="stat-card">
              <span className="muted">Excluídas (soft)</span>
              <strong>{stats.deletedCount}</strong>
            </div>
            <div className="stat-card">
              <span className="muted">Status distintos</span>
              <strong>{stats.byStatus.length}</strong>
            </div>
            <div className="stat-card">
              <span className="muted">Conclusões (dias)</span>
              <strong>{stats.completedOverTime.length}</strong>
            </div>
          </div>

          <div className="charts-grid">
            <div className="panel panel-pad chart-panel">
              <strong>Por status</strong>
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
              <strong>Por prioridade</strong>
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
                <strong>Por serviço</strong>
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
              <strong>Conclusões ao longo do tempo</strong>
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={stats.completedOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis dataKey="day" hide={isMobile} stroke={chartInk} />
                  <YAxis allowDecimals={false} width={28} stroke={chartInk} />
                  <Tooltip />
                  {!isMobile ? <Legend /> : null}
                  <Line type="monotone" dataKey="count" name="Concluídas" stroke={chartOk} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="panel panel-pad chart-panel wide">
              <strong>Desistências</strong>
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
      />
    </div>
  );
}
