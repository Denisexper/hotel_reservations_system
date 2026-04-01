import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/role.middleware.js';
import { logsReports, deleteLogs } from '../controllers/logs.controller.js';
import { generateExcelReport, generatePDFReport } from '../controllers/reports.controller.js';

const router = Router();

// rutas con metadata
const routes = [

    //primero los permisos especificos
    {
        method: 'GET',
        path: '/logs/reports/excel',
        permission: 'logs.export',
        description: 'Generar reportes(PDF/Excel)',
        handler: generateExcelReport,
        middlewares: []
    },
    {
        method: 'GET',
        path: '/logs/reports/pdf',
        permission: 'logs.export',
        description: 'Exportar logs a PDF',
        handler: generatePDFReport,
        middlewares: []
    },
    {
        method: 'GET',
        path: '/logs',
        permission: 'logs.read',
        description: 'Listar logs del sistema',
        handler: logsReports,
        middlewares: []
    },
    {
        method: 'DELETE',
        path: '/logs/:id',
        permission: 'logs.delete',
        description: 'Eliminar un log',
        handler: deleteLogs,
        middlewares: []
    },
    
];

//  registrar rutas automáticamente
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

//  exportar metadata para auto-discovery
export const logRoutes = routes;

//  exportar router para usar en server.js
export default router;