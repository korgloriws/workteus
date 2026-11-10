import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { ReportPayload } from "./reports";

function stamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function asciiBar(count: number, max: number, size = 20) {
  if (max <= 0 || count <= 0) return "".padEnd(size, "·");
  const filled = Math.max(1, Math.round((count / max) * size));
  return `${"█".repeat(filled)}${"·".repeat(Math.max(0, size - filled))}`;
}

export function exportReportTxt(report: ReportPayload) {
  const lines: string[] = [];
  lines.push("WORKTEUS — RELATÓRIO");
  lines.push("=".repeat(48));
  lines.push(`Gerado em: ${report.generatedAt}`);
  lines.push(`Pasta: ${report.filters.serviceName}`);
  lines.push(`Período: ${report.filters.periodLabel}`);
  lines.push(`Status: ${report.filters.status}`);
  lines.push(`Total: ${report.summary.total}`);
  lines.push("");

  lines.push("RESUMO");
  lines.push("-".repeat(48));
  lines.push(`Concluídas: ${report.summary.completedCount}`);
  lines.push(`Desistências: ${report.summary.abandonedCount}`);
  lines.push(`Pausas registradas: ${report.summary.pauseCount}`);
  lines.push(`Excluídas: ${report.summary.deletedCount}`);
  lines.push("");

  if (report.filters.includeCharts) {
    const maxStatus = Math.max(1, ...report.summary.byStatus.map((s) => s.count));
    lines.push("GRÁFICO — POR STATUS");
    for (const row of report.summary.byStatus) {
      lines.push(
        `${row.label.padEnd(16)} ${asciiBar(row.count, maxStatus)} ${row.count}`,
      );
    }
    lines.push("");

    const maxPriority = Math.max(1, ...report.summary.byPriority.map((s) => s.count));
    lines.push("GRÁFICO — POR PRIORIDADE");
    for (const row of report.summary.byPriority) {
      lines.push(
        `${row.label.padEnd(16)} ${asciiBar(row.count, maxPriority)} ${row.count}`,
      );
    }
    lines.push("");

    if (report.summary.byService.length > 1) {
      const maxService = Math.max(1, ...report.summary.byService.map((s) => s.count));
      lines.push("GRÁFICO — POR PASTA");
      for (const row of report.summary.byService) {
        lines.push(
          `${row.serviceName.padEnd(16)} ${asciiBar(row.count, maxService)} ${row.count}`,
        );
      }
      lines.push("");
    }
  }

  lines.push("DEMANDAS");
  lines.push("-".repeat(48));
  for (const task of report.tasks) {
    lines.push(
      `${task.code} | ${task.statusLabel} | ${task.priorityLabel} | ${task.serviceName}`,
    );
    lines.push(`  ${task.title}`);
    if (task.dueDate) lines.push(`  Alvo: ${task.dueDate}`);
    if (task.blockedBy) lines.push(`  Bloqueio: ${task.blockedBy}`);
    if (task.notes) lines.push(`  Notas: ${task.notes}`);
    lines.push(`  Etapas: ${task.stepsDone}/${task.stepsTotal}`);
    lines.push("");
  }

  if (report.steps.length) {
    lines.push("ETAPAS");
    lines.push("-".repeat(48));
    for (const step of report.steps) {
      lines.push(
        `${step.done ? "[x]" : "[ ]"} ${step.taskCode} · ${step.content.replace(/\s+/g, " ").trim()}`,
      );
    }
  }

  downloadBlob(
    `workteus-relatorio-${stamp()}.txt`,
    new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }),
  );
}

