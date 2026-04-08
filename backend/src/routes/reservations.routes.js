import { Router } from 'express';
import { ReservationController } from '../controllers/reservation.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/role.middleware.js';
import { logAction } from '../middleware/logger.middleware.js';
import { PERMISSIONS } from '../db/seedRoles.js';

const router = Router();
const controller = new ReservationController();

const routes = [
    {
        method: 'GET',
        path: '/',
        permission: PERMISSIONS.RESERVATIONS_READ,
        description: 'Listar todas las reservas (Filtros admin)',
        handler: controller.getAll,
        middlewares: []
    },
    {
        method: 'GET',
        path: '/my-reservations',
        permission: PERMISSIONS.RESERVATIONS_READ, // Los clientes tienen este permiso para ver sus reservas
        description: 'Listar las reservas del cliente autenticado',
        handler: controller.getMyReservations,
        middlewares: []
    },
    {
        method: 'POST',
        path: '/',
        permission: PERMISSIONS.RESERVATIONS_CREATE,
        description: 'Crear una nueva reserva',
        handler: controller.createReservation,
        middlewares: [logAction('create', 'reservations')]
    },
    {
        method: 'GET',
        path: '/check-availability',
        permission: PERMISSIONS.RESERVATIONS_READ,
        description: 'Verificar disponibilidad de una habitación',
        handler: controller.checkAvailability,
        middlewares: []
    },
    {
        method: 'GET',
        path: '/:id',
        permission: PERMISSIONS.RESERVATIONS_READ,
        description: 'Obtener detalle de una reserva específica',
        handler: controller.getReservation,
        middlewares: []
    },
    {
        method: 'PUT',
        path: '/:id',
        permission: PERMISSIONS.RESERVATIONS_UPDATE,
        description: 'Actualizar datos de una reserva',
        handler: controller.updateReservation,
        middlewares: [logAction('update', 'reservations')]
    },
    {
        method: 'PATCH',
        path: '/cancel/:id',
        permission: PERMISSIONS.RESERVATIONS_UPDATE,
        description: 'Cancelar una reserva con cálculo de penalización',
        handler: controller.cancelReservation,
        middlewares: [logAction('update', 'reservations')]
    },
    {
        method: 'PATCH',
        path: '/:id/check-in',
        permission: PERMISSIONS.RESERVATIONS_CHECKIN,
        description: 'Realizar check-in de una reserva',
        handler: controller.checkIn,
        middlewares: [logAction('update', 'reservations')]
    },
    {
        method: 'PATCH',
        path: '/:id/check-out',
        permission: PERMISSIONS.RESERVATIONS_CHECKOUT,
        description: 'Realizar check-out de una reserva',
        handler: controller.checkOut,
        middlewares: [logAction('update', 'reservations')]
    }
];

// Registro automático idéntico al de tus otros módulos
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

export const reservationRoutes = routes;
export default router;