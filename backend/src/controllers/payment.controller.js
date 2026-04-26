import { Payment } from "../models/payment.model.js";
import { Reservation } from "../models/reservation.model.js";
import { sendPaymentConfirmation, sendRefundEmail } from "../services/email.service.js";

export class PaymentController {

    // Listar pagos con filtros y paginación
    async getAll(req, res) {
        try {
            const { status, paymentMethod, startDate, endDate, page = 1, limit = 10 } = req.query;
            const filter = {};

            if (status) filter.status = status;
            if (paymentMethod) filter.paymentMethod = paymentMethod;

            if (startDate || endDate) {
                filter.paymentDate = {};
                if (startDate) filter.paymentDate.$gte = new Date(startDate);
                if (endDate) filter.paymentDate.$lte = new Date(endDate);
            }

            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;

            const [payments, totalRecords] = await Promise.all([
                Payment.find(filter)
                    .populate({
                        path: 'reservation',
                        select: 'reservationCode client room checkIn checkOut totalAmount status',
                        populate: [
                            { path: 'client', select: 'name email' },
                            { path: 'room', select: 'roomNumber type' }
                        ]
                    })
                    .populate('processedBy', 'name email')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum),
                Payment.countDocuments(filter)
            ]);

            const totalPages = Math.ceil(totalRecords / limitNum);

            res.status(200).json({
                msj: payments.length === 0 ? "No se encontraron pagos" : "Pagos obtenidos correctamente",
                total: totalRecords,
                data: payments,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalRecords,
                    limit: limitNum,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1
                }
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener pagos", error: error.message });
        }
    }

    // Obtener pago por ID
    async getPayment(req, res) {
        try {
            const { id } = req.params;

            const payment = await Payment.findById(id)
                .populate({
                    path: 'reservation',
                    select: 'reservationCode client room checkIn checkOut totalAmount status numberOfGuests',
                    populate: [
                        { path: 'client', select: 'name email phone' },
                        { path: 'room', select: 'roomNumber type basePrice' }
                    ]
                })
                .populate('processedBy', 'name email');

            if (!payment) {
                return res.status(404).json({ msj: "Pago no encontrado" });
            }

            res.status(200).json({ msj: "Pago encontrado", data: payment });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener pago", error: error.message });
        }
    }

