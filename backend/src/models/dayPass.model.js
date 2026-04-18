import { Schema, model } from "mongoose";

const dayPassSchema = new Schema({
    // Código único del day pass
    code: {
        type: String,
        unique: true,
        required: true
    },

    // Datos del visitante (no necesita estar registrado)
    visitorName: {
        type: String,
        required: [true, 'El nombre del visitante es obligatorio'],
        trim: true
    },
    visitorEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    visitorPhone: {
        type: String,
        trim: true
    },

    // Fecha del day pass
    date: {
        type: Date,
        required: [true, 'La fecha es obligatoria']
    },

    // Número de personas
    numberOfGuests: {
        type: Number,
        required: [true, 'El número de personas es obligatorio'],
        min: [1, 'Debe haber al menos 1 persona']
    },

    // Servicios incluidos
    services: [{
        type: String,
        enum: ['piscina', 'gimnasio', 'spa', 'restaurante', 'bar', 'playa', 'todas'],
        default: 'todas'
    }],

    // Precio por persona
    pricePerPerson: {
        type: Number,
        required: [true, 'El precio por persona es obligatorio'],
        min: [0, 'El precio no puede ser negativo']
    },

    // Total (precio × personas)
    totalAmount: {
        type: Number,
        required: true,
        min: [0, 'El total no puede ser negativo']
    },

    // Estado del pago
    paymentStatus: {
        type: String,
        required: true,
        enum: {
            values: ['pendiente', 'pagado', 'reembolsado'],
            message: '{VALUE} no es un estado de pago válido'
        },
        default: 'pendiente'
    },

    // Método de pago
    paymentMethod: {
        type: String,
        enum: ['efectivo', 'tarjeta', 'transferencia'],
        default: null
    },

    // Estado del day pass
    status: {
        type: String,
        required: true,
        enum: {
            values: ['activo', 'vencido', 'cancelado'],
            message: '{VALUE} no es un estado válido'
        },
        default: 'activo'
    },

    // Hora de entrada y salida
    checkInTime: {
        type: Date,
        default: null
    },
    checkOutTime: {
        type: Date,
        default: null
    },

    // Notas adicionales
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Las notas no pueden exceder 500 caracteres']
    },

    // Quien registró el day pass
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'userModel',
        required: true
    }
}, {
    timestamps: true
});

// Índices
dayPassSchema.index({ date: 1, status: 1 });
dayPassSchema.index({ paymentStatus: 1 });
dayPassSchema.index({ createdAt: -1 });

// Generar código único de day pass
dayPassSchema.statics.generateCode = function () {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `DP-${date}-${random}`;
};

export const DayPass = model('DayPass', dayPassSchema);