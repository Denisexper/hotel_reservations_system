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
}
