import { Schema, model } from "mongoose";

const userSchema = new Schema({
    name: {
        type: String,
        required: [true, 'El nombre es obligatorio'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'El email es obligatorio'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Email no válido']
    },

    //verificación de email para el registro de clientes.
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationCode: {
        type: String,
        default: null
    },
    emailVerificationExpires: {
        type: Date,
        default: null
    },
    password: {
        type: String,
        required: [true, 'La contraseña es obligatoria'],
        minlength: [6, 'La contraseña debe tener al menos 6 caracteres']
    },
    role: {
        type: Schema.Types.ObjectId,
        ref: 'Role',
        required: true
    },
    phone: {
        type: String,
    },
    documentType: {
        type: String,
        enum: ['DUI', 'DNI', 'Passport', 'DriverLicense'],
    },
    documentNumber: {
        type: String,
    },
    country: {
        type: String,
        default: 'El Salvador'
    },
    // Campos adicionales para el perfil del usuario
    isActive: {
        type: Boolean,
        default: true
    },
    address: {
        type: String,
    },
    lastLogin: {
        type: Date
    },
    mustChangePassword: {
        type: Boolean,
        default: false
    },
}, {
    timestamps: true
});

export const userModel = model('userModel', userSchema);