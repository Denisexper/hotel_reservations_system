import { Router } from 'express';
import { MaintenanceController } from '../controllers/maintenance.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/role.middleware.js';
import { logAction } from '../middleware/logger.middleware.js';
import { PERMISSIONS } from '../db/seedRoles.js';

const router = Router();
const controller = new MaintenanceController();

const routes = [
    {
        method: 'GET',
        path: '/',
        permission: PERMISSIONS.MAINTENANCE_READ,
        description: 'Listar todos los tickets de mantenimiento',
        handler: controller.getAll,
        middlewares: []
    },
    {
        method: 'GET',
        path: '/room/:roomId',
        permission: PERMISSIONS.MAINTENANCE_READ,
        description: 'Obtener tickets por habitación',
        handler: controller.getByRoom,
        middlewares: []
    },
    {
        method: 'GET',
        path: '/:id',
        permission: PERMISSIONS.MAINTENANCE_READ,
        description: 'Obtener detalle de un ticket',
        handler: controller.getTicket,
        middlewares: []
    },
    {
        method: 'POST',
        path: '/',
        permission: PERMISSIONS.MAINTENANCE_CREATE,
        description: 'Crear ticket de mantenimiento',
        handler: controller.createTicket,
        middlewares: [logAction('create', 'maintenance')]
    },
    {
        method: 'PUT',
        path: '/:id',
        permission: PERMISSIONS.MAINTENANCE_UPDATE,
        description: 'Actualizar ticket de mantenimiento',
        handler: controller.updateTicket,
        middlewares: [logAction('update', 'maintenance')]
    },
    {
        method: 'DELETE',
        path: '/:id',
        permission: PERMISSIONS.MAINTENANCE_DELETE,
        description: 'Eliminar ticket de mantenimiento',
        handler: controller.deleteTicket,
        middlewares: [logAction('delete', 'maintenance')]
    }
];

routes.forEach(route => {
    const allMiddlewares = [
        authMiddleware,
        checkPermission(route.permission),
        ...route.middlewares
    ];

    router[route.method.toLowerCase()](
        route.path,
        ...allMiddlewares,
        route.handler
    );
});

export const maintenanceRoutes = routes;
export default router;