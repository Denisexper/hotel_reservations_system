/**
 * Auto-discovery de permisos desde las rutas
 * Este módulo extrae automáticamente los permisos definidos en las rutas
 */

export const discoverPermissions = (routeModules) => {
    // Combinar todos los arrays de rutas
    const allRoutes = [];
    
    for (const module of routeModules) {
        if (module && Array.isArray(module)) {
            allRoutes.push(...module);
        }
    }

    // Extraer permisos únicos
    const permissions = allRoutes
        .filter(route => route.permission)  // Solo rutas con permiso definido
        .map(route => {
            const [resource, action] = route.permission.split('.');
            
            return {
                code: route.permission,           // 'users.read'
                resource: resource,                // 'users'
                action: action,                    // 'read'
                description: route.description || `${action} ${resource}`
            };
        });

    // Eliminar duplicados (mismo code)
    const uniquePermissions = permissions.reduce((acc, perm) => {
        const exists = acc.find(p => p.code === perm.code);
        if (!exists) {
            acc.push(perm);
        }
        return acc;
    }, []);

    return uniquePermissions;
};

/**
 * Agrupa permisos por recurso
 * Útil para mostrar en la UI
 */
export const groupPermissionsByResource = (permissions) => {
    return permissions.reduce((acc, perm) => {
        if (!acc[perm.resource]) {
            acc[perm.resource] = [];
        }
        acc[perm.resource].push(perm);
        return acc;
    }, {});
};