import { Router } from 'express';
import { SeasonalPriceController } from '../controllers/seasonalPrice.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/role.middleware.js';
import { logAction } from '../middleware/logger.middleware.js';
import { PERMISSIONS } from '../db/seedRoles.js';

const router = Router();
const controller = new SeasonalPriceController();

const routes = [
    {
        method: 'GET',
        path: '/',
        permission: PERMISSIONS.ROOMS_READ,
        description: 'Listar temporadas de precios',
        handler: controller.getAll,
        middlewares: []
    },
    {
        method: 'GET',
        path: '/check-price',
        permission: PERMISSIONS.ROOMS_READ,
        description: 'Consultar precio ajustado por temporada',
        handler: controller.checkPrice,
        middlewares: []
    },
    {
        method: 'GET',
        path: '/:id',
        permission: PERMISSIONS.ROOMS_READ,
        description: 'Obtener detalle de una temporada',
        handler: controller.getSeason,
        middlewares: []
    },
    {
        method: 'POST',
        path: '/',
        permission: PERMISSIONS.ROOMS_CREATE,
        description: 'Crear nueva temporada de precios',
        handler: controller.createSeason,
        middlewares: [logAction('create', 'seasonal_prices')]
    },
    {
        method: 'PUT',
        path: '/:id',
        permission: PERMISSIONS.ROOMS_UPDATE,
        description: 'Actualizar temporada de precios',
        handler: controller.updateSeason,
        middlewares: [logAction('update', 'seasonal_prices')]
    },
    {
        method: 'DELETE',
        path: '/:id',
        permission: PERMISSIONS.ROOMS_DELETE,
        description: 'Eliminar temporada de precios',
        handler: controller.deleteSeason,
        middlewares: [logAction('delete', 'seasonal_prices')]
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

export const seasonalPriceRoutes = routes;
export default router;