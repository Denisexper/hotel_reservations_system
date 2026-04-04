import { Schema, model } from "mongoose";

const roomSchema = new Schema({
    roomNumber: {
        type: String,
        required: [true, 'El número de habitación es obligatorio'],
        unique: true,
        trim: true
    },
    type: {
        type: String,
        required: [true, 'El tipo de habitación es obligatorio'],
        enum: {
            values: ['Simple', 'Doble', 'Suite', 'Deluxe', 'Presidencial'],
            message: '{VALUE} no es un tipo de habitación válido'
        }
    },
    capacity: {
        type: Number,
        required: [true, 'La capacidad de personas es obligatoria'],
        min: [1, 'La capacidad mínima es de 1 persona']
    },
    basePrice: {
        type: Number,
        required: [true, 'El precio base es obligatorio'],
        min: [0, 'El precio no puede ser negativo']
    },
    floor: {
        type: Number,
    },
    description: {
        type: String,
        trim: true
    },
    // Array de servicios (ej: ["WiFi", "AC", "TV", "Minibar"])
    amenities: [{
        type: String,
        trim: true
    }],
    // Para almacenar las imagenes utilziando multer.
    images: [{
        type: String
    }],
    status: {
        type: String,
        required: true,
        enum: ['disponible', 'ocupada', 'mantenimiento', 'limpieza'],
        default: 'disponible'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // Para auditoría opcional: quién creó la habitación
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'userModel'
    }
}, {
    timestamps: true // Esto crea createdAt y updatedAt automáticamente
});

// Índice para búsquedas rápidas por tipo y estado
roomSchema.index({ type: 1, status: 1 });

export const Room = model('Room', roomSchema);