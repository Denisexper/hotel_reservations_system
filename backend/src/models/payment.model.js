import { Schema, model } from "mongoose";

const paymentSchema = new Schema({
    // Reserva asociada
    reservation: {
        type: Schema.Types.ObjectId,
        ref: 'Reservation',
        required: [true, 'La reserva es obligatoria']
    },

    // Monto del pago
    amount: {
        type: Number,
        required: [true, 'El monto es obligatorio'],
        min: [0, 'El monto no puede ser negativo']
    },

    // Método de pago
    paymentMethod: {
        type: String,
        required: [true, 'El método de pago es obligatorio'],
        enum: {
            values: ['efectivo', 'tarjeta', 'transferencia'],
            message: '{VALUE} no es un método de pago válido'
        }
    },

    // Fecha del pago
    paymentDate: {
        type: Date,
        default: Date.now
    },

    // ID de transacción (simulado)
    transactionId: {
        type: String,
        unique: true,
        required: true
    },

    // Tipo de comprobante
    receiptType: {
        type: String,
        required: [true, 'El tipo de comprobante es obligatorio'],
        enum: {
            values: ['credito_fiscal', 'consumidor_final'],
            message: '{VALUE} no es un tipo de comprobante válido'
        }
    },

    // Número de comprobante (generado)
    receiptNumber: {
        type: String,
        unique: true,
        required: true
    },

    // Estado del pago
    status: {
        type: String,
        required: true,
        enum: {
            values: ['completado', 'pendiente', 'fallido', 'reembolsado'],
            message: '{VALUE} no es un estado válido'
        },
        default: 'pendiente'
    },

    // Quien procesó el pago
    processedBy: {
        type: Schema.Types.ObjectId,
        ref: 'userModel',
        required: true
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
paymentSchema.index({ reservation: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentDate: -1 });
paymentSchema.index({ processedBy: 1 });

// Generar ID de transacción único
paymentSchema.statics.generateTransactionId = function () {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(100000 + Math.random() * 900000);
    return `TXN-${date}-${random}`;
};

// Generar número de comprobante único
paymentSchema.statics.generateReceiptNumber = async function (receiptType) {
    const prefix = receiptType === 'credito_fiscal' ? 'CF' : 'COF';
    const count = await this.countDocuments({ receiptType });
    const sequential = String(count + 1).padStart(6, '0');
    return `${prefix}-${sequential}`;
};

export const Payment = model('Payment', paymentSchema);
