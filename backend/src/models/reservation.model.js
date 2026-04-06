import { Schema, model } from "mongoose";

const reservationSchema = new Schema({
    // Código único de reserva (RES-20260405-1234)
    reservationCode: {
        type: String,
        unique: true,
        required: true,
        uppercase: true
    },
    
    // Cliente que hace la reserva
    client: {
        type: Schema.Types.ObjectId,
        ref: 'userModel',
        required: [true, 'El cliente es obligatorio']
    },
    
    // Habitación reservada
    room: {
        type: Schema.Types.ObjectId,
        ref: 'Room',
        required: [true, 'La habitación es obligatoria']
    },
    
    // Fechas de la reserva
    checkIn: {
        type: Date,
        required: [true, 'La fecha de entrada es obligatoria']
    },
    checkOut: {
        type: Date,
        required: [true, 'La fecha de salida es obligatoria'],
        validate: {
            validator: function(value) {
                return value > this.checkIn;
            },
            message: 'La fecha de salida debe ser posterior a la fecha de entrada'
        }
    },
    
    // Número de huéspedes
    numberOfGuests: {
        type: Number,
        required: [true, 'El número de huéspedes es obligatorio'],
        min: [1, 'Debe haber al menos 1 huésped']
    },
    
    // precio capturado al momento de la reserva para evitar problemas con cambios de precio posteriores
    pricePerNight: {
        type: Number,
        required: [true, 'El precio por noche es obligatorio'],
        min: [0, 'El precio no puede ser negativo']
    },
    
    // Cálculo del costo total (días × precio)
    totalAmount: {
        type: Number,
        required: true,
        min: [0, 'El monto no puede ser negativo']
    },
    
    // Estado de la reserva
    status: {
        type: String,
        required: true,
        enum: {
            values: ['pendiente', 'confirmada', 'check-in', 'check-out', 'cancelada'],
            message: '{VALUE} no es un estado válido'
        },
        default: 'pendiente'
    },
    
    // Estado del pago (separado del estado de reserva)
    paymentStatus: {
        type: String,
        required: true,
        enum: ['pendiente', 'pagado', 'reembolsado'],
        default: 'pendiente'
    },
    
    // Solicitudes especiales del cliente
    specialRequests: {
        type: String,
        trim: true,
        maxlength: [500, 'Las solicitudes especiales no pueden exceder 500 caracteres']
    },
    
    // Quién creó la reserva (cliente directo o recepcionista)
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'userModel',
        required: true
    },
    
    // Datos de cancelación
    cancelledAt: {
        type: Date
    },
    cancellationReason: {
        type: String,
        trim: true
    },
    // Penalización por cancelación (si aplica)
    cancellationFee: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

// Índices para mejorar rendimiento
reservationSchema.index({ client: 1, status: 1 });
reservationSchema.index({ room: 1, checkIn: 1, checkOut: 1 });
reservationSchema.index({ status: 1 });
reservationSchema.index({ createdAt: -1 });

// Método estático: Generar código único de reserva
reservationSchema.statics.generateReservationCode = async function() {
    let code;
    let exists = true;
    
    while (exists) {
        // Formato: RES-YYYYMMDD-XXXX
        const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const random = Math.floor(1000 + Math.random() * 9000);
        code = `RES-${date}-${random}`;
        
        exists = await this.findOne({ reservationCode: code });
    }
    
    return code;
};

// Método estático: Verificar disponibilidad de habitación
reservationSchema.statics.checkAvailability = async function(roomId, checkIn, checkOut, excludeReservationId = null) {
    const filter = {
        room: roomId,
        status: { $in: ['pendiente', 'confirmada', 'check-in'] }, // Estados activos
        $or: [
            // Nueva reserva comienza durante una existente
            { checkIn: { $lte: checkIn }, checkOut: { $gt: checkIn } },
            // Nueva reserva termina durante una existente
            { checkIn: { $lt: checkOut }, checkOut: { $gte: checkOut } },
            // Nueva reserva envuelve una existente
            { checkIn: { $gte: checkIn }, checkOut: { $lte: checkOut } }
        ]
    };
    
    // Si estamos modificando una reserva, excluirla de la verificación
    if (excludeReservationId) {
        filter._id = { $ne: excludeReservationId };
    }
    
    const conflictingReservation = await this.findOne(filter);
    return !conflictingReservation; // true si está disponible, false si hay conflicto
};

// Método de instancia: Calcular días de estancia
reservationSchema.methods.calculateDays = function() {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round((this.checkOut - this.checkIn) / oneDay);
};

// Método de instancia: Calcular penalización por cancelación
reservationSchema.methods.calculateCancellationFee = function() {
    const now = new Date();
    const daysUntilCheckIn = Math.ceil((this.checkIn - now) / (1000 * 60 * 60 * 24));
    
    // Política de cancelación:
    // - Más de 7 días antes: sin penalización
    // - 3-7 días antes: 30% del total
    // - 1-2 días antes: 50% del total
    // - Menos de 1 día o no-show: 100% del total
    
    if (daysUntilCheckIn > 7) {
        return 0;
    } else if (daysUntilCheckIn >= 3) {
        return this.totalAmount * 0.3;
    } else if (daysUntilCheckIn >= 1) {
        return this.totalAmount * 0.5;
    } else {
        return this.totalAmount;
    }
};

// Virtual: Días de estancia
reservationSchema.virtual('daysOfStay').get(function() {
    return this.calculateDays();
});

// Incluir virtuals en JSON
reservationSchema.set('toJSON', { virtuals: true });
reservationSchema.set('toObject', { virtuals: true });

export const Reservation = model('Reservation', reservationSchema);