import { Role } from '../models/role.model.js';

export const checkPermission = (...requiredPermissions) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    msj: 'No autenticado'
                });
            }

            // Usar permisos ya cargados del authMiddleware
            const userPermissions = req.user.permissions || [];

            // Verificar si el usuario tiene alguno de los permisos requeridos
            const hasPermission = requiredPermissions.some(permission => 
                userPermissions.includes(permission)
            );

            if (!hasPermission) {
                return res.status(403).json({
                    msj: 'No tienes permisos para acceder a este recurso',
                    requiredPermissions,
                    yourPermissions: userPermissions
                });
            }

            next();
        } catch (error) {
            console.error('Error en checkPermission:', error);
            return res.status(500).json({
                msj: 'Error verificando permisos',
                error: error.message
            });
        }
    };
};

// Middleware legacy - mantener para compatibilidad temporal
export const checkRole = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    msj: 'No autenticado'
                });
            }

            // Usar el nombre del rol ya cargado
            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({
                    msj: 'No tienes permisos para acceder a este recurso'
                });
            }

            next();
        } catch (error) {
            console.error('Error en checkRole:', error);
            return res.status(500).json({
                msj: 'Error verificando rol',
                error: error.message
            });
        }
    };
};