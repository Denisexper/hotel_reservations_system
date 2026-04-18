import { Router } from 'express';
import { DayPassController } from '../controllers/dayPass.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/role.middleware.js';
import { logAction } from '../middleware/logger.middleware.js';
import { PERMISSIONS } from '../db/seedRoles.js';

const router = Router();
const controller = new DayPassController();

const routes = [
    {
        method: 'GET',
        path: '/',
        permission: PERMISSIONS.DAYPASS_READ,
        description: 'Listar todos los day passes',
        handler: controller.getAll,
        middlewares: []
    },
    {
        method: 'GET',
        path: '/today',
        permission: PERMISSIONS.DAYPASS_READ,
        description: 'Day passes del día actual',
        handler: controller.getToday,
        middlewares: []
    },
    {
        method: 'GET',
        path: '/:id',
        permission: PERMISSIONS.DAYPASS_READ,
        description: 'Obtener detalle de un day pass',
        handler: controller.getDayPass,
        middlewares: []
    },
    {
        method: 'POST',
        path: '/',
        permission: PERMISSIONS.DAYPASS_CREATE,
        description: 'Crear un day pass',
        handler: controller.createDayPass,
        middlewares: [logAction('create', 'daypass')]
    },
    {
        method: 'PUT',
        path: '/:id',
        permission: PERMISSIONS.DAYPASS_UPDATE,
        description: 'Actualizar un day pass',
        handler: controller.updateDayPass,
        middlewares: [logAction('update', 'daypass')]
    },
    {
        method: 'PATCH',
        path: '/:id/pay',
        permission: PERMISSIONS.DAYPASS_UPDATE,
        description: 'Registrar pago de day pass',
        handler: controller.registerPayment,
        middlewares: [logAction('update', 'daypass')]
    },
    {
        method: 'PATCH',
        path: '/:id/checkout',
        permission: PERMISSIONS.DAYPASS_UPDATE,
        description: 'Registrar check-out de visitante',
        handler: controller.checkOut,
        middlewares: [logAction('update', 'daypass')]
    },
    {
        method: 'PATCH',
        path: '/:id/cancel',
        permission: PERMISSIONS.DAYPASS_UPDATE,
        description: 'Cancelar un day pass',
        handler: controller.cancelDayPass,
        middlewares: [logAction('update', 'daypass')]
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

export const dayPassRoutes = routes;
export default router;