    // Obtener pagos por reserva
    async getPaymentsByReservation(req, res) {
        try {
            const { reservationId } = req.params;

            const payments = await Payment.find({ reservation: reservationId })
                .populate('processedBy', 'name email')
                .sort({ createdAt: -1 });

            res.status(200).json({
                msj: "Pagos de la reserva obtenidos",
                data: payments
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener pagos", error: error.message });
        }
    }

    // Registrar pago (simulado)
    async createPayment(req, res) {
        try {
            const { reservation: reservationId, paymentMethod, receiptType, notes } = req.body;

            // Validar reserva
            const reservation = await Reservation.findById(reservationId)
                .populate('client', 'name email')
                .populate('room', 'roomNumber type');

            if (!reservation) {
                return res.status(404).json({ msj: "Reserva no encontrada" });
            }

            if (reservation.status === 'cancelada') {
                return res.status(400).json({ msj: "No se puede pagar una reserva cancelada" });
            }

            if (reservation.paymentStatus === 'pagado') {
                return res.status(400).json({ msj: "Esta reserva ya fue pagada" });
            }

            // Validar datos del cliente para crédito fiscal
            if (receiptType === 'credito_fiscal') {
                const { userModel } = await import('../models/user.model.js');
                const clientData = await userModel.findById(reservation.client._id);

                if (!clientData.documentNumber || !clientData.documentType) {
                    return res.status(400).json({
                        msj: "Para Crédito Fiscal se requiere DUI/documento del cliente. Actualiza los datos del cliente primero."
                    });
                }
            }

            // Generar IDs únicos
            const transactionId = Payment.generateTransactionId();
            const receiptNumber = await Payment.generateReceiptNumber(receiptType);

            // Crear pago
            const newPayment = await Payment.create({
                reservation: reservationId,
                amount: reservation.totalAmount,
                paymentMethod,
                transactionId,
                receiptType,
                receiptNumber,
                status: 'completado',
                processedBy: req.user.id,
                notes
            });

            // Actualizar estado de pago en la reserva
            reservation.paymentStatus = 'pagado';
            if (reservation.status === 'pendiente') {
                reservation.status = 'confirmada';
            }
            await reservation.save();

            // Poblar el pago para la respuesta
            await newPayment.populate([
                {
                    path: 'reservation',
                    select: 'reservationCode client room checkIn checkOut totalAmount status',
                    populate: [
                        { path: 'client', select: 'name email' },
                        { path: 'room', select: 'roomNumber type' }
                    ]
                },
                { path: 'processedBy', select: 'name email' }
            ]);

            // Enviar email de confirmación
            try {
                await sendPaymentConfirmation({
                    to: reservation.client.email,
                    clientName: reservation.client.name,
                    payment: newPayment,
                    reservation
                });
            } catch (emailError) {
                console.error('Error enviando email de pago:', emailError.message);
            }

            res.status(201).json({
                msj: "Pago registrado exitosamente",
                data: newPayment
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al registrar pago", error: error.message });
        }
    }

    // Reembolsar pago
    async refundPayment(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const payment = await Payment.findById(id)
                .populate({
                    path: 'reservation',
                    populate: [
                        { path: 'client', select: 'name email' },
                        { path: 'room', select: 'roomNumber type' }
                    ]
                });

            if (!payment) {
                return res.status(404).json({ msj: "Pago no encontrado" });
            }

            if (payment.status === 'reembolsado') {
                return res.status(400).json({ msj: "Este pago ya fue reembolsado" });
            }

            if (payment.status !== 'completado') {
                return res.status(400).json({ msj: "Solo se pueden reembolsar pagos completados" });
            }

            // Actualizar pago
            payment.status = 'reembolsado';
            payment.notes = reason ? `Reembolso: ${reason}` : 'Reembolso procesado';
            await payment.save();

            // Actualizar reserva
            const reservation = await Reservation.findById(payment.reservation._id);
            if (reservation) {
                reservation.paymentStatus = 'reembolsado';
                await reservation.save();
            }

            // Enviar email de reembolso
            try {
                await sendRefundEmail({
                    to: payment.reservation.client.email,
                    clientName: payment.reservation.client.name,
                    payment,
                    reservation: payment.reservation
                });
            } catch (emailError) {
                console.error('Error enviando email de reembolso:', emailError.message);
            }

            res.status(200).json({
                msj: "Reembolso procesado correctamente",
                data: payment
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al procesar reembolso", error: error.message });
        }
    }

    // Generar comprobante PDF
    async generateReceipt(req, res) {
        try {
            const { id } = req.params;

            const payment = await Payment.findById(id)
                .populate({
                    path: 'reservation',
                    populate: [
                        { path: 'client', select: 'name email phone documentType documentNumber address' },
                        { path: 'room', select: 'roomNumber type basePrice' }
                    ]
                })
                .populate('processedBy', 'name email');

            if (!payment) {
                return res.status(404).json({ msj: "Pago no encontrado" });
            }

            const userId = req.user.id;
            const userRole = req.user.role;
            const isOwner = payment.reservation.client._id.toString() === userId;
            const isStaff = ['admin', 'gerente', 'recepcionista'].includes(userRole);

            if (!isOwner && !isStaff) {
                return res.status(403).json({ msj: "No tienes permiso para ver este comprobante" });
            }

            const PDFDocument = (await import('pdfkit')).default;
            const doc = new PDFDocument({ size: 'LETTER', margin: 0, bufferPages: true });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=comprobante-${payment.receiptNumber}.pdf`);
            doc.pipe(res);

            const reservation = payment.reservation;
            const client = reservation.client;
            const room = reservation.room;
            const isCredito = payment.receiptType === 'credito_fiscal';
            const nights = Math.ceil((new Date(reservation.checkOut) - new Date(reservation.checkIn)) / (1000 * 60 * 60 * 24));
            const methodLabels = { efectivo: 'Efectivo', tarjeta: 'Tarjeta de Crédito/Débito', transferencia: 'Transferencia Bancaria' };

            // Colores
            const NAVY    = '#1a1a2e';
            const BLUE    = '#4361ee';
            const LIGHT   = '#f0f2ff';
            const GRAY_BG = '#f8f9fa';
            const BORDER  = '#dde2f0';
            const TEXT    = '#1e1e2e';
            const MUTED   = '#6b7280';
            const WHITE   = '#ffffff';

            // Dimensiones
            const PAGE_W = 612;
            const ML = 40;
            const MR = 40;
            const CW = PAGE_W - ML - MR;  // 532

            // ── HEADER (fondo navy) ──────────────────────────────────────
            doc.rect(0, 0, PAGE_W, 110).fill(NAVY);

            // Nombre del hotel
            doc.fillColor(WHITE).fontSize(22).font('Helvetica-Bold')
                .text('Hotel Reservations', ML, 22, { width: CW * 0.6 });
            doc.fillColor('#a5b4fc').fontSize(10).font('Helvetica')
                .text('Sistema de Reservas · Comprobante oficial', ML, 48);

            // Badge tipo de comprobante (derecha)
            const badgeText = isCredito ? 'CRÉDITO FISCAL' : 'CONSUMIDOR FINAL';
            doc.roundedRect(PAGE_W - MR - 140, 20, 140, 30, 4).fill(BLUE);
            doc.fillColor(WHITE).fontSize(9).font('Helvetica-Bold')
                .text(badgeText, PAGE_W - MR - 140, 30, { width: 140, align: 'center' });

            // Número de comprobante
            doc.fillColor('#c7d2fe').fontSize(9).font('Helvetica')
                .text(`Nº ${payment.receiptNumber}`, PAGE_W - MR - 140, 56, { width: 140, align: 'center' });

            // Fecha (abajo del header, también en header)
            doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
                .text(
                    `Emitido: ${new Date(payment.paymentDate).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`,
                    ML, 88
                );

            // ── FRANJA DE TRANSACCIÓN ───────────────────────────────────
            doc.rect(0, 110, PAGE_W, 36).fill(LIGHT);
            doc.fillColor(BLUE).fontSize(8).font('Helvetica-Bold')
                .text('TRANSACCIÓN', ML, 120);
            doc.fillColor(TEXT).font('Helvetica')
                .text(payment.transactionId, ML + 80, 120);

            doc.fillColor(BLUE).font('Helvetica-Bold')
                .text('MÉTODO DE PAGO', 260, 120);
            doc.fillColor(TEXT).font('Helvetica')
                .text(methodLabels[payment.paymentMethod] || payment.paymentMethod, 370, 120);

            doc.fillColor(BLUE).font('Helvetica-Bold')
                .text('ESTADO', 490, 120);
            doc.fillColor('#16a34a').font('Helvetica-Bold')
                .text(payment.status.toUpperCase(), 528, 120);

            // ── SECCIÓN: DATOS DEL CLIENTE ───────────────────────────────
            let y = 162;

            doc.rect(ML, y, CW, 14).fill(BLUE);
            doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold')
                .text('DATOS DEL CLIENTE', ML + 8, y + 3);
            y += 14;

            // Construir filas de cliente
            const clientRows = [
                ['Nombre',   client.name],
                ['Email',    client.email],
                ...(client.phone ? [['Teléfono', client.phone]] : []),
                ...(client.documentType && client.documentNumber
                    ? [['Documento', `${client.documentType}: ${client.documentNumber}`]]
                    : []),
                ...(client.address ? [['Dirección', client.address]] : []),
            ];

            clientRows.forEach(([ label, value ], i) => {
                const rowBg = i % 2 === 0 ? WHITE : GRAY_BG;
                doc.rect(ML, y, CW, 18).fill(rowBg);
                doc.fillColor(MUTED).fontSize(8.5).font('Helvetica-Bold')
                    .text(label, ML + 8, y + 5, { width: 90 });
                doc.fillColor(TEXT).font('Helvetica')
                    .text(value, ML + 105, y + 5, { width: CW - 115 });
                y += 18;
            });

            // ── SECCIÓN: DETALLE DE RESERVA ──────────────────────────────
            y += 12;
            doc.rect(ML, y, CW, 14).fill(NAVY);
            doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold')
                .text('DETALLE DE LA RESERVA', ML + 8, y + 3);
            y += 14;

            const reservationRows = [
                ['Código de reserva', reservation.reservationCode],
                ['Habitación',        `${room.roomNumber} — ${room.type}`],
                ['Check-In',          new Date(reservation.checkIn).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
                ['Check-Out',         new Date(reservation.checkOut).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
                ['Noches',            `${nights} noche${nights !== 1 ? 's' : ''}`],
                ['Huéspedes',         `${reservation.numberOfGuests || 1}`],
            ];

            reservationRows.forEach(([ label, value ], i) => {
                const rowBg = i % 2 === 0 ? WHITE : GRAY_BG;
                doc.rect(ML, y, CW, 18).fill(rowBg);
                doc.fillColor(MUTED).fontSize(8.5).font('Helvetica-Bold')
                    .text(label, ML + 8, y + 5, { width: 120 });
                doc.fillColor(TEXT).font('Helvetica')
                    .text(value, ML + 135, y + 5, { width: CW - 145 });
                y += 18;
            });

            // ── TABLA DE ITEMS ───────────────────────────────────────────
            y += 12;
            doc.rect(ML, y, CW, 14).fill(NAVY);
            doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold');
            doc.text('DESCRIPCIÓN',    ML + 8,  y + 3, { width: 240 });
            doc.text('NOCHES',         ML + 280, y + 3, { width: 60, align: 'center' });
            doc.text('PRECIO/NOCHE',   ML + 350, y + 3, { width: 80, align: 'right' });
            doc.text('TOTAL',          ML + 440, y + 3, { width: 88, align: 'right' });
            y += 14;

            const pricePerNight = payment.amount / nights;
            doc.rect(ML, y, CW, 22).fill(LIGHT);
            doc.fillColor(TEXT).fontSize(9).font('Helvetica')
                .text(`Habitación ${room.roomNumber} (${room.type})`, ML + 8, y + 7, { width: 240 });
            doc.font('Helvetica-Bold')
                .text(`${nights}`, ML + 280, y + 7, { width: 60, align: 'center' });
            doc.font('Helvetica')
                .text(`$${pricePerNight.toFixed(2)}`, ML + 350, y + 7, { width: 80, align: 'right' });
            doc.fillColor(NAVY).font('Helvetica-Bold')
                .text(`$${payment.amount.toFixed(2)}`, ML + 440, y + 7, { width: 88, align: 'right' });
            y += 22;

            // ── TOTALES ──────────────────────────────────────────────────
            y += 8;
            const totalsX = ML + 290;
            const totalsW = CW - 290;

            if (isCredito) {
                const subtotal = payment.amount / 1.13;
                const iva      = payment.amount - subtotal;

                // Subtotal
                doc.rect(totalsX, y, totalsW, 20).fill(GRAY_BG);
                doc.fillColor(MUTED).fontSize(9).font('Helvetica')
                    .text('Subtotal (sin IVA)', totalsX + 8, y + 6, { width: totalsW - 80 });
                doc.fillColor(TEXT)
                    .text(`$${subtotal.toFixed(2)}`, totalsX + 8, y + 6, { width: totalsW - 10, align: 'right' });
                y += 20;

                // IVA
                doc.rect(totalsX, y, totalsW, 20).fill(WHITE);
                doc.rect(totalsX, y, totalsW, 20).stroke(BORDER);
                doc.fillColor(MUTED).fontSize(9).font('Helvetica')
                    .text('IVA (13%)', totalsX + 8, y + 6, { width: totalsW - 80 });
                doc.fillColor(TEXT)
                    .text(`$${iva.toFixed(2)}`, totalsX + 8, y + 6, { width: totalsW - 10, align: 'right' });
                y += 20;
            }

            // Total final
            doc.rect(totalsX, y, totalsW, 28).fill(NAVY);
            doc.fillColor(WHITE).fontSize(10).font('Helvetica-Bold')
                .text('TOTAL', totalsX + 8, y + 9, { width: totalsW - 80 });
            doc.fontSize(12)
                .text(`$${payment.amount.toFixed(2)}`, totalsX + 8, y + 8, { width: totalsW - 10, align: 'right' });
            y += 28;

            // ── FOOTER ───────────────────────────────────────────────────
            y += 20;
            doc.rect(0, y, PAGE_W, 1).fill(BORDER);
            y += 10;

            doc.fillColor(MUTED).fontSize(7.5).font('Helvetica')
                .text('Documento generado electrónicamente — no requiere firma física.', ML, y, { width: CW, align: 'center' });
            y += 12;
            doc.text(
                `Procesado por: ${payment.processedBy.name}  ·  ${new Date(payment.paymentDate).toLocaleString('es-ES')}`,
                ML, y, { width: CW, align: 'center' }
            );

            doc.end();
        } catch (error) {
            res.status(500).json({ msj: "Error al generar comprobante", error: error.message });
        }
    }
}
