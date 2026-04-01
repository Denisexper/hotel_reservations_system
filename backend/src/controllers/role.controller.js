import { Role } from "../models/role.model.js";
import { PERMISSIONS } from "../db/seedRoles.js";
import mongoose from "mongoose";
import { userModel } from "../models/user.model.js";

export class RoleController {
  // Obtener todos los roles
  async getAll(req, res) {
    try {
      // Agregar paginación
      const { page = 1, limit = 10 } = req.query;

      // Paginación
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Consulta con paginación
      const [roles, totalRecords] = await Promise.all([
        Role.find()
          .select("-__v")
          .sort({ isSystem: -1, name: 1 })
          .skip(skip)
          .limit(limitNum),
        Role.countDocuments(),
      ]);

      // Calcular metadatos
      const totalPages = Math.ceil(totalRecords / limitNum);

      res.status(200).json({
        msj: "Roles obtenidos correctamente",
        total: totalRecords,
        data: roles,
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
      res.status(500).json({
        msj: "Error obteniendo roles",
        error: error.message,
      });
    }
  }

  // Obtener un rol por ID
  async getOne(req, res) {
    try {
      const { id } = req.params;
      const role = await Role.findById(id);

      if (!role) {
        return res.status(404).json({
          msj: "Rol no encontrado",
        });
      }

      res.status(200).json({
        msj: "Rol encontrado",
        data: role,
      });
    } catch (error) {
      res.status(500).json({
        msj: "Error obteniendo rol",
        error: error.message,
      });
    }
  }

  // Obtener permisos disponibles
  async getPermissions(req, res) {
    try {
      const permissions = Object.entries(PERMISSIONS).map(([key, value]) => ({
        key,
        value,
        resource: value.split(".")[0],
        action: value.split(".")[1],
      }));

      res.status(200).json({
        msj: "Permisos disponibles",
        total: permissions.length,
        data: permissions,
      });
    } catch (error) {
      res.status(500).json({
        msj: "Error obteniendo permisos",
        error: error.message,
      });
    }
  }

  // Crear un rol
  async create(req, res) {
    try {
      const { name, displayName, description, permissions } = req.body;

      const existingRole = await Role.findOne({ name: name.toLowerCase() });
      if (existingRole) {
        return res.status(400).json({
          msj: "Ya existe un rol con ese nombre",
        });
      }

      const newRole = await Role.create({
        name: name.toLowerCase(),
        displayName,
        description,
        permissions: permissions || [],
        isSystem: false,
      });

      res.status(201).json({
        msj: "Rol creado exitosamente",
        data: newRole,
      });
    } catch (error) {
      res.status(500).json({
        msj: "Error creando rol",
        error: error.message,
      });
    }
  }

  // Actualizar un rol
  async update(req, res) {
    try {
      const { id } = req.params;
      const { displayName, description, permissions, isActive } = req.body;

      const role = await Role.findById(id);
      if (!role) {
        return res.status(404).json({
          msj: "Rol no encontrado",
        });
      }

      // No permitir editar roles del sistema (solo sus permisos)
      if (role.isSystem && req.body.name) {
        return res.status(400).json({
          msj: "No se puede cambiar el nombre de roles del sistema",
        });
      }

      const updatedRole = await Role.findByIdAndUpdate(
        id,
        { displayName, description, permissions, isActive },
        { new: true, runValidators: true },
      );

      res.status(200).json({
        msj: "Rol actualizado correctamente",
        data: updatedRole,
      });
    } catch (error) {
      res.status(500).json({
        msj: "Error actualizando rol",
        error: error.message,
      });
    }
  }

  // Eliminar un rol
  async delete(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(403).json({
          msj: "id invalido",
        });
      }

      const role = await Role.findById(id);
      if (!role) {
        return res.status(404).json({
          msj: "Rol no encontrado",
        });
      }

      if (role.isSystem) {
        return res.status(400).json({
          msj: "No se pueden eliminar roles del sistema",
        });
      }

      // Verificar si hay usuarios con este rol
      const usersWithRole = await userModel.countDocuments({ role: id });
      if (usersWithRole > 0) {
        return res.status(400).json({
          msj: `No se puede eliminar. Hay ${usersWithRole} usuario(s) con este rol`,
        });
      }

      await Role.findByIdAndDelete(id);

      res.status(200).json({
        msj: "Rol eliminado correctamente",
      });
    } catch (error) {
      res.status(500).json({
        msj: "Error eliminando rol",
        error: error.message,
      });
    }
  }
}
