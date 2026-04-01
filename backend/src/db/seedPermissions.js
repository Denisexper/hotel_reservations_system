import { Permission } from '../models/permission.model.js';
import { discoverPermissions } from '../utils/permissionDiscovery.js';

/**
 * Seed de permisos basado en auto-discovery
 * Se ejecuta cada vez que inicia el servidor para mantener sincronizados
 * los permisos del código con la base de datos asi los descubrimos automaticametne cuando creemos una nueva ruta
 */
export const seedPermissions = async (routeModules) => {
    try {
        console.log('🔍 Descubriendo permisos de las rutas...');

        // Auto-descubrir permisos
        const discoveredPermissions = discoverPermissions(routeModules);

        console.log(`✅ Descubiertos ${discoveredPermissions.length} permisos únicos`);

        // Sincronizar con base de datos
        for (const perm of discoveredPermissions) {
            await Permission.findOneAndUpdate(
                { code: perm.code },  // Buscar por code
                {
                    code: perm.code,
                    resource: perm.resource,
                    action: perm.action,
                    description: perm.description,
                    isActive: true
                },
                { 
                    upsert: true,  // Crear si no existe, actualizar si existe
                    returnDocument: 'after'
                }
            );
        }

        console.log('✅ Permisos sincronizados en base de datos');

        // Mostrar resumen agrupado por recurso
        const grouped = discoveredPermissions.reduce((acc, perm) => {
            if (!acc[perm.resource]) {
                acc[perm.resource] = 0;
            }
            acc[perm.resource]++;
            return acc;
        }, {});

        console.log('📊 Permisos por recurso:', grouped);

    } catch (error) {
        console.error('❌ Error en seedPermissions:', error);
        throw error;
    }
};