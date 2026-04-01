import { Router } from 'express';
import { RoleController } from '../controllers/role.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/role.middleware.js';
import { getAllPermissions } from '../controllers/permission.controller.js';

const router = Router();
const controller = new RoleController();

// rutas con metadata
const routes = [
    {
        method: 'GET',
        path: '/',
        permission: 'roles.read',
        description: 'Listar roles',
        handler: controller.getAll,
        middlewares: []
    },
    {
        method: 'GET',
        path: '/permissions',
        permission: 'roles.read',
        description: 'Obtener permisos disponibles',
        handler: getAllPermissions,
        middlewares: []
    },
    {
        method: 'GET',
        path: '/:id',
        permission: 'roles.read',
        description: 'Obtener un rol',
        handler: controller.getOne,
        middlewares: []
    },
    {
        method: 'POST',
        path: '/',
        permission: 'roles.create',
        description: 'Crear nuevo rol',
        handler: controller.create,
        middlewares: []
    },
    {
        method: 'PUT',
        path: '/:id',
        permission: 'roles.update',
        description: 'Actualizar rol',
        handler: controller.update,
        middlewares: []
    },
    {
        method: 'DELETE',
        path: '/:id',
        permission: 'roles.delete',
        description: 'Eliminar rol',
        handler: controller.delete,
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
export const roleRoutes = routes;

// exportar router para usar en server.js
export default router;