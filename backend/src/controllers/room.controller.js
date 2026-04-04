import { Room } from "../models/room.model.js";
import mongoose from "mongoose";

export class RoomController {
    // obtener todas las habitaciones con filtros y paginación
    async getAll(req, res) {
        try {
            const { type, status, minPrice, maxPrice, page = 1, limit = 10 } = req.query;

            const filter = { isActive: true };
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
            const newRoom = await Room.create(req.body);
            res.status(201).json({
                msj: "Habitación creada exitosamente",
                data: newRoom
            });
        } catch (error) {
            // El errorHandler se encargará si hay duplicados de roomNumber (error 11000)
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
            const updatedRoom = await Room.findByIdAndUpdate(id, req.body, {
                new: true,
                runValidators: true
            });

            if (!updatedRoom) return res.status(404).json({ msj: "Habitación no encontrada" });

            res.status(200).json({
                msj: "Habitación actualizada correctamente",
                data: updatedRoom
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al actualizar", error: error.message });
        }
    }
}