import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/role.middleware.js';
import { PERMISSIONS } from '../db/seedRoles.js';

const router = Router();
const controller = new DashboardController();

// Bindear todos los métodos
Object.getOwnPropertyNames(DashboardController.prototype).forEach(method => {
    if (method !== 'constructor') {
        controller[method] = controller[method].bind(controller);
    }
});

const routes = [
    {
        method: 'GET',
        path: '/stats',
        permission: PERMISSIONS.HOTEL_REPORTS_READ,
        description: 'Estadísticas generales del hotel',
        handler: controller.getGeneralStats,
        middlewares: []
    },
    {
        method: 'GET',
        path: '/revenue',
        permission: PERMISSIONS.HOTEL_REPORTS_READ,
        description: 'Ingresos por período',
        handler: controller.getRevenueByPeriod,
        middlewares: []
    },
    {
        method: 'GET',
        path: '/reservations-by-status',
        permission: PERMISSIONS.HOTEL_REPORTS_READ,
        description: 'Reservas agrupadas por estado',
        handler: controller.getReservationsByStatus,
        middlewares: []
    },
    {
        method: 'GET',
        path: '/top-rooms',
        permission: PERMISSIONS.HOTEL_REPORTS_READ,
        description: 'Habitaciones más reservadas',
        handler: controller.getTopRooms,
        middlewares: []
    },
    {
        method: 'GET',
        path: '/today',
        permission: PERMISSIONS.HOTEL_REPORTS_READ,
        description: 'Check-ins y check-outs del día',
        handler: controller.getTodayActivity,
        middlewares: []
    },
    {
        method: 'GET',
        path: '/occupancy',
        permission: PERMISSIONS.HOTEL_REPORTS_READ,
        description: 'Ocupación por período',
        handler: controller.getOccupancyByPeriod,
        middlewares: []
    },
    {
        method: 'GET',
        path: '/revenue-by-method',
        permission: PERMISSIONS.HOTEL_REPORTS_READ,
        description: 'Ingresos por método de pago',
        handler: controller.getRevenueByPaymentMethod,
        middlewares: []
    },
    {
        method: 'GET',
        path: '/export/excel',
        permission: PERMISSIONS.HOTEL_REPORTS_READ,
        description: 'Exportar estadísticas a Excel',
        handler: controller.exportExcel,
        middlewares: []
    },
    {
        method: 'GET',
        path: '/export/pdf',
        permission: PERMISSIONS.HOTEL_REPORTS_READ,
        description: 'Exportar estadísticas a PDF',
        handler: controller.exportPDF,
        middlewares: []
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

export const dashboardRoutes = routes;
export default router;