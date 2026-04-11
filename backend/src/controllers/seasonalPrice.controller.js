import { SeasonalPrice } from '../models/seasonalPrice.model.js';

export class SeasonalPriceController {

    // Listar temporadas con paginación
    async getAll(req, res) {
        try {
            const { isActive, page = 1, limit = 10 } = req.query;
            const filter = {};

            if (isActive !== undefined) filter.isActive = isActive === 'true';

            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;

            const [seasons, totalRecords] = await Promise.all([
                SeasonalPrice.find(filter)
                    .populate('createdBy', 'name email')
                    .sort({ startDate: -1 })
                    .skip(skip)
                    .limit(limitNum),
                SeasonalPrice.countDocuments(filter)
            ]);

            const totalPages = Math.ceil(totalRecords / limitNum);

            res.status(200).json({
                msj: seasons.length === 0 ? "No se encontraron temporadas" : "Temporadas obtenidas correctamente",
                total: totalRecords,
                data: seasons,
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
            res.status(500).json({ msj: "Error al obtener temporadas", error: error.message });
        }
    }

    // Obtener temporada por ID
    async getSeason(req, res) {
        try {
            const { id } = req.params;
            const season = await SeasonalPrice.findById(id).populate('createdBy', 'name email');

            if (!season) {
                return res.status(404).json({ msj: "Temporada no encontrada" });
            }

            res.status(200).json({ msj: "Temporada encontrada", data: season });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener temporada", error: error.message });
        }
    }

    // Crear temporada
    async createSeason(req, res) {
        try {
            const seasonData = {
                ...req.body,
                createdBy: req.user.id
            };

            // Normalizar fechas para evitar desfase de timezone
            if (seasonData.startDate) {
                seasonData.startDate = new Date(seasonData.startDate + "T12:00:00");
            }
            if (seasonData.endDate) {
                seasonData.endDate = new Date(seasonData.endDate + "T12:00:00");
            }

            const newSeason = await SeasonalPrice.create(seasonData);
            await newSeason.populate('createdBy', 'name email');

            res.status(201).json({
                msj: "Temporada creada exitosamente",
                data: newSeason
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al crear temporada", error: error.message });
        }
    }

    // Actualizar temporada
    async updateSeason(req, res) {
        try {
            const { id } = req.params;
            const updateData = { ...req.body };

            if (updateData.startDate) {
                updateData.startDate = new Date(updateData.startDate + "T12:00:00");
            }
            if (updateData.endDate) {
                updateData.endDate = new Date(updateData.endDate + "T12:00:00");
            }

            const updatedSeason = await SeasonalPrice.findByIdAndUpdate(id, updateData, {
                new: true,
                runValidators: true
            }).populate('createdBy', 'name email');

            if (!updatedSeason) {
                return res.status(404).json({ msj: "Temporada no encontrada" });
            }

            res.status(200).json({
                msj: "Temporada actualizada correctamente",
                data: updatedSeason
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al actualizar temporada", error: error.message });
        }
    }

    // Eliminar temporada (soft delete)
    async deleteSeason(req, res) {
        try {
            const { id } = req.params;

            const deletedSeason = await SeasonalPrice.findByIdAndUpdate(id,
                { isActive: false },
                { new: true }
            );

            if (!deletedSeason) {
                return res.status(404).json({ msj: "Temporada no encontrada" });
            }

            res.status(200).json({
                msj: "Temporada desactivada correctamente",
                data: deletedSeason
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al eliminar temporada", error: error.message });
        }
    }

    // Consultar precio de una habitación con ajuste de temporada
    async checkPrice(req, res) {
        try {
            const { roomId, checkIn } = req.query;

            if (!roomId || !checkIn) {
                return res.status(400).json({ msj: "Faltan parámetros: roomId, checkIn" });
            }

            const { Room } = await import('../models/room.model.js');
            const room = await Room.findById(roomId);

            if (!room) {
                return res.status(404).json({ msj: "Habitación no encontrada" });
            }

            const { price, season } = await SeasonalPrice.getAdjustedPrice(
                room.basePrice,
                room.type,
                new Date(checkIn)
            );

            res.status(200).json({
                msj: "Precio consultado",
                data: {
                    basePrice: room.basePrice,
                    adjustedPrice: price,
                    season: season,
                    roomType: room.type,
                    roomNumber: room.roomNumber
                }
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al consultar precio", error: error.message });
        }
    }
}