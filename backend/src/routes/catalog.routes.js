import { Router } from 'express';
import { CatalogController } from '../controllers/catalog.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/role.middleware.js';
import { PERMISSIONS } from '../db/seedRoles.js';

const router = Router();
const controller = new CatalogController();

const routes = [
    // AMENIDADES
    {
        method: 'GET',
        path: '/amenities',
        permission: PERMISSIONS.CATALOGS_READ,
        description: 'Listar amenidades disponibles',
        handler: controller.getAmenities,
        middlewares: []
    },
    {
        method: 'POST',
        path: '/amenities',
        permission: PERMISSIONS.CATALOGS_CREATE,
        description: 'Crear nueva amenidad',
        handler: controller.createAmenity,
        middlewares: []
    },
    {
        method: 'PUT',
        path: '/amenities/:id',
        permission: PERMISSIONS.CATALOGS_UPDATE,
        description: 'Actualizar amenidad',
        handler: controller.updateAmenity,
        middlewares: []
    },
    {
        method: 'DELETE',
        path: '/amenities/:id',
        permission: PERMISSIONS.CATALOGS_DELETE,
        description: 'Eliminar amenidad',
        handler: controller.deleteAmenity,
        middlewares: []
    },

    // TIPOS DE HABITACIÓN
    {
        method: 'GET',
        path: '/room-types',
        permission: PERMISSIONS.CATALOGS_READ,
        description: 'Listar tipos de habitación',
        handler: controller.getRoomTypes,
        middlewares: []
    },
    {
        method: 'POST',
        path: '/room-types',
        permission: PERMISSIONS.CATALOGS_CREATE,
        description: 'Crear nuevo tipo de habitación',
        handler: controller.createRoomType,
        middlewares: []
    },
    {
        method: 'PUT',
        path: '/room-types/:id',
        permission: PERMISSIONS.CATALOGS_UPDATE,
        description: 'Actualizar tipo de habitación',
        handler: controller.updateRoomType,
        middlewares: []
    },
    {
        method: 'DELETE',
        path: '/room-types/:id',
        permission: PERMISSIONS.CATALOGS_DELETE,
        description: 'Eliminar tipo de habitación',
        handler: controller.deleteRoomType,
        middlewares: []
    },
];

routes.forEach(route => {
    const allMiddlewares = [authMiddleware, checkPermission(route.permission), ...route.middlewares];
    router[route.method.toLowerCase()](route.path, ...allMiddlewares, route.handler);
});

export const catalogRoutes = routes;
export default router;
