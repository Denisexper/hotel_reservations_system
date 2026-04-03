import { Role } from '../models/role.model.js';

export const PERMISSIONS = {
    USERS_READ: 'users.read',
    USERS_CREATE: 'users.create',
    USERS_UPDATE: 'users.update',
    LOGS_READ: 'logs.read',
    LOGS_DELETE: 'logs.delete',
    ROLES_READ: 'roles.read',
    ROLES_CREATE: 'roles.create',
    ROLES_UPDATE: 'roles.update',
    ROLES_DELETE: 'roles.delete',
    DASHBOARD_VIEW: 'dashboard.view', //permisos que estan por defecto en cualquier rol.
    DASHBOARD_STATS: 'dashboard.stats',//permisos no estan en el frontend porque estan por defecto en cualquier rol.
    ROOMS_READ: 'rooms.read', //nuevos permisos para los nuevos modulos,
    ROOMS_CREATE: 'rooms.create',
    ROOMS_UPDATE: 'rooms.update',
    ROOMS_DELETE: 'rooms.delete',
    RESERVATIONS_READ: 'reservations.read',
    RESERVATIONS_CREATE: 'reservations.create',
    RESERVATIONS_UPDATE: 'reservations.update',
    RESERVATIONS_DELETE: 'reservations.delete',
    PAYMENTS_READ: 'payments.read',
    PAYMENTS_CREATE: 'payments.create',
    PAYMENTS_UPDATE: 'payments.update',
    PAYMENTS_DELETE: 'payments.delete',
    HOTEL_REPORTS_READ: 'hotel_reports.read',
    HOTEL_REPORTS_CREATE: 'hotel_reports.create',
    HOTEL_REPORTS_UPDATE: 'hotel_reports.update',
    HOTEL_REPORTS_DELETE: 'hotel_reports.delete',
};

export const seedRoles = async () => {
    try {
        console.log('🌱 Iniciando seed de roles...');

        const defaultRoles = [
            {
                name: 'admin',
                displayName: 'Administrador',
                description: 'Control total del sistema',
                permissions: Object.values(PERMISSIONS),
                isSystem: true
            },
            {
                name: 'moderator',
                displayName: 'Moderador',
                description: 'Puede gestionar usuarios y ver logs',
                permissions: [
                    PERMISSIONS.USERS_READ,
                    PERMISSIONS.USERS_CREATE,
                    PERMISSIONS.USERS_UPDATE,
                    PERMISSIONS.LOGS_READ,
                    PERMISSIONS.DASHBOARD_VIEW
                ],
                isSystem: true
            },
            {
                name: 'user',
                displayName: 'Usuario',
                description: 'Usuario estándar sin permisos especiales',
                permissions: [PERMISSIONS.DASHBOARD_VIEW],
                isSystem: true
            }
        ];

        for (const roleData of defaultRoles) {
            const existingRole = await Role.findOne({ name: roleData.name });
            
            if (existingRole) {
                await Role.findOneAndUpdate(
                    { name: roleData.name },
                    { 
                        permissions: roleData.permissions,
                        displayName: roleData.displayName,
                        description: roleData.description
                    }
                );
                console.log(`✅ Rol "${roleData.displayName}" actualizado`);
            } else {
                await Role.create(roleData);
                console.log(`✅ Rol "${roleData.displayName}" creado`);
            }
        }

        console.log('🎉 Seed de roles completado');
    } catch (error) {
        console.error('❌ Error en seed:', error);
        throw error;
    }
};