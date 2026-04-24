import { Router } from 'express'
import { userController } from '../controllers/user.controller.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { checkPermission } from '../middleware/role.middleware.js'
import { logAction } from '../middleware/logger.middleware.js'

const router = Router()
const controller = new userController()

//  rutas con metadata
const routes = [
    {
        method: 'GET',
        path: '/users',
        permission: 'users.read',
        description: 'Listar usuarios',
        handler: controller.getAll,
        middlewares: []
    },
    {
        method: 'POST',
        path: '/users',
        permission: 'users.create',
        description: 'Crear usuario',
        handler: controller.createUser,
        middlewares: [logAction('create', 'users')]
    },
    {
        method: 'GET',
        path: '/users/clients/search',
        permission: 'reservations.create_others',
        description: 'Buscar clientes para asignar reserva',
        handler: controller.searchClients,
        middlewares: []
    },
    {
        method: 'GET',
        path: '/users/:id',
        permission: 'users.read',
        description: 'Obtener un usuario',
        handler: controller.getUser,
        middlewares: [logAction('read', 'users')]
    },
    {
        method: 'PUT',
        path: '/users/:id',
        permission: 'users.update',
        description: 'Actualizar usuario',
        handler: controller.updateUser,
        middlewares: [logAction('update', 'users')]
    },
    {
        method: 'PATCH',
        path: '/users/:id/toggle-status',
        permission: 'users.update',
        description: 'Activar/Desactivar usuario',
        handler: controller.toggleUserStatus,
        middlewares: [logAction('update', 'users')]
    },
    {
        method: 'GET',
        path: '/users/:userId/history',
        permission: 'logs.read',
        description: 'Ver historial de cambios del usuario',
        handler: controller.getUserHistory,
        middlewares: []
    }
];

// registrar rutas automáticamente
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

// exportar metadata para auto-discovery
export const userRoutes = routes;

// exportar router para usar en server.js
export default router;