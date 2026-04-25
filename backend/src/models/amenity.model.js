import { Schema, model } from "mongoose";

const amenitySchema = new Schema({
    name: {
        type: String,
        required: [true, 'El nombre de la amenidad es obligatorio'],
        unique: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export const Amenity = model('Amenity', amenitySchema);
