import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/role.middleware.js';
import { logAction } from '../middleware/logger.middleware.js';
import { PERMISSIONS } from '../db/seedRoles.js';

const router = Router();
const controller = new PaymentController();

const routes = [
    {
        method: 'GET',
        path: '/',
        permission: PERMISSIONS.PAYMENTS_READ,
        description: 'Listar todos los pagos',
        handler: controller.getAll,
        middlewares: []
    },
    {
        method: 'GET',
        path: '/reservation/:reservationId',
        permission: PERMISSIONS.PAYMENTS_READ,
        description: 'Obtener pagos por reserva',
        handler: controller.getPaymentsByReservation,
        middlewares: []
    },
    {
        method: 'GET',
        path: '/:id',
        permission: PERMISSIONS.PAYMENTS_READ,
        description: 'Obtener detalle de un pago',
        handler: controller.getPayment,
        middlewares: []
    },
    {
        method: 'POST',
        path: '/',
        permission: PERMISSIONS.PAYMENTS_CREATE,
        description: 'Registrar un nuevo pago',
        handler: controller.createPayment,
        middlewares: [logAction('create', 'payments')]
    },
    {
        method: 'PATCH',
        path: '/:id/refund',
        permission: PERMISSIONS.PAYMENTS_UPDATE,
        description: 'Reembolsar un pago',
        handler: controller.refundPayment,
        middlewares: [logAction('update', 'payments')]
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

export const paymentRoutes = routes;
export default router;
