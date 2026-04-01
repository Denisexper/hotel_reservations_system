import { Log } from "../models/logs.model.js";
import { userModel } from "../models/user.model.js";

export const logAction = (action, resource) => {
    return async (req, res, next) => {
        // Capturar snapshot ANTES de la acción (para update/delete)
        let dataBefore = null;
        let targetUser = null;
        let targetUserName = null;

        if (req.params.id && (action === 'update' || action === 'delete')) {
            try {
                const user = await userModel.findById(req.params.id).populate('role');
                if (user) {
                    targetUser = user._id;
                    targetUserName = user.name;

                    // Guardar snapshot completo (sin password)
                    dataBefore = {
                        name: user.name,
                        email: user.email,
                        role: user.role?.name || user.role,
                        roleId: user.role?._id,
                        isActive: user.isActive,
                        lastLogin: user.lastLogin
                    };
                }
            } catch (error) {
                console.error('Error fetching user before action:', error);
            }
        }

        // Interceptar la respuesta
        const originalJson = res.json;

        res.json = async function (data) {
            // Crear log después de la respuesta
            if (req.user) {
                try {
                    const logData = {
                        user: req.user.id,
                        action,
                        resource,
                        details: `${req.method} ${req.originalUrl}`,
                        userAgent: req.get('user-agent'),
                        statusCode: res.statusCode,
                        dataBefore: dataBefore
                    };

                    // Para CREATE: guardar el usuario creado en dataAfter
                    if (action === 'create' && data.newUser) {
                        logData.targetUser = data.newUser.id;
                        logData.targetUserName = data.newUser.name;
                        logData.dataAfter = {
                            name: data.newUser.name,
                            email: data.newUser.email,
                            role: data.newUser.role,
                            roleId: data.newUser.roleId
                        };
                    }
                    // Para UPDATE: guardar el usuario actualizado en dataAfter
                    else if (action === 'update' && data.user) {
                        logData.targetUser = data.user.id;
                        logData.targetUserName = data.user.name;

                        // Construir dataAfter con el mismo formato que dataBefore
                        logData.dataAfter = {
                            name: data.user.name,
                            email: data.user.email,
                            role: data.user.role, // Ya viene como nombre del rol del controller
                            roleId: data.user.roleId,
                            isActive: data.user.isActive
                        };

                        // Calcular campos que cambiaron (ignorar roleId en la comparación)
                        logData.changedFields = [];
                        if (dataBefore && logData.dataAfter) {
                            // Comparar solo campos relevantes (sin roleId)
                            const fieldsToCompare = ['name', 'email', 'role', 'isActive'];

                            fieldsToCompare.forEach(field => {
                                const before = String(dataBefore[field] || '');
                                const after = String(logData.dataAfter[field] || '');

                                if (before !== after) {
                                    logData.changedFields.push(field);
                                }
                            });
                        }
                    }
                    // Para DELETE: solo guardar el before
                    else if (action === 'delete' && data.deleteUser) {
                        logData.targetUser = data.deleteUser.id;
                        logData.targetUserName = data.deleteUser.name;
                        logData.dataAfter = null; // Fue eliminado
                    }
                    // Para otros casos (read, etc)
                    else if (targetUser) {
                        logData.targetUser = targetUser;
                        logData.targetUserName = targetUserName;
                    }

                    await Log.create(logData);
                } catch (error) {
                    console.error('Error creating log:', error);
                }
            }

            return originalJson.call(this, data);
        };

        next();
    };
};