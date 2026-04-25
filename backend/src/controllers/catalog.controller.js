import { Amenity } from "../models/amenity.model.js";
import { RoomType } from "../models/roomType.model.js";

export class CatalogController {

    // ============================================
    // AMENIDADES
    // ============================================

    async getAmenities(req, res) {
        try {
            const amenities = await Amenity.find({ isActive: true }).sort({ name: 1 });
            res.status(200).json({ msj: "Amenidades obtenidas", data: amenities });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener amenidades", error: error.message });
        }
    }

    async createAmenity(req, res) {
        try {
            const { name } = req.body;
            if (!name?.trim()) {
                return res.status(400).json({ msj: "El nombre es obligatorio" });
            }

            const exists = await Amenity.findOne({ name: name.trim() });
            if (exists) {
                return res.status(400).json({ msj: "Ya existe una amenidad con ese nombre" });
            }

            const amenity = await Amenity.create({ name: name.trim() });
            res.status(201).json({ msj: "Amenidad creada correctamente", data: amenity });
        } catch (error) {
            res.status(500).json({ msj: "Error al crear amenidad", error: error.message });
        }
    }

    async updateAmenity(req, res) {
        try {
            const { id } = req.params;
            const { name, isActive } = req.body;

            const amenity = await Amenity.findById(id);
            if (!amenity) return res.status(404).json({ msj: "Amenidad no encontrada" });

            if (name?.trim() && name.trim() !== amenity.name) {
                const exists = await Amenity.findOne({ name: name.trim(), _id: { $ne: id } });
                if (exists) return res.status(400).json({ msj: "Ya existe una amenidad con ese nombre" });
                amenity.name = name.trim();
            }

            if (isActive !== undefined) amenity.isActive = isActive;

            await amenity.save();
            res.status(200).json({ msj: "Amenidad actualizada", data: amenity });
        } catch (error) {
            res.status(500).json({ msj: "Error al actualizar amenidad", error: error.message });
        }
    }

    async deleteAmenity(req, res) {
        try {
            const { id } = req.params;
            const amenity = await Amenity.findByIdAndDelete(id);
            if (!amenity) return res.status(404).json({ msj: "Amenidad no encontrada" });
            res.status(200).json({ msj: "Amenidad eliminada" });
        } catch (error) {
            res.status(500).json({ msj: "Error al eliminar amenidad", error: error.message });
        }
    }

    // ============================================
    // TIPOS DE HABITACIÓN
    // ============================================

    async getRoomTypes(req, res) {
        try {
            const roomTypes = await RoomType.find({ isActive: true }).sort({ name: 1 });
            res.status(200).json({ msj: "Tipos obtenidos", data: roomTypes });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener tipos", error: error.message });
        }
    }

    async createRoomType(req, res) {
        try {
            const { name } = req.body;
            if (!name?.trim()) {
                return res.status(400).json({ msj: "El nombre es obligatorio" });
            }

            const exists = await RoomType.findOne({ name: name.trim() });
            if (exists) {
                return res.status(400).json({ msj: "Ya existe un tipo con ese nombre" });
            }

            const roomType = await RoomType.create({ name: name.trim() });
            res.status(201).json({ msj: "Tipo creado correctamente", data: roomType });
        } catch (error) {
            res.status(500).json({ msj: "Error al crear tipo", error: error.message });
        }
    }

    async updateRoomType(req, res) {
        try {
            const { id } = req.params;
            const { name, isActive } = req.body;

            const roomType = await RoomType.findById(id);
            if (!roomType) return res.status(404).json({ msj: "Tipo no encontrado" });

            if (name?.trim() && name.trim() !== roomType.name) {
                const exists = await RoomType.findOne({ name: name.trim(), _id: { $ne: id } });
                if (exists) return res.status(400).json({ msj: "Ya existe un tipo con ese nombre" });
                roomType.name = name.trim();
            }

            if (isActive !== undefined) roomType.isActive = isActive;

            await roomType.save();
            res.status(200).json({ msj: "Tipo actualizado", data: roomType });
        } catch (error) {
            res.status(500).json({ msj: "Error al actualizar tipo", error: error.message });
        }
    }

    async deleteRoomType(req, res) {
        try {
            const { id } = req.params;
            const roomType = await RoomType.findByIdAndDelete(id);
            if (!roomType) return res.status(404).json({ msj: "Tipo no encontrado" });
            res.status(200).json({ msj: "Tipo eliminado" });
        } catch (error) {
            res.status(500).json({ msj: "Error al eliminar tipo", error: error.message });
        }
    }
}
