import { Schema, model } from 'mongoose';

const permissionSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true,  // No puede haber dos permisos con el mismo code
        lowercase: true  // Siempre en minúsculas
    },
    resource: {
        type: String,
        required: true  // 'users', 'products', 'roles', etc.
    },
    action: {
        type: String,
        required: true  // 'read', 'create', 'update', 'delete'
    },
    description: {
        type: String,
        required: true  // Descripción legible: "Listar usuarios"
    },
    isActive: {
        type: Boolean,
        default: true  // Permite deshabilitar permisos sin borrarlos
    }
}, { 
    timestamps: true  // createdAt, updatedAt
});

// Índice compuesto para búsquedas eficientes
permissionSchema.index({ resource: 1, action: 1 });

export const Permission = model('Permission', permissionSchema);