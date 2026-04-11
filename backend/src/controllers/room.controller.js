import { Room } from "../models/room.model.js";
import mongoose from "mongoose";

export class RoomController {
    // obtener todas las habitaciones con filtros y paginación
    async getAll(req, res) {
        try {
            const { type, status, minPrice, maxPrice, page = 1, limit = 10 } = req.query;

            const filter = {};

            if (req.query.includeInactive === 'true') {
                // Si además viene isActive específico, filtrar por ese valor
                if (req.query.isActive !== undefined) {
                    filter.isActive = req.query.isActive === 'true';
                }
                // Si no viene isActive, no agrega filtro → devuelve todas
            } else {
                filter.isActive = true;
            }

            if (type) filter.type = type;
            if (status) filter.status = status;
            if (minPrice || maxPrice) {
                filter.basePrice = {};
                if (minPrice) filter.basePrice.$gte = Number(minPrice);
                if (maxPrice) filter.basePrice.$lte = Number(maxPrice);
            }

            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;

            const [rooms, totalRecords] = await Promise.all([
                Room.find(filter)
                    .sort({ floor: 1, roomNumber: 1 })
                    .skip(skip)
                    .limit(limitNum),
                Room.countDocuments(filter),
            ]);

            const totalPages = Math.ceil(totalRecords / limitNum);

            res.status(200).json({
                msj: rooms.length === 0 ? "No se encontraron habitaciones" : "Habitaciones obtenidas correctamente",
                total: totalRecords,
                data: rooms,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalRecords,
                    limit: limitNum,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1,
                },
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener habitaciones", error: error.message });
        }
    }

    // Crear habitación
    async createRoom(req, res) {
        try {
            const roomData = {
                ...req.body,
                createdBy: req.user.id
            };

            // Si se subieron imágenes, guardar las rutas
            if (req.files && req.files.length > 0) {
                roomData.images = req.files.map(file => `/uploads/rooms/${file.filename}`);
            }

            const newRoom = await Room.create(roomData);

            res.status(201).json({
                msj: "Habitación creada exitosamente",
                data: newRoom
            });
        } catch (error) {
            // Si hay error, eliminar las imágenes subidas
            if (req.files && req.files.length > 0) {
                req.files.forEach(file => {
                    fs.unlinkSync(file.path);
                });
            }
            res.status(500).json({ msj: "Error al crear habitación", error: error.message });
        }
    }

    // Obtener una por ID
    async getRoom(req, res) {
        try {
            const { id } = req.params;
            const room = await Room.findById(id);
            if (!room) return res.status(404).json({ msj: "Habitación no encontrada" });

            res.status(200).json({ msj: "Habitación encontrada", data: room });
        } catch (error) {
            res.status(500).json({ msj: "Error del servidor", error: error.message });
        }
    }

    // Actualizar habitación
    async updateRoom(req, res) {
        try {
            const { id } = req.params;

            // Buscar habitación existente
            const existingRoom = await Room.findById(id);
            if (!existingRoom) {
                return res.status(404).json({ msj: "Habitación no encontrada" });
            }

            const updateData = { ...req.body };

            // Si se subieron nuevas imágenes
            if (req.files && req.files.length > 0) {
                const newImagesPaths = req.files.map(file => `/uploads/rooms/${file.filename}`);

                // mantener las fotos anteriores y sumar las nuevas
                updateData.images = [...existingRoom.images, ...newImagesPaths];
            }

            // Si intenta poner disponible, verificar que no tenga tickets abiertos
            if (updateData.status === 'disponible') {
                const { MaintenanceLog } = await import('../models/maintenanceLog.model.js');
                const openTickets = await MaintenanceLog.countDocuments({
                    room: id,
                    status: { $in: ['reportado', 'en_proceso'] }
                });

                if (openTickets > 0) {
                    return res.status(400).json({
                        msj: `No se puede cambiar a disponible. Hay ${openTickets} ticket(s) de mantenimiento abierto(s). Resuélvelos primero desde el módulo de Mantenimiento.`
                    });
                }
            }

            const updatedRoom = await Room.findByIdAndUpdate(id, updateData, {
                new: true,
                runValidators: true
            });

            res.status(200).json({
                msj: "Habitación actualizada correctamente",
                data: updatedRoom
            });
        } catch (error) {
            // Si hay error, eliminar las nuevas imágenes subidas
            if (req.files && req.files.length > 0) {
                req.files.forEach(file => {
                    fs.unlinkSync(file.path);
                });
            }
            res.status(500).json({ msj: "Error al actualizar", error: error.message });
        }
    }

    // soft delete (desactivar habitación)
    async deleteRoom(req, res) {
        try {
            const { id } = req.params;
            const deletedRoom = await Room.findByIdAndUpdate(id,
                { isActive: false },
                { new: true }
            );

            if (!deletedRoom) return res.status(404).json({ msj: "Habitación no encontrada" });

            res.status(200).json({
                msj: "Habitación desactivada correctamente",
                data: deletedRoom
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al eliminar", error: error.message });
        }
    }

    //delete images de habitación
    async deleteImage(req, res) {
        try {
            const { id, imageIndex } = req.params;

            const room = await Room.findById(id);
            if (!room) {
                return res.status(404).json({ msj: "Habitación no encontrada" });
            }

            if (!room.images || room.images.length === 0) {
                return res.status(400).json({ msj: "No hay imágenes para eliminar" });
            }

            const index = parseInt(imageIndex);
            if (index < 0 || index >= room.images.length) {
                return res.status(400).json({ msj: "Índice de imagen inválido" });
            }

            // Eliminar archivo físico
            const imagePath = room.images[index];
            const fullPath = path.join(process.cwd(), imagePath);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }

            // Eliminar de la BD
            room.images.splice(index, 1);
            await room.save();

            res.status(200).json({
                msj: "Imagen eliminada correctamente",
                data: room
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al eliminar imagen", error: error.message });
        }
    }

    // Buscar habitaciones disponibles por fechas, capacidad y tipo
    async searchAvailable(req, res) {
        try {
            const { checkIn, checkOut, guests, type, minPrice, maxPrice, page = 1, limit = 10 } = req.query;

            if (!checkIn || !checkOut) {
                return res.status(400).json({ msj: "Las fechas de entrada y salida son obligatorias" });
            }

            const start = new Date(checkIn);
            const end = new Date(checkOut);

            if (end <= start) {
                return res.status(400).json({ msj: "La fecha de salida debe ser posterior a la entrada" });
            }

            // Buscar reservas que se solapan con el rango de fechas
            const { Reservation } = await import('../models/reservation.model.js');

            const occupiedRoomIds = await Reservation.distinct('room', {
                status: { $in: ['pendiente', 'confirmada', 'check-in'] },
                $or: [
                    { checkIn: { $lte: start }, checkOut: { $gt: start } },
                    { checkIn: { $lt: end }, checkOut: { $gte: end } },
                    { checkIn: { $gte: start }, checkOut: { $lte: end } }
                ]
            });

            // Filtrar habitaciones disponibles
            const filter = {
                isActive: true,
                status: 'disponible',
                _id: { $nin: occupiedRoomIds }
            };

            if (guests) filter.capacity = { $gte: Number(guests) };
            if (type) filter.type = type;
            if (minPrice || maxPrice) {
                filter.basePrice = {};
                if (minPrice) filter.basePrice.$gte = Number(minPrice);
                if (maxPrice) filter.basePrice.$lte = Number(maxPrice);
            }

            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;

            const [rooms, totalRecords] = await Promise.all([
                Room.find(filter)
                    .sort({ basePrice: 1, floor: 1 })
                    .skip(skip)
                    .limit(limitNum),
                Room.countDocuments(filter)
            ]);

            // Aplicar precios por temporada
            const { SeasonalPrice } = await import('../models/seasonalPrice.model.js');
            const roomsWithPricing = await Promise.all(
                rooms.map(async (room) => {
                    const roomObj = room.toObject();
                    const { price, season } = await SeasonalPrice.getAdjustedPrice(
                        room.basePrice,
                        room.type,
                        start
                    );
                    roomObj.adjustedPrice = price;
                    roomObj.season = season;
                    return roomObj;
                })
            );

            const totalPages = Math.ceil(totalRecords / limitNum);

            res.status(200).json({
                msj: rooms.length === 0 ? "No hay habitaciones disponibles para esas fechas" : "Habitaciones disponibles",
                total: totalRecords,
                data: roomsWithPricing,
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
            res.status(500).json({ msj: "Error al buscar disponibilidad", error: error.message });
        }
    }
}