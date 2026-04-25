import { Role } from '../models/role.model.js';
import { Amenity } from '../models/amenity.model.js';
import { RoomType } from '../models/roomType.model.js';

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
    ROOMS_READ: 'rooms.read', //nuevos permisos para los nuevos modulos,
    ROOMS_CREATE: 'rooms.create',
    ROOMS_UPDATE: 'rooms.update',
    ROOMS_DELETE: 'rooms.delete',
    RESERVATIONS_READ: 'reservations.read',
    RESERVATIONS_CREATE: 'reservations.create',
    RESERVATIONS_UPDATE: 'reservations.update',
    RESERVATIONS_DELETE: 'reservations.delete',
    RESERVATIONS_CHECKIN: 'reservations.checkin',
    RESERVATIONS_CHECKOUT: 'reservations.checkout',
    PAYMENTS_READ: 'payments.read',
    PAYMENTS_CREATE: 'payments.create',
    PAYMENTS_UPDATE: 'payments.update',
    PAYMENTS_DELETE: 'payments.delete',
    HOTEL_REPORTS_READ: 'hotel_reports.read',
    MAINTENANCE_READ: 'maintenance.read',
    MAINTENANCE_CREATE: 'maintenance.create',
    MAINTENANCE_UPDATE: 'maintenance.update',
    MAINTENANCE_DELETE: 'maintenance.delete',
    RESERVATIONS_CREATE_OTHERS: 'reservations.create_others',
    DAYPASS_READ: 'daypass.read',
    DAYPASS_CREATE: 'daypass.create',
    DAYPASS_UPDATE: 'daypass.update',
    DAYPASS_DELETE: 'daypass.delete',
    CATALOGS_READ: 'catalogs.read',
    CATALOGS_CREATE: 'catalogs.create',
    CATALOGS_UPDATE: 'catalogs.update',
    CATALOGS_DELETE: 'catalogs.delete',
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
                ],
                isSystem: true
            },
            {
                name: 'user',
                displayName: 'Usuario',
                description: 'Usuario estándar sin permisos especiales',
                permissions: [],
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
                    PERMISSIONS.RESERVATIONS_CHECKIN,
                    PERMISSIONS.RESERVATIONS_CHECKOUT,
                    PERMISSIONS.HOTEL_REPORTS_READ,
                    PERMISSIONS.USERS_READ,
                    PERMISSIONS.USERS_CREATE,
                    PERMISSIONS.USERS_UPDATE,
                    PERMISSIONS.PAYMENTS_READ,
                    PERMISSIONS.PAYMENTS_CREATE,
                    PERMISSIONS.LOGS_READ,
                    PERMISSIONS.LOGS_EXPORT,
                    PERMISSIONS.MAINTENANCE_READ,
                    PERMISSIONS.MAINTENANCE_CREATE,
                    PERMISSIONS.MAINTENANCE_UPDATE,
                    PERMISSIONS.MAINTENANCE_DELETE,
                    PERMISSIONS.RESERVATIONS_CREATE_OTHERS,
                    PERMISSIONS.CATALOGS_READ,
                    PERMISSIONS.CATALOGS_CREATE,
                    PERMISSIONS.CATALOGS_UPDATE,
                    PERMISSIONS.CATALOGS_DELETE,
                ],
                isSystem: true
            },
            {
                name: 'recepcionista',
                displayName: 'Recepcionista',
                description: 'Puede gestionar habitaciones, reservas y mantenimientos',
                permissions: [
                    PERMISSIONS.ROOMS_READ,
                    PERMISSIONS.ROOMS_CREATE,
                    PERMISSIONS.ROOMS_UPDATE,
                    PERMISSIONS.ROOMS_DELETE,
                    PERMISSIONS.RESERVATIONS_READ,
                    PERMISSIONS.RESERVATIONS_CREATE,
                    PERMISSIONS.RESERVATIONS_UPDATE,
                    PERMISSIONS.RESERVATIONS_DELETE,
                    PERMISSIONS.RESERVATIONS_CHECKIN,
                    PERMISSIONS.RESERVATIONS_CHECKOUT,
                    PERMISSIONS.PAYMENTS_READ,
                    PERMISSIONS.PAYMENTS_CREATE,
                    PERMISSIONS.MAINTENANCE_CREATE,
                    PERMISSIONS.MAINTENANCE_READ,
                    PERMISSIONS.MAINTENANCE_UPDATE,
                    PERMISSIONS.RESERVATIONS_CREATE_OTHERS,
                    PERMISSIONS.CATALOGS_READ,
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
                    PERMISSIONS.PAYMENTS_CREATE,
                    PERMISSIONS.PAYMENTS_READ,
                ],
                isSystem: true
            },
            {
                name: 'ama_llaves',
                displayName: 'Ama de llaves',
                description: 'Puede gestionar el estado de las habitaciones',
                permissions: [
                    PERMISSIONS.ROOMS_READ,
                    PERMISSIONS.MAINTENANCE_READ,
                    PERMISSIONS.MAINTENANCE_CREATE,
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

        // Seed amenidades iniciales
        const defaultAmenities = [
            'WiFi', 'AC', 'TV', 'Minibar', 'Caja Fuerte',
            'Balcón', 'Vista al Mar', 'Jacuzzi', 'Cocina',
            'Sala de Estar', 'Frigobar', 'Estacionamiento',
            'Piscina', 'Gimnasio', 'Servicio a la habitación'
        ];
        for (const name of defaultAmenities) {
            await Amenity.findOneAndUpdate(
                { name },
                { name, isActive: true },
                { upsert: true }
            );
        }
        console.log('✅ Amenidades iniciales sincronizadas');

        // Seed tipos de habitación iniciales
        const defaultRoomTypes = [
            'Simple', 'Doble', 'Suite', 'Deluxe',
            'Presidencial', 'Single', 'Triple', 'Twin'
        ];
        for (const name of defaultRoomTypes) {
            await RoomType.findOneAndUpdate(
                { name },
                { name, isActive: true },
                { upsert: true }
            );
        }
        console.log('✅ Tipos de habitación iniciales sincronizados');

    } catch (error) {
        console.error('❌ Error en seed:', error);
        throw error;
    }
};