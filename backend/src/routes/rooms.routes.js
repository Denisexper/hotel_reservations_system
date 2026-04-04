import { Router } from 'express';
import { RoomController } from '../controllers/room.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/role.middleware.js';
import { logAction } from '../middleware/logger.middleware.js';
import { PERMISSIONS } from '../db/seedRoles.js';

const router = Router();
const controller = new RoomController();

const routes = [
    {
        method: 'GET',
        path: '/',
        permission: PERMISSIONS.ROOMS_READ,
        description: 'Listar habitaciones del hotel',
        handler: controller.getAll,
        middlewares: []
    },
    {
        method: 'POST',
        path: '/',
        permission: PERMISSIONS.ROOMS_CREATE,
        description: 'Registrar nueva habitación',
        handler: controller.createRoom,
        middlewares: [logAction('create', 'rooms')]
    },
    {
        method: 'GET',
        path: '/:id',
        permission: PERMISSIONS.ROOMS_READ,
        description: 'Obtener detalle de una habitación',
        handler: controller.getRoom,
        middlewares: []
    },
    {
        method: 'PUT',
        path: '/:id',
        permission: PERMISSIONS.ROOMS_UPDATE,
        description: 'Actualizar datos de habitación',
        handler: controller.updateRoom,
        middlewares: [logAction('update', 'rooms')]
    }
];

// Registro automático idéntico al tuyo
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

export const roomRoutes = routes; // Para el seeder de permisos en el server.js
export default router;