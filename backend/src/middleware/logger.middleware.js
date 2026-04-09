import { Log } from "../models/logs.model.js";
import { userModel } from "../models/user.model.js";
import { Room } from "../models/room.model.js";
import { Reservation } from "../models/reservation.model.js";
import { Payment } from "../models/payment.model.js";
import { SeasonalPrice } from "../models/seasonalPrice.model.js";
import { MaintenanceLog } from "../models/maintenanceLog.model.js";

// Mapa de modelos
const models = {
    users: userModel,
    rooms: Room,
    reservations: Reservation,
    payments: Payment,
    seasonals: SeasonalPrice,
    maintenance: MaintenanceLog,
};

// Configuración de qué campos mostrar por recurso
const resourceConfig = {
    users: {
        displayFields: ['name', 'email', 'role', 'isActive'],
        populateFields: [{ path: 'role', select: 'name' }],
        getDisplayName: (doc) => doc.name
    },
    rooms: {
        displayFields: ['roomNumber', 'type', 'basePrice', 'status', 'capacity', 'isActive'],
        populateFields: [],
        getDisplayName: (doc) => `Habitación ${doc.roomNumber}`
    },
    reservations: {
        displayFields: ['reservationCode', 'checkIn', 'checkOut', 'status', 'totalAmount'],
        populateFields: [
            { path: 'client', select: 'name email' },
            { path: 'room', select: 'roomNumber type' }
        ],
        getDisplayName: (doc) => doc.client?.name
            ? `${doc.reservationCode} - ${doc.client.name}`
            : doc.reservationCode
    },
    payments: {
        displayFields: ['amount', 'paymentMethod', 'status', 'receiptNumber', 'transactionId'],
        populateFields: [
            { path: 'reservation', select: 'reservationCode' },
            { path: 'processedBy', select: 'name' }
        ],
        getDisplayName: (doc) => doc.transactionId
    },
    seasonal_prices: {
        displayFields: ['seasonName', 'startDate', 'endDate', 'modifierType', 'modifierValue', 'roomType'],
        populateFields: [],
        getDisplayName: (doc) => doc.seasonName
    },
    maintenance: {
        displayFields: ['issue', 'priority', 'status'],
        populateFields: [
            { path: 'room', select: 'roomNumber' },
            { path: 'reportedBy', select: 'name' }
        ],
        getDisplayName: (doc) => `Ticket - Hab. ${doc.room?.roomNumber || 'N/A'}`
    },
};

export const logAction = (action, resource) => {
    return async (req, res, next) => {
        let dataBefore = null;
        let targetName = null;

        const Model = models[resource];
        const config = resourceConfig[resource];

        // 1. Snapshot ANTES (para update/delete)
        if (req.params.id && Model && (action === 'update' || action === 'delete')) {
            try {
                let query = Model.findById(req.params.id);

                // Aplicar populate si está configurado
                if (config?.populateFields) {
                    config.populateFields.forEach(pop => {
                        query = query.populate(pop);
                    });
                }

                const doc = await query;

                if (doc) {
                    // Guardar snapshot completo
                    dataBefore = doc.toObject();
                    delete dataBefore.password; // Seguridad

                    // Nombre del documento afectado
                    targetName = config?.getDisplayName(doc);

                    // Filtrar solo campos relevantes para mostrar en frontend
                    if (config?.displayFields) {
                        const filtered = {};
                        config.displayFields.forEach(field => {
                            if (dataBefore[field] !== undefined) {
                                // Si es un objeto poblado (como role), extraer el nombre
                                if (typeof dataBefore[field] === 'object' && dataBefore[field]?.name) {
                                    filtered[field] = dataBefore[field].name;
                                } else {
                                    filtered[field] = dataBefore[field];
                                }
                            }
                        });
                        dataBefore = filtered;
                    }
                }
            } catch (error) {
                console.error(`Error fetching ${resource} before action:`, error);
            }
        }

        // 2. Interceptar respuesta
        const originalJson = res.json;

        res.json = async function (data) {
            if (req.user) {
                try {
                    // Extraer el objeto de la respuesta (flexible)
                    const resultData = data.data || data.user || data.room || data.newUser;

                    let dataAfter = null;
                    // 3. Snapshot DESPUÉS (para create/update)
                    if ((action === 'create' || action === 'update') && resultData) {
                        dataAfter = JSON.parse(JSON.stringify(resultData));
                        delete dataAfter.password;

                        if (config?.displayFields) {
                            const filtered = {};
                            config.displayFields.forEach(field => {
                                if (dataAfter[field] !== undefined) {
                                    if (typeof dataAfter[field] === 'object') {
                                        if (dataAfter[field]?.name) {
                                            filtered[field] = dataAfter[field].name;
                                        } else if (dataAfter[field]?.roomNumber) {
                                            filtered[field] = dataAfter[field].roomNumber;
                                        } else if (dataAfter[field]?._id) {
                                            filtered[field] = dataAfter[field]._id.toString();
                                        }
                                    } else {
                                        filtered[field] = dataAfter[field];
                                    }
                                }
                            });
                            dataAfter = filtered;
                        }

                        if (!targetName && config?.getDisplayName) {
                            targetName = config.getDisplayName(resultData);
                        }
                    }

                    // Construir log
                    const logData = {
                        user: req.user.id,
                        action,
                        resource,
                        details: `${req.method} ${req.originalUrl}`,
                        userAgent: req.get('user-agent'),
                        statusCode: res.statusCode,
                        dataBefore: dataBefore,
                        dataAfter: dataAfter,
                        targetUserName: targetName, // Nombre del documento afectado
                        targetUser: req.params.id || resultData?._id || null
                    };

                    // Calcular campos cambiados (para UPDATE)
                    if (action === 'update' && dataBefore && dataAfter) {
                        logData.changedFields = [];

                        Object.keys(dataAfter).forEach(key => {
                            let before = dataBefore[key];
                            let after = dataAfter[key];

                            // Normalizar fechas para comparación
                            if (before && after && (key === 'checkIn' || key === 'checkOut')) {
                                before = new Date(before).getTime();
                                after = new Date(after).getTime();
                            }

                            if (JSON.stringify(before) !== JSON.stringify(after)) {
                                logData.changedFields.push(key);
                            }
                        });
                    }

                    await Log.create(logData);

                } catch (error) {
                    console.error('Error creating log:', error);
                }
            }

            return originalJson.call(this, data);
        };

        next();
    };
};