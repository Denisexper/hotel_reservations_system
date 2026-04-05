import { Reservation } from "../models/reservation.model.js";
import { Room } from "../models/room.model.js";
import dayjs from "dayjs";

export class ReservationController {

    // Listar todas las reservas (con filtros y paginación)
    async getAll(req, res) {
        try {
            const { status, client, room, startDate, endDate, page = 1, limit = 10 } = req.query;
            const filter = {};

            if (status) filter.status = status;
            if (client) filter.client = client;
            if (room) filter.room = room;

            if (startDate || endDate) {
                filter.checkIn = {};
                // Normalizamos las fechas de búsqueda para que coincidan con el estándar del hotel
                if (startDate) filter.checkIn.$gte = dayjs(startDate).startOf('day').add(15, 'hour').toDate();
                if (endDate) filter.checkIn.$lte = dayjs(endDate).endOf('day').toDate();
            }

            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;

            const [reservations, totalRecords] = await Promise.all([
                Reservation.find(filter)
                    .populate('client', 'name email phone')
                    .populate('room', 'roomNumber type basePrice')
                    .populate('createdBy', 'name email')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum),
                Reservation.countDocuments(filter)
            ]);

            res.status(200).json({
                msj: reservations.length === 0 ? "No se encontraron reservas" : "Reservas obtenidas correctamente",
                total: totalRecords,
                data: reservations,
                pagination: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(totalRecords / limitNum),
                    totalRecords,
                    limit: limitNum
                }
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener reservas", error: error.message });
        }
    }

