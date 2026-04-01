import mongoose, { mongo } from "mongoose";
import { Log } from "../models/logs.model.js";
export const logsReports = async (req, res) => {
  try {
    // ✅ NUEVO: Agregar page y limit
    const {
      user,
      action,
      resource,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = req.query;

    // Filtramos la data
    const filter = {};
    if (user) filter.user = user;
    if (action) filter.action = action;
    if (resource) filter.resource = resource;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          filter.createdAt.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          filter.createdAt.$lte = end;
        }
      }
    }

    // Calcular paginación
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    //  Consulta con paginación + conteo total
    const [logs, totalRecords] = await Promise.all([
      Log.find(filter)
        .select("-__v")
        .populate("user", "name email")
        .populate("targetUser", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Log.countDocuments(filter),
    ]);

    // Calcular metadatos
    const totalPages = Math.ceil(totalRecords / limitNum);

    // Respuesta con paginación
    res.status(200).json({
      data: logs,
      total: totalRecords, // Mantener retrocompatibilidad
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalRecords: totalRecords,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Error en logsReports:", error);
    res.status(500).json({
      msj: "Error al obtener logs",
      error: error.message,
    });
  }
};

//funcion para eliminar logs
export const deleteLogs = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        msj: "el id del log no es valido",
      });
    }

    const logDeleted = await Log.findByIdAndDelete(id)
      .select("-__v")
      .populate("user", "name email role"); //populate nos trae el name, email y demas propiedades del usuario(es como un inner join)

    //validamos si encontro el usuario
    if (!logDeleted) {
      return res.status(404).json({
        msj: "log no encontrado",
      });
    }

    res.status(200).json({
      msj: "log eliminado correctamente",
      logDeleted: logDeleted,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      msj: "error de servidor",
    });
  }
};

// Obtener historial de cambios de un usuario específico
export const getUserHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    // Obtener todos los logs donde este usuario fue afectado
    const logs = await Log.find({
      targetUser: userId,
      action: { $in: ["create", "update", "delete"] }, // Solo cambios relevantes
    })
      .populate("user", "name email")
      .populate("targetUser", "name email")
      .sort({ createdAt: -1 }) // Más reciente primero
      .select("-__v");

    res.status(200).json({
      msj: "Historial obtenido",
      total: logs.length,
      data: logs,
    });
  } catch (error) {
    res.status(500).json({
      msj: "Error obteniendo historial",
      error: error.message,
    });
  }
};
