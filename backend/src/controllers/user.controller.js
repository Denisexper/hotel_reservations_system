import { userModel } from "../models/user.model.js";
import bcrypt from "bcrypt";
import { generateToken } from "../services/jwt.service.js";
import mongoose from "mongoose";
import { Log } from "../models/logs.model.js";
import { Role } from "../models/role.model.js";

export class userController {
  //register
  async register(req, res) {
    try {
      const { name, email, password, role } = req.body;

      const userExist = await userModel.findOne({ email });
      if (userExist) {
        return res.status(400).json({
          msj: "El email ya esta en uso",
        });
      }

      const hasPassword = await bcrypt.hash(password, 10);

      // Buscar el rol "user" por defecto
      const userRole = await Role.findOne({ name: role || "cliente" });
      if (!userRole) {
        return res.status(400).json({
          msj: "Rol no válido",
        });
      }

      const newUser = await userModel.create({
        name,
        email,
        password: hasPassword,
        role: userRole._id,
      });

      const token = generateToken({
        id: newUser._id,
        email: newUser.email,
        roleId: userRole._id,
      });

      res.status(201).json({
        msj: "usuario registrado exitosamente",
        token,
        newUser: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: userRole.name,
          roleId: userRole._id,
          permissions: userRole.permissions,
        },
      });
    } catch (error) {
      res.status(500).json({
        msj: "error al registrar el usuario",
        error: error.message,
      });
    }
  }

  //login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await userModel.findOne({ email }).populate("role");
      if (!user) {
        return res.status(401).json({
          msj: "credenciales invalidas",
        });
      }

      //ver si el usuario esta activo
      if (!user.isActive) {
        return res.status(403).json({
          msj: "Usuario desactivado. Contacta al administrador.",
        });
      }

      const isvalidPass = await bcrypt.compare(password, user.password);
      if (!isvalidPass) {
        return res.status(401).json({
          msj: "credenciales invalidas",
        });
      }

      user.lastLogin = new Date();
      await user.save();

      // Incluir roleId en el token
      const token = generateToken({
        id: user._id,
        email: user.email,
        roleId: user.role._id, // ObjectId del rol
      });

      // Log de login
      try {
        await Log.create({
          user: user._id,
          action: "login",
          resource: "auth",
          targetUser: user._id,
          targetUserName: user.name,
          details: `Login exitoso`,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
          statusCode: 200,
        });
      } catch (error) {
        console.error("Error creating login log:", error);
      }

      res.status(200).json({
        msj: "Login exitoso",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role.name, // Nombre del rol para el frontend
          roleId: user.role._id,
          permissions: user.role.permissions,
        },
      });
    } catch (error) {
      res.status(500).json({
        msj: "error en el login",
        error: error.message,
      });
    }
  }

  // Logout
  async logout(req, res) {
    try {
      // Crear log de logout
      await Log.create({
        user: req.user.id,
        action: "logout",
        resource: "auth",
        targetUser: req.user.id,
        targetUserName: req.user.name || "Usuario",
        details: `Logout exitoso`,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        statusCode: 200,
      });

      res.status(200).json({
        msj: "Logout exitoso",
      });
    } catch (error) {
      res.status(500).json({
        msj: "error en el logout",
        error: error.message,
      });
    }
  }

  //crear un usuario, ruta protegida para admins
  async createUser(req, res) {
    try {
      const { name, email, password, role } = req.body;

      const emailExis = await userModel.findOne({ email });
      if (emailExis) {
        return res.status(400).json({
          msj: "email ya esta en uso",
        });
      }

      const hasPassword = await bcrypt.hash(password, 10);

      // Buscar rol por nombre o por ID
      let roleDoc;
      if (mongoose.Types.ObjectId.isValid(role)) {
        roleDoc = await Role.findById(role);
      } else {
        roleDoc = await Role.findOne({ name: role || "user" });
      }

      if (!roleDoc) {
        return res.status(400).json({
          msj: "Rol no válido",
        });
      }

      const newUser = await userModel.create({
        name,
        email,
        password: hasPassword,
        role: roleDoc._id,
      });

      const token = generateToken({
        id: newUser._id,
        email: newUser.email,
        roleId: roleDoc._id,
      });

      res.status(201).json({
        msj: "user creado exitosamente",
        token,
        newUser: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: roleDoc.name,
          roleId: roleDoc._id,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        msj: "error de servidor",
        error: error.message,
      });
    }
  }

  //obtener un usuario por id
  async getUser(req, res) {
    const { id } = req.params;

    try {
      const response = await userModel.findById(id).populate("role");

      if (!response) {
        return res.status(404).json({
          msj: "usuario no encontrado",
        });
      }

      res.status(200).json({
        msj: "user encontrado",
        data: response,
      });
    } catch (error) {
      res.status(500).json({
        msj: "error del servidor",
        error: error.message,
      });
    }
  }

  //obtener todos los usuarios
  async getAll(req, res) {
    try {
      //obtenemos parametros de filtro y paginación
      const { search, role, isActive, page = 1, limit = 10 } = req.query;

      // Construir filtro dinámico
      const filter = {};

      // Filtro por búsqueda (nombre o email)
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      // Filtro por rol
      if (role) {
        filter.role = role;
      }

      // Filtro por estado
      if (isActive !== undefined && isActive !== "") {
        filter.isActive = isActive === "true";
      }

      //Paginación
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      //Consulta con paginación
      const [users, totalRecords] = await Promise.all([
        userModel
          .find(filter)
          .populate("role")
          .select("-password")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
        userModel.countDocuments(filter),
      ]);

      //Calcular metadatos
      const totalPages = Math.ceil(totalRecords / limitNum);

      //respondemos la peticion
      res.status(200).json({
        msj:
          users.length === 0
            ? "lista de usuarios vacia"
            : "usuarios obtenidos correctamente",
        total: totalRecords,
        data: users,
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
        msj: "error del servidor",
        error: error.message,
      });
    }
  }

  //actualizar un usuario por id

  async updateUser(req, res) {
    try {
      //obtenemos el id de los parametros
      const { id } = req.params;

      //obtenemos los nuevos campos del body
      const { name, email, password, role } = req.body;

      //validamos si es un id valido de mongodb
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          msj: "Id no valido",
        });
      }

      //buscamos si el usuario existe
      const user = await userModel.findById(id);

      if (!user) {
        return res.status(404).json({
          msj: "usuario no encontrado",
        });
      }

      //verificamos si el email ya existe (solo si va en la petion)
      if (email && email !== user.email) {
        const emailExist = await userModel.findOne({ email });
        if (emailExist) {
          return res.status(400).json({
            msj: "el email ya esta en uso",
          });
        }
      }

      //creamos un objeto con los campos ya validados y listos para actulializar

      const rightData = {};

      if (name) rightData.name = name;
      if (email) rightData.email = email;

      // validar y hashear la contraseña nueva
      if (password) {
        if (password.length < 6) {
          return res.status(400).json({
            msj: "la contraseña debe tener al menos 6 caracteres",
          });
        }

        rightData.password = await bcrypt.hash(password, 10);
      }

      //solo permitir actualizar si el usuario actual es admin
      if (role) {
        if (req.user.role !== "admin") {
          return res.status(403).json({
            msj: "no tienes permiso para cambiar roles",
          });
        }

        rightData.role = role;
      }

      //actualizar usuario

      const updateUser = await userModel.findByIdAndUpdate(id, rightData, {
        new: true,
        runValidators: true, //para ejecutar las validaciones que configuramos en el Schema que creamos
      });
      const populatedUser = await userModel
        .findById(updateUser._id)
        .populate("role");

      //si se crea correctamente responsemos
      res.status(200).json({
        msj: "usuario actualizado correctamente",
        user: {
          id: populatedUser._id,
          name: populatedUser.name,
          email: populatedUser.email,
          role: populatedUser.role?.name,
          roleId: populatedUser.role?._id,
          isActive: populatedUser.isActive,
        },
      });
    } catch (error) {
      console.log("error 500", error);
      res.status(500).json({
        msj: "error actualizando usuario",
        error: error.message,
      });
    }
  }

  //eliminar usuarios
  async deleteUser(req, res) {
    try {
      //obtenemos id de los parametros de la url
      const { id } = req.params;

      //verificamos si el id de mongo es valido
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          msj: "el id no es valido",
        });
      }
      //verificamos que tenga rol permitido para eliminar usuarios
      if (req.user.role !== "admin") {
        return res.status(403).json({
          msj: "no tienes permisos para eliminar usuarios",
        });
      }

      //evitamos que el admin se suicide
      if (id === req.user.id) {
        return res.status(400).json({
          msj: "no puedes eliminar tu propia cuenta",
        });
      }
      //eliminar el usuario por el id
      const deleteUser = await userModel.findByIdAndDelete(id);

      //validamos si se encontro el usuario
      if (!deleteUser) {
        return res.status(404).json({
          msj: "usuario no encontrado",
        });
      }
      //respondemos la peticion
      res.status(200).json({
        msj: "usuario eliminado correctamente",
        deleteUser: {
          id: deleteUser._id,
          name: deleteUser.name,
          email: deleteUser.email,
          role: deleteUser.role,
        },
      });
    } catch (error) {
      res.status(500).json({
        msj: "error eliminando usuario",
        error: error.message,
      });
    }
  }

  // Obtener perfil del usuario autenticado (no requiere permisos especiales)
  async getMe(req, res) {
    try {
      // req.user viene del authMiddleware con todos los datos
      const user = await userModel
        .findById(req.user.id)
        .populate("role")
        .select("-password"); // No enviar la contraseña

      if (!user) {
        return res.status(404).json({
          msj: "usuario no encontrado",
        });
      }

      res.status(200).json({
        msj: "perfil obtenido",
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role.name,
          roleId: user.role._id,
          permissions: user.role.permissions,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      res.status(500).json({
        msj: "error del servidor",
        error: error.message,
      });
    }
  }

  //Activar/Desactivar usuario (en lugar de eliminar)
  async toggleUserStatus(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          msj: "Id no válido",
        });
      }

      const user = await userModel.findById(id).populate("role");
      if (!user) {
        return res.status(404).json({
          msj: "Usuario no encontrado",
        });
      }

      // Cambiar el estado
      user.isActive = !user.isActive;
      await user.save();

      res.status(200).json({
        msj: `Usuario ${user.isActive ? "activado" : "desactivado"} correctamente`,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isActive: user.isActive,
          role: user.role?.name,
          roleId: user.role?._id,
        },
      });
    } catch (error) {
      console.error("Error toggleUserStatus:", error);
      res.status(500).json({
        msj: "Error al cambiar estado del usuario",
        error: error.message,
      });
    }
  }

  // En user.controller.js
  async getUserHistory(req, res) {
    const { userId } = req.params;

    try {
      const logs = await Log.find({
        targetUser: userId,
        action: { $in: ["create", "update", "delete"] },
      })
        .populate("user", "name email")
        .sort({ createdAt: -1 });

      res.json({
        total: logs.length,
        data: logs,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
