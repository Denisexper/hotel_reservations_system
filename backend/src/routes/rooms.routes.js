import { Router } from 'express';
import { RoomController } from '../controllers/room.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/role.middleware.js';
import { logAction } from '../middleware/logger.middleware.js';
import { PERMISSIONS } from '../db/seedRoles.js';
import { uploadRoomImages } from '../config/multer.config.js';

const router = Router();
const controller = new RoomController();

const routes = [
    {
        method: 'GET',
        path: '/',
        permission: null, // Sin permiso específico, solo autenticación esto para la landig page actualmente
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
        middlewares: [uploadRoomImages, logAction('create', 'rooms')]
    },
    {
        method: 'GET',
        path: '/available',
        permission: null, // Sin permiso específico, solo autenticación esto para la landig page actualmente
        description: 'Buscar habitaciones disponibles por fechas',
        handler: controller.searchAvailable,
        middlewares: []
    },
    {
        method: 'GET',
        path: '/:id',
        permission: null, // Sin permiso específico, solo autenticación esto para la landig page actualmente
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
        middlewares: [uploadRoomImages, logAction('update', 'rooms')]
    },
    {
        method: 'DELETE',
        path: '/:id',
        permission: PERMISSIONS.ROOMS_DELETE,
        description: 'Eliminar habitación',
        handler: controller.deleteRoom,
        middlewares: [logAction('update', 'rooms')]
    },
    {
        method: 'DELETE',
        path: '/:id/images/:imageIndex',
        permission: PERMISSIONS.ROOMS_UPDATE,
        description: 'Eliminar imagen de habitación',
        handler: controller.deleteImage,
        middlewares: [logAction('update', 'rooms')]
    },

];

// Registro automático idéntico al tuyo
routes.forEach(route => {
    const allMiddlewares = route.permission
        ? [authMiddleware, checkPermission(route.permission), ...route.middlewares]
        : [...route.middlewares];

    router[route.method.toLowerCase()](
        route.path,
        ...allMiddlewares,
        route.handler
    );
});

export const roomRoutes = routes; // Para el seeder de permisos en el server.js
export default router;