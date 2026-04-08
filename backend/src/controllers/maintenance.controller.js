import { MaintenanceLog } from "../models/maintenanceLog.model.js";
import { Room } from "../models/room.model.js";

export class MaintenanceController {

    // Listar tickets con filtros y paginación
    async getAll(req, res) {
        try {
            const { status, priority, room, page = 1, limit = 10 } = req.query;
            const filter = {};

            if (status) filter.status = status;
            if (priority) filter.priority = priority;
            if (room) filter.room = room;

            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;

            const [tickets, totalRecords] = await Promise.all([
                MaintenanceLog.find(filter)
                    .populate('room', 'roomNumber type floor status')
                    .populate('reportedBy', 'name email')
                    .populate('resolvedBy', 'name email')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum),
                MaintenanceLog.countDocuments(filter)
            ]);

            const totalPages = Math.ceil(totalRecords / limitNum);

            res.status(200).json({
                msj: tickets.length === 0 ? "No se encontraron tickets" : "Tickets obtenidos correctamente",
                total: totalRecords,
                data: tickets,
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
            res.status(500).json({ msj: "Error al obtener tickets", error: error.message });
        }
    }

    // Obtener ticket por ID
    async getTicket(req, res) {
        try {
            const { id } = req.params;

            const ticket = await MaintenanceLog.findById(id)
                .populate('room', 'roomNumber type floor status')
                .populate('reportedBy', 'name email')
                .populate('resolvedBy', 'name email');

            if (!ticket) {
                return res.status(404).json({ msj: "Ticket no encontrado" });
            }

            res.status(200).json({ msj: "Ticket encontrado", data: ticket });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener ticket", error: error.message });
        }
    }

    // Obtener tickets por habitación
    async getByRoom(req, res) {
        try {
            const { roomId } = req.params;

            const tickets = await MaintenanceLog.find({ room: roomId })
                .populate('reportedBy', 'name email')
                .populate('resolvedBy', 'name email')
                .sort({ createdAt: -1 });

            res.status(200).json({
                msj: "Tickets de la habitación obtenidos",
                data: tickets
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener tickets", error: error.message });
        }
    }

    // Crear ticket de mantenimiento
    async createTicket(req, res) {
        try {
            const { room, issue, priority, notes } = req.body;

            // Verificar que la habitación existe
            const roomData = await Room.findById(room);
            if (!roomData) {
                return res.status(404).json({ msj: "Habitación no encontrada" });
            }

            const newTicket = await MaintenanceLog.create({
                room,
                reportedBy: req.user.id,
                issue,
                priority: priority || 'media',
                notes
            });

            // Cambiar habitación a mantenimiento
            roomData.status = 'mantenimiento';
            await roomData.save();

            await newTicket.populate([
                { path: 'room', select: 'roomNumber type floor status' },
                { path: 'reportedBy', select: 'name email' }
            ]);

            res.status(201).json({
                msj: "Ticket creado exitosamente. Habitación marcada en mantenimiento.",
                data: newTicket
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al crear ticket", error: error.message });
        }
    }

    // Actualizar ticket (cambiar estado, agregar notas)
    async updateTicket(req, res) {
        try {
            const { id } = req.params;
            const { status, notes, priority } = req.body;

            const ticket = await MaintenanceLog.findById(id);
            if (!ticket) {
                return res.status(404).json({ msj: "Ticket no encontrado" });
            }

            if (ticket.status === 'resuelto') {
                return res.status(400).json({ msj: "Este ticket ya fue resuelto" });
            }

            const updateData = {};
            if (notes) updateData.notes = notes;
            if (priority) updateData.priority = priority;

            if (status) {
                updateData.status = status;

                // Si se resuelve, registrar quién y cuándo
                if (status === 'resuelto') {
                    updateData.resolvedBy = req.user.id;
                    updateData.resolvedAt = new Date();

                    // Verificar si hay otros tickets abiertos para esta habitación
                    const openTickets = await MaintenanceLog.countDocuments({
                        room: ticket.room,
                        status: { $in: ['reportado', 'en_proceso'] },
                        _id: { $ne: id }
                    });

                    // Si no hay más tickets abiertos, cambiar habitación a disponible
                    if (openTickets === 0) {
                        await Room.findByIdAndUpdate(ticket.room, { status: 'disponible' });
                    }
                }
            }

            const updatedTicket = await MaintenanceLog.findByIdAndUpdate(id, updateData, {
                new: true,
                runValidators: true
            })
                .populate('room', 'roomNumber type floor status')
                .populate('reportedBy', 'name email')
                .populate('resolvedBy', 'name email');

            res.status(200).json({
                msj: status === 'resuelto'
                    ? "Ticket resuelto. Habitación disponible."
                    : "Ticket actualizado correctamente",
                data: updatedTicket
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al actualizar ticket", error: error.message });
        }
    }

    // Eliminar ticket
    async deleteTicket(req, res) {
        try {
            const { id } = req.params;

            const ticket = await MaintenanceLog.findById(id);
            if (!ticket) {
                return res.status(404).json({ msj: "Ticket no encontrado" });
            }

            await MaintenanceLog.findByIdAndDelete(id);

            // Si no quedan tickets abiertos, liberar habitación
            const openTickets = await MaintenanceLog.countDocuments({
                room: ticket.room,
                status: { $in: ['reportado', 'en_proceso'] }
            });

            if (openTickets === 0) {
                await Room.findByIdAndUpdate(ticket.room, { status: 'disponible' });
            }

            res.status(200).json({ msj: "Ticket eliminado correctamente" });
        } catch (error) {
            res.status(500).json({ msj: "Error al eliminar ticket", error: error.message });
        }
    }
}