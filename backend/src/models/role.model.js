import { Schema, model } from 'mongoose';

const roleSchema = new Schema({
    name: {
        type: String,
        required: [true, 'El nombre del rol es obligatorio'],
        unique: true,
        trim: true,
        lowercase: true
    },
    displayName: {
        type: String,
        required: [true, 'El nombre para mostrar es obligatorio'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    permissions: [{
        type: String,
        trim: true
    }],
    isSystem: {
        type: Boolean,
        default: false // true para roles predefinidos (admin, user, moderator)
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

export const Role = model('Role', roleSchema);