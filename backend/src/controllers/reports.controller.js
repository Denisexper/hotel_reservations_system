import { Log } from "../models/logs.model.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

/**
 * Generar reporte de logs en Excel
 */
export const generateExcelReport = async (req, res) => {
  try {
    const {
      user,
      action,
      resource,
      startDate,
      endDate,
      exportAll = "true",
      page = 1,
      limit = 10,
    } = req.query;

    // Construir filtro (mismo que en logsReports)
    const filter = {};
    if (user) filter.user = user;
    if (action) filter.action = action;
    if (resource) filter.resource = resource;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          filter.createdAt.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          filter.createdAt.$lte = end;
        }
      }
    }

    // Consulta base
    let query = Log.find(filter)
      .select("-__v")
      .populate("user", "name email")
      .populate("targetUser", "name email")
      .sort({ createdAt: -1 });

    // Aplicar límite según exportAll
    if (exportAll === "false") {
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;
      query = query.skip(skip).limit(limitNum);
    } else {
      query = query.limit(1000); // Máximo 1000 registros para exportación completa
    }

    const logs = await query;

    // Crear workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Logs");

    // Metadata
    workbook.creator = "Sistema de Bitácoras";
    workbook.created = new Date();

    // Agregar título
    worksheet.mergeCells("A1:F1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "Reporte de Bitácoras";
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: "center" };

    // Agregar info de filtros
    worksheet.mergeCells("A2:F2");
    const filterCell = worksheet.getCell("A2");
    const filterTexts = [];
    if (action) filterTexts.push(`Acción: ${action}`);
    if (resource) filterTexts.push(`Recurso: ${resource}`);
    if (startDate && endDate) {
      filterTexts.push(
        `Fechas: ${new Date(startDate).toLocaleDateString("es-ES")} - ${new Date(endDate).toLocaleDateString("es-ES")}`,
      );
    }
    if (exportAll === "false") {
      filterTexts.push(`Página: ${page}`);
    }
    filterCell.value =
      filterTexts.length > 0
        ? `Filtros aplicados: ${filterTexts.join(" | ")}`
        : "Sin filtros aplicados - Mostrando todos los logs";
    filterCell.font = { size: 10, italic: true };
    filterCell.alignment = { horizontal: "center" };

    // Espacio
    worksheet.addRow([]);

    // Headers
    const headerRow = worksheet.addRow([
      "Fecha",
      "Usuario",
      "Acción",
      "Recurso",
      "Usuario Afectado",
      "Status",
    ]);

    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    headerRow.font = { color: { argb: "FFFFFFFF" }, bold: true };
    headerRow.alignment = { horizontal: "center" };

    // Datos
    logs.forEach((log) => {
      worksheet.addRow([
        new Date(log.createdAt).toLocaleString("es-ES"),
        log.user?.name || "Desconocido",
        log.action,
        log.resource,
        log.targetUser?.name || log.targetUserName || "-",
        log.statusCode,
      ]);
    });

    // Ajustar anchos de columna
    worksheet.columns = [
      { width: 20 }, // Fecha
      { width: 25 }, // Usuario
      { width: 12 }, // Acción
      { width: 15 }, // Recurso
      { width: 25 }, // Usuario Afectado
      { width: 10 }, // Status
    ];

    // Bordes a todas las celdas con datos
    const dataStartRow = 4;
    const dataEndRow = worksheet.rowCount;
    for (let i = dataStartRow; i <= dataEndRow; i++) {
      for (let j = 1; j <= 6; j++) {
        const cell = worksheet.getCell(i, j);
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
    }

    // Footer
    worksheet.addRow([]);
    const footerRow = worksheet.addRow([
      `Total de registros: ${logs.length}${exportAll === "false" ? ` (Página ${page})` : ""}`,
      "",
      "",
      "",
      "",
      `Generado: ${new Date().toLocaleString("es-ES")}`,
    ]);
    footerRow.font = { italic: true, size: 9 };

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Enviar archivo
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=logs_${Date.now()}.xlsx`,
    );
    res.send(buffer);
  } catch (error) {
    console.error("Error generando Excel:", error);
    res.status(500).json({
      msj: "Error generando reporte Excel",
      error: error.message,
    });
  }
};

/**
 * Generar reporte de logs en PDF
 */
export const generatePDFReport = async (req, res) => {
  try {
    const {
      user,
      action,
      resource,
      startDate,
      endDate,
      exportAll = "true",
      page = 1,
      limit = 10,
    } = req.query;

    // Construir filtro
    const filter = {};
    if (user) filter.user = user;
    if (action) filter.action = action;
    if (resource) filter.resource = resource;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          filter.createdAt.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          filter.createdAt.$lte = end;
        }
      }
    }

    // Consulta base
    let query = Log.find(filter)
      .select("-__v")
      .populate("user", "name email")
      .populate("targetUser", "name email")
      .sort({ createdAt: -1 });

    // Aplicar límite según exportAll
    if (exportAll === "false") {
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;
      query = query.skip(skip).limit(limitNum);
    } else {
      query = query.limit(1000);
    }

    const logs = await query;

    // Crear documento PDF
    const doc = new PDFDocument({ margin: 50, size: "A4" });

    // Headers para descarga
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=logs_${Date.now()}.pdf`,
    );

    // Pipe al response
    doc.pipe(res);

    // Título
    doc.fontSize(20).text("Reporte de Bitácoras", { align: "center" });
    doc.moveDown();

    // Filtros aplicados
    doc.fontSize(10);
    const filterTexts = [];
    if (action) filterTexts.push(`Acción: ${action}`);
    if (resource) filterTexts.push(`Recurso: ${resource}`);
    if (startDate && endDate) {
      filterTexts.push(
        `Fechas: ${new Date(startDate).toLocaleDateString("es-ES")} - ${new Date(endDate).toLocaleDateString("es-ES")}`,
      );
    }
    if (exportAll === "false") {
      filterTexts.push(`Página: ${page}`);
    }

    if (filterTexts.length > 0) {
      doc.text(`Filtros aplicados: ${filterTexts.join(" | ")}`, {
        align: "center",
      });
    } else {
      doc.text("Sin filtros aplicados - Mostrando todos los logs", {
        align: "center",
      });
    }

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Tabla de logs
    const tableTop = doc.y;
    const rowHeight = 25;

    // Headers de tabla
    doc.fontSize(9).font("Helvetica-Bold");
    doc.text("Fecha", 50, tableTop, { width: 80 });
    doc.text("Usuario", 130, tableTop, { width: 90 });
    doc.text("Acción", 220, tableTop, { width: 60 });
    doc.text("Recurso", 280, tableTop, { width: 70 });
    doc.text("Afectado", 350, tableTop, { width: 100 });
    doc.text("Status", 450, tableTop, { width: 50 });

    doc
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    // Datos
    doc.font("Helvetica").fontSize(8);
    let y = tableTop + 20;

    logs.forEach((log, index) => {
      // Nueva página si es necesario
      if (y > 720) {
        doc.addPage();
        y = 50;
      }

      doc.text(new Date(log.createdAt).toLocaleDateString("es-ES"), 50, y, {
        width: 80,
      });
      doc.text(log.user?.name || "Desconocido", 130, y, { width: 90 });
      doc.text(log.action, 220, y, { width: 60 });
      doc.text(log.resource, 280, y, { width: 70 });
      doc.text(log.targetUser?.name || log.targetUserName || "-", 350, y, {
        width: 100,
      });
      doc.text(log.statusCode?.toString() || "-", 450, y, { width: 50 });

      y += rowHeight;
    });

    // Footer
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.fontSize(10);
    doc.text(
      `Total de registros: ${logs.length}${exportAll === "false" ? ` (Página ${page})` : ""}`,
      50,
      doc.y + 10,
    );
    doc.text(`Generado: ${new Date().toLocaleString("es-ES")}`, 350, doc.y);

    // Finalizar
    doc.end();
  } catch (error) {
    console.error("Error generando PDF:", error);
    res.status(500).json({
      msj: "Error generando reporte PDF",
      error: error.message,
    });
  }
};
