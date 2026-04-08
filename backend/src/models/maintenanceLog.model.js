import { Schema, model } from "mongoose";

const maintenanceLogSchema = new Schema({
    // Habitación afectada
    room: {
        type: Schema.Types.ObjectId,
        ref: 'Room',
        required: [true, 'La habitación es obligatoria']
    },

    // Quien reportó el problema
    reportedBy: {
        type: Schema.Types.ObjectId,
        ref: 'userModel',
        required: [true, 'El usuario que reporta es obligatorio']
    },

    // Descripción del problema
    issue: {
        type: String,
        required: [true, 'La descripción del problema es obligatoria'],
        trim: true,
        maxlength: [500, 'La descripción no puede exceder 500 caracteres']
    },

    // Prioridad
    priority: {
        type: String,
        required: true,
        enum: {
            values: ['baja', 'media', 'alta', 'urgente'],
            message: '{VALUE} no es una prioridad válida'
        },
        default: 'media'
    },

    // Estado del ticket
    status: {
        type: String,
        required: true,
        enum: {
            values: ['reportado', 'en_proceso', 'resuelto'],
            message: '{VALUE} no es un estado válido'
        },
        default: 'reportado'
    },

    // Quien resolvió el problema
    resolvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'userModel',
        default: null
    },

    // Fecha de resolución
    resolvedAt: {
        type: Date,
        default: null
    },

    // Notas adicionales
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Las notas no pueden exceder 500 caracteres']
    }
}, {
    timestamps: true
});

// Índices
maintenanceLogSchema.index({ room: 1, status: 1 });
maintenanceLogSchema.index({ status: 1 });
maintenanceLogSchema.index({ priority: 1 });
maintenanceLogSchema.index({ createdAt: -1 });

export const MaintenanceLog = model('MaintenanceLog', maintenanceLogSchema);