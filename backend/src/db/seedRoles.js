import { Role } from '../models/role.model.js';

export const PERMISSIONS = {
    USERS_READ: 'users.read',
    USERS_CREATE: 'users.create',
    USERS_UPDATE: 'users.update',
    LOGS_READ: 'logs.read',
    LOGS_EXPORT: 'logs.export',
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
            },
            {
                name: 'gerente',
                displayName: 'Gerente',
                description: 'Puede gestionar reservas y ver reportes y clientes del sistema',
                permissions: [

                    PERMISSIONS.ROOMS_READ,
                    PERMISSIONS.ROOMS_CREATE,
                    PERMISSIONS.ROOMS_UPDATE,
                    PERMISSIONS.ROOMS_DELETE,
                    PERMISSIONS.RESERVATIONS_READ,
                    PERMISSIONS.RESERVATIONS_CREATE,
                    PERMISSIONS.RESERVATIONS_UPDATE,
                    PERMISSIONS.RESERVATIONS_DELETE,
                    PERMISSIONS.HOTEL_REPORTS_READ,
                    PERMISSIONS.HOTEL_REPORTS_CREATE,
                    PERMISSIONS.HOTEL_REPORTS_UPDATE,
                    PERMISSIONS.HOTEL_REPORTS_DELETE,
                    PERMISSIONS.USERS_READ,
                    PERMISSIONS.USERS_CREATE,
                    PERMISSIONS.USERS_UPDATE,
                    PERMISSIONS.DASHBOARD_VIEW,
                    PERMISSIONS.PAYMENTS_READ,
                    PERMISSIONS.PAYMENTS_CREATE,
                    PERMISSIONS.LOGS_READ,
                    PERMISSIONS.LOGS_EXPORT,
                    PERMISSIONS.DASHBOARD_VIEW,
                    PERMISSIONS.DASHBOARD_STATS,
                ],
                isSystem: true
            },
            {
                name: 'recepcionista',
                displayName: 'Recepcionista',
                description: 'Puede gestionar habitaciones y reservas',
                permissions: [
                    PERMISSIONS.ROOMS_READ,
                    PERMISSIONS.ROOMS_CREATE,
                    PERMISSIONS.ROOMS_UPDATE,
                    PERMISSIONS.ROOMS_DELETE,
                    PERMISSIONS.RESERVATIONS_READ,
                    PERMISSIONS.RESERVATIONS_CREATE,
                    PERMISSIONS.RESERVATIONS_UPDATE,
                    PERMISSIONS.RESERVATIONS_DELETE,
                    PERMISSIONS.DASHBOARD_VIEW,
                    PERMISSIONS.PAYMENTS_READ,
                    PERMISSIONS.PAYMENTS_CREATE,
                    PERMISSIONS.DASHBOARD_VIEW,
                    PERMISSIONS.DASHBOARD_STATS,
                ],
                isSystem: true
            },
            {
                name: 'cliente',
                displayName: 'Cliente',
                description: 'Puede ver y gestionar sus reservas',
                permissions: [
                    PERMISSIONS.ROOMS_READ,
                    PERMISSIONS.RESERVATIONS_READ,
                    PERMISSIONS.RESERVATIONS_CREATE,
                    PERMISSIONS.RESERVATIONS_UPDATE,
                    PERMISSIONS.DASHBOARD_VIEW,
                    PERMISSIONS.PAYMENTS_CREATE,
                ],
                isSystem: true
            },
            {
                name: 'ama_llaves',
                displayName: 'Ama de llaves',
                description: 'Puede gestionar el estado de las habitaciones',
                permissions: [
                    PERMISSIONS.ROOMS_READ,
                    PERMISSIONS.ROOMS_UPDATE,
                    PERMISSIONS.DASHBOARD_VIEW
                ],
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