export function exportReportCsv(report: ReportPayload) {
  const headers = [
    "codigo",
    "titulo",
    "pasta",
    "status",
    "prioridade",
    "alvo",
    "concluido_em",
    "bloqueio",
    "etapas_feitas",
    "etapas_total",
    "notas",
    "motivo_desistencia",
    "criado_em",
  ];

  const escape = (value: string | number) => {
    const text = String(value ?? "");
    if (/[",\n;]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };

  const rows = report.tasks.map((task) =>
    [
      task.code,
      task.title,
      task.serviceName,
      task.statusLabel,
      task.priorityLabel,
      task.dueDate,
      task.completedAt,
      task.blockedBy,
      task.stepsDone,
      task.stepsTotal,
      task.notes,
      task.abandonReason,
      task.createdAt,
    ]
      .map(escape)
      .join(";"),
  );

  const csv = `\uFEFF${headers.join(";")}\n${rows.join("\n")}`;
  downloadBlob(
    `workteus-relatorio-${stamp()}.csv`,
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
}

export function exportReportXlsx(report: ReportPayload) {
  const wb = XLSX.utils.book_new();

  const summaryRows = [
    ["Workteus — Relatório"],
    ["Gerado em", report.generatedAt],
    ["Pasta", report.filters.serviceName],
    ["Período", report.filters.periodLabel],
    ["Status", report.filters.status],
    ["Total", report.summary.total],
    ["Concluídas", report.summary.completedCount],
    ["Desistências", report.summary.abandonedCount],
    ["Pausas", report.summary.pauseCount],
    ["Excluídas", report.summary.deletedCount],
    [],
    ["Status", "Quantidade"],
    ...report.summary.byStatus.map((row) => [row.label, row.count]),
    [],
    ["Prioridade", "Quantidade"],
    ...report.summary.byPriority.map((row) => [row.label, row.count]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Resumo");

  const taskSheet = XLSX.utils.json_to_sheet(
    report.tasks.map((task) => ({
      Codigo: task.code,
      Titulo: task.title,
      Pasta: task.serviceName,
      Status: task.statusLabel,
      Prioridade: task.priorityLabel,
      Alvo: task.dueDate,
      ConcluidoEm: task.completedAt,
      Bloqueio: task.blockedBy,
      EtapasFeitas: task.stepsDone,
      EtapasTotal: task.stepsTotal,
      Notas: task.notes,
      MotivoDesistencia: task.abandonReason,
      CriadoEm: task.createdAt,
    })),
  );
  XLSX.utils.book_append_sheet(wb, taskSheet, "Demandas");

  if (report.steps.length) {
    const stepSheet = XLSX.utils.json_to_sheet(
      report.steps.map((step) => ({
        CodigoDemanda: step.taskCode,
        Demanda: step.taskTitle,
        Etapa: step.content,
        Feita: step.done ? "sim" : "nao",
        Ordem: step.sortOrder,
      })),
    );
    XLSX.utils.book_append_sheet(wb, stepSheet, "Etapas");
  }

  if (report.filters.includeCharts) {
    const chartRows = [
      ["Tipo", "Categoria", "Quantidade"],
      ...report.summary.byStatus.map((row) => ["Status", row.label, row.count]),
      ...report.summary.byPriority.map((row) => ["Prioridade", row.label, row.count]),
      ...report.summary.byService.map((row) => ["Pasta", row.serviceName, row.count]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(chartRows), "Graficos");
  }

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  downloadBlob(
    `workteus-relatorio-${stamp()}.xlsx`,
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
}

function pdfText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/—/g, "-")
    .replace(/–/g, "-");
}

function paintPaperPage(doc: jsPDF) {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  doc.setFillColor(247, 246, 243);
  doc.rect(0, 0, width, height, "F");

  doc.setDrawColor(231, 229, 224);
  for (let lineY = 72; lineY < height - 36; lineY += 18) {
    doc.setLineWidth(0.4);
    doc.line(56, lineY, width - 36, lineY);
  }

  doc.setDrawColor(217, 160, 160);
  doc.setLineWidth(1);
  doc.line(48, 36, 48, height - 28);

  doc.setFillColor(210, 210, 210);
  doc.circle(34, 48, 4.5, "F");
  doc.setFillColor(255, 255, 255);
  doc.circle(34, 48, 2.2, "F");
}

function ensurePdfSpace(doc: jsPDF, y: number, need = 80) {
  const height = doc.internal.pageSize.getHeight();
  if (y + need < height - 36) return y;
  doc.addPage();
  paintPaperPage(doc);
  return 56;
}

export function exportReportPdf(report: ReportPayload) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const margin = 56;
  const contentRight = width - 36;

  const addPage = doc.addPage.bind(doc);
  doc.addPage = ((...args: Parameters<jsPDF["addPage"]>) => {
    const page = addPage(...args);
    paintPaperPage(doc);
    return page;
  }) as jsPDF["addPage"];

  paintPaperPage(doc);

  let y = 52;
  doc.setTextColor(22, 22, 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Workteus", margin, y);

  doc.setDrawColor(165, 139, 92);
  doc.setLineWidth(1.5);
  doc.line(margin, y + 6, margin + 42, y + 6);

  y += 28;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(122, 122, 117);
  doc.text(pdfText("Relatorio de demandas"), margin, y);

  y += 22;
  doc.setTextColor(22, 22, 22);
  doc.setFontSize(9);
  const meta = [
    `Gerado em: ${pdfText(report.generatedAt)}`,
    `Pasta: ${pdfText(report.filters.serviceName)}`,
    `Periodo: ${pdfText(report.filters.periodLabel)}`,
    `Status: ${pdfText(report.filters.status)}`,
  ];
  for (const line of meta) {
    doc.text(line, margin, y);
    y += 12;
  }

  y += 10;
  const cards = [
    { label: "Total", value: String(report.summary.total), fill: [244, 239, 228] as const },
    { label: "Concluidas", value: String(report.summary.completedCount), fill: [233, 239, 234] as const },
    { label: "Desistencias", value: String(report.summary.abandonedCount), fill: [243, 235, 232] as const },
    { label: "Pausas", value: String(report.summary.pauseCount), fill: [236, 239, 243] as const },
  ];
  const gap = 10;
  const cardW = (contentRight - margin - gap * 3) / 4;
  cards.forEach((card, index) => {
    const x = margin + index * (cardW + gap);
    doc.setFillColor(card.fill[0], card.fill[1], card.fill[2]);
    doc.roundedRect(x, y, cardW, 46, 8, 8, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(122, 122, 117);
    doc.text(card.label.toUpperCase(), x + 8, y + 16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(22, 22, 22);
    doc.text(card.value, x + 8, y + 36);
  });
  y += 66;

  if (report.filters.includeCharts) {
    y = ensurePdfSpace(doc, y, 120);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(22, 22, 22);
    doc.text("Resumo visual", margin, y);
    doc.setDrawColor(165, 139, 92);
    doc.setLineWidth(1);
    doc.line(margin, y + 5, margin + 56, y + 5);
    y += 18;

    const drawBars = (
      title: string,
      rows: { label: string; count: number }[],
      startY: number,
      color: [number, number, number],
    ) => {
      let cursor = ensurePdfSpace(doc, startY, 40 + rows.length * 18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(22, 22, 22);
      doc.text(title, margin, cursor);
      cursor += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const max = Math.max(1, ...rows.map((r) => r.count));
      const labelWidth = 110;
      const barMax = contentRight - margin - labelWidth - 28;

      for (const row of rows) {
        cursor = ensurePdfSpace(doc, cursor, 22);
        const barWidth = Math.max(4, Math.round((row.count / max) * barMax));
        doc.setTextColor(90, 90, 86);
        doc.text(pdfText(`${row.label} (${row.count})`), margin, cursor + 8);
        doc.setFillColor(231, 229, 224);
        doc.roundedRect(margin + labelWidth, cursor, barMax, 9, 4, 4, "F");
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(margin + labelWidth, cursor, barWidth, 9, 4, 4, "F");
        cursor += 16;
      }
      return cursor + 8;
    };

    y = drawBars(
      "Por status",
      report.summary.byStatus.map((r) => ({ label: r.label, count: r.count })),
      y,
      [26, 26, 26],
    );
    y = drawBars(
      "Por prioridade",
      report.summary.byPriority.map((r) => ({ label: r.label, count: r.count })),
      y,
      [165, 139, 92],
    );
    if (report.summary.byService.length > 1) {
      y = drawBars(
        "Por pasta",
        report.summary.byService.map((r) => ({ label: r.serviceName, count: r.count })),
        y,
        [59, 74, 99],
      );
    }
  }

  y = ensurePdfSpace(doc, y, 80);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(22, 22, 22);
  doc.text("Demandas", margin, y);
  doc.setDrawColor(165, 139, 92);
  doc.setLineWidth(1);
  doc.line(margin, y + 5, margin + 48, y + 5);

  autoTable(doc, {
    startY: y + 14,
    head: [["Codigo", "Titulo", "Pasta", "Status", "Prioridade", "Alvo", "Etapas"]],
    body: report.tasks.map((task) => [
      pdfText(task.code),
      pdfText(task.title),
      pdfText(task.serviceName),
      pdfText(task.statusLabel),
      pdfText(task.priorityLabel),
      pdfText(task.dueDate || "-"),
      `${task.stepsDone}/${task.stepsTotal}`,
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 5,
      textColor: [22, 22, 22],
      lineColor: [231, 229, 224],
      lineWidth: 0.4,
      fillColor: [255, 255, 255],
    },
    headStyles: {
      fillColor: [250, 249, 246],
      textColor: [122, 122, 117],
      fontStyle: "bold",
      lineColor: [231, 229, 224],
    },
    alternateRowStyles: {
      fillColor: [252, 251, 248],
    },
    margin: { left: margin, right: 36 },
  });

  if (report.steps.length) {
    const docWithTable = doc as jsPDF & { lastAutoTable?: { finalY?: number } };
    let finalY = (docWithTable.lastAutoTable?.finalY || 48) + 20;
    finalY = ensurePdfSpace(doc, finalY, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(22, 22, 22);
    doc.text("Etapas", margin, finalY);
    doc.setDrawColor(165, 139, 92);
    doc.setLineWidth(1);
    doc.line(margin, finalY + 5, margin + 36, finalY + 5);

    autoTable(doc, {
      startY: finalY + 14,
      head: [["Demanda", "Etapa", "Feita"]],
      body: report.steps.map((step) => [
        pdfText(step.taskCode),
        pdfText(step.content),
        step.done ? "sim" : "nao",
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 5,
        textColor: [22, 22, 22],
        lineColor: [231, 229, 224],
        lineWidth: 0.4,
        fillColor: [255, 255, 255],
      },
      headStyles: {
        fillColor: [250, 249, 246],
        textColor: [122, 122, 117],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [252, 251, 248],
      },
      margin: { left: margin, right: 36 },
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(122, 122, 117);
    doc.text("Workteus", margin, doc.internal.pageSize.getHeight() - 16);
    doc.text(
      `${page} / ${pageCount}`,
      contentRight,
      doc.internal.pageSize.getHeight() - 16,
      { align: "right" },
    );
  }

  doc.save(`workteus-relatorio-${stamp()}.pdf`);
}

export function exportReport(report: ReportPayload, format: "txt" | "pdf" | "csv" | "xlsx") {
  switch (format) {
    case "txt":
      return exportReportTxt(report);
    case "csv":
      return exportReportCsv(report);
    case "xlsx":
      return exportReportXlsx(report);
    case "pdf":
      return exportReportPdf(report);
  }
}
