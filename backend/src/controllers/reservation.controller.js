import { Reservation } from "../models/reservation.model.js";
import { Room } from "../models/room.model.js";
import mongoose from "mongoose";

export class ReservationController {
    
    // Listar todas las reservas (con filtros y paginación)
    async getAll(req, res) {
        try {
            const { 
                status, 
                client, 
                room, 
                startDate, 
                endDate, 
                page = 1, 
                limit = 10 
            } = req.query;
            
            const filter = {};
            
            // Filtrar por estado
            if (status) filter.status = status;
            
            // Filtrar por cliente
            if (client) filter.client = client;
            
            // Filtrar por habitación
            if (room) filter.room = room;
            
            // Filtrar por rango de fechas
            if (startDate || endDate) {
                filter.checkIn = {};
                if (startDate) filter.checkIn.$gte = new Date(startDate);
                if (endDate) filter.checkIn.$lte = new Date(endDate);
            }
            
            // Paginación
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
            
            const totalPages = Math.ceil(totalRecords / limitNum);
            
            res.status(200).json({
                msj: reservations.length === 0 
                    ? "No se encontraron reservas" 
                    : "Reservas obtenidas correctamente",
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
                msj: "Error al obtener reservas", 
                error: error.message 
            });
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
            const userId = req.user.userId; // Del token JWT
            
            // 1. Validar que las fechas sean futuras
            const now = new Date();
            const checkInDate = new Date(checkIn);
            const checkOutDate = new Date(checkOut);
            
            if (checkInDate < now) {
                return res.status(400).json({ 
                    msj: "La fecha de entrada debe ser futura" 
                });
            }
            
            if (checkOutDate <= checkInDate) {
                return res.status(400).json({ 
                    msj: "La fecha de salida debe ser posterior a la fecha de entrada" 
                });
            }
            
            // 2. Verificar que la habitación existe y está activa
            const roomData = await Room.findById(room);
            if (!roomData) {
                return res.status(404).json({ msj: "Habitación no encontrada" });
            }
            
            if (!roomData.isActive) {
                return res.status(400).json({ msj: "Habitación no disponible" });
            }
            
            // 3. Verificar capacidad
            if (numberOfGuests > roomData.capacity) {
                return res.status(400).json({ 
                    msj: `La habitación solo admite ${roomData.capacity} personas` 
                });
            }
            
            // 4. Verificar disponibilidad (NO haya conflictos de fechas)
            const isAvailable = await Reservation.checkAvailability(
                room, 
                checkInDate, 
                checkOutDate
            );
            
            if (!isAvailable) {
                return res.status(409).json({ 
                    msj: "La habitación no está disponible en las fechas seleccionadas" 
                });
            }
            
            // 5. Calcular días y costo total
            const oneDay = 24 * 60 * 60 * 1000;
            const days = Math.round((checkOutDate - checkInDate) / oneDay);
            const totalAmount = days * roomData.basePrice;
            
            // 6. Generar código de reserva
            const reservationCode = await Reservation.generateReservationCode();
            
            // 7. Crear la reserva
            const newReservation = await Reservation.create({
                reservationCode,
                client: userId,
                room,
                checkIn: checkInDate,
                checkOut: checkOutDate,
                numberOfGuests,
                totalAmount,
                specialRequests: specialRequests || null,
                status: 'pendiente',
                paymentStatus: 'pendiente',
                createdBy: userId
            });
            
            // 8. Poblar datos para la respuesta
            await newReservation.populate([
                { path: 'client', select: 'name email phone' },
                { path: 'room', select: 'roomNumber type basePrice images' }
            ]);
            
            res.status(201).json({
                msj: "Reserva creada exitosamente",
                data: newReservation
            });
            
        } catch (error) {
            res.status(500).json({ 
                msj: "Error al crear reserva", 
                error: error.message 
            });
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
            
            // Buscar reserva existente
            const existingReservation = await Reservation.findById(id).populate('room');
            if (!existingReservation) {
                return res.status(404).json({ msj: "Reserva no encontrada" });
            }
            
            // Solo se pueden modificar reservas pendientes o confirmadas
            if (['check-in', 'check-out', 'cancelada'].includes(existingReservation.status)) {
                return res.status(400).json({ 
                    msj: "No se puede modificar una reserva en este estado" 
                });
            }
            
            const updateData = {};
            
            // Si cambian las fechas, recalcular y validar disponibilidad
            if (checkIn || checkOut) {
                const newCheckIn = checkIn ? new Date(checkIn) : existingReservation.checkIn;
                const newCheckOut = checkOut ? new Date(checkOut) : existingReservation.checkOut;
                
                // Validar que checkOut > checkIn
                if (newCheckOut <= newCheckIn) {
                    return res.status(400).json({ 
                        msj: "La fecha de salida debe ser posterior a la entrada" 
                    });
                }
                
                // Verificar disponibilidad (excluyendo esta misma reserva)
                const isAvailable = await Reservation.checkAvailability(
                    existingReservation.room._id,
                    newCheckIn,
                    newCheckOut,
                    id
                );
                
                if (!isAvailable) {
                    return res.status(409).json({ 
                        msj: "La habitación no está disponible en las nuevas fechas" 
                    });
                }
                
                // Recalcular costo
                const oneDay = 24 * 60 * 60 * 1000;
                const days = Math.round((newCheckOut - newCheckIn) / oneDay);
                const totalAmount = days * existingReservation.room.basePrice;
                
                updateData.checkIn = newCheckIn;
                updateData.checkOut = newCheckOut;
                updateData.totalAmount = totalAmount;
            }
            
            // Actualizar número de huéspedes
            if (numberOfGuests) {
                if (numberOfGuests > existingReservation.room.capacity) {
                    return res.status(400).json({ 
                        msj: `La habitación solo admite ${existingReservation.room.capacity} personas` 
                    });
                }
                updateData.numberOfGuests = numberOfGuests;
            }
            
            // Actualizar solicitudes especiales
            if (specialRequests !== undefined) {
                updateData.specialRequests = specialRequests;
            }
            
            // Actualizar estado (solo staff puede cambiar el estado)
            if (status && ['admin', 'gerente', 'recepcionista'].includes(req.user.role)) {
                updateData.status = status;
            }
            
            const updatedReservation = await Reservation.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            ).populate([
                { path: 'client', select: 'name email phone' },
                { path: 'room', select: 'roomNumber type basePrice images' }
            ]);
            
            res.status(200).json({
                msj: "Reserva actualizada correctamente",
                data: updatedReservation
            });
            
        } catch (error) {
            res.status(500).json({ 
                msj: "Error al actualizar reserva", 
                error: error.message 
            });
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
                return res.status(400).json({ 
                    msj: "Faltan parámetros: roomId, checkIn, checkOut" 
                });
            }
            
            const checkInDate = new Date(checkIn);
            const checkOutDate = new Date(checkOut);
            
            const isAvailable = await Reservation.checkAvailability(
                roomId,
                checkInDate,
                checkOutDate
            );
            
            res.status(200).json({
                available: isAvailable,
                msj: isAvailable 
                    ? "Habitación disponible" 
                    : "Habitación no disponible en las fechas seleccionadas"
            });
            
        } catch (error) {
            res.status(500).json({ 
                msj: "Error al verificar disponibilidad", 
                error: error.message 
            });
        }
    }
}