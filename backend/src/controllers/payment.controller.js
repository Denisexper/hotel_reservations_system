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

            // Verificar que el usuario puede ver este comprobante
            const userId = req.user.id;
            const userRole = req.user.role;
            const isOwner = payment.reservation.client._id.toString() === userId;
            const isStaff = ['admin', 'gerente', 'recepcionista'].includes(userRole);

            if (!isOwner && !isStaff) {
                return res.status(403).json({ msj: "No tienes permiso para ver este comprobante" });
            }

            const PDFDocument = (await import('pdfkit')).default;
            const doc = new PDFDocument({ size: 'LETTER', margin: 50 });

            // Headers de respuesta
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=comprobante-${payment.receiptNumber}.pdf`);
            doc.pipe(res);

            const reservation = payment.reservation;
            const client = reservation.client;
            const room = reservation.room;
            const isCredito = payment.receiptType === 'credito_fiscal';

            // === HEADER ===
            doc.fontSize(20).font('Helvetica-Bold').text('Hotel Reservations', { align: 'center' });
            doc.fontSize(10).font('Helvetica').text('Sistema de Reservas', { align: 'center' });
            doc.moveDown(0.5);

            // Tipo de comprobante
            doc.fontSize(14).font('Helvetica-Bold')
                .text(isCredito ? 'CRÉDITO FISCAL' : 'COMPROBANTE CONSUMIDOR FINAL', { align: 'center' });
            doc.moveDown(0.3);
            doc.fontSize(10).font('Helvetica')
                .text(`Nº: ${payment.receiptNumber}`, { align: 'center' });
            doc.moveDown(1);

            // Línea separadora
            doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke('#cccccc');
            doc.moveDown(1);

            // === DATOS DEL COMPROBANTE ===
            const leftCol = 50;
            const rightCol = 300;
            let y = doc.y;

            doc.fontSize(10).font('Helvetica-Bold').text('Fecha de emisión:', leftCol, y);
            doc.font('Helvetica').text(new Date(payment.paymentDate).toLocaleDateString('es-ES', {
                year: 'numeric', month: 'long', day: 'numeric'
            }), rightCol, y);

            y += 18;
            doc.font('Helvetica-Bold').text('Transacción:', leftCol, y);
            doc.font('Helvetica').text(payment.transactionId, rightCol, y);

            y += 18;
            doc.font('Helvetica-Bold').text('Método de pago:', leftCol, y);
            const methodLabels = { efectivo: 'Efectivo', tarjeta: 'Tarjeta de Crédito/Débito', transferencia: 'Transferencia Bancaria' };
            doc.font('Helvetica').text(methodLabels[payment.paymentMethod] || payment.paymentMethod, rightCol, y);

            doc.moveDown(2);
            doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke('#cccccc');
            doc.moveDown(1);

            // === DATOS DEL CLIENTE ===
            doc.fontSize(12).font('Helvetica-Bold').text('Datos del Cliente');
            doc.moveDown(0.5);
            y = doc.y;

            doc.fontSize(10).font('Helvetica-Bold').text('Nombre:', leftCol, y);
            doc.font('Helvetica').text(client.name, rightCol, y);

            y += 18;
            doc.font('Helvetica-Bold').text('Email:', leftCol, y);
            doc.font('Helvetica').text(client.email, rightCol, y);

            if (client.phone) {
                y += 18;
                doc.font('Helvetica-Bold').text('Teléfono:', leftCol, y);
                doc.font('Helvetica').text(client.phone, rightCol, y);
            }

            if (client.documentType && client.documentNumber) {
                y += 18;
                doc.font('Helvetica-Bold').text('Documento:', leftCol, y);
                doc.font('Helvetica').text(`${client.documentType}: ${client.documentNumber}`, rightCol, y);
            }

            if (client.address) {
                y += 18;
                doc.font('Helvetica-Bold').text('Dirección:', leftCol, y);
                doc.font('Helvetica').text(client.address, rightCol, y);
            }

            doc.moveDown(2);
            doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke('#cccccc');
            doc.moveDown(1);

            // === DETALLE DE LA RESERVA ===
            doc.fontSize(12).font('Helvetica-Bold').text('Detalle de la Reserva');
            doc.moveDown(0.5);
            y = doc.y;

            doc.fontSize(10).font('Helvetica-Bold').text('Código de reserva:', leftCol, y);
            doc.font('Helvetica').text(reservation.reservationCode, rightCol, y);

            y += 18;
            doc.font('Helvetica-Bold').text('Habitación:', leftCol, y);
            doc.font('Helvetica').text(`${room.roomNumber} - ${room.type}`, rightCol, y);

            y += 18;
            doc.font('Helvetica-Bold').text('Check-In:', leftCol, y);
            doc.font('Helvetica').text(new Date(reservation.checkIn).toLocaleDateString('es-ES'), rightCol, y);

            y += 18;
            doc.font('Helvetica-Bold').text('Check-Out:', leftCol, y);
            doc.font('Helvetica').text(new Date(reservation.checkOut).toLocaleDateString('es-ES'), rightCol, y);

            const nights = Math.ceil((new Date(reservation.checkOut) - new Date(reservation.checkIn)) / (1000 * 60 * 60 * 24));
            y += 18;
            doc.font('Helvetica-Bold').text('Noches:', leftCol, y);
            doc.font('Helvetica').text(`${nights}`, rightCol, y);

            doc.moveDown(2);
            doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke('#cccccc');
            doc.moveDown(1);

            // === DETALLE DE PAGO ===
            doc.fontSize(12).font('Helvetica-Bold').text('Detalle de Pago');
            doc.moveDown(0.5);

            // Tabla simple
            const tableTop = doc.y;
            const pricePerNight = payment.amount / nights;

            // Header de tabla
            doc.fontSize(9).font('Helvetica-Bold');
            doc.text('Descripción', leftCol, tableTop);
            doc.text('Noches', 300, tableTop);
            doc.text('Precio/Noche', 370, tableTop);
            doc.text('Subtotal', 480, tableTop, { align: 'right', width: 80 });

            doc.moveTo(50, tableTop + 15).lineTo(562, tableTop + 15).stroke('#eeeeee');

            // Fila de detalle
            const rowY = tableTop + 22;
            doc.font('Helvetica');
            doc.text(`Habitación ${room.roomNumber} (${room.type})`, leftCol, rowY);
            doc.text(`${nights}`, 300, rowY);
            doc.text(`$${pricePerNight.toFixed(2)}`, 370, rowY);
            doc.text(`$${payment.amount.toFixed(2)}`, 480, rowY, { align: 'right', width: 80 });

            doc.moveDown(3);
            doc.moveTo(350, doc.y).lineTo(562, doc.y).stroke('#cccccc');
            doc.moveDown(0.5);

            // Totales
            if (isCredito) {
                const subtotal = payment.amount / 1.13;
                const iva = payment.amount - subtotal;

                y = doc.y;
                doc.fontSize(10).font('Helvetica-Bold').text('Subtotal:', 370, y);
                doc.font('Helvetica').text(`$${subtotal.toFixed(2)}`, 480, y, { align: 'right', width: 80 });

                y += 18;
                doc.font('Helvetica-Bold').text('IVA (13%):', 370, y);
                doc.font('Helvetica').text(`$${iva.toFixed(2)}`, 480, y, { align: 'right', width: 80 });

                y += 18;
                doc.moveTo(350, y).lineTo(562, y).stroke('#cccccc');
                y += 8;
            }

            y = doc.y + (isCredito ? 0 : 5);
            doc.fontSize(14).font('Helvetica-Bold').text('TOTAL:', 370, y);
            doc.text(`$${payment.amount.toFixed(2)}`, 480, y, { align: 'right', width: 80 });

            // === FOOTER ===
            doc.moveDown(4);
            doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke('#cccccc');
            doc.moveDown(1);

            doc.fontSize(8).font('Helvetica').fillColor('#999999');
            doc.text('Este documento es un comprobante de pago generado electrónicamente.', { align: 'center' });
            doc.text(`Procesado por: ${payment.processedBy.name} (${payment.processedBy.email})`, { align: 'center' });
            doc.text(`Estado del pago: ${payment.status.toUpperCase()}`, { align: 'center' });

            doc.end();
        } catch (error) {
            res.status(500).json({ msj: "Error al generar comprobante", error: error.message });
        }
    }
}
