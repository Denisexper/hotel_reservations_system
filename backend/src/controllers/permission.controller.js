import { Permission } from '../models/permission.model.js';

/**
 * Obtener todos los permisos disponibles
 * Agrupados por recurso para facilitar visualización en UI
 */
export const getAllPermissions = async (req, res) => {
    try {
        // Obtener todos los permisos activos
        const permissions = await Permission.find({ isActive: true })
            .sort({ resource: 1, action: 1 });

        // Agrupar por recurso
        const grouped = permissions.reduce((acc, perm) => {
            if (!acc[perm.resource]) {
                acc[perm.resource] = [];
            }
            acc[perm.resource].push({
                code: perm.code,
                action: perm.action,
                description: perm.description
            });
            return acc;
        }, {});

        res.json({
            total: permissions.length,
            permissions: grouped
        });
    } catch (error) {
        res.status(500).json({ 
            msj: 'Error al obtener permisos',
            error: error.message 
        });
    }
};