    // Obtener MIS reservas (para clientes)
    async getMyReservations(req, res) {
        try {
            const clientId = req.user.userId; // Del token JWT
            const { status, page = 1, limit = 10 } = req.query;

            const filter = { client: clientId };
            if (status) filter.status = status;

            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;

            const [reservations, totalRecords] = await Promise.all([
                Reservation.find(filter)
                    .populate('room', 'roomNumber type basePrice images amenities')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum),
                Reservation.countDocuments(filter)
            ]);

            const totalPages = Math.ceil(totalRecords / limitNum);

            res.status(200).json({
                msj: "Mis reservas obtenidas correctamente",
                total: totalRecords,
                data: reservations,
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
            res.status(500).json({
                msj: "Error al obtener mis reservas",
                error: error.message
            });
        }
    }

    // Crear reserva
    async createReservation(req, res) {
        try {
            const { room, checkIn, checkOut, numberOfGuests, specialRequests } = req.body;
            const userId = req.user.userId;

            const start = dayjs(checkIn).startOf('day').add(15, 'hour');
            const end = dayjs(checkOut).startOf('day').add(11, 'hour');

            if (!start.isAfter(dayjs().subtract(1, 'day'))) { // Permite reservar hoy mismo
                return res.status(400).json({ msj: "La fecha de entrada no puede ser del pasado" });
            }
            if (end.isBefore(start) || end.isSame(start)) {
                return res.status(400).json({ msj: "La fecha de salida debe ser posterior a la entrada" });
            }

            const roomData = await Room.findById(room);
            if (!roomData || !roomData.isActive) {
                return res.status(404).json({ msj: "Habitación no disponible" });
            }

            if (numberOfGuests > roomData.capacity) {
                return res.status(400).json({ msj: `Capacidad máxima: ${roomData.capacity} personas` });
            }

            const isAvailable = await Reservation.checkAvailability(room, start.toDate(), end.toDate());
            if (!isAvailable) {
                return res.status(409).json({ msj: "Habitación ocupada en esas fechas" });
            }

            let nights = end.diff(start, 'day');
            if (nights <= 0) nights = 1;

            const priceSnapshot = roomData.basePrice;
            const totalAmount = nights * priceSnapshot;

            const reservationCode = await Reservation.generateReservationCode();

            const newReservation = await Reservation.create({
                reservationCode,
                client: userId,
                room,
                checkIn: start.toDate(),
                checkOut: end.toDate(),
                numberOfGuests,
                pricePerNight: priceSnapshot,
                totalAmount,
                specialRequests,
                createdBy: userId
            });

            await newReservation.populate([
                { path: 'client', select: 'name email phone' },
                { path: 'room', select: 'roomNumber type basePrice images' }
            ]);

            res.status(201).json({ msj: "Reserva creada exitosamente", data: newReservation });
        } catch (error) {
            res.status(500).json({ msj: "Error al crear reserva", error: error.message });
        }
    }

    // Obtener detalle de una reserva
    async getReservation(req, res) {
        try {
            const { id } = req.params;

            const reservation = await Reservation.findById(id)
                .populate('client', 'name email phone documentType documentNumber')
                .populate('room', 'roomNumber type basePrice images amenities floor')
                .populate('createdBy', 'name email');

            if (!reservation) {
                return res.status(404).json({ msj: "Reserva no encontrada" });
            }

            // Verificar permisos: solo el cliente o staff pueden ver la reserva
            const userId = req.user.userId;
            const userRole = req.user.role;

            const isOwner = reservation.client._id.toString() === userId;
            const isStaff = ['admin', 'gerente', 'recepcionista'].includes(userRole);

            if (!isOwner && !isStaff) {
                return res.status(403).json({
                    msj: "No tienes permiso para ver esta reserva"
                });
            }

            res.status(200).json({
                msj: "Reserva encontrada",
                data: reservation
            });
        } catch (error) {
            res.status(500).json({
                msj: "Error al obtener reserva",
                error: error.message
            });
        }
    }

    // Modificar reserva
    async updateReservation(req, res) {
        try {
            const { id } = req.params;
            const { checkIn, checkOut, numberOfGuests, specialRequests, status } = req.body;

            const existingReservation = await Reservation.findById(id); // Traemos la reserva
            if (!existingReservation) return res.status(404).json({ msj: "Reserva no encontrada" });

            if (['check-in', 'check-out', 'cancelada'].includes(existingReservation.status)) {
                return res.status(400).json({ msj: "No se puede modificar una reserva en este estado" });
            }

            const updateData = {};

            if (checkIn || checkOut) {
                // CORREGIDO: Usamos existingReservation (el nombre correcto)
                const start = dayjs(checkIn || existingReservation.checkIn).startOf('day').add(15, 'hour');
                const end = dayjs(checkOut || existingReservation.checkOut).startOf('day').add(11, 'hour');

                const isAvailable = await Reservation.checkAvailability(existingReservation.room, start.toDate(), end.toDate(), id);
                if (!isAvailable) return res.status(409).json({ msj: "Conflicto de fechas con otra reserva" });

                let nights = end.diff(start, 'day');
                if (nights <= 0) nights = 1;

                updateData.checkIn = start.toDate();
                updateData.checkOut = end.toDate();
                // Usamos el precio congelado guardado en la reserva
                updateData.totalAmount = nights * existingReservation.pricePerNight;
            }

            if (numberOfGuests) {
                const roomData = await Room.findById(existingReservation.room);
                if (numberOfGuests > roomData.capacity) {
                    return res.status(400).json({ msj: `Capacidad máxima: ${roomData.capacity} personas` });
                }
                updateData.numberOfGuests = numberOfGuests;
            }

            if (specialRequests !== undefined) updateData.specialRequests = specialRequests;
            if (status && ['admin', 'gerente', 'recepcionista'].includes(req.user.role)) {
                updateData.status = status;
            }

            const updatedReservation = await Reservation.findByIdAndUpdate(
                id, updateData, { new: true, runValidators: true }
            ).populate([
                { path: 'client', select: 'name email phone' },
                { path: 'room', select: 'roomNumber type basePrice images' }
            ]);

            res.status(200).json({ msj: "Reserva actualizada correctamente", data: updatedReservation });
        } catch (error) {
            res.status(500).json({ msj: "Error al actualizar reserva", error: error.message });
        }
    }

    // Cancelar reserva
    async cancelReservation(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const reservation = await Reservation.findById(id);
            if (!reservation) {
                return res.status(404).json({ msj: "Reserva no encontrada" });
            }

            // No se puede cancelar si ya está cancelada o finalizada
            if (['cancelada', 'check-out'].includes(reservation.status)) {
                return res.status(400).json({
                    msj: "No se puede cancelar esta reserva"
                });
            }

            // Calcular penalización
            const cancellationFee = reservation.calculateCancellationFee();

            // Actualizar reserva
            reservation.status = 'cancelada';
            reservation.cancelledAt = new Date();
            reservation.cancellationReason = reason || 'Sin motivo especificado';
            reservation.cancellationFee = cancellationFee;

            // Si ya había pagado, marcar para reembolso
            if (reservation.paymentStatus === 'pagado') {
                reservation.paymentStatus = 'reembolsado';
            }

            await reservation.save();

            await reservation.populate([
                { path: 'client', select: 'name email' },
                { path: 'room', select: 'roomNumber type' }
            ]);

            res.status(200).json({
                msj: "Reserva cancelada correctamente",
                data: reservation,
                cancellationFee: cancellationFee > 0
                    ? `Se aplicó una penalización de $${cancellationFee.toFixed(2)}`
                    : "Sin penalización"
            });

        } catch (error) {
            res.status(500).json({
                msj: "Error al cancelar reserva",
                error: error.message
            });
        }
    }

    // Verificar disponibilidad de una habitación
    async checkAvailability(req, res) {
        try {
            const { roomId, checkIn, checkOut } = req.query;
            if (!roomId || !checkIn || !checkOut) {
                return res.status(400).json({ msj: "Faltan parámetros: roomId, checkIn, checkOut" });
            }

            const start = dayjs(checkIn).startOf('day').add(15, 'hour');
            const end = dayjs(checkOut).startOf('day').add(11, 'hour');

            const isAvailable = await Reservation.checkAvailability(roomId, start.toDate(), end.toDate());

            res.status(200).json({
                available: isAvailable,
                msj: isAvailable ? "Habitación disponible" : "Habitación no disponible"
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al verificar disponibilidad", error: error.message });
        }
    }
}