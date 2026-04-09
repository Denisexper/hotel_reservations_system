import { Reservation } from "../models/reservation.model.js";
import { Room } from "../models/room.model.js";
import { Payment } from "../models/payment.model.js";
import dayjs from "dayjs";

export class DashboardController {

    // Estadísticas generales del hotel
    async getGeneralStats(req, res) {
        try {
            const today = dayjs().startOf('day').toDate();
            const endOfToday = dayjs().endOf('day').toDate();
            const startOfMonth = dayjs().startOf('month').toDate();
            const endOfMonth = dayjs().endOf('month').toDate();

            const [
                totalRooms, occupiedRooms, maintenanceRooms,
                totalReservations, activeReservations, monthlyReservations,
                todayCheckIns, todayCheckOuts,
                monthlyRevenue, totalRevenue, pendingPayments
            ] = await Promise.all([
                Room.countDocuments({ isActive: true }),
                Room.countDocuments({ isActive: true, status: 'ocupada' }),
                Room.countDocuments({ isActive: true, status: 'mantenimiento' }),
                Reservation.countDocuments(),
                Reservation.countDocuments({ status: { $in: ['pendiente', 'confirmada', 'check-in'] } }),
                Reservation.countDocuments({ createdAt: { $gte: startOfMonth, $lte: endOfMonth } }),
                Reservation.countDocuments({ status: { $in: ['confirmada', 'check-in'] }, checkIn: { $gte: today, $lte: endOfToday } }),
                Reservation.countDocuments({ status: 'check-in', checkOut: { $gte: today, $lte: endOfToday } }),
                Payment.aggregate([{ $match: { status: 'completado', paymentDate: { $gte: startOfMonth, $lte: endOfMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
                Payment.aggregate([{ $match: { status: 'completado' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
                Reservation.countDocuments({ paymentStatus: 'pendiente', status: { $ne: 'cancelada' } })
            ]);

            const availableRooms = totalRooms - occupiedRooms - maintenanceRooms;
            const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

            res.status(200).json({
                msj: "Estadísticas generales obtenidas",
                data: {
                    rooms: { total: totalRooms, occupied: occupiedRooms, available: availableRooms, maintenance: maintenanceRooms, occupancyRate },
                    reservations: { total: totalReservations, active: activeReservations, thisMonth: monthlyReservations, pendingPayments },
                    today: { checkIns: todayCheckIns, checkOuts: todayCheckOuts },
                    revenue: { thisMonth: monthlyRevenue[0]?.total || 0, total: totalRevenue[0]?.total || 0 }
                }
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener estadísticas", error: error.message });
        }
    }

    // Ingresos por período
    async getRevenueByPeriod(req, res) {
        try {
            const { period = 'monthly', year = new Date().getFullYear() } = req.query;
            let groupFormat;
            if (period === 'daily') groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } };
            else if (period === 'weekly') groupFormat = { $isoWeek: '$paymentDate' };
            else groupFormat = { $month: '$paymentDate' };

            const startOfYear = new Date(`${year}-01-01`);
            const endOfYear = new Date(`${year}-12-31T23:59:59`);

            const revenue = await Payment.aggregate([
                { $match: { status: 'completado', paymentDate: { $gte: startOfYear, $lte: endOfYear } } },
                { $group: { _id: groupFormat, total: { $sum: '$amount' }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ]);

            let formattedRevenue = revenue;
            if (period === 'monthly') {
                const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                formattedRevenue = revenue.map(item => ({ month: monthNames[item._id - 1], monthNumber: item._id, total: item.total, count: item.count }));
            }

            res.status(200).json({ msj: "Ingresos por período obtenidos", data: formattedRevenue, year: parseInt(year), period });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener ingresos", error: error.message });
        }
    }

    // Reservas por estado
    async getReservationsByStatus(req, res) {
        try {
            const stats = await Reservation.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
            const statusLabels = { 'pendiente': 'Pendiente', 'confirmada': 'Confirmada', 'check-in': 'Check-In', 'check-out': 'Check-Out', 'cancelada': 'Cancelada' };
            const formatted = stats.map(item => ({ status: item._id, label: statusLabels[item._id] || item._id, count: item.count }));
            res.status(200).json({ msj: "Reservas por estado obtenidas", data: formatted });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener reservas por estado", error: error.message });
        }
    }

    // Habitaciones más reservadas
    async getTopRooms(req, res) {
        try {
            const { limit = 5 } = req.query;
            const topRooms = await Reservation.aggregate([
                { $match: { status: { $ne: 'cancelada' } } },
                { $group: { _id: '$room', totalReservations: { $sum: 1 }, totalRevenue: { $sum: '$totalAmount' } } },
                { $sort: { totalReservations: -1 } },
                { $limit: parseInt(limit) },
                { $lookup: { from: 'rooms', localField: '_id', foreignField: '_id', as: 'roomInfo' } },
                { $unwind: '$roomInfo' },
                { $project: { _id: 0, roomId: '$_id', roomNumber: '$roomInfo.roomNumber', type: '$roomInfo.type', totalReservations: 1, totalRevenue: 1 } }
            ]);
            res.status(200).json({ msj: "Habitaciones más reservadas", data: topRooms });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener ranking", error: error.message });
        }
    }

    // Check-ins y check-outs del día
    async getTodayActivity(req, res) {
        try {
            const today = dayjs().startOf('day').toDate();
            const endOfToday = dayjs().endOf('day').toDate();
            const [checkIns, checkOuts] = await Promise.all([
                Reservation.find({ status: { $in: ['confirmada', 'check-in'] }, checkIn: { $gte: today, $lte: endOfToday } })
                    .populate('client', 'name email phone').populate('room', 'roomNumber type floor').sort({ checkIn: 1 }),
                Reservation.find({ status: 'check-in', checkOut: { $gte: today, $lte: endOfToday } })
                    .populate('client', 'name email phone').populate('room', 'roomNumber type floor').sort({ checkOut: 1 })
            ]);
            res.status(200).json({ msj: "Actividad del día obtenida", data: { checkIns: { count: checkIns.length, reservations: checkIns }, checkOuts: { count: checkOuts.length, reservations: checkOuts } } });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener actividad del día", error: error.message });
        }
    }

    // Ocupación por período
    async getOccupancyByPeriod(req, res) {
        try {
            const { days = 30 } = req.query;
            const totalRooms = await Room.countDocuments({ isActive: true });
            const startDate = dayjs().subtract(parseInt(days), 'day').startOf('day').toDate();
            const endDate = dayjs().endOf('day').toDate();

            const reservations = await Reservation.find({
                status: { $in: ['confirmada', 'check-in', 'check-out'] },
                checkIn: { $lte: endDate }, checkOut: { $gte: startDate }
            }).select('checkIn checkOut');

            const occupancyData = [];
            let currentDate = dayjs(startDate);
            const end = dayjs(endDate);
            while (currentDate.isBefore(end) || currentDate.isSame(end, 'day')) {
                const date = currentDate.toDate();
                const occupiedCount = reservations.filter(r => new Date(r.checkIn) <= date && new Date(r.checkOut) > date).length;
                occupancyData.push({ date: currentDate.format('YYYY-MM-DD'), occupied: occupiedCount, available: totalRooms - occupiedCount, rate: totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0 });
                currentDate = currentDate.add(1, 'day');
            }
            res.status(200).json({ msj: "Ocupación por período obtenida", data: occupancyData, totalRooms });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener ocupación", error: error.message });
        }
    }

    // Ingresos por método de pago
    async getRevenueByPaymentMethod(req, res) {
        try {
            const stats = await Payment.aggregate([
                { $match: { status: 'completado' } },
                { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } },
                { $sort: { total: -1 } }
            ]);
            const methodLabels = { 'efectivo': 'Efectivo', 'tarjeta': 'Tarjeta', 'transferencia': 'Transferencia' };
            const formatted = stats.map(item => ({ method: item._id, label: methodLabels[item._id] || item._id, total: item.total, count: item.count }));
            res.status(200).json({ msj: "Ingresos por método de pago", data: formatted });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener ingresos por método", error: error.message });
        }
    }

    // ==================== EXPORTACIONES ====================

    // Helper interno: recopilar todas las estadísticas
    async _getAllStats() {
        const today = dayjs().startOf('day').toDate();
        const endOfToday = dayjs().endOf('day').toDate();
        const startOfMonth = dayjs().startOf('month').toDate();
        const endOfMonth = dayjs().endOf('month').toDate();
        const year = new Date().getFullYear();
        const startOfYear = new Date(`${year}-01-01`);
        const endOfYear = new Date(`${year}-12-31T23:59:59`);

        const [
            totalRooms, occupiedRooms, maintenanceRooms,
            totalReservations, activeReservations, monthlyReservations,
            todayCheckIns, todayCheckOuts,
            monthlyRevenue, totalRevenue, pendingPayments,
            reservationsByStatus, topRooms, revenueByMethod, monthlyRevenueBreakdown
        ] = await Promise.all([
            Room.countDocuments({ isActive: true }),
            Room.countDocuments({ isActive: true, status: 'ocupada' }),
            Room.countDocuments({ isActive: true, status: 'mantenimiento' }),
            Reservation.countDocuments(),
            Reservation.countDocuments({ status: { $in: ['pendiente', 'confirmada', 'check-in'] } }),
            Reservation.countDocuments({ createdAt: { $gte: startOfMonth, $lte: endOfMonth } }),
            Reservation.countDocuments({ status: { $in: ['confirmada', 'check-in'] }, checkIn: { $gte: today, $lte: endOfToday } }),
            Reservation.countDocuments({ status: 'check-in', checkOut: { $gte: today, $lte: endOfToday } }),
            Payment.aggregate([{ $match: { status: 'completado', paymentDate: { $gte: startOfMonth, $lte: endOfMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
            Payment.aggregate([{ $match: { status: 'completado' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
            Reservation.countDocuments({ paymentStatus: 'pendiente', status: { $ne: 'cancelada' } }),
            Reservation.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
            Reservation.aggregate([
                { $match: { status: { $ne: 'cancelada' } } },
                { $group: { _id: '$room', totalReservations: { $sum: 1 }, totalRevenue: { $sum: '$totalAmount' } } },
                { $sort: { totalReservations: -1 } }, { $limit: 10 },
                { $lookup: { from: 'rooms', localField: '_id', foreignField: '_id', as: 'roomInfo' } },
                { $unwind: '$roomInfo' },
                { $project: { _id: 0, roomNumber: '$roomInfo.roomNumber', type: '$roomInfo.type', totalReservations: 1, totalRevenue: 1 } }
            ]),
            Payment.aggregate([{ $match: { status: 'completado' } }, { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }]),
            Payment.aggregate([
                { $match: { status: 'completado', paymentDate: { $gte: startOfYear, $lte: endOfYear } } },
                { $group: { _id: { $month: '$paymentDate' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ])
        ]);

        const availableRooms = totalRooms - occupiedRooms - maintenanceRooms;
        const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
        const statusLabels = { 'pendiente': 'Pendiente', 'confirmada': 'Confirmada', 'check-in': 'Check-In', 'check-out': 'Check-Out', 'cancelada': 'Cancelada' };
        const methodLabels = { 'efectivo': 'Efectivo', 'tarjeta': 'Tarjeta', 'transferencia': 'Transferencia' };
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        return {
            rooms: { total: totalRooms, occupied: occupiedRooms, available: availableRooms, maintenance: maintenanceRooms, occupancyRate },
            reservations: { total: totalReservations, active: activeReservations, thisMonth: monthlyReservations, pendingPayments },
            today: { checkIns: todayCheckIns, checkOuts: todayCheckOuts },
            revenue: { thisMonth: monthlyRevenue[0]?.total || 0, total: totalRevenue[0]?.total || 0 },
            reservationsByStatus: reservationsByStatus.map(s => ({ status: statusLabels[s._id] || s._id, count: s.count })),
            topRooms,
            revenueByMethod: revenueByMethod.map(m => ({ method: methodLabels[m._id] || m._id, total: m.total, count: m.count })),
            monthlyRevenue: monthlyRevenueBreakdown.map(m => ({ month: monthNames[m._id - 1], total: m.total, count: m.count })),
            year
        };
    }

    // Exportar dashboard a Excel
    async exportExcel(req, res) {
        try {
            const ExcelJS = (await import('exceljs')).default;
            const stats = await this._getAllStats();

            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Hotel Reservations';
            workbook.created = new Date();

            // HOJA 1: Resumen General
            const wsGeneral = workbook.addWorksheet('Resumen General');
            wsGeneral.mergeCells('A1:D1');
            wsGeneral.getCell('A1').value = 'Reporte General del Hotel';
            wsGeneral.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FF1A1A2E' } };
            wsGeneral.getCell('A1').alignment = { horizontal: 'center' };
            wsGeneral.mergeCells('A2:D2');
            wsGeneral.getCell('A2').value = `Generado: ${new Date().toLocaleString('es-ES')}`;
            wsGeneral.getCell('A2').font = { size: 10, italic: true, color: { argb: 'FF666666' } };
            wsGeneral.getCell('A2').alignment = { horizontal: 'center' };
            wsGeneral.addRow([]);

            const addSection = (ws, title, color, data) => {
                const header = ws.addRow([title]);
                header.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
                header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
                data.forEach(([label, value]) => ws.addRow([label, value]));
                ws.addRow([]);
            };

            addSection(wsGeneral, 'HABITACIONES', 'FF1A1A2E', [
                ['Total de habitaciones', stats.rooms.total],
                ['Ocupadas', stats.rooms.occupied],
                ['Disponibles', stats.rooms.available],
                ['En mantenimiento', stats.rooms.maintenance],
                ['Tasa de ocupación', `${stats.rooms.occupancyRate}%`]
            ]);

            addSection(wsGeneral, 'RESERVAS', 'FF4361EE', [
                ['Total de reservas', stats.reservations.total],
                ['Reservas activas', stats.reservations.active],
                ['Reservas este mes', stats.reservations.thisMonth],
                ['Pagos pendientes', stats.reservations.pendingPayments]
            ]);

            addSection(wsGeneral, 'ACTIVIDAD DE HOY', 'FF28A745', [
                ['Check-ins programados', stats.today.checkIns],
                ['Check-outs programados', stats.today.checkOuts]
            ]);

            addSection(wsGeneral, 'INGRESOS', 'FFDC3545', [
                ['Ingresos este mes', `$${stats.revenue.thisMonth.toFixed(2)}`],
                ['Ingresos totales', `$${stats.revenue.total.toFixed(2)}`]
            ]);

            wsGeneral.columns = [{ width: 30 }, { width: 20 }, { width: 15 }, { width: 15 }];

            // HOJA 2: Reservas por Estado
            const wsStatus = workbook.addWorksheet('Reservas por Estado');
            wsStatus.mergeCells('A1:B1');
            wsStatus.getCell('A1').value = 'Reservas por Estado';
            wsStatus.getCell('A1').font = { size: 14, bold: true };
            wsStatus.addRow([]);
            const statusHeader = wsStatus.addRow(['Estado', 'Cantidad']);
            statusHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            statusHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
            stats.reservationsByStatus.forEach(s => wsStatus.addRow([s.status, s.count]));
            wsStatus.columns = [{ width: 20 }, { width: 15 }];

            // HOJA 3: Top Habitaciones
            const wsTop = workbook.addWorksheet('Top Habitaciones');
            wsTop.mergeCells('A1:D1');
            wsTop.getCell('A1').value = 'Habitaciones Más Reservadas';
            wsTop.getCell('A1').font = { size: 14, bold: true };
            wsTop.addRow([]);
            const topHeader = wsTop.addRow(['Habitación', 'Tipo', 'Reservas', 'Ingresos']);
            topHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            topHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
            stats.topRooms.forEach(r => wsTop.addRow([r.roomNumber, r.type, r.totalReservations, `$${r.totalRevenue.toFixed(2)}`]));
            wsTop.columns = [{ width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }];

            // HOJA 4: Ingresos Mensuales
            const wsRevenue = workbook.addWorksheet('Ingresos Mensuales');
            wsRevenue.mergeCells('A1:C1');
            wsRevenue.getCell('A1').value = `Ingresos Mensuales ${stats.year}`;
            wsRevenue.getCell('A1').font = { size: 14, bold: true };
            wsRevenue.addRow([]);
            const revHeader = wsRevenue.addRow(['Mes', 'Pagos', 'Total']);
            revHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            revHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
            stats.monthlyRevenue.forEach(m => wsRevenue.addRow([m.month, m.count, `$${m.total.toFixed(2)}`]));
            wsRevenue.columns = [{ width: 18 }, { width: 12 }, { width: 18 }];

            // HOJA 5: Ingresos por Método
            const wsMethod = workbook.addWorksheet('Ingresos por Método');
            wsMethod.mergeCells('A1:C1');
            wsMethod.getCell('A1').value = 'Ingresos por Método de Pago';
            wsMethod.getCell('A1').font = { size: 14, bold: true };
            wsMethod.addRow([]);
            const methodHdr = wsMethod.addRow(['Método', 'Pagos', 'Total']);
            methodHdr.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            methodHdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
            stats.revenueByMethod.forEach(m => wsMethod.addRow([m.method, m.count, `$${m.total.toFixed(2)}`]));
            wsMethod.columns = [{ width: 20 }, { width: 12 }, { width: 18 }];

            // Bordes
            [wsGeneral, wsStatus, wsTop, wsRevenue, wsMethod].forEach(ws => {
                ws.eachRow((row, rowNumber) => {
                    if (rowNumber > 2) {
                        row.eachCell(cell => {
                            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                        });
                    }
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=reporte_hotel_${Date.now()}.xlsx`);
            res.send(buffer);
        } catch (error) {
            res.status(500).json({ msj: "Error generando reporte Excel", error: error.message });
        }
    }

    // Exportar dashboard a PDF
    async exportPDF(req, res) {
        try {
            const PDFDocument = (await import('pdfkit')).default;
            const stats = await this._getAllStats();

            const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=reporte_hotel_${Date.now()}.pdf`);
            doc.pipe(res);

            // HEADER
            doc.fontSize(22).font('Helvetica-Bold').fillColor('#1a1a2e').text('Hotel Reservations', { align: 'center' });
            doc.fontSize(10).font('Helvetica').fillColor('#666666').text('Reporte General de Estadísticas', { align: 'center' });
            doc.fontSize(9).text(`Generado: ${new Date().toLocaleString('es-ES')}`, { align: 'center' });
            doc.moveDown(1.5);
            doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke('#cccccc');
            doc.moveDown(1);

            // RESUMEN GENERAL
            doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a2e').text('Resumen General');
            doc.moveDown(0.5);

            const leftCol = 50;
            const rightCol = 300;
            let y = doc.y;

            doc.fontSize(11).font('Helvetica-Bold').fillColor('#4361ee').text('Habitaciones', leftCol, y);
            y += 18;
            doc.fontSize(10).font('Helvetica').fillColor('#333333');
            doc.text(`Total: ${stats.rooms.total}`, leftCol + 10, y); doc.text(`Ocupadas: ${stats.rooms.occupied}`, rightCol, y); y += 15;
            doc.text(`Disponibles: ${stats.rooms.available}`, leftCol + 10, y); doc.text(`Mantenimiento: ${stats.rooms.maintenance}`, rightCol, y); y += 15;
            doc.text(`Tasa de ocupación: ${stats.rooms.occupancyRate}%`, leftCol + 10, y); y += 25;

            doc.fontSize(11).font('Helvetica-Bold').fillColor('#4361ee').text('Reservas', leftCol, y);
            y += 18;
            doc.fontSize(10).font('Helvetica').fillColor('#333333');
            doc.text(`Total: ${stats.reservations.total}`, leftCol + 10, y); doc.text(`Activas: ${stats.reservations.active}`, rightCol, y); y += 15;
            doc.text(`Este mes: ${stats.reservations.thisMonth}`, leftCol + 10, y); doc.text(`Pagos pendientes: ${stats.reservations.pendingPayments}`, rightCol, y); y += 25;

            doc.fontSize(11).font('Helvetica-Bold').fillColor('#4361ee').text('Ingresos', leftCol, y);
            y += 18;
            doc.fontSize(10).font('Helvetica').fillColor('#333333');
            doc.text(`Este mes: $${stats.revenue.thisMonth.toFixed(2)}`, leftCol + 10, y); doc.text(`Total: $${stats.revenue.total.toFixed(2)}`, rightCol, y); y += 25;

            doc.fontSize(11).font('Helvetica-Bold').fillColor('#4361ee').text('Actividad de Hoy', leftCol, y);
            y += 18;
            doc.fontSize(10).font('Helvetica').fillColor('#333333');
            doc.text(`Check-ins: ${stats.today.checkIns}`, leftCol + 10, y); doc.text(`Check-outs: ${stats.today.checkOuts}`, rightCol, y);

            doc.moveDown(3);
            doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke('#cccccc');
            doc.moveDown(1);

            // Helper para tablas PDF
            const drawTable = (title, headers, rows, colWidths, startX = 50) => {
                if (doc.y > 580) doc.addPage();
                doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a2e').text(title);
                doc.moveDown(0.5);

                let tableY = doc.y;
                let x = startX;

                // Header
                doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
                headers.forEach((h, i) => {
                    doc.rect(x, tableY, colWidths[i], 18).fill('#4472C4');
                    doc.fillColor('#ffffff').text(h, x + 8, tableY + 4, { width: colWidths[i] - 16 });
                    x += colWidths[i];
                });
                tableY += 18;

                // Rows
                doc.font('Helvetica').fontSize(9);
                rows.forEach((row, i) => {
                    x = startX;
                    const totalWidth = colWidths.reduce((a, b) => a + b, 0);
                    if (i % 2 === 0) doc.rect(startX, tableY, totalWidth, 16).fill('#f8f9fa');
                    row.forEach((cell, j) => {
                        doc.fillColor('#333333').text(String(cell), x + 8, tableY + 3, { width: colWidths[j] - 16 });
                        x += colWidths[j];
                    });
                    tableY += 16;
                });

                doc.moveDown(2);
            };

            // RESERVAS POR ESTADO
            drawTable('Reservas por Estado', ['Estado', 'Cantidad'], stats.reservationsByStatus.map(s => [s.status, s.count]), [250, 100]);

            // TOP HABITACIONES
            drawTable('Habitaciones Más Reservadas', ['Habitación', 'Tipo', 'Reservas', 'Ingresos'],
                stats.topRooms.map(r => [r.roomNumber, r.type, r.totalReservations, `$${r.totalRevenue.toFixed(2)}`]),
                [120, 120, 80, 100]);

            // INGRESOS MENSUALES
            drawTable(`Ingresos Mensuales ${stats.year}`, ['Mes', 'Pagos', 'Total'],
                stats.monthlyRevenue.map(m => [m.month, m.count, `$${m.total.toFixed(2)}`]),
                [170, 80, 120]);

            // INGRESOS POR MÉTODO
            drawTable('Ingresos por Método de Pago', ['Método', 'Pagos', 'Total'],
                stats.revenueByMethod.map(m => [m.method, m.count, `$${m.total.toFixed(2)}`]),
                [170, 80, 120]);

            // FOOTER
            doc.moveDown(2);
            doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke('#cccccc');
            doc.moveDown(0.5);
            doc.fontSize(8).font('Helvetica').fillColor('#999999');
            doc.text('Este reporte fue generado automáticamente por el Sistema de Reservas del Hotel.', { align: 'center' });
            doc.text(`© ${new Date().getFullYear()} Hotel Reservations. Todos los derechos reservados.`, { align: 'center' });

            doc.end();
        } catch (error) {
            res.status(500).json({ msj: "Error generando reporte PDF", error: error.message });
        }
    